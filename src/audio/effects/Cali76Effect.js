import BaseEffect from './BaseEffect';

/**
 * Cali76Effect - Origin Effects Cali76 (1176-style)
 * 
 * Fast FET-style compression inspired by the UREI 1176.
 * Features the legendary "all buttons in" mode for extreme squash.
 * 
 * Features:
 * - Ultra-fast FET-style attack times
 * - All-buttons-in mode (ratio = all)
 * - Input/output gain staging like the original 1176
 * - Transformer-style coloration
 * - Fixed ratio presets: 4, 8, 12, 20, and all-buttons-in
 */

class Cali76Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Cali76', 'cali76');
    
    // Main compressor - FET style with fast attack
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -30;
    this.compressor.knee.value = 5; // Hard knee like 1176
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.0002; // Ultra-fast FET attack
    this.compressor.release.value = 0.1;
    
    // Input gain (drives the compressor harder)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Output gain (makeup)
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 2.0;
    
    // Transformer saturation emulation - mild harmonic color
    this.transformerColor = audioContext.createWaveShaper();
    this.transformerColor.curve = this._makeTransformerCurve(256);
    this.transformerColor.oversample = '2x';
    
    // Presence filter (1176 characteristic mid-range push)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 2500;
    this.presenceFilter.Q.value = 1.0;
    this.presenceFilter.gain.value = 1.5;
    
    // Low-end body from the transformer
    this.bodyFilter = audioContext.createBiquadFilter();
    this.bodyFilter.type = 'lowshelf';
    this.bodyFilter.frequency.value = 200;
    this.bodyFilter.gain.value = 1.0;
    
    // Parallel compression blend
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.85;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.15;
    
    // Compressed signal path
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.compressor);
    this.compressor.connect(this.transformerColor);
    this.transformerColor.connect(this.presenceFilter);
    this.presenceFilter.connect(this.bodyFilter);
    this.bodyFilter.connect(this.outputGain);
    this.outputGain.connect(this.compressedGain);
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
   * Mild transformer-style saturation curve
   */
  _makeTransformerCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Gentle soft clipping with even harmonics
      curve[i] = (Math.tanh(x * 1.5) + x * 0.1) / 1.1;
    }
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'input':
        // Input gain drives the compressor: 0.5x to 6x
        const inGain = 0.5 + (value / 100) * 5.5;
        this.inputGain.gain.setTargetAtTime(inGain, now, 0.01);
        // More input also lowers effective threshold
        this.compressor.threshold.setTargetAtTime(
          -20 - (value / 100) * 25, now, 0.01
        );
        break;
        
      case 'output':
        // Output makeup gain: 0.25x to 5x
        const outGain = 0.25 + (value / 100) * 4.75;
        this.outputGain.gain.setTargetAtTime(outGain, now, 0.01);
        break;
        
      case 'attack':
        // 0.02ms to 0.8ms (1176-style ultra-fast range)
        this.compressor.attack.setTargetAtTime(
          0.00002 + (value / 100) * 0.0008, now, 0.01
        );
        break;
        
      case 'release':
        // 50ms to 1100ms
        this.compressor.release.setTargetAtTime(
          0.05 + (value / 100) * 1.05, now, 0.01
        );
        break;
        
      case 'ratio': {
        // Fixed ratio presets: 4, 8, 12, 20, all-buttons-in (20 + hard knee)
        const ratioMap = { 0: 4, 25: 8, 50: 12, 75: 20, 100: 20 };
        const kneeMap = { 0: 5, 25: 5, 50: 5, 75: 5, 100: 0 };
        const closest = [0, 25, 50, 75, 100].reduce((a, b) =>
          Math.abs(b - value) < Math.abs(a - value) ? b : a
        );
        this.compressor.ratio.setTargetAtTime(ratioMap[closest], now, 0.01);
        this.compressor.knee.setTargetAtTime(kneeMap[closest], now, 0.01);
        // All-buttons-in mode: extra aggressive threshold
        if (closest === 100) {
          this.compressor.threshold.setTargetAtTime(-45, now, 0.01);
        }
        break;
      }
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.outputGain.disconnect(); } catch (e) {}
    try { this.transformerColor.disconnect(); } catch (e) {}
    try { this.presenceFilter.disconnect(); } catch (e) {}
    try { this.bodyFilter.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default Cali76Effect;
