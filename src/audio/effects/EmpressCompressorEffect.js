import BaseEffect from './BaseEffect';

/**
 * EmpressCompressorEffect - Empress Compressor
 * 
 * Studio-grade compressor with sidechain HPF, parallel blend, and metering.
 * Renowned for its transparent-to-colored range and mix knob.
 * 
 * Features:
 * - Sidechain high-pass filter to prevent bass pumping
 * - Full parallel compression blend (mix)
 * - Input and output gain staging
 * - Tone shaping post-compression
 * - Extremely wide attack/release range
 */

class EmpressCompressorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Empress Compressor', 'empresscomp');
    
    // Main compressor
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;
    
    // Input gain control
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // Output gain control
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.5;
    
    // Sidechain HPF to reduce low-frequency pumping
    this.sidechainHPF = audioContext.createBiquadFilter();
    this.sidechainHPF.type = 'highpass';
    this.sidechainHPF.frequency.value = 100;
    this.sidechainHPF.Q.value = 0.7;
    
    // Tone control - post-compression EQ
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 3000;
    this.toneFilter.Q.value = 0.8;
    this.toneFilter.gain.value = 0;
    
    // Low-end preservation filter
    this.lowEndFilter = audioContext.createBiquadFilter();
    this.lowEndFilter.type = 'lowshelf';
    this.lowEndFilter.frequency.value = 250;
    this.lowEndFilter.gain.value = 1.0;
    
    // Parallel compression (mix control)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.75;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.25;
    
    // Compressed signal path
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.sidechainHPF);
    this.sidechainHPF.connect(this.compressor);
    this.compressor.connect(this.toneFilter);
    this.toneFilter.connect(this.lowEndFilter);
    this.lowEndFilter.connect(this.outputGain);
    this.outputGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Uncompressed signal path (for mix/blend)
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
        // -50dB to -2dB
        this.compressor.threshold.setTargetAtTime(
          -50 + (value / 100) * 48, now, 0.01
        );
        break;
        
      case 'ratio':
        // 1:1 to 20:1
        this.compressor.ratio.setTargetAtTime(
          1 + (value / 100) * 19, now, 0.01
        );
        break;
        
      case 'attack':
        // 0.1ms to 100ms (very wide range)
        this.compressor.attack.setTargetAtTime(
          0.0001 + (value / 100) * 0.0999, now, 0.01
        );
        break;
        
      case 'release':
        // 10ms to 1500ms
        this.compressor.release.setTargetAtTime(
          0.01 + (value / 100) * 1.49, now, 0.01
        );
        break;
        
      case 'mix':
        // Parallel compression blend
        const mix = value / 100;
        this.compressedGain.gain.setTargetAtTime(mix, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - mix, now, 0.01);
        break;
        
      case 'tone':
        // -12dB to +12dB peaking at 3kHz
        const toneDb = -12 + (value / 100) * 24;
        this.toneFilter.gain.setTargetAtTime(toneDb, now, 0.01);
        break;
        
      case 'input':
        // Input gain: 0.25x to 4x
        const inGain = 0.25 + (value / 100) * 3.75;
        this.inputGain.gain.setTargetAtTime(inGain, now, 0.01);
        break;
        
      case 'output':
        // Output gain: 0.25x to 4x
        const outGain = 0.25 + (value / 100) * 3.75;
        this.outputGain.gain.setTargetAtTime(outGain, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.outputGain.disconnect(); } catch (e) {}
    try { this.sidechainHPF.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.lowEndFilter.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default EmpressCompressorEffect;
