import BaseEffect from '../effects/BaseEffect';

/**
 * AdvancedAmpSimulator - Component-Level Amp Modeling
 * 
 * Features:
 * - Preamp tube selection (12AX7, ECC83, 12AT7)
 * - Power tube selection (EL34, 6L6, KT88, EL84)
 * - Transformer modeling
 * - Speaker impedance simulation
 * - Bias adjustment (cold/hot)
 * - Power amp sag
 * - Class A/AB selection
 * - Negative feedback
 * - Damping control
 */

class AdvancedAmpSimulator extends BaseEffect {
  constructor(audioContext, id, ampType = 'clean') {
    super(audioContext, id, 'Advanced Amp', 'amp-advanced');
    
    this.ampType = ampType;
    
    // PREAMP STAGE
    this.preampTube = '12AX7'; // 12AX7, ECC83, 12AT7, 12AY7
    this.preampGain = audioContext.createGain();
    this.preampShaper = audioContext.createWaveShaper();
    
    // TONE STACK (Fender/Marshall/Mesa style)
    this.toneStack = {
      bass: audioContext.createBiquadFilter(),
      mid: audioContext.createBiquadFilter(),
      treble: audioContext.createBiquadFilter()
    };
    
    this.toneStack.bass.type = 'lowshelf';
    this.toneStack.bass.frequency.value = 100;
    this.toneStack.bass.gain.value = 0;
    
    this.toneStack.mid.type = 'peaking';
    this.toneStack.mid.frequency.value = 800;
    this.toneStack.mid.Q.value = 0.7;
    this.toneStack.mid.gain.value = 0;
    
    this.toneStack.treble.type = 'highshelf';
    this.toneStack.treble.frequency.value = 3000;
    this.toneStack.treble.gain.value = 0;
    
    // POWER AMP STAGE
    this.powerTube = 'EL34'; // EL34, 6L6, KT88, EL84
    this.powerAmpClass = 'AB'; // A, AB, B
    this.powerAmpGain = audioContext.createGain();
    this.powerAmpShaper = audioContext.createWaveShaper();
    
    // POWER AMP SAG (dynamic compression)
    this.sagCompressor = audioContext.createDynamicsCompressor();
    this.sagCompressor.threshold.value = -10;
    this.sagCompressor.knee.value = 30;
    this.sagCompressor.ratio.value = 8;
    this.sagCompressor.attack.value = 0.003;
    this.sagCompressor.release.value = 0.25;
    
    // TRANSFORMER MODELING
    this.transformerSaturation = audioContext.createWaveShaper();
    this.transformerFilter = audioContext.createBiquadFilter();
    this.transformerFilter.type = 'lowpass';
    this.transformerFilter.frequency.value = 8000;
    this.transformerFilter.Q.value = 0.707;
    
    // NEGATIVE FEEDBACK (tightness control)
    this.negativeFeedback = 0.5; // 0-1
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0;
    
    // SPEAKER LOAD (impedance simulation)
    this.speakerImpedance = 8; // 4, 8, 16 ohms
    this.speakerLoad = audioContext.createBiquadFilter();
    this.speakerLoad.type = 'highpass';
    this.speakerLoad.frequency.value = 80;
    
    // PRESENCE & RESONANCE (power amp controls)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 4000;
    this.presenceFilter.gain.value = 0;
    
    this.resonanceFilter = audioContext.createBiquadFilter();
    this.resonanceFilter.type = 'lowshelf';
    this.resonanceFilter.frequency.value = 120;
    this.resonanceFilter.gain.value = 0;
    
    // DAMPING (speaker cone control)
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 12000;
    this.dampingFilter.Q.value = 0.5;
    
    // BIAS ADJUSTMENT
    this.bias = 0.5; // 0 = cold (class B-like), 1 = hot (class A-like)
    
    // MASTER VOLUME
    this.masterVolume = audioContext.createGain();
    this.masterVolume.gain.value = 0.8;
    
    // Initialize amp type
    this.setAmpType(ampType);
    
    // ROUTING
    this.connectSignalChain();
  }
  
  /**
   * Connect signal chain
   */
  connectSignalChain() {
    // Input → Preamp
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampShaper);
    
