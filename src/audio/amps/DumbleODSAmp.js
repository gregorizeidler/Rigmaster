import BaseAmp from './BaseAmp.js';

class DumbleODSAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Dumble ODS', 'dumble_ods');
    
    // DUMBLE OVERDRIVE SPECIAL
    // Legendary smooth, vocal overdrive - Robben Ford, Larry Carlton
    
    // ============================================
    // CLEAN CHANNEL
    // ============================================
    this.cleanPreamp = audioContext.createGain();
    this.cleanVolume = audioContext.createGain();
    this.cleanSaturation = audioContext.createWaveShaper();
    this.cleanSaturation.curve = this.makeCleanCurve();
    this.cleanSaturation.oversample = '4x';
    
    // ============================================
    // OVERDRIVE CHANNEL
    // ============================================
    this.odPreamp1 = audioContext.createGain();
    this.odPreamp2 = audioContext.createGain();
    this.odVolume = audioContext.createGain();
    this.odDrive = audioContext.createGain();
    
    // OD Saturation stages
    this.odSaturation1 = audioContext.createWaveShaper();
    this.odSaturation2 = audioContext.createWaveShaper();
    this.odSaturation1.curve = this.makeODCurve();
    this.odSaturation2.curve = this.makeODCurve();
    this.odSaturation1.oversample = '4x';
    this.odSaturation2.oversample = '4x';
    
    // Active channel
    this.activeChannel = 'overdrive'; // 'clean' or 'overdrive'
    
    // ============================================
    // FRONT PANEL SWITCHES
    // ============================================
    
    // PAB (Pre-Amp Boost) - adds gain stage before OD
    this.pabSwitch = false;
    this.pabGain = audioContext.createGain();
    this.pabGain.gain.value = 1;
    
    // BRIGHT SWITCH (high-end sparkle)
    this.brightSwitch = false;
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 4000;
    this.brightFilter.gain.value = 0;
    
    // MID BOOST SWITCH
    this.midSwitch = false;
    this.midBoost = audioContext.createBiquadFilter();
    this.midBoost.type = 'peaking';
    this.midBoost.frequency.value = 750;
    this.midBoost.Q.value = 2;
    this.midBoost.gain.value = 0;
    
    // DEEP SWITCH (low-end boost)
    this.deepSwitch = false;
    this.deepFilter = audioContext.createBiquadFilter();
    this.deepFilter.type = 'lowshelf';
    this.deepFilter.frequency.value = 100;
    this.deepFilter.gain.value = 0;
    
    // ROCK/JAZZ VOICING SWITCH
    this.voicing = 'rock'; // 'rock' or 'jazz'
    this.voicingFilter = audioContext.createBiquadFilter();
    this.voicingFilter.type = 'lowpass';
    this.voicingFilter.frequency.value = 20000; // Rock = open, Jazz = darker
    
    // ============================================
    // SHARED TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 150;
    this.mid.type = 'peaking';
    this.mid.frequency.value = 750;
    this.mid.Q.value = 2;
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    
    // ============================================
    // OD RATIO CONTROL (compression)
    // ============================================
    this.ratioComp = audioContext.createDynamicsCompressor();
    this.ratioComp.threshold.value = -15;
    this.ratioComp.knee.value = 15;
    this.ratioComp.ratio.value = 3;
    this.ratioComp.attack.value = 0.003;
    this.ratioComp.release.value = 0.1;
    
    // ============================================
    // PRESENCE
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    
    // ============================================
    // POWER AMP (6L6 or EL34 depending on model)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // EFFECTS LOOP (Series)
    // ============================================
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxBypass = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - OVERDRIVE CHANNEL (DEFAULT)
    // ============================================
    this.setupOverdriveChannel();
    
    this.params = {
      channel: 1, // 0=clean, 1=overdrive
      
      // Clean channel
      clean_volume: 50,
      
      // Overdrive channel
      od_drive: 50,
      od_volume: 50,
      ratio: 50, // OD compression
      
      // Shared tone controls
      bass: 50,
      mid: 55,
      treble: 60,
      presence: 50,
      
      // Switches
      pab: false, // Pre-Amp Boost
      bright: false,
      mid_boost: false,
      deep: false,
      voicing: 'rock', // 'rock' or 'jazz'
      
      // Effects
      fx_loop: false,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupOverdriveChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // OVERDRIVE CHANNEL - Legendary singing sustain
    this.input.connect(this.voicingFilter); // Rock/Jazz voicing
    this.voicingFilter.connect(this.brightFilter); // Bright switch
    
    // PAB (Pre-Amp Boost) routing
    if (this.pabSwitch) {
      this.brightFilter.connect(this.pabGain);
      this.pabGain.connect(this.odPreamp1);
    } else {
      this.brightFilter.connect(this.odPreamp1);
    }
    
    // Cascading OD stages
    this.odPreamp1.connect(this.odSaturation1);
    this.odSaturation1.connect(this.odDrive);
    this.odDrive.connect(this.odPreamp2);
    this.odPreamp2.connect(this.odSaturation2);
    
    // Ratio compression (OD-specific)
    this.odSaturation2.connect(this.ratioComp);
    this.ratioComp.connect(this.odVolume);
    
    // Shared tone stack
    this.odVolume.connect(this.deepFilter); // Deep switch
    this.deepFilter.connect(this.bass);
    this.bass.connect(this.midBoost); // Mid boost switch
    this.midBoost.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.presence.connect(this.fxSend); // Send to external FX
      this.fxReturn.connect(this.powerAmp); // Return from external FX
    } else {
      this.presence.connect(this.powerAmp);
    }
    
    // Power amp
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'overdrive';
  }
  
  setupCleanChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // CLEAN CHANNEL - Transparent, pristine clean
    this.input.connect(this.voicingFilter); // Rock/Jazz voicing
    this.voicingFilter.connect(this.brightFilter); // Bright switch
    this.brightFilter.connect(this.cleanPreamp);
    this.cleanPreamp.connect(this.cleanSaturation);
    this.cleanSaturation.connect(this.cleanVolume);
    
    // Shared tone stack
    this.cleanVolume.connect(this.deepFilter); // Deep switch
    this.deepFilter.connect(this.bass);
    this.bass.connect(this.midBoost); // Mid boost switch
    this.midBoost.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.presence.connect(this.fxSend); // Send to external FX
      this.fxReturn.connect(this.powerAmp); // Return from external FX
    } else {
      this.presence.connect(this.powerAmp);
    }
    
    // Power amp
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.voicingFilter.disconnect();
      this.brightFilter.disconnect();
      this.cleanPreamp.disconnect();
      this.cleanSaturation.disconnect();
      this.cleanVolume.disconnect();
      this.pabGain.disconnect();
      this.odPreamp1.disconnect();
      this.odSaturation1.disconnect();
      this.odDrive.disconnect();
      this.odPreamp2.disconnect();
      this.odSaturation2.disconnect();
      this.ratioComp.disconnect();
      this.odVolume.disconnect();
      this.deepFilter.disconnect();
      this.bass.disconnect();
      this.midBoost.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // CLEAN CHANNEL
    // ============================================
    this.cleanPreamp.gain.value = 1.5;
    this.cleanVolume.gain.value = 0.5;
    
    // ============================================
    // OVERDRIVE CHANNEL
    // ============================================
    this.odPreamp1.gain.value = 3;
    this.odPreamp2.gain.value = 1.2;
    this.odDrive.gain.value = 2;
    this.odVolume.gain.value = 0.5;
    
    // PAB (Pre-Amp Boost)
    this.pabGain.gain.value = 2.5; // When enabled
    
    // ============================================
    // POWER AMP
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // MASTER
    // ============================================
    this.master.gain.value = 0.7;
  }
  
  makeCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // TRANSPARENCY (almost linear at low levels)
      if (Math.abs(x) < 0.4) {
        curve[i] = x * 1.08; // Nearly linear
        continue;
      }
      
      // Soft compression when approaching clipping
      let y = Math.tanh(x * 0.9);
      
      // Slight even harmonics (warmth)
      y += 0.03 * Math.tanh(x * 2);
      
      curve[i] = y * 0.95;
    }
    return curve;
  }
  
  makeODCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // TRANSPARENCY at low levels
      if (Math.abs(x) < 0.3) {
        curve[i] = x * 1.05;
        continue;
      }
      
      // DUMBLE "BLOOM" (compression that grows with volume)
      let y = Math.tanh(x * 3);
      const bloom = 1 + (Math.abs(x) * 0.2);
      y *= bloom;
      
      // Soft-knee compression (NOT hard clipping)
      if (Math.abs(y) > 0.5) {
        const ratio = 0.7;
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * ratio);
      }
      
      // "SINGING" SUSTAIN (strong even harmonics)
      y += 0.18 * Math.tanh(x * 4); // 2nd harmonic
      y += 0.08 * Math.tanh(x * 8); // 4th harmonic
      
      // VOCAL CHARACTER (mid-range focus)
      y += 0.15 * Math.tanh(x * 6);
      
      // Slight asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.82;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 6L6 or EL34 power tubes (smooth, musical compression)
      let y = Math.tanh(x * 1.3);
      
      // Power tube compression
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.4);
      }
      
      // Slight even harmonics
      y += 0.05 * Math.tanh(x * 2);
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        if (value === 0) {
          this.setupCleanChannel();
        } else {
          this.setupOverdriveChannel();
        }
        break;
      
      // ============================================
      // CLEAN CHANNEL CONTROLS
      // ============================================
      case 'clean_volume':
        this.cleanVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // OVERDRIVE CHANNEL CONTROLS
      // ============================================
      case 'od_drive':
      case 'gain':
        this.odDrive.gain.setTargetAtTime(1 + (value / 20), now, 0.01);
        break;
      
      case 'od_volume':
        this.odVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'ratio':
        // OD Ratio control (compression)
        this.ratioComp.ratio.setTargetAtTime(1 + (value / 100) * 5, now, 0.01);
        break;
      
      // ============================================
      // SHARED TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // FRONT PANEL SWITCHES
      // ============================================
      case 'pab':
        // PAB (Pre-Amp Boost)
        this.pabSwitch = value;
        if (this.activeChannel === 'overdrive') {
          this.setupOverdriveChannel(); // Re-route with/without PAB
        }
        break;
      
      case 'bright':
        // Bright switch
        this.brightSwitch = value;
        this.brightFilter.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      case 'mid_boost':
        // Mid boost switch
        this.midSwitch = value;
        this.midBoost.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      case 'deep':
        // Deep switch (low-end boost)
        this.deepSwitch = value;
        this.deepFilter.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      case 'voicing':
        // Rock/Jazz voicing switch
        this.voicing = value;
        if (value === 'rock') {
          // Rock = open, full-range
          this.voicingFilter.frequency.setTargetAtTime(20000, now, 0.01);
        } else {
          // Jazz = darker, warmer
          this.voicingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        }
        break;
      
      // ============================================
      // EFFECTS LOOP
      // ============================================
      case 'fx_loop':
        this.params.fx_loop = value;
        // Re-route current channel
        if (this.activeChannel === 'overdrive') {
          this.setupOverdriveChannel();
        } else {
          this.setupCleanChannel();
        }
        break;
      
      // ============================================
      // MASTER VOLUME
      // ============================================
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.cleanPreamp.disconnect();
    this.cleanSaturation.disconnect();
    this.cleanVolume.disconnect();
    this.odPreamp1.disconnect();
    this.odPreamp2.disconnect();
    this.odSaturation1.disconnect();
    this.odSaturation2.disconnect();
    this.odDrive.disconnect();
    this.odVolume.disconnect();
    this.pabGain.disconnect();
    this.brightFilter.disconnect();
    this.midBoost.disconnect();
    this.deepFilter.disconnect();
    this.voicingFilter.disconnect();
    this.ratioComp.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default DumbleODSAmp;

