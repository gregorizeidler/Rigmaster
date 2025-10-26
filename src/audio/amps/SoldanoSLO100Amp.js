import BaseAmp from './BaseAmp.js';

class SoldanoSLO100Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Soldano SLO-100', 'soldano_slo100');
    
    // SOLDANO SLO-100 (Super Lead Overdrive)
    // THE original modern high-gain - Michael Soldano's masterpiece
    // Used by Eric Clapton, Mark Tremonti, Gary Moore
    // Influenced every high-gain amp that came after
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.normalChannel = audioContext.createGain();
    this.overdriveChannel = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'overdrive'; // 'normal' or 'overdrive'
    
    // ============================================
    // PREAMP (Cascading gain stages)
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
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 700;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // SOLDANO "DEPTH" CONTROL
    // ============================================
    this.depth = audioContext.createBiquadFilter();
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 100;
    this.depth.gain.value = 0;
    
    // ============================================
    // SOLDANO CHARACTERISTIC "SMOOTH" HIGH GAIN
    // ============================================
    this.smoothFilter = audioContext.createBiquadFilter();
    this.smoothFilter.type = 'peaking';
    this.smoothFilter.frequency.value = 2000;
    this.smoothFilter.Q.value = 1.5;
    this.smoothFilter.gain.value = 3; // Adds upper-mid presence
    
    // ============================================
    // POWER AMP (4x 5881 or 6L6 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -12;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 4;
    this.powerComp.attack.value = 0.006;
    this.powerComp.release.value = 0.1;
    
    // ============================================
    // MASTER VOLUMES (Preamp & Master)
    // ============================================
    this.preampMaster = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - OVERDRIVE CHANNEL (DEFAULT)
    // ============================================
    this.setupOverdriveChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=overdrive
      
      // Gain/Volume
      preamp_gain: 75,
      master_gain: 70,
      
      // Tone stack
      bass: 60,
      middle: 55,
      treble: 70,
      presence: 65,
      depth: 55,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupNormalChannel() {
    this.disconnectAll();
    
    // NORMAL CHANNEL - 2 gain stages
    this.input.connect(this.normalChannel);
    this.normalChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.smoothFilter);
    this.smoothFilter.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.preampMaster);
    this.preampMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  setupOverdriveChannel() {
    this.disconnectAll();
    
    // OVERDRIVE CHANNEL - 4 cascading gain stages
    this.input.connect(this.overdriveChannel);
    this.overdriveChannel.connect(this.preamp1);
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
    this.treble.connect(this.smoothFilter);
    this.smoothFilter.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.preampMaster);
    this.preampMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'overdrive';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.normalChannel.disconnect();
      this.overdriveChannel.disconnect();
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
      this.smoothFilter.disconnect();
      this.presence.disconnect();
      this.depth.disconnect();
      this.preampMaster.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 10;
    this.preamp2.gain.value = 2;
    this.preamp3.gain.value = 1.6;
    this.preamp4.gain.value = 1.4;
    this.normalChannel.gain.value = 0.6;
    this.overdriveChannel.gain.value = 1.0;
    this.preampMaster.gain.value = 0.75;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SOLDANO "SMOOTH" HIGH GAIN
      let y = Math.tanh(x * 7);
      
      // SMOOTH COMPRESSION (Soldano signature)
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.3;
        y *= compression;
      }
      
      // SINGING SUSTAIN (not harsh)
      y += 0.12 * Math.tanh(x * 10);
      
      // Upper-mid presence
      y += 0.08 * Math.tanh(x * 6);
      
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
      
      // 4x 5881 POWER TUBES (6L6 family)
      let y = Math.tanh(x * 1.6);
      
      // 5881 compression (tight but musical)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.5);
      }
      
      // SOLDANO DEPTH (low-end punch)
      y += 0.08 * Math.tanh(x * 3);
      
      // Smooth highs
      y += 0.06 * Math.sin(x * Math.PI * 6);
      
      if (x > 0) y *= 1.12;
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 0) {
          this.setupNormalChannel();
        } else {
          this.setupOverdriveChannel();
        }
        break;
      
      case 'preamp_gain':
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 8), now, 0.01);
        break;
      
      case 'master_gain':
        this.preampMaster.gain.setTargetAtTime(value / 100, now, 0.01);
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
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.normalChannel.disconnect();
    this.overdriveChannel.disconnect();
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
    this.smoothFilter.disconnect();
    this.presence.disconnect();
    this.depth.disconnect();
    this.preampMaster.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default SoldanoSLO100Amp;

