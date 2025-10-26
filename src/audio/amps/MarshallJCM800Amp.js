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
    
    // Preamp stages (3x 12AX7 cascading)
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation3.curve = this.makePreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
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
    
    // Presence control (negative feedback in power amp)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 0;
    
    // Master Volume (post-preamp)
    this.masterVolume = audioContext.createGain();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // Power amp (EL34 x 4 tubes - 100W)
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Output transformer
    this.outputTransformer = audioContext.createWaveShaper();
    this.outputTransformer.curve = this.makeTransformerCurve();
    
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
    
    // 3-stage cascading preamp
    this.inputGain.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Tone stack
    this.saturation3.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Master volume
    this.treble.connect(this.masterVolume);
    
    // Power amp
    this.masterVolume.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.presence);
    
    // Output transformer
    this.presence.connect(this.outputTransformer);
    this.outputTransformer.connect(this.standbyGain);
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
      fx_loop: false
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
    
    // Standby on
    this.standbyGain.gain.value = 1.0;
    
    // Pentode mode (full power)
    this.setPowerMode('pentode');
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 12AX7 preamp tube characteristic
      let y = Math.tanh(x * 6);
      
      // Marshall "sizzle" (high-frequency bite)
      y += 0.08 * Math.tanh(x * 12);
      
      // British presence
      y += 0.06 * Math.sin(x * Math.PI * 8);
      
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
      
      // Add transformer harmonics
      y += 0.05 * Math.tanh(x * 2.4); // 2nd harmonic
      y += 0.02 * Math.tanh(x * 3.6); // 3rd harmonic
      
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
    } else {
      // LOW input (less gain, cleaner)
      this.inputGain.gain.value = 0.5;
    }
  }
  
  // ============================================
  // PARAMETER UPDATE
  // ============================================
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'preamp_volume':
      case 'gain':
        // Preamp volume (0-10 scale)
        const gainValue = 1 + (value / 10);
        this.preamp1.gain.setTargetAtTime(gainValue, now, 0.01);
        break;
      
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
      case 'master':
        this.masterVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'input_sensitivity':
        this.setInputSensitivity(value === 0);
        break;
      
      case 'power_mode':
        this.setPowerMode(value === 0 ? 'pentode' : 'triode');
        break;
      
      case 'standby':
        this.setStandby(value);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.preamp1.disconnect();
    this.preamp2.disconnect();
    this.preamp3.disconnect();
    this.saturation1.disconnect();
    this.saturation2.disconnect();
    this.saturation3.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.masterVolume.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.outputTransformer.disconnect();
    this.standbyGain.disconnect();
  }
}

export default MarshallJCM800Amp;

