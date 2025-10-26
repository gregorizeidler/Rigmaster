import BaseAmp from './BaseAmp.js';

class MetalAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Metal', 'metal');
    
    // BASIC METAL AMP
    // Generic metal tone - extreme gain
    
    // ============================================
    // PREAMP (4 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makeMetalCurve();
    this.saturation2.curve = this.makeMetalCurve();
    this.saturation3.curve = this.makeMetalCurve();
    this.saturation4.curve = this.makeMetalCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = -2;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 1200;
    this.middle.Q.value = 0.7;
    this.middle.gain.value = 8;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 4;
    
    // ============================================
    // TIGHT BASS FILTER
    // ============================================
    this.tightFilter = audioContext.createBiquadFilter();
    this.tightFilter.type = 'highpass';
    this.tightFilter.frequency.value = 80;
    this.tightFilter.Q.value = 0.7;
    
    // ============================================
    // MASTER
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    this.input.connect(this.tightFilter);
    this.tightFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.master);
    this.master.connect(this.output);
    
    this.params = {
      gain: 100,
      bass: 45,
      middle: 75,
      treble: 70,
      master: 30
    };
    
    this.applyInitialSettings();
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 15;
    this.preamp2.gain.value = 2.5;
    this.preamp3.gain.value = 1.8;
    this.preamp4.gain.value = 1.4;
    this.master.gain.value = 0.3;
  }
  
  makeMetalCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 8);
      if (Math.abs(y) > 0.4) {
        const compression = 1 - (Math.abs(y) - 0.4) * 0.4;
        y *= compression;
      }
      y += 0.15 * Math.tanh(x * 12);
      if (x > 0) y *= 1.15;
      curve[i] = y * 0.82;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 5), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
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
    this.tightFilter.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.master.disconnect();
  }
}

export default MetalAmp;

