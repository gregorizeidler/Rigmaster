class BaseAmp {
  constructor(audioContext, id, name, type) {
    this.audioContext = audioContext;
    this.id = id;
    this.name = name;
    this.type = type;
    this.bypassed = false;
    
    // Create base nodes
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    
    // Default params
    this.params = {
      gain: 50,
      bass: 50,
      mid: 50,
      treble: 50,
      presence: 50,
      master: 70
    };
  }
  
  connect(destination) {
    this.output.connect(destination);
  }
  
  disconnect() {
    try {
      this.input.disconnect();
      this.output.disconnect();
    } catch (e) {
      console.warn('Error disconnecting amp:', e);
    }
  }
  
  bypass(shouldBypass) {
    this.bypassed = shouldBypass;
    if (shouldBypass) {
      this.input.disconnect();
      this.input.connect(this.output);
    } else {
      this.reconnect();
    }
  }
  
  reconnect() {
    // Override in subclasses
  }
  
  updateParameter(parameter, value) {
    // Override in subclasses
    this.params[parameter] = value;
  }
  
  // Helper to create saturation curves
  makeSaturationCurve(amount, samples = 44100) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  }
}

export default BaseAmp;

