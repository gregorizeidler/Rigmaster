import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MarshallJTM45Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JTM45', 'marshall_jtm45');
    
    // MARSHALL JTM45 (1962 Original)
    // THE first Marshall - virtually a Fender Bassman clone
    // Eric Clapton (Bluesbreakers), early British rock
     // Features: 4 inputs (High/Low x2), 2 channels (Normal/Bright), GZ34 rectifier
    // Speakers: 2×12 Celestion Greenbacks (Bluesbreaker combo)
    
    // ============================================
    // 4 INPUT JACKS (High/Low x2)
    // ============================================
    this.highInput = audioContext.createGain();
    this.lowInput = audioContext.createGain();
    this.padLow = audioContext.createGain();
    this.padLow.gain.value = 0.5; // ~-6 dB pad for low input
    
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
    // TWO CHANNELS (Normal/Bright) + Jumper Mix
    // ============================================
    this.chNormalVol = audioContext.createGain();
    this.chBrightVol = audioContext.createGain();
    
    // Bright channel has a high-shelf boost
    this.brightShelf = audioContext.createBiquadFilter();
    this.brightShelf.type = 'highshelf';
    this.brightShelf.frequency.value = 3000;
    this.brightShelf.gain.value = 3; // +3 dB boost for bright channel
    
    // Channel blend (summing both channels - "jumper" technique)
    this.channelBlend = audioContext.createGain();
    
    // ============================================
    // BRIGHT CAP (Volume-dependent brightness)
    // ============================================
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2500;
    this.brightCap.gain.value = 0;
    
    // ============================================
    // TONE STACK (Identical to Bassman)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
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
    // GZ34 RECTIFIER SAG (bloom/compression)
    // ============================================
    this.rectifierSag = audioContext.createDynamicsCompressor();
    this.rectifierSag.threshold.value = -24;
    this.rectifierSag.knee.value = 20;
    this.rectifierSag.ratio.value = 1.8;
    this.rectifierSag.attack.value = 0.01;
    this.rectifierSag.release.value = 0.18;
    
    // ============================================
    // PRESENCE (NFB - Negative Feedback)
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 0;
    
    // ============================================
    // POWER AMP (2x KT66 or 5881 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // POWER SUPPLY SAG - AUDIOWORKLET (GZ34 tube rectifier)
    // JTM45 uses GZ34 tube rectifier (vintage heavy sag)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.14,      // 14% sag (GZ34 heavy vintage sag)
      att: 0.010,       // 10ms attack (gentle vintage)
      relFast: 0.09,    // 90ms fast recovery
      relSlow: 0.28,    // 280ms slow recovery (vintage breathing)
      rmsMs: 25.0,      // 25ms RMS window (slow/vintage)
      shape: 1.6,       // Progressive (vintage character)
      floor: 0.26,      // 26% minimum headroom
      peakMix: 0.28     // More RMS-focused (vintage smooth)
    });
    
    // Power compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.010;
    this.powerComp.release.value = 0.10;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_greenback';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
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
      
      // Two-channel controls (jumper setup)
      ch_normal: 60,
      ch_bright: 40,
      
      // Volumes
      volume: 60,
      master: 70,
      
      // Tone stack
      bass: 55,
      middle: 50,
      treble: 65,
      presence: 55,
      
      // Cabinet
      cabinet_enabled: 1
    };
    
    this.applyInitialSettings();
    this.recreateCabinet();
  }
  
  setupHighInput() {
    this.disconnectAll();
    
    // HIGH INPUT - Full gain path
    this.input.connect(this.highInput);
    this.highInput.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Channel split after preamp2 (Normal/Bright)
    // Normal channel (flat)
    this.saturation2.connect(this.chNormalVol);
    this.chNormalVol.connect(this.channelBlend);
    
    // Bright channel (high-shelf boost)
    this.saturation2.connect(this.brightShelf);
    this.brightShelf.connect(this.chBrightVol);
    this.chBrightVol.connect(this.channelBlend);
    
    // Continue with third preamp stage
    this.channelBlend.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Volume with bright cap
    this.saturation3.connect(this.volume1);
    this.volume1.connect(this.brightCap);
    
    // Tone stack
    this.brightCap.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.bluesbreaker);
    
    // Power section with sag
    if (this.powerSag) {
      this.bluesbreaker.connect(this.powerSag);
      this.powerSag.connect(this.rectifierSag);
    } else {
      this.bluesbreaker.connect(this.rectifierSag);
    }
    this.rectifierSag.connect(this.presence);
    this.presence.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // Cabinet routing (can be bypassed)
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.volume2);
    
    this.volume2.connect(this.output);
    
    this.activeInput = 'high';
  }
  
  setupLowInput() {
    this.disconnectAll();
    
    // LOW INPUT - Pad before first stage (not bypassing any stages!)
    this.input.connect(this.lowInput);
    this.lowInput.connect(this.padLow);
    this.padLow.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Channel split after preamp2 (Normal/Bright)
    // Normal channel (flat)
    this.saturation2.connect(this.chNormalVol);
    this.chNormalVol.connect(this.channelBlend);
    
    // Bright channel (high-shelf boost)
    this.saturation2.connect(this.brightShelf);
    this.brightShelf.connect(this.chBrightVol);
    this.chBrightVol.connect(this.channelBlend);
    
    // Continue with third preamp stage
    this.channelBlend.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Volume with bright cap
    this.saturation3.connect(this.volume1);
    this.volume1.connect(this.brightCap);
    
    // Tone stack
    this.brightCap.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.bluesbreaker);
    
    // Power section with sag
    if (this.powerSag) {
      this.bluesbreaker.connect(this.powerSag);
      this.powerSag.connect(this.rectifierSag);
    } else {
      this.bluesbreaker.connect(this.rectifierSag);
    }
    this.rectifierSag.connect(this.presence);
    this.presence.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // Cabinet routing (can be bypassed)
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.volume2);
    
    this.volume2.connect(this.output);
    
    this.activeInput = 'low';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.highInput.disconnect();
      this.lowInput.disconnect();
      this.padLow.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.chNormalVol.disconnect();
      this.chBrightVol.disconnect();
      this.brightShelf.disconnect();
      this.channelBlend.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.volume1.disconnect();
      this.brightCap.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.bluesbreaker.disconnect();
      this.powerComp.disconnect();
      this.rectifierSag.disconnect();
      this.presence.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.cabPresence.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
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
    this.lowInput.gain.value = 1.0; // Pad is applied separately
    
    // ============================================
    // CHANNELS (Default jumper mix)
    // ============================================
    this.chNormalVol.gain.value = 0.6; // 60%
    this.chBrightVol.gain.value = 0.4; // 40%
    
    // ============================================
    // VOLUMES (will be set by updateParameter)
    // ============================================
    this.volume1.gain.value = 0.6;
    this.volume2.gain.value = 0.7;
    
    // ============================================
    // POWER AMP (2x KT66)
    // ============================================
    this.powerAmp.gain.value = 1.1;
  }
  
  // Helper function for logarithmic volume taper
  linLog01(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  makePreampCurve() {
    const samples = 65536;
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
    const samples = 65536;
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
      
      // Low-end punch (KT66 characteristic)
      y += 0.12 * Math.tanh(x * 3.2);
      
      // Reduced high-end harshness (less glassy than 6L6)
      y += 0.04 * Math.sin(x * Math.PI * 5);
      
      // Asymmetry
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.85;
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
      // CHANNEL VOLUMES (Normal/Bright)
      // ============================================
      case 'ch_normal':
        this.chNormalVol.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'ch_bright':
        this.chBrightVol.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // VOLUME (with bright cap interaction)
      // ============================================
      case 'volume':
      case 'gain': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.volume1.gain.setTargetAtTime(logV, now, 0.01);
        
        // Bright cap: more gain in high frequencies when volume is low
        const brightGain = (1 - v) * 6; // Up to +6 dB when volume is low
        this.brightCap.gain.setTargetAtTime(brightGain, now, 0.02);
        break;
      }
      
      case 'master': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.volume2.gain.setTargetAtTime(logV, now, 0.01);
        break;
      }
      
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
  
  // Preset configurations
  getPresets() {
    return {
      'Beano/Bluesbreaker': {
        input: 1, // high
        ch_normal: 65,
        ch_bright: 35,
        volume: 60,
        bass: 55,
        middle: 52,
        treble: 64,
        presence: 56,
        master: 50,
        cabinet_enabled: 1
      },
      'Clean American': {
        input: 0, // low
        ch_normal: 70,
        ch_bright: 10,
        volume: 35,
        bass: 60,
        middle: 48,
        treble: 58,
        presence: 40,
        master: 65,
        cabinet_enabled: 1
      },
      'Cranked Classic': {
        input: 1, // high
        ch_normal: 50,
        ch_bright: 50,
        volume: 75,
        bass: 58,
        middle: 45,
        treble: 68,
        presence: 62,
        master: 45,
        cabinet_enabled: 1
      },
      'British Crunch': {
        input: 1, // high
        ch_normal: 60,
        ch_bright: 45,
        volume: 68,
        bass: 52,
        middle: 50,
        treble: 66,
        presence: 58,
        master: 55,
        cabinet_enabled: 1
      }
    };
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.highInput.disconnect();
    this.lowInput.disconnect();
    this.padLow.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.chNormalVol.disconnect();
    this.chBrightVol.disconnect();
    this.brightShelf.disconnect();
    this.channelBlend.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.volume1.disconnect();
    this.brightCap.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.bluesbreaker.disconnect();
    this.powerComp.disconnect();
    this.rectifierSag.disconnect();
    this.presence.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.postHPF.disconnect();
    this.postLPF.disconnect();
    this.cabPresence.disconnect();
    this.preCabinet.disconnect();
    this.postCabinet.disconnect();
    if (this.cabinet && this.cabinet.input) {
      this.cabinet.input.disconnect();
    }
    if (this.cabinet && this.cabinet.output) {
      this.cabinet.output.disconnect();
    }
    this.volume2.disconnect();
  }
}

export default MarshallJTM45Amp;
