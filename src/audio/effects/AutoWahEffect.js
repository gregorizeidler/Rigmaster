import BaseEffect from './BaseEffect';

class AutoWahEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Auto Wah', 'autowah');

    // Wah filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 10;
    this.filter.frequency.value = 500;

    // Parameters
    this.sensitivity = 0.5;
    this.minFreq = 200;
    this.maxFreq = 2000;
    this.attackTime = 0.01;
    this.releaseTime = 0.1;

    this._workletReady = false;

    // Envelope-to-frequency scaling gain node
    // The envelope outputs 0..1 signal. We use a GainNode to scale it
    // to the frequency range and connect to filter.frequency AudioParam.
    this.envScaler = audioContext.createGain();
    this.envScaler.gain.value = (this.maxFreq - this.minFreq) * this.sensitivity;

    // Set base frequency on the filter
    this.filter.frequency.value = this.minFreq;

    try {
      this.envelopeFollower = new AudioWorkletNode(audioContext, 'envelope-follower');
      this._workletReady = true;

      // Set initial envelope parameters
      this.envelopeFollower.parameters.get('attack').value = this.attackTime;
      this.envelopeFollower.parameters.get('release').value = this.releaseTime;
      this.envelopeFollower.parameters.get('sensitivity').value = this.sensitivity * 5;
      this.envelopeFollower.parameters.get('mode').value = 0; // RMS mode

      // Sidechain: input → envelopeFollower → envScaler → filter.frequency
      this.input.connect(this.envelopeFollower);
      this.envelopeFollower.connect(this.envScaler);
      this.envScaler.connect(this.filter.frequency);
    } catch (e) {
      console.warn('AutoWahEffect: envelope-follower worklet not available', e);
    }

    // Audio signal chain: input → filter → wetGain → output
    this.input.connect(this.filter);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
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
            this.sensitivity * 5, now, 0.02
          );
        }
        this._updateEnvScaler();
        break;
      case 'resonance': {
        const now = this.audioContext.currentTime;
        this.filter.Q.setTargetAtTime(5 + (value / 100) * 15, now, 0.02);
        break;
      }
      case 'speed': {
        // Maps to attack/release responsiveness
        this.attackTime = 0.005 + (1 - value / 100) * 0.095; // Faster speed = shorter attack
        this.releaseTime = 0.02 + (1 - value / 100) * 0.28;
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('attack').setTargetAtTime(this.attackTime, now, 0.02);
          this.envelopeFollower.parameters.get('release').setTargetAtTime(this.releaseTime, now, 0.02);
        }
        break;
      }
      case 'range':
        this.maxFreq = 1000 + (value / 100) * 3000; // 1000Hz to 4000Hz
        this._updateEnvScaler();
        break;
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

export default AutoWahEffect;
