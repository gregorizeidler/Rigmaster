import BaseEffect from './BaseEffect';

/**
 * FuzzFaceEffect (turbo)
 * 
 * Dallas Arbiter Fuzz Face com germanium transistors:
 *  - Bias control (Q2 ~4.5–5.0V) para assimetria/gating/"spit"
 *  - Bass control (input cap) corta graves antes do fuzz
 *  - Tone control (LPF pós-fuzz) abre/fecha brilho
 *  - Cleanup real reage ao volume da guitarra
 *  - DC blocker + headroom saudável
 *  - Even harmonics típicos de germanium
 *
 * Params aceitos:
 *   fuzz, bias, bass, tone, volume, mix
 */
class FuzzFaceEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzz Face', 'fuzzface');

    // ===== Entrada / "impedância" e bass roll-off =====
    this.inputPad = audioContext.createGain();
    this.inputPad.gain.value = 1.0;

    this.inputHPF = audioContext.createBiquadFilter(); // "input cap" virtual
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 120; // ajustável via 'bass'
    this.inputHPF.Q.value = 0.707;

    // Pré-ênfase leve que reage ao nível de entrada (cleanup com volume da guitarra)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 1400;
    this.preEmphasis.gain.value = 1.5;

    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 16000;
    this.antiAliasLPF.Q.value = 0.707;

    this.touchComp = audioContext.createDynamicsCompressor();
    this.touchComp.threshold.value = -24;
    this.touchComp.knee.value = 24;
    this.touchComp.ratio.value = 2;
    this.touchComp.attack.value = 0.003;
    this.touchComp.release.value = 0.08;

    // ===== Clipper germanium com bias/asym =====
    this.fuzzClip = audioContext.createWaveShaper();
    this.fuzzClip.oversample = '4x';
    this.bias = 50; // 0–100
    this.fuzzAmount = 50; // 0–100
    this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);

    // ===== Pós-filtro / tone =====
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 6000; // ajustável via 'tone'
    this.outputLPF.Q.value = 0.707;

    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    this.postAA = audioContext.createBiquadFilter();
    this.postAA.type = 'lowpass';
    this.postAA.frequency.value = 16000;
    this.postAA.Q.value = 0.5;

    this.outputGain = audioContext.createGain();
    const g0 = 70 / 100;
    this.outputGain.gain.value = 0.02 + g0 * g0 * 0.85;

    // ===== Cadeia =====
    this.input.connect(this.inputPad);
    this.inputPad.connect(this.inputHPF);
    this.inputHPF.connect(this.preEmphasis);
    this.preEmphasis.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.touchComp);
    this.touchComp.connect(this.fuzzClip);
    this.fuzzClip.connect(this.dcBlock);
    this.dcBlock.connect(this.postAA);
    this.postAA.connect(this.outputLPF);
    this.outputLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry para blend global do BaseEffect
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.params = {
      fuzz: 50,
      bias: 50,
      bass: 50,
      tone: 50,
      volume: 70,
      mix: 100
    };
    this.updateMix(100);
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

  // Curva germanium: joelho suave + assimetria por bias (sem IMD artificial)
  makeFuzzFaceCurve(amount = 50, bias = 50) {
    const samples = 16384;
    const curve = new Float32Array(samples);

    const amt = Math.max(0, Math.min(100, amount));
    const drive = 1 + amt / 18;

    const b = Math.max(0, Math.min(100, bias));
    const asym = (b - 50) / 100;
    const vtPos = Math.max(0.001, 0.22 - asym * 0.06);
    const vtNeg = Math.max(0.001, 0.22 + asym * 0.06);
    const knee = 0.22;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = x * drive;

      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      y = Math.tanh(y * 2.0);
      y += 0.10 * Math.tanh(x * drive * 1.6);

      const dyn = 1 - Math.min(0.12, Math.abs(x) * 0.10);
      y *= dyn;

      const gate = Math.max(0, Math.abs(asym) - 0.1);
      if (Math.abs(y) < gate * 0.06) y *= 0.2;

      curve[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'fuzz': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.fuzz = v;
        this.fuzzAmount = v;
        this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);
        this.inputPad.gain.setTargetAtTime(1.2 + v / 60, now, 0.015);
        break;
      }

      case 'bias': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.bias = v;
        this.bias = v;
        this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);
        break;
      }

      case 'bass': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.bass = v;
        const fBass = 40 + (v / 100) * 160; // 40–200 Hz
        this.inputHPF.frequency.setTargetAtTime(fBass, now, 0.02);
        break;
      }

      case 'tone': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.tone = v;
        const fTone = 2000 + (v / 100) * 7000;
        this.outputLPF.frequency.setTargetAtTime(fTone, now, 0.02);
        break;
      }

      case 'volume': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.volume = v;
        const g = v / 100;
        this.outputGain.gain.setTargetAtTime(0.02 + g * g * 0.85, now, 0.01);
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
    super.disconnect();
    try {
      this.inputPad.disconnect();
      this.inputHPF.disconnect();
      this.preEmphasis.disconnect();
      this.antiAliasLPF.disconnect();
      this.touchComp.disconnect();
      this.fuzzClip.disconnect();
      this.dcBlock.disconnect();
      this.postAA.disconnect();
      this.outputLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FuzzFaceEffect;
