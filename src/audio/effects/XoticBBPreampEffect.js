import BaseEffect from './BaseEffect';

/**
 * XoticBBPreampEffect - Xotic BB Preamp
 * 
 * Classic always-on preamp/overdrive
 * Used by: Andy Timmons, session players worldwide
 * 
 * Features:
 * - Clean boost to mild overdrive
 * - Active 2-band EQ
 * - Transparent character
 * - Low noise floor
 */

class XoticBBPreampEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Xotic BB Preamp', 'xoticbb');
    
    // Input stage
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.2;
    
    // Preamp saturation
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.curve = this.makePreampCurve();
    this.preampShaper.oversample = '4x';
    
    // Active EQ (2-band)
    this.bassFilter = audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120;
    this.bassFilter.gain.value = 0;
    
    this.trebleFilter = audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 3000;
    this.trebleFilter.gain.value = 0;
    
    // Output stage
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // Connect chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preampShaper);
    this.preampShaper.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Transparent soft clipping
      let y = Math.tanh(x * 1.5);
      
      // Subtle 2nd harmonic warmth
      y += 0.05 * Math.tanh(x * 3);
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'gain':
        this.inputGain.gain.setTargetAtTime(0.5 + (value / 100) * 2, now, 0.01);
        break;
      case 'bass':
        this.bassFilter.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'treble':
        this.trebleFilter.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
  }
}

export default XoticBBPreampEffect;

