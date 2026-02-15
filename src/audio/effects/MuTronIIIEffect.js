import BaseEffect from './BaseEffect';

/**
 * MuTronIIIEffect - Mu-Tron III
 *
 * Legendary envelope-controlled filter. Jerry Garcia's signature funk tone.
 * The gold standard for envelope filters since 1972.
 *
 * Features:
 * - Selectable filter mode: lowpass, bandpass, highpass
 * - Up/down sweep direction
 * - Peak (resonance) control for sharp, quacky response
 * - Gain control sets envelope follower input sensitivity
 * - Optocoupler-style smooth envelope response
 *
 * Params: peak (0-100), gain (0-100),
 *         mode ('lp'/'bp'/'hp'), drive ('up'/'down')
 */
class MuTronIIIEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mu-Tron III', 'mutroniii');

    // ===== Envelope follower =====
    this.envelopeAnalyser = audioContext.createAnalyser();
    this.envelopeAnalyser.fftSize = 256;
    this.envelopeAnalyser.smoothingTimeConstant = 0.75;
    this._envelopeBuffer = new Uint8Array(this.envelopeAnalyser.frequencyBinCount);

    // ===== Input gain (affects envelope sensitivity) =====
    this.inputSensitivity = audioContext.createGain();
    this.inputSensitivity.gain.value = 1.5;

    // ===== Main swept filter =====
    this.mainFilter = audioContext.createBiquadFilter();
    this.mainFilter.type = 'bandpass'; // Default mode
    this.mainFilter.frequency.value = 400;
    this.mainFilter.Q.value = 5.0;

    // ===== Secondary resonance filter (adds Mu-Tron character) =====
    this.resonanceFilter = audioContext.createBiquadFilter();
    this.resonanceFilter.type = 'peaking';
    this.resonanceFilter.frequency.value = 400;
    this.resonanceFilter.Q.value = 3.0;
    this.resonanceFilter.gain.value = 8;

    // ===== Input conditioning =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 40;
    this.inputHPF.Q.value = 0.5;

    // ===== Low-end body preservation =====
    this.lowBody = audioContext.createBiquadFilter();
    this.lowBody.type = 'lowshelf';
    this.lowBody.frequency.value = 200;
    this.lowBody.gain.value = 2;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.75;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Wet signal chain =====
    this.input.connect(this.inputSensitivity);
    this.inputSensitivity.connect(this.inputHPF);
    this.inputHPF.connect(this.mainFilter);
    this.mainFilter.connect(this.resonanceFilter);
    this.resonanceFilter.connect(this.lowBody);
    this.lowBody.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Envelope tap
    this.input.connect(this.envelopeAnalyser);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Envelope state =====
    this._sweepDirection = 'up'; // 'up' or 'down'
    this._filterMode = 'bp';
    this._peak = 5.0;
    this._gainSensitivity = 1.5;
    this._smoothedEnvelope = 0;
    this._baseFreqUp = 200;
    this._baseFreqDown = 4000;
    this._sweepRange = 4000;
    this._animationId = null;
    this._startEnvelopeFollower();

    this.params = { peak: 50, gain: 50, mode: 'bp', drive: 'up' };
  }

  _startEnvelopeFollower() {
    const tick = () => {
      this.envelopeAnalyser.getByteTimeDomainData(this._envelopeBuffer);

      // RMS envelope detection (smoother than peak for Mu-Tron character)
      let sum = 0;
      for (let i = 0; i < this._envelopeBuffer.length; i++) {
        const sample = (this._envelopeBuffer[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / this._envelopeBuffer.length);

      // Optocoupler-style smoothing (slow attack, medium release)
      const attackCoeff = 0.25;
      const releaseCoeff = 0.04;
      if (rms > this._smoothedEnvelope) {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * attackCoeff;
      } else {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * releaseCoeff;
      }

      // Scale by gain sensitivity
      const envScaled = Math.min(this._smoothedEnvelope * this._gainSensitivity * 5, 1.0);

      let targetFreq;
      if (this._sweepDirection === 'up') {
        targetFreq = this._baseFreqUp + envScaled * this._sweepRange;
      } else {
        targetFreq = this._baseFreqDown - envScaled * this._sweepRange;
      }
      targetFreq = Math.min(Math.max(targetFreq, 100), 8000);

      const now = this.audioContext.currentTime;
      this.mainFilter.frequency.setTargetAtTime(targetFreq, now, 0.008);
      this.resonanceFilter.frequency.setTargetAtTime(targetFreq, now, 0.01);

      this._animationId = requestAnimationFrame(tick);
    };
    this._animationId = requestAnimationFrame(tick);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'peak': {
        // 0-100 → Q from 1 to 15 (higher = more resonant/quacky)
        this._peak = 1 + (value / 100) * 14;
        this.mainFilter.Q.setTargetAtTime(this._peak, now, 0.01);
        // Resonance peak gain tracks Q
        const resGain = 3 + (value / 100) * 12;
        this.resonanceFilter.gain.setTargetAtTime(resGain, now, 0.01);
        this.resonanceFilter.Q.setTargetAtTime(this._peak * 0.6, now, 0.01);
        break;
      }

      case 'gain': {
        // 0-100 → sensitivity multiplier 0.3 to 4.0
        this._gainSensitivity = 0.3 + (value / 100) * 3.7;
        const inputLevel = 0.8 + (value / 100) * 2.0;
        this.inputSensitivity.gain.setTargetAtTime(inputLevel, now, 0.01);
        break;
      }

      case 'mode': {
        // 'lp', 'bp', or 'hp'
        this._filterMode = value;
        const modeMap = { lp: 'lowpass', bp: 'bandpass', hp: 'highpass' };
        this.mainFilter.type = modeMap[value] || 'bandpass';
        break;
      }

      case 'drive':
        // 'up' or 'down'
        this._sweepDirection = value;
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }
    try {
      this.inputSensitivity.disconnect();
      this.inputHPF.disconnect();
      this.envelopeAnalyser.disconnect();
      this.mainFilter.disconnect();
      this.resonanceFilter.disconnect();
      this.lowBody.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default MuTronIIIEffect;