    // Preamp → Tone Stack
    this.preampShaper.connect(this.toneStack.bass);
    this.toneStack.bass.connect(this.toneStack.mid);
    this.toneStack.mid.connect(this.toneStack.treble);
    
    // Tone Stack → Power Amp (with sag)
    this.toneStack.treble.connect(this.sagCompressor);
    this.sagCompressor.connect(this.powerAmpGain);
    this.powerAmpGain.connect(this.powerAmpShaper);
    
    // Power Amp → Transformer
    this.powerAmpShaper.connect(this.transformerSaturation);
    this.transformerSaturation.connect(this.transformerFilter);
    
    // Transformer → Presence/Resonance
    this.transformerFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.resonanceFilter);
    
    // → Speaker Load → Damping
    this.resonanceFilter.connect(this.speakerLoad);
    this.speakerLoad.connect(this.dampingFilter);
    
    // → Master Volume → Output
    this.dampingFilter.connect(this.masterVolume);
    this.masterVolume.connect(this.wetGain);
    
    // Wet/Dry mix
    this.wetGain.connect(this.output);
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  /**
   * Set amp type (clean, crunch, lead, metal)
   */
  setAmpType(type) {
    this.ampType = type;
    
    switch (type) {
      case 'clean':
        this.setCleanAmp();
        break;
      case 'crunch':
        this.setCrunchAmp();
        break;
      case 'lead':
        this.setLeadAmp();
        break;
      case 'metal':
        this.setMetalAmp();
        break;
      default:
        this.setCleanAmp();
    }
  }
  
  /**
   * Clean Amp (Fender-style)
   */
  setCleanAmp() {
    this.preampTube = '12AX7';
    this.powerTube = '6L6';
    this.powerAmpClass = 'AB';
    this.bias = 0.7; // Hot bias
    
    this.preampGain.gain.value = 1.5;
    this.preampShaper.curve = this.makeCleanCurve();
    
    this.powerAmpGain.gain.value = 0.8;
    this.powerAmpShaper.curve = this.makeCleanPowerAmpCurve();
    
    // Fender tone stack
    this.toneStack.bass.gain.value = 2;
    this.toneStack.mid.gain.value = 0;
    this.toneStack.treble.gain.value = 3;
    
    // Minimal sag
    this.sagCompressor.threshold.value = -5;
    this.sagCompressor.ratio.value = 2;
  }
  
  /**
   * Crunch Amp (Marshall-style)
   */
  setCrunchAmp() {
    this.preampTube = 'ECC83';
    this.powerTube = 'EL34';
    this.powerAmpClass = 'AB';
    this.bias = 0.5; // Medium bias
    
    this.preampGain.gain.value = 3;
    this.preampShaper.curve = this.makeCrunchCurve();
    
    this.powerAmpGain.gain.value = 1.2;
    this.powerAmpShaper.curve = this.makeCrunchPowerAmpCurve();
    
    // Marshall tone stack
    this.toneStack.bass.gain.value = 0;
    this.toneStack.mid.gain.value = 4;
    this.toneStack.mid.frequency.value = 1200;
    this.toneStack.treble.gain.value = 2;
    
    // Medium sag
    this.sagCompressor.threshold.value = -10;
    this.sagCompressor.ratio.value = 4;
  }
  
  /**
   * Lead Amp (Mesa Boogie-style)
   */
  setLeadAmp() {
    this.preampTube = '12AX7';
    this.powerTube = 'EL34';
    this.powerAmpClass = 'AB';
    this.bias = 0.4; // Cooler bias
    
    this.preampGain.gain.value = 8;
    this.preampShaper.curve = this.makeLeadCurve();
    
    this.powerAmpGain.gain.value = 1.5;
    this.powerAmpShaper.curve = this.makeLeadPowerAmpCurve();
    
    // Mesa tone stack
    this.toneStack.bass.gain.value = -2;
    this.toneStack.mid.gain.value = 6;
    this.toneStack.mid.frequency.value = 1500;
    this.toneStack.treble.gain.value = 4;
    
    // Heavy sag
    this.sagCompressor.threshold.value = -12;
    this.sagCompressor.ratio.value = 8;
  }
  
  /**
   * Metal Amp (ENGL-style)
   */
  setMetalAmp() {
    this.preampTube = '12AX7';
    this.powerTube = 'KT88';
    this.powerAmpClass = 'AB';
    this.bias = 0.3; // Cold bias
    
    this.preampGain.gain.value = 15;
    this.preampShaper.curve = this.makeMetalCurve();
    
    this.powerAmpGain.gain.value = 1.8;
    this.powerAmpShaper.curve = this.makeMetalPowerAmpCurve();
    
    // Metal tone stack
    this.toneStack.bass.gain.value = -2;
    this.toneStack.mid.gain.value = 8;
    this.toneStack.mid.frequency.value = 2000;
    this.toneStack.treble.gain.value = 6;
    
    // Tight sag
    this.sagCompressor.threshold.value = -15;
    this.sagCompressor.ratio.value = 12;
    this.sagCompressor.attack.value = 0.001;
  }
  
  /**
   * Set preamp tube type
   */
  setPreampTube(tubeType) {
    this.preampTube = tubeType;
    
    const tubeCharacteristics = {
      '12AX7': { gain: 100, warmth: 'high', harmonics: 'even' },
      'ECC83': { gain: 100, warmth: 'high', harmonics: 'balanced' },
      '12AT7': { gain: 60, warmth: 'medium', harmonics: 'clean' },
      '12AY7': { gain: 45, warmth: 'low', harmonics: 'bright' }
    };
    
    const tube = tubeCharacteristics[tubeType] || tubeCharacteristics['12AX7'];
    
    // Adjust gain based on tube type
    const currentGain = this.preampGain.gain.value;
    this.preampGain.gain.value = currentGain * (tube.gain / 100);
    
    // Regenerate curve with tube characteristics
    this.updatePreampCurve();
  }
  
  /**
   * Set power tube type
   */
  setPowerTube(tubeType) {
    this.powerTube = tubeType;
    
    const tubeCharacteristics = {
      'EL34': { power: 25, compression: 'high', tone: 'warm' },
      '6L6': { power: 30, compression: 'medium', tone: 'balanced' },
      'KT88': { power: 50, compression: 'low', tone: 'tight' },
      'EL84': { power: 12, compression: 'high', tone: 'bright' }
    };
    
    const tube = tubeCharacteristics[tubeType] || tubeCharacteristics['EL34'];
    
    // Adjust power amp based on tube type
    const currentGain = this.powerAmpGain.gain.value;
    this.powerAmpGain.gain.value = currentGain * (tube.power / 25);
    
    // Update power amp curve
    this.updatePowerAmpCurve();
  }
  
  /**
   * Set bias (0 = cold/class B, 1 = hot/class A)
   */
  setBias(value) {
    this.bias = Math.max(0, Math.min(1, value));
    
    // Bias affects distortion character
    this.updatePreampCurve();
    this.updatePowerAmpCurve();
  }
  
  /**
   * Set power amp sag amount
   */
  setSag(amount) {
    const now = this.audioContext.currentTime;
    
    // More sag = more compression
    const sagAmount = amount / 100;
    this.sagCompressor.ratio.setTargetAtTime(2 + sagAmount * 18, now, 0.01);
    this.sagCompressor.threshold.setTargetAtTime(-20 + sagAmount * 15, now, 0.01);
  }
  
  /**
   * Set negative feedback (0-100)
   */
  setNegativeFeedback(amount) {
    this.negativeFeedback = amount / 100;
    
    // More feedback = tighter low end, less distortion
    const now = this.audioContext.currentTime;
    this.speakerLoad.frequency.setTargetAtTime(60 + amount * 0.5, now, 0.01);
  }
  
  /**
   * Set speaker impedance
   */
  setSpeakerImpedance(ohms) {
    this.speakerImpedance = ohms;
    
    // Higher impedance = brighter tone
    const now = this.audioContext.currentTime;
    const frequencyMultiplier = ohms / 8;
    this.speakerLoad.frequency.setTargetAtTime(80 * frequencyMultiplier, now, 0.01);
  }
  
  /**
   * Set presence (high-freq boost)
   */
  setPresence(value) {
    const now = this.audioContext.currentTime;
    this.presenceFilter.gain.setTargetAtTime(value, now, 0.01);
  }
  
  /**
   * Set resonance (low-freq response)
   */
  setResonance(value) {
    const now = this.audioContext.currentTime;
    this.resonanceFilter.gain.setTargetAtTime(value, now, 0.01);
  }
  
  /**
   * Set damping (speaker cone damping)
   */
  setDamping(value) {
    const now = this.audioContext.currentTime;
    // More damping = less high-freq
    this.dampingFilter.frequency.setTargetAtTime(20000 - value * 80, now, 0.01);
  }
  
  /**
   * Update preamp curve based on current settings
   */
  updatePreampCurve() {
    switch (this.ampType) {
      case 'clean':
        this.preampShaper.curve = this.makeCleanCurve();
        break;
      case 'crunch':
        this.preampShaper.curve = this.makeCrunchCurve();
        break;
      case 'lead':
        this.preampShaper.curve = this.makeLeadCurve();
        break;
      case 'metal':
        this.preampShaper.curve = this.makeMetalCurve();
        break;
    }
  }
  
  /**
   * Update power amp curve based on current settings
   */
  updatePowerAmpCurve() {
    switch (this.ampType) {
      case 'clean':
        this.powerAmpShaper.curve = this.makeCleanPowerAmpCurve();
        break;
      case 'crunch':
        this.powerAmpShaper.curve = this.makeCrunchPowerAmpCurve();
        break;
      case 'lead':
        this.powerAmpShaper.curve = this.makeLeadPowerAmpCurve();
        break;
      case 'metal':
        this.powerAmpShaper.curve = this.makeMetalPowerAmpCurve();
        break;
    }
  }
  
  // ============== TRANSFER FUNCTIONS ==============
  
  makeCleanCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 0.5 * (1 + this.bias * 0.2));
    }
    
    return curve;
  }
  
  makeCrunchCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 2 * (1 + this.bias * 0.5));
      
      // Add 3rd harmonic
      y += 0.1 * Math.sin(x * Math.PI * 3);
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  makeLeadCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 4 * (1 + this.bias * 0.3));
      y = Math.tanh(y * 2);
      y = Math.tanh(y * 1.5);
      
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  makeMetalCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 8 * (1 + this.bias * 0.2));
      y = Math.tanh(y * 3);
      y = Math.tanh(y * 2);
      y = Math.tanh(y * 1.5);
      
      if (x > 0) {
        y *= 1.3;
      } else {
        y *= 0.85;
      }
      
      curve[i] = y * 0.75;
    }
    
    return curve;
  }
  
  // Power amp curves (with transformer saturation)
  
  makeCleanPowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * (0.8 + this.bias * 0.4));
    }
    
    return curve;
  }
  
  makeCrunchPowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * (1.2 + this.bias * 0.6));
      
      // Transformer saturation
      y += 0.05 * Math.sin(x * Math.PI * 2);
      
      curve[i] = y * 0.95;
    }
    
    return curve;
  }
  
  makeLeadPowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * (1.5 + this.bias * 0.8));
      y = Math.tanh(y * 1.3);
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  makeMetalPowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * (2 + this.bias * 0.5));
      y = Math.tanh(y * 1.8);
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  /**
   * Update parameter
   */
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'type':
        this.setAmpType(value);
        break;
      case 'gain':
        this.preampGain.gain.setTargetAtTime(value / 10, now, 0.01);
        break;
      case 'bass':
        this.toneStack.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'mid':
        this.toneStack.mid.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'treble':
        this.toneStack.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'presence':
        this.setPresence((value - 50) / 10);
        break;
      case 'resonance':
        this.setResonance((value - 50) / 10);
        break;
      case 'master':
        this.masterVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'preampTube':
        this.setPreampTube(value);
        break;
      case 'powerTube':
        this.setPowerTube(value);
        break;
      case 'bias':
        this.setBias(value / 100);
        break;
      case 'sag':
        this.setSag(value);
        break;
      case 'negativeFeedback':
        this.setNegativeFeedback(value);
        break;
      case 'impedance':
        this.setSpeakerImpedance(value);
        break;
      case 'damping':
        this.setDamping(value);
        break;
    }
  }
}

export default AdvancedAmpSimulator;

