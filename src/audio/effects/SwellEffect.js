import BaseEffect from './BaseEffect.js';

class SwellEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Swell', 'swell');

    // SWELL (Volume swell/reverse effect)

    // Swell gain node - controlled by envelope
    this.swellGain = audioContext.createGain();
    this.swellGain.gain.value = 0; // Start silent

    // Parameters
    this.attackTime = 0.3; // 300ms swell attack
    this.releaseTime = 0.1; // 100ms release
    this.sensitivityValue = 1.0;

    this._workletReady = false;

    // Envelope scaler: maps 0..1 envelope signal to gain control
    // The envelope follower detects input level. We use it to drive
    // the swell gain: when signal is detected, volume ramps up.
    this.envScaler = audioContext.createGain();
    this.envScaler.gain.value = 1.0;

    try {
      this.envelopeFollower = new AudioWorkletNode(audioContext, 'envelope-follower');
      this._workletReady = true;

      // Longer attack for swell effect, fast release to detect note end
      this.envelopeFollower.parameters.get('attack').value = this.attackTime;
      this.envelopeFollower.parameters.get('release').value = this.releaseTime;
      this.envelopeFollower.parameters.get('sensitivity').value = this.sensitivityValue;
      this.envelopeFollower.parameters.get('mode').value = 1; // Peak mode for better transient detection

      // Sidechain: input → envelopeFollower → envScaler → swellGain.gain
      this.input.connect(this.envelopeFollower);
      this.envelopeFollower.connect(this.envScaler);
      this.envScaler.connect(this.swellGain.gain);
    } catch (e) {
      console.warn('SwellEffect: envelope-follower worklet not available, using fallback', e);
      // Fallback: just pass audio through
      this.swellGain.gain.value = 1;
    }

    // Audio signal chain: input → swellGain → wetGain → output
    this.input.connect(this.swellGain);
    this.swellGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { attack: 30, sensitivity: 50, mode: 0 };
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'attack':
        this.attackTime = 0.01 + (value / 100) * 2; // 10ms to 2s
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('attack').setTargetAtTime(this.attackTime, now, 0.02);
        }
        break;
      case 'sensitivity':
        this.sensitivityValue = 0.5 + (value / 100) * 4.5; // 0.5 to 5.0
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('sensitivity').setTargetAtTime(
            this.sensitivityValue, now, 0.02
          );
        }
        break;
      case 'release':
        this.releaseTime = 0.01 + (value / 100) * 0.49; // 10ms to 500ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.envelopeFollower.parameters.get('release').setTargetAtTime(this.releaseTime, now, 0.02);
        }
        break;
      case 'mode':
        // 0=swell, 1=reverse (reverse inverts envelope)
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          // For reverse mode, invert the scaler
          this.envScaler.gain.setTargetAtTime(value === 1 ? -1.0 : 1.0, now, 0.02);
          if (value === 1) {
            // In reverse mode, set base gain to 1 so inverted envelope subtracts
            this.swellGain.gain.setTargetAtTime(1.0, now, 0.02);
          }
        }
        break;
    }

    this.params[parameter] = value;
  }

  disconnect() {
    if (this._workletReady && this.envelopeFollower) {
      try { this.envelopeFollower.disconnect(); } catch (e) {}
    }
    try { this.envScaler.disconnect(); } catch (e) {}
    try { this.swellGain.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default SwellEffect;
