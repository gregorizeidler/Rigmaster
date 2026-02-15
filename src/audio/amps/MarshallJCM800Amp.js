import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MarshallJCM800Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JCM800', 'marshall_jcm800');
    
    // MARSHALL JCM800 2203 (100W Master Volume Head)
    // THE rock amp - AC/DC, Slash, Zakk Wylde
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (high-gain input)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -52,      // Classic Marshall threshold
      thClose: -60,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack
      release: 0.10,    // 100ms release
      rms: 0.016,       // 16ms RMS window
      peakMix: 0.35,    // Balanced peak/RMS
      floorDb: -72,     // Musical floor
      holdMs: 10        // 10ms hold
    });
    
    // ============================================
    // FRONT PANEL CONTROLS (Channel 1 - High Gain)
    // ============================================
    
    // Input stages (4 inputs: High/Low sensitivity)
    this.inputGain = audioContext.createGain();
    this.inputSensitivity = 'high'; // 'high' or 'low'
    
    // Input HPF for Low input (optional - attenuates highs slightly)
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highshelf';
    this.inputHPF.frequency.value = 8000;
    this.inputHPF.gain.value = 0; // -2dB when low input is used
    
    // Preamp stages (3x 12AX7 cascading)
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    // First stage uses regular preamp curve
    this.saturation1.curve = this.makePreampCurve(false);
    // Second stage uses "cold clipper" curve (JCM800 character)
    this.saturation2.curve = this.makePreampCurve(true);
    // Third stage uses regular preamp curve
    this.saturation3.curve = this.makePreampCurve(false);
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // Bright cap (depends on preamp volume)
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2500;
    this.brightCap.gain.value = 0; // controlled in updateParameter
    
    // Tone stack (Marshall characteristic)
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 650;
    this.mid.Q.value = 1.5;
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // Master Volume (post-preamp)
    this.masterVolume = audioContext.createGain();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // JCM800 uses EL34 tubes with tube rectifier
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.12,      // 12% sag (Marshall tube sag)
      att: 0.006,       // 6ms attack
      relFast: 0.07,    // 70ms fast recovery
      relSlow: 0.23,    // 230ms slow recovery
      rmsMs: 20.0,      // 20ms RMS window
      shape: 1.5,       // Progressive/tube-like
      floor: 0.27,      // 27% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Power amp (EL34 x 4 tubes - 100W)
    this.powerAmp = audioContext.createGain();
    
    // Presence control (negative feedback in power amp - positioned BEFORE power saturation)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 0;
    
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Output transformer
    this.outputTransformer = audioContext.createWaveShaper();
    this.outputTransformer.curve = this.makeTransformerCurve();
    this.outputTransformer.oversample = '4x';
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; // Will be created on demand
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_greenback'; // Marshall standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // Half Power switch (pentode/triode)
    this.powerMode = 'pentode'; // 'pentode' (100W) or 'triode' (50W)
    
    // Standby switch
    this.standby = false;
    this.standbyGain = audioContext.createGain();
    
    // Effects loop (series)
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    
    // Gate at input for high-gain
    if (this.noiseGate) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.inputGain);
    } else {
      this.input.connect(this.inputGain);
    }
    this.inputGain.connect(this.inputHPF);
    
    // 3-stage cascading preamp
    this.inputHPF.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Bright cap (after preamp, before tone stack)
    this.saturation3.connect(this.brightCap);
    
    // Tone stack
    this.brightCap.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Master volume → sag → power amp
    this.treble.connect(this.masterVolume);
    if (this.powerSag) {
      this.masterVolume.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.masterVolume.connect(this.powerAmp);
    }
    
    // Power amp with presence as NFB (BEFORE power saturation)
    this.powerAmp.connect(this.presence);
    this.presence.connect(this.powerSaturation);
    
    // Output transformer
    this.powerSaturation.connect(this.outputTransformer);
    
    // Cabinet routing with CabinetSimulator
    this.outputTransformer.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.standbyGain);
    this.standbyGain.connect(this.output);
    
    // ============================================
    // INITIALIZE PARAMETERS
    // ============================================
    
    this.params = {
      // Front panel
      preamp_volume: 70, // Gain/Preamp Volume (0-10)
      bass: 60,
      mid: 50,
      treble: 70,
      presence: 60,
      master_volume: 50,
      
      // Input
      input_sensitivity: 0, // 0=high, 1=low
      
      // Back panel
      power_mode: 0, // 0=pentode (100W), 1=triode (50W)
      standby: false,
      
      // Effects loop
      fx_loop: false,
      
      // Cabinet (like other amps)
      cabinet_enabled: true,
      cabinet: '4x12_greenback', // Original JCM800 cabinet
      microphone: 'sm57',
      micPosition: 'edge'
    };
    
    this.applyInitialSettings();
  }
  
  applyInitialSettings() {
    // Preamp stages (cascading gain)
    this.preamp1.gain.value = 10; // High gain input
    this.preamp2.gain.value = 1.5; // Second stage
    this.preamp3.gain.value = 1.2; // Third stage
    
    // Master volume
    this.masterVolume.gain.value = 0.5;
    
    // Power amp (100W EL34)
    this.powerAmp.gain.value = 1.0;
    
    // Standby off initially (muted until turned on)
    this.standbyGain.gain.value = 0.0;
    
    // Pentode mode (full power)
    this.setPowerMode('pentode');
    
    // Input sensitivity (high by default)
    this.setInputSensitivity(true);
    
    // Initialize cabinet
    this.recreateCabinet();
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makePreampCurve(isCold = false) {
    const n = 65536;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      
      // 12AX7 preamp tube characteristic
      let y = Math.tanh(x * 6);
      
      // Marshall "sizzle" (high-frequency bite)
      y += 0.08 * Math.tanh(x * 12);
      
      if (isCold) {
        // COLD CLIPPER (2nd stage JCM800 character)
        // Leve assimetria e realce de ímpares
        y += 0.05 * Math.tanh(x * 9);
        if (x > 0) y *= 1.12;
        else y *= 0.96;
      } else {
        // British presence (normal stages)
        y += 0.06 * Math.sin(x * Math.PI * 8);
      }
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL34 power tube (British characteristic)
      let y = Math.tanh(x * 1.5);
      
      // EL34 power tube compression
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.4);
      }
      
      // EL34 asymmetry
      if (x > 0) {
        y *= 1.15;
      }
      
      curve[i] = y;
    }
    return curve;
  }
  
  makeTransformerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Output transformer saturation
      let y = Math.tanh(x * 1.2);
      
      // Add transformer harmonics (reduced intensity for IR compatibility)
      y += 0.05 * Math.tanh(x * 2.4) * 0.9; // 2nd harmonic
      y += 0.02 * Math.tanh(x * 3.6) * 0.9; // 3rd harmonic
      
      // Slight asymmetry
      if (x > 0) y *= 1.05;
      
      curve[i] = y * 0.95;
    }
    return curve;
  }
  
  // ============================================
  // BACK PANEL CONTROLS
  // ============================================
  
  setPowerMode(mode) {
    this.powerMode = mode;
    
    if (mode === 'pentode') {
      // PENTODE: Full 100W, more headroom, tighter
      this.powerAmp.gain.value = 1.0;
    } else {
      // TRIODE: Half power 50W, earlier breakup, warmer
      this.powerAmp.gain.value = 0.7;
    }
  }
  
  setStandby(isStandby) {
    this.standby = isStandby;
    const now = this.audioContext.currentTime;
    
    if (isStandby) {
      // Mute output
      this.standbyGain.gain.setTargetAtTime(0, now, 0.001);
    } else {
      // Active
      this.standbyGain.gain.setTargetAtTime(1, now, 0.001);
    }
  }
  
  setInputSensitivity(isHigh) {
    this.inputSensitivity = isHigh ? 'high' : 'low';
    
    if (isHigh) {
      // HIGH input (more gain)
      this.inputGain.gain.value = 1.0;
      this.inputHPF.gain.value = 0; // No attenuation
    } else {
      // LOW input (less gain, cleaner, slight treble cut)
      this.inputGain.gain.value = 0.5; // -6dB pad
      this.inputHPF.gain.value = -2; // -2dB treble attenuation
    }
  }
  
  recreateCabinet() {
    // Cleanup old cabinet properly
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Disconnect preCabinet
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    if (this.cabinetEnabled) {
      // Create new cabinet with current settings
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        // Fallback if cabinet creation fails
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      // Bypass cabinet
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  setFxLoop(enabled) {
    // Reconfigure routing for FX loop
    try {
      if (enabled) {
        // Disconnect current routing
        this.masterVolume.disconnect();
        
        // Route through FX loop
        this.masterVolume.connect(this.fxSend);
        if (this.powerSag) {
          this.fxReturn.connect(this.powerSag);
        } else {
          this.fxReturn.connect(this.powerAmp);
        }
        
        // FX send/return gains
        this.fxSend.gain.value = 1.0;
        this.fxReturn.gain.value = 1.0;
      } else {
        // Disconnect FX loop
        this.masterVolume.disconnect();
        this.fxSend.disconnect();
        this.fxReturn.disconnect();
        
        // Direct connection
        if (this.powerSag) {
          this.masterVolume.connect(this.powerSag);
        } else {
          this.masterVolume.connect(this.powerAmp);
        }
      }
    } catch (e) {
      console.warn('FX Loop routing error:', e);
    }
  }
  
  // ============================================
  // PARAMETER UPDATE
  // ============================================
  
  // Logarithmic volume mapping (more musical response)
  linLog01(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'preamp_volume':
      case 'gain': {
        // Preamp volume (0-10 scale)
        const v = value / 100; // 0..1
        const gainValue = 1 + (value / 10);
        this.preamp1.gain.setTargetAtTime(gainValue, now, 0.01);
        
        // BRIGHT CAP: more gain when volume is low (real JCM800 2203 behavior)
        const brightDb = (1 - v) * 6; // Up to +6dB at low volumes
        this.brightCap.gain.setTargetAtTime(brightDb, now, 0.02);
        break;
      }
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 6, now, 0.01);
        break;
      
      case 'master_volume':
      case 'master': {
        // Logarithmic volume response (more musical)
        const logValue = this.linLog01(value / 100);
        this.masterVolume.gain.setTargetAtTime(logValue, now, 0.01);
        break;
      }
      
      case 'input_sensitivity':
        this.setInputSensitivity(value === 0);
        break;
      
      case 'power_mode':
        this.setPowerMode(value === 0 ? 'pentode' : 'triode');
        break;
      
      case 'standby':
        this.setStandby(value);
        break;
      
      case 'fx_loop':
        this.params.fx_loop = !!value;
        this.setFxLoop(!!value);
        break;
      
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
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.inputHPF.disconnect();
    this.preamp1.disconnect();
    this.preamp2.disconnect();
    this.preamp3.disconnect();
    this.saturation1.disconnect();
    this.saturation2.disconnect();
    this.saturation3.disconnect();
    this.brightCap.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.masterVolume.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.outputTransformer.disconnect();
    this.postHPF.disconnect();
    this.postLPF.disconnect();
    this.standbyGain.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
  }
}

export default MarshallJCM800Amp;

