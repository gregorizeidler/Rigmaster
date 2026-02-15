import BaseEffect from './BaseEffect';

/**
 * WamplerEgoEffect - Wampler Ego Compressor
 * 
 * Transparent compressor with blend and tone controls.
 * Known for its ability to go from barely-there to heavy squash
 * while maintaining clarity through the blend knob.
 * 
 * Features:
 * - Ultra-transparent compression
 * - Full blend control for parallel compression
 * - Tone shaping for brightness/darkness
 * - Wide sustain range
 * - Musical attack behavior
 */

class WamplerEgoEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Wampler Ego', 'wamplerego');
    
    // Main compressor - transparent OTA style
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -22;
    this.compressor.knee.value = 18; // Medium-soft for transparency
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.2;
    
    // Sustain input gain
    this.sustainGain = audioContext.createGain();
    this.sustainGain.gain.value = 1.2;
    
    // Volume (output makeup)
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 1.5;
    
    // Tone control - tilt EQ style
    this.toneHighShelf = audioContext.createBiquadFilter();
    this.toneHighShelf.type = 'highshelf';
    this.toneHighShelf.frequency.value = 3500;
    this.toneHighShelf.gain.value = 0;
    
    this.toneLowShelf = audioContext.createBiquadFilter();
    this.toneLowShelf.type = 'lowshelf';
    this.toneLowShelf.frequency.value = 400;
    this.toneLowShelf.gain.value = 0;
    
    // Clarity filter - subtle presence boost
    this.clarityFilter = audioContext.createBiquadFilter();
    this.clarityFilter.type = 'peaking';
    this.clarityFilter.frequency.value = 2200;
    this.clarityFilter.Q.value = 0.6;
    this.clarityFilter.gain.value = 0.5;
    
    // Low-end preservation
    this.lowEndFilter = audioContext.createBiquadFilter();
    this.lowEndFilter.type = 'lowshelf';
    this.lowEndFilter.frequency.value = 200;
    this.lowEndFilter.gain.value = 0.5;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.7;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.3;
    
    // Compressed signal path
    this.input.connect(this.sustainGain);
    this.sustainGain.connect(this.compressor);
    this.compressor.connect(this.toneHighShelf);
    this.toneHighShelf.connect(this.toneLowShelf);
    this.toneLowShelf.connect(this.clarityFilter);
    this.clarityFilter.connect(this.lowEndFilter);
    this.lowEndFilter.connect(this.volumeGain);
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
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'sustain':
        // Drives the compressor + adjusts threshold/ratio
        const drive = 0.8 + (value / 100) * 2.5;
        this.sustainGain.gain.setTargetAtTime(drive, now, 0.01);
        const thresh = -12 - (value / 100) * 30;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        const ratio = 2 + (value / 100) * 12;
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        break;
        
      case 'volume':
        // Output volume: 0.3x to 4.5x
        const vol = 0.3 + (value / 100) * 4.2;
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
        
      case 'attack':
        // 0.5ms to 60ms
        this.compressor.attack.setTargetAtTime(
          0.0005 + (value / 100) * 0.0595, now, 0.01
        );
        break;
        
      case 'blend':
        // Parallel compression mix
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
        
      case 'tone':
        // Tilt EQ: bright vs dark
        // At 50 = neutral, < 50 = darker, > 50 = brighter
        const toneNorm = (value - 50) / 50; // -1 to +1
        const highGain = toneNorm * 8;
        const lowGain = -toneNorm * 4;
        this.toneHighShelf.gain.setTargetAtTime(highGain, now, 0.01);
        this.toneLowShelf.gain.setTargetAtTime(lowGain, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.sustainGain.disconnect(); } catch (e) {}
    try { this.volumeGain.disconnect(); } catch (e) {}
    try { this.toneHighShelf.disconnect(); } catch (e) {}
    try { this.toneLowShelf.disconnect(); } catch (e) {}
    try { this.clarityFilter.disconnect(); } catch (e) {}
    try { this.lowEndFilter.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default WamplerEgoEffect;
