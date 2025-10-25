import BaseEffect from './BaseEffect';

/**
 * JHSSuperBoltEffect - JHS Superbolt
 * 
 * Marshall Superlead in a box
 * British crunch overdrive
 * 
 * Features:
 * - Marshall plexi-style breakup
 * - Mid-forward tone
 * - Touch-sensitive dynamics
 * - Cranked amp simulation
 */

class JHSSuperBoltEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'JHS Superbolt', 'jhssuperbolt');
    
    // Input stage
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Marshall preamp simulation
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.curve = this.makeMarshallCurve();
    this.preampShaper.oversample = '4x';
    
    // Mid-forward EQ (Marshall character)
    this.midBoost = audioContext.createBiquadFilter();
    this.midBoost.type = 'peaking';
    this.midBoost.frequency.value = 1200;
    this.midBoost.Q.value = 1.2;
    this.midBoost.gain.value = 5;
    
    // Presence boost
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 3000;
    this.presenceFilter.gain.value = 3;
    
    // Tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 5000;
    this.toneFilter.Q.value = 0.707;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.9;
    
    // Connect chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preampShaper);
    this.preampShaper.connect(this.midBoost);
    this.midBoost.connect(this.presenceFilter);
    this.presenceFilter.connect(this.toneFilter);
    this.toneFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeMarshallCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Marshall-style saturation
      let y = Math.tanh(x * 2.5);
      
      // Add 3rd harmonic (British crunch)
      y += 0.12 * Math.sin(x * Math.PI * 3);
      
      // Asymmetric clipping
      if (x > 0) {
        y *= 1.1;
      }
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'gain':
        this.inputGain.gain.setTargetAtTime(0.5 + (value / 100) * 3, now, 0.01);
        break;
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(2000 + (value / 100) * 8000, now, 0.01);
        break;
      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
  }
}

export default JHSSuperBoltEffect;

