import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

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
    // PRE-EQ (B1 / N / B2) - Before first stage
    // ============================================
    this.preEQMode = 'N'; // 'B1','N','B2'
    this.preEQ = audioContext.createBiquadFilter();
    this.preEQ.type = 'peaking';
    this.preEQ.frequency.value = 800;
    this.preEQ.Q.value = 0.7;
    this.preEQ.gain.value = 0;
    
    // ============================================
    // BRIGHT FILTER (3-pos per channel)
    // ============================================
    this.bright = 0; // 0=off, 1=mid, 2=hi
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3500;
    this.brightFilter.gain.value = 0;
    
    // ============================================
    // GAIN H/L SWITCH
    // ============================================
    this.gainSwitch = 'H'; // 'H' | 'L'
    
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
    // CHANNEL 2 LEAD VOCAL BUMP
    // ============================================
    this.ch2LeadBump = audioContext.createBiquadFilter();
    this.ch2LeadBump.type = 'peaking';
    this.ch2LeadBump.frequency.value = 1600;
    this.ch2LeadBump.Q.value = 1.2;
    this.ch2LeadBump.gain.value = 0;
    
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
    // STRUCTURE (Old / New)
    // ============================================
    this.structure = 'New'; // 'Old'|'New'
    this.nfbTilt = audioContext.createBiquadFilter();
    this.nfbTilt.type = 'peaking';
    this.nfbTilt.frequency.value = 3500;
    this.nfbTilt.Q.value = 0.8;
    this.nfbTilt.gain.value = 1.5; // Default to 'New'
    
    // ============================================
    // EXCURSION SWITCH (3-pos: T/M/L)
    // ============================================
    this.excursionPos = 'M'; // 'T' (Tight), 'M' (Medium), 'L' (Loose)
    this.excursionFilter = audioContext.createBiquadFilter();
    this.excursionFilter.type = 'lowshelf';
    this.excursionFilter.frequency.value = 70;
    this.excursionFilter.gain.value = 0;
    
    // ============================================
    // FX LOOP (Parallel with Mix)
    // ============================================
    this.fxLoop = false;
    this.fxParallel = true;
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxMix = audioContext.createGain();
    this.fxSendTrim = audioContext.createGain();
    this.fxReturnTrim = audioContext.createGain();
    this.fxDryTap = audioContext.createGain();
    this.fxMix.gain.value = 0;
    this.fxSendTrim.gain.value = 0.8;
    this.fxReturnTrim.gain.value = 1.0;
    
    // ============================================
    // VARIAC (100V) - Sag Musical
    // ============================================
    // NOISE GATE - AUDIOWORKLET (high-gain channels)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -54,      // Moderate threshold
      thClose: -62,     // TRUE HYSTERESIS
      attack: 0.0009,   // 0.9ms attack
      release: 0.14,    // 140ms release
      rms: 0.018,       // 18ms RMS window
      peakMix: 0.32,    // Balanced peak/RMS
      floorDb: -72,     // Musical floor
      holdMs: 12        // 12ms hold
    });
    
    // ============================================
    this.variac = false;
    
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // ============================================
    // Bogner Ecstasy uses tube rectifier (EL34 or 6L6 power tubes)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.13,      // 13% sag (tube rectifier)
      att: 0.006,       // 6ms attack
      relFast: 0.06,    // 60ms fast recovery
      relSlow: 0.22,    // 220ms slow recovery
      rmsMs: 22.0,      // 22ms RMS window
      shape: 1.5,       // Progressive/tube-like
      floor: 0.27,      // 27% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // ============================================
    // POWER AMP (4x EL34 or 6L6)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // BOOST PER CHANNEL
    // ============================================
    this.boost = {1: false, 2: false, 3: false};
    
    // ============================================
    // CHANNEL MASTERS
    // ============================================
    this.channelMaster = {
      1: audioContext.createGain(),
      2: audioContext.createGain(),
      3: audioContext.createGain(),
    };
    this.channelMaster[1].gain.value = 0.6;
    this.channelMaster[2].gain.value = 0.7;
    this.channelMaster[3].gain.value = 0.75;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // SNAP/RECALL PER CHANNEL
    // ============================================
    this.snap = {
      1: {gain: 40, bass: 55, middle: 50, treble: 60, presence: 58, depth: 52, master: 60},
      2: {gain: 70, bass: 60, middle: 50, treble: 65, presence: 60, depth: 50, master: 70},
      3: {gain: 85, bass: 60, middle: 48, treble: 66, presence: 62, depth: 54, master: 75},
    };
    
    // ============================================
    // ROUTING - CHANNEL 2 (DEFAULT)
    // ============================================
    this.setupChannel2();
    this.recreateCabinet();
    
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
      
      // New switches
      pre_eq: 'N',              // 'B1'|'N'|'B2'
      bright: 0,                // 0|1|2
      gain_switch: 'H',         // 'H'|'L'
      structure: 'New',         // 'Old'|'New'
      variac: false,
      excursion: 'M',           // 'T'|'M'|'L'
      
      // Boost per channel
      boost1: false,
      boost2: false,
      boost3: false,
      
      // Channel masters
      ch1_master: 60,
      ch2_master: 70,
      ch3_master: 75,
      
      // FX Loop
      fx_loop: false,
      fx_parallel: true,
      fx_mix: 0,
      fx_send: 80,
      fx_return: 100,
      
      // Cabinet & Mic
      cabinet_enabled: true,
      cabinet_type: '4x12_vintage',
      mic_position: 50,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    this.disconnectAll();
    
    // CHANNEL 1 - Clean/Crunch (2 gain stages)
    // Routing: input → ch1 → excursion → preEQ → bright → preamp1 → sat1 → preamp2 → sat2
    //          → bass → middle → treble → presence → depth → ch2LeadBump → nfbTilt
    //          → [FX Loop] → sagComp → powerComp → powerAmp → powerSat → channelMaster[1] → master → output
    
    // Gate at input for high-gain channels
    if (this.noiseGate) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel1);
    } else {
      this.input.connect(this.channel1);
    }
    this.channel1.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preEQ);
    this.preEQ.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.ch2LeadBump); // Won't be active on ch1
    this.ch2LeadBump.connect(this.nfbTilt);
    
    // FX Loop routing
    this.routeFXLoop(this.nfbTilt);
    
    this.channelMaster[1].connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    this.activeChannel = 1;
    this._applySnap(1);
    this._applyChannelSpecificTweaks(1);
  }
  
  setupChannel2() {
    this.disconnectAll();
    
    // CHANNEL 2 - Lead (3 gain stages)
    // Same routing as ch1 but with 3 stages and lead bump active
    
    // Gate at input for high-gain channels
    if (this.noiseGate) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel2);
    } else {
      this.input.connect(this.channel2);
    }
    this.channel2.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preEQ);
    this.preEQ.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
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
    this.depth.connect(this.ch2LeadBump);
    this.ch2LeadBump.connect(this.nfbTilt);
    
    // FX Loop routing
    this.routeFXLoop(this.nfbTilt);
    
    this.channelMaster[2].connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    this.activeChannel = 2;
    this._applySnap(2);
    this._applyChannelSpecificTweaks(2);
  }
  
  setupChannel3() {
    this.disconnectAll();
    
    // CHANNEL 3 - Ultra Lead (4 gain stages)
    
    // Gate at input for high-gain channels
    if (this.noiseGate) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel3);
    } else {
      this.input.connect(this.channel3);
    }
    this.channel3.connect(this.excursionFilter);
    this.excursionFilter.connect(this.preEQ);
    this.preEQ.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
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
    this.depth.connect(this.ch2LeadBump); // Won't be active on ch3
    this.ch2LeadBump.connect(this.nfbTilt);
    
    // FX Loop routing
    this.routeFXLoop(this.nfbTilt);
    
    this.channelMaster[3].connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    this.activeChannel = 3;
    this._applySnap(3);
    this._applyChannelSpecificTweaks(3);
  }
  
  routeFXLoop(source) {
    // Route FX Loop based on settings
    if (this.fxLoop && this.fxParallel) {
      // Parallel FX Loop
      source.connect(this.fxDryTap);
      source.connect(this.fxSendTrim);
      this.fxSendTrim.connect(this.fxSend);
      this.fxReturn.connect(this.fxReturnTrim);
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnTrim.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else if (this.fxLoop) {
      // Series FX Loop
      source.connect(this.fxSend);
      this.fxReturn.connect(this.powerSag || this.powerAmp);
    } else {
      // No FX Loop
      source.connect(this.powerSag || this.powerAmp);
    }
    
    // Continue to power section with sag
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.channelMaster[this.activeChannel]);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
      this.excursionFilter.disconnect();
      this.preEQ.disconnect();
      this.brightFilter.disconnect();
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
      this.ch2LeadBump.disconnect();
      this.nfbTilt.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.fxSendTrim.disconnect();
      this.fxReturnTrim.disconnect();
      this.fxMix.disconnect();
      this.fxDryTap.disconnect();
      this.sagComp.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.channelMaster[1].disconnect();
      this.channelMaster[2].disconnect();
      this.channelMaster[3].disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  setPreEQ(mode) {
    this.preEQMode = mode;
    const now = this.audioContext.currentTime;
    if (mode === 'B1') {
      // Brighter/Tight
      this.preEQ.frequency.setTargetAtTime(900, now, 0.01);
      this.preEQ.gain.setTargetAtTime(3, now, 0.01);
    } else if (mode === 'B2') {
      // Fuller/More Bass
      this.preEQ.frequency.setTargetAtTime(600, now, 0.01);
      this.preEQ.gain.setTargetAtTime(-2, now, 0.01);
    } else {
      // Neutral
      this.preEQ.gain.setTargetAtTime(0, now, 0.01);
    }
  }
  
  _rerouteActive() {
    // Re-route the active channel (used when FX loop settings change)
    if (this.activeChannel === 1) {
      this.setupChannel1();
    } else if (this.activeChannel === 2) {
      this.setupChannel2();
    } else {
      this.setupChannel3();
    }
  }
  
  _applySnap(ch) {
    // Apply stored snapshot settings for a channel
    const s = this.snap[ch];
    const t = this.audioContext.currentTime;
    
    // Apply channel master
    this.channelMaster[ch].gain.setTargetAtTime(s.master / 100, t, 0.01);
    
    // Apply EQ
    this.bass.gain.setTargetAtTime((s.bass - 50) / 10, t, 0.01);
    this.middle.gain.setTargetAtTime((s.middle - 50) / 10, t, 0.01);
    this.treble.gain.setTargetAtTime((s.treble - 50) / 10, t, 0.01);
    this.presence.gain.setTargetAtTime((s.presence - 50) / 10, t, 0.01);
    this.depth.gain.setTargetAtTime((s.depth - 50) / 10, t, 0.01);
    
    // Apply channel gain
    const channelNode = ch === 1 ? this.channel1 : ch === 2 ? this.channel2 : this.channel3;
    channelNode.gain.setTargetAtTime(s.gain / 100, t, 0.01);
  }
  
  _applyChannelSpecificTweaks(ch) {
    // Apply channel-specific tone characteristics
    const now = this.audioContext.currentTime;
    
    if (ch === 1) {
      // Ch1: Clean/Crunch - crisp highs when gain is low
      const ch1Gain = this.params.ch1_gain || 40;
      if (ch1Gain < 35) {
        this.treble.frequency.setTargetAtTime(3400, now, 0.01);
        this.middle.gain.setTargetAtTime(this.middle.gain.value - 0.1, now, 0.01);
      } else {
        this.treble.frequency.setTargetAtTime(3000, now, 0.01);
      }
      // Disable ch2 lead bump
      this.ch2LeadBump.gain.setTargetAtTime(0, now, 0.01);
    } else if (ch === 2) {
      // Ch2: Lead - vocal mid bump
      this.ch2LeadBump.gain.setTargetAtTime(1.5, now, 0.01);
      this.treble.frequency.setTargetAtTime(3000, now, 0.01);
    } else if (ch === 3) {
      // Ch3: Ultra - tight by default
      this.excursionPos = 'T';
      this.setExcursion('T');
      
      // Extra gain when ch3_gain > 80
      const ch3Gain = this.params.ch3_gain || 85;
      if (ch3Gain > 80) {
        this.preamp3.gain.setTargetAtTime(this.preamp3.gain.value * 1.1, now, 0.01);
      }
      
      // Disable ch2 lead bump
      this.ch2LeadBump.gain.setTargetAtTime(0, now, 0.01);
      this.treble.frequency.setTargetAtTime(3000, now, 0.01);
    }
  }
  
  setExcursion(value) {
    // Set excursion (bass response) T/M/L
    this.excursionPos = value;
    const now = this.audioContext.currentTime;
    let f = 70, g = 0;
    
    if (value === 'T') {
      // Tight
      f = 110;
      g = 1;
    } else if (value === 'L') {
      // Loose
      f = 60;
      g = 4;
    }
    // else 'M' (Medium) - default values
    
    this.excursionFilter.frequency.setTargetAtTime(f, now, 0.01);
    this.excursionFilter.gain.setTargetAtTime(g, now, 0.01);
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
  
  recreateCabinet() {
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
    try { this.preCabinet.disconnect(); } catch (e) {}
    
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SWITCHING
      // ============================================
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else if (value === 2) {
          this.setupChannel2();
        } else {
          this.setupChannel3();
        }
        break;
        
      // ============================================
      // GAIN PER CHANNEL
      // ============================================
      case 'ch1_gain':
        this.channel1.gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[1].gain = value;
        if (this.activeChannel === 1) {
          this._applyChannelSpecificTweaks(1);
        }
        break;
      case 'ch2_gain':
      case 'gain':
        this.channel2.gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[2].gain = value;
        break;
      case 'ch3_gain':
        this.channel3.gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[3].gain = value;
        if (this.activeChannel === 3) {
          this._applyChannelSpecificTweaks(3);
        }
        break;
        
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.snap[this.activeChannel].bass = value;
        break;
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.snap[this.activeChannel].middle = value;
        break;
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.snap[this.activeChannel].treble = value;
        break;
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.snap[this.activeChannel].presence = value;
        break;
      case 'depth':
        this.depth.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.snap[this.activeChannel].depth = value;
        break;
        
      // ============================================
      // NEW SWITCHES & FEATURES
      // ============================================
      case 'pre_eq':
        this.setPreEQ(value);
        break;
        
      case 'bright':
        this.bright = value; // 0, 1, 2
        const brightGain = value === 0 ? 0 : (value === 1 ? 3 : 6);
        this.brightFilter.gain.setTargetAtTime(brightGain, now, 0.01);
        break;
        
      case 'gain_switch':
        this.gainSwitch = value; // 'H' | 'L'
        const preamp1Gain = value === 'H' ? 6 : 3.5;
        this.preamp1.gain.setTargetAtTime(preamp1Gain, now, 0.01);
        // Also adjust preamp2 slightly
        if (value === 'H') {
          this.preamp2.gain.setTargetAtTime(this.preamp2.gain.value * 1.1, now, 0.01);
        }
        break;
        
      case 'structure':
        this.structure = value; // 'Old' | 'New'
        // Old = warmer, less NFB; New = brighter, more attack
        this.nfbTilt.gain.setTargetAtTime(value === 'Old' ? -1.5 : 1.5, now, 0.05);
        this.powerAmp.gain.setTargetAtTime(value === 'Old' ? 0.95 : 1.05, now, 0.05);
        break;
        
      case 'variac':
        this.variac = !!value;
        this.sagComp.threshold.setTargetAtTime(this.variac ? -28 : -22, now, 0.01);
        this.powerAmp.gain.setTargetAtTime(this.variac ? 0.85 : 1.0, now, 0.02);
        break;
        
      case 'excursion':
        this.setExcursion(value); // 'T' | 'M' | 'L'
        break;
        
      // ============================================
      // BOOST PER CHANNEL
      // ============================================
      case 'boost1':
      case 'boost2':
      case 'boost3': {
        const ch = parameter === 'boost1' ? 1 : parameter === 'boost2' ? 2 : 3;
        this.boost[ch] = !!value;
        const boostMult = this.boost[ch] ? 1.15 : 1.0;
        this.preamp2.gain.setTargetAtTime(1.8 * boostMult, now, 0.01);
        break;
      }
        
      // ============================================
      // CHANNEL MASTERS
      // ============================================
      case 'ch1_master':
        this.channelMaster[1].gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[1].master = value;
        break;
      case 'ch2_master':
        this.channelMaster[2].gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[2].master = value;
        break;
      case 'ch3_master':
        this.channelMaster[3].gain.setTargetAtTime(value / 100, now, 0.01);
        this.snap[3].master = value;
        break;
        
      // ============================================
      // FX LOOP
      // ============================================
      case 'fx_loop':
        this.fxLoop = !!value;
        this._rerouteActive();
        break;
      case 'fx_parallel':
        this.fxParallel = !!value;
        this._rerouteActive();
        break;
      case 'fx_mix':
        this.fxMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'fx_send':
        this.fxSendTrim.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'fx_return':
        this.fxReturnTrim.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      // ============================================
      // CABINET & MICROFONE
      // ============================================
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
      case 'cabinet_type':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
      case 'mic_position':
        this.micPosition = value;
        this.recreateCabinet();
        break;
        
      // ============================================
      // MASTER
      // ============================================
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
    this.preEQ.disconnect();
    this.brightFilter.disconnect();
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
    this.ch2LeadBump.disconnect();
    this.nfbTilt.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.fxSendTrim.disconnect();
    this.fxReturnTrim.disconnect();
    this.fxMix.disconnect();
    this.fxDryTap.disconnect();
    this.sagComp.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.channelMaster[1].disconnect();
    this.channelMaster[2].disconnect();
    this.channelMaster[3].disconnect();
    this.master.disconnect();
  }
}

export default BognerEcstasyAmp;

