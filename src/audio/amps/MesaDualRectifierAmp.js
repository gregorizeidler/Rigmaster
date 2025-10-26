import BaseAmp from './BaseAmp.js';

class MesaDualRectifierAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Dual Rectifier', 'mesa_dual_rectifier');
    
    // MESA/BOOGIE DUAL RECTIFIER (3-Channel Rackmount)
    // Used by Metallica, Dream Theater, Lamb of God
    
    // ============================================
    // FRONT PANEL CONTROLS
    // ============================================
    
    // === CHANNEL 1 (CLEAN) ===
    this.ch1Gain = audioContext.createGain();
    this.ch1Treble = audioContext.createBiquadFilter();
    this.ch1Mid = audioContext.createBiquadFilter();
    this.ch1Bass = audioContext.createBiquadFilter();
    this.ch1Master = audioContext.createGain();
    this.ch1Presence = audioContext.createBiquadFilter();
    
    // === CHANNEL 2 (VINTAGE) ===
    this.ch2Gain = audioContext.createGain();
    this.ch2Treble = audioContext.createBiquadFilter();
    this.ch2Mid = audioContext.createBiquadFilter();
    this.ch2Bass = audioContext.createBiquadFilter();
    this.ch2Master = audioContext.createGain();
    this.ch2Presence = audioContext.createBiquadFilter();
    
    // === CHANNEL 3 (MODERN) ===
    this.ch3Gain = audioContext.createGain();
    this.ch3Treble = audioContext.createBiquadFilter();
    this.ch3Mid = audioContext.createBiquadFilter();
    this.ch3Bass = audioContext.createBiquadFilter();
    this.ch3Master = audioContext.createGain();
    this.ch3Presence = audioContext.createBiquadFilter();
    
    // === GLOBAL CONTROLS ===
    this.outputMaster = audioContext.createGain();
    this.soloControl = audioContext.createGain();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // BOLD/SPONGY POWER SWITCH
    this.powerMode = 'bold'; // 'bold' or 'spongy'
    this.powerSag = audioContext.createDynamicsCompressor();
    
    // RECTIFIER SELECT (TUBE/SILICON)
    this.rectifierMode = 'silicon'; // 'tube' or 'silicon'
    this.rectifierSag = audioContext.createGain();
    
    // MULTI-WATT POWER (50W/100W/150W)
    this.wattage = 100; // 50, 100, or 150
    this.powerAmp = audioContext.createGain();
    
    // BIAS SELECTOR
    this.biasType = 'aggressive'; // 'aggressive' or 'moderate'
    
    // VARIAC POWER
    this.variacMode = 'normal'; // 'normal' or 'variac'
    this.variacGain = audioContext.createGain();
    
    // ============================================
    // SATURATION & DISTORTION
    // ============================================
    
    // Channel-specific saturation
    this.ch1Saturation = audioContext.createWaveShaper();
    this.ch2Saturation = audioContext.createWaveShaper();
    this.ch3Saturation = audioContext.createWaveShaper();
    
    // Power amp saturation
    this.powerSaturation = audioContext.createWaveShaper();
    
    // Set curves
    this.ch1Saturation.curve = this.makeCleanCurve();
    this.ch2Saturation.curve = this.makeVintageCurve();
    this.ch3Saturation.curve = this.makeModernCurve();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    
    this.ch1Saturation.oversample = '4x';
    this.ch2Saturation.oversample = '4x';
    this.ch3Saturation.oversample = '4x';
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // ADDITIONAL FEATURES
    // ============================================
    
    // Effects Loop
    this.fxLoopSend = audioContext.createGain();
    this.fxLoopReturn = audioContext.createGain();
    this.fxLoopMix = audioContext.createGain();
    
    // Reverb (built-in spring reverb)
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // Channel switching
    this.activeChannel = 3; // 1, 2, or 3
    this.channelMixer = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 3 (MODERN) DEFAULT
    // ============================================
    this.setupChannel3Routing();
    
    // ============================================
    // INITIALIZE PARAMETERS
    // ============================================
    this.params = {
      // Channel selection
      channel: 3, // 1=Clean, 2=Vintage, 3=Modern
      
      // Channel 3 (Modern) controls
      ch3_gain: 80,
      ch3_treble: 70,
      ch3_mid: 40, // Scooped
      ch3_bass: 75,
      ch3_presence: 60,
      ch3_master: 50,
      
      // Channel 2 (Vintage) controls
      ch2_gain: 60,
      ch2_treble: 65,
      ch2_mid: 55,
      ch2_bass: 60,
      ch2_presence: 50,
      ch2_master: 50,
      
      // Channel 1 (Clean) controls
      ch1_gain: 30,
      ch1_treble: 60,
      ch1_mid: 50,
      ch1_bass: 55,
      ch1_presence: 45,
      ch1_master: 60,
      
      // Global controls
      output_master: 70,
      solo: 0,
      
      // Back panel
      bold_spongy: true, // true=BOLD, false=SPONGY
      rectifier: true, // true=SILICON, false=TUBE
      wattage: 100, // 50, 100, 150
      bias: 0, // 0=aggressive, 1=moderate
      variac: false,
      
      // Effects
      fx_loop_mix: 100,
      reverb: 0
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel3Routing() {
    // Modern channel routing (most aggressive)
    this.input.connect(this.ch3Gain);
    this.ch3Gain.connect(this.ch3Saturation);
    this.ch3Saturation.connect(this.ch3Bass);
    this.ch3Bass.connect(this.ch3Mid);
    this.ch3Mid.connect(this.ch3Treble);
    this.ch3Treble.connect(this.ch3Presence);
    this.ch3Presence.connect(this.ch3Master);
    this.ch3Master.connect(this.powerSag);
    this.powerSag.connect(this.rectifierSag);
    this.rectifierSag.connect(this.variacGain);
    this.variacGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
  }
  
  applyInitialSettings() {
    // Channel 3 (Modern) - Default settings
    this.ch3Gain.gain.value = 15; // Massive gain
    this.ch3Master.gain.value = 0.5;
    
    // EQ (V-shaped)
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.value = 150;
    this.ch3Bass.gain.value = 8; // Heavy bass
    
    this.ch3Mid.type = 'peaking';
    this.ch3Mid.frequency.value = 750;
    this.ch3Mid.gain.value = -6; // Scooped mids
    this.ch3Mid.Q.value = 2;
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.value = 3000;
    this.ch3Treble.gain.value = 6; // Aggressive highs
    
    this.ch3Presence.type = 'highshelf';
    this.ch3Presence.frequency.value = 5000;
    this.ch3Presence.gain.value = 3;
    
    // Power section
    this.setBoldMode(true);
    this.setRectifier('silicon');
    this.setWattage(100);
    
    this.outputMaster.gain.value = 0.7;
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makeCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Clean channel - minimal distortion
      curve[i] = Math.tanh(x * 1.5);
    }
    return curve;
  }
  
  makeVintageCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Vintage channel - classic rock gain
      let y = Math.tanh(x * 6);
      y = Math.tanh(y * 1.3);
      curve[i] = y * 0.8;
    }
    return curve;
  }
  
  makeModernCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // MODERN CHANNEL - EXTREME GAIN
      // Stage 1: Massive preamp gain
      let y = Math.tanh(x * 15);
      
      // Stage 2: Additional cascading
      y = Math.tanh(y * 1.6);
      
      // Stage 3: Final gain stage
      y = Math.tanh(y * 1.2);
      
      // SILICON RECTIFIER - Hard compression
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.35);
      }
      
      // MASSIVE BASS
      if (x < -0.15) {
        y *= 1.12;
      }
      
      // EXTREME MID SCOOP
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.65) {
        y *= 0.82;
      }
      
      // AGGRESSIVE HIGHS
      if (Math.abs(x) > 0.7) {
        y += 0.12 * Math.tanh(x * 30);
      }
      
      // 6L6 tubes - Strong asymmetry
      if (x > 0) {
        y *= 1.22;
      } else {
        y *= 1.05;
      }
      
      // Presence boost
      y += 0.1 * Math.sin(x * Math.PI * 9);
      
      curve[i] = y * 0.68;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // 6L6 power tubes
      let y = Math.tanh(x * 1.5);
      if (x > 0) y *= 1.1;
      curve[i] = y;
    }
    return curve;
  }
  
  // ============================================
  // BACK PANEL CONTROLS
  // ============================================
  
  setBoldMode(isBold) {
    this.powerMode = isBold ? 'bold' : 'spongy';
    
    if (isBold) {
      // BOLD: Tight, aggressive
      this.powerSag.threshold.value = -10;
      this.powerSag.ratio.value = 2;
      this.powerSag.attack.value = 0.001;
      this.powerSag.release.value = 0.05;
    } else {
      // SPONGY: Saggy, compressed
      this.powerSag.threshold.value = -20;
      this.powerSag.ratio.value = 4;
      this.powerSag.attack.value = 0.005;
      this.powerSag.release.value = 0.2;
    }
  }
  
  setRectifier(type) {
    this.rectifierMode = type;
    
    if (type === 'silicon') {
      // SILICON: Tight, aggressive, fast attack
      this.rectifierSag.gain.value = 1.0;
    } else {
      // TUBE: Saggy, compressed, slower attack
      this.rectifierSag.gain.value = 0.9;
    }
  }
  
  setWattage(watts) {
    this.wattage = watts;
    
    switch (watts) {
      case 50:
        this.powerAmp.gain.value = 0.7; // Lower headroom
        break;
      case 100:
        this.powerAmp.gain.value = 1.0; // Full power
        break;
      case 150:
        this.powerAmp.gain.value = 1.2; // Extra headroom
        break;
    }
  }
  
  setChannel(channel) {
    this.activeChannel = channel;
    
    // Disconnect all
    this.input.disconnect();
    this.outputMaster.disconnect();
    
    // Reconnect based on channel
    if (channel === 1) {
      this.setupChannel1Routing();
    } else if (channel === 2) {
      this.setupChannel2Routing();
    } else {
      this.setupChannel3Routing();
    }
  }
  
  setupChannel1Routing() {
    // Clean channel
    this.input.connect(this.ch1Gain);
    this.ch1Gain.connect(this.ch1Saturation);
    this.ch1Saturation.connect(this.ch1Bass);
    this.ch1Bass.connect(this.ch1Mid);
    this.ch1Mid.connect(this.ch1Treble);
    this.ch1Treble.connect(this.ch1Presence);
    this.ch1Presence.connect(this.ch1Master);
    this.ch1Master.connect(this.powerAmp);
    this.powerAmp.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
  }
  
  setupChannel2Routing() {
    // Vintage channel
    this.input.connect(this.ch2Gain);
    this.ch2Gain.connect(this.ch2Saturation);
    this.ch2Saturation.connect(this.ch2Bass);
    this.ch2Bass.connect(this.ch2Mid);
    this.ch2Mid.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Presence);
    this.ch2Presence.connect(this.ch2Master);
    this.ch2Master.connect(this.powerSag);
    this.powerSag.connect(this.powerAmp);
    this.powerAmp.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
  }
  
  // ============================================
  // PARAMETER UPDATE
  // ============================================
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // CHANNEL SELECTION
      case 'channel':
        this.setChannel(value);
        break;
      
      // CHANNEL 3 (MODERN) CONTROLS
      case 'ch3_gain':
      case 'gain': // Alias
        this.ch3Gain.gain.setTargetAtTime(1 + (value / 10), now, 0.01);
        break;
      case 'ch3_bass':
      case 'bass':
        this.ch3Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_mid':
      case 'mid':
        this.ch3Mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_treble':
      case 'treble':
        this.ch3Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_presence':
      case 'presence':
        this.ch3Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_master':
        this.ch3Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // GLOBAL
      case 'output_master':
      case 'master':
        this.outputMaster.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // BACK PANEL
      case 'bold_spongy':
        this.setBoldMode(value);
        break;
      case 'rectifier':
        this.setRectifier(value ? 'silicon' : 'tube');
        break;
      case 'wattage':
        this.setWattage(value);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    // Disconnect all nodes
    this.ch1Gain.disconnect();
    this.ch2Gain.disconnect();
    this.ch3Gain.disconnect();
    this.ch1Saturation.disconnect();
    this.ch2Saturation.disconnect();
    this.ch3Saturation.disconnect();
    this.powerSaturation.disconnect();
    this.powerSag.disconnect();
    this.rectifierSag.disconnect();
    this.powerAmp.disconnect();
    this.outputMaster.disconnect();
  }
}

export default MesaDualRectifierAmp;

