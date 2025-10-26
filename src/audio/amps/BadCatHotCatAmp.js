import BaseAmp from './BaseAmp.js';

class BadCatHotCatAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bad Cat Hot Cat', 'badcat_hotcat');
    
    // BAD CAT HOT CAT 30R
    // Boutique British-voiced amp with vintage character
    // Rich harmonics, touch-sensitive dynamics
    
    // ============================================
    // DUAL CHANNELS
    // ============================================
    this.channel1 = audioContext.createGain();
    this.channel2 = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 1; // 1 or 2
    
    // ============================================
    // PREAMP (ECC83 + EF86)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.cut = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 700;
    this.middle.Q.value = 1.2;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    this.cut.type = 'lowpass';
    this.cut.frequency.value = 10000;
    this.cut.Q.value = 0.707;
    
    // ============================================
    // BAD CAT "HARMONIC RICHNESS"
    // ============================================
    this.harmonics = audioContext.createBiquadFilter();
    this.harmonics.type = 'peaking';
    this.harmonics.frequency.value = 2000;
    this.harmonics.Q.value = 2;
    this.harmonics.gain.value = 4;
    
    // ============================================
    // POWER AMP (2x EL84 - Class A)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Class A compression
    this.classAComp = audioContext.createDynamicsCompressor();
    this.classAComp.threshold.value = -20;
    this.classAComp.knee.value = 15;
    this.classAComp.ratio.value = 3;
    this.classAComp.attack.value = 0.008;
    this.classAComp.release.value = 0.12;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 1 (DEFAULT)
    // ============================================
    this.setupChannel1();
    
    this.params = {
      channel: 1, // 1 or 2
      
      // Gain/Volume
      gain: 55,
      volume: 65,
      
      // Tone stack
      bass: 50,
      middle: 55,
      treble: 60,
      cut: 50,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    this.disconnectAll();
    
    this.input.connect(this.channel1);
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.harmonics);
    this.harmonics.connect(this.cut);
    this.cut.connect(this.classAComp);
    this.classAComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    this.disconnectAll();
    
    this.input.connect(this.channel2);
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.harmonics);
    this.harmonics.connect(this.cut);
    this.cut.connect(this.classAComp);
    this.classAComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.harmonics.disconnect();
      this.cut.disconnect();
      this.classAComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 3;
    this.preamp2.gain.value = 1.5;
    this.channel1.gain.value = 1.0;
    this.channel2.gain.value = 1.0;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 2.5);
      
      // BAD CAT "TOUCH SENSITIVITY" (dynamic response)
      y += 0.15 * Math.tanh(x * 5);
      
      // Harmonic richness
      if (Math.abs(y) > 0.5) {
        y *= 0.9;
      }
      
      if (x > 0) y *= 1.1;
      curve[i] = y * 0.87;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      
      // EL84 Class A warmth
      y += 0.12 * Math.sin(x * Math.PI * 3);
      y += 0.08 * Math.sin(x * Math.PI * 2);
      
      if (x > 0) y *= 1.12;
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else {
          this.setupChannel2();
        }
        break;
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 30), now, 0.01);
        break;
      case 'volume':
        this.powerAmp.gain.setTargetAtTime(value / 100, now, 0.01);
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
      case 'cut':
        const cutFreq = 3000 + (value / 100) * 12000;
        this.cut.frequency.setTargetAtTime(cutFreq, now, 0.01);
        break;
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.harmonics.disconnect();
    this.cut.disconnect();
    this.classAComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default BadCatHotCatAmp;

