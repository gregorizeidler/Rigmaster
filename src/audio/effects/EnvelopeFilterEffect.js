import BaseEffect from './BaseEffect';

class EnvelopeFilterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Envelope Filter', 'envfilter');

    // Filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 200;
    this.filter.Q.value = 10;

    // Parameters
    this.sensitivity = 0.8;
    this.minFreq = 200;
    this.maxFreq = 4000;
    this.attackTime = 0.01;
    this.releaseTime = 0.15;

    this._workletReady = false;

    // Envelope-to-frequency scaling
    // Envelope outputs 0..1. GainNode scales to frequency range,
    // then connects to filter.frequency AudioParam.
    this.envScaler = audioContext.createGain();
    this.envScaler.gain.value = (this.maxFreq - this.minFreq) * this.sensitivity;

    // Set base frequency
    this.filter.frequency.value = this.minFreq;

    try {
      this.envelopeFollower = new AudioWorkletNode(audioContext, 'envelope-follower');
      this._workletReady = true;

      // Set initial envelope parameters
      this.envelopeFollower.parameters.get('attack').value = this.attackTime;
      this.envelopeFollower.parameters.get('release').value = this.releaseTime;
      this.envelopeFollower.parameters.get('sensitivity').value = this.sensitivity * 4;
      this.envelopeFollower.parameters.get('mode').value = 0; // RMS

      // Sidechain: input → envelopeFollower → envScaler → filter.frequency
      this.input.connect(this.envelopeFollower);
      this.envelopeFollower.connect(this.envScaler);
      this.envScaler.connect(this.filter.frequency);
    } catch (e) {
      console.warn('EnvelopeFilterEffect: envelope-follower worklet not available', e);
    }

    // Audio signal chain: input → filter → wetGain → output
    this.input.connect(this.filter);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.setMix(0.8);
  }

  _updateEnvScaler() {
    const range = (this.maxFreq - this.minFreq) * this.sensitivity;
    const now = this.audioContext.currentTime;
    this.envScaler.gain.setTargetAtTime(range, now, 0.02);
    this.filter.frequency.setTargetAtTime(this.minFreq, now, 0.02);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'sensitivity':
        this.sensitivity = value / 100;
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('sensitivity').setTargetAtTime(
            this.sensitivity * 4, now, 0.02
          );
        }
        this._updateEnvScaler();
        break;
      case 'resonance': {
        const now = this.audioContext.currentTime;
        this.filter.Q.setTargetAtTime(1 + (value / 100) * 19, now, 0.02);
        break;
      }
      case 'range':
        this.maxFreq = 500 + (value / 100) * 4500;
        this._updateEnvScaler();
        break;
      case 'attack':
        this.attackTime = 0.001 + (value / 100) * 0.099; // 1ms to 100ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('attack').setTargetAtTime(this.attackTime, now, 0.02);
        }
        break;
      case 'release':
        this.releaseTime = 0.01 + (value / 100) * 0.49; // 10ms to 500ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('release').setTargetAtTime(this.releaseTime, now, 0.02);
        }
        break;
      case 'filterType': {
        // 0=lowpass, 1=bandpass, 2=highpass
        const types = ['lowpass', 'bandpass', 'highpass'];
        const idx = Math.floor((value / 100) * 3);
        this.filter.type = types[Math.min(idx, 2)];
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    if (this._workletReady && this.envelopeFollower) {
      try { this.envelopeFollower.disconnect(); } catch (e) {}
    }
    try { this.envScaler.disconnect(); } catch (e) {}
    try { this.filter.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EnvelopeFilterEffect;
