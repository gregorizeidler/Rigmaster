import BaseEffect from './BaseEffect';

/**
 * MXRDistortionPlusEffect (turbo)
 * 
 * MXR Distortion+ com:
 *  - Germanium-like clipping (~0.3V threshold, soft knee)
 *  - Pre-conditioning (HPF ~120Hz)
 *  - Dynamic anti-aliasing LPF
 *  - No tone control (authentic D+ design)
 *  - Clean to sizzle to buzz response
 *
 * Params aceitos:
 *   distortion, output, mix
 */
class MXRDistortionPlusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Distortion+', 'mxrdistortionplus');

    // ===== Pré-condicionamento =====
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 3.0;

    // Segura subgrave antes do clip (evita embolo)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 120;
    this.preHPF.Q.value = 0.707;

    // Anti-alias pré-clip (8k–14k dinâmico: mais drive → cutoff menor)
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 11000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipping (germanium-like, simétrico) =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeDistortionPlusCurve(50);

    // Anti-alias / brilho controlado pós-clip
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8000; // ajustado dinamicamente no drive
    this.postLPF.Q.value = 0.8;

    // DC blocker (caso curva gere leve offset)
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // ===== Saída (inicial alinhado com output=70 → 70/125) =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 70 / 125;

    // ===== Cadeia =====
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preHPF);
    this.preHPF.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.postLPF);
    this.postLPF.connect(this.dcBlock);
    this.dcBlock.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.params = {
      distortion: 50,
      output: 70,
      mix: 100
    };
    this.updateMix(100);
  }

  updateMix(value) {
    const v = Math.max(0, Math.min(100, value));
    if (this.params) this.params.mix = v;
    const x = v / 100;
    const wet = Math.sin((Math.PI / 2) * x);
    const dry = Math.cos((Math.PI / 2) * x);
    this._currentWetLevel = wet;
    this._currentDryLevel = dry;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(wet, now, 0.02);
    this.dryGain.gain.setTargetAtTime(dry, now, 0.02);
  }

  // Curva com limiar ~0.33 (≈ 0,3V germanium), joelho variável e harmônicos extras
  makeDistortionPlusCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);

    const drive = 1 + amount / 12;
    const vt = 0.33;
    const kneeSoftness = Math.max(0.08, 0.22 - amount * 0.0012);

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = x * drive;

      if (y > vt) {
        const over = y - vt;
        y = vt + Math.tanh(over / kneeSoftness) * kneeSoftness;
      } else if (y < -vt) {
        const under = y + vt;
        y = -vt + Math.tanh(under / kneeSoftness) * kneeSoftness;
      }

      y += 0.12 * Math.tanh(x * drive * 3.0);
      y += 0.05 * Math.tanh(x * drive * 5.0);

      curve[i] = Math.max(-1, Math.min(1, y * 0.80));
    }

    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'distortion': {
        const d = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.distortion = d;
        this.clipper.curve = this.makeDistortionPlusCurve(d);
        this.inputGain.gain.setTargetAtTime(2 + d / 33, now, 0.01);

        const clampHz = (hz) => Math.max(500, Math.min(18000, hz));
        const fPost = clampHz(6000 + (100 - d) * 40);
        const fPre = clampHz(8000 + (100 - d) * 60);
        this.postLPF.frequency.setTargetAtTime(fPost, now, 0.02);
        this.antiAliasLPF.frequency.setTargetAtTime(fPre, now, 0.02);
        break;
      }

      case 'output': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        this.outputGain.gain.setTargetAtTime(v / 125, now, 0.01);
        break;
      }

      case 'mix':
        this.updateMix(Math.max(0, Math.min(100, value)));
        break;

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.preHPF.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.postLPF.disconnect();
      this.dcBlock.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default MXRDistortionPlusEffect;
