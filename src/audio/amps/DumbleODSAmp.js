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
    
    // PAB entrance tightening filter (HPF)
    this.odEntranceTight = audioContext.createBiquadFilter();
    this.odEntranceTight.type = 'highpass';
    this.odEntranceTight.frequency.value = 90;
    this.odEntranceTight.Q.value = 0.707;
    
    // BRIGHT SWITCH (volume-dependent, real cap simulation)
    // 0=off, 1=100pF, 2=330pF
    this.brightMode = 0;
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
    
    // ROCK/JAZZ VOICING SWITCH (Skyliner control)
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
    // HRM (Hidden Rhythm Master) - Post-OD EQ
    // ============================================
    this.hrmOn = false;
    this.hrm = {
      bass: audioContext.createBiquadFilter(),
      mid: audioContext.createBiquadFilter(),
      treble: audioContext.createBiquadFilter()
    };
    this.hrm.bass.type = 'lowshelf';
    this.hrm.bass.frequency.value = 180;
    this.hrm.bass.gain.value = 0;
    this.hrm.mid.type = 'peaking';
    this.hrm.mid.frequency.value = 900;
    this.hrm.mid.Q.value = 1.2;
    this.hrm.mid.gain.value = 0;
    this.hrm.treble.type = 'highshelf';
    this.hrm.treble.frequency.value = 3500;
    this.hrm.treble.gain.value = 0;
    
    // ============================================
    // OD RATIO CONTROL (compression) + Local NFB
    // ============================================
    this.ratioComp = audioContext.createDynamicsCompressor();
    this.ratioComp.threshold.value = -15;
    this.ratioComp.knee.value = 15;
    this.ratioComp.ratio.value = 3;
    this.ratioComp.attack.value = 0.003;
    this.ratioComp.release.value = 0.1;
    
    // Local NFB (negative feedback) for liquid feel
    this.localNFB = audioContext.createWaveShaper();
    this.localNFB.curve = (() => {
      const n = 2048;
      const c = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        c[i] = Math.tanh(x * 1.1) * 0.98;
      }
      return c;
    })();
    
    // ============================================
    // PRESENCE
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    
    // ============================================
    // POWER AMP (6L6 sweet spot)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // EFFECTS LOOP (D-lator style with levels)
    // ============================================
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.loopSendLevel = audioContext.createGain();
    this.loopReturnLevel = audioContext.createGain();
    this.loopSendLevel.gain.value = 0.7; // -3 dB send
    this.loopReturnLevel.gain.value = 1.3; // +2.3 dB return make-up
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // CAB SIM (1x12 EVM/Thiele-ish)
    // ============================================
    this.cabOn = false;
    this.cabHPF = audioContext.createBiquadFilter();
    this.cabHPF.type = 'highpass';
    this.cabHPF.frequency.value = 70;
    this.cabLPF = audioContext.createBiquadFilter();
    this.cabLPF.type = 'lowpass';
    this.cabLPF.frequency.value = 6500;
    this.cabNotch = audioContext.createBiquadFilter();
    this.cabNotch.type = 'notch';
    this.cabNotch.frequency.value = 3800;
    this.cabNotch.Q.value = 1.2;
    
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
      bright_mode: 1, // 0=off, 1=100pF, 2=330pF
      mid_boost: false,
      deep: false,
      voicing: 'rock', // 'rock' or 'jazz'
      
      // HRM (Hidden Rhythm Master)
      hrm: false,
      hrm_bass: 50,
      hrm_mid: 50,
      hrm_treble: 50,
      
      // Effects
      fx_loop: false,
      fx_send: 70,
      fx_return: 70,
      
      // Cabinet sim
      cab_sim: false,
      
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
    
    // PAB (Pre-Amp Boost) routing with entrance tightening
    if (this.pabSwitch) {
      this.brightFilter.connect(this.pabGain);
      this.pabGain.connect(this.odEntranceTight);
      this.odEntranceTight.connect(this.odPreamp1);
    } else {
      this.brightFilter.connect(this.odEntranceTight);
      this.odEntranceTight.connect(this.odPreamp1);
    }
    
    // Cascading OD stages
    this.odPreamp1.connect(this.odSaturation1);
    this.odSaturation1.connect(this.odDrive);
    this.odDrive.connect(this.odPreamp2);
    this.odPreamp2.connect(this.odSaturation2);
    
    // Ratio compression (OD-specific) + HRM + Local NFB
    this.odSaturation2.connect(this.ratioComp);
    
    if (this.hrmOn) {
      // HRM path: ratioComp -> HRM EQ -> local NFB -> odVolume
      this.ratioComp.connect(this.hrm.bass);
      this.hrm.bass.connect(this.hrm.mid);
      this.hrm.mid.connect(this.hrm.treble);
      this.hrm.treble.connect(this.localNFB);
      this.localNFB.connect(this.odVolume);
    } else {
      // Direct path: ratioComp -> local NFB -> odVolume
      this.ratioComp.connect(this.localNFB);
      this.localNFB.connect(this.odVolume);
    }
    
    // Shared tone stack
    this.odVolume.connect(this.deepFilter); // Deep switch
    this.deepFilter.connect(this.bass);
    this.bass.connect(this.midBoost); // Mid boost switch
    this.midBoost.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Effects Loop routing (D-lator style)
    if (this.params.fx_loop) {
      this.presence.connect(this.loopSendLevel);
      this.loopSendLevel.connect(this.fxSend); // Send to external FX
      this.fxReturn.connect(this.loopReturnLevel);
      this.loopReturnLevel.connect(this.powerAmp); // Return from external FX
    } else {
      this.presence.connect(this.powerAmp);
    }
    
    // Power amp
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    
    // Cabinet sim routing
    if (this.cabOn) {
      this.master.connect(this.cabHPF);
      this.cabHPF.connect(this.cabNotch);
      this.cabNotch.connect(this.cabLPF);
      this.cabLPF.connect(this.output);
    } else {
      this.master.connect(this.output);
    }
    
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
    
    // Effects Loop routing (D-lator style)
    if (this.params.fx_loop) {
      this.presence.connect(this.loopSendLevel);
      this.loopSendLevel.connect(this.fxSend); // Send to external FX
      this.fxReturn.connect(this.loopReturnLevel);
      this.loopReturnLevel.connect(this.powerAmp); // Return from external FX
    } else {
      this.presence.connect(this.powerAmp);
    }
    
    // Power amp
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    
    // Cabinet sim routing
    if (this.cabOn) {
      this.master.connect(this.cabHPF);
      this.cabHPF.connect(this.cabNotch);
      this.cabNotch.connect(this.cabLPF);
      this.cabLPF.connect(this.output);
    } else {
      this.master.connect(this.output);
    }
    
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
      this.odEntranceTight.disconnect();
      this.odPreamp1.disconnect();
      this.odSaturation1.disconnect();
      this.odDrive.disconnect();
      this.odPreamp2.disconnect();
      this.odSaturation2.disconnect();
      this.ratioComp.disconnect();
      this.localNFB.disconnect();
      this.hrm.bass.disconnect();
      this.hrm.mid.disconnect();
      this.hrm.treble.disconnect();
      this.odVolume.disconnect();
      this.deepFilter.disconnect();
      this.bass.disconnect();
      this.midBoost.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.loopSendLevel.disconnect();
      this.loopReturnLevel.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
      this.cabHPF.disconnect();
      this.cabNotch.disconnect();
      this.cabLPF.disconnect();
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
    const n = 44100;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      
      // TRANSPARENCY (almost linear at low levels)
      if (Math.abs(x) < 0.45) {
        c[i] = x * 1.07;
        continue;
      }
      
      // Soft compression when approaching clipping
      let y = Math.tanh(x * 0.95);
      
      // 2nd harmonic warmth
      y += 0.025 * Math.tanh(x * 2.2);
      
      c[i] = y * 0.96;
    }
    return c;
  }
  
  makeODCurve() {
    const n = 44100;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      
      let y = Math.tanh(x * 3.2);
      
      // DUMBLE "BLOOM" (smooth progressive compression)
      y *= (1 + (Math.abs(x) * 0.18));
      
      // Soft-knee compression (NOT hard clipping)
      if (Math.abs(y) > 0.52) {
        const ex = Math.abs(y) - 0.52;
        y = Math.sign(y) * (0.52 + ex * 0.65);
      }
      
      // "SINGING" SUSTAIN (strong even harmonics 2nd/4th)
      y += 0.16 * Math.tanh(x * 4.5);
      y += 0.07 * Math.tanh(x * 9);
      
      // Slight asymmetry (tube-like)
      if (x > 0) y *= 1.09;
      
      c[i] = y * 0.84;
    }
    return c;
  }
  
  makePowerAmpCurve() {
    const n = 44100;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      
      // 6L6 "sweet spot" compression
      let y = Math.tanh(x * 1.35);
      
      // Power tube compression
      if (Math.abs(y) > 0.6) {
        const ex = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + ex * 0.42);
      }
      
      // Even harmonics (power tube characteristic)
      y += 0.04 * Math.tanh(x * 2.2);
      
      c[i] = y * 0.92;
    }
    return c;
  }
  
  // Helper: Calculate bright cap effect (volume-dependent)
  getBrightDb(vol01, mode) {
    const max = mode === 2 ? 10 : mode === 1 ? 6 : 0;
    return (1 - vol01) * max; // More effect with lower volume
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
        // Update bright filter based on volume
        this.brightFilter.gain.setTargetAtTime(
          this.getBrightDb(value / 100, this.brightMode),
          now,
          0.02
        );
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
        // Update bright filter based on volume
        this.brightFilter.gain.setTargetAtTime(
          this.getBrightDb(value / 100, this.brightMode),
          now,
          0.02
        );
        break;
      
      case 'ratio': {
        // OD Ratio control (compression) - musical 1.2:1 to ~6:1
        const r = 1.2 + (value / 100) * 4.8;
        this.ratioComp.ratio.setTargetAtTime(r, now, 0.02);
        // Adjust threshold to maintain loudness
        const th = -20 + (value / 100) * 8; // -20 to -12 dB
        this.ratioComp.threshold.setTargetAtTime(th, now, 0.02);
        break;
      }
      
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
        // PAB (Pre-Amp Boost) - opens tone stack and tightens bass
        this.pabSwitch = !!value;
        // Boost mids slightly when PAB is on
        this.mid.gain.setTargetAtTime(
          this.pabSwitch ? 1.5 : 0,
          now,
          0.03
        );
        if (this.activeChannel === 'overdrive') {
          this.setupOverdriveChannel();
        }
        break;
      
      case 'bright':
        // Bright switch (backward compat: sets mode to 1 or 0)
        this.brightMode = value ? 1 : 0;
        this.params.bright = !!value;
        // Update bright filter gain based on current volume
        const currentVol = this.activeChannel === 'overdrive' 
          ? this.params.od_volume / 100 
          : this.params.clean_volume / 100;
        this.brightFilter.gain.setTargetAtTime(
          this.getBrightDb(currentVol, this.brightMode),
          now,
          0.02
        );
        break;
      
      case 'bright_mode':
        // Bright mode: 0=off, 1=100pF, 2=330pF
        this.brightMode = value | 0;
        // Update bright filter gain based on current volume
        const vol = this.activeChannel === 'overdrive'
          ? this.params.od_volume / 100
          : this.params.clean_volume / 100;
        this.brightFilter.gain.setTargetAtTime(
          this.getBrightDb(vol, this.brightMode),
          now,
          0.02
        );
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
        // Rock/Jazz voicing switch (Skyliner control)
        this.voicing = value;
        if (value === 'rock') {
          // Skyliner more open (Rock mode)
          this.bass.frequency.setTargetAtTime(150, now, 0.01);
          this.mid.frequency.setTargetAtTime(750, now, 0.01);
          this.mid.Q.setTargetAtTime(2.0, now, 0.01);
          this.treble.frequency.setTargetAtTime(3200, now, 0.01);
          this.voicingFilter.frequency.setTargetAtTime(20000, now, 0.01);
        } else {
          // Jazz: bigger slope, less harsh
          this.bass.frequency.setTargetAtTime(120, now, 0.01);
          this.mid.frequency.setTargetAtTime(600, now, 0.01);
          this.mid.Q.setTargetAtTime(1.2, now, 0.01);
          this.treble.frequency.setTargetAtTime(2400, now, 0.01);
          this.voicingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        }
        break;
      
      // ============================================
      // HRM (Hidden Rhythm Master)
      // ============================================
      case 'hrm':
        this.hrmOn = !!value;
        // Re-route OD channel to include/exclude HRM
        if (this.activeChannel === 'overdrive') {
          this.setupOverdriveChannel();
        }
        break;
      
      case 'hrm_bass':
        this.hrm.bass.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      case 'hrm_mid':
        this.hrm.mid.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      case 'hrm_treble':
        this.hrm.treble.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      // ============================================
      // EFFECTS LOOP (D-lator style)
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
      
      case 'fx_send':
        this.loopSendLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_return':
        this.loopReturnLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CABINET SIM
      // ============================================
      case 'cab_sim':
        this.cabOn = !!value;
        // Re-route current channel to include/exclude cab sim
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
    this.odEntranceTight.disconnect();
    this.brightFilter.disconnect();
    this.midBoost.disconnect();
    this.deepFilter.disconnect();
    this.voicingFilter.disconnect();
    this.ratioComp.disconnect();
    this.localNFB.disconnect();
    this.hrm.bass.disconnect();
    this.hrm.mid.disconnect();
    this.hrm.treble.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.loopSendLevel.disconnect();
    this.loopReturnLevel.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
    this.cabHPF.disconnect();
    this.cabNotch.disconnect();
    this.cabLPF.disconnect();
  }
}

export default DumbleODSAmp;

