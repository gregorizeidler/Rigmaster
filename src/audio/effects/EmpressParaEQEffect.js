import BaseEffect from './BaseEffect';

/**
 * EmpressParaEQEffect - Empress ParaEQ Deluxe
 *
 * Boutique 3-band fully parametric EQ with clean boost.
 * Known for transparent, studio-quality tone shaping in a pedal format.
 *
 * Features:
 * - 3 fully sweepable parametric bands (low, mid, hi)
 * - Each band: frequency, gain, and fixed musical Q
 * - Up to +30dB clean boost
 * - Ultra-low noise floor
 *
 * Params: low_freq, low_gain, mid_freq, mid_gain, hi_freq, hi_gain, boost (all 0-100)
 */
class EmpressParaEQEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Empress ParaEQ', 'empressparaeq');

    // ===== Low band =====
    this.lowBand = audioContext.createBiquadFilter();
    this.lowBand.type = 'lowshelf';
    this.lowBand.frequency.value = 100;
    this.lowBand.gain.value = 0;
    this.lowBand.Q.value = 0.707;

    // ===== Mid band =====
    this.midBand = audioContext.createBiquadFilter();
    this.midBand.type = 'peaking';
    this.midBand.frequency.value = 1000;
    this.midBand.gain.value = 0;
    this.midBand.Q.value = 1.5;

    // ===== High band =====
    this.hiBand = audioContext.createBiquadFilter();
    this.hiBand.type = 'highshelf';
    this.hiBand.frequency.value = 5000;
    this.hiBand.gain.value = 0;
    this.hiBand.Q.value = 0.707;

    // ===== Input conditioning =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 20;
    this.inputHPF.Q.value = 0.707;

    // ===== Output LPF — protect against ultrasonic artefacts =====
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 20000;
    this.outputLPF.Q.value = 0.5;

    // ===== Boost stage (clean gain up to +30dB) =====
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.0;

    // ===== Output level =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;

    // ===== Wet signal chain =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.lowBand);
    this.lowBand.connect(this.midBand);
    this.midBand.connect(this.hiBand);
    this.hiBand.connect(this.boostGain);
    this.boostGain.connect(this.outputLPF);
    this.outputLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = {
      low_freq: 20, low_gain: 50,
      mid_freq: 50, mid_gain: 50,
      hi_freq: 75, hi_gain: 50,
      boost: 0
    };
  }

  /**
   * Map 0-100 to a logarithmic frequency range.
   * @param {number} value 0–100
   * @param {number} minHz lower bound
   * @param {number} maxHz upper bound
   */
  _mapFreq(value, minHz, maxHz) {
    const minLog = Math.log10(minHz);
    const maxLog = Math.log10(maxHz);
    return Math.pow(10, minLog + (value / 100) * (maxLog - minLog));
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      // ----- Low band -----
      case 'low_freq': {
        // 40Hz – 500Hz sweep
        const freq = this._mapFreq(value, 40, 500);
        this.lowBand.frequency.setTargetAtTime(freq, now, 0.015);
        break;
      }
      case 'low_gain': {
        const gain = ((value - 50) / 50) * 15;
        this.lowBand.gain.setTargetAtTime(gain, now, 0.01);
        break;
      }

      // ----- Mid band -----
      case 'mid_freq': {
        // 200Hz – 5kHz sweep
        const freq = this._mapFreq(value, 200, 5000);
        this.midBand.frequency.setTargetAtTime(freq, now, 0.015);
        break;
      }
      case 'mid_gain': {
        const gain = ((value - 50) / 50) * 15;
        this.midBand.gain.setTargetAtTime(gain, now, 0.01);
        break;
      }

      // ----- High band -----
      case 'hi_freq': {
        // 1kHz – 16kHz sweep
        const freq = this._mapFreq(value, 1000, 16000);
        this.hiBand.frequency.setTargetAtTime(freq, now, 0.015);
        break;
      }
      case 'hi_gain': {
        const gain = ((value - 50) / 50) * 15;
        this.hiBand.gain.setTargetAtTime(gain, now, 0.01);
        break;
      }

      // ----- Boost (0–100 → 0dB to +30dB) -----
      case 'boost': {
        // dB to linear: 10^(dB/20)
        const dB = (value / 100) * 30;
        const linear = Math.pow(10, dB / 20);
        this.boostGain.gain.setTargetAtTime(linear, now, 0.01);
        break;
      }

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputHPF.disconnect();
      this.lowBand.disconnect();
      this.midBand.disconnect();
      this.hiBand.disconnect();
      this.boostGain.disconnect();
      this.outputLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default EmpressParaEQEffect;
