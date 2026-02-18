import BaseEffect from './BaseEffect';

/**
 * ProCoRATEffect (turbo)
 * 
 * ProCo RAT Distortion com:
 *  - LM308 op-amp simulation (slew-rate limiting)
 *  - Hard clipping ±0.8V com compressão central
 *  - Mid boost pre-clipping (1.5kHz)
 *  - Ruetz mod opcional
 *  - Filter inverso (CCW = mais brilho)
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   distortion, filter, volume, mix, ruetz (0/1)
 */
class ProCoRATEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'RAT', 'procorat');

    this._curveCache = {};
    this._lastCurveAmount = -1;
    this._lastCurveRuetz = null;

    // ===== Condicionamento de entrada =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 120; // segura subgrave sem tirar corpo

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;

    // Mid boost antes do clip (cara do RAT, ~9–10 dB para headroom)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.value = 1500;
    this.preEmphasis.Q.value = 2.0;
    this.preEmphasis.gain.value = 10;

    // Slew-rate "LM308": limita transientes (7–10 kHz = slew mais audível)
    this.slewRateLimiter = audioContext.createBiquadFilter();
    this.slewRateLimiter.type = 'lowpass';
    this.slewRateLimiter.frequency.value = 8500;
    this.slewRateLimiter.Q.value = 0.5;

    // Pré-compressor para o "squish" do LM308
    this.preCompressor = audioContext.createDynamicsCompressor();
    this.preCompressor.threshold.value = -15;
    this.preCompressor.knee.value = 6;
    this.preCompressor.ratio.value = 3;
    this.preCompressor.attack.value = 0.001;
    this.preCompressor.release.value = 0.05;

    // Clipping RAT
    this.ratClip = audioContext.createWaveShaper();
    this.ratClip.oversample = '4x';
    this.ratClip.curve = this._getRATCurve(50, false);

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // DC blocker pós-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Filtro "Filter" (inverso: CCW = mais brilho)
    this.ratFilter = audioContext.createBiquadFilter();
    this.ratFilter.type = 'lowpass';
    this.ratFilter.frequency.value = 2000;
    this.ratFilter.Q.value = 2.2; // leve ressonância

    // Saída (inicial bate com volume default 70 → 70/150)
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 70 / 150;

    // ===== Cadeia =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preEmphasis);
    this.preEmphasis.connect(this.slewRateLimiter);
    this.slewRateLimiter.connect(this.preCompressor);
    this.preCompressor.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.ratClip);
    this.ratClip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.ratFilter);
    this.ratFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ----- Mod opcional: RUETZ (menos drive real + mais aberto) -----
    this.ruetz = false;
    this._applyRuetzMod();

    // Params completos para UI (mix e ruetz incluídos)
    this.params = {
      distortion: 50,
      filter: 50,
      volume: 70,
      mix: 100,
      ruetz: 0
    };
  }

  // Curva: hard clip ±0.8 com compressão no miolo. Cache por (amountInt, ruetz). n=16384 suficiente com 4x oversample.
  makeRATCurve(amount, ruetz = false) {
    const n = 16384;
    const curve = new Float32Array(n);
    // Ruetz = menos drive real (feedback/ganho de clip reduzido)
    const drive = ruetz ? 1 + amount / 18 : 1 + amount / 12;
    const hard = 0.8;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      if (y > hard) y = hard;
      else if (y < -hard) y = -hard;
      else y = Math.tanh(y * 1.35); // comprime zona central

      // Grão baseado em y (clipping simétrico, textura previsível)
      y += 0.15 * Math.tanh(y * 2.5);
      y += 0.08 * Math.tanh(y * 5.0);

      curve[i] = y * 0.74; // headroom
    }
    return curve;
  }

  _getRATCurve(amount, ruetz) {
    const clamped = Math.max(0, Math.min(100, amount));
    const keyInt = Math.round(clamped);
    const key = `${keyInt}_${ruetz ? 1 : 0}`;
    if (!this._curveCache[key]) {
      this._curveCache[key] = this.makeRATCurve(keyInt, ruetz);
    }
    return this._curveCache[key];
  }

  _applyRuetzMod() {
    // Ruetz: menos drive real (curva), menos inputGain, menos médios, filtro mais aberto
    if (this.ruetz) {
      this.preEmphasis.gain.value = 6;   // menos "nasal"
      this.ratFilter.Q.value = 1.2;      // menos ressonância
      this.inHPF.frequency.value = 90;   // um pouquinho mais de grave
    } else {
      this.preEmphasis.gain.value = 10;  // 10 dB headroom
      this.ratFilter.Q.value = 2.2;
      this.inHPF.frequency.value = 120;
    }
    // Reaplica curva e input com ruetz atual (updateParameter pode ter distortion guardado)
    const dist = this.params?.distortion ?? 50;
    const distInt = Math.max(0, Math.min(100, Math.round(dist)));
    const now = this.audioContext.currentTime;
    this.ratClip.curve = this._getRATCurve(distInt, this.ruetz);
    const inputBase = 1.5 + distInt / 50;
    this.inputGain.gain.setTargetAtTime(this.ruetz ? inputBase * 0.7 : inputBase, now, 0.01);
  }

  setRuetz(enabled) {
    this.ruetz = !!enabled;
    if (this.params) this.params.ruetz = this.ruetz ? 1 : 0;
    this._applyRuetzMod();
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    if (this.params) {
      this.params[parameter] = parameter === 'ruetz' ? (value ? 1 : 0) : value;
    }

    switch (parameter) {
      case 'distortion': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        const amountInt = Math.round(v);
        if (amountInt !== this._lastCurveAmount || this._lastCurveRuetz !== this.ruetz) {
          this.ratClip.curve = this._getRATCurve(amountInt, this.ruetz);
          this._lastCurveAmount = amountInt;
          this._lastCurveRuetz = this.ruetz;
        }
        const inputBase = 1.5 + v / 50;
        this.inputGain.gain.setTargetAtTime(this.ruetz ? inputBase * 0.7 : inputBase, now, 0.01);
        const aa = 8000 + (100 - v) * 60; // 8–14 kHz (menos escuro com dist alta)
        this.antiAliasLPF.frequency.setTargetAtTime(aa, now, 0.02);
        const slewFreq = 10000 - v * 25; // 10k @ dist 0, 7.5k @ 100
        this.slewRateLimiter.frequency.setTargetAtTime(Math.max(4500, slewFreq), now, 0.02);
        break;
      }

      case 'filter': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        const f = 500 + (100 - v) * 95; // 500..10000, inverso: 0 = brilho
        this.ratFilter.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }

      case 'volume': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        this.outputGain.gain.setTargetAtTime(v / 150, now, 0.01);
        break;
      }

      case 'mix':
        this.updateMix(value);
        break;
        
      case 'ruetz':
        this.setRuetz(!!value);
        break; // params.ruetz já setado acima como 0/1

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.inputGain.disconnect();
      this.preEmphasis.disconnect();
      this.slewRateLimiter.disconnect();
      this.preCompressor.disconnect();
      this.ratClip.disconnect();
      this.antiAliasLPF.disconnect();
      this.dcBlocker.disconnect();
      this.ratFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default ProCoRATEffect;
