import BaseAmp from './BaseAmp.js';

class FriedmanBE100Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Friedman BE-100', 'friedman_be100');
    
    // FRIEDMAN BE-100 (Brown Eye)
    // Modern high-gain with vintage vibe - Jerry Cantrell signature
    // Based on modified Marshall Plexi circuit
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.beChannel = audioContext.createGain(); // Brown Eye
    
    // Active channel
    this.activeChannel = 'be'; // 'clean' or 'be'
    
    // ============================================
    // PREAMP (Modified Plexi circuit)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation3.curve = this.makePreampCurve();
    this.saturation4.curve = this.makePreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // TONE STACK (Modified Marshall)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 150;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 650;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // FRIEDMAN "TIGHT" SWITCH
    // ============================================
    this.tightSwitch = false;
    this.tightFilter = audioContext.createBiquadFilter();
    this.tightFilter.type = 'highpass';
    this.tightFilter.frequency.value = 20; // Off by default
    this.tightFilter.Q.value = 0.707;
    
    // ============================================
    // FAT SWITCH (adds low-end girth)
    // ============================================
    this.fatSwitch = false;
    this.fatFilter = audioContext.createBiquadFilter();
    this.fatFilter.type = 'lowshelf';
    this.fatFilter.frequency.value = 100;
    this.fatFilter.gain.value = 0;
    
    // ============================================
    // POWER AMP (4x KT88 or EL34)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -15;
    this.powerComp.knee.value = 10;
    this.powerComp.ratio.value = 4;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.1;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - BE CHANNEL (DEFAULT)
    // ============================================
    this.setupBEChannel();
    
    this.params = {
      channel: 1, // 0=clean, 1=be
      
      // Gain/Volume
      gain: 75,
      volume: 70,
      
      // Tone stack
      bass: 60,
      middle: 50,
      treble: 70,
      presence: 65,
      
      // Switches
      tight: false,
      fat: false,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupCleanChannel() {
    this.disconnectAll();
    
    // CLEAN CHANNEL - 2 gain stages
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.tightFilter);
    this.tightFilter.connect(this.fatFilter);
    this.fatFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  setupBEChannel() {
    this.disconnectAll();
    
    // BE CHANNEL - 4 cascading gain stages
    this.input.connect(this.beChannel);
    this.beChannel.connect(this.tightFilter);
    this.tightFilter.connect(this.fatFilter);
    this.fatFilter.connect(this.preamp1);
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
    this.treble.connect(this.presence);
    this.presence.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'be';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.beChannel.disconnect();
      this.tightFilter.disconnect();
      this.fatFilter.disconnect();
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
      this.presence.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 8;
    this.preamp2.gain.value = 1.8;
    this.preamp3.gain.value = 1.5;
    this.preamp4.gain.value = 1.3;
    this.cleanChannel.gain.value = 0.6;
    this.beChannel.gain.value = 1.0;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // FRIEDMAN "BROWN EYE" (modern Plexi)
      let y = Math.tanh(x * 6);
      
      // "SINGING" SUSTAIN (Friedman signature)
      y += 0.15 * Math.tanh(x * 12);
      
      // Marshall-like bite with modern tightness
      if (Math.abs(y) > 0.6) {
        y *= 0.92;
      }
      
      if (x > 0) y *= 1.18;
      curve[i] = y * 0.82;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // KT88 power tubes (tight, powerful)
      let y = Math.tanh(x * 1.7);
      
      // KT88 compression
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.45);
      }
      
      // Modern tightness
      if (x < 0) y *= 1.05;
      
      // High-end bite
      y += 0.1 * Math.tanh(x * 15);
      
      if (x > 0) y *= 1.2;
      curve[i] = y * 0.8;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 0) {
          this.setupCleanChannel();
        } else {
          this.setupBEChannel();
        }
        break;
      
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 10), now, 0.01);
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
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'tight':
        this.tightSwitch = value;
        if (value) {
          this.tightFilter.frequency.setTargetAtTime(120, now, 0.01); // Cut low-end
        } else {
          this.tightFilter.frequency.setTargetAtTime(20, now, 0.01);
        }
        break;
      
      case 'fat':
        this.fatSwitch = value;
        this.fatFilter.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.cleanChannel.disconnect();
    this.beChannel.disconnect();
    this.tightFilter.disconnect();
    this.fatFilter.disconnect();
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
    this.presence.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default FriedmanBE100Amp;

