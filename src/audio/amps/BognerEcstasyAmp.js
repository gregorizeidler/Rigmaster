import BaseAmp from './BaseAmp.js';

class BognerEcstasyAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bogner Ecstasy', 'bogner_ecstasy');
    
    // BOGNER ECSTASY
    // Versatile high-gain boutique amp - used by Steve Vai, Jerry Cantrell
    // 3 channels, multiple voicing options, MIDI switching
    
    // ============================================
    // 3 CHANNELS
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean/Crunch
    this.channel2 = audioContext.createGain(); // Lead
    this.channel3 = audioContext.createGain(); // Ultra Lead
    
    // Active channel
    this.activeChannel = 2; // 1, 2, or 3
    
    // ============================================
    // PREAMP (4 gain stages)
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
    // TONE STACK (Interactive)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    this.depth = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 150;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 100;
    this.depth.gain.value = 0;
    
    // ============================================
    // EXCURSION SWITCH (extra low-end)
    // ============================================
    this.excursion = false;
    this.excursionFilter = audioContext.createBiquadFilter();
    this.excursionFilter.type = 'lowshelf';
    this.excursionFilter.frequency.value = 80;
    this.excursionFilter.gain.value = 0;
    
    // ============================================
    // POWER AMP (4x EL34 or 6L6)
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
    // ROUTING - CHANNEL 2 (DEFAULT)
    // ============================================
    this.setupChannel2();
    
    this.params = {
      channel: 2, // 1=clean, 2=lead, 3=ultra
      
      // Gain/Volume per channel
      ch1_gain: 40,
      ch2_gain: 70,
      ch3_gain: 85,
      
      // Tone stack
      bass: 60,
      middle: 50,
      treble: 65,
      presence: 60,
      depth: 50,
      
      // Switches
      excursion: false,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    this.disconnectAll();
    
    // CHANNEL 1 - Clean/Crunch (2 gain stages)
    this.input.connect(this.channel1);
    this.channel1.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    this.disconnectAll();
    
    // CHANNEL 2 - Lead (3 gain stages)
    this.input.connect(this.channel2);
    this.channel2.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  setupChannel3() {
    this.disconnectAll();
    
    // CHANNEL 3 - Ultra Lead (4 gain stages)
    this.input.connect(this.channel3);
    this.channel3.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preamp1);
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
    this.presence.connect(this.depth);
    this.depth.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 3;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
      this.excursionFilter.disconnect();
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
      this.depth.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 6;
    this.preamp2.gain.value = 1.8;
    this.preamp3.gain.value = 1.5;
    this.preamp4.gain.value = 1.3;
    this.channel1.gain.value = 0.5;
    this.channel2.gain.value = 1.0;
    this.channel3.gain.value = 1.3;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 5);
      
      // BOGNER "SMOOTH" HIGH GAIN
      y += 0.12 * Math.tanh(x * 10);
      
      if (Math.abs(y) > 0.6) {
        y *= 0.92;
      }
      
      if (x > 0) y *= 1.15;
      curve[i] = y * 0.83;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.7);
      
      // EL34 power tubes
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.4);
      }
      
      y += 0.08 * Math.tanh(x * 12);
      if (x > 0) y *= 1.18;
      curve[i] = y * 0.8;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else if (value === 2) {
          this.setupChannel2();
        } else {
          this.setupChannel3();
        }
        break;
      case 'ch1_gain':
        this.channel1.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'ch2_gain':
      case 'gain':
        this.channel2.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'ch3_gain':
        this.channel3.gain.setTargetAtTime(value / 100, now, 0.01);
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
      case 'depth':
        this.depth.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'excursion':
        this.excursion = value;
        this.excursionFilter.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
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
    this.channel3.disconnect();
    this.excursionFilter.disconnect();
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
    this.depth.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default BognerEcstasyAmp;

