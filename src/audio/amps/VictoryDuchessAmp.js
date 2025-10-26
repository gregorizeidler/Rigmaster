import BaseAmp from './BaseAmp.js';

class VictoryDuchessAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Victory Duchess', 'victory_duchess');
    
    // VICTORY DUCHESS (Handwired British boutique)
    // Made in UK by Martin Kidd
    // Used by Rabea Massaad, Martin Miller
    // Known for: Vintage British warmth + modern clarity
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.channel1 = audioContext.createGain(); // Low Gain
    this.channel2 = audioContext.createGain(); // High Gain
    
    // Active channel
    this.activeChannel = 2; // 1 or 2
    
    // ============================================
    // PREAMP (Handwired cascading stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeVictoryPreampCurve();
    this.saturation2.curve = this.makeVictoryPreampCurve();
    this.saturation3.curve = this.makeVictoryPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // TONE STACK (British-style)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 110;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.4;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2700;
    this.treble.gain.value = 0;
    
    // ============================================
    // VICTORY "PRESENCE" & "RESONANCE"
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.resonance = audioContext.createBiquadFilter();
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4800;
    this.presence.gain.value = 0;
    
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 85;
    this.resonance.gain.value = 0;
    
    // ============================================
    // VICTORY "VINTAGE/MODERN" VOICING SWITCH
    // ============================================
    this.voicingFilter = audioContext.createBiquadFilter();
    this.voicingFilter.type = 'peaking';
    this.voicingFilter.frequency.value = 650;
    this.voicingFilter.Q.value = 1.8;
    this.voicingFilter.gain.value = -3; // Modern (scooped)
    this.voicing = 'modern'; // 'vintage' or 'modern'
    
    // ============================================
    // POWER AMP (2x KT77 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // British compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -16;
    this.powerComp.knee.value = 14;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.007;
    this.powerComp.release.value = 0.11;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 2 (DEFAULT)
    // ============================================
    this.setupChannel2();
    
    this.params = {
      channel: 2, // 1=low gain, 2=high gain
      
      // Gain/Volume
      gain: 65,
      channel_volume: 70,
      
      // Tone stack
      bass: 55,
      middle: 60,
      treble: 65,
      presence: 60,
      resonance: 50,
      
      // Voicing
      voicing: 'modern', // 'vintage' or 'modern'
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - LOW GAIN (2 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel1);
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.voicingFilter);
    this.voicingFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // CHANNEL 2 - HIGH GAIN (3 cascading stages)
    this.disconnectAll();
    
    this.input.connect(this.channel2);
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.voicingFilter);
    this.voicingFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
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
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.voicingFilter.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.resonance.disconnect();
      this.channelVolume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 7;
    this.preamp2.gain.value = 2.1;
    this.preamp3.gain.value = 1.6;
    this.channel1.gain.value = 0.7;
    this.channel2.gain.value = 1.0;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.08;
    this.master.gain.value = 0.7;
  }
  
  makeVictoryPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // VICTORY "VINTAGE BRITISH + MODERN CLARITY"
      let y = Math.tanh(x * 5.2);
      
      // SMOOTH COMPRESSION
      if (Math.abs(y) > 0.55) {
        const compression = 1 - (Math.abs(y) - 0.55) * 0.28;
        y *= compression;
      }
      
      // WARMTH (vintage)
      y += 0.09 * Math.sin(x * Math.PI * 3);
      
      // CLARITY (modern)
      y += 0.1 * Math.tanh(x * 9);
      
      // BRITISH CRUNCH
      y += 0.08 * Math.tanh(x * 6);
      
      // Slight asymmetry
      if (x > 0) y *= 1.09;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // KT77 POWER TUBES (EL34 family)
      let y = Math.tanh(x * 1.58);
      
      // KT77 COMPRESSION
      if (Math.abs(y) > 0.62) {
        const excess = Math.abs(y) - 0.62;
        y = Math.sign(y) * (0.62 + excess * 0.53);
      }
      
      // BRITISH WARMTH
      y += 0.07 * Math.sin(x * Math.PI * 3);
      y += 0.05 * Math.sin(x * Math.PI * 5);
      
      // KT77 PUNCH
      y += 0.09 * Math.tanh(x * 3.5);
      
      // KT77 AGGRESSION
      y += 0.08 * Math.tanh(x * 7);
      
      // Asymmetry
      if (x > 0) y *= 1.11;
      
      curve[i] = y * 0.89;
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
        this.preamp1.gain.setTargetAtTime(1 + (value / 11), now, 0.01);
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
      
      case 'resonance':
        this.resonance.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'voicing':
        this.voicing = value;
        if (value === 'vintage') {
          // Flat mids
          this.voicingFilter.gain.setTargetAtTime(0, now, 0.01);
        } else {
          // Modern (scooped mids)
          this.voicingFilter.gain.setTargetAtTime(-3, now, 0.01);
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
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.voicingFilter.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.resonance.disconnect();
    this.channelVolume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default VictoryDuchessAmp;

