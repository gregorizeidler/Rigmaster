import BaseAmp from './BaseAmp.js';

class FenderBassmanAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Bassman', 'fender_bassman');
    
    // FENDER BASSMAN 5F6-A (Tweed era)
    // THE blueprint for Marshall - used by countless blues and rock players
    // Originally designed for bass, but adopted by guitarists for its incredible breakup
    
    // ============================================
    // 4 INPUT JACKS (2 Bright, 2 Normal)
    // ============================================
    this.brightChannel = audioContext.createGain();
    this.normalChannel = audioContext.createGain();
    
    // Bright channel filter
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3000;
    this.brightFilter.gain.value = 4; // Always active on bright channel
    
    // Active channel
    this.activeChannel = 'bright'; // 'bright' or 'normal'
    
    // ============================================
    // PREAMP (12AY7 tubes - lower gain than 12AX7)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    
    // Saturation stages (tweed characteristic - gritty, compressed)
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // ============================================
    // TONE STACK (Bassman tone stack - THE most copied in history)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 0.7;
    this.mid.gain.value = -3; // Slight mid scoop (Bassman signature)
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // Presence control (back panel on some models)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 0;
    
    // ============================================
    // POWER AMP (4x 6L6 tubes - Class AB push-pull)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression (6L6 sag)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -15;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.008;
    this.powerComp.release.value = 0.12;
    
    // ============================================
    // TWEED CHARACTER
    // ============================================
    // Tweed amps have a characteristic mid-range "honk" and gritty breakup
    this.tweedHonk = audioContext.createBiquadFilter();
    this.tweedHonk.type = 'peaking';
    this.tweedHonk.frequency.value = 750; // 750Hz honk
    this.tweedHonk.Q.value = 2;
    this.tweedHonk.gain.value = 4;
    
    // ============================================
    // VOLUME CONTROLS
    // ============================================
    this.volume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - BRIGHT CHANNEL (DEFAULT)
    // ============================================
    this.setupBrightChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=bright
      
      // Volume
      volume: 60,
      
      // Tone stack
      bass: 55,
      mid: 45, // Scooped
      treble: 65,
      presence: 50,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupBrightChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // BRIGHT CHANNEL - High-end emphasis
    this.input.connect(this.brightChannel);
    this.brightChannel.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Tone stack
    this.saturation2.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.tweedHonk);
    this.tweedHonk.connect(this.presence);
    
    // Volume
    this.presence.connect(this.volume);
    
    // Power amp
    this.volume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'bright';
  }
  
  setupNormalChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // NORMAL CHANNEL - Flatter frequency response
    this.input.connect(this.normalChannel);
    this.normalChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Tone stack
    this.saturation2.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.tweedHonk);
    this.tweedHonk.connect(this.presence);
    
    // Volume
    this.presence.connect(this.volume);
    
    // Power amp
    this.volume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.brightChannel.disconnect();
      this.normalChannel.disconnect();
      this.brightFilter.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.tweedHonk.disconnect();
      this.presence.disconnect();
      this.volume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (12AY7 - lower gain than 12AX7)
    // ============================================
    this.preamp1.gain.value = 4; // Moderate gain
    this.preamp2.gain.value = 1.5;
    
    // ============================================
    // CHANNELS
    // ============================================
    this.brightChannel.gain.value = 1.0;
    this.normalChannel.gain.value = 1.0;
    
    // ============================================
    // VOLUME
    // ============================================
    this.volume.gain.value = 0.6;
    
    // ============================================
    // POWER AMP (4x 6L6)
    // ============================================
    this.powerAmp.gain.value = 1.2;
    
    // ============================================
    // MASTER
    // ============================================
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // TWEED CHARACTERISTIC - gritty, compressed, saggy
      let y = Math.tanh(x * 2.5);
      
      // TWEED "GRIT" (early breakup, compressed)
      if (Math.abs(x) > 0.3) {
        y *= 0.92; // Compression starts early
      }
      
      // Mid-range honk @ 750Hz (characteristic tweed bark)
      y += 0.12 * Math.tanh(x * 4);
      
      // Asymmetry (push-pull characteristic)
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x 6L6 POWER TUBES (Class AB push-pull)
      let y = Math.tanh(x * 1.5);
      
      // SAG (power supply compression under load)
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.6); // Soft knee
      }
      
      // 6L6 characteristic (tight bass, warm mids)
      y += 0.08 * Math.tanh(x * 3);
      
      // Slight asymmetry
      if (x > 0) y *= 1.05;
      
      // TWEED COMPRESSION (distinctive sag and bloom)
      y *= 0.92 + (Math.abs(x) * 0.08);
      
      curve[i] = y * 0.88;
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
          this.setupNormalChannel();
        } else {
          this.setupBrightChannel();
        }
        break;
      
      // ============================================
      // VOLUME
      // ============================================
      case 'volume':
      case 'gain':
        this.volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // TONE STACK
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
    
    // Disconnect all nodes
    this.brightChannel.disconnect();
    this.normalChannel.disconnect();
    this.brightFilter.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.tweedHonk.disconnect();
    this.presence.disconnect();
    this.volume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default FenderBassmanAmp;

