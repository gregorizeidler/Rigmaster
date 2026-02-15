class BaseEffect {
  constructor(audioContext, id, name, type) {
    this.audioContext = audioContext;
    this.id = id || 'effect-' + Math.random().toString(36).substr(2, 9);
    this.name = name || 'Effect';
    this.type = type || 'effect';
    this.bypassed = false;
    
    // Crossfade time for click-free bypass (seconds)
    this._bypassFadeTime = 0.02; // 20ms crossfade
    
    // Current mix values (for restoring after bypass)
    this._currentWetLevel = 1.0;
    this._currentDryLevel = 0.0;
    
    // Create input and output nodes
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Default gain values for wet/dry mix
    // When NOT bypassed: wet=1.0, dry=0.0 (effect active)
    // When bypassed: wet=0.0, dry=1.0 (effect bypassed)
    this.wetGain.gain.value = 1.0;
    this.dryGain.gain.value = 0.0;
    
    // NOTE: Child effects MUST connect both:
    // 1. wet signal: input -> [processing] -> wetGain -> output
    // 2. dry signal: input -> dryGain -> output
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    try {
      this.input.disconnect();
    } catch (e) {}
    try {
      this.output.disconnect();
    } catch (e) {}
    try {
      this.wetGain.disconnect();
    } catch (e) {}
    try {
      this.dryGain.disconnect();
    } catch (e) {}
  }

  toggleBypass() {
    this.bypassed = !this.bypassed;
    const now = this.audioContext.currentTime;
    const fadeEnd = now + this._bypassFadeTime;
    
    // Cancel any scheduled ramps to prevent conflicts
    this.wetGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.cancelScheduledValues(now);
    
    // Set current value as starting point
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    
    if (this.bypassed) {
      // Crossfade to bypass: wet → 0, dry → 1
      this.wetGain.gain.linearRampToValueAtTime(0.0, fadeEnd);
      this.dryGain.gain.linearRampToValueAtTime(1.0, fadeEnd);
    } else {
      // Crossfade to active: restore saved mix levels
      this.wetGain.gain.linearRampToValueAtTime(this._currentWetLevel, fadeEnd);
      this.dryGain.gain.linearRampToValueAtTime(this._currentDryLevel, fadeEnd);
    }
    
    return this.bypassed;
  }

  updateParameter(parameter, value) {
    // Override in subclasses
  }

  setMix(value) {
    // value from 0 to 1
    this._currentWetLevel = value;
    this._currentDryLevel = 1 - value;
    
    if (!this.bypassed) {
      const now = this.audioContext.currentTime;
      this.wetGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
      this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
      this.wetGain.gain.linearRampToValueAtTime(value, now + 0.02);
      this.dryGain.gain.linearRampToValueAtTime(1 - value, now + 0.02);
    }
  }
}

export default BaseEffect;

