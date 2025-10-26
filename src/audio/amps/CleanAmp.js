import BaseAmp from './BaseAmp.js';

class CleanAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Clean', 'clean');
    
    // BASIC CLEAN AMP
    // Generic clean tone - reference level
    
    // ============================================
    // PREAMP (Single stage)
    // ============================================
    this.preamp = audioContext.createGain();
    this.saturation = audioContext.createWaveShaper();
    this.saturation.curve = this.makeCleanCurve();
    this.saturation.oversample = '4x';
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 2;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 3;
    
    // ============================================
    // MASTER
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    this.input.connect(this.preamp);
    this.preamp.connect(this.saturation);
    this.saturation.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.master);
    this.master.connect(this.output);
    
    this.params = {
      gain: 15,
      bass: 60,
      treble: 70,
      master: 80
    };
    
    this.applyInitialSettings();
  }
  
  applyInitialSettings() {
    this.preamp.gain.value = 1.5;
    this.master.gain.value = 0.8;
  }
  
  makeCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      curve[i] = y * 0.95;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain':
        this.preamp.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.preamp.disconnect();
    this.saturation.disconnect();
    this.bass.disconnect();
    this.treble.disconnect();
    this.master.disconnect();
  }
}

export default CleanAmp;

