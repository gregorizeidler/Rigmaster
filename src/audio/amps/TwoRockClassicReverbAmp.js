import BaseAmp from './BaseAmp.js';

class TwoRockClassicReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Two-Rock Classic Reverb', 'tworock_classic');
    
    // TWO-ROCK CLASSIC REVERB
    // THE boutique standard - Dumble-inspired
    // Used by John Mayer, Eric Johnson
    // Known for: Crystal-clear cleans, touch sensitivity, musical overdrive
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.leadChannel = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'clean'; // 'clean' or 'lead'
    
    // ============================================
    // PREAMP (Touch-sensitive cascading stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages (very musical)
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeTwoRockPreampCurve();
    this.saturation2.curve = this.makeTwoRockPreampCurve();
    this.saturation3.curve = this.makeTwoRockPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // TONE STACK (Dumble-style)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.2;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    // ============================================
    // TWO-ROCK "SPARKLE" (High-end detail)
    // ============================================
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 4000;
    this.sparkle.Q.value = 2.0;
    this.sparkle.gain.value = 3;
    
    // ============================================
    // PRESENCE & DEPTH
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.depth = audioContext.createBiquadFilter();
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 5000;
    this.presence.gain.value = 0;
    
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 80;
    this.depth.gain.value = 0;
    
    // ============================================
    // BUILT-IN SPRING REVERB (Accutronics)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    this.reverbDelay1 = audioContext.createDelay();
    this.reverbDelay2 = audioContext.createDelay();
    this.reverbDelay3 = audioContext.createDelay();
    this.reverbDelay4 = audioContext.createDelay();
    this.reverbFeedback = audioContext.createGain();
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbHPF = audioContext.createBiquadFilter();
    
    this.reverbDelay1.delayTime.value = 0.023;
    this.reverbDelay2.delayTime.value = 0.031;
    this.reverbDelay3.delayTime.value = 0.037;
    this.reverbDelay4.delayTime.value = 0.043;
    this.reverbFeedback.gain.value = 0.5;
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 4000;
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 200;
    
    // Reverb routing (4-spring tank)
    this.reverbSend.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbDelay1);
    this.reverbDelay1.connect(this.reverbDelay2);
    this.reverbDelay2.connect(this.reverbDelay3);
    this.reverbDelay3.connect(this.reverbDelay4);
    this.reverbDelay4.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbDelay1);
    this.reverbLPF.connect(this.reverbReturn);
    
    // ============================================
    // POWER AMP (2x 6L6 or 2x EL34)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Touch-sensitive compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -20;
    this.powerComp.knee.value = 18;
    this.powerComp.ratio.value = 2.5;
    this.powerComp.attack.value = 0.01;
    this.powerComp.release.value = 0.15;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // Output mixer (dry + reverb)
    this.outputMixer = audioContext.createGain();
    
    // ============================================
    // ROUTING - CLEAN CHANNEL (DEFAULT)
    // ============================================
    this.setupCleanChannel();
    
    this.params = {
      channel: 0, // 0=clean, 1=lead
      
      // Gain/Volume
      gain: 40,
      channel_volume: 70,
      
      // Tone stack
      bass: 50,
      middle: 55,
      treble: 60,
      presence: 50,
      depth: 50,
      
      // Reverb
      reverb: 25,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupCleanChannel() {
    // CLEAN CHANNEL - 2 gain stages (crystal clear)
    this.disconnectAll();
    
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.sparkle);
    this.sparkle.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  setupLeadChannel() {
    // LEAD CHANNEL - 3 cascading gain stages
    this.disconnectAll();
    
    this.input.connect(this.leadChannel);
    this.leadChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.sparkle);
    this.sparkle.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'lead';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.leadChannel.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.presence.disconnect();
      this.depth.disconnect();
      this.channelVolume.disconnect();
      this.reverbSend.disconnect();
      this.reverbReturn.disconnect();
      this.outputMixer.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 3;
    this.preamp2.gain.value = 1.5;
    this.preamp3.gain.value = 1.3;
    this.cleanChannel.gain.value = 0.8;
    this.leadChannel.gain.value = 1.0;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.05;
    this.master.gain.value = 0.85;
    this.outputMixer.gain.value = 1.0;
    this.reverbSend.gain.value = 0.25;
    this.reverbReturn.gain.value = 0.6;
  }
  
  makeTwoRockPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // TWO-ROCK "TOUCH SENSITIVITY"
      let y = Math.tanh(x * 3.5);
      
      // VERY GRADUAL COMPRESSION (never harsh)
      if (Math.abs(y) > 0.6) {
        const compression = 1 - (Math.abs(y) - 0.6) * 0.15;
        y *= compression;
      }
      
      // CLARITY (every note distinct)
      y += 0.08 * Math.tanh(x * 8);
      
      // HARMONIC RICHNESS
      y += 0.05 * Math.sin(x * Math.PI * 5);
      y += 0.03 * Math.sin(x * Math.PI * 7);
      
      // Slight asymmetry
      if (x > 0) y *= 1.05;
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 2x 6L6 POWER TUBES (Class A/B)
      let y = Math.tanh(x * 1.4);
      
      // 6L6 HEADROOM (very open, dynamic)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.6);
      }
      
      // WARMTH
      y += 0.06 * Math.sin(x * Math.PI * 3);
      y += 0.04 * Math.sin(x * Math.PI * 5);
      
      // SPARKLE (Two-Rock signature)
      y += 0.08 * Math.tanh(x * 12);
      
      // Slight asymmetry
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.92;
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
          this.setupLeadChannel();
        }
        break;
      
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 15), now, 0.01);
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
      
      case 'depth':
        this.depth.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'reverb':
        this.reverbSend.gain.setTargetAtTime(value / 100, now, 0.01);
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
    this.leadChannel.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.sparkle.disconnect();
    this.presence.disconnect();
    this.depth.disconnect();
    this.channelVolume.disconnect();
    this.reverbSend.disconnect();
    this.reverbReturn.disconnect();
    this.reverbDelay1.disconnect();
    this.reverbDelay2.disconnect();
    this.reverbDelay3.disconnect();
    this.reverbDelay4.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbLPF.disconnect();
    this.reverbHPF.disconnect();
    this.outputMixer.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default TwoRockClassicReverbAmp;

