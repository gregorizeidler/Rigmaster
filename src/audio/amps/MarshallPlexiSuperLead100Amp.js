import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MarshallPlexiSuperLead100Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall Plexi Super Lead 100', 'marshall_plexi_super_lead');
    
    // ============================================
    // MARSHALL 1959SLP SUPER LEAD 100W (1965-1981)
    // ============================================
    // THE LEGENDARY PLEXI - Jimi Hendrix, Eddie Van Halen, Angus Young
    // Jimmy Page, Slash (AFD era), Zakk Wylde (early)
    // 
    // FEATURES:
    // - 4 inputs (High/Low Treble, High/Low Bass channels)
    // - NO master volume (preamp + power amp interaction)
    // - ECC83/12AX7 preamp tubes (3 stages)
    // - EL34 power tubes (4x 100W push-pull)
    // - GZ34 tube rectifier (vintage sag and bloom)
    // - Bass/Middle/Treble/Presence
    // - Gold plexi panel, basketweave grill
    // ============================================
    
    // ============================================
    // 4 INPUT JACKS (Channel I/II x High/Low)
    // ============================================
    
    // Channel I (BASS/NORMAL channel)
    this.ch1HighInput = audioContext.createGain();
    this.ch1LowInput = audioContext.createGain();
    this.ch1LowPad = audioContext.createGain();
    this.ch1LowPad.gain.value = 0.5; // -6dB pad
    
    // Channel II (TREBLE/LEAD channel) - brighter voicing
    this.ch2HighInput = audioContext.createGain();
    this.ch2LowInput = audioContext.createGain();
    this.ch2LowPad = audioContext.createGain();
    this.ch2LowPad.gain.value = 0.5; // -6dB pad
    
    // Channel II bright cap (treble emphasis)
    this.ch2BrightCap = audioContext.createBiquadFilter();
    this.ch2BrightCap.type = 'highshelf';
    this.ch2BrightCap.frequency.value = 2800;
    this.ch2BrightCap.gain.value = 4; // +4dB treble boost for Channel II
    
    // Active input selection
    this.activeInput = 'ch1_high'; // 'ch1_high', 'ch1_low', 'ch2_high', 'ch2_low'
    this.jumperedChannels = true; // Classic "jumper cable" technique
    
    // ============================================
    // PREAMP STAGES (3x ECC83/12AX7)
    // ============================================
    
    // First gain stage
    this.preamp1 = audioContext.createGain();
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makePlexiPreampCurve(1);
    this.saturation1.oversample = '4x';
    
    // Second gain stage (cascaded)
    this.preamp2 = audioContext.createGain();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation2.curve = this.makePlexiPreampCurve(2);
    this.saturation2.oversample = '4x';
    
    // Third gain stage (tone stack recovery)
    this.preamp3 = audioContext.createGain();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation3.curve = this.makePlexiPreampCurve(3);
    this.saturation3.oversample = '4x';
    
    // ============================================
    // CHANNEL VOLUMES (Pre-tone stack)
    // ============================================
    this.ch1Volume = audioContext.createGain();
    this.ch2Volume = audioContext.createGain();
    this.channelMixer = audioContext.createGain();
    
    // BRIGHT CAP (Volume-dependent - reduces as volume increases)
    // Real Plexi behavior: bright cap is bypassed at higher volumes
    this.volumeBrightCap = audioContext.createBiquadFilter();
    this.volumeBrightCap.type = 'highshelf';
    this.volumeBrightCap.frequency.value = 3000;
    this.volumeBrightCap.gain.value = 6; // +6dB at low volumes
    
    // ============================================
    // MARSHALL TONE STACK (TMB + Presence)
    // ============================================
    
    // Bass control (low-shelf)
    this.bass = audioContext.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    // Middle control (peaking) - PLEXI MID SCOOP characteristic
    this.middle = audioContext.createBiquadFilter();
    this.middle.type = 'peaking';
    this.middle.frequency.value = 500;
    this.middle.Q.value = 1.2;
    this.middle.gain.value = -2; // Slight mid scoop by default
    
    // Middle presence (plexi warmth around 1kHz)
    this.midPresence = audioContext.createBiquadFilter();
    this.midPresence.type = 'peaking';
    this.midPresence.frequency.value = 1100;
    this.midPresence.Q.value = 1.8;
    this.midPresence.gain.value = 2; // Plexi "honk" characteristic
    
    // Treble control (high-shelf)
    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    // ============================================
    // PLEXI "CHIME" - Upper midrange character
    // ============================================
    this.plexiChime = audioContext.createBiquadFilter();
    this.plexiChime.type = 'peaking';
    this.plexiChime.frequency.value = 2400;
    this.plexiChime.Q.value = 2.0;
    this.plexiChime.gain.value = 3; // +3dB "Plexi sparkle"
    
    // ============================================
    // GZ34 TUBE RECTIFIER SAG (Vintage bloom/compression)
    // ============================================
    // The GZ34 tube rectifier gives the Plexi its characteristic
    // "sag" - voltage drops under heavy playing, creating
    // compression, sustain, and that vintage "bloom"
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.16,      // 16% sag (heavy vintage sag - MORE than JCM800)
      att: 0.012,       // 12ms attack (slower/vintage)
      relFast: 0.10,    // 100ms fast recovery
      relSlow: 0.32,    // 320ms slow recovery (vintage breathing)
      rmsMs: 28.0,      // 28ms RMS window (vintage/smooth)
      shape: 1.8,       // Progressive/tube-like (vintage character)
      floor: 0.24,      // 24% minimum headroom (heavy compression)
      peakMix: 0.25     // More RMS-focused (smooth vintage sag)
    });
    
    // Additional vintage sag compression (simulates transformer + rectifier)
    this.sagCompressor = audioContext.createDynamicsCompressor();
    this.sagCompressor.threshold.value = -22;
    this.sagCompressor.knee.value = 24; // Very soft knee (gradual compression)
    this.sagCompressor.ratio.value = 2.2;
    this.sagCompressor.attack.value = 0.015; // 15ms attack
    this.sagCompressor.release.value = 0.25; // 250ms release (vintage bloom)
    
    // ============================================
    // POWER AMP (4x EL34 100W Push-Pull)
    // ============================================
    this.powerAmp = audioContext.createGain();
    
    // Presence control (negative feedback loop - BEFORE power saturation)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // EL34 power tube saturation (British character)
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePlexiPowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Phase inverter stage (adds harmonic richness)
    this.phaseInverter = audioContext.createWaveShaper();
    this.phaseInverter.curve = this.makePhaseInverterCurve();
    this.phaseInverter.oversample = '4x';
    
    // Output transformer saturation (vintage iron core)
    this.outputTransformer = audioContext.createWaveShaper();
    this.outputTransformer.curve = this.makePlexiTransformerCurve();
    this.outputTransformer.oversample = '4x';
    
    // Transformer resonance (adds low-end punch and high-end air)
    this.transformerResonance = audioContext.createBiquadFilter();
    this.transformerResonance.type = 'peaking';
    this.transformerResonance.frequency.value = 80;
    this.transformerResonance.Q.value = 0.8;
    this.transformerResonance.gain.value = 2; // +2dB low-end punch
    
    // ============================================
    // POST-POWER AMP FILTERING (Speaker cable simulation)
    // ============================================
    // High impedance rolloff (simulates speaker cable capacitance)
    this.speakerCableHF = audioContext.createBiquadFilter();
    this.speakerCableHF.type = 'lowpass';
    this.speakerCableHF.frequency.value = 8000;
    this.speakerCableHF.Q.value = 0.7;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_greenback'; // Classic Marshall 1960A/B with Celestion Greenbacks
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME (Added later - not on original Plexi)
    // ============================================
    // Original Plexi had NO master volume
    // This is optional for bedroom levels
    this.masterVolume = audioContext.createGain();
    this.hasMasterVolume = false; // FALSE for authentic Plexi behavior
    
    // ============================================
    // STANDBY SWITCH
    // ============================================
    this.standby = false;
    this.standbyGain = audioContext.createGain();
    
    // ============================================
    // VARIAC SIMULATION (Voltage reduction)
    // ============================================
    // Many players used a Variac to lower voltage = earlier breakup
    this.variacVoltage = 100; // 100% = full power, 90% = reduced
    this.variacGain = audioContext.createGain();
    
    // ============================================
    // ROUTING - DEFAULT: CH1 HIGH INPUT (JUMPED)
    // ============================================
    this.setupInputRouting();
    
    // ============================================
    // PARAMETERS
    // ============================================
    this.params = {
      // Input selection
      input: 0, // 0=CH1_HIGH, 1=CH1_LOW, 2=CH2_HIGH, 3=CH2_LOW
      jumpered: true, // Classic jumper cable technique
      
      // Channel volumes (0-10 scale like real Plexi)
      ch1_volume: 60,
      ch2_volume: 60,
      
      // Tone stack (0-10 scale)
      bass: 55,
      middle: 50,
      treble: 65,
      presence: 60,
      
      // Optional master volume (not on original)
      master_volume: 70,
      has_master: false,
      
      // Power settings
      variac: 100, // 100% = full power
      standby: false,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_greenback',
      microphone: 'sm57',
      micPosition: 'edge'
    };
    
    this.applyInitialSettings();
    this.recreateCabinet();
  }
  
  // ============================================
  // INITIAL SETTINGS
  // ============================================
  applyInitialSettings() {
    // Preamp stages (moderate gain - Plexi is touch-sensitive)
    this.preamp1.gain.value = 6; // First stage
    this.preamp2.gain.value = 1.8; // Second stage
    this.preamp3.gain.value = 1.4; // Tone stack recovery
    
    // Channel volumes (will be set by updateParameter)
    this.ch1Volume.gain.value = 0.6;
    this.ch2Volume.gain.value = 0.6;
    
    // Power amp (100W EL34)
    this.powerAmp.gain.value = 1.2;
    
    // Variac (full power by default)
    this.variacGain.gain.value = 1.0;
    
    // Master volume (if enabled)
    this.masterVolume.gain.value = 0.7;
    
    // Standby off initially (muted)
    this.standbyGain.gain.value = 0.0;
  }
  
  // ============================================
  // INPUT ROUTING (Complex 4-input system)
  // ============================================
  setupInputRouting() {
    this.disconnectAll();
    
    const inputType = this.params.input || 0;
    const isJumpered = this.params.jumpered !== false;
    
    // Route input to selected channel
    if (inputType === 0) {
      // CH1 HIGH
      this.input.connect(this.ch1HighInput);
      this.ch1HighInput.connect(this.preamp1);
      this.activeInput = 'ch1_high';
    } else if (inputType === 1) {
      // CH1 LOW (with pad)
      this.input.connect(this.ch1LowInput);
      this.ch1LowInput.connect(this.ch1LowPad);
      this.ch1LowPad.connect(this.preamp1);
      this.activeInput = 'ch1_low';
    } else if (inputType === 2) {
      // CH2 HIGH (with bright cap)
      this.input.connect(this.ch2HighInput);
      this.ch2HighInput.connect(this.ch2BrightCap);
      this.ch2BrightCap.connect(this.preamp1);
      this.activeInput = 'ch2_high';
    } else if (inputType === 3) {
      // CH2 LOW (with pad + bright cap)
      this.input.connect(this.ch2LowInput);
      this.ch2LowInput.connect(this.ch2LowPad);
      this.ch2LowPad.connect(this.ch2BrightCap);
      this.ch2BrightCap.connect(this.preamp1);
      this.activeInput = 'ch2_low';
    }
    
    // Preamp chain
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Channel split after second preamp stage
    if (isJumpered) {
      // JUMPERED MODE (classic Plexi technique)
      // Both channels work together (sum of both volumes)
      this.saturation2.connect(this.ch1Volume);
      this.saturation2.connect(this.ch2Volume);
      this.ch1Volume.connect(this.channelMixer);
      this.ch2Volume.connect(this.channelMixer);
      this.channelMixer.connect(this.volumeBrightCap);
    } else {
      // NON-JUMPERED (single channel mode)
      if (inputType <= 1) {
        // CH1 only
        this.saturation2.connect(this.ch1Volume);
        this.ch1Volume.connect(this.volumeBrightCap);
      } else {
        // CH2 only
        this.saturation2.connect(this.ch2Volume);
        this.ch2Volume.connect(this.volumeBrightCap);
      }
    }
    
    // Bright cap → third preamp stage
    this.volumeBrightCap.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Tone stack
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.midPresence);
    this.midPresence.connect(this.treble);
    this.treble.connect(this.plexiChime);
    
    // Power section with sag
    if (this.powerSag) {
      this.plexiChime.connect(this.powerSag);
      this.powerSag.connect(this.sagCompressor);
    } else {
      this.plexiChime.connect(this.sagCompressor);
    }
    
    // Presence (NFB) → Phase Inverter → Power Amp
    this.sagCompressor.connect(this.presence);
    this.presence.connect(this.phaseInverter);
    this.phaseInverter.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // Output transformer → transformer resonance → speaker cable
    this.powerSaturation.connect(this.outputTransformer);
    this.outputTransformer.connect(this.transformerResonance);
    this.transformerResonance.connect(this.speakerCableHF);
    
    // Variac control (voltage reduction)
    this.speakerCableHF.connect(this.variacGain);
    
    // Optional master volume
    if (this.hasMasterVolume) {
      this.variacGain.connect(this.masterVolume);
      this.masterVolume.connect(this.preCabinet);
    } else {
      this.variacGain.connect(this.preCabinet);
    }
    
    // Cabinet → standby → output
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.standbyGain);
    this.standbyGain.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.ch1HighInput.disconnect();
      this.ch1LowInput.disconnect();
      this.ch1LowPad.disconnect();
      this.ch2HighInput.disconnect();
      this.ch2LowInput.disconnect();
      this.ch2LowPad.disconnect();
      this.ch2BrightCap.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.ch1Volume.disconnect();
      this.ch2Volume.disconnect();
      this.channelMixer.disconnect();
      this.volumeBrightCap.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.midPresence.disconnect();
      this.treble.disconnect();
      this.plexiChime.disconnect();
      this.sagCompressor.disconnect();
      this.presence.disconnect();
      this.phaseInverter.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.outputTransformer.disconnect();
      this.transformerResonance.disconnect();
      this.speakerCableHF.disconnect();
      this.variacGain.disconnect();
      this.masterVolume.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.standbyGain.disconnect();
    } catch (e) {}
  }
  
  // ============================================
  // SATURATION CURVES (Plexi-specific)
  // ============================================
  
  makePlexiPreampCurve(stage) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      let y;
      
      if (stage === 1) {
        // FIRST STAGE - Clean with gentle compression
        y = Math.tanh(x * 2.8);
        
        // Plexi warmth (2nd harmonic)
        y += 0.15 * Math.tanh(x * 4.5);
        
        // Touch sensitivity
        if (Math.abs(x) < 0.3) {
          y *= 1.08; // More linear at low levels
        }
        
      } else if (stage === 2) {
        // SECOND STAGE - Main gain stage (cascaded)
        y = Math.tanh(x * 5);
        
        // Plexi "crunch" character (odd harmonics)
        y += 0.18 * Math.tanh(x * 8);
        
        // British "midrange bark"
        y += 0.10 * Math.sin(x * Math.PI * 6);
        
        // Asymmetry (more even harmonics)
        if (x > 0) y *= 1.12;
        else y *= 0.98;
        
      } else if (stage === 3) {
        // THIRD STAGE - Tone stack recovery
        y = Math.tanh(x * 3.2);
        
        // Vintage "bloom" (compression at high levels)
        if (Math.abs(y) > 0.6) {
          const excess = Math.abs(y) - 0.6;
          y = Math.sign(y) * (0.6 + excess * 0.5);
        }
        
        // Plexi "chime" (upper mids)
        y += 0.12 * Math.tanh(x * 7);
      }
      
      curve[i] = y * 0.88;
    }
    
    return curve;
  }
  
  makePlexiPowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL34 POWER TUBES (100W push-pull)
      let y = Math.tanh(x * 1.4);
      
      // EL34 characteristic compression (starts early)
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.55);
      }
      
      // EL34 "British" character (rich harmonics)
      y += 0.15 * Math.tanh(x * 3.5); // 3rd harmonic
      y += 0.08 * Math.tanh(x * 5);   // 5th harmonic
      
      // Low-end punch (EL34 low-frequency response)
      y += 0.12 * Math.tanh(x * 2.2);
      
      // Asymmetry (crossover distortion at low levels)
      if (Math.abs(x) < 0.15) {
        y *= 0.92; // Slight crossover "notch"
      }
      if (x > 0) y *= 1.15;
      else y *= 0.96;
      
      curve[i] = y * 0.92;
    }
    
    return curve;
  }
  
  makePhaseInverterCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Long-tailed pair phase inverter (ECC83)
      let y = Math.tanh(x * 2.2);
      
      // Phase inverter adds even harmonics
      y += 0.14 * Math.tanh(x * 4.4);
      
      // Subtle asymmetry
      if (x > 0) y *= 1.06;
      
      curve[i] = y * 0.95;
    }
    
    return curve;
  }
  
  makePlexiTransformerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Vintage output transformer (Radiospares/Dagnall)
      let y = Math.tanh(x * 1.3);
      
      // Transformer saturation (adds warmth and compression)
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.45);
      }
      
      // Transformer harmonics (vintage character)
      y += 0.08 * Math.tanh(x * 2.6) * 0.9; // 2nd harmonic
      y += 0.04 * Math.tanh(x * 3.9) * 0.9; // 3rd harmonic
      
      // Low-frequency saturation (iron core)
      y += 0.10 * Math.tanh(x * 1.8);
      
      // Asymmetry (DC offset in vintage transformers)
      if (x > 0) y *= 1.08;
      else y *= 0.98;
      
      curve[i] = y * 0.94;
    }
    
    return curve;
  }
  
  // ============================================
  // CABINET SIMULATOR
  // ============================================
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
  
  // ============================================
  // PARAMETER CONTROL
  // ============================================
  
  // Logarithmic volume taper (authentic pot response)
  linLog01(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // INPUT SELECTION
      // ============================================
      case 'input':
        this.params.input = value;
        this.setupInputRouting();
        break;
      
      case 'jumpered':
        this.params.jumpered = !!value;
        this.setupInputRouting();
        break;
      
      // ============================================
      // CHANNEL VOLUMES (0-10 scale like real Plexi)
      // ============================================
      case 'ch1_volume':
      case 'ch1_vol': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.ch1Volume.gain.setTargetAtTime(logV, now, 0.01);
        
        // Update bright cap (reduces at higher volumes)
        this.updateBrightCap();
        break;
      }
      
      case 'ch2_volume':
      case 'ch2_vol': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.ch2Volume.gain.setTargetAtTime(logV, now, 0.01);
        
        // Update bright cap (reduces at higher volumes)
        this.updateBrightCap();
        break;
      }
      
      // ============================================
      // TONE STACK (0-10 scale)
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        // Plexi middle control is interactive with other controls
        this.middle.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        // Adjust mid presence for plexi character
        this.midPresence.gain.setTargetAtTime(2 + (value - 50) / 25, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        // Also adjust chime character
        this.plexiChime.gain.setTargetAtTime(3 + (value - 50) / 20, now, 0.01);
        break;
      
      case 'presence':
        // Presence acts as negative feedback (more = brighter)
        this.presence.gain.setTargetAtTime((value - 50) / 7, now, 0.01);
        break;
      
      // ============================================
      // MASTER VOLUME (Optional - not on original)
      // ============================================
      case 'master_volume':
      case 'master': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.masterVolume.gain.setTargetAtTime(logV, now, 0.01);
        break;
      }
      
      case 'has_master':
        this.hasMasterVolume = !!value;
        this.setupInputRouting();
        break;
      
      // ============================================
      // POWER SETTINGS
      // ============================================
      case 'variac':
        // Variac voltage reduction (90% = brown sound)
        this.variacVoltage = value;
        const variacMultiplier = value / 100;
        this.variacGain.gain.setTargetAtTime(variacMultiplier, now, 0.05);
        
        // Lower voltage = more sag and compression
        if (this.powerSag) {
          const sagDepth = 0.16 + (1 - variacMultiplier) * 0.08; // More sag at lower voltage
          this.powerSag.parameters.get('depth').value = sagDepth;
        }
        break;
      
      case 'standby':
        this.standby = !!value;
        if (this.standby) {
          // Standby mode (mute)
          this.standbyGain.gain.setTargetAtTime(0, now, 0.001);
        } else {
          // Active mode
          this.standbyGain.gain.setTargetAtTime(1, now, 0.001);
        }
        break;
      
      // ============================================
      // CABINET CONTROL
      // ============================================
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
    }
    
    this.params[parameter] = value;
  }
  
  // Update bright cap based on current volume settings
  updateBrightCap() {
    const now = this.audioContext.currentTime;
    
    // Calculate average volume (both channels contribute)
    const ch1Vol = this.params.ch1_volume || 60;
    const ch2Vol = this.params.ch2_volume || 60;
    const avgVol = (ch1Vol + ch2Vol) / 200; // 0..1
    
    // Bright cap reduces as volume increases (real Plexi behavior)
    const brightGain = (1 - avgVol) * 6; // 0 to +6dB
    this.volumeBrightCap.gain.setTargetAtTime(brightGain, now, 0.02);
  }
  
  // ============================================
  // PRESETS (Famous Plexi tones)
  // ============================================
  getPresets() {
    return {
      'Hendrix (Are You Experienced)': {
        input: 2, // CH2 HIGH
        jumpered: true,
        ch1_volume: 65,
        ch2_volume: 75,
        bass: 50,
        middle: 55,
        treble: 70,
        presence: 65,
        variac: 100,
        has_master: false,
        cabinet_enabled: true
      },
      
      'Jimmy Page (Whole Lotta Love)': {
        input: 0, // CH1 HIGH
        jumpered: true,
        ch1_volume: 70,
        ch2_volume: 70,
        bass: 60,
        middle: 45,
        treble: 75,
        presence: 70,
        variac: 95, // Slightly reduced voltage
        has_master: false,
        cabinet_enabled: true
      },
      
      'Angus Young (Back in Black)': {
        input: 2, // CH2 HIGH
        jumpered: false,
        ch1_volume: 30,
        ch2_volume: 80,
        bass: 52,
        middle: 48,
        treble: 72,
        presence: 68,
        variac: 100,
        has_master: false,
        cabinet_enabled: true
      },
      
      'Eddie Van Halen (Brown Sound)': {
        input: 0, // CH1 HIGH
        jumpered: true,
        ch1_volume: 80,
        ch2_volume: 75,
        bass: 70,
        middle: 40,
        treble: 65,
        presence: 72,
        variac: 90, // VARIAC! (90V = brown sound)
        has_master: false,
        cabinet_enabled: true
      },
      
      'Slash (Appetite era)': {
        input: 2, // CH2 HIGH
        jumpered: true,
        ch1_volume: 60,
        ch2_volume: 85,
        bass: 58,
        middle: 52,
        treble: 68,
        presence: 65,
        variac: 100,
        has_master: false,
        cabinet_enabled: true
      },
      
      'Plexi Crunch (Classic Rock)': {
        input: 0, // CH1 HIGH
        jumpered: true,
        ch1_volume: 55,
        ch2_volume: 55,
        bass: 55,
        middle: 50,
        treble: 62,
        presence: 58,
        variac: 100,
        has_master: false,
        cabinet_enabled: true
      },
      
      'Bedroom Plexi (with Master)': {
        input: 0, // CH1 HIGH
        jumpered: true,
        ch1_volume: 75,
        ch2_volume: 75,
        bass: 55,
        middle: 50,
        treble: 65,
        presence: 60,
        master_volume: 25, // Low master for bedroom levels
        variac: 100,
        has_master: true,
        cabinet_enabled: true
      }
    };
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  disconnect() {
    super.disconnect();
    this.disconnectAll();
    
    // Cleanup cabinet
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
  }
}

export default MarshallPlexiSuperLead100Amp;

