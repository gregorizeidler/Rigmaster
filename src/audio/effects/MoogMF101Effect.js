import BaseEffect from './BaseEffect';

/**
 * MoogMF101Effect - Moog MF-101 Lowpass Filter
 *
 * Emulation of the Moogerfooger MF-101 ladder lowpass filter.
 * Legendary analog filter known for its creamy, musical resonance.
 *
 * Features:
 * - 4-pole (24dB/oct) lowpass ladder filter emulation via cascaded biquads
 * - Self-oscillating resonance at high settings
 * - Envelope follower for dynamic cutoff modulation
 * - Drive stage for input saturation
 * - Smooth cutoff sweep from 20Hz to 15kHz
 *
 * Params: cutoff (0-100), resonance (0-100), envelope_amount (0-100),
 *         mix (0-100), drive (0-100)
 */
class MoogMF101Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Moog MF-101', 'moogmf101');

    // ===== Drive stage =====
    this.driveGain = audioContext.createGain();
    this.driveGain.gain.value = 1.0;

    this.driveSaturation = audioContext.createWaveShaper();
    this.driveSaturation.oversample = '4x';
    this.driveSaturation.curve = this._makeSoftClipCurve();

    // ===== 4-pole ladder filter (4 cascaded lowpass biquads) =====
    this.filterStages = [];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      // Low Q per stage — the cascade creates the 24dB slope
      filter.Q.value = 0.5;
      this.filterStages.push(filter);
    }

    // ===== Resonance feedback path =====
    this.resonanceGain = audioContext.createGain();
    this.resonanceGain.gain.value = 0;

    // Feedback limiter to prevent runaway at high resonance
    this.feedbackLimiter = audioContext.createDynamicsCompressor();
    this.feedbackLimiter.threshold.value = -3;
    this.feedbackLimiter.ratio.value = 20;
    this.feedbackLimiter.attack.value = 0.001;
    this.feedbackLimiter.release.value = 0.02;

    // ===== Envelope follower (AnalyserNode-based) =====
    this.envelopeAnalyser = audioContext.createAnalyser();
    this.envelopeAnalyser.fftSize = 256;
    this.envelopeAnalyser.smoothingTimeConstant = 0.85;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.8;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Wet signal chain =====
    this.input.connect(this.driveGain);
    this.driveGain.connect(this.driveSaturation);

    // Feed into filter cascade
    this.driveSaturation.connect(this.filterStages[0]);
    for (let i = 0; i < 3; i++) {
      this.filterStages[i].connect(this.filterStages[i + 1]);
    }

    // Resonance feedback: output of stage 4 → feedback gain → stage 1 input
    this.filterStages[3].connect(this.resonanceGain);
    this.resonanceGain.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.filterStages[0]);

    // Output chain
    this.filterStages[3].connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Envelope follower tap
    this.input.connect(this.envelopeAnalyser);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Envelope follower animation loop =====
    this._envelopeAmount = 0;
    this._baseCutoff = 2000;
    this._envelopeBuffer = new Uint8Array(this.envelopeAnalyser.frequencyBinCount);
    this._animationId = null;
    this._startEnvelopeFollower();

    this.params = {
      cutoff: 50, resonance: 0, envelope_amount: 0, mix: 100, drive: 0
    };
  }

  _makeSoftClipCurve() {
    const n = 8192;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * 2) * 0.8;
    }
    return curve;
  }

  _startEnvelopeFollower() {
    const tick = () => {
      if (this._envelopeAmount > 0.01) {
        this.envelopeAnalyser.getByteTimeDomainData(this._envelopeBuffer);

        // RMS envelope detection
        let sum = 0;
        for (let i = 0; i < this._envelopeBuffer.length; i++) {
          const sample = (this._envelopeBuffer[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / this._envelopeBuffer.length);

        // Modulate cutoff based on envelope
        const modRange = this._envelopeAmount * 8000;
        const modCutoff = Math.min(this._baseCutoff + rms * modRange, 18000);
        const now = this.audioContext.currentTime;

        for (let i = 0; i < 4; i++) {
          this.filterStages[i].frequency.setTargetAtTime(modCutoff, now, 0.008);
        }
      }
      this._animationId = requestAnimationFrame(tick);
    };
    this._animationId = requestAnimationFrame(tick);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'cutoff': {
        // Logarithmic: 20Hz – 15kHz
        const minLog = Math.log10(20);
        const maxLog = Math.log10(15000);
        const freq = Math.pow(10, minLog + (value / 100) * (maxLog - minLog));
        this._baseCutoff = freq;
        for (let i = 0; i < 4; i++) {
          this.filterStages[i].frequency.setTargetAtTime(freq, now, 0.015);
        }
        break;
      }

      case 'resonance': {
        // 0-100 → feedback gain 0 to 0.85 (near self-oscillation)
        const fb = (value / 100) * 0.85;
        this.resonanceGain.gain.setTargetAtTime(fb, now, 0.01);
        // Slight Q bump on each stage to enhance resonant peak
        const stageQ = 0.5 + (value / 100) * 3.5;
        for (let i = 0; i < 4; i++) {
          this.filterStages[i].Q.setTargetAtTime(stageQ, now, 0.01);
        }
        break;
      }

      case 'envelope_amount':
        this._envelopeAmount = value / 100;
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'drive': {
        // 0-100 → gain 1.0 to 6.0
        const driveLevel = 1.0 + (value / 100) * 5.0;
        this.driveGain.gain.setTargetAtTime(driveLevel, now, 0.01);
        break;
      }

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
      this.driveGain.disconnect();
      this.driveSaturation.disconnect();
      this.filterStages.forEach(f => f.disconnect());
      this.resonanceGain.disconnect();
      this.feedbackLimiter.disconnect();
      this.envelopeAnalyser.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default MoogMF101Effect;
