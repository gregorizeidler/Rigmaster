import BaseAmp from './BaseAmp.js';

class VoxAC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox AC30', 'vox_ac30');
    
    // VOX AC30 (Top Boost)
    // THE British chime - The Beatles, Brian May, The Edge
    
    // ============================================
    // FRONT PANEL - NORMAL CHANNEL
    // ============================================
    this.normalVolume = audioContext.createGain();
    this.normalBrilliance = audioContext.createBiquadFilter();
    this.normalBrilliance.type = 'highshelf';
    this.normalBrilliance.frequency.value = 3000;
    this.normalBrilliance.gain.value = 0; // Off by default
    
    // ============================================
    // FRONT PANEL - TOP BOOST CHANNEL
    // ============================================
    this.topBoostVolume = audioContext.createGain();
    this.topBoostTreble = audioContext.createBiquadFilter();
    this.topBoostBass = audioContext.createBiquadFilter();
    
    // Active channel
    this.activeChannel = 'topboost'; // 'normal' or 'topboost'
    
    // ============================================
    // BACK PANEL - PENTODE/TRIODE SWITCH
    // ============================================
    this.pentodeMode = true; // true = 30W pentode, false = 15W triode
    
    // ============================================
    // PREAMP (EF86 Pentode)
    // ============================================
    this.preamp = audioContext.createGain();
    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.curve = this.makeEF86Curve();
    this.preampSaturation.oversample = '4x';
    
    // ============================================
    // CLASS A COMPRESSION
    // ============================================
    this.classACompressor = audioContext.createDynamicsCompressor();
    this.classACompressor.threshold.value = -20;
    this.classACompressor.knee.value = 20; // Soft knee
    this.classACompressor.ratio.value = 3;
    this.classACompressor.attack.value = 0.003;
    this.classACompressor.release.value = 0.15;
    
    // ============================================
    // TONE STACK (Cathode follower)
    // ============================================
    this.midHonk = audioContext.createBiquadFilter();
    this.midHonk.type = 'peaking';
    this.midHonk.frequency.value = 1000; // 1kHz honk
    this.midHonk.Q.value = 1.5;
    this.midHonk.gain.value = 3; // Reduced from 6dB to 3dB for less nasal tone
    
    // ============================================
    // HIGH-PASS FILTER (reduces boom between preamp and stack)
    // ============================================
    this.highPassFilter = audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 70;
    this.highPassFilter.Q.value = 0.707;
    
    // ============================================
    // CUT CONTROL (high-frequency cut)
    // ============================================
    this.cutControl = audioContext.createBiquadFilter();
    this.cutControl.type = 'lowpass';
    this.cutControl.frequency.value = 8000;
    this.cutControl.Q.value = 0.707;
    
    // ============================================
    // SAG ENVELOPE (Class A power supply sag)
    // ============================================
    this.sagNode = audioContext.createGain();
    this.sagNode.gain.value = 1.0;
    
    // ============================================
    // POWER AMP (4x EL84 Class A)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeEL84Curve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // CHIME (2-4kHz peak - THE Vox sound)
    // ============================================
    this.chime = audioContext.createBiquadFilter();
    this.chime.type = 'peaking';
    this.chime.frequency.value = 3000;
    this.chime.Q.value = 2;
    this.chime.gain.value = 4;
    
    // ============================================
    // TOP CUT (additional high-frequency control in power section)
    // ============================================
    this.topCut = audioContext.createBiquadFilter();
    this.topCut.type = 'lowpass';
    this.topCut.frequency.value = 7500;
    this.topCut.Q.value = 0.707;
    
    // ============================================
    // DC BLOCKING FILTER (before cabinet IR)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET IR (2×12 with Alnico Blue/Greenback speakers)
    // ============================================
    this.cabIR = audioContext.createConvolver();
    this.cabBypass = audioContext.createGain(); // For bypassing cabinet
    this.cabEnabled = true; // Cabinet on by default
    // Load a default synthetic IR to ensure it works out of the box
    this.loadDefaultCabinetIR();
    
    // ============================================
    // TREMOLO (built-in)
    // ============================================
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 4;
    
    this.tremoloDepth = audioContext.createGain();
    this.tremoloDepth.gain.value = 0;
    
    this.tremoloGain = audioContext.createGain();
    
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    this.tremoloLFO.start();
    
    // ============================================
    // VIBRATO (pitch modulation via delay)
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 6;
    
    this.vibratoDelay = audioContext.createDelay(0.02);
    this.vibratoDelay.delayTime.value = 0.005; // 5ms base delay
    
    this.vibratoDepth = audioContext.createGain();
    this.vibratoDepth.gain.value = 0;
    
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoDelay.delayTime);
    this.vibratoLFO.start();
    
    // ============================================
    // SPRING REVERB (built-in)
    // ============================================
    // Diffusers (all-pass filters for more realistic spring reverb)
    this.reverbDiffuser1 = audioContext.createBiquadFilter();
    this.reverbDiffuser1.type = 'allpass';
    this.reverbDiffuser1.frequency.value = 1000;
    this.reverbDiffuser1.Q.value = 0.707;
    
    this.reverbDiffuser2 = audioContext.createBiquadFilter();
    this.reverbDiffuser2.type = 'allpass';
    this.reverbDiffuser2.frequency.value = 3000;
    this.reverbDiffuser2.Q.value = 0.707;
    
    this.reverbDelay1 = audioContext.createDelay(0.5);
    this.reverbDelay2 = audioContext.createDelay(0.5);
    this.reverbDelay3 = audioContext.createDelay(0.5);
    
    this.reverbDelay1.delayTime.value = 0.027;
    this.reverbDelay2.delayTime.value = 0.031;
    this.reverbDelay3.delayTime.value = 0.037;
    
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3000; // Lower for more "sprung" character
    
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0;
    
    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 0;
    
    // Spring reverb routing (diffusers -> parallel delays -> filter -> feedback)
    this.reverbDiffuser1.connect(this.reverbDiffuser2);
    this.reverbDiffuser2.connect(this.reverbDelay1);
    this.reverbDiffuser2.connect(this.reverbDelay2);
    this.reverbDiffuser2.connect(this.reverbDelay3);
    this.reverbDelay1.connect(this.reverbFilter);
    this.reverbDelay2.connect(this.reverbFilter);
    this.reverbDelay3.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbDelay1);
    this.reverbFeedback.connect(this.reverbDelay2);
    this.reverbFeedback.connect(this.reverbDelay3);
    this.reverbFilter.connect(this.reverbMix);
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume = audioContext.createGain();
    
    // ============================================
    // ROUTING - TOP BOOST CHANNEL (DEFAULT)
    // ============================================
    this.setupTopBoostChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=topboost
      
      // Normal channel
      normal_volume: 50,
      brilliance: false,
      
      // Top Boost channel
      topboost_volume: 60,
      treble: 60,
      bass: 50,
      
      // Global controls
      cut: 50,
      master: 70,
      
      // Effects
      tremolo_speed: 40,
      tremolo_depth: 0,
      vibrato_speed: 50,
      vibrato_depth: 0,
      reverb: 0,
      
      // Back panel
      pentode_triode: true // true=30W pentode, false=15W triode
    };
    
    this.applyInitialSettings();
  }
  
  setupTopBoostChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // TOP BOOST CHANNEL - Full tone stack control
    // Signal flow: preamp -> topBoost stack -> midHonk -> highPass -> cutControl -> topCut -> vibrato -> sag -> powerAmp -> chime -> dcBlock -> cabIR -> tremolo -> master
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.classACompressor);
    
    // Top Boost controls
    this.classACompressor.connect(this.topBoostVolume);
    this.topBoostVolume.connect(this.topBoostBass);
    this.topBoostBass.connect(this.topBoostTreble);
    this.topBoostTreble.connect(this.midHonk);
    
    // High-pass filter to reduce boom
    this.midHonk.connect(this.highPassFilter);
    
    // Cut control (moved before power amp as per real AC30)
    this.highPassFilter.connect(this.cutControl);
    
    // Additional top cut
    this.cutControl.connect(this.topCut);
    
    // Vibrato before power amp
    this.topCut.connect(this.vibratoDelay);
    
    // Reverb send (from diffusers)
    this.vibratoDelay.connect(this.reverbDiffuser1);
    
    // Sag node (responsive to signal level)
    this.vibratoDelay.connect(this.sagNode);
    
    // Power amp
    this.sagNode.connect(this.powerAmp); // Dry signal
    this.reverbMix.connect(this.powerAmp); // Wet signal
    
    // Power amp → chime (amp-like character) → DC block → Cabinet IR (or bypass) → tremolo → master
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.chime);
    this.chime.connect(this.dcBlock);
    
    // Cabinet routing (can be bypassed)
    if (this.cabEnabled) {
      this.dcBlock.connect(this.cabIR);
      this.cabIR.connect(this.tremoloGain);
    } else {
      this.dcBlock.connect(this.cabBypass);
      this.cabBypass.connect(this.tremoloGain);
    }
    
    this.tremoloGain.connect(this.masterVolume);
    this.masterVolume.connect(this.output);
    
    this.activeChannel = 'topboost';
  }
  
  setupNormalChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // NORMAL CHANNEL - Simple gain + brilliance switch
    // Signal flow: preamp -> normalVolume -> brilliance -> midHonk -> highPass -> cutControl -> topCut -> vibrato -> sag -> powerAmp -> chime -> dcBlock -> cabIR -> tremolo -> master
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.classACompressor);
    
    // Normal channel controls
    this.classACompressor.connect(this.normalVolume);
    this.normalVolume.connect(this.normalBrilliance); // Brilliance switch
    this.normalBrilliance.connect(this.midHonk);
    
    // High-pass filter to reduce boom
    this.midHonk.connect(this.highPassFilter);
    
    // Cut control (moved before power amp as per real AC30)
    this.highPassFilter.connect(this.cutControl);
    
    // Additional top cut
    this.cutControl.connect(this.topCut);
    
    // Vibrato before power amp
    this.topCut.connect(this.vibratoDelay);
    
    // Reverb send (from diffusers)
    this.vibratoDelay.connect(this.reverbDiffuser1);
    
    // Sag node (responsive to signal level)
    this.vibratoDelay.connect(this.sagNode);
    
    // Power amp
    this.sagNode.connect(this.powerAmp); // Dry signal
    this.reverbMix.connect(this.powerAmp); // Wet signal
    
    // Power amp → chime (amp-like character) → DC block → Cabinet IR (or bypass) → tremolo → master
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.chime);
    this.chime.connect(this.dcBlock);
    
    // Cabinet routing (can be bypassed)
    if (this.cabEnabled) {
      this.dcBlock.connect(this.cabIR);
      this.cabIR.connect(this.tremoloGain);
    } else {
      this.dcBlock.connect(this.cabBypass);
      this.cabBypass.connect(this.tremoloGain);
    }
    
    this.tremoloGain.connect(this.masterVolume);
    this.masterVolume.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.preampSaturation.disconnect();
      this.classACompressor.disconnect();
      this.normalVolume.disconnect();
      this.normalBrilliance.disconnect();
      this.topBoostVolume.disconnect();
      this.topBoostBass.disconnect();
      this.topBoostTreble.disconnect();
      this.midHonk.disconnect();
      this.highPassFilter.disconnect();
      this.chime.disconnect();
      this.cutControl.disconnect();
      this.topCut.disconnect();
      this.vibratoDelay.disconnect();
      this.reverbDiffuser1.disconnect();
      this.reverbDiffuser2.disconnect();
      this.reverbDelay1.disconnect();
      this.reverbDelay2.disconnect();
      this.reverbDelay3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.sagNode.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabIR.disconnect();
      this.cabBypass.disconnect();
      this.tremoloGain.disconnect();
      this.masterVolume.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (EF86 Pentode)
    // ============================================
    this.preamp.gain.value = 2.5;
    
    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume.gain.value = 0.5;
    
    // ============================================
    // TOP BOOST CHANNEL
    // ============================================
    this.topBoostVolume.gain.value = 1.2;
    
    // More faithful to AC30 Top Boost circuit
    // Treble: peaking in upper-mids with gentle high-shelf
    this.topBoostTreble.type = 'peaking';
    this.topBoostTreble.frequency.value = 2500; // 2.2-2.8 kHz range
    this.topBoostTreble.Q.value = 0.9;
    this.topBoostTreble.gain.value = 3;
    
    // Bass: lowshelf with subtle boost
    this.topBoostBass.type = 'lowshelf';
    this.topBoostBass.frequency.value = 150; // 120-180 Hz range
    this.topBoostBass.gain.value = 2;
    
    // ============================================
    // POWER AMP (4x EL84 Class A)
    // ============================================
    // Pentode mode = 30W, Triode mode = 15W
    this.setPentodeTriode(true);
    
    // ============================================
    // REVERB
    // ============================================
    this.reverbFeedback.gain.value = 0.4; // Moderate spring reverb tail
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume.gain.value = 0.7;
  }
  
  setPentodeTriode(isPentode) {
    // PENTODE MODE (30W): Full power, more headroom, tighter, brighter
    // TRIODE MODE (15W): Less power, more compression, warmer, softer highs
    
    this.pentodeMode = isPentode;
    
    if (isPentode) {
      // 30W Pentode - more aggressive, tighter
      this.powerAmp.gain.value = 1.2;
      this.classACompressor.threshold.value = -22;
      this.classACompressor.ratio.value = 2.8;
      this.chime.gain.value = 4; // More pronounced chime
      this.topCut.frequency.value = 7500; // Brighter
    } else {
      // 15W Triode - warmer, more compressed, softer
      this.powerAmp.gain.value = 0.85;
      this.classACompressor.threshold.value = -26; // Compression enters earlier
      this.classACompressor.ratio.value = 3.5; // More compression
      this.chime.gain.value = 2.5; // Softer chime
      this.topCut.frequency.value = 6500; // Warmer
    }
  }
  
  /**
   * Load a default synthetic cabinet IR (2x12 Vox-style)
   * This ensures the cabinet simulation works out of the box
   */
  loadDefaultCabinetIR() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.035; // 35ms - typical close-mic cabinet IR
    const length = Math.floor(duration * sampleRate);
    
    // Create mono buffer
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate Vox 2x12 style IR
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Exponential decay (cabinet resonance)
      const decay = Math.exp(-t / 0.012); // 12ms decay
      
      // Early reflections (cabinet construction)
      const early = i < sampleRate * 0.003 ? Math.random() * 0.4 : 0;
      
      // Main impulse with natural rolloff
      let sample = (Math.random() * 2 - 1) * decay;
      
      // Add early reflection
      sample += early * decay;
      
      // Speaker cone response (emphasize mids, roll off highs)
      if (i > 0) {
        // Simple lowpass to simulate speaker rolloff (~5kHz)
        const alpha = 0.65;
        sample = alpha * sample + (1 - alpha) * channelData[i - 1];
      }
      
      // Normalize and store
      channelData[i] = sample * 0.8;
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
    console.log('✅ Vox AC30: Default 2×12 cabinet IR loaded (35ms)');
  }
  
  /**
   * Load an Impulse Response file for the cabinet simulation
   * @param {string|ArrayBuffer} irData - URL to IR file or ArrayBuffer containing IR data
   * Recommended: 2×12 Vox cabinet with Alnico Blue or Celestion Greenback speakers (mono, 20-50ms)
   */
  async loadIR(irData) {
    try {
      let audioData;
      
      if (typeof irData === 'string') {
        // Load from URL
        const response = await fetch(irData);
        audioData = await response.arrayBuffer();
      } else {
        // Use provided ArrayBuffer
        audioData = irData;
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      this.cabIR.buffer = audioBuffer;
      
      console.log(`✅ Vox AC30: Custom cabinet IR loaded (${audioBuffer.duration.toFixed(3)}s)`);
      return true;
    } catch (error) {
      console.error('Error loading cabinet IR:', error);
      return false;
    }
  }
  
  makeEF86Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EF86 pentode (gritty, high gain)
      let y = Math.tanh(x * 1.8);
      
      // Class A compression
      if (Math.abs(y) > 0.4) {
        const compression = 1 - (Math.abs(y) - 0.4) * 0.3;
        y *= compression;
      }
      
      // Mid honk
      y += 0.2 * Math.tanh(x * 3);
      
      curve[i] = y;
    }
    return curve;
  }
  
  makeEL84Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL84 tubes (chime)
      let y = Math.tanh(x * 1.5);
      
      // EL84 "chime" (2-4kHz peak)
      y += 0.12 * Math.sin(x * Math.PI * 5);
      
      // Harmonic richness (Class A)
      y += 0.15 * Math.sin(x * Math.PI * 2);
      
      // EL84 asymmetry
      if (x > 0) {
        y *= 1.12;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    // Helper function for logarithmic volume mapping (more musical)
    const logMap = v => 0.001 * Math.pow(1000, v); // 0..1 -> ~-60dB..0dB
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        if (value === 0) {
          this.setupNormalChannel();
        } else {
          this.setupTopBoostChannel();
        }
        break;
      
      // ============================================
      // NORMAL CHANNEL CONTROLS
      // ============================================
      case 'normal_volume':
        // Logarithmic volume mapping for more musical response
        this.normalVolume.gain.setTargetAtTime(logMap(value / 100), now, 0.01);
        break;
      
      case 'brilliance':
        // Brilliance switch adds high-end sparkle
        this.normalBrilliance.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      // ============================================
      // TOP BOOST CHANNEL CONTROLS
      // ============================================
      case 'topboost_volume':
      case 'volume':
      case 'gain':
        // Logarithmic volume mapping for more musical response
        this.topBoostVolume.gain.setTargetAtTime(logMap(value / 100) * 1.2, now, 0.01);
        break;
      
      case 'treble':
        this.topBoostTreble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'bass':
        this.topBoostBass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'cut': {
        // INVERTED: Cut control is a treble cut (more value = more cut = lower frequency)
        // Real AC30: Cut is post-phase inverter low-pass
        const v = value / 100; // 0..1
        const freq = 12000 - v * (12000 - 2000); // 12kHz -> 2kHz (inverted)
        this.cutControl.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      }
      
      case 'master': {
        // Logarithmic master volume for more musical response
        const masterGain = logMap(value / 100);
        this.masterVolume.gain.setTargetAtTime(masterGain, now, 0.01);
        
        // Sag simulation: higher master volume causes slight preamp "sag" (softer attack)
        // This simulates power supply compression under load
        const sagAmount = 1.0 - (value / 100) * 0.15; // Up to 15% reduction
        this.sagNode.gain.setTargetAtTime(sagAmount, now, 0.05);
        break;
      }
      
      // ============================================
      // TREMOLO
      // ============================================
      case 'tremolo_speed':
        // 0.5 Hz to 10 Hz
        this.tremoloLFO.frequency.setTargetAtTime(0.5 + (value / 100) * 9.5, now, 0.01);
        break;
      
      case 'tremolo_depth':
        // 0 to 100% amplitude modulation (full depth available)
        this.tremoloDepth.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // VIBRATO
      // ============================================
      case 'vibrato_speed':
        // 1 Hz to 12 Hz
        this.vibratoLFO.frequency.setTargetAtTime(1 + (value / 100) * 11, now, 0.01);
        break;
      
      case 'vibrato_depth': {
        // 0 to 15ms delay modulation (safe limits for 20ms max delay)
        const maxDepth = 0.015; // 15ms for safety margin
        this.vibratoDepth.gain.setTargetAtTime((value / 100) * maxDepth, now, 0.01);
        break;
      }
      
      // ============================================
      // REVERB
      // ============================================
      case 'reverb':
        // Spring reverb mix
        this.reverbMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // BACK PANEL
      // ============================================
      case 'pentode_triode':
        this.setPentodeTriode(value);
        break;
      
      // ============================================
      // CABINET CONTROL
      // ============================================
      case 'cabinet_enabled':
        this.cabEnabled = value;
        // Re-route to enable/disable cabinet
        if (this.activeChannel === 'topboost') {
          this.setupTopBoostChannel();
        } else {
          this.setupNormalChannel();
        }
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Stop oscillators
    try {
      this.tremoloLFO.stop();
      this.vibratoLFO.stop();
    } catch (e) {
      // Already stopped
    }
    
    // Disconnect all nodes
    this.preamp.disconnect();
    this.preampSaturation.disconnect();
    this.classACompressor.disconnect();
    this.normalVolume.disconnect();
    this.normalBrilliance.disconnect();
    this.topBoostVolume.disconnect();
    this.topBoostTreble.disconnect();
    this.topBoostBass.disconnect();
    this.midHonk.disconnect();
    this.highPassFilter.disconnect();
    this.chime.disconnect();
    this.cutControl.disconnect();
    this.topCut.disconnect();
    this.vibratoDelay.disconnect();
    this.vibratoDepth.disconnect();
    this.vibratoLFO.disconnect();
    this.reverbDiffuser1.disconnect();
    this.reverbDiffuser2.disconnect();
    this.reverbDelay1.disconnect();
    this.reverbDelay2.disconnect();
    this.reverbDelay3.disconnect();
    this.reverbFilter.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbMix.disconnect();
    this.sagNode.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.cabIR.disconnect();
    this.cabBypass.disconnect();
    this.tremoloLFO.disconnect();
    this.tremoloDepth.disconnect();
    this.tremoloGain.disconnect();
    this.masterVolume.disconnect();
  }
}

export default VoxAC30Amp;

