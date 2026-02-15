import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MatchlessDC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Matchless DC-30', 'matchless_dc30');
    
    // MATCHLESS DC-30
    // Boutique British amp - indie/alt rock standard
    // The Edge (U2), Radiohead, indie rock players
    // 
    // AUTHENTIC FEATURES:
    // - Channel 1: EF86 pentode (raw, brilliant, granular)
    // - Channel 2: 12AX7 top boost (smooth, interactive tone stack)
    // - Master Cut control (high frequency roll-off)
    // - Class A compression (4x EL84 tubes)
    // - Pop-free channel switching with crossfade
    
    // ============================================
    // DUAL CHANNELS WITH SEPARATE PREAMPS
    // ============================================
    this.channel1Preamp = audioContext.createGain();
    this.channel2Preamp = audioContext.createGain();
    
    // Channel 1: EF86 pentode - more gain, more texture
    this.channel1Saturation = audioContext.createWaveShaper();
    this.channel1Saturation.curve = this.makeEF86Curve();
    this.channel1Saturation.oversample = '4x';
    
    // Channel 2: 12AX7 triode - smoother, more balanced
    this.channel2Saturation = audioContext.createWaveShaper();
    this.channel2Saturation.curve = this.makeAX7Curve();
    this.channel2Saturation.oversample = '4x';
    
    // ============================================
    // CHANNEL 1 (EF86) - BRILLIANCE VOICING
    // ============================================
    this.brilliance = audioContext.createBiquadFilter();
    this.brilliance.type = 'highshelf';
    this.brilliance.frequency.value = 3000;
    this.brilliance.gain.value = 0; // Off by default
    
    // ============================================
    // CHANNEL VOLUMES (for pop-free switching)
    // ============================================
    this.channel1Volume = audioContext.createGain();
    this.channel2Volume = audioContext.createGain();
    this.channel1Volume.gain.value = 1.0; // CH1 active by default
    this.channel2Volume.gain.value = 0.0; // CH2 muted
    
    // Active channel tracking
    this.activeChannel = 1; // 1 or 2
    
    // ============================================
    // CHANNEL MIXER (both channels always connected)
    // ============================================
    this.channelMixer = audioContext.createGain();
    
    // ============================================
    // SECOND PREAMP STAGE (shared by both channels)
    // ============================================
    this.preamp2 = audioContext.createGain();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation2.curve = this.makeAX7Curve();
    this.saturation2.oversample = '4x';
    
    // ============================================
    // TONE STACK (Top Boost style - interactive)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // ============================================
    // MASTER CUT CONTROL (Matchless/Vox signature)
    // Higher value = MORE cutting (lower frequency)
    // ============================================
    this.cut = audioContext.createBiquadFilter();
    this.cut.type = 'lowpass';
    this.cut.frequency.value = 12000; // Wide open by default (minimal cut)
    this.cut.Q.value = 0.707;
    
    // ============================================
    // BRITISH "CHIME" (Matchless signature)
    // ============================================
    this.chime = audioContext.createBiquadFilter();
    this.chime.type = 'peaking';
    this.chime.frequency.value = 2500; // 2.5kHz chime
    this.chime.Q.value = 2;
    this.chime.gain.value = 4; // Less aggressive than before
    
    // ============================================
    // POWER AMP (4x EL84 - Class A)
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // Matchless DC30 uses EZ81 tube rectifier with EL84 power tubes (Class A heavy sag)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.15,      // 15% sag (Class A heavy sag)
      att: 0.010,       // 10ms attack (Class A feel)
      relFast: 0.09,    // 90ms fast recovery
      relSlow: 0.30,    // 300ms slow recovery (Class A breathing)
      rmsMs: 28.0,      // 28ms RMS window (slow/Class A)
      shape: 1.7,       // Very progressive (Class A character)
      floor: 0.24,      // 24% minimum headroom (heavy!)
      peakMix: 0.27     // More RMS-focused (smooth Class A)
    });
    
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Class A compression (always active)
    this.classAComp = audioContext.createDynamicsCompressor();
    this.classAComp.threshold.value = -18;
    this.classAComp.knee.value = 15;
    this.classAComp.ratio.value = 3;
    this.classAComp.attack.value = 0.005;
    this.classAComp.release.value = 0.12;
    
    // ============================================
    // DC BLOCKING & SUBSONIC FILTER
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 25;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR (2x12 Alnico Blue/Gold)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_closed'; // Matchless standard
    this.micType = 'sm57';
    this.micPosition = 'edge'; // Slightly off-center for less harshness
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // COMPLETE ROUTING (DUAL CHANNEL - ALWAYS CONNECTED)
    // ============================================
    this.setupCompleteRouting();
    
    // ============================================
    // INITIALIZE PARAMETERS
    // ============================================
    this.params = {
      channel: 1, // 1 or 2
      
      // Channel volumes
      ch1_volume: 55,
      ch2_volume: 55,
      
      // Channel 1 specific
      brilliance: 0, // 0 or 1 (off/on)
      
      // Tone stack
      bass: 50,
      treble: 65,
      cut: 30, // Lower value = less cut (wider frequency response)
      
      // Cabinet
      cabinet: 1, // 0 = off, 1 = on
      mic_type: 'sm57',
      mic_position: 'edge',
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  /**
   * Setup complete routing with both channels always connected
   * This prevents pops when switching channels
   */
  setupCompleteRouting() {
    // CHANNEL 1 PATH (EF86)
    this.input.connect(this.channel1Preamp);
    this.channel1Preamp.connect(this.channel1Saturation);
    this.channel1Saturation.connect(this.brilliance); // EF86 has brilliance
    this.brilliance.connect(this.channel1Volume);
    
    // CHANNEL 2 PATH (12AX7)
    this.input.connect(this.channel2Preamp);
    this.channel2Preamp.connect(this.channel2Saturation);
    this.channel2Saturation.connect(this.channel2Volume);
    
    // MIXER - both channels feed into shared path
    this.channel1Volume.connect(this.channelMixer);
    this.channel2Volume.connect(this.channelMixer);
    
    // SHARED SIGNAL PATH
    this.channelMixer.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.chime);
    this.chime.connect(this.cut);
    this.cut.connect(this.classAComp);
    if (this.powerSag) {
      this.classAComp.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.classAComp.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // CABINET ROUTING
    this.dcBlock.connect(this.preCabinet);
    this.updateCabinetRouting();
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
  }
  
  /**
   * Update cabinet routing (bypass or enabled)
   */
  updateCabinetRouting() {
    try {
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      if (this.cabinet) {
        this.cabinet.input.disconnect();
        this.cabinet.output.disconnect();
      }
    } catch (e) {}
    
    if (this.cabinetEnabled) {
      // Create/update cabinet
      if (!this.cabinet) {
        this.cabinet = this.cabinetSimulator.createCabinet(
          this.cabinetType,
          this.micType,
          this.micPosition
        );
      }
      
      // Route through cabinet
      this.preCabinet.connect(this.cabinet.input);
      this.cabinet.output.connect(this.postCabinet);
    } else {
      // Bypass cabinet
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  /**
   * Apply initial amp settings
   */
  applyInitialSettings() {
    // Channel 1 (EF86) - more gain, more aggressive
    this.channel1Preamp.gain.value = 2.8;
    
    // Channel 2 (12AX7) - cleaner, more headroom
    this.channel2Preamp.gain.value = 2.2;
    
    // Shared preamp
    this.preamp2.gain.value = 1.4;
    
    // Channel volumes (linear for now, will be converted in updateParameter)
    this.channel1Volume.gain.value = 1.0; // Active
    this.channel2Volume.gain.value = 0.0; // Muted
    
    // Tone stack defaults (Matchless sweet spot)
    this.bass.gain.value = +1.5;
    this.treble.gain.value = +2;
    this.chime.gain.value = 4;
    
    // Power amp
    this.powerAmp.gain.value = 1.0;
    
    // Master (logarithmic)
    this.master.gain.value = 0.7;
  }
  
  /**
   * EF86 Pentode saturation curve
   * More gain, more granular, slight asymmetry
   */
  makeEF86Curve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Base pentode saturation
      let y = Math.tanh(x * 2.6);
      
      // Pentode "grit" texture
      y += 0.12 * Math.tanh(x * 6);
      
      // Soft compression at high levels
      if (Math.abs(y) > 0.5) {
        y *= 0.92;
      }
      
      // Slight asymmetry (pentode characteristic)
      if (x > 0) {
        y *= 1.08;
      }
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  /**
   * 12AX7 Triode saturation curve
   * Smoother, more balanced, less aggressive
   */
  makeAX7Curve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Base triode saturation (smoother)
      let y = Math.tanh(x * 2.0);
      
      // Smooth harmonics
      y += 0.08 * Math.tanh(x * 4.5);
      
      // Gentle compression
      if (Math.abs(y) > 0.55) {
        y *= 0.94;
      }
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  /**
   * EL84 Power amp curve (Class A - warm, chimey)
   */
  makePowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL84 base response
      let y = Math.tanh(x * 1.4);
      
      // EL84 chime characteristic
      y += 0.12 * Math.sin(x * Math.PI * 5);
      
      // Class A warmth
      y += 0.1 * Math.sin(x * Math.PI * 2);
      
      // Slight asymmetry
      if (x > 0) {
        y *= 1.1;
      }
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  /**
   * Convert linear (0-100) to logarithmic (0.001-1.0)
   * More musical volume response
   */
  linearToLog(value) {
    return 0.001 * Math.pow(1000, value / 100);
  }
  
  /**
   * Update amp parameter
   */
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    const rampTime = 0.02; // 20ms smooth ramp
    
    switch (parameter) {
      case 'channel': {
        // Pop-free channel switching with crossfade
        this.channel1Volume.gain.cancelScheduledValues(now);
        this.channel2Volume.gain.cancelScheduledValues(now);
        
        if (value === 1) {
          this.channel1Volume.gain.linearRampToValueAtTime(
            this.linearToLog(this.params.ch1_volume),
            now + rampTime
          );
          this.channel2Volume.gain.linearRampToValueAtTime(0.0, now + rampTime);
          this.activeChannel = 1;
        } else {
          this.channel1Volume.gain.linearRampToValueAtTime(0.0, now + rampTime);
          this.channel2Volume.gain.linearRampToValueAtTime(
            this.linearToLog(this.params.ch2_volume),
            now + rampTime
          );
          this.activeChannel = 2;
        }
        break;
      }
      
      case 'ch1_volume':
      case 'volume':
      case 'gain':
        if (this.activeChannel === 1) {
          this.channel1Volume.gain.setTargetAtTime(this.linearToLog(value), now, 0.01);
        }
        if (parameter === 'ch1_volume') {
          this.params.ch1_volume = value;
        }
        break;
      
      case 'ch2_volume':
        if (this.activeChannel === 2) {
          this.channel2Volume.gain.setTargetAtTime(this.linearToLog(value), now, 0.01);
        }
        this.params.ch2_volume = value;
        break;
      
      case 'brilliance':
        // Brilliance switch for Channel 1 (EF86)
        this.brilliance.gain.setTargetAtTime(value ? 4 : 0, now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'cut': {
        // CORRECTED CUT CONTROL
        // Lower value (0) = minimal cut (12kHz) - wide frequency response
        // Higher value (100) = heavy cut (2.5kHz) - dark, warm tone
        const highFreq = 12000;
        const lowFreq = 2500;
        const cutFreq = highFreq - (value / 100) * (highFreq - lowFreq);
        this.cut.frequency.setTargetAtTime(cutFreq, now, 0.01);
        break;
      }
      
      case 'master':
        // Logarithmic master volume
        this.master.gain.setTargetAtTime(this.linearToLog(value), now, 0.01);
        break;
      
      case 'cabinet':
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.updateCabinetRouting();
        break;
      
      case 'mic_type':
        this.micType = value;
        if (this.cabinetEnabled) {
          this.cabinet = this.cabinetSimulator.createCabinet(
            this.cabinetType,
            this.micType,
            this.micPosition
          );
          this.updateCabinetRouting();
        }
        break;
      
      case 'mic_position':
        this.micPosition = value;
        if (this.cabinetEnabled) {
          this.cabinet = this.cabinetSimulator.createCabinet(
            this.cabinetType,
            this.micType,
            this.micPosition
          );
          this.updateCabinetRouting();
        }
        break;
    }
    
    this.params[parameter] = value;
  }
  
  /**
   * Disconnect all nodes
   */
  disconnect() {
    try {
      super.disconnect();
      
      // Disconnect all channel-specific nodes
      this.input.disconnect();
      this.channel1Preamp.disconnect();
      this.channel1Saturation.disconnect();
      this.brilliance.disconnect();
      this.channel1Volume.disconnect();
      
      this.channel2Preamp.disconnect();
      this.channel2Saturation.disconnect();
      this.channel2Volume.disconnect();
      
      // Disconnect shared path
      this.channelMixer.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.bass.disconnect();
      this.treble.disconnect();
      this.chime.disconnect();
      this.cut.disconnect();
      this.classAComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      
      // Disconnect cabinet
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      if (this.cabinet) {
        this.cabinet.input.disconnect();
        this.cabinet.output.disconnect();
      }
      
      this.master.disconnect();
    } catch (e) {
      // Ignore disconnection errors
    }
  }
}

export default MatchlessDC30Amp;
