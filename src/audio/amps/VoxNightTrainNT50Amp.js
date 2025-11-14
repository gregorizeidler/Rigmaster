import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class VoxNightTrainNT50Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox Night Train NT50H-G2', 'vox_nighttrain_nt50');
    
    // ============================================
    // VOX NIGHT TRAIN NT50H-G2 (50W Class A/B)
    // ============================================
    // Modern British boutique amp with vintage Vox DNA
    // 2 channels (Clean + Overdrive)
    // 2x EL34 power tubes (50W)
    // 3x 12AX7 preamp tubes
    // 
    // FEATURES:
    // - Clean channel: Volume, Bright switch
    // - Overdrive channel: Gain, Volume, Voice switch (Bright/Thick)
    // - Shared EQ: Bass, Middle, Treble
    // - Master Volume
    // - Gain Boost switch (+6dB)
    // - Authentic Vox chime with modern gain capabilities
    // ============================================
    
    // ============================================
    // CHANNEL SELECTOR
    // ============================================
    this.activeChannel = 'clean'; // 'clean' or 'overdrive'
    
    // ============================================
    // CLEAN CHANNEL (Vox-style clean with chime)
    // ============================================
    this.cleanInput = audioContext.createGain();
    this.cleanVolume = audioContext.createGain();
    
    // Clean preamp (single 12AX7 stage)
    this.cleanPreamp = audioContext.createGain();
    this.cleanSaturation = audioContext.createWaveShaper();
    this.cleanSaturation.curve = this.makeVoxCleanCurve();
    this.cleanSaturation.oversample = '4x';
    
    // Bright switch (Clean channel)
    this.cleanBrightCap = audioContext.createBiquadFilter();
    this.cleanBrightCap.type = 'highshelf';
    this.cleanBrightCap.frequency.value = 3000;
    this.cleanBrightCap.gain.value = 0; // Controlled by bright switch
    
    // Vox "Chime" characteristic (upper mids)
    this.voxChime = audioContext.createBiquadFilter();
    this.voxChime.type = 'peaking';
    this.voxChime.frequency.value = 2200;
    this.voxChime.Q.value = 2.5;
    this.voxChime.gain.value = 4; // +4dB Vox sparkle
    
    // ============================================
    // OVERDRIVE CHANNEL (High-gain British)
    // ============================================
    this.overdriveInput = audioContext.createGain();
    this.overdriveGain = audioContext.createGain();
    this.overdriveVolume = audioContext.createGain();
    
    // Overdrive preamp (2x 12AX7 cascaded)
    this.odPreamp1 = audioContext.createGain();
    this.odSaturation1 = audioContext.createWaveShaper();
    this.odSaturation1.curve = this.makeOverdriveCurve(1);
    this.odSaturation1.oversample = '4x';
    
    this.odPreamp2 = audioContext.createGain();
    this.odSaturation2 = audioContext.createWaveShaper();
    this.odSaturation2.curve = this.makeOverdriveCurve(2);
    this.odSaturation2.oversample = '4x';
    
    // Voice switch (Bright/Thick)
    this.voiceSwitch = 'bright'; // 'bright' or 'thick'
    this.voiceFilter = audioContext.createBiquadFilter();
    this.voiceFilter.type = 'highshelf';
    this.voiceFilter.frequency.value = 2500;
    this.voiceFilter.gain.value = 3; // +3dB for bright
    
    // Gain Boost switch (+6dB)
    this.gainBoost = false;
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.0; // 1.0 = normal, 2.0 = +6dB
    
    // ============================================
    // CHANNEL MIXER
    // ============================================
    this.channelMixer = audioContext.createGain();
    
    // ============================================
    // SHARED TONE STACK (Vox-style TMB)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle = audioContext.createBiquadFilter();
    this.middle.type = 'peaking';
    this.middle.frequency.value = 650;
    this.middle.Q.value = 1.4;
    this.middle.gain.value = 0;
    
    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // Vox "Cut" control simulation (treble presence)
    this.voxCut = audioContext.createBiquadFilter();
    this.voxCut.type = 'highshelf';
    this.voxCut.frequency.value = 5000;
    this.voxCut.gain.value = 2; // Signature Vox high-end air
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume = audioContext.createGain();
    
    // ============================================
    // POWER AMP (2x EL34 - 50W Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    
    // Power supply sag (EL34 with silicon rectifier)
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.09,      // 9% sag (silicon rectifier - less than tube)
      att: 0.005,       // 5ms attack (fast/modern)
      relFast: 0.05,    // 50ms fast recovery
      relSlow: 0.18,    // 180ms slow recovery
      rmsMs: 12.0,      // 12ms RMS window (tight/modern)
      shape: 1.2,       // Less progressive (modern response)
      floor: 0.32,      // 32% minimum headroom (tighter)
      peakMix: 0.35     // Balanced peak/RMS
    });
    
    // EL34 power tube saturation
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeEL34PowerCurve();
    this.powerSaturation.oversample = '4x';
    
    // Output transformer (modern British)
    this.outputTransformer = audioContext.createWaveShaper();
    this.outputTransformer.curve = this.makeTransformerCurve();
    this.outputTransformer.oversample = '2x';
    
    // Post-power filtering
    this.postPowerHPF = audioContext.createBiquadFilter();
    this.postPowerHPF.type = 'highpass';
    this.postPowerHPF.frequency.value = 80;
    this.postPowerHPF.Q.value = 0.7;
    
    this.postPowerLPF = audioContext.createBiquadFilter();
    this.postPowerLPF.type = 'lowpass';
    this.postPowerLPF.frequency.value = 9000;
    this.postPowerLPF.Q.value = 0.7;
    
    // ============================================
    // CABINET SIMULATOR (2x12" Vox with Celestion)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_greenback'; // Vox NT212 cabinet
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // STANDBY SWITCH
    // ============================================
    this.standby = false;
    this.standbyGain = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    this.setupChannelRouting();
    
    // ============================================
    // PARAMETERS
    // ============================================
    this.params = {
      // Channel selection
      channel: 0, // 0=clean, 1=overdrive
      
      // Clean channel
      clean_volume: 50,
      clean_bright: false,
      
      // Overdrive channel
      od_gain: 60,
      od_volume: 50,
      od_voice: 0, // 0=bright, 1=thick
      od_boost: false,
      
      // Shared tone stack
      bass: 50,
      middle: 50,
      treble: 60,
      
      // Master
      master_volume: 70,
      
      // Power
      standby: false,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '2x12_greenback',
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
    // Clean channel
    this.cleanPreamp.gain.value = 3.5;
    this.cleanVolume.gain.value = 0.5;
    
    // Overdrive channel
    this.odPreamp1.gain.value = 8;
    this.odPreamp2.gain.value = 1.5;
    this.overdriveGain.gain.value = 0.6;
    this.overdriveVolume.gain.value = 0.5;
    
    // Power amp
    this.powerAmp.gain.value = 1.1;
    
    // Master
    this.masterVolume.gain.value = 0.7;
    
    // Standby (off initially = muted)
    this.standbyGain.gain.value = 0.0;
    
    // Set clean channel active by default
    this.setChannel('clean');
  }
  
  // ============================================
  // CHANNEL ROUTING
  // ============================================
  setupChannelRouting() {
    this.disconnectAll();
    
    if (this.activeChannel === 'clean') {
      // CLEAN CHANNEL ROUTING
      this.input.connect(this.cleanInput);
      this.cleanInput.connect(this.cleanPreamp);
      this.cleanPreamp.connect(this.cleanSaturation);
      this.cleanSaturation.connect(this.cleanBrightCap);
      this.cleanBrightCap.connect(this.voxChime);
      this.voxChime.connect(this.cleanVolume);
      this.cleanVolume.connect(this.channelMixer);
    } else {
      // OVERDRIVE CHANNEL ROUTING
      this.input.connect(this.overdriveInput);
      this.overdriveInput.connect(this.overdriveGain);
      this.overdriveGain.connect(this.boostGain);
      
      // Cascaded overdrive stages
      this.boostGain.connect(this.odPreamp1);
      this.odPreamp1.connect(this.odSaturation1);
      this.odSaturation1.connect(this.odPreamp2);
      this.odPreamp2.connect(this.odSaturation2);
      
      // Voice switch and volume
      this.odSaturation2.connect(this.voiceFilter);
      this.voiceFilter.connect(this.overdriveVolume);
      this.overdriveVolume.connect(this.channelMixer);
    }
    
    // Shared tone stack → master → power amp
    this.channelMixer.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.voxCut);
    this.voxCut.connect(this.masterVolume);
    
    // Power section with sag
    if (this.powerSag) {
      this.masterVolume.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.masterVolume.connect(this.powerAmp);
    }
    
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputTransformer);
    
    // Post-power filtering
    this.outputTransformer.connect(this.postPowerHPF);
    this.postPowerHPF.connect(this.postPowerLPF);
    
    // Cabinet → standby → output
    this.postPowerLPF.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.standbyGain);
    this.standbyGain.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanInput.disconnect();
      this.cleanPreamp.disconnect();
      this.cleanSaturation.disconnect();
      this.cleanBrightCap.disconnect();
      this.voxChime.disconnect();
      this.cleanVolume.disconnect();
      this.overdriveInput.disconnect();
      this.overdriveGain.disconnect();
      this.boostGain.disconnect();
      this.odPreamp1.disconnect();
      this.odSaturation1.disconnect();
      this.odPreamp2.disconnect();
      this.odSaturation2.disconnect();
      this.voiceFilter.disconnect();
      this.overdriveVolume.disconnect();
      this.channelMixer.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.voxCut.disconnect();
      this.masterVolume.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.outputTransformer.disconnect();
      this.postPowerHPF.disconnect();
      this.postPowerLPF.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.standbyGain.disconnect();
    } catch (e) {}
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makeVoxCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Vox clean: chimey, bright, touch-sensitive
      let y = Math.tanh(x * 2.5);
      
      // Vox "chime" (upper midrange sparkle)
      y += 0.18 * Math.tanh(x * 5);
      
      // Early compression (Class A-like feel)
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.6);
      }
      
      // Touch sensitivity (more linear at low levels)
      if (Math.abs(x) < 0.25) {
        y *= 1.12;
      }
      
      // Slight asymmetry (tube characteristic)
      if (x > 0) y *= 1.06;
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  makeOverdriveCurve(stage) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      let y;
      
      if (stage === 1) {
        // FIRST STAGE - Main gain
        y = Math.tanh(x * 6);
        
        // British crunch character
        y += 0.20 * Math.tanh(x * 10);
        
        // Vox-style midrange emphasis
        y += 0.12 * Math.sin(x * Math.PI * 7);
        
      } else {
        // SECOND STAGE - Additional saturation
        y = Math.tanh(x * 4);
        
        // High-gain compression
        if (Math.abs(y) > 0.65) {
          const excess = Math.abs(y) - 0.65;
          y = Math.sign(y) * (0.65 + excess * 0.45);
        }
        
        // Modern British harmonic content
        y += 0.15 * Math.tanh(x * 8);
      }
      
      // Asymmetry (more even harmonics)
      if (x > 0) y *= 1.10;
      else y *= 0.98;
      
      curve[i] = y * 0.88;
    }
    
    return curve;
  }
  
  makeEL34PowerCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 2x EL34 POWER TUBES (50W)
      let y = Math.tanh(x * 1.5);
      
      // EL34 compression (starts early)
      if (Math.abs(y) > 0.55) {
        const excess = Math.abs(y) - 0.55;
        y = Math.sign(y) * (0.55 + excess * 0.52);
      }
      
      // EL34 British character
      y += 0.14 * Math.tanh(x * 3.5); // 3rd harmonic
      y += 0.08 * Math.tanh(x * 5);   // 5th harmonic
      
      // Low-end punch
      y += 0.10 * Math.tanh(x * 2.2);
      
      // Asymmetry
      if (x > 0) y *= 1.12;
      else y *= 0.97;
      
      curve[i] = y * 0.93;
    }
    
    return curve;
  }
  
  makeTransformerCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Modern output transformer (less saturation than vintage)
      let y = Math.tanh(x * 1.4);
      
      // Transformer saturation
      if (Math.abs(y) > 0.75) {
        const excess = Math.abs(y) - 0.75;
        y = Math.sign(y) * (0.75 + excess * 0.42);
      }
      
      // Harmonics (reduced for modern transformer)
      y += 0.06 * Math.tanh(x * 2.8);
      y += 0.03 * Math.tanh(x * 4.2);
      
      // Slight asymmetry
      if (x > 0) y *= 1.04;
      
      curve[i] = y * 0.96;
    }
    
    return curve;
  }
  
  // ============================================
  // CHANNEL SWITCHING
  // ============================================
  setChannel(channel) {
    this.activeChannel = channel;
    this.setupChannelRouting();
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
  
  // Logarithmic volume taper
  linLog01(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        this.params.channel = value;
        this.setChannel(value === 0 ? 'clean' : 'overdrive');
        break;
      
      // ============================================
      // CLEAN CHANNEL
      // ============================================
      case 'clean_volume':
      case 'clean_vol': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.cleanVolume.gain.setTargetAtTime(logV, now, 0.01);
        break;
      }
      
      case 'clean_bright':
        this.params.clean_bright = !!value;
        const brightGain = value ? 4 : 0; // +4dB when bright is on
        this.cleanBrightCap.gain.setTargetAtTime(brightGain, now, 0.02);
        break;
      
      // ============================================
      // OVERDRIVE CHANNEL
      // ============================================
      case 'od_gain':
      case 'gain': {
        const v = value / 100;
        const gainValue = 0.3 + (v * 1.2); // 0.3 to 1.5
        this.overdriveGain.gain.setTargetAtTime(gainValue, now, 0.01);
        break;
      }
      
      case 'od_volume': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.overdriveVolume.gain.setTargetAtTime(logV, now, 0.01);
        break;
      }
      
      case 'od_voice':
      case 'voice':
        this.params.od_voice = value;
        this.voiceSwitch = value === 0 ? 'bright' : 'thick';
        if (this.voiceSwitch === 'bright') {
          // BRIGHT: +3dB high-shelf
          this.voiceFilter.type = 'highshelf';
          this.voiceFilter.frequency.value = 2500;
          this.voiceFilter.gain.setTargetAtTime(3, now, 0.02);
        } else {
          // THICK: -2dB high-shelf (darker)
          this.voiceFilter.type = 'highshelf';
          this.voiceFilter.frequency.value = 2500;
          this.voiceFilter.gain.setTargetAtTime(-2, now, 0.02);
        }
        break;
      
      case 'od_boost':
      case 'boost':
        this.params.od_boost = !!value;
        this.gainBoost = !!value;
        const boostMultiplier = value ? 2.0 : 1.0; // +6dB
        this.boostGain.gain.setTargetAtTime(boostMultiplier, now, 0.01);
        break;
      
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 9, now, 0.01);
        // Also adjust Vox cut for treble interaction
        this.voxCut.gain.setTargetAtTime(2 + (value - 50) / 25, now, 0.01);
        break;
      
      // ============================================
      // MASTER VOLUME
      // ============================================
      case 'master_volume':
      case 'master': {
        const v = value / 100;
        const logV = this.linLog01(v);
        this.masterVolume.gain.setTargetAtTime(logV, now, 0.01);
        break;
      }
      
      // ============================================
      // POWER
      // ============================================
      case 'standby':
        this.standby = !!value;
        if (this.standby) {
          this.standbyGain.gain.setTargetAtTime(0, now, 0.001);
        } else {
          this.standbyGain.gain.setTargetAtTime(1, now, 0.001);
        }
        break;
      
      // ============================================
      // CABINET
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
  
  // ============================================
  // PRESETS (Famous Vox Night Train tones)
  // ============================================
  getPresets() {
    return {
      'Clean Chime': {
        channel: 0,
        clean_volume: 65,
        clean_bright: true,
        bass: 50,
        middle: 55,
        treble: 70,
        master_volume: 70,
        cabinet_enabled: true
      },
      
      'Crunch Rock': {
        channel: 1,
        od_gain: 55,
        od_volume: 65,
        od_voice: 0,
        od_boost: false,
        bass: 55,
        middle: 60,
        treble: 65,
        master_volume: 65,
        cabinet_enabled: true
      },
      
      'High Gain Lead': {
        channel: 1,
        od_gain: 80,
        od_volume: 60,
        od_voice: 0,
        od_boost: true,
        bass: 60,
        middle: 65,
        treble: 70,
        master_volume: 60,
        cabinet_enabled: true
      },
      
      'Thick Modern': {
        channel: 1,
        od_gain: 70,
        od_volume: 65,
        od_voice: 1,
        od_boost: false,
        bass: 65,
        middle: 55,
        treble: 60,
        master_volume: 65,
        cabinet_enabled: true
      },
      
      'Pushed Clean': {
        channel: 0,
        clean_volume: 85,
        clean_bright: false,
        bass: 55,
        middle: 50,
        treble: 65,
        master_volume: 50,
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
    
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
  }
}

export default VoxNightTrainNT50Amp;

