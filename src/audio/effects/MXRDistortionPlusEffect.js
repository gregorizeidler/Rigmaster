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

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
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

    // ===== Saída =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.4;

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
    
    // Inicializa params para UI
    this.params = {
      distortion: 50,
      output: 70
    };
  }

  // Curva com limiar ~0.33 (≈ 0,3V germanium), joelho suave e harmônicos extras
  makeDistortionPlusCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);

    // "Distortion" do pedal ≈ ganho do op-amp; mantemos limiar fixo e subimos drive
    const drive = 1 + amount / 12;      // faixa agressiva como o D+
    const vt = 0.33;                    // "threshold" aproximado de diodo Ge
    const kneeSoftness = 0.2;           // joelho para não serrilhar demais

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * drive;

      // Região de transição suave ao redor de ±vt
      if (y > vt) {
        const over = y - vt;
        y = vt + Math.tanh(over / kneeSoftness) * kneeSoftness;
      } else if (y < -vt) {
        const under = y + vt;
        y = -vt + Math.tanh(under / kneeSoftness) * kneeSoftness;
      }

      // Um pouco do "fizz" típico do Dist+ (ímpares mais evidentes)
      y += 0.12 * Math.tanh(x * drive * 3.0);
      y += 0.05 * Math.tanh(x * drive * 5.0);

      curve[i] = y * 0.80;
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
        // Regera curve e ajusta ganho de entrada como no knob original
        this.clipper.curve = this.makeDistortionPlusCurve(value);
        this.inputGain.gain.setTargetAtTime(2 + value / 33, now, 0.01);

        // Mais drive => baixa o LPF para domar aspereza
        const fAA = 6000 + (100 - value) * 40; // ~6–10 kHz
        this.postLPF.frequency.setTargetAtTime(fAA, now, 0.02);
        break;
      }

      case 'output':
        // Saída do pedal (o D+ tem bastante volume)
        this.outputGain.gain.setTargetAtTime(value / 125, now, 0.01);
        break;

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
