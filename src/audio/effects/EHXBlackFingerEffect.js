import BaseEffect from './BaseEffect';

/**
 * EHXBlackFingerEffect - Electro-Harmonix Black Finger
 * 
 * Tube compressor/sustainer with lamp-based optical compression feel.
 * Uses real tubes for warm harmonic saturation and natural envelope.
 * 
 * Features:
 * - Tube-style compression with warm saturation
 * - Optical-style soft knee compression
 * - Squash control for tube drive amount
 * - Lamp-based program-dependent response
 * - Rich harmonic content from tube emulation
 */

class EHXBlackFingerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Black Finger', 'ehxblackfinger');
    
    // Main compressor - optical/tube style with soft knee
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -25;
    this.compressor.knee.value = 30; // Very soft knee (optical style)
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.015; // Slower, tube-like response
    this.compressor.release.value = 0.3;
    
    // Tube saturation emulation (pre-compression)
    this.tubeSaturation = audioContext.createWaveShaper();
    this.tubeSaturation.curve = this._makeTubeCurve(512);
    this.tubeSaturation.oversample = '4x';
    
    // Tube drive gain (squash control)
    this.squashGain = audioContext.createGain();
    this.squashGain.gain.value = 1.2;
    
    // Post-tube warmth filter
    this.warmthFilter = audioContext.createBiquadFilter();
    this.warmthFilter.type = 'lowshelf';
    this.warmthFilter.frequency.value = 400;
    this.warmthFilter.gain.value = 2.0;
    
    // Tube high-frequency roll-off (natural tube darkening)
    this.tubeRolloff = audioContext.createBiquadFilter();
    this.tubeRolloff.type = 'lowpass';
    this.tubeRolloff.frequency.value = 8000;
    this.tubeRolloff.Q.value = 0.5;
    
    // Volume (output makeup)
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 1.8;
    
    // Parallel compression blend
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.8;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.2;
    
    // Compressed signal path: input -> squash -> tube -> compressor -> warmth -> rolloff -> volume
    this.input.connect(this.squashGain);
    this.squashGain.connect(this.tubeSaturation);
    this.tubeSaturation.connect(this.compressor);
    this.compressor.connect(this.warmthFilter);
    this.warmthFilter.connect(this.tubeRolloff);
    this.tubeRolloff.connect(this.volumeGain);
    this.volumeGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Uncompressed path (for blend)
    this.input.connect(this.uncompressedGain);
    this.uncompressedGain.connect(this.wetGain);
    
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  /**
   * Tube-style saturation curve with even harmonic content
   */
  _makeTubeCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Asymmetric clipping (tube characteristic)
      if (x >= 0) {
        curve[i] = Math.tanh(x * 1.4);
      } else {
        curve[i] = Math.tanh(x * 1.1) * 0.95;
      }
    }
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'sustain':
        // Adjusts threshold and ratio for sustain amount
        const thresh = -10 - (value / 100) * 35;
        const ratio = 2 + (value / 100) * 10;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        // Slower release for more sustain
        const release = 0.15 + (value / 100) * 0.6;
        this.compressor.release.setTargetAtTime(release, now, 0.01);
        break;
        
      case 'volume':
        // Output volume: 0.3x to 5x
        const vol = 0.3 + (value / 100) * 4.7;
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
        
      case 'squash':
        // Tube drive amount: 0.5x to 3.5x
        const drive = 0.5 + (value / 100) * 3.0;
        this.squashGain.gain.setTargetAtTime(drive, now, 0.01);
        // More squash also regenerates the tube curve intensity
        this.tubeSaturation.curve = this._makeTubeCurve(512);
        // Adjust tube rolloff - more squash = darker
        const rolloff = 10000 - (value / 100) * 4000;
        this.tubeRolloff.frequency.setTargetAtTime(rolloff, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.tubeSaturation.disconnect(); } catch (e) {}
    try { this.squashGain.disconnect(); } catch (e) {}
    try { this.warmthFilter.disconnect(); } catch (e) {}
    try { this.tubeRolloff.disconnect(); } catch (e) {}
    try { this.volumeGain.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default EHXBlackFingerEffect;
