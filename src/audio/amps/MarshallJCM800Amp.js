import BaseAmp from './BaseAmp.js';

class MarshallJCM800Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JCM800', 'marshall_jcm800');
    
    // MARSHALL JCM800 2203 (100W Master Volume Head)
    // THE rock amp - AC/DC, Slash, Zakk Wylde
    
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
    
    // Cabinet simulation (basic HPF + LPF when no IR is used)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 40;
    
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 9000;
    this.postLPF.Q.value = 0.7;
    
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
    
    this.input.connect(this.inputGain);
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
    
    // Master volume (will be reconfigured if FX loop is enabled)
    this.treble.connect(this.masterVolume);
    this.masterVolume.connect(this.powerAmp);
    
    // Power amp with presence as NFB (BEFORE power saturation)
    this.powerAmp.connect(this.presence);
    this.presence.connect(this.powerSaturation);
    
    // Output transformer
    this.powerSaturation.connect(this.outputTransformer);
    
    // Cabinet simulation (basic HPF + LPF)
    this.outputTransformer.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.standbyGain);
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
    
    // Cabinet enabled by default
    this.setCabinetEnabled(true);
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makePreampCurve(isCold = false) {
    const n = 44100;
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
    const samples = 44100;
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
    const samples = 44100;
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
  
  setCabinetEnabled(enabled) {
    // Enable/disable basic cabinet simulation
    if (enabled) {
      this.postHPF.frequency.value = 40;
      this.postLPF.frequency.value = 9000;
    } else {
      // Bypass cabinet sim (wider frequency response)
      this.postHPF.frequency.value = 20;
      this.postLPF.frequency.value = 20000;
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
        this.fxReturn.connect(this.powerAmp);
        
        // FX send/return gains
        this.fxSend.gain.value = 1.0;
        this.fxReturn.gain.value = 1.0;
      } else {
        // Disconnect FX loop
        this.masterVolume.disconnect();
        this.fxSend.disconnect();
        this.fxReturn.disconnect();
        
        // Direct connection
        this.masterVolume.connect(this.powerAmp);
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
        this.params.cabinet_enabled = !!value;
        this.setCabinetEnabled(!!value);
        break;
      
      case 'cabinet':
      case 'microphone':
      case 'micPosition':
        // Cabinet parameters (handled by UI/IR loader)
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

