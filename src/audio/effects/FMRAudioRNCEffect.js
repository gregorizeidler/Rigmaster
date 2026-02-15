import BaseEffect from './BaseEffect';

/**
 * FMRAudioRNCEffect - FMR Audio RNC (Really Nice Compressor)
 * 
 * Super transparent studio compressor with very low coloration.
 * Known for its "Super Nice" mode with program-dependent release.
 * 
 * Features:
 * - Ultra-transparent compression
 * - Program-dependent release behavior
 * - Very low noise floor
 * - Parallel compression blend
 * - Precision threshold and ratio control
 */

class FMRAudioRNCEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'FMR Audio RNC', 'fmrrnc');
    
    // Main compressor - RNC is known for transparency
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 10; // Soft knee for transparency
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.15;
    
    // Input gain staging
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // Output makeup gain
    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 1.5;
    
    // Super Nice mode filter - gentle high-frequency smoothing
    this.superNiceFilter = audioContext.createBiquadFilter();
    this.superNiceFilter.type = 'lowshelf';
    this.superNiceFilter.frequency.value = 8000;
    this.superNiceFilter.gain.value = -0.5;
    
    // Sidechain HPF to reduce pumping from low frequencies
    this.sidechainHPF = audioContext.createBiquadFilter();
    this.sidechainHPF.type = 'highpass';
    this.sidechainHPF.frequency.value = 60;
    this.sidechainHPF.Q.value = 0.5;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.8;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.2;
    
    // Compressed signal path
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.sidechainHPF);
    this.sidechainHPF.connect(this.compressor);
    this.compressor.connect(this.superNiceFilter);
    this.superNiceFilter.connect(this.makeupGain);
    this.makeupGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Uncompressed signal path (for blend)
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
      case 'threshold':
        // -60dB to 0dB
        this.compressor.threshold.setTargetAtTime(
          -60 + (value / 100) * 60, now, 0.01
        );
        break;
        
      case 'ratio':
        // 1:1 to 20:1
        this.compressor.ratio.setTargetAtTime(
          1 + (value / 100) * 19, now, 0.01
        );
        break;
        
      case 'attack':
        // 0.2ms to 80ms (RNC has fast attack capability)
        this.compressor.attack.setTargetAtTime(
          0.0002 + (value / 100) * 0.0798, now, 0.01
        );
        break;
        
      case 'release':
        // 50ms to 1050ms (program-dependent range)
        this.compressor.release.setTargetAtTime(
          0.05 + (value / 100) * 1.0, now, 0.01
        );
        break;
        
      case 'gain':
        // Makeup gain: 0dB to +20dB
        const gainLinear = 1 + (value / 100) * 9;
        this.makeupGain.gain.setTargetAtTime(gainLinear, now, 0.01);
        break;
        
      case 'blend':
        // Parallel compression blend
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.makeupGain.disconnect(); } catch (e) {}
    try { this.superNiceFilter.disconnect(); } catch (e) {}
    try { this.sidechainHPF.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default FMRAudioRNCEffect;
