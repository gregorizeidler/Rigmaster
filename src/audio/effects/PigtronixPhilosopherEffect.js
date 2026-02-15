import BaseEffect from './BaseEffect';

/**
 * PigtronixPhilosopherEffect - Pigtronix Philosopher's Tone
 * 
 * Compressor + sustain engine with grit control for harmonic content.
 * Known for its infinite sustain capability and clean blend.
 * 
 * Features:
 * - Infinite sustain engine
 * - Clean blend for parallel compression
 * - Treble control for brightness
 * - Grit control for harmonic saturation
 * - Fast, musical compression response
 */

class PigtronixPhilosopherEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, "Pigtronix Philosopher's Tone", 'pigtronixphilo');
    
    // Main compressor - aggressive sustain engine
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -30;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.25;
    
    // Sustain input gain (drives the compressor harder)
    this.sustainGain = audioContext.createGain();
    this.sustainGain.gain.value = 1.5;
    
    // Grit - mild harmonic saturation
    this.gritShaper = audioContext.createWaveShaper();
    this.gritShaper.curve = this._makeGritCurve(256);
    this.gritShaper.oversample = '2x';
    
    // Grit amount gain
    this.gritGain = audioContext.createGain();
    this.gritGain.gain.value = 1.0;
    
    // Treble control - high shelf EQ
    this.trebleFilter = audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4000;
    this.trebleFilter.gain.value = 0;
    
    // Mid-range presence boost
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 1800;
    this.presenceFilter.Q.value = 0.8;
    this.presenceFilter.gain.value = 1.0;
    
    // Output volume
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 1.5;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.7;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.3;
    
    // Compressed signal path
    this.input.connect(this.sustainGain);
    this.sustainGain.connect(this.compressor);
    this.compressor.connect(this.gritGain);
    this.gritGain.connect(this.gritShaper);
    this.gritShaper.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.volumeGain);
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
   * Grit saturation curve with harmonic content
   */
  _makeGritCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Mild asymmetric saturation with grit character
      curve[i] = Math.tanh(x * 1.3) * 0.9 + x * 0.1;
    }
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'sustain':
        // Drives the compressor harder + adjusts threshold/ratio
        const inGain = 0.8 + (value / 100) * 3.0;
        this.sustainGain.gain.setTargetAtTime(inGain, now, 0.01);
        const thresh = -15 - (value / 100) * 30;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        const ratio = 3 + (value / 100) * 15;
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        break;
        
      case 'blend':
        // Parallel compression mix
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
        
      case 'treble':
        // High shelf: -10dB to +10dB at 4kHz
        const trebleDb = -10 + (value / 100) * 20;
        this.trebleFilter.gain.setTargetAtTime(trebleDb, now, 0.01);
        break;
        
      case 'volume':
        // Output volume: 0.3x to 4x
        const vol = 0.3 + (value / 100) * 3.7;
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
        
      case 'grit':
        // Harmonic saturation drive: 0.5x to 3x
        const grit = 0.5 + (value / 100) * 2.5;
        this.gritGain.gain.setTargetAtTime(grit, now, 0.01);
        // More grit darkens the tone slightly
        const presence = 1.0 + (value / 100) * 2.0;
        this.presenceFilter.gain.setTargetAtTime(presence, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.sustainGain.disconnect(); } catch (e) {}
    try { this.gritShaper.disconnect(); } catch (e) {}
    try { this.gritGain.disconnect(); } catch (e) {}
    try { this.trebleFilter.disconnect(); } catch (e) {}
    try { this.presenceFilter.disconnect(); } catch (e) {}
    try { this.volumeGain.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default PigtronixPhilosopherEffect;
