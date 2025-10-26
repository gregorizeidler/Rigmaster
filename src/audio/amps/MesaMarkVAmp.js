import BaseAmp from './BaseAmp.js';

class MesaMarkVAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Boogie Mark V', 'mesa_mark_v');
    
    // MESA BOOGIE MARK V
    // THE most versatile high-gain amp ever made
    // Used by Dream Theater, Metallica, Megadeth
    // 3 CHANNELS × 3 MODES = 9 distinct voices
    
    // ============================================
    // 3 CHANNELS (each with 3 modes)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean/Fat/Tweed
    this.channel2 = audioContext.createGain(); // Edge/Crunch/Mark I
    this.channel3 = audioContext.createGain(); // Mark IIC+/Mark IV/Extreme
    
    // Active channel & mode
    this.activeChannel = 3; // 1, 2, 3
    this.channel1Mode = 'clean'; // 'clean', 'fat', 'tweed'
    this.channel2Mode = 'crunch'; // 'edge', 'crunch', 'mark_i'
    this.channel3Mode = 'iic+'; // 'iic+', 'mark_iv', 'extreme'
    
    // ============================================
    // MARK SERIES VOICING FILTERS (Shared)
    // ============================================
    // Input HPF - controls low-end boom
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 70;
    this.inputHPF.Q.value = 0.707;
    
    // Pull Bright - high frequency shelf
    this.brightShelf = audioContext.createBiquadFilter();
    this.brightShelf.type = 'highshelf';
    this.brightShelf.frequency.value = 3000;
    this.brightShelf.gain.value = 0;
    
    // Lead Tight HPF - high-gain tightness
    this.leadTightHPF = audioContext.createBiquadFilter();
    this.leadTightHPF.type = 'highpass';
    this.leadTightHPF.frequency.value = 100;
    this.leadTightHPF.Q.value = 0.707;
    
    // Pre-power LPF - tames fizz before power section
    this.preLPF = audioContext.createBiquadFilter();
    this.preLPF.type = 'lowpass';
    this.preLPF.frequency.value = 9500;
    this.preLPF.Q.value = 0.707;
    
    // ============================================
    // PREAMP (5 cascading 12AX7 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    this.preamp5 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    this.saturation5 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeMesaPreampCurve();
    this.saturation2.curve = this.makeMesaPreampCurve();
    this.saturation3.curve = this.makeMesaPreampCurve();
    this.saturation4.curve = this.makeMesaPreampCurve();
    this.saturation5.curve = this.makeMesaPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    this.saturation5.oversample = '4x';
    
    // ============================================
    // MARK SERIES TONE STACK (Active EQ)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // ============================================
    // MARK SERIES GRAPHIC EQ (5-band)
    // ============================================
    this.graphicEQ = [
      audioContext.createBiquadFilter(), // 80Hz
      audioContext.createBiquadFilter(), // 240Hz
      audioContext.createBiquadFilter(), // 750Hz
      audioContext.createBiquadFilter(), // 2200Hz
      audioContext.createBiquadFilter()  // 6600Hz
    ];
    
    this.graphicEQ[0].type = 'peaking';
    this.graphicEQ[0].frequency.value = 80;
    this.graphicEQ[0].Q.value = 1.0;
    this.graphicEQ[0].gain.value = 0;
    
    this.graphicEQ[1].type = 'peaking';
    this.graphicEQ[1].frequency.value = 240;
    this.graphicEQ[1].Q.value = 1.0;
    this.graphicEQ[1].gain.value = 0;
    
    this.graphicEQ[2].type = 'peaking';
    this.graphicEQ[2].frequency.value = 750;
    this.graphicEQ[2].Q.value = 1.0;
    this.graphicEQ[2].gain.value = 0;
    
    this.graphicEQ[3].type = 'peaking';
    this.graphicEQ[3].frequency.value = 2200;
    this.graphicEQ[3].Q.value = 1.0;
    this.graphicEQ[3].gain.value = 0;
    
    this.graphicEQ[4].type = 'peaking';
    this.graphicEQ[4].frequency.value = 6600;
    this.graphicEQ[4].Q.value = 1.0;
    this.graphicEQ[4].gain.value = 0;
    
    // Graphic EQ Bypass node
    this.geqBypass = audioContext.createGain();
    this.geqBypass.gain.value = 0; // 0 = off, 1 = on
    
    // ============================================
    // MARK SERIES "V-CURVE" (Optional mid scoop)
    // ============================================
    this.vCurve = audioContext.createBiquadFilter();
    this.vCurve.type = 'peaking';
    this.vCurve.frequency.value = 650;
    this.vCurve.Q.value = 2.0;
    this.vCurve.gain.value = 0; // disabled by default, user can enable
    
    // ============================================
    // POWER AMP (4x 6L6 or 2x EL34 - Simul-Class)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Simul-Class compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -12;
    this.powerComp.knee.value = 10;
    this.powerComp.ratio.value = 4;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.08;
    
    // ============================================
    // CABINET & OUTPUT
    // ============================================
    // DC Block (essential for high-gain)
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // Cabinet IR (simulated for now, can be replaced with real IR)
    this.cabinetSim = audioContext.createBiquadFilter();
    this.cabinetSim.type = 'lowpass';
    this.cabinetSim.frequency.value = 5200; // Mesa 4x12 V30
    this.cabinetSim.Q.value = 1.5;
    
    // Microphone simulation
    this.micSim = audioContext.createBiquadFilter();
    this.micSim.type = 'peaking';
    this.micSim.frequency.value = 5000; // SM57 presence peak
    this.micSim.Q.value = 1.2;
    this.micSim.gain.value = 4;
    
    // Presence (post-cabinet as in real Mark V)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // Cabinet enabled flag
    this.cabinetEnabled = true;
    
    // ============================================
    // NOISE GATE (for channel 3)
    // ============================================
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -52;
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20;
    this.noiseGate.attack.value = 0.001;
    this.noiseGate.release.value = 0.08;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelMaster = audioContext.createGain();
    this.outputMaster = audioContext.createGain();
    
    // ============================================
    // VARIAC POWER (90W / 45W / 10W)
    // ============================================
    this.variacPower = 90; // 90, 45, 10
    
    // ============================================
    // INITIALIZE PARAMS BEFORE ROUTING!
    // ============================================
    this.params = {
      channel: 3, // 1, 2, 3
      mode: 'iic+', // depends on channel
      
      // Gain/Volume
      gain: 70,
      channel_master: 70,
      
      // Tone stack
      bass: 60,
      middle: 50,
      treble: 70,
      presence: 65,
      
      // Graphic EQ
      eq_80: 50,
      eq_240: 50,
      eq_750: 50,
      eq_2200: 50,
      eq_6600: 50,
      eq_enabled: false, // GEQ on/off
      
      // V-Curve (optional mid scoop)
      vcurve_enabled: false,
      
      // Power
      variac_power: 90,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_vintage',
      microphone: 'sm57',
      micPosition: 'edge',
      
      // Output Master
      master: 70
    };
    
    // Setup routing AFTER params are initialized
    this.setupChannel3();
    this.applyInitialSettings();
    this.applyModeVoicing();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN/FAT/TWEED (2 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.brightShelf);
    this.brightShelf.connect(this.channel1);
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    
    // Graphic EQ chain (with bypass)
    this.treble.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.preLPF);
    this.preLPF.connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet routing
    if (this.cabinetEnabled) {
      this.dcBlock.connect(this.cabinetSim);
      this.cabinetSim.connect(this.micSim);
      this.micSim.connect(this.presence);
      this.presence.connect(this.outputMaster);
    } else {
      this.dcBlock.connect(this.outputMaster);
    }
    
    this.outputMaster.connect(this.output);
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // CHANNEL 2 - EDGE/CRUNCH/MARK I (3 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.brightShelf);
    this.brightShelf.connect(this.channel2);
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.leadTightHPF);
    this.leadTightHPF.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    
    // Graphic EQ chain
    this.treble.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.preLPF);
    this.preLPF.connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet routing
    if (this.cabinetEnabled) {
      this.dcBlock.connect(this.cabinetSim);
      this.cabinetSim.connect(this.micSim);
      this.micSim.connect(this.presence);
      this.presence.connect(this.outputMaster);
    } else {
      this.dcBlock.connect(this.outputMaster);
    }
    
    this.outputMaster.connect(this.output);
    this.activeChannel = 2;
  }
  
  setupChannel3() {
    // CHANNEL 3 - IIC+/MARK IV/EXTREME (5 gain stages with noise gate)
    this.disconnectAll();
    
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.brightShelf);
    this.brightShelf.connect(this.channel3);
    this.channel3.connect(this.noiseGate); // Gate before gain stages
    this.noiseGate.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.leadTightHPF); // Tight HPF before last stages
    this.leadTightHPF.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.preamp5);
    this.preamp5.connect(this.saturation5);
    this.saturation5.connect(this.vCurve); // Optional V-curve
    this.vCurve.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    
    // Graphic EQ chain
    this.treble.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.preLPF);
    this.preLPF.connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet routing
    if (this.cabinetEnabled) {
      this.dcBlock.connect(this.cabinetSim);
      this.cabinetSim.connect(this.micSim);
      this.micSim.connect(this.presence);
      this.presence.connect(this.outputMaster);
    } else {
      this.dcBlock.connect(this.outputMaster);
    }
    
    this.outputMaster.connect(this.output);
    this.activeChannel = 3;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.inputHPF.disconnect();
      this.brightShelf.disconnect();
      this.leadTightHPF.disconnect();
      this.preLPF.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
      this.noiseGate.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.preamp5.disconnect();
      this.saturation5.disconnect();
      this.vCurve.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.graphicEQ.forEach(eq => eq.disconnect());
      this.channelMaster.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabinetSim.disconnect();
      this.micSim.disconnect();
      this.presence.disconnect();
      this.outputMaster.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 12;
    this.preamp2.gain.value = 2.2;
    this.preamp3.gain.value = 1.7;
    this.preamp4.gain.value = 1.4;
    this.preamp5.gain.value = 1.2;
    this.channel1.gain.value = 0.6;
    this.channel2.gain.value = 0.8;
    this.channel3.gain.value = 1.0;
    this.channelMaster.gain.value = 0.7;
    this.powerAmp.gain.value = 1.1;
    this.outputMaster.gain.value = 0.7;
  }
  
  makeMesaPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // MESA "TIGHT" COMPRESSION
      let y = Math.tanh(x * 6.5);
      
      // AGGRESSIVE CLIPPING
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.4;
        y *= compression;
      }
      
      // MARK SERIES CLARITY
      y += 0.12 * Math.tanh(x * 10);
      
      // Upper-mid aggression
      y += 0.15 * Math.tanh(x * 8);
      
      // Slight asymmetry
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
      
      // SIMUL-CLASS (Class A + Class AB hybrid)
      let y = Math.tanh(x * 1.65);
      
      // 6L6 PUNCH
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.5);
      }
      
      // LOW-END TIGHTNESS
      y += 0.1 * Math.tanh(x * 3);
      
      // MESA AGGRESSION
      y += 0.1 * Math.tanh(x * 9);
      
      // Asymmetry
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.87;
    }
    return curve;
  }
  
  // Linear to logarithmic mapping for gain controls
  lin2log(v01) {
    return 0.001 * Math.pow(1000, v01); // ~-60dB to 0dB
  }
  
  // Apply mode-specific voicing (the secret sauce of Mark V)
  applyModeVoicing() {
    const now = this.audioContext.currentTime;
    
    if (this.activeChannel === 1) {
      if (this.channel1Mode === 'clean') {
        // Clean: bright, open, Fender-like
        this.preamp1.gain.setTargetAtTime(2.0, now, 0.02);
        this.brightShelf.gain.setTargetAtTime(3, now, 0.02);
        this.inputHPF.frequency.setTargetAtTime(70, now, 0.02);
      } else if (this.channel1Mode === 'fat') {
        // Fat: more bass, slightly pushed mids
        this.preamp1.gain.setTargetAtTime(2.6, now, 0.02);
        this.brightShelf.gain.setTargetAtTime(1, now, 0.02);
        this.inputHPF.frequency.setTargetAtTime(55, now, 0.02);
        this.bass.gain.setTargetAtTime(2, now, 0.02);
      } else if (this.channel1Mode === 'tweed') {
        // Tweed: warm breakup, more gain
        this.preamp1.gain.setTargetAtTime(3.2, now, 0.02);
        this.brightShelf.gain.setTargetAtTime(0, now, 0.02);
        this.inputHPF.frequency.setTargetAtTime(80, now, 0.02);
        this.treble.gain.setTargetAtTime(2, now, 0.02);
      }
    } else if (this.activeChannel === 2) {
      if (this.channel2Mode === 'edge') {
        // Edge: British crunch, tight low-end
        this.preamp1.gain.setTargetAtTime(3.0, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(90, now, 0.02);
      } else if (this.channel2Mode === 'crunch') {
        // Crunch: Classic rock gain
        this.preamp1.gain.setTargetAtTime(4.0, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(95, now, 0.02);
      } else if (this.channel2Mode === 'mark_i') {
        // Mark I: Santana-style singing lead
        this.preamp1.gain.setTargetAtTime(4.5, now, 0.02);
        this.brightShelf.gain.setTargetAtTime(2, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(100, now, 0.02);
      }
    } else if (this.activeChannel === 3) {
      if (this.channel3Mode === 'iic+') {
        // IIC+: Iconic Metallica/Petrucci tone
        this.preLPF.frequency.setTargetAtTime(9000, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(110, now, 0.02);
      } else if (this.channel3Mode === 'mark_iv') {
        // Mark IV: Tighter, more focused
        this.preLPF.frequency.setTargetAtTime(8500, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(120, now, 0.02);
      } else if (this.channel3Mode === 'extreme') {
        // Extreme: Maximum gain and aggression
        this.preLPF.frequency.setTargetAtTime(8000, now, 0.02);
        this.leadTightHPF.frequency.setTargetAtTime(140, now, 0.02);
        this.preamp5.gain.setTargetAtTime(1.6, now, 0.02);
      }
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else if (value === 2) {
          this.setupChannel2();
        } else if (value === 3) {
          this.setupChannel3();
        }
        this.applyModeVoicing();
        break;
      
      case 'mode':
        // Store mode for current channel
        if (this.activeChannel === 1) {
          this.channel1Mode = value;
        } else if (this.activeChannel === 2) {
          this.channel2Mode = value;
        } else if (this.activeChannel === 3) {
          this.channel3Mode = value;
        }
        // Apply voicing changes immediately
        this.applyModeVoicing();
        break;
      
      case 'gain': {
        // Logarithmic mapping for natural gain taper
        const g = this.lin2log(value / 100) * 18;
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.50), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.28), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.22), now, 0.01);
        this.preamp4.gain.setTargetAtTime(Math.max(1, g * 0.18), now, 0.01);
        this.preamp5.gain.setTargetAtTime(Math.max(1, g * 0.15), now, 0.01);
        break;
      }
      
      case 'channel_master':
        // Logarithmic taper
        this.channelMaster.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
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
      
      // Graphic EQ with ±12dB range
      case 'eq_80':
        this.graphicEQ[0].gain.setTargetAtTime((value - 50) / 4.17, now, 0.01);
        break;
      
      case 'eq_240':
        this.graphicEQ[1].gain.setTargetAtTime((value - 50) / 4.17, now, 0.01);
        break;
      
      case 'eq_750':
        this.graphicEQ[2].gain.setTargetAtTime((value - 50) / 4.17, now, 0.01);
        break;
      
      case 'eq_2200':
        this.graphicEQ[3].gain.setTargetAtTime((value - 50) / 4.17, now, 0.01);
        break;
      
      case 'eq_6600':
        this.graphicEQ[4].gain.setTargetAtTime((value - 50) / 4.17, now, 0.01);
        break;
      
      case 'eq_enabled':
        // Bypass GEQ when disabled
        // Note: In real implementation, would need to rewire. For now, just zero gains.
        if (!value) {
          this.graphicEQ.forEach(eq => eq.gain.setTargetAtTime(0, now, 0.01));
        }
        break;
      
      case 'vcurve_enabled':
        // Enable/disable V-curve mid scoop
        this.vCurve.gain.setTargetAtTime(value ? -6 : 0, now, 0.02);
        break;
      
      case 'variac_power': {
        this.variacPower = value;
        // Variac affects dynamics, not just volume
        const map = {
          90: { gain: 1.10, thr: -12, atk: 0.005, rel: 0.08, lpf: 11000 },
          45: { gain: 0.92, thr: -14, atk: 0.006, rel: 0.09, lpf: 10000 },
          10: { gain: 0.68, thr: -16, atk: 0.007, rel: 0.10, lpf: 9000 }
        }[value] || { gain: 1.1, thr: -12, atk: 0.005, rel: 0.08, lpf: 11000 };
        
        this.powerAmp.gain.setTargetAtTime(map.gain, now, 0.02);
        this.powerComp.threshold.setTargetAtTime(map.thr, now, 0.05);
        this.powerComp.attack.setTargetAtTime(map.atk, now, 0.05);
        this.powerComp.release.setTargetAtTime(map.rel, now, 0.05);
        this.preLPF.frequency.setTargetAtTime(map.lpf, now, 0.05);
        break;
      }
      
      case 'cabinet_enabled':
        this.cabinetEnabled = value;
        // Reroute based on current channel
        if (this.activeChannel === 1) {
          this.setupChannel1();
        } else if (this.activeChannel === 2) {
          this.setupChannel2();
        } else {
          this.setupChannel3();
        }
        break;
      
      case 'master':
        // Logarithmic taper
        this.outputMaster.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputHPF.disconnect();
    this.brightShelf.disconnect();
    this.leadTightHPF.disconnect();
    this.preLPF.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.channel3.disconnect();
    this.noiseGate.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.preamp5.disconnect();
    this.saturation5.disconnect();
    this.vCurve.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.graphicEQ.forEach(eq => eq.disconnect());
    this.channelMaster.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.cabinetSim.disconnect();
    this.micSim.disconnect();
    this.presence.disconnect();
    this.outputMaster.disconnect();
  }
}

export default MesaMarkVAmp;

