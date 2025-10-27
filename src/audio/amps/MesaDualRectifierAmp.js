import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MesaDualRectifierAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Dual Rectifier', 'mesa_dual_rectifier');
    
    // MESA/BOOGIE DUAL RECTIFIER (3-Channel Modern High-Gain)
    // Used by Metallica, Dream Theater, Lamb of God
    
    // ============================================
    // FRONT PANEL CONTROLS
    // ============================================
    
    // === CHANNEL 1 (CLEAN) ===
    this.ch1Gain = audioContext.createGain();
    this.ch1Treble = audioContext.createBiquadFilter();
    this.ch1Mid = audioContext.createBiquadFilter();
    this.ch1Bass = audioContext.createBiquadFilter();
    this.ch1Presence = audioContext.createBiquadFilter();
    this.ch1Master = audioContext.createGain();
    this.ch1Fader = audioContext.createGain(); // For smooth channel switching
    
    // === CHANNEL 2 (VINTAGE) ===
    this.ch2Gain = audioContext.createGain();
    this.ch2Treble = audioContext.createBiquadFilter();
    this.ch2Mid = audioContext.createBiquadFilter();
    this.ch2Bass = audioContext.createBiquadFilter();
    this.ch2Presence = audioContext.createBiquadFilter();
    this.ch2Master = audioContext.createGain();
    this.ch2Fader = audioContext.createGain(); // For smooth channel switching
    
    // === CHANNEL 3 (MODERN) ===
    this.ch3Gain = audioContext.createGain();
    this.ch3Treble = audioContext.createBiquadFilter();
    this.ch3Mid = audioContext.createBiquadFilter();
    this.ch3Bass = audioContext.createBiquadFilter();
    this.ch3Presence = audioContext.createBiquadFilter();
    this.ch3Master = audioContext.createGain();
    this.ch3Fader = audioContext.createGain(); // For smooth channel switching
    
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
    this.rectifierFilter = audioContext.createBiquadFilter(); // For tube/silicon feel
    this.rectifierFilter.type = 'lowpass';
    
    // MULTI-WATT POWER (50W/100W/150W)
    this.wattage = 100; // 50, 100, or 150
    this.powerAmp = audioContext.createGain();
    
    // BIAS SELECTOR
    this.biasType = 'aggressive'; // 'aggressive' or 'moderate'
    this.biasFilter = audioContext.createBiquadFilter();
    this.biasFilter.type = 'highshelf';
    
    // VARIAC POWER
    this.variacMode = false; // normal or variac
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
    // NOISE GATE (for CH2/CH3)
    // ============================================
    this.ch2NoiseGate = audioContext.createDynamicsCompressor();
    this.ch3NoiseGate = audioContext.createDynamicsCompressor();
    
    this.ch2NoiseGate.threshold.value = -52;
    this.ch2NoiseGate.ratio.value = 20;
    this.ch2NoiseGate.attack.value = 0.001;
    this.ch2NoiseGate.release.value = 0.08;
    
    this.ch3NoiseGate.threshold.value = -52;
    this.ch3NoiseGate.ratio.value = 20;
    this.ch3NoiseGate.attack.value = 0.001;
    this.ch3NoiseGate.release.value = 0.08;
    
    // ============================================
    // MODERN CHANNEL TIGHTENING
    // ============================================
    this.ch3TighteningFilter = audioContext.createBiquadFilter();
    this.ch3TighteningFilter.type = 'highpass';
    this.ch3TighteningFilter.frequency.value = 100;
    this.ch3TighteningFilter.Q.value = 0.707;
    
    // ============================================
    // DC BLOCK & FIZZ TAMING
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    this.fizzTaming = audioContext.createBiquadFilter();
    this.fizzTaming.type = 'lowpass';
    this.fizzTaming.frequency.value = 9000;
    this.fizzTaming.Q.value = 0.707;
    
    // ============================================
    // FX LOOP (Series/Parallel)
    // ============================================
    this.fxLoopSend = audioContext.createGain();
    this.fxLoopReturn = audioContext.createGain();
    this.fxLoopMix = audioContext.createGain(); // Controls dry/wet mix
    this.fxLoopDry = audioContext.createGain();
    this.fxLoopWet = audioContext.createGain();
    
    // ============================================
    // SPRING REVERB (built-in)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // Spring reverb delays
    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    
    this.spring1.delayTime.value = 0.031;
    this.spring2.delayTime.value = 0.039;
    this.spring3.delayTime.value = 0.043;
    
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3500;
    this.reverbFilter.Q.value = 0.707;
    
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.4;
    
    // Reverb routing
    this.spring1.connect(this.reverbFilter);
    this.spring2.connect(this.reverbFilter);
    this.spring3.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.spring1);
    this.reverbFeedback.connect(this.spring2);
    this.reverbFeedback.connect(this.spring3);
    this.reverbFilter.connect(this.reverbReturn);
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; // Will be created on demand
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_vintage'; // Mesa standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // CHANNEL MIXER (for smooth switching)
    // ============================================
    this.channelMixer = audioContext.createGain();
    this.activeChannel = 3; // 1, 2, or 3
    
    // ============================================
    // COMPLETE ROUTING - ALL CHANNELS
    // ============================================
    this.setupCompleteRouting();
    
    // ============================================
    // INITIALIZE PARAMETERS
    // ============================================
    this.params = {
      // Channel selection
      channel: 3, // 1=Clean, 2=Vintage, 3=Modern
      
      // Channel 1 (Clean) controls
      ch1_gain: 30,
      ch1_treble: 60,
      ch1_mid: 50,
      ch1_bass: 55,
      ch1_presence: 45,
      ch1_master: 60,
      
      // Channel 2 (Vintage) controls
      ch2_gain: 60,
      ch2_treble: 65,
      ch2_mid: 55,
      ch2_bass: 60,
      ch2_presence: 50,
      ch2_master: 50,
      
      // Channel 3 (Modern) controls
      ch3_gain: 80,
      ch3_treble: 70,
      ch3_mid: 40, // Scooped
      ch3_bass: 75,
      ch3_presence: 60,
      ch3_master: 50,
      
      // Global controls
      output_master: 70,
      solo: 0,
      
      // Back panel
      bold_spongy: true, // true=BOLD, false=SPONGY
      tube_silicon: true, // true=SILICON, false=TUBE
      multi_watt: 100, // 50, 100, 150
      bias: 0, // 0=aggressive, 1=moderate
      variac: false,
      
      // Effects
      fx_loop_mix: 100, // 0=all dry, 100=all wet (series mode)
      reverb: 0,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_vintage',
      micType: 'sm57',
      micPosition: 'edge'
    };
    
    this.applyInitialSettings();
    this.setChannel(3); // Start with channel 3
  }
  
  setupCompleteRouting() {
    // ============================================
    // CHANNEL 1 (CLEAN) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch1Gain);
    this.ch1Gain.connect(this.ch1Saturation);
    this.ch1Saturation.connect(this.ch1Bass);
    this.ch1Bass.connect(this.ch1Mid);
    this.ch1Mid.connect(this.ch1Treble);
    this.ch1Treble.connect(this.ch1Presence);
    this.ch1Presence.connect(this.ch1Master);
    // FX loop insertion point
    this.ch1Master.connect(this.ch1Fader);
    
    // ============================================
    // CHANNEL 2 (VINTAGE) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch2Gain);
    this.ch2Gain.connect(this.ch2NoiseGate); // Noise gate for drive channel
    this.ch2NoiseGate.connect(this.ch2Saturation);
    this.ch2Saturation.connect(this.ch2Bass);
    this.ch2Bass.connect(this.ch2Mid);
    this.ch2Mid.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Presence);
    this.ch2Presence.connect(this.ch2Master);
    // FX loop insertion point
    this.ch2Master.connect(this.ch2Fader);
    
    // ============================================
    // CHANNEL 3 (MODERN) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch3Gain);
    this.ch3Gain.connect(this.ch3NoiseGate); // Noise gate for hi-gain
    this.ch3NoiseGate.connect(this.ch3TighteningFilter); // Modern tight low-end
    this.ch3TighteningFilter.connect(this.ch3Saturation);
    this.ch3Saturation.connect(this.ch3Bass);
    this.ch3Bass.connect(this.ch3Mid);
    this.ch3Mid.connect(this.ch3Treble);
    this.ch3Treble.connect(this.ch3Presence);
    this.ch3Presence.connect(this.ch3Master);
    // FX loop insertion point
    this.ch3Master.connect(this.ch3Fader);
    
    // ============================================
    // CHANNEL MIXER → FX LOOP → POWER SECTION
    // ============================================
    this.ch1Fader.connect(this.channelMixer);
    this.ch2Fader.connect(this.channelMixer);
    this.ch3Fader.connect(this.channelMixer);
    
    // FX Loop (series/parallel mix)
    this.channelMixer.connect(this.fxLoopDry); // Dry path
    this.channelMixer.connect(this.fxLoopSend); // Send to external FX
    
    // Reverb in parallel
    this.fxLoopSend.connect(this.reverbSend);
    this.reverbSend.connect(this.spring1);
    this.reverbSend.connect(this.spring2);
    this.reverbSend.connect(this.spring3);
    
    // FX return path
    this.fxLoopReturn.connect(this.fxLoopWet); // Return from external FX
    this.reverbReturn.connect(this.fxLoopWet); // Reverb mixed with FX return
    
    // Mix dry + wet
    this.fxLoopDry.connect(this.fxLoopMix);
    this.fxLoopWet.connect(this.fxLoopMix);
    
    // ============================================
    // POWER SECTION (COMMON TO ALL CHANNELS)
    // ============================================
    this.fxLoopMix.connect(this.powerSag);
    this.powerSag.connect(this.rectifierSag);
    this.rectifierSag.connect(this.rectifierFilter);
    this.rectifierFilter.connect(this.variacGain);
    this.variacGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.biasFilter);
    this.biasFilter.connect(this.fizzTaming);
    this.fizzTaming.connect(this.dcBlock);
    
    // ============================================
    // CABINET SIMULATOR (OPTIONAL)
    // ============================================
    this.dcBlock.connect(this.preCabinet);
    this.recreateCabinet();
    
    // ============================================
    // OUTPUT
    // ============================================
    this.postCabinet.connect(this.outputMaster);
    this.outputMaster.connect(this.soloControl);
    this.soloControl.connect(this.output);
  }
  
  recreateCabinet() {
    // Disconnect old cabinet
    this.preCabinet.disconnect();
    
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
  
  applyInitialSettings() {
    // ============================================
    // CHANNEL 1 (CLEAN) - Initial Settings
    // ============================================
    this.ch1Gain.gain.value = 2.0;
    this.ch1Master.gain.value = 0.6;
    
    this.ch1Bass.type = 'lowshelf';
    this.ch1Bass.frequency.value = 120;
    this.ch1Bass.gain.value = 0;
    
    this.ch1Mid.type = 'peaking';
    this.ch1Mid.frequency.value = 800;
    this.ch1Mid.Q.value = 1.2;
    this.ch1Mid.gain.value = 0;
    
    this.ch1Treble.type = 'highshelf';
    this.ch1Treble.frequency.value = 3500;
    this.ch1Treble.gain.value = 1;
    
    this.ch1Presence.type = 'highshelf';
    this.ch1Presence.frequency.value = 5500;
    this.ch1Presence.gain.value = 0;
    
    // ============================================
    // CHANNEL 2 (VINTAGE) - Initial Settings
    // ============================================
    this.ch2Gain.gain.value = 5.0;
    this.ch2Master.gain.value = 0.55;
    
    this.ch2Bass.type = 'lowshelf';
    this.ch2Bass.frequency.value = 120;
    this.ch2Bass.gain.value = 2;
    
    this.ch2Mid.type = 'peaking';
    this.ch2Mid.frequency.value = 750;
    this.ch2Mid.Q.value = 1.2;
    this.ch2Mid.gain.value = 0;
    
    this.ch2Treble.type = 'highshelf';
    this.ch2Treble.frequency.value = 3000;
    this.ch2Treble.gain.value = 2;
    
    this.ch2Presence.type = 'highshelf';
    this.ch2Presence.frequency.value = 5000;
    this.ch2Presence.gain.value = 1;
    
    // ============================================
    // CHANNEL 3 (MODERN) - Initial Settings
    // ============================================
    this.ch3Gain.gain.value = 15; // Massive gain
    this.ch3Master.gain.value = 0.5;
    
    // EQ (V-shaped for modern metal)
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
    
    // ============================================
    // POWER SECTION
    // ============================================
    this.setBoldMode(true);
    this.setRectifier('silicon');
    this.setWattage(100);
    this.setBias('aggressive');
    this.setVariac(false);
    
    // ============================================
    // FX LOOP
    // ============================================
    this.fxLoopDry.gain.value = 0.0; // No dry when in series mode
    this.fxLoopWet.gain.value = 1.0; // Full wet
    this.fxLoopSend.gain.value = 1.0;
    this.fxLoopReturn.gain.value = 1.0;
    
    // ============================================
    // REVERB
    // ============================================
    this.reverbSend.gain.value = 0.0; // Off by default
    this.reverbReturn.gain.value = 0.5;
    
    // ============================================
    // OUTPUT
    // ============================================
    this.outputMaster.gain.value = 0.7;
    this.soloControl.gain.value = 1.0;
    
    // ============================================
    // CHANNEL FADERS (for smooth switching)
    // ============================================
    this.ch1Fader.gain.value = 0;
    this.ch2Fader.gain.value = 0;
    this.ch3Fader.gain.value = 1; // Start with channel 3 active
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
      if (x > 0) y *= 1.1; // 6L6 asymmetry
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
      // BOLD: Tight, aggressive, full power
      this.powerSag.threshold.value = -10;
      this.powerSag.ratio.value = 2;
      this.powerSag.attack.value = 0.001;
      this.powerSag.release.value = 0.05;
      this.powerAmp.gain.value *= 1.0;
    } else {
      // SPONGY: Saggy, compressed, vintage feel
      this.powerSag.threshold.value = -20;
      this.powerSag.ratio.value = 4;
      this.powerSag.attack.value = 0.005;
      this.powerSag.release.value = 0.2;
      this.powerAmp.gain.value *= 0.85; // Slight attenuation
    }
  }
  
  setRectifier(type) {
    this.rectifierMode = type;
    
    if (type === 'silicon') {
      // SILICON: Tight, aggressive, fast attack
      this.rectifierSag.gain.value = 1.0;
      this.rectifierFilter.frequency.value = 11000;
      this.powerSag.attack.value = 0.001;
      this.powerSag.release.value = 0.06;
    } else {
      // TUBE: Saggy, compressed, slower attack
      this.rectifierSag.gain.value = 0.9;
      this.rectifierFilter.frequency.value = 9500; // Darker
      this.powerSag.attack.value = 0.003;
      this.powerSag.release.value = 0.12;
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
  
  setBias(type) {
    this.biasType = type;
    
    if (type === 'aggressive' || type === 0) {
      // AGGRESSIVE: More highs, tighter
      this.biasFilter.frequency.value = 7000;
      this.biasFilter.gain.value = 1; // +1 dB boost
    } else {
      // MODERATE: Warmer, smoother
      this.biasFilter.frequency.value = 6000;
      this.biasFilter.gain.value = -1; // -1 dB cut
    }
  }
  
  setVariac(enabled) {
    this.variacMode = enabled;
    
    if (enabled) {
      // VARIAC: Reduced voltage = saggy, compressed
      this.variacGain.gain.value = 0.87;
      this.powerSag.attack.value = 0.004;
      this.powerSag.release.value = 0.15;
    } else {
      // NORMAL: Full voltage
      this.variacGain.gain.value = 1.0;
      // Restore normal attack/release (will be set by rectifier/bold mode)
      this.setRectifier(this.rectifierMode);
      this.setBoldMode(this.powerMode === 'bold');
    }
  }
  
  setChannel(channel) {
    const now = this.audioContext.currentTime;
    const fadeTime = 0.02; // 20ms crossfade
    
    this.activeChannel = channel;
    
    // Crossfade all channels
    if (channel === 1) {
      this.ch1Fader.gain.setTargetAtTime(1.0, now, fadeTime);
      this.ch2Fader.gain.setTargetAtTime(0.0, now, fadeTime);
      this.ch3Fader.gain.setTargetAtTime(0.0, now, fadeTime);
    } else if (channel === 2) {
      this.ch1Fader.gain.setTargetAtTime(0.0, now, fadeTime);
      this.ch2Fader.gain.setTargetAtTime(1.0, now, fadeTime);
      this.ch3Fader.gain.setTargetAtTime(0.0, now, fadeTime);
    } else {
      this.ch1Fader.gain.setTargetAtTime(0.0, now, fadeTime);
      this.ch2Fader.gain.setTargetAtTime(0.0, now, fadeTime);
      this.ch3Fader.gain.setTargetAtTime(1.0, now, fadeTime);
    }
  }
  
  // ============================================
  // PARAMETER UPDATE
  // ============================================
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        this.setChannel(value);
        break;
      
      // ============================================
      // CHANNEL 1 (CLEAN) CONTROLS
      // ============================================
      case 'ch1_gain':
        this.ch1Gain.gain.setTargetAtTime(1 + (value / 20), now, 0.01);
        break;
      case 'ch1_bass':
        this.ch1Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_mid':
        this.ch1Mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_treble':
        this.ch1Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_presence':
        this.ch1Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_master':
        this.ch1Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 2 (VINTAGE) CONTROLS
      // ============================================
      case 'ch2_gain':
        this.ch2Gain.gain.setTargetAtTime(1 + (value / 12), now, 0.01);
        break;
      case 'ch2_bass':
        this.ch2Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_mid':
        this.ch2Mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_treble':
        this.ch2Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_presence':
        this.ch2Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_master':
        this.ch2Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 3 (MODERN) CONTROLS
      // ============================================
      case 'ch3_gain':
      case 'gain': // Alias for default gain control
        this.ch3Gain.gain.setTargetAtTime(1 + (value / 10), now, 0.01);
        break;
      case 'ch3_bass':
      case 'bass': // Alias
        this.ch3Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_mid':
      case 'mid': // Alias
        this.ch3Mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_treble':
      case 'treble': // Alias
        this.ch3Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_presence':
      case 'presence': // Alias
        this.ch3Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch3_master':
        this.ch3Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'output_master':
      case 'master':
        // Logarithmic volume control
        const linValue = 0.001 * Math.pow(1000, value / 100);
        this.outputMaster.gain.setTargetAtTime(linValue, now, 0.01);
        break;
      
      case 'solo':
        // Solo boost: 0 = normal, 100 = +6dB
        const soloGain = 1.0 + (value / 100) * 1.0; // Up to 2x = +6dB
        this.soloControl.gain.setTargetAtTime(soloGain, now, 0.01);
        break;
      
      case 'resonance':
        // Resonance control (affects all channels)
        // TODO: Implement global resonance filter
        break;
      
      // ============================================
      // BACK PANEL CONTROLS
      // ============================================
      case 'bold_spongy':
        this.setBoldMode(value);
        break;
      
      case 'tube_silicon':
      case 'rectifier':
        this.setRectifier(value ? 'silicon' : 'tube');
        break;
      
      case 'multi_watt':
      case 'wattage':
        const watts = typeof value === 'string' ? parseInt(value) : value;
        this.setWattage(watts);
        break;
      
      case 'bias':
        this.setBias(value);
        break;
      
      case 'variac':
        this.setVariac(value);
        break;
      
      // ============================================
      // FX LOOP & REVERB
      // ============================================
      case 'fx_loop_mix':
        // 0 = all dry (parallel), 100 = all wet (series)
        const dryAmount = 1.0 - (value / 100);
        const wetAmount = value / 100;
        this.fxLoopDry.gain.setTargetAtTime(dryAmount, now, 0.01);
        this.fxLoopWet.gain.setTargetAtTime(wetAmount, now, 0.01);
        break;
      
      case 'reverb':
        this.reverbSend.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CABINET SIMULATOR
      // ============================================
      case 'cabinet_enabled':
        this.cabinetEnabled = value;
        this.recreateCabinet();
        break;
      
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      
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
    
    // Disconnect all nodes
    try {
      this.input.disconnect();
      
      // Channel 1
      this.ch1Gain.disconnect();
      this.ch1Saturation.disconnect();
      this.ch1Bass.disconnect();
      this.ch1Mid.disconnect();
      this.ch1Treble.disconnect();
      this.ch1Presence.disconnect();
      this.ch1Master.disconnect();
      this.ch1Fader.disconnect();
      
      // Channel 2
      this.ch2Gain.disconnect();
      this.ch2NoiseGate.disconnect();
      this.ch2Saturation.disconnect();
      this.ch2Bass.disconnect();
      this.ch2Mid.disconnect();
      this.ch2Treble.disconnect();
      this.ch2Presence.disconnect();
      this.ch2Master.disconnect();
      this.ch2Fader.disconnect();
      
      // Channel 3
      this.ch3Gain.disconnect();
      this.ch3NoiseGate.disconnect();
      this.ch3TighteningFilter.disconnect();
      this.ch3Saturation.disconnect();
      this.ch3Bass.disconnect();
      this.ch3Mid.disconnect();
      this.ch3Treble.disconnect();
      this.ch3Presence.disconnect();
      this.ch3Master.disconnect();
      this.ch3Fader.disconnect();
      
      // FX Loop & Reverb
      this.channelMixer.disconnect();
      this.fxLoopDry.disconnect();
      this.fxLoopSend.disconnect();
      this.fxLoopReturn.disconnect();
      this.fxLoopWet.disconnect();
      this.fxLoopMix.disconnect();
      this.reverbSend.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbReturn.disconnect();
      
      // Power section
      this.powerSag.disconnect();
      this.rectifierSag.disconnect();
      this.rectifierFilter.disconnect();
      this.variacGain.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.biasFilter.disconnect();
      this.fizzTaming.disconnect();
      this.dcBlock.disconnect();
      
      // Cabinet
      this.preCabinet.disconnect();
      if (this.cabinet) {
        this.cabinet.input.disconnect();
        this.cabinet.output.disconnect();
      }
      this.postCabinet.disconnect();
      
      // Output
      this.outputMaster.disconnect();
      this.soloControl.disconnect();
      this.output.disconnect();
    } catch (e) {
      console.warn('Error disconnecting MesaDualRectifierAmp:', e);
    }
  }
}

export default MesaDualRectifierAmp;
