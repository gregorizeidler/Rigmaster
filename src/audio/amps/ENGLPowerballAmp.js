import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class ENGLPowerballAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'ENGL Powerball', 'engl_powerball');
    
    // ENGL POWERBALL II
    // THE ultimate German high-gain machine
    // Used by Sepultura, Children of Bodom, In Flames, Arch Enemy
    // Known for: Brutal gain, surgical precision, devastating low-end
    // 4 CHANNELS: Clean, Crunch, Soft Lead, Heavy Lead
    
    // ============================================
    // 4 CHANNELS (each with unique character)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean
    this.channel2 = audioContext.createGain(); // Crunch
    this.channel3 = audioContext.createGain(); // Soft Lead
    this.channel4 = audioContext.createGain(); // Heavy Lead
    
    // Channel mixer for pop-free switching
    this.channelMixer = audioContext.createGain();
    this.ch1Gain = audioContext.createGain();
    this.ch2Gain = audioContext.createGain();
    this.ch3Gain = audioContext.createGain();
    this.ch4Gain = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 4; // 1, 2, 3, 4
    
    // ============================================
    // CHANNEL STATE MEMORY (Per-channel settings)
    // ============================================
    this.channelState = {
      1: { gain: 40, bass: 55, middle: 55, treble: 60, presence: 55, depth: 50, volume: 60 },
      2: { gain: 60, bass: 60, middle: 50, treble: 65, presence: 60, depth: 55, volume: 65 },
      3: { gain: 72, bass: 65, middle: 48, treble: 68, presence: 62, depth: 60, volume: 70 },
      4: { gain: 80, bass: 68, middle: 45, treble: 70, presence: 65, depth: 65, volume: 72 }
    };
    
    // ============================================
    // PREAMP (6 cascading 12AX7 gain stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    this.preamp5 = audioContext.createGain();
    this.preamp6 = audioContext.createGain();
    
    // Saturation stages with ENGL's unique voicing + pre/de-emphasis
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    this.saturation5 = audioContext.createWaveShaper();
    this.saturation6 = audioContext.createWaveShaper();
    
    // Each stage has progressive asymmetry and gain
    this.saturation1.curve = this.makeENGLPreampCurve({stage: 1, drive: 6.8, asym: 1.03});
    this.saturation2.curve = this.makeENGLPreampCurve({stage: 2, drive: 7.2, asym: 1.05});
    this.saturation3.curve = this.makeENGLPreampCurve({stage: 3, drive: 7.8, asym: 1.08});
    this.saturation4.curve = this.makeENGLPreampCurve({stage: 4, drive: 8.2, asym: 1.10});
    this.saturation5.curve = this.makeENGLPreampCurve({stage: 5, drive: 8.8, asym: 1.13});
    this.saturation6.curve = this.makeENGLPreampCurve({stage: 6, drive: 9.2, asym: 1.15});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    this.saturation5.oversample = '4x';
    this.saturation6.oversample = '4x';
    
    // ============================================
    // PRE/DE-EMPHASIS (Anti-aliasing tilt filters)
    // ============================================
    // Pre-emphasis (before heavy stages 3-6)
    this.preEmph3 = audioContext.createBiquadFilter();
    this.preEmph4 = audioContext.createBiquadFilter();
    this.preEmph5 = audioContext.createBiquadFilter();
    this.preEmph6 = audioContext.createBiquadFilter();
    
    this.preEmph3.type = 'highshelf';
    this.preEmph3.frequency.value = 1200;
    this.preEmph3.gain.value = 5; // +5 dB
    
    this.preEmph4.type = 'highshelf';
    this.preEmph4.frequency.value = 1200;
    this.preEmph4.gain.value = 5;
    
    this.preEmph5.type = 'highshelf';
    this.preEmph5.frequency.value = 1200;
    this.preEmph5.gain.value = 5;
    
    this.preEmph6.type = 'highshelf';
    this.preEmph6.frequency.value = 1200;
    this.preEmph6.gain.value = 5;
    
    // De-emphasis (after heavy stages 3-6)
    this.deEmph3 = audioContext.createBiquadFilter();
    this.deEmph4 = audioContext.createBiquadFilter();
    this.deEmph5 = audioContext.createBiquadFilter();
    this.deEmph6 = audioContext.createBiquadFilter();
    
    this.deEmph3.type = 'highshelf';
    this.deEmph3.frequency.value = 1200;
    this.deEmph3.gain.value = -5; // -5 dB (compensates)
    
    this.deEmph4.type = 'highshelf';
    this.deEmph4.frequency.value = 1200;
    this.deEmph4.gain.value = -5;
    
    this.deEmph5.type = 'highshelf';
    this.deEmph5.frequency.value = 1200;
    this.deEmph5.gain.value = -5;
    
    this.deEmph6.type = 'highshelf';
    this.deEmph6.frequency.value = 1200;
    this.deEmph6.gain.value = -5;
    
    // ============================================
    // ENGL "SURGICAL" TIGHT FILTERS
    // ============================================
    // HPF after 2nd stage - removes sub-bass flub
    this.tightHPF1 = audioContext.createBiquadFilter();
    this.tightHPF1.type = 'highpass';
    this.tightHPF1.frequency.value = 80;
    this.tightHPF1.Q.value = 0.707;
    
    // HPF after 4th stage - ultimate tightness
    this.tightHPF2 = audioContext.createBiquadFilter();
    this.tightHPF2.type = 'highpass';
    this.tightHPF2.frequency.value = 100;
    this.tightHPF2.Q.value = 0.8;
    
    // ============================================
    // SURGICAL NOTCHES (ENGL precision)
    // ============================================
    // Remove "boxiness" before 3rd/4th stage
    this.boxinessNotch = audioContext.createBiquadFilter();
    this.boxinessNotch.type = 'peaking';
    this.boxinessNotch.frequency.value = 200; // 180-220 Hz
    this.boxinessNotch.Q.value = 1.2;
    this.boxinessNotch.gain.value = -1.5; // -1 to -2 dB
    
    // Remove "ice-pick" after last waveshaper
    this.icePickNotch = audioContext.createBiquadFilter();
    this.icePickNotch.type = 'peaking';
    this.icePickNotch.frequency.value = 4800; // 4.5-5.2 kHz
    this.icePickNotch.Q.value = 3;
    this.icePickNotch.gain.value = -1.5; // -1 to -2 dB
    
    // ============================================
    // ENGL POWERBALL TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    this.depth = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 110;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 850;
    this.middle.Q.value = 1.6;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4800;
    this.presence.gain.value = 0;
    
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 75;
    this.depth.gain.value = 0;
    
    // ============================================
    // ENGL "GERMAN" VOICING FILTERS
    // ============================================
    // Upper-mid definition (ENGL clarity)
    this.germanClarity = audioContext.createBiquadFilter();
    this.germanClarity.type = 'peaking';
    this.germanClarity.frequency.value = 1400;
    this.germanClarity.Q.value = 2.2;
    this.germanClarity.gain.value = 3.5; // ENGL signature clarity
    
    // Low-mid control (prevents muddiness)
    this.lowMidControl = audioContext.createBiquadFilter();
    this.lowMidControl.type = 'peaking';
    this.lowMidControl.frequency.value = 320;
    this.lowMidControl.Q.value = 1.5;
    this.lowMidControl.gain.value = -1.5; // Slight scoop for clarity
    
    // ============================================
    // CONTOUR CONTROL (V-shape EQ)
    // ============================================
    this.contourAmount = 0; // 0..100
    this.contourLoCut = audioContext.createBiquadFilter();
    this.contourMidScoop = audioContext.createBiquadFilter();
    this.contourHiBoost = audioContext.createBiquadFilter();
    
    this.contourLoCut.type = 'highpass';
    this.contourLoCut.frequency.value = 100;
    this.contourLoCut.Q.value = 0.707;
    
    this.contourMidScoop.type = 'peaking';
    this.contourMidScoop.frequency.value = 650;
    this.contourMidScoop.Q.value = 2.5;
    this.contourMidScoop.gain.value = 0; // Adjusted by contour knob
    
    this.contourHiBoost.type = 'highshelf';
    this.contourHiBoost.frequency.value = 3500;
    this.contourHiBoost.gain.value = 0; // Adjusted by contour knob
    
    // ============================================
    // BRIGHT SWITCH (channel-dependent)
    // ============================================
    this.brightSwitch = false;
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3200;
    this.brightFilter.gain.value = 0; // +0..+4 dB when enabled
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (Professional grade)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -50,      // ENGL transparent threshold
      thClose: -58,     // TRUE HYSTERESIS
      attack: 0.0006,   // 0.6ms attack (ultra-fast)
      release: 0.12,    // 120ms release
      rms: 0.014,       // 14ms RMS window
      peakMix: 0.38,    // Balanced peak/RMS
      floorDb: -72,     // Musical floor
      holdMs: 8         // 8ms hold
    });
    this.gateEnabled = true;
    
    // ============================================
    // POWER AMP (4x EL34 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // POWER SUPPLY SAG - AUDIOWORKLET
    // ENGL Powerball II uses solid-state rectifier (silicon) by default
    this.rectifierMode = 'silicon'; // 'silicon' or 'tube'
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.06,      // 6% sag (tight silicon rectifier)
      att: 0.004,       // 4ms attack (faster)
      relFast: 0.05,    // 50ms fast recovery
      relSlow: 0.18,    // 180ms slow recovery (punch alemão)
      rmsMs: 12.0,      // 12ms RMS window
      shape: 1.0,       // Linear (silicon)
      floor: 0.30,      // 30% minimum headroom
      peakMix: 0.25     // Peak-focused for attack
    });
    
    // Power compression (EL34 behavior)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 8;
    this.powerComp.ratio.value = 3.5;
    this.powerComp.attack.value = 0.004;
    this.powerComp.release.value = 0.12;
    
    // ============================================
    // DC BLOCKER (Essential for high-gain)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_vintage';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // FIZZ TAMER DINÂMICO (pós cabinet)
    // ============================================
    // LPF que responde ao gain: 10.5 kHz (gain baixo) → 8.8 kHz (gain alto)
    this.fizzTamer = audioContext.createBiquadFilter();
    this.fizzTamer.type = 'lowpass';
    this.fizzTamer.frequency.value = 10500; // Base frequency
    this.fizzTamer.Q.value = 0.707;
    
    // ============================================
    // LIMITER FINAL DE SEGURANÇA
    // ============================================
    this.finalLimiter = audioContext.createDynamicsCompressor();
    this.finalLimiter.threshold.value = -1; // -1 dBFS
    this.finalLimiter.knee.value = 0; // Hard knee (brick limiter)
    this.finalLimiter.ratio.value = 20; // Heavy limiting
    this.finalLimiter.attack.value = 0.003; // 3ms
    this.finalLimiter.release.value = 0.050; // 50ms
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // EFFECTS LOOP (Parallel with mix)
    // ============================================
    this.fxLoop = false;
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxSendLevel = audioContext.createGain();
    this.fxReturnLevel = audioContext.createGain();
    this.fxMix = audioContext.createGain();
    this.fxDryTap = audioContext.createGain();
    
    this.fxSendLevel.gain.value = 0.8;
    this.fxReturnLevel.gain.value = 1.0;
    this.fxMix.gain.value = 0.0;
    this.fxDryTap.gain.value = 1.0;
    
    // ============================================
    // PARAMS (BEFORE SETUP!)
    // ============================================
    this.params = {
      channel: 4, // 1=clean, 2=crunch, 3=soft lead, 4=heavy lead
      
      // Gain/Volume
      gain: 80,
      channel_volume: 72,
      
      // Tone stack
      bass: 68,
      middle: 45,
      treble: 70,
      presence: 65,
      depth: 65,
      
      // Contour (V-shape)
      contour: 40,
      
      // Switches
      bright: false,
      gate: true,
      rectifier: 'silicon', // 'silicon' or 'tube'
      
      // Master
      master: 70,
      
      // FX Loop
      fx_loop: false,
      fx_mix: 0,
      fx_send: 80,
      fx_return: 100,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_vintage',
      microphone: 'sm57',
      micPosition: 'edge'
    };
    
    // ============================================
    // ROUTING - Setup Heavy Lead (channel 4) by default
    // ============================================
    this.setupChannel4();
    this.recreateCabinet();
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN (2 gain stages)
    this.disconnectAll();
    
    // Gate -> Input
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel1);
    } else {
      this.input.connect(this.channel1);
    }
    
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Tone stack
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.brightFilter);
    this.brightFilter.connect(this.channelVolume);
    
    this.routePowerSection();
    
    // Channel-specific voicing
    this.tightHPF1.frequency.value = 60; // More bass for clean
    this.germanClarity.gain.value = 2.0; // Less aggressive
    
    this.activeChannel = 1;
    this.applyChState(1);
  }
  
  setupChannel2() {
    // CHANNEL 2 - CRUNCH (3 gain stages)
    this.disconnectAll();
    
    // Gate -> Input
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel2);
    } else {
      this.input.connect(this.channel2);
    }
    
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.tightHPF1);
    this.tightHPF1.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Tone stack
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanClarity);
    this.germanClarity.connect(this.brightFilter);
    this.brightFilter.connect(this.channelVolume);
    
    this.routePowerSection();
    
    // Channel-specific voicing
    this.tightHPF1.frequency.value = 80;
    this.germanClarity.gain.value = 3.0;
    
    this.activeChannel = 2;
    this.applyChState(2);
  }
  
  setupChannel3() {
    // CHANNEL 3 - SOFT LEAD (4 gain stages)
    this.disconnectAll();
    
    // Gate -> Input
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel3);
    } else {
      this.input.connect(this.channel3);
    }
    
    // Stage 1-2 (sem pre/de-ênfase)
    this.channel3.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.tightHPF1);
    
    // Stage 3 (com pre/de-ênfase + boxiness notch)
    this.tightHPF1.connect(this.boxinessNotch);
    this.boxinessNotch.connect(this.preamp3);
    this.preamp3.connect(this.preEmph3);
    this.preEmph3.connect(this.saturation3);
    this.saturation3.connect(this.deEmph3);
    
    // Stage 4 (com pre/de-ênfase + ice-pick notch)
    this.deEmph3.connect(this.preamp4);
    this.preamp4.connect(this.preEmph4);
    this.preEmph4.connect(this.saturation4);
    this.saturation4.connect(this.deEmph4);
    this.deEmph4.connect(this.icePickNotch);
    
    // Tone stack with contour
    this.icePickNotch.connect(this.contourLoCut);
    this.contourLoCut.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.contourMidScoop);
    this.contourMidScoop.connect(this.treble);
    this.treble.connect(this.contourHiBoost);
    this.contourHiBoost.connect(this.germanClarity);
    this.germanClarity.connect(this.lowMidControl);
    this.lowMidControl.connect(this.brightFilter);
    this.brightFilter.connect(this.channelVolume);
    
    this.routePowerSection();
    
    // Channel-specific voicing
    this.tightHPF1.frequency.value = 90;
    this.germanClarity.gain.value = 3.5;
    
    this.activeChannel = 3;
    this.applyChState(3);
  }
  
  setupChannel4() {
    // CHANNEL 4 - HEAVY LEAD (6 gain stages - MAXIMUM BRUTALITY)
    this.disconnectAll();
    
    // Gate -> Input
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.channel4);
    } else {
      this.input.connect(this.channel4);
    }
    
    // Stage 1-2 (sem pre/de-ênfase)
    this.channel4.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.tightHPF1);
    
    // Stage 3 (com pre/de-ênfase + boxiness notch)
    this.tightHPF1.connect(this.boxinessNotch); // Remove boxiness
    this.boxinessNotch.connect(this.preamp3);
    this.preamp3.connect(this.preEmph3); // Pre-emphasis
    this.preEmph3.connect(this.saturation3);
    this.saturation3.connect(this.deEmph3); // De-emphasis
    
    // Stage 4 (com pre/de-ênfase)
    this.deEmph3.connect(this.preamp4);
    this.preamp4.connect(this.preEmph4);
    this.preEmph4.connect(this.saturation4);
    this.saturation4.connect(this.deEmph4);
    this.deEmph4.connect(this.tightHPF2); // Second tight filter!
    
    // Stage 5 (com pre/de-ênfase)
    this.tightHPF2.connect(this.preamp5);
    this.preamp5.connect(this.preEmph5);
    this.preEmph5.connect(this.saturation5);
    this.saturation5.connect(this.deEmph5);
    
    // Stage 6 (com pre/de-ênfase + ice-pick notch)
    this.deEmph5.connect(this.preamp6);
    this.preamp6.connect(this.preEmph6);
    this.preEmph6.connect(this.saturation6);
    this.saturation6.connect(this.deEmph6);
    this.deEmph6.connect(this.icePickNotch); // Remove ice-pick
    
    // Tone stack with contour
    this.icePickNotch.connect(this.contourLoCut);
    this.contourLoCut.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.contourMidScoop);
    this.contourMidScoop.connect(this.treble);
    this.treble.connect(this.contourHiBoost);
    this.contourHiBoost.connect(this.germanClarity);
    this.germanClarity.connect(this.lowMidControl);
    this.lowMidControl.connect(this.brightFilter);
    this.brightFilter.connect(this.channelVolume);
    
    this.routePowerSection();
    
    // Channel-specific voicing (TIGHTEST)
    this.tightHPF1.frequency.value = 95;
    this.tightHPF2.frequency.value = 110;
    this.germanClarity.gain.value = 4.0;
    this.lowMidControl.gain.value = -2.0; // More scoop for brutal clarity
    
    this.activeChannel = 4;
    this.applyChState(4);
  }
  
  routePowerSection() {
    // Presence & Depth (after tone stack)
    this.channelVolume.connect(this.presence);
    this.presence.connect(this.depth);
    
    // FX loop (parallel)
    if (this.fxLoop) {
      this.depth.connect(this.fxDryTap);
      this.depth.connect(this.fxSendLevel);
      this.fxSendLevel.connect(this.fxSend);
      this.fxReturn.connect(this.fxReturnLevel);
      
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else {
      this.depth.connect(this.powerSag || this.powerAmp);
    }
    
    // Power section
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    this.powerComp.connect(this.dcBlock);
    
    // Cabinet routing
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    
    // Fizz tamer dinâmico (pós cabinet)
    this.postCabinet.connect(this.fizzTamer);
    
    // Master e limiter final
    this.fizzTamer.connect(this.master);
    this.master.connect(this.finalLimiter);
    this.finalLimiter.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
      this.channel4.disconnect();
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
      this.preamp6.disconnect();
      this.saturation6.disconnect();
      // Pre/de-emphasis
      this.preEmph3.disconnect();
      this.preEmph4.disconnect();
      this.preEmph5.disconnect();
      this.preEmph6.disconnect();
      this.deEmph3.disconnect();
      this.deEmph4.disconnect();
      this.deEmph5.disconnect();
      this.deEmph6.disconnect();
      // Surgical filters
      this.tightHPF1.disconnect();
      this.tightHPF2.disconnect();
      this.boxinessNotch.disconnect();
      this.icePickNotch.disconnect();
      // Tone stack
      this.contourLoCut.disconnect();
      this.contourMidScoop.disconnect();
      this.contourHiBoost.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.germanClarity.disconnect();
      this.lowMidControl.disconnect();
      this.brightFilter.disconnect();
      this.channelVolume.disconnect();
      this.presence.disconnect();
      this.depth.disconnect();
      // FX loop
      this.fxDryTap.disconnect();
      this.fxSendLevel.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.fxReturnLevel.disconnect();
      this.fxMix.disconnect();
      // Power section
      if (this.powerSag) this.powerSag.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      // Output chain
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.fizzTamer.disconnect();
      this.master.disconnect();
      this.finalLimiter.disconnect();
    } catch (e) {}
  }
  
  applyChState(ch) {
    const s = this.channelState[ch];
    const t = this.audioContext.currentTime;
    
    // Apply channel-specific state
    const gainBase = ch === 1 ? 2 : ch === 2 ? 4 : ch === 3 ? 6 : 8;
    this.preamp1.gain.setTargetAtTime(gainBase + (s.gain / 12), t, 0.01);
    this.bass.gain.setTargetAtTime((s.bass - 50) / 8, t, 0.01);
    this.middle.gain.setTargetAtTime((s.middle - 50) / 6, t, 0.01);
    this.treble.gain.setTargetAtTime((s.treble - 50) / 8, t, 0.01);
    this.presence.gain.setTargetAtTime((s.presence - 50) / 8, t, 0.01);
    this.depth.gain.setTargetAtTime((s.depth - 50) / 8, t, 0.01);
    this.channelVolume.gain.setTargetAtTime(s.volume / 100, t, 0.01);
  }
  
  applyInitialSettings() {
    // Preamp gains (cascading)
    this.preamp1.gain.value = 14;
    this.preamp2.gain.value = 2.8;
    this.preamp3.gain.value = 2.0;
    this.preamp4.gain.value = 1.7;
    this.preamp5.gain.value = 1.5;
    this.preamp6.gain.value = 1.3;
    
    // Channel gains
    this.channel1.gain.value = 0.5;
    this.channel2.gain.value = 0.7;
    this.channel3.gain.value = 0.9;
    this.channel4.gain.value = 1.1;
    
    this.channelVolume.gain.value = 0.72;
    this.powerAmp.gain.value = 1.15;
    this.master.gain.value = 0.7;
  }
  
  makeENGLPreampCurve({stage=1, drive=7.5, asym=1.08} = {}) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let x = (i * 2) / samples - 1;
      
      // BIAS SHIFT DINÂMICO: reduz centro conforme |x| aumenta (simula cathode rise)
      const biasShift = -0.02 * Math.abs(x) * (stage / 6); // Aumenta com stage
      x += biasShift;
      
      // ENGL "SURGICAL" PRECISION with high-gain aggression
      let y = Math.tanh(x * drive);
      
      // TIGHT COMPRESSION with PROGRESSIVE KNEE (mais duro em stages altos)
      const kneeStart = 0.5 - (stage * 0.02); // Knee mais cedo em stages altos
      if (Math.abs(y) > kneeStart) {
        const excess = Math.abs(y) - kneeStart;
        const compression = 1 - excess * (0.40 + stage * 0.03); // Knee mais duro por stage
        y *= compression;
      }
      
      // GERMAN CLARITY (upper-mid definition)
      y += 0.14 * Math.tanh(x * 10);
      
      // BRUTAL AGGRESSION (high harmonics)
      y += 0.12 * Math.tanh(x * 8.5);
      
      // Progressive hardness per stage (aumenta mais rápido agora)
      const stageHardness = 1 + (stage * 0.06);
      y = Math.tanh(y * stageHardness);
      
      // Asymmetry (varies per stage)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL34 POWER TUBES (ENGL voicing)
      let y = Math.tanh(x * 1.75);
      
      // EL34 compression (tight, controlled)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.42);
      }
      
      // ENGL DEPTH (sub-bass punch with control)
      y += 0.11 * Math.tanh(x * 2.8);
      
      // EL34 aggression (upper harmonics)
      y += 0.10 * Math.tanh(x * 8.5);
      
      // Slight warmth
      y += 0.06 * Math.sin(x * Math.PI * 3.5);
      
      // Asymmetry (EL34 character)
      if (x > 0) y *= 1.18;
      
      curve[i] = y * 0.87;
    }
    return curve;
  }
  
  lin2log(value01) {
    return 0.001 * Math.pow(1000, value01); // ~-60dB to 0dB
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
        if (value === 1) {
          this.setupChannel1();
        } else if (value === 2) {
          this.setupChannel2();
        } else if (value === 3) {
          this.setupChannel3();
        } else if (value === 4) {
          this.setupChannel4();
        }
        break;
      
      case 'gain': {
        const g = this.lin2log(value / 100) * 20;
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.48), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.26), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.20), now, 0.01);
        this.preamp4.gain.setTargetAtTime(Math.max(1, g * 0.17), now, 0.01);
        this.preamp5.gain.setTargetAtTime(Math.max(1, g * 0.14), now, 0.01);
        this.preamp6.gain.setTargetAtTime(Math.max(1, g * 0.12), now, 0.01);
        
        // FIZZ TAMER DINÂMICO: 10.5 kHz (gain baixo) → 8.8 kHz (gain alto)
        const fizzFreq = 10500 - ((value / 100) * 1700); // 10500 → 8800 Hz
        this.fizzTamer.frequency.setTargetAtTime(fizzFreq, now, 0.01);
        
        this.channelState[this.activeChannel].gain = value;
        break;
      }
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        this.channelState[this.activeChannel].volume = value;
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        this.channelState[this.activeChannel].bass = value;
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 6, now, 0.01);
        this.channelState[this.activeChannel].middle = value;
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        this.channelState[this.activeChannel].treble = value;
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        this.channelState[this.activeChannel].presence = value;
        break;
      
      case 'depth':
        this.depth.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        this.channelState[this.activeChannel].depth = value;
        break;
      
      case 'contour': {
        // Contour creates V-shape: ENGL sutil (limita mid -6dB, hi +3dB)
        const amount = value / 100; // 0..1
        this.contourMidScoop.gain.setTargetAtTime(-6 * amount, now, 0.01); // Up to -6dB mid cut
        this.contourHiBoost.gain.setTargetAtTime(3 * amount, now, 0.01);   // Up to +3dB hi boost
        this.contourAmount = value;
        break;
      }
      
      case 'rectifier':
        this.rectifierMode = value;
        // Re-create sag processor with new mode
        if (this.powerSag) {
          try {
            this.powerSag.disconnect();
          } catch (e) {}
        }
        
        if (value === 'silicon') {
          this.powerSag = this.createSagProcessor('silicon', {
            depth: 0.06,      // 6% sag (tight silicon rectifier)
            att: 0.004,       // 4ms attack (faster)
            relFast: 0.05,    // 50ms fast recovery
            relSlow: 0.18,    // 180ms slow recovery (punch alemão)
            rmsMs: 12.0,      // 12ms RMS window
            shape: 1.0,       // Linear (silicon)
            floor: 0.30,      // 30% minimum headroom
            peakMix: 0.25     // Peak-focused for attack
          });
        } else { // 'tube'
          this.powerSag = this.createSagProcessor('tube', {
            depth: 0.13,      // 13% sag (ENGL heavy compression)
            att: 0.006,       // 6ms attack
            relFast: 0.07,    // 70ms fast recovery
            relSlow: 0.28,    // 280ms slow recovery (ENGL spongy feel)
            rmsMs: 22.0,      // 22ms RMS window
            shape: 1.5,       // Progressive/tube-like
            floor: 0.25,      // 25% minimum headroom
            peakMix: 0.29     // Balanced peak/RMS
          });
        }
        
        // Re-route current channel to apply new sag
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else if (this.activeChannel === 3) this.setupChannel3();
        else this.setupChannel4();
        break;
      
      case 'bright':
        this.brightSwitch = !!value;
        const brightGain = this.brightSwitch ? 3.5 : 0;
        this.brightFilter.gain.setTargetAtTime(brightGain, now, 0.02);
        break;
      
      case 'gate':
        this.gateEnabled = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else if (this.activeChannel === 3) this.setupChannel3();
        else this.setupChannel4();
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      case 'fx_loop':
        this.fxLoop = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else if (this.activeChannel === 3) this.setupChannel3();
        else this.setupChannel4();
        break;
      
      case 'fx_mix':
        this.fxMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_send':
        this.fxSendLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_return':
        this.fxReturnLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
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
    this.noiseGate.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.channel3.disconnect();
    this.channel4.disconnect();
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
    this.preamp6.disconnect();
    this.saturation6.disconnect();
    this.tightHPF1.disconnect();
    this.tightHPF2.disconnect();
    this.contourLoCut.disconnect();
    this.contourMidScoop.disconnect();
    this.contourHiBoost.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.germanClarity.disconnect();
    this.lowMidControl.disconnect();
    this.brightFilter.disconnect();
    this.channelVolume.disconnect();
    this.presence.disconnect();
    this.depth.disconnect();
    this.fxDryTap.disconnect();
    this.fxSendLevel.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.fxReturnLevel.disconnect();
    this.fxMix.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.preCabinet.disconnect();
    this.postCabinet.disconnect();
    if (this.cabinet && this.cabinet.input) {
      this.cabinet.input.disconnect();
    }
    if (this.cabinet && this.cabinet.output) {
      this.cabinet.output.disconnect();
    }
    this.master.disconnect();
  }
}

export default ENGLPowerballAmp;

