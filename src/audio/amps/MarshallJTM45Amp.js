import BaseAmp from './BaseAmp.js';

class MarshallJTM45Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JTM45', 'marshall_jtm45');
    
    // MARSHALL JTM45 (1962 Original)
    // THE first Marshall - virtually a Fender Bassman clone
    // Eric Clapton (Bluesbreakers), early British rock
    
    // ============================================
    // 4 INPUT JACKS (High/Low x2)
    // ============================================
    this.highInput = audioContext.createGain();
    this.lowInput = audioContext.createGain();
    
    // Active input
    this.activeInput = 'high'; // 'high' or 'low'
    
    // ============================================
    // PREAMP (ECC83 tubes - 3 stages)
    // ============================================
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
    
    // ============================================
    // TONE STACK (Identical to Bassman)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 500;
    this.middle.Q.value = 0.7;
    this.middle.gain.value = -2; // Slight scoop
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 0;
    
    // ============================================
    // "BLUESBREAKER" CHARACTERISTIC
    // ============================================
    // The JTM45 with Greenback speakers = THE Bluesbreaker sound
    this.bluesbreaker = audioContext.createBiquadFilter();
    this.bluesbreaker.type = 'peaking';
    this.bluesbreaker.frequency.value = 1000; // Mid-range warmth
    this.bluesbreaker.Q.value = 1.5;
    this.bluesbreaker.gain.value = 3;
    
    // ============================================
    // POWER AMP (2x KT66 or 5881 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // KT66 compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -20;
    this.powerComp.knee.value = 15;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.01;
    this.powerComp.release.value = 0.15;
    
    // ============================================
    // VOLUME CONTROLS
    // ============================================
    this.volume1 = audioContext.createGain(); // Preamp volume
    this.volume2 = audioContext.createGain(); // Master volume
    
    // ============================================
    // ROUTING - HIGH INPUT (DEFAULT)
    // ============================================
    this.setupHighInput();
    
    this.params = {
      input: 1, // 0=low, 1=high
      
      // Volumes
      volume: 60,
      master: 70,
      
      // Tone stack
      bass: 55,
      middle: 50,
      treble: 65,
      presence: 55
    };
    
    this.applyInitialSettings();
  }
  
  setupHighInput() {
    this.disconnectAll();
    
    // HIGH INPUT - More gain
    this.input.connect(this.highInput);
    this.highInput.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Volume
    this.saturation3.connect(this.volume1);
    
    // Tone stack
    this.volume1.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.bluesbreaker);
    this.bluesbreaker.connect(this.presence);
    
    // Power amp
    this.presence.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.volume2);
    this.volume2.connect(this.output);
    
    this.activeInput = 'high';
  }
  
  setupLowInput() {
    this.disconnectAll();
    
    // LOW INPUT - Less gain, more clean headroom
    this.input.connect(this.lowInput);
    this.lowInput.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Skip 3rd gain stage for lower gain
    this.saturation2.connect(this.volume1);
    
    // Tone stack
    this.volume1.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.bluesbreaker);
    this.bluesbreaker.connect(this.presence);
    
    // Power amp
    this.presence.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.volume2);
    this.volume2.connect(this.output);
    
    this.activeInput = 'low';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.highInput.disconnect();
      this.lowInput.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.volume1.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.bluesbreaker.disconnect();
      this.presence.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.volume2.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP
    // ============================================
    this.preamp1.gain.value = 5; // Moderate gain
    this.preamp2.gain.value = 1.5;
    this.preamp3.gain.value = 1.3;
    
    // ============================================
    // INPUTS
    // ============================================
    this.highInput.gain.value = 1.2;
    this.lowInput.gain.value = 0.5;
    
    // ============================================
    // VOLUMES
    // ============================================
    this.volume1.gain.value = 0.6;
    this.volume2.gain.value = 0.7;
    
    // ============================================
    // POWER AMP (2x KT66)
    // ============================================
    this.powerAmp.gain.value = 1.1;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // JTM45 PREAMP - similar to Bassman but slightly warmer
      let y = Math.tanh(x * 3);
      
      // BRITISH "WARMTH" (compared to American Fender)
      y += 0.12 * Math.tanh(x * 5);
      
      // Early breakup (not as clean as Fender)
      if (Math.abs(x) > 0.4) {
        y *= 0.94;
      }
      
      // Asymmetry
      if (x > 0) y *= 1.05;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 2x KT66 POWER TUBES (British characteristic)
      let y = Math.tanh(x * 1.6);
      
      // KT66 sag and compression
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.5);
      }
      
      // BLUESBREAKER "SINGING" SUSTAIN
      y += 0.1 * Math.tanh(x * 4);
      
      // British presence
      y += 0.06 * Math.sin(x * Math.PI * 6);
      
      // Asymmetry
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // INPUT SELECTION
      // ============================================
      case 'input':
        if (value === 0) {
          this.setupLowInput();
        } else {
          this.setupHighInput();
        }
        break;
      
      // ============================================
      // VOLUME
      // ============================================
      case 'volume':
      case 'gain':
        this.volume1.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'master':
        this.volume2.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // TONE STACK
      // ============================================
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
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.highInput.disconnect();
    this.lowInput.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.volume1.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.bluesbreaker.disconnect();
    this.presence.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.volume2.disconnect();
  }
}

export default MarshallJTM45Amp;

