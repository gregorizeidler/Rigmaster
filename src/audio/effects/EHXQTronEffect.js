import BaseEffect from './BaseEffect';

/**
 * EHXQTronEffect - Electro-Harmonix Q-Tron
 *
 * Envelope-controlled filter with selectable filter modes and boost.
 * Spiritual successor to the Mu-Tron III with added versatility.
 *
 * Features:
 * - Selectable range: lowpass, bandpass, highpass, or mix mode
 * - Up/down sweep direction
 * - Drive control for envelope sensitivity
 * - Q (resonance) control for sharp quack or subtle wah
 * - Mix mode blends all three filter types
 *
 * Params: drive (0-100), q (0-100), range ('lp'/'bp'/'hp'/'mix'),
 *         mode ('up'/'down')
 */
class EHXQTronEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Q-Tron', 'ehxqtron');

    // ===== Envelope follower =====
    this.envelopeAnalyser = audioContext.createAnalyser();
    this.envelopeAnalyser.fftSize = 256;
    this.envelopeAnalyser.smoothingTimeConstant = 0.78;
    this._envelopeBuffer = new Uint8Array(this.envelopeAnalyser.frequencyBinCount);

    // ===== Input drive stage =====
    this.driveGain = audioContext.createGain();
    this.driveGain.gain.value = 1.5;

    // ===== Input conditioning =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 50;
    this.inputHPF.Q.value = 0.5;

    // ===== Three parallel filter paths (for mix mode) =====
    // Lowpass filter
    this.lpFilter = audioContext.createBiquadFilter();
    this.lpFilter.type = 'lowpass';
    this.lpFilter.frequency.value = 800;
    this.lpFilter.Q.value = 5.0;

    // Bandpass filter
    this.bpFilter = audioContext.createBiquadFilter();
    this.bpFilter.type = 'bandpass';
    this.bpFilter.frequency.value = 800;
    this.bpFilter.Q.value = 5.0;

    // Highpass filter
    this.hpFilter = audioContext.createBiquadFilter();
    this.hpFilter.type = 'highpass';
    this.hpFilter.frequency.value = 800;
    this.hpFilter.Q.value = 5.0;

    // Gains for each filter path (used to select/mix modes)
    this.lpGain = audioContext.createGain();
    this.lpGain.gain.value = 0;
    this.bpGain = audioContext.createGain();
    this.bpGain.gain.value = 1.0; // Default: bandpass
    this.hpGain = audioContext.createGain();
    this.hpGain.gain.value = 0;

    // Mix bus
    this.filterBus = audioContext.createGain();
    this.filterBus.gain.value = 1.0;

    // ===== Resonance emphasis =====
    this.resonanceBoost = audioContext.createBiquadFilter();
    this.resonanceBoost.type = 'peaking';
    this.resonanceBoost.frequency.value = 800;
    this.resonanceBoost.Q.value = 4.0;
    this.resonanceBoost.gain.value = 6;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.7;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Wet signal chain =====
    this.input.connect(this.driveGain);
    this.driveGain.connect(this.inputHPF);

    // Parallel filter paths
    this.inputHPF.connect(this.lpFilter);
    this.inputHPF.connect(this.bpFilter);
    this.inputHPF.connect(this.hpFilter);

    this.lpFilter.connect(this.lpGain);
    this.bpFilter.connect(this.bpGain);
    this.hpFilter.connect(this.hpGain);

    this.lpGain.connect(this.filterBus);
    this.bpGain.connect(this.filterBus);
    this.hpGain.connect(this.filterBus);

    this.filterBus.connect(this.resonanceBoost);
    this.resonanceBoost.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Envelope follower tap
    this.input.connect(this.envelopeAnalyser);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Envelope state =====
    this._sweepDirection = 'up';
    this._driveSensitivity = 1.5;
    this._qValue = 5.0;
    this._smoothedEnvelope = 0;
    this._baseFreqUp = 200;
    this._baseFreqDown = 5000;
    this._sweepRange = 5000;
    this._animationId = null;
    this._startEnvelopeFollower();

    this.params = { drive: 50, q: 50, range: 'bp', mode: 'up' };
  }

  _startEnvelopeFollower() {
    const tick = () => {
      this.envelopeAnalyser.getByteTimeDomainData(this._envelopeBuffer);

      // RMS detection
      let sum = 0;
      for (let i = 0; i < this._envelopeBuffer.length; i++) {
        const s = (this._envelopeBuffer[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this._envelopeBuffer.length);

      // Envelope smoothing
      const att = 0.35;
      const rel = 0.04;
      if (rms > this._smoothedEnvelope) {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * att;
      } else {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * rel;
      }

      const envScaled = Math.min(this._smoothedEnvelope * this._driveSensitivity * 5, 1.0);

      let targetFreq;
      if (this._sweepDirection === 'up') {
        targetFreq = this._baseFreqUp + envScaled * this._sweepRange;
      } else {
        targetFreq = this._baseFreqDown - envScaled * this._sweepRange;
      }
      targetFreq = Math.min(Math.max(targetFreq, 100), 10000);

      const now = this.audioContext.currentTime;
      this.lpFilter.frequency.setTargetAtTime(targetFreq, now, 0.006);
      this.bpFilter.frequency.setTargetAtTime(targetFreq, now, 0.006);
      this.hpFilter.frequency.setTargetAtTime(targetFreq, now, 0.006);
      this.resonanceBoost.frequency.setTargetAtTime(targetFreq, now, 0.008);

      this._animationId = requestAnimationFrame(tick);
    };
    this._animationId = requestAnimationFrame(tick);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        // 0-100 → sensitivity 0.3 to 4.0
        this._driveSensitivity = 0.3 + (value / 100) * 3.7;
        const inputLevel = 0.8 + (value / 100) * 2.5;
        this.driveGain.gain.setTargetAtTime(inputLevel, now, 0.01);
        break;
      }

      case 'q': {
        // 0-100 → Q from 1 to 18
        this._qValue = 1 + (value / 100) * 17;
        this.lpFilter.Q.setTargetAtTime(this._qValue, now, 0.01);
        this.bpFilter.Q.setTargetAtTime(this._qValue, now, 0.01);
        this.hpFilter.Q.setTargetAtTime(this._qValue, now, 0.01);
        // Resonance boost tracks Q
        const resGain = 2 + (value / 100) * 14;
        this.resonanceBoost.gain.setTargetAtTime(resGain, now, 0.01);
        break;
      }

      case 'range': {
        // Select filter mode: 'lp', 'bp', 'hp', or 'mix'
        const modes = { lp: [1, 0, 0], bp: [0, 1, 0], hp: [0, 0, 1], mix: [0.5, 0.7, 0.4] };
        const gains = modes[value] || modes.bp;
        this.lpGain.gain.setTargetAtTime(gains[0], now, 0.02);
        this.bpGain.gain.setTargetAtTime(gains[1], now, 0.02);
        this.hpGain.gain.setTargetAtTime(gains[2], now, 0.02);
        break;
      }

      case 'mode':
        this._sweepDirection = value; // 'up' or 'down'
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
      this.driveGain.disconnect();
      this.inputHPF.disconnect();
      this.envelopeAnalyser.disconnect();
      this.lpFilter.disconnect();
      this.bpFilter.disconnect();
      this.hpFilter.disconnect();
      this.lpGain.disconnect();
      this.bpGain.disconnect();
      this.hpGain.disconnect();
      this.filterBus.disconnect();
      this.resonanceBoost.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default EHXQTronEffect;
