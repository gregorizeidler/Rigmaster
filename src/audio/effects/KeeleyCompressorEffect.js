import BaseEffect from './BaseEffect';

/**
 * KeeleyCompressorEffect - Keeley 4-Knob Compressor
 * 
 * Industry standard compressor
 * Used by: 80% of professional guitarists
 * 
 * Features:
 * - Studio-quality compression
 * - Attack/Release controls
 * - Blend control
 * - Ultra low noise
 */

class KeeleyCompressorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Keeley Compressor', 'keeleycomp');
    
    // Main compressor
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Sustain control (input gain)
    this.sustainGain = audioContext.createGain();
    this.sustainGain.gain.value = 1.0;
    
    // Level control (output gain with makeup)
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 2.0; // Makeup gain
    
    // Tone enhancement (Keeley characteristic)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 2000;
    this.toneFilter.Q.value = 0.7;
    this.toneFilter.gain.value = 1;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.7;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.3;
    
    // Connect compressed path
    this.input.connect(this.sustainGain);
    this.sustainGain.connect(this.compressor);
    this.compressor.connect(this.toneFilter);
    this.toneFilter.connect(this.levelGain);
    this.levelGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Connect uncompressed path (for blend)
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
        // More sustain = more input gain
        this.sustainGain.gain.setTargetAtTime(1 + (value / 100), now, 0.01);
        this.compressor.threshold.setTargetAtTime(-30 + (value / 10), now, 0.01);
        break;
        
      case 'level':
        // Output level with makeup gain
        this.levelGain.gain.setTargetAtTime(1 + (value / 100) * 2, now, 0.01);
        break;
        
      case 'attack':
        // 0.5ms to 10ms
        this.compressor.attack.setTargetAtTime(0.0005 + (value / 100) * 0.0095, now, 0.01);
        break;
        
      case 'release':
        // 50ms to 500ms
        this.compressor.release.setTargetAtTime(0.05 + (value / 100) * 0.45, now, 0.01);
        break;
        
      case 'blend':
        // Parallel compression blend
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
    }
  }
}

export default KeeleyCompressorEffect;

