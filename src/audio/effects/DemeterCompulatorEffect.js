import BaseEffect from './BaseEffect';

/**
 * DemeterCompulatorEffect - Demeter Compulator
 * 
 * Optical-style compressor known for ultra-transparent compression
 * with minimal coloration. Simple 3-knob design.
 * 
 * Features:
 * - Optical-style soft compression
 * - Ultra-transparent, minimal coloration
 * - Very soft knee for natural response
 * - Program-dependent attack/release
 * - Simple compress/volume/tone controls
 */

class DemeterCompulatorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Demeter Compulator', 'demetercompulator');
    
    // Main compressor - optical style with very soft knee
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 35; // Very soft knee (optical behavior)
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.012; // Slower, optical-style
    this.compressor.release.value = 0.25;
    
    // Input buffer
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;
    
    // Optical compression smoothing filter (simulates lamp response)
    this.opticalSmooth = audioContext.createBiquadFilter();
    this.opticalSmooth.type = 'lowpass';
    this.opticalSmooth.frequency.value = 12000;
    this.opticalSmooth.Q.value = 0.5;
    
    // Tone control - subtle tilt EQ
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'highshelf';
    this.toneFilter.frequency.value = 4000;
    this.toneFilter.gain.value = 0;
    
    // Low-end warmth (Demeter signature)
    this.warmthFilter = audioContext.createBiquadFilter();
    this.warmthFilter.type = 'lowshelf';
    this.warmthFilter.frequency.value = 300;
    this.warmthFilter.gain.value = 0.5;
    
    // Volume (output)
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 1.5;
    
    // Sidechain HPF - keeps low end from triggering compression too much
    this.sidechainHPF = audioContext.createBiquadFilter();
    this.sidechainHPF.type = 'highpass';
    this.sidechainHPF.frequency.value = 80;
    this.sidechainHPF.Q.value = 0.5;
    
    // Parallel compression blend
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.85;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.15;
    
    // Compressed signal path
    this.input.connect(this.inputBuffer);
    this.inputBuffer.connect(this.sidechainHPF);
    this.sidechainHPF.connect(this.compressor);
    this.compressor.connect(this.opticalSmooth);
    this.opticalSmooth.connect(this.toneFilter);
    this.toneFilter.connect(this.warmthFilter);
    this.warmthFilter.connect(this.volumeGain);
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
      case 'compress':
        // Adjusts threshold, ratio, and optical attack/release
        const thresh = -8 - (value / 100) * 32;
        const ratio = 1.5 + (value / 100) * 6;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        // Optical-style: more compression = slower attack, faster release
        const attack = 0.015 - (value / 100) * 0.005;
        const release = 0.3 - (value / 100) * 0.1;
        this.compressor.attack.setTargetAtTime(
          Math.max(0.002, attack), now, 0.01
        );
        this.compressor.release.setTargetAtTime(
          Math.max(0.1, release), now, 0.01
        );
        break;
        
      case 'volume':
        // Output volume: 0.3x to 4x
        const vol = 0.3 + (value / 100) * 3.7;
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
        
      case 'tone':
        // Subtle high shelf: -6dB to +6dB
        const toneDb = -6 + (value / 100) * 12;
        this.toneFilter.gain.setTargetAtTime(toneDb, now, 0.01);
        // Complementary low shelf adjustment
        const warmth = 0.5 - (value / 100) * 1.0;
        this.warmthFilter.gain.setTargetAtTime(
          Math.max(-2, warmth), now, 0.01
        );
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.inputBuffer.disconnect(); } catch (e) {}
    try { this.opticalSmooth.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.warmthFilter.disconnect(); } catch (e) {}
    try { this.volumeGain.disconnect(); } catch (e) {}
    try { this.sidechainHPF.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default DemeterCompulatorEffect;
