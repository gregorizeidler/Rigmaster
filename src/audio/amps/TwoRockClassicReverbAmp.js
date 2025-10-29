import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

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
    
    // Saturation stages (very musical) - Different curves per stage
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeTwoRockPreampCurve({drive: 3.1, asym: 1.02});
    this.saturation2.curve = this.makeTwoRockPreampCurve({drive: 3.6, asym: 1.04});
    this.saturation3.curve = this.makeTwoRockPreampCurve({drive: 4.2, asym: 1.06});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // TONE STACK (Dumble-style)
    // ============================================
    
    // Subtle HPF before tone stack (controls boom with humbuckers)
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 65;
    this.inputHPF.Q.value = 0.707;
    
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
    this.sparkle.gain.value = 1.5; // Reduced from 3 to avoid harshness with single coils
    
    // ============================================
    // BUILT-IN SPRING REVERB (Accutronics)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // Reverb all-pass diffusers (kill the "ping")
    this.revAP1 = audioContext.createBiquadFilter();
    this.revAP2 = audioContext.createBiquadFilter();
    this.revAP1.type = 'allpass';
    this.revAP1.frequency.value = 1200;
    this.revAP2.type = 'allpass';
    this.revAP2.frequency.value = 1800;
    
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
    this.reverbFeedback.gain.value = 0.45; // Default decay
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 3500; // More closed for realistic spring
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 250; // Hold subs
    
    // Reverb routing (4-spring tank with diffusers)
    this.reverbSend.connect(this.reverbHPF);
    this.reverbHPF.connect(this.revAP1);
    this.revAP1.connect(this.revAP2);
    this.revAP2.connect(this.reverbDelay1);
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
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x12_open';
    this.micType = 'condenser';
    this.micPosition = 'center';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // PRESENCE & DEPTH (Post-IR for realistic power shaping)
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
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // Output mixer (dry + reverb)
    this.outputMixer = audioContext.createGain();
    
    // ============================================
    // PARAMS (BEFORE setup calls - critical!)
    // ============================================
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
      reverb_decay: 45, // 0-100
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '2x12_open',
      microphone: 'sm57',
      micPosition: 'edge',
      
      // Boost
      boost: false,
      
      // Master
      master: 70
    };
    
    // ============================================
    // ROUTING - CLEAN CHANNEL (DEFAULT)
    // ============================================
    this.setupCleanChannel();
    this.applyInitialSettings();
    this.recreateCabinet();
  }
  
  setupCleanChannel() {
    // CLEAN CHANNEL - 2 gain stages (crystal clear)
    this.disconnectAll();
    
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.inputHPF);
    this.inputHPF.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.sparkle);
    this.sparkle.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    // Power amp → Cabinet → Presence/Depth → Master
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.master);
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
    this.saturation3.connect(this.inputHPF);
    this.inputHPF.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.sparkle);
    this.sparkle.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    // Power amp → Cabinet → Presence/Depth → Master
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.depth);
    this.depth.connect(this.master);
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
      this.inputHPF.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.channelVolume.disconnect();
      this.reverbSend.disconnect();
      this.reverbReturn.disconnect();
      this.outputMixer.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabIR.disconnect();
      this.presence.disconnect();
      this.depth.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 3;
    this.preamp2.gain.value = 1.5;
    this.preamp3.gain.value = 1.3;
    this.cleanChannel.gain.value = 0.8;
    this.leadChannel.gain.value = 1.0;
    this.channelVolume.gain.value = this.lin2log(0.7);
    this.powerAmp.gain.value = 1.05;
    this.master.gain.value = this.lin2log(0.85);
    this.outputMixer.gain.value = 1.0;
    this.reverbSend.gain.value = 0.25;
    this.reverbReturn.gain.value = 0.6;
  }
  
  /**
   * Linear to logarithmic mapping for musical volume control
   * Maps 0..1 to ~-60dB..0dB
   */
  lin2log(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  /**
   * Create Two-Rock preamp curves with different drive and asymmetry per stage
   */
  makeTwoRockPreampCurve({drive=3.5, asym=1.05} = {}) {
    const N = 44100;
    const c = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      
      // TWO-ROCK "TOUCH SENSITIVITY"
      let y = Math.tanh(x * drive);
      
      // VERY GRADUAL COMPRESSION (never harsh)
      if (Math.abs(y) > 0.6) {
        y *= 1 - (Math.abs(y) - 0.6) * 0.15;
      }
      
      // CLARITY (every note distinct)
      y += 0.08 * Math.tanh(x * 8);
      
      // HARMONIC RICHNESS
      y += 0.05 * Math.sin(x * Math.PI * 5);
      y += 0.03 * Math.sin(x * Math.PI * 7);
      
      // Asymmetry (tube character)
      y *= x > 0 ? asym : 1 / asym;
      
      c[i] = y * 0.9;
    }
    return c;
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
      case 'channel':
        if (value === 0) {
          this.setupCleanChannel();
        } else {
          this.setupLeadChannel();
        }
        break;
      
      case 'gain': {
        // Logarithmic gain mapping for musical response
        const g = this.lin2log(value / 100) * 12;
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.55), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.30), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.20), now, 0.01);
        break;
      }
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
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
      
      case 'reverb': {
        // Control wet/dry mix at return (not just send)
        const wet = value / 100;
        const dry = 1 - wet * 0.6; // Preserve body of dry signal
        this.reverbReturn.gain.setTargetAtTime(wet, now, 0.01);
        this.outputMixer.gain.setTargetAtTime(dry, now, 0.01);
        break;
      }
      
      case 'reverb_decay': {
        // Control feedback for decay length
        const decay = 0.2 + (value / 100) * 0.6; // 0.2..0.8
        this.reverbFeedback.gain.setTargetAtTime(decay, now, 0.1);
        break;
      }
      
      case 'boost': {
        // PAB (Preamp Boost) - attenuates tone stack loss, more mids
        if (value) {
          this.middle.gain.setTargetAtTime(this.middle.gain.value + 2, now, 0.01);
          this.channelVolume.gain.setTargetAtTime(this.channelVolume.gain.value * 1.3, now, 0.01);
        } else {
          // Restore from params
          this.middle.gain.setTargetAtTime((this.params.middle - 50) / 10, now, 0.01);
          this.channelVolume.gain.setTargetAtTime(this.lin2log(this.params.channel_volume / 100), now, 0.01);
        }
        break;
      }
      
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
        this.micPosition = value;
        this.recreateCabinet();
        break;
      
      case 'master': {
        this.master.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        
        // Dynamic power comp threshold (opens up at higher volumes)
        const thr = -22 + (value / 100) * 6; // -22..-16 dB
        this.powerComp.threshold.setTargetAtTime(thr, now, 0.05);
        break;
      }
      
      case 'cabinet':
      case 'microphone':
      case 'micPosition':
        // Cabinet/mic changes would reload IR (simplified here)
        // In production, you'd load different IRs based on these params
        console.log(`Two-Rock: ${parameter} changed to ${value}`);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  /**
   * Load a default synthetic cabinet IR (2×12 Two-Rock style with Jensen/EV)
   * This ensures the cabinet simulation works out of the box
   */
  loadDefaultCabinetIR() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.038; // 38ms - typical close-mic 2×12 IR
    const length = Math.floor(duration * sampleRate);
    
    // Create mono buffer
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate Two-Rock 2×12 style IR (Jensen C12K / EV-12L character)
    // Clean, articulate, balanced frequency response
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Medium decay (balanced between tight 4×12 and loose 1×12)
      const decay = Math.exp(-t / 0.010); // 10ms decay
      
      // Early reflections (open-back cabinet - more spacious)
      const early = i < sampleRate * 0.0035 ? Math.random() * 0.5 : 0;
      
      // Main impulse with natural rolloff
      let sample = (Math.random() * 2 - 1) * decay;
      
      // Add early reflection
      sample += early * decay;
      
      // Jensen/EV speaker response (smooth, balanced mids and highs)
      if (i > 0) {
        // Smooth high-freq rolloff (~5.5kHz for clarity without harshness)
        const alpha = 0.68;
        sample = alpha * sample + (1 - alpha) * channelData[i - 1];
      }
      
      // Emphasize 1-3kHz region (Two-Rock character - clarity and presence)
      if (i > sampleRate * 0.0008 && i < sampleRate * 0.006) {
        sample *= 1.1;
      }
      
      // Normalize and store
      channelData[i] = sample * 0.82;
    }
    
    // Normalize the IR
    let maxVal = 0;
    for (let i = 0; i < length; i++) {
      maxVal = Math.max(maxVal, Math.abs(channelData[i]));
    }
    if (maxVal > 0) {
      for (let i = 0; i < length; i++) {
        channelData[i] /= maxVal;
      }
    }
    
    this.cabIR.buffer = buffer;
    console.log('✅ Two-Rock Classic Reverb: Default 2×12 (Jensen/EV) cabinet IR loaded (38ms)');
  }
  
  /**
   * Load an Impulse Response file for the cabinet simulation
   * @param {string|ArrayBuffer} irData - URL to IR file or ArrayBuffer containing IR data
   * Recommended: 2×12 open-back cabinet with Jensen C12K or EV-12L speakers (mono, 20-50ms)
   */
  async loadIR(irData) {
    try {
      let arrayBuffer;
      
      if (typeof irData === 'string') {
        // Load from URL
        const response = await fetch(irData);
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Use provided ArrayBuffer
        arrayBuffer = irData;
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.cabIR.buffer = audioBuffer;
      console.log('✅ Two-Rock: Custom cabinet IR loaded successfully');
    } catch (error) {
      console.error('❌ Two-Rock: Failed to load IR:', error);
      console.log('↪️ Keeping default 2×12 cabinet IR');
    }
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
    this.inputHPF.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.sparkle.disconnect();
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
    this.revAP1.disconnect();
    this.revAP2.disconnect();
    this.outputMixer.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.cabIR.disconnect();
    this.presence.disconnect();
    this.depth.disconnect();
    this.master.disconnect();
  }
}

export default TwoRockClassicReverbAmp;

