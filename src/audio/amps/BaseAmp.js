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
  makeSaturationCurve(amount, samples = 65536) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  }
  
  // ============================================
  // AUDIOWORKLET PROCESSOR HELPERS
  // ============================================
  
  /**
   * Create noise gate AudioWorklet node (for high-gain amps)
   * @param {Object} config - Gate configuration
   * @returns {AudioWorkletNode|null} Gate node or null if unavailable
   */
  createNoiseGate(config = {}) {
    try {
      const gate = new AudioWorkletNode(this.audioContext, 'hard-gate');
      
      // Default settings for high-gain amps
      const defaults = {
        thOpen: -50,      // Threshold to open gate (dB)
        thClose: -58,     // Threshold to close gate (dB)
        attack: 0.0007,   // Fast attack (0.7ms)
        release: 0.16,    // Medium release (160ms)
        rms: 0.015,       // RMS window (15ms)
        peakMix: 0.35,    // Peak/RMS mix
        floorDb: -70,     // Gate floor (not digital silence)
        holdMs: 8         // Hold time (prevents chattering)
      };
      
      const settings = { ...defaults, ...config };
      
      // Apply parameters
      gate.parameters.get('thOpen').value = settings.thOpen;
      gate.parameters.get('thClose').value = settings.thClose;
      gate.parameters.get('attack').value = settings.attack;
      gate.parameters.get('release').value = settings.release;
      gate.parameters.get('rms').value = settings.rms;
      gate.parameters.get('peakMix').value = settings.peakMix;
      gate.parameters.get('floorDb').value = settings.floorDb;
      gate.parameters.get('holdMs').value = settings.holdMs;
      
      console.log(`✅ Noise gate created for ${this.name}`);
      return gate;
    } catch (error) {
      console.warn(`⚠️ Could not create noise gate for ${this.name}:`, error);
      return null;
    }
  }
  
  /**
   * Create power supply sag AudioWorklet node (for all tube amps)
   * @param {String} rectifierType - 'silicon' or 'tube'
   * @param {Object} config - Sag configuration override
   * @returns {AudioWorkletNode|null} Sag node or null if unavailable
   */
  createSagProcessor(rectifierType = 'silicon', config = {}) {
    try {
      const sag = new AudioWorkletNode(this.audioContext, 'sag-env');
      
      // Presets based on rectifier type
      const presets = {
        silicon: {
          depth: 0.08,      // Minimal sag (8%)
          att: 0.006,       // Fast attack (6ms)
          relFast: 0.06,    // Fast initial recovery (60ms)
          relSlow: 0.20,    // Slow final recovery (200ms)
          rmsMs: 10.0,      // Short RMS window (10ms)
          shape: 1.0,       // Linear response
          floor: 0.30,      // Minimum headroom (30%)
          peakMix: 0.30     // Balanced peak/RMS
        },
        tube: {
          depth: 0.15,      // Heavy sag (15%)
          att: 0.006,       // Fast attack (6ms)
          relFast: 0.06,    // Fast initial recovery (60ms)
          relSlow: 0.25,    // Slower final recovery (250ms)
          rmsMs: 25.0,      // Longer RMS window (25ms)
          shape: 1.6,       // Progressive/tube-like response
          floor: 0.25,      // Lower minimum headroom (25%)
          peakMix: 0.30     // Balanced peak/RMS
        }
      };
      
      const settings = { ...presets[rectifierType], ...config };
      
      // Apply parameters
      sag.parameters.get('depth').value = settings.depth;
      sag.parameters.get('att').value = settings.att;
      sag.parameters.get('relFast').value = settings.relFast;
      sag.parameters.get('relSlow').value = settings.relSlow;
      sag.parameters.get('rmsMs').value = settings.rmsMs;
      sag.parameters.get('shape').value = settings.shape;
      sag.parameters.get('floor').value = settings.floor;
      sag.parameters.get('peakMix').value = settings.peakMix;
      
      console.log(`✅ Sag processor created for ${this.name} (${rectifierType} rectifier)`);
      return sag;
    } catch (error) {
      console.warn(`⚠️ Could not create sag processor for ${this.name}:`, error);
      return null;
    }
  }
}

export default BaseAmp;

