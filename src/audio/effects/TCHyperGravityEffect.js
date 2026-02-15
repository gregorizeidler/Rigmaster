import BaseEffect from './BaseEffect';

/**
 * TCHyperGravityEffect - TC Electronic HyperGravity
 * 
 * Multiband compressor that independently processes low, mid, and high
 * frequency bands for transparent, musical compression.
 * 
 * Features:
 * - 3-band compression (low/mid/high)
 * - Independent band processing
 * - Crossover filters for band splitting
 * - Blend control for parallel compression
 * - Sustain and level master controls
 */

class TCHyperGravityEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC HyperGravity', 'tchypergravity');
    
    // --- Band splitting crossover filters ---
    // Low band: below 250Hz
    this.lowCrossover = audioContext.createBiquadFilter();
    this.lowCrossover.type = 'lowpass';
    this.lowCrossover.frequency.value = 250;
    this.lowCrossover.Q.value = 0.5;
    
    // High band: above 4kHz
    this.highCrossover = audioContext.createBiquadFilter();
    this.highCrossover.type = 'highpass';
    this.highCrossover.frequency.value = 4000;
    this.highCrossover.Q.value = 0.5;
    
    // Mid band: bandpass 250Hz - 4kHz
    this.midLowPass = audioContext.createBiquadFilter();
    this.midLowPass.type = 'lowpass';
    this.midLowPass.frequency.value = 4000;
    this.midLowPass.Q.value = 0.5;
    
    this.midHighPass = audioContext.createBiquadFilter();
    this.midHighPass.type = 'highpass';
    this.midHighPass.frequency.value = 250;
    this.midHighPass.Q.value = 0.5;
    
    // --- Per-band compressors ---
    // Low band compressor
    this.lowCompressor = audioContext.createDynamicsCompressor();
    this.lowCompressor.threshold.value = -20;
    this.lowCompressor.knee.value = 20;
    this.lowCompressor.ratio.value = 3;
    this.lowCompressor.attack.value = 0.01;
    this.lowCompressor.release.value = 0.3;
    
    // Mid band compressor
    this.midCompressor = audioContext.createDynamicsCompressor();
    this.midCompressor.threshold.value = -22;
    this.midCompressor.knee.value = 15;
    this.midCompressor.ratio.value = 4;
    this.midCompressor.attack.value = 0.005;
    this.midCompressor.release.value = 0.2;
    
    // High band compressor
    this.highCompressor = audioContext.createDynamicsCompressor();
    this.highCompressor.threshold.value = -18;
    this.highCompressor.knee.value = 12;
    this.highCompressor.ratio.value = 3;
    this.highCompressor.attack.value = 0.002;
    this.highCompressor.release.value = 0.15;
    
    // Per-band output gains
    this.lowBandGain = audioContext.createGain();
    this.lowBandGain.gain.value = 1.0;
    
    this.midBandGain = audioContext.createGain();
    this.midBandGain.gain.value = 1.0;
    
    this.highBandGain = audioContext.createGain();
    this.highBandGain.gain.value = 1.0;
    
    // Band recombination / master level
    this.masterLevel = audioContext.createGain();
    this.masterLevel.gain.value = 1.5;
    
    // Parallel compression (blend)
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.75;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.25;
    
    // --- Routing ---
    // Low band path
    this.input.connect(this.lowCrossover);
    this.lowCrossover.connect(this.lowCompressor);
    this.lowCompressor.connect(this.lowBandGain);
    this.lowBandGain.connect(this.masterLevel);
    
    // Mid band path
    this.input.connect(this.midHighPass);
    this.midHighPass.connect(this.midLowPass);
    this.midLowPass.connect(this.midCompressor);
    this.midCompressor.connect(this.midBandGain);
    this.midBandGain.connect(this.masterLevel);
    
    // High band path
    this.input.connect(this.highCrossover);
    this.highCrossover.connect(this.highCompressor);
    this.highCompressor.connect(this.highBandGain);
    this.highBandGain.connect(this.masterLevel);
    
    // Master to compressed gain
    this.masterLevel.connect(this.compressedGain);
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
        // Adjusts all band thresholds and ratios together
        const threshOffset = -(value / 100) * 30;
        const ratioBoost = (value / 100) * 8;
        
        this.lowCompressor.threshold.setTargetAtTime(-10 + threshOffset, now, 0.01);
        this.midCompressor.threshold.setTargetAtTime(-12 + threshOffset, now, 0.01);
        this.highCompressor.threshold.setTargetAtTime(-8 + threshOffset, now, 0.01);
        
        this.lowCompressor.ratio.setTargetAtTime(2 + ratioBoost * 0.6, now, 0.01);
        this.midCompressor.ratio.setTargetAtTime(2 + ratioBoost, now, 0.01);
        this.highCompressor.ratio.setTargetAtTime(2 + ratioBoost * 0.5, now, 0.01);
        break;
        
      case 'attack':
        // Adjusts all band attacks proportionally
        const baseAttack = 0.001 + (value / 100) * 0.05;
        this.lowCompressor.attack.setTargetAtTime(baseAttack * 2.0, now, 0.01);
        this.midCompressor.attack.setTargetAtTime(baseAttack, now, 0.01);
        this.highCompressor.attack.setTargetAtTime(baseAttack * 0.5, now, 0.01);
        break;
        
      case 'level':
        // Master output level: 0.5x to 4x
        const level = 0.5 + (value / 100) * 3.5;
        this.masterLevel.gain.setTargetAtTime(level, now, 0.01);
        break;
        
      case 'blend':
        // Parallel compression mix
        const blend = value / 100;
        this.compressedGain.gain.setTargetAtTime(blend, now, 0.01);
        this.uncompressedGain.gain.setTargetAtTime(1 - blend, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.lowCrossover.disconnect(); } catch (e) {}
    try { this.highCrossover.disconnect(); } catch (e) {}
    try { this.midLowPass.disconnect(); } catch (e) {}
    try { this.midHighPass.disconnect(); } catch (e) {}
    try { this.lowCompressor.disconnect(); } catch (e) {}
    try { this.midCompressor.disconnect(); } catch (e) {}
    try { this.highCompressor.disconnect(); } catch (e) {}
    try { this.lowBandGain.disconnect(); } catch (e) {}
    try { this.midBandGain.disconnect(); } catch (e) {}
    try { this.highBandGain.disconnect(); } catch (e) {}
    try { this.masterLevel.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default TCHyperGravityEffect;
