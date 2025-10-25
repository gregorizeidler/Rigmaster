import BaseEffect from './BaseEffect';

/**
 * XoticEPBoosterEffect - Xotic EP Booster
 * 
 * Echoplex EP-3 preamp simulation
 * Used by: Jimmy Page, Eddie Van Halen sound
 * 
 * Features:
 * - Single knob boost
 * - Echoplex preamp color
 * - Subtle compression
 * - Adds sparkle and body
 */

class XoticEPBoosterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Xotic EP Booster', 'xoticep');
    
    // Input buffer
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // EP-3 preamp character
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.curve = this.makeEPCurve();
    this.preampShaper.oversample = '2x';
    
    // Subtle compression (EP-3 characteristic)
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 2;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Sparkle boost (high-mid presence)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 2400;
    this.presenceFilter.Q.value = 1.0;
    this.presenceFilter.gain.value = 2;
    
    // Body boost (low-mid warmth)
    this.bodyFilter = audioContext.createBiquadFilter();
    this.bodyFilter.type = 'peaking';
    this.bodyFilter.frequency.value = 400;
    this.bodyFilter.Q.value = 0.7;
    this.bodyFilter.gain.value = 1;
    
    // Output boost
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.5;
    
    // Connect chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preampShaper);
    this.preampShaper.connect(this.compressor);
    this.compressor.connect(this.bodyFilter);
    this.bodyFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.boostGain);
    this.boostGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeEPCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EP-3 subtle saturation
      let y = Math.tanh(x * 1.2);
      
      // 2nd harmonic warmth
      y += 0.08 * Math.sin(x * Math.PI * 2);
      
      curve[i] = y * 0.95;
    }
    
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'boost':
        // Single knob control
        const boostAmount = 1 + (value / 100) * 2; // 1x to 3x
        this.boostGain.gain.setTargetAtTime(boostAmount, now, 0.01);
        
        // More boost = more compression
        this.compressor.threshold.setTargetAtTime(-20 + (value / 10), now, 0.01);
        break;
    }
  }
}

export default XoticEPBoosterEffect;

