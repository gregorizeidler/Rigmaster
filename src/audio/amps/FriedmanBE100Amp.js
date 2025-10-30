import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class FriedmanBE100Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Friedman BE-100', 'friedman_be100');
    
    // FRIEDMAN BE-100 (Brown Eye)
    // Modern high-gain with vintage vibe - Jerry Cantrell signature
    // Based on modified Marshall Plexi circuit
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.beChannel = audioContext.createGain(); // Brown Eye
    
    // Active channel
    this.activeChannel = 'be'; // 'clean' or 'be'
    
    // ============================================
    // PREAMP (Modified Plexi circuit)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation3.curve = this.makePreampCurve();
    this.saturation4.curve = this.makePreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // FRIEDMAN "TIGHT" SWITCH (before first gain stage)
    // ============================================
    this.tightSwitch = false;
    this.tightFilter = audioContext.createBiquadFilter();
    this.tightFilter.type = 'highpass';
    this.tightFilter.frequency.value = 20; // Off by default
    this.tightFilter.Q.value = 0.707;
    
    // ============================================
    // C45 / BRIGHT CAP (before first gain stage)
    // ============================================
    this.brightCap = false;
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3500;
    this.brightFilter.gain.value = 0;
    
    // ============================================
    // FAT SWITCH (after saturation1 for more girth without mud)
    // ============================================
    this.fatSwitch = false;
    this.fatFilter = audioContext.createBiquadFilter();
    this.fatFilter.type = 'lowshelf';
    this.fatFilter.frequency.value = 120;
    this.fatFilter.gain.value = 0;
    
    // ============================================
    // SAT SWITCH (Friedman diode clipping between stages)
    // ============================================
    this.satEnabled = false;
    this.satClip = audioContext.createWaveShaper();
    this.satClip.curve = this.makeSatClipCurve();
    this.satClip.oversample = '4x';
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (soft gate after preamp)
    // ============================================
    // Friedman uses softer gating (not aggressive metal gate)
    this.noiseGate = this.createNoiseGate({
      thOpen: -58,      // Softer open threshold
      thClose: -66,     // Softer close threshold (gentle hysteresis)
      attack: 0.010,    // 10ms attack (slower, more natural)
      release: 0.15,    // 150ms release (smooth)
      rms: 0.020,       // 20ms RMS window (smoother response)
      peakMix: 0.25,    // More RMS-focused (75% RMS)
      floorDb: -75,     // Very soft floor (musical)
      holdMs: 15        // 15ms hold (gentle)
    });
    
    // ============================================
    // TONE STACK (Modified Marshall)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 150;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 650;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // ============================================
    // CHANNEL VOLUME (pre-phase inverter)
    // ============================================
    this.channelVolume = audioContext.createGain();
    
    // ============================================
    // POWER AMP (4x KT88 or EL34)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power supply sag (Friedman uses tube rectifier)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.13,      // 13% sag (tube rectifier)
      att: 0.005,       // 5ms attack
      relFast: 0.06,    // 60ms fast recovery
      relSlow: 0.23,    // 230ms slow recovery
      rmsMs: 22.0,      // 22ms RMS window
      shape: 1.5,       // Progressive/tube-like
      floor: 0.27,      // 27% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Power compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.10;
    
    // ============================================
    // DEPTH (Resonance - low shelf in power section)
    // ============================================
    this.depth = audioContext.createBiquadFilter();
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 100;
    this.depth.gain.value = 0;
    
    // ============================================
    // PRESENCE (in power amp section - more realistic)
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - BE CHANNEL (DEFAULT)
    // ============================================
    this.setupBEChannel();
    this.recreateCabinet();
    
    this.params = {
      channel: 1, // 0=clean, 1=be
      
      // Gain/Volume
      gain: 75,
      volume: 70,
      
      // Tone stack
      bass: 60,
      middle: 50,
      treble: 70,
      presence: 65,
      depth: 50,
      
      // Switches
      tight: false,
      fat: false,
      sat: false,
      c45: false,
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true
    };
    
    this.applyInitialSettings();
  }
  
  setupCleanChannel() {
    this.disconnectAll();
    
    // CLEAN CHANNEL - 2 gain stages with proper signal flow
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.tightFilter);
    this.tightFilter.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.fatFilter);
    this.fatFilter.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.noiseGate);
    this.noiseGate.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.channelVolume);
    if (this.powerSag) {
      this.channelVolume.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.depth);
    this.depth.connect(this.presence);
    this.presence.connect(this.powerSaturation);
    
    // Cabinet simulation (can be bypassed)
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  setupBEChannel() {
    this.disconnectAll();
    
    // BE CHANNEL - 4 cascading gain stages with SAT switch
    this.input.connect(this.beChannel);
    this.beChannel.connect(this.tightFilter);
    this.tightFilter.connect(this.brightFilter);
    this.brightFilter.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.fatFilter);
    this.fatFilter.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // SAT switch inserts diode clipping between saturation2 and preamp3
    if (this.satEnabled) {
      this.saturation2.connect(this.satClip);
      this.satClip.connect(this.preamp3);
    } else {
      this.saturation2.connect(this.preamp3);
    }
    
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.noiseGate);
    this.noiseGate.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.channelVolume);
    if (this.powerSag) {
      this.channelVolume.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.depth);
    this.depth.connect(this.presence);
    this.presence.connect(this.powerSaturation);
    
    // Cabinet simulation (can be bypassed)
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'be';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.beChannel.disconnect();
      this.tightFilter.disconnect();
      this.brightFilter.disconnect();
      this.fatFilter.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.satClip.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.noiseGate.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.channelVolume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.depth.disconnect();
      this.presence.disconnect();
      this.powerSaturation.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 8;
    this.preamp2.gain.value = 1.8;
    this.preamp3.gain.value = 1.5;
    this.preamp4.gain.value = 1.3;
    this.cleanChannel.gain.value = 0.6;
    this.beChannel.gain.value = 1.0;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // FRIEDMAN "BROWN EYE" - improved smoothness
      let y = Math.tanh(x * 5.8);
      
      // "SINGING" SUSTAIN (Friedman signature)
      y += 0.12 * Math.tanh(x * 10);
      
      // Smoother top end, less harsh
      if (Math.abs(y) > 0.6) {
        y *= 0.94;
      }
      
      // Moderate asymmetry for modern character
      if (x > 0) y *= 1.12;
      
      curve[i] = y * 0.84;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // KT88 power tubes (tight, powerful) - smoother
      let y = Math.tanh(x * 1.6);
      
      // KT88 compression - smoother top end
      if (Math.abs(y) > 0.65) {
        y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.45);
      }
      
      // Controlled modern bite
      y += 0.06 * Math.tanh(x * 8);
      
      if (x > 0) y *= 1.12;
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makeSatClipCurve() {
    // Friedman SAT switch - diode clipping
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Harder diode clipping
      let y = Math.tanh(x * 18);
      
      // Asymmetric diode response
      if (x > 0) {
        y *= 1.08;
      } else {
        y *= 0.98;
      }
      
      curve[i] = y * 0.7;
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
          this.setupBEChannel();
        }
        break;
      
      case 'gain':
        // Reduced range to avoid radio-saw at top
        this.preamp1.gain.setTargetAtTime(1 + (value / 12), now, 0.01);
        break;
      
      case 'volume': {
        // Channel volume (pre-phase inverter)
        const v = value / 100;
        this.channelVolume.gain.setTargetAtTime(v, now, 0.01);
        
        // Dynamic bright cap - more boost at lower volumes
        const brightDb = (1 - v) * 7; // Up to +7dB at low volumes
        this.brightFilter.gain.setTargetAtTime(this.brightCap ? brightDb : 0, now, 0.03);
        break;
      }
      
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
        // Depth/Resonance control in power section
        this.depth.gain.setTargetAtTime((value - 50) / 8, now, 0.02);
        break;
      
      case 'tight':
        this.tightSwitch = value;
        // Tight switch - HPF at 100Hz when on
        this.tightFilter.frequency.setTargetAtTime(value ? 100 : 20, now, 0.02);
        break;
      
      case 'fat':
        this.fatSwitch = value;
        // Fat switch - low shelf boost
        this.fatFilter.gain.setTargetAtTime(value ? 4.5 : 0, now, 0.02);
        break;
      
      case 'sat':
        // SAT switch - reconnect signal chain when toggled
        this.satEnabled = !!value;
        if (this.activeChannel === 'be') {
          this.setupBEChannel();
        }
        break;
      
      case 'c45':
        // C45 bright cap switch
        this.brightCap = !!value;
        // Update bright cap based on current volume
        const currentVolume = this.params.volume || 70;
        const v = currentVolume / 100;
        const brightDb = this.brightCap ? ((1 - v) * 7) : 0;
        this.brightFilter.gain.setTargetAtTime(brightDb, now, 0.02);
        break;
      
      case 'master': {
        // Logarithmic taper for musical control
        const linLog = (val) => 0.001 * Math.pow(1000, val);
        this.master.gain.setTargetAtTime(linLog(value / 100), now, 0.01);
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
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.cleanChannel.disconnect();
    this.beChannel.disconnect();
    this.tightFilter.disconnect();
    this.brightFilter.disconnect();
    this.fatFilter.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.satClip.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.noiseGate.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.channelVolume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.depth.disconnect();
    this.presence.disconnect();
    this.powerSaturation.disconnect();
    this.postHPF.disconnect();
    this.postLPF.disconnect();
    this.master.disconnect();
  }
}

export default FriedmanBE100Amp;

