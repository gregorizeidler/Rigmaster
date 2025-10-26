import BaseAmp from './BaseAmp.js';

class Peavey5150Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Peavey 5150', 'peavey_5150');
    
    // PEAVEY 5150 (6505)
    // THE metal amp - Eddie Van Halen signature
    
    // ============================================
    // FRONT PANEL - RHYTHM CHANNEL
    // ============================================
    this.rhythmPreGain = audioContext.createGain();
    this.rhythmPostGain = audioContext.createGain();
    this.rhythmLow = audioContext.createBiquadFilter();
    this.rhythmMid = audioContext.createBiquadFilter();
    this.rhythmHigh = audioContext.createBiquadFilter();
    
    // ============================================
    // FRONT PANEL - LEAD CHANNEL
    // ============================================
    this.leadPreGain = audioContext.createGain();
    this.leadPostGain = audioContext.createGain();
    this.leadLow = audioContext.createBiquadFilter();
    this.leadMid = audioContext.createBiquadFilter();
    this.leadHigh = audioContext.createBiquadFilter();
    
    // 5 GAIN STAGES (cascading)
    this.gain1 = audioContext.createWaveShaper();
    this.gain2 = audioContext.createWaveShaper();
    this.gain3 = audioContext.createWaveShaper();
    this.gain4 = audioContext.createWaveShaper();
    this.gain5 = audioContext.createWaveShaper();
    
    this.gain1.curve = this.makeGainStageCurve();
    this.gain2.curve = this.makeGainStageCurve();
    this.gain3.curve = this.makeGainStageCurve();
    this.gain4.curve = this.makeGainStageCurve();
    this.gain5.curve = this.makeGainStageCurve();
    
    this.gain1.oversample = '4x';
    this.gain2.oversample = '4x';
    this.gain3.oversample = '4x';
    this.gain4.oversample = '4x';
    this.gain5.oversample = '4x';
    
    // GLOBAL CONTROLS
    this.resonance = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    this.master = audioContext.createGain();
    
    // POWER AMP (6L6 x 4 tubes)
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // CRUNCH SWITCH (Rhythm channel boost)
    this.crunchBoost = audioContext.createGain();
    this.crunchEnabled = false;
    
    // BRIGHT SWITCH (High-end boost)
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 4000;
    this.brightFilter.gain.value = 0; // Off by default
    this.brightEnabled = false;
    
    // EFFECTS LOOP (Series)
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxBypass = audioContext.createGain();
    this.fxMix = audioContext.createGain();
    
    // SPEAKER IMPEDANCE (4/8/16 ohm)
    this.speakerImpedance = 16; // ohms
    this.impedanceGain = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'lead'; // 'rhythm' or 'lead'
    
    // ============================================
    // RHYTHM CHANNEL SATURATION
    // ============================================
    this.rhythmSaturation = audioContext.createWaveShaper();
    this.rhythmSaturation.curve = this.makeRhythmCurve();
    this.rhythmSaturation.oversample = '4x';
    
    // ============================================
    // ROUTING - LEAD CHANNEL (DEFAULT)
    // ============================================
    this.setupLeadChannel();
    
    this.params = {
      channel: 1, // 0=rhythm, 1=lead
      
      // Lead channel
      lead_pre_gain: 80,
      lead_post_gain: 70,
      lead_low: 75,
      lead_mid: 40, // Scooped
      lead_high: 70,
      
      // Rhythm channel
      rhythm_pre_gain: 50,
      rhythm_post_gain: 50,
      rhythm_low: 60,
      rhythm_mid: 50,
      rhythm_high: 60,
      
      // Global
      resonance: 60,
      presence: 65,
      master: 50,
      
      // Back panel
      crunch: false,
      bright: false,
      fx_loop: false,
      speaker_impedance: 16 // 4, 8, or 16 ohms
    };
    
    this.applyInitialSettings();
  }
  
  setupLeadChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // Lead channel - 5 cascading gain stages
    this.input.connect(this.brightFilter); // Bright switch first
    this.brightFilter.connect(this.leadPreGain);
    this.leadPreGain.connect(this.gain1);
    this.gain1.connect(this.gain2);
    this.gain2.connect(this.gain3);
    this.gain3.connect(this.gain4);
    this.gain4.connect(this.gain5);
    
    // EQ
    this.gain5.connect(this.leadLow);
    this.leadLow.connect(this.leadMid);
    this.leadMid.connect(this.leadHigh);
    
    // Post gain
    this.leadHigh.connect(this.leadPostGain);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.leadPostGain.connect(this.fxSend); // Send to external FX
      this.fxReturn.connect(this.resonance); // Return from external FX
    } else {
      this.leadPostGain.connect(this.resonance);
    }
    
    this.resonance.connect(this.presence);
    this.presence.connect(this.master);
    
    // Power amp
    this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // Speaker impedance
    this.powerSaturation.connect(this.impedanceGain);
    this.impedanceGain.connect(this.output);
    
    this.activeChannel = 'lead';
  }
  
  setupRhythmChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // Rhythm channel - fewer gain stages, more clean headroom
    this.input.connect(this.brightFilter); // Bright switch first
    this.brightFilter.connect(this.rhythmPreGain);
    
    // Crunch switch adds gain stage
    if (this.crunchEnabled) {
      this.rhythmPreGain.connect(this.crunchBoost);
      this.crunchBoost.connect(this.gain1);
    } else {
      this.rhythmPreGain.connect(this.gain1);
    }
    
    this.gain1.connect(this.gain2);
    this.gain2.connect(this.rhythmSaturation); // Rhythm saturation curve
    
    // EQ
    this.rhythmSaturation.connect(this.rhythmLow);
    this.rhythmLow.connect(this.rhythmMid);
    this.rhythmMid.connect(this.rhythmHigh);
    
    // Post gain
    this.rhythmHigh.connect(this.rhythmPostGain);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.rhythmPostGain.connect(this.fxSend);
      this.fxReturn.connect(this.resonance);
    } else {
      this.rhythmPostGain.connect(this.resonance);
    }
    
    this.resonance.connect(this.presence);
    this.presence.connect(this.master);
    
    // Power amp
    this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // Speaker impedance
    this.powerSaturation.connect(this.impedanceGain);
    this.impedanceGain.connect(this.output);
    
    this.activeChannel = 'rhythm';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.brightFilter.disconnect();
      this.leadPreGain.disconnect();
      this.rhythmPreGain.disconnect();
      this.crunchBoost.disconnect();
      this.gain1.disconnect();
      this.gain2.disconnect();
      this.gain3.disconnect();
      this.gain4.disconnect();
      this.gain5.disconnect();
      this.rhythmSaturation.disconnect();
      this.leadLow.disconnect();
      this.leadMid.disconnect();
      this.leadHigh.disconnect();
      this.rhythmLow.disconnect();
      this.rhythmMid.disconnect();
      this.rhythmHigh.disconnect();
      this.leadPostGain.disconnect();
      this.rhythmPostGain.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.resonance.disconnect();
      this.presence.disconnect();
      this.master.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.impedanceGain.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // LEAD CHANNEL - EXTREME GAIN
    // ============================================
    this.leadPreGain.gain.value = 20;
    this.leadPostGain.gain.value = 1.5;
    
    // V-SHAPE EQ (scooped mids)
    this.leadLow.type = 'lowshelf';
    this.leadLow.frequency.value = 150;
    this.leadLow.gain.value = 8;
    
    this.leadMid.type = 'peaking';
    this.leadMid.frequency.value = 750;
    this.leadMid.Q.value = 2;
    this.leadMid.gain.value = -5; // Mid scoop
    
    this.leadHigh.type = 'highshelf';
    this.leadHigh.frequency.value = 3000;
    this.leadHigh.gain.value = 6;
    
    // ============================================
    // RHYTHM CHANNEL - MORE CLEAN HEADROOM
    // ============================================
    this.rhythmPreGain.gain.value = 5;
    this.rhythmPostGain.gain.value = 1.0;
    
    // Flatter EQ response
    this.rhythmLow.type = 'lowshelf';
    this.rhythmLow.frequency.value = 150;
    this.rhythmLow.gain.value = 3;
    
    this.rhythmMid.type = 'peaking';
    this.rhythmMid.frequency.value = 750;
    this.rhythmMid.Q.value = 1;
    this.rhythmMid.gain.value = 0; // Flat mids
    
    this.rhythmHigh.type = 'highshelf';
    this.rhythmHigh.frequency.value = 3000;
    this.rhythmHigh.gain.value = 2;
    
    // ============================================
    // CRUNCH BOOST (Rhythm channel only)
    // ============================================
    this.crunchBoost.gain.value = 2.5;
    
    // ============================================
    // BRIGHT SWITCH (High-end boost)
    // ============================================
    this.brightFilter.gain.value = 0; // Off by default
    
    // ============================================
    // RESONANCE & PRESENCE
    // ============================================
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 100;
    this.resonance.gain.value = 3;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 4;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master.gain.value = 0.5;
    
    // ============================================
    // POWER AMP (4x 6L6 tubes)
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // SPEAKER IMPEDANCE
    // ============================================
    this.updateImpedance(16);
  }
  
  makeGainStageCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Aggressive gain stage
      let y = Math.tanh(x * 12);
      
      // Tight bass
      if (x < 0) {
        y *= 1.05;
      }
      
      curve[i] = y;
    }
    return curve;
  }
  
  makeRhythmCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // RHYTHM CHANNEL - cleaner, more open
      let y = Math.tanh(x * 6); // Less gain than lead
      
      // Flatter frequency response (less mid scoop)
      if (Math.abs(x) > 0.3 && Math.abs(x) < 0.6) {
        y *= 0.95; // Mild scoop
      }
      
      // Slight asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 6L6 power tubes - tight & aggressive
      let y = Math.tanh(x * 1.8);
      
      // Mid scoop
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.5) {
        y *= 0.85;
      }
      
      // Asymmetry
      if (x > 0) y *= 1.25;
      
      // High harmonics
      y += 0.1 * Math.tanh(x * 24);
      
      curve[i] = y * 0.7;
    }
    return curve;
  }
  
  updateImpedance(ohms) {
    // Speaker impedance affects damping and frequency response
    // Lower impedance = more damping, tighter bass
    // Higher impedance = less damping, looser bass
    
    this.speakerImpedance = ohms;
    
    switch (ohms) {
      case 4:
        this.impedanceGain.gain.value = 1.15; // Louder, tighter
        break;
      case 8:
        this.impedanceGain.gain.value = 1.0; // Neutral
        break;
      case 16:
        this.impedanceGain.gain.value = 0.9; // Quieter, looser
        break;
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        if (value === 0) {
          this.setupRhythmChannel();
        } else {
          this.setupLeadChannel();
        }
        break;
      
      // ============================================
      // LEAD CHANNEL CONTROLS
      // ============================================
      case 'lead_pre_gain':
      case 'gain':
        this.leadPreGain.gain.setTargetAtTime(1 + (value / 5), now, 0.01);
        break;
      case 'lead_post_gain':
        this.leadPostGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'lead_low':
      case 'bass':
        this.leadLow.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'lead_mid':
      case 'mid':
        this.leadMid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'lead_high':
      case 'treble':
        this.leadHigh.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      // ============================================
      // RHYTHM CHANNEL CONTROLS
      // ============================================
      case 'rhythm_pre_gain':
        this.rhythmPreGain.gain.setTargetAtTime(1 + (value / 10), now, 0.01);
        break;
      case 'rhythm_post_gain':
        this.rhythmPostGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'rhythm_low':
        this.rhythmLow.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'rhythm_mid':
        this.rhythmMid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'rhythm_high':
        this.rhythmHigh.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'resonance':
        this.resonance.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // BACK PANEL CONTROLS
      // ============================================
      case 'crunch':
        this.crunchEnabled = value;
        if (this.activeChannel === 'rhythm') {
          this.setupRhythmChannel(); // Re-route
        }
        break;
      
      case 'bright':
        this.brightEnabled = value;
        this.brightFilter.gain.setTargetAtTime(value ? 8 : 0, now, 0.01);
        break;
      
      case 'fx_loop':
        this.params.fx_loop = value;
        // Re-route current channel
        if (this.activeChannel === 'lead') {
          this.setupLeadChannel();
        } else {
          this.setupRhythmChannel();
        }
        break;
      
      case 'speaker_impedance':
        this.updateImpedance(value);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.leadPreGain.disconnect();
    this.leadPostGain.disconnect();
    this.gain1.disconnect();
    this.gain2.disconnect();
    this.gain3.disconnect();
    this.gain4.disconnect();
    this.gain5.disconnect();
    this.leadLow.disconnect();
    this.leadMid.disconnect();
    this.leadHigh.disconnect();
    this.resonance.disconnect();
    this.presence.disconnect();
    this.master.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
  }
}

export default Peavey5150Amp;

