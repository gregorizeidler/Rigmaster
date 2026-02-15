import BaseEffect from './BaseEffect';

/**
 * WalrusDeepSixEffect - Walrus Audio Deep Six V3
 * 
 * Smooth, studio-quality compression with a blend control for
 * parallel compression. Known for its musical, non-squashy feel.
 * 
 * Features:
 * - Smooth VCA-style compression
 * - Full blend (wet/dry mix) for parallel compression
 * - Tone shaping post-compression
 * - Variable attack from snappy to slow
 * - Sustain control that adjusts threshold and ratio together
 */

class WalrusDeepSixEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Walrus Deep Six', 'walrusdeep6');
    
    // Main compressor - smooth VCA style
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 20; // Soft knee for smoothness
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.2;
    
    // Level (output volume)
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 1.8;
    
    // Tone control - high shelf for brightness
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'highshelf';
    this.toneFilter.frequency.value = 3500;
    this.toneFilter.gain.value = 0;
    
    // Low-end warmth preservation
    this.warmthFilter = audioContext.createBiquadFilter();
    this.warmthFilter.type = 'lowshelf';
    this.warmthFilter.frequency.value = 300;
    this.warmthFilter.gain.value = 1.5;
    
    // Pre-compression input buffer
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.7;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.3;
    
    // Compressed signal path
    this.input.connect(this.inputBuffer);
    this.inputBuffer.connect(this.compressor);
    this.compressor.connect(this.toneFilter);
    this.toneFilter.connect(this.warmthFilter);
    this.warmthFilter.connect(this.levelGain);
    this.levelGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Uncompressed path (for blend)
    this.input.connect(this.uncompressedGain);
    this.uncompressedGain.connect(this.wetGain);
    
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'level':
        // Output level: 0.5x to 4x
        const levelVal = 0.5 + (value / 100) * 3.5;
        this.levelGain.gain.setTargetAtTime(levelVal, now, 0.01);
        break;
        
      case 'sustain':
        // Sustain adjusts threshold + ratio together
        // Higher sustain = lower threshold, higher ratio
        const thresh = -10 - (value / 100) * 35;
        const ratio = 2 + (value / 100) * 10;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        break;
        
      case 'blend':
        // Parallel compression mix
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
        
      case 'tone':
        // High shelf: -8dB to +8dB at 3.5kHz
        const toneDb = -8 + (value / 100) * 16;
        this.toneFilter.gain.setTargetAtTime(toneDb, now, 0.01);
        break;
        
      case 'attack':
        // 1ms to 80ms
        this.compressor.attack.setTargetAtTime(
          0.001 + (value / 100) * 0.079, now, 0.01
        );
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.levelGain.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.warmthFilter.disconnect(); } catch (e) {}
    try { this.inputBuffer.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default WalrusDeepSixEffect;
