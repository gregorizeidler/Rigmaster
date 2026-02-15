import BaseEffect from './BaseEffect';

class NoiseGateEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Noise Gate', 'noisegate');

    // Gate parameters (user-facing)
    this.threshold = -40; // dB
    this.attack = 0.001; // seconds
    this.release = 0.1; // seconds
    this.hold = 8; // ms

    this._workletReady = false;

    // Try to use the hard-gate AudioWorklet for sample-accurate gating
    try {
      this.hardGate = new AudioWorkletNode(audioContext, 'hard-gate');
      this._workletReady = true;

      // Set initial parameters with 8dB hysteresis
      this._applyThreshold(this.threshold);
      this.hardGate.parameters.get('attack').value = this.attack;
      this.hardGate.parameters.get('release').value = this.release;
      this.hardGate.parameters.get('holdMs').value = this.hold;
      this.hardGate.parameters.get('floorDb').value = -80;

      // Signal chain: input → hardGate → wetGain → output
      this.input.connect(this.hardGate);
      this.hardGate.connect(this.wetGain);
      this.wetGain.connect(this.output);
    } catch (e) {
      console.warn('NoiseGateEffect: hard-gate worklet not available, using fallback', e);
      // Fallback: simple gain-based gate (no gating, just pass-through)
      this.gainNode = audioContext.createGain();
      this.gainNode.gain.value = 1;
      this.input.connect(this.gainNode);
      this.gainNode.connect(this.wetGain);
      this.wetGain.connect(this.output);
    }

    // Dry signal path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  _applyThreshold(thresholdDb) {
    if (!this._workletReady) return;
    // Apply hysteresis: open threshold at thresholdDb, close 8dB lower
    const now = this.audioContext.currentTime;
    this.hardGate.parameters.get('thOpen').setTargetAtTime(thresholdDb, now, 0.02);
    this.hardGate.parameters.get('thClose').setTargetAtTime(thresholdDb - 8, now, 0.02);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'threshold':
        this.threshold = -60 + (value / 100) * 40; // -60dB to -20dB
        this._applyThreshold(this.threshold);
        break;
      case 'attack': {
        this.attack = 0.001 + (value / 100) * 0.049; // 1ms to 50ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.hardGate.parameters.get('attack').setTargetAtTime(this.attack, now, 0.02);
        }
        break;
      }
      case 'release': {
        this.release = 0.01 + (value / 100) * 0.49; // 10ms to 500ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.hardGate.parameters.get('release').setTargetAtTime(this.release, now, 0.02);
        }
        break;
      }
      case 'hold': {
        this.hold = (value / 100) * 50; // 0ms to 50ms
        if (this._workletReady) {
          const now = this.audioContext.currentTime;
          this.hardGate.parameters.get('holdMs').setTargetAtTime(this.hold, now, 0.02);
        }
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    if (this._workletReady && this.hardGate) {
      try { this.hardGate.disconnect(); } catch (e) {}
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) {}
    }
    super.disconnect();
  }
}

export default NoiseGateEffect;
