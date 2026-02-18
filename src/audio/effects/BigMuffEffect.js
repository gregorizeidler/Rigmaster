import BaseEffect from './BaseEffect';

/**
 * BigMuffEffect (turbo)
 * 
 * Electro-Harmonix Big Muff Pi com:
 *  - Dual-stage diode clipping (2 estágios com características diferentes)
 *  - HPF de entrada (~90Hz) para evitar mud
 *  - LPF pós-clip dinâmico (ajusta com sustain)
 *  - Tone stack paralelo real (LP + HP em paralelo)
 *  - DC blocker
 *  - Alto headroom de saída (típico do Muff)
 *
 * Params aceitos:
 *   sustain, tone, volume, mix
 */
class BigMuffEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Big Muff', 'bigmuff');

    // ===== Estágios de ganho (pré-clipping) =====
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 90;
    this.preHPF.Q.value = 0.707;

    this.preGain1 = audioContext.createGain();
    this.preGain2 = audioContext.createGain();
    this.preGain1.gain.value = 8;   // forte, como no circuito
    this.preGain2.gain.value = 6;

    // ===== Anti-alias pré-clip 10–12 kHz (em 44.1/48k, 18k quase não filtra) =====
    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 11000;
    this.antiAliasLPF1.Q.value = 0.707;

    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 11000;
    this.antiAliasLPF2.Q.value = 0.707;

    // ===== Clipping em dois estágios (diodes-to-ground vibe) =====
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper2 = audioContext.createWaveShaper();
    this.clipper1.oversample = '4x';
    this.clipper2.oversample = '4x';

    // ===== Anti-fizz LPF pós-clip (dinâmico com sustain) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    this.postLPF.Q.value = 0.7;

    // ===== Tone stack paralelo REAL (LP + HP em paralelo) =====
    this.bassPath = audioContext.createBiquadFilter();
    this.bassPath.type = 'lowpass';
    this.bassPath.frequency.value = 650;
    this.bassPath.Q.value = 0.707;

    this.treblePath = audioContext.createBiquadFilter();
    this.treblePath.type = 'highpass';
    this.treblePath.frequency.value = 1600;
    this.treblePath.Q.value = 0.707;

    this.bassGain = audioContext.createGain();
    this.trebleGain = audioContext.createGain();
    this.bassGain.gain.value = 0.5;
    this.trebleGain.gain.value = 0.5;

    this.toneMixer = audioContext.createGain();
    this.toneMixer.gain.value = 1.0;

    // Mid scoop característico do Muff (~1 kHz, -5 dB)
    this.midScoop = audioContext.createBiquadFilter();
    this.midScoop.type = 'peaking';
    this.midScoop.frequency.value = 1000;
    this.midScoop.Q.value = 0.9;
    this.midScoop.gain.value = -5;

    // ===== Saída / Normalização =====
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.35; // Muff tem MUITO volume disponível

    // ===== Roteamento =====
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.preGain1);
    this.preGain1.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.clipper1);
    this.clipper1.connect(this.preGain2);
    this.preGain2.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.clipper2);

    // Tone stack paralelo
    this.clipper2.connect(this.bassPath);
    this.clipper2.connect(this.treblePath);
    this.bassPath.connect(this.bassGain);
    this.treblePath.connect(this.trebleGain);
    this.bassGain.connect(this.toneMixer);
    this.trebleGain.connect(this.toneMixer);

    this.toneMixer.connect(this.midScoop);
    this.midScoop.connect(this.postLPF);
    this.postLPF.connect(this.dcBlock);
    this.dcBlock.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.params = {
      sustain: 50,
      tone: 50,
      volume: 70,
      mix: 100
    };
    this._sustainCurveTimeout = null;
    this._applySustainCurves(this.params.sustain);
    this.updateParameter('sustain', this.params.sustain);
    this.updateParameter('tone', this.params.tone);
    this.updateParameter('volume', this.params.volume);
    this.updateMix(this.params.mix);
  }

  updateMix(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    if (this.params) this.params.mix = v;
    if (typeof this.setMix === 'function') this.setMix(v / 100);
    else {
      const w = v / 100;
      this._currentWetLevel = w;
      this._currentDryLevel = 1 - w;
      const now = this.audioContext.currentTime;
      this.wetGain.gain.setTargetAtTime(w, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - w, now, 0.02);
    }
  }

  // drive, vtP/vtN, knee (sustain alto → knee menor = mais rasgado)
  makeMuffClipCurve(drive = 40, vtP = 0.28, vtN = 0.28, knee = 0.22) {
    const samples = 16384;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = x * (1 + drive / 20);

      if (y > vtP) {
        const over = y - vtP;
        y = vtP + Math.tanh(over / knee) * knee;
      }
      if (y < -vtN) {
        const under = y + vtN;
        y = -vtN + Math.tanh(under / knee) * knee;
      }

      y = Math.tanh(y * 1.15);
      y += 0.07 * Math.tanh(x * (1 + drive / 15) * 3.0);

      curve[i] = Math.max(-1, Math.min(1, y * 0.95));
    }
    return curve;
  }

  _applySustainCurves(sustain) {
    const s = Math.max(0, Math.min(100, sustain));
    const t = s / 100;
    const drive1 = 20 + t * 40;
    const drive2 = 28 + t * 40;
    const knee = Math.max(0.12, 0.28 - t * 0.14);
    this.clipper1.curve = this.makeMuffClipCurve(drive1, 0.28, 0.22, knee);
    this.clipper2.curve = this.makeMuffClipCurve(drive2, 0.26, 0.24, knee);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'sustain': {
        const s = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.sustain = s;

        const tc = 0.04;
        const g1 = 3 + (s / 100) * 17;
        const g2 = 1.5 + (s / 100) * 10.5;
        this.preGain1.gain.setTargetAtTime(g1, now, tc);
        this.preGain2.gain.setTargetAtTime(g2, now, tc);

        const fPost = Math.max(500, Math.min(18000, 6500 + (100 - s) * 25));
        this.postLPF.frequency.setTargetAtTime(fPost, now, tc);
        const fPre = Math.max(500, Math.min(18000, 10000 + (100 - s) * 20));
        this.antiAliasLPF1.frequency.setTargetAtTime(fPre, now, tc);
        this.antiAliasLPF2.frequency.setTargetAtTime(fPre, now, tc);

        if (this._sustainCurveTimeout != null) clearTimeout(this._sustainCurveTimeout);
        this._sustainCurveTimeout = setTimeout(() => {
          this._applySustainCurves(this.params.sustain ?? s);
          this._sustainCurveTimeout = null;
        }, 100);
        break;
      }

      case 'tone': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.tone = v;
        const t = v / 100;
        // Dou uma leve curva S pra zona central ficar mais utilizável
        const shape = (u) => 0.5 + 0.5 * Math.tanh((u - 0.5) * 2.2);
        const treble = shape(t);
        const bass = 1 - treble;
        // Normaliza para 0..1 relativo
        const norm = Math.max(0.001, bass + treble);
        this.bassGain.gain.setTargetAtTime(bass / norm, now, 0.01);
        this.trebleGain.gain.setTargetAtTime(treble / norm, now, 0.01);
        const center = 1 - Math.abs(t - 0.5) * 2;
        this.midScoop.gain.setTargetAtTime(-3 - center * 4, now, 0.02);
        break;
      }

      case 'volume': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.volume = v;
        this.postGain.gain.setTargetAtTime(Math.min(0.8, (v / 100) * 0.9), now, 0.01);
        break;
      }

      case 'mix':
        this.updateMix(value);
        break;

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    if (this._sustainCurveTimeout != null) {
      clearTimeout(this._sustainCurveTimeout);
      this._sustainCurveTimeout = null;
    }
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.preGain1.disconnect();
      this.preGain2.disconnect();
      this.antiAliasLPF1.disconnect();
      this.antiAliasLPF2.disconnect();
      this.clipper1.disconnect();
      this.clipper2.disconnect();
      this.bassPath.disconnect();
      this.treblePath.disconnect();
      this.bassGain.disconnect();
      this.trebleGain.disconnect();
      this.toneMixer.disconnect();
      this.midScoop.disconnect();
      this.postLPF.disconnect();
      this.dcBlock.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default BigMuffEffect;
