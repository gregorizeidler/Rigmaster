import BaseAmp from './BaseAmp.js';

class SuhrBadgerAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Suhr Badger', 'suhr_badger');
    
    // SUHR BADGER (Marshall-inspired boutique)
    // Designed by John Suhr (ex-Fender Custom Shop)
    // Used by session players, Pete Thorn
    // Known for: British crunch with modern clarity
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.gainChannel = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'gain'; // 'clean' or 'gain'
    
    // ============================================
    // PREAMP (3 cascading 12AX7 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeSuhrPreampCurve();
    this.saturation2.curve = this.makeSuhrPreampCurve();
    this.saturation3.curve = this.makeSuhrPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // TONE STACK (Marshall-style)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 800;
    this.middle.Q.value = 1.3;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // SUHR "CLARITY" SWITCH
    // ============================================
    this.clarityFilter = audioContext.createBiquadFilter();
    this.clarityFilter.type = 'highpass';
    this.clarityFilter.frequency.value = 90;
    this.clarityFilter.Q.value = 0.7;
    this.claritySwitch = false;
    
    // ============================================
    // SUHR "VARIAC" POWER CONTROL
    // ============================================
    this.variacPower = audioContext.createGain();
    this.variacPower.gain.value = 1.0; // Full power
    
    // ============================================
    // POWER AMP (2x EL34 or 2x 6L6)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // British-style compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -15;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 3.5;
    this.powerComp.attack.value = 0.006;
    this.powerComp.release.value = 0.1;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - GAIN CHANNEL (DEFAULT)
    // ============================================
    this.setupGainChannel();
    
    this.params = {
      channel: 1, // 0=clean, 1=gain
      
      // Gain/Volume
      gain: 65,
      channel_volume: 70,
      
      // Tone stack
      bass: 55,
      middle: 60,
      treble: 65,
      presence: 60,
      
      // Switches
      clarity: 0, // 0=off, 1=on
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupCleanChannel() {
    // CLEAN CHANNEL - 2 gain stages
    this.disconnectAll();
    
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    if (this.claritySwitch) {
      this.saturation2.connect(this.clarityFilter);
      this.clarityFilter.connect(this.bass);
    } else {
      this.saturation2.connect(this.bass);
    }
    
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.channelVolume);
    this.channelVolume.connect(this.variacPower);
    this.variacPower.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  setupGainChannel() {
    // GAIN CHANNEL - 3 cascading gain stages
    this.disconnectAll();
    
    this.input.connect(this.gainChannel);
    this.gainChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    if (this.claritySwitch) {
      this.saturation3.connect(this.clarityFilter);
      this.clarityFilter.connect(this.bass);
    } else {
      this.saturation3.connect(this.bass);
    }
    
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.channelVolume);
    this.channelVolume.connect(this.variacPower);
    this.variacPower.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'gain';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.gainChannel.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.clarityFilter.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.channelVolume.disconnect();
      this.variacPower.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 6;
    this.preamp2.gain.value = 2.0;
    this.preamp3.gain.value = 1.5;
    this.cleanChannel.gain.value = 0.7;
    this.gainChannel.gain.value = 1.0;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.05;
    this.master.gain.value = 0.7;
  }
  
  makeSuhrPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SUHR "MODERN BRITISH" VOICING
      let y = Math.tanh(x * 5);
      
      // MUSICAL COMPRESSION
      if (Math.abs(y) > 0.55) {
        const compression = 1 - (Math.abs(y) - 0.55) * 0.25;
        y *= compression;
      }
      
      // CLARITY (not muddy)
      y += 0.1 * Math.tanh(x * 9);
      
      // BRITISH CRUNCH
      y += 0.08 * Math.tanh(x * 6);
      
      // Slight asymmetry
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL34 POWER TUBES (British)
      let y = Math.tanh(x * 1.55);
      
      // EL34 COMPRESSION
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.52);
      }
      
      // PUNCH
      y += 0.08 * Math.tanh(x * 3);
      
      // EL34 AGGRESSION
      y += 0.09 * Math.tanh(x * 7);
      
      // WARMTH
      y += 0.05 * Math.sin(x * Math.PI * 4);
      
      // Asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.89;
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
          this.setupGainChannel();
        }
        break;
      
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 12), now, 0.01);
        break;
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(value / 100, now, 0.01);
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
      
      case 'clarity':
        this.claritySwitch = value > 0;
        // Re-route to apply clarity filter
        if (this.activeChannel === 'clean') {
          this.setupCleanChannel();
        } else {
          this.setupGainChannel();
        }
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
    this.gainChannel.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.clarityFilter.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.channelVolume.disconnect();
    this.variacPower.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default SuhrBadgerAmp;

