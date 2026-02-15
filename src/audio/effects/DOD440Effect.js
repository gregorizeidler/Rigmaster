import BaseEffect from './BaseEffect';

/**
 * DOD440Effect - DOD 440 Envelope Filter
 *
 * Classic wide-range envelope-controlled filter.
 * Known for: Funky auto-wah tones, Jerry Garcia-inspired leads.
 *
 * Features:
 * - Envelope follower drives bandpass filter cutoff
 * - Wide sensitivity range for clean to distorted signals
 * - Range control sets the sweep ceiling
 * - Output level control
 *
 * Params: sensitivity (0-100), range (0-100), level (0-100)
 */
class DOD440Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'DOD 440', 'dod440');

    // ===== Envelope follower =====
    this.envelopeAnalyser = audioContext.createAnalyser();
    this.envelopeAnalyser.fftSize = 256;
    this.envelopeAnalyser.smoothingTimeConstant = 0.8;
    this._envelopeBuffer = new Uint8Array(this.envelopeAnalyser.frequencyBinCount);

    // ===== Input buffer / gain staging =====
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;

    // ===== Sub-bass preservation HPF =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 60;
    this.inputHPF.Q.value = 0.5;

    // ===== Main swept bandpass filter =====
    this.sweepFilter = audioContext.createBiquadFilter();
    this.sweepFilter.type = 'bandpass';
    this.sweepFilter.frequency.value = 500;
    this.sweepFilter.Q.value = 4.0;

    // ===== Secondary resonance peak (adds body to the sweep) =====
    this.resonancePeak = audioContext.createBiquadFilter();
    this.resonancePeak.type = 'peaking';
    this.resonancePeak.frequency.value = 500;
    this.resonancePeak.Q.value = 2.0;
    this.resonancePeak.gain.value = 6;

    // ===== Low-end blend (retains body) =====
    this.lowBlend = audioContext.createBiquadFilter();
    this.lowBlend.type = 'lowshelf';
    this.lowBlend.frequency.value = 250;
    this.lowBlend.gain.value = 3;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.7;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Wet signal chain =====
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.inputHPF);
    this.inputHPF.connect(this.sweepFilter);
    this.sweepFilter.connect(this.resonancePeak);
    this.resonancePeak.connect(this.lowBlend);
    this.lowBlend.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Envelope follower tap
    this.input.connect(this.envelopeAnalyser);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Envelope tracking state =====
    this._sensitivity = 0.5;
    this._rangeMax = 3000;
    this._baseFreq = 200;
    this._smoothedEnvelope = 0;
    this._animationId = null;
    this._startEnvelopeFollower();

    this.params = { sensitivity: 50, range: 50, level: 70 };
  }

  _startEnvelopeFollower() {
    const tick = () => {
      this.envelopeAnalyser.getByteTimeDomainData(this._envelopeBuffer);

      // Peak envelope detection
      let peak = 0;
      for (let i = 0; i < this._envelopeBuffer.length; i++) {
        const sample = Math.abs((this._envelopeBuffer[i] - 128) / 128);
        if (sample > peak) peak = sample;
      }

      // Smooth the envelope (attack fast, release slow)
      const attackCoeff = 0.4;
      const releaseCoeff = 0.05;
      if (peak > this._smoothedEnvelope) {
        this._smoothedEnvelope += (peak - this._smoothedEnvelope) * attackCoeff;
      } else {
        this._smoothedEnvelope += (peak - this._smoothedEnvelope) * releaseCoeff;
      }

      // Map envelope to filter frequency
      const envScaled = Math.min(this._smoothedEnvelope * this._sensitivity * 4, 1.0);
      const targetFreq = this._baseFreq + envScaled * this._rangeMax;
      const clampedFreq = Math.min(Math.max(targetFreq, 100), 8000);

      const now = this.audioContext.currentTime;
      this.sweepFilter.frequency.setTargetAtTime(clampedFreq, now, 0.006);
      this.resonancePeak.frequency.setTargetAtTime(clampedFreq * 0.9, now, 0.008);

      this._animationId = requestAnimationFrame(tick);
    };
    this._animationId = requestAnimationFrame(tick);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'sensitivity':
        // 0-100 → 0.1 to 3.0 multiplier
        this._sensitivity = 0.1 + (value / 100) * 2.9;
        break;

      case 'range':
        // 0-100 → sweep ceiling from 800Hz to 6kHz
        this._rangeMax = 800 + (value / 100) * 5200;
        // Also adjust Q: higher range = slightly less Q for musicality
        const q = 6 - (value / 100) * 3;
        this.sweepFilter.Q.setTargetAtTime(q, now, 0.01);
        break;

      case 'level':
        this.outputGain.gain.setTargetAtTime((value / 100) * 1.4, now, 0.01);
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
      this.inputGain.disconnect();
      this.inputHPF.disconnect();
      this.envelopeAnalyser.disconnect();
      this.sweepFilter.disconnect();
      this.resonancePeak.disconnect();
      this.lowBlend.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default DOD440Effect;
