import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class BognerUberschallAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bogner Uberschall', 'bogner_uberschall');
    
    // BOGNER ÜBERSCHALL (German for "supersonic")
    // THE ultra-high-gain German monster
    // Used by Metallica, Lamb of God, Meshuggah, Fear Factory
    // Known for: EXTREME gain, brutal precision, thunderous low-end
    // 3 CHANNELS: Clean, Crunch, Lead/Überschall
    
    // ============================================
    // 3 CHANNELS (each with unique character)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean
    this.channel2 = audioContext.createGain(); // Crunch
    this.channel3 = audioContext.createGain(); // Lead/Überschall
    
    // Channel mixer for pop-free switching (equal-power crossfade)
    this.channelBus = audioContext.createGain();
    this.ch1Gain = audioContext.createGain();
    this.ch2Gain = audioContext.createGain();
    this.ch3Gain = audioContext.createGain();
    
    // Initialize all channel gains to 0 (silent)
    this.ch1Gain.gain.value = 0;
    this.ch2Gain.gain.value = 0;
    this.ch3Gain.gain.value = 0; // Will be set to 1 after setup
    
    // Connect all channel gains to channel bus
    this.ch1Gain.connect(this.channelBus);
    this.ch2Gain.connect(this.channelBus);
    this.ch3Gain.connect(this.channelBus);
    
    // Active channel
    this.activeChannel = 3; // 1, 2, 3
    this.channelsInitialized = false;
    
    // ============================================
    // CHANNEL STATE MEMORY (Per-channel settings)
    // ============================================
    this.channelState = {
      1: { gain: 45, bass: 55, middle: 60, treble: 60, presence: 50, depth: 45, volume: 60 },
      2: { gain: 65, bass: 62, middle: 52, treble: 68, presence: 60, depth: 55, volume: 68 },
      3: { gain: 85, bass: 70, middle: 42, treble: 72, presence: 68, depth: 68, volume: 75 }
    };
    
    // ============================================
    // PREAMP (6 cascading gain stages - EXTREME)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    this.preamp5 = audioContext.createGain();
    this.preamp6 = audioContext.createGain();
    
    // Saturation stages with Uberschall's brutal voicing
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    this.saturation5 = audioContext.createWaveShaper();
    this.saturation6 = audioContext.createWaveShaper();
    
    // Each stage has progressive asymmetry and brutality
    this.saturation1.curve = this.makeUberschallPreampCurve({stage: 1, drive: 7.5, asym: 1.04});
    this.saturation2.curve = this.makeUberschallPreampCurve({stage: 2, drive: 8.0, asym: 1.06});
    this.saturation3.curve = this.makeUberschallPreampCurve({stage: 3, drive: 8.8, asym: 1.09});
    this.saturation4.curve = this.makeUberschallPreampCurve({stage: 4, drive: 9.5, asym: 1.12});
    this.saturation5.curve = this.makeUberschallPreampCurve({stage: 5, drive: 10.0, asym: 1.15});
    this.saturation6.curve = this.makeUberschallPreampCurve({stage: 6, drive: 10.5, asym: 1.18});
    
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
    this.preEmph3.frequency.value = 1100;
    this.preEmph3.gain.value = 5; // +5 dB pre-emphasis
    
    this.preEmph4.type = 'highshelf';
    this.preEmph4.frequency.value = 1100;
    this.preEmph4.gain.value = 5;
    
    this.preEmph5.type = 'highshelf';
    this.preEmph5.frequency.value = 1100;
    this.preEmph5.gain.value = 5;
    
    this.preEmph6.type = 'highshelf';
    this.preEmph6.frequency.value = 1100;
    this.preEmph6.gain.value = 5;
    
    // De-emphasis (after heavy stages 3-6)
    this.deEmph3 = audioContext.createBiquadFilter();
    this.deEmph4 = audioContext.createBiquadFilter();
    this.deEmph5 = audioContext.createBiquadFilter();
    this.deEmph6 = audioContext.createBiquadFilter();
    
    this.deEmph3.type = 'highshelf';
    this.deEmph3.frequency.value = 1100;
    this.deEmph3.gain.value = -5; // -5 dB (compensates)
    
    this.deEmph4.type = 'highshelf';
    this.deEmph4.frequency.value = 1100;
    this.deEmph4.gain.value = -5;
    
    this.deEmph5.type = 'highshelf';
    this.deEmph5.frequency.value = 1100;
    this.deEmph5.gain.value = -5;
    
    this.deEmph6.type = 'highshelf';
    this.deEmph6.frequency.value = 1100;
    this.deEmph6.gain.value = -5;
    
    // ============================================
    // ÜBERSCHALL "ULTRA-TIGHT" FILTERS
    // ============================================
    // Primary HPF after 2nd stage - removes sub-bass
    this.ultraTightHPF1 = audioContext.createBiquadFilter();
    this.ultraTightHPF1.type = 'highpass';
    this.ultraTightHPF1.frequency.value = 85;
    this.ultraTightHPF1.Q.value = 0.8;
    
    // Secondary HPF after 4th stage - maximum tightness
    this.ultraTightHPF2 = audioContext.createBiquadFilter();
    this.ultraTightHPF2.type = 'highpass';
    this.ultraTightHPF2.frequency.value = 105;
    this.ultraTightHPF2.Q.value = 0.9;
    
    // ============================================
    // SURGICAL NOTCHES (Überschall precision)
    // ============================================
    // Remove low-mid "woof" (180-220 Hz)
    this.woofNotch = audioContext.createBiquadFilter();
    this.woofNotch.type = 'peaking';
    this.woofNotch.frequency.value = 195;
    this.woofNotch.Q.value = 1.4;
    this.woofNotch.gain.value = -2.0; // -2 dB cut
    
    // Remove "harshness" (4.8-5.5 kHz)
    this.harshnessNotch = audioContext.createBiquadFilter();
    this.harshnessNotch.type = 'peaking';
    this.harshnessNotch.frequency.value = 5200;
    this.harshnessNotch.Q.value = 3.2;
    this.harshnessNotch.gain.value = -1.8; // -1.8 dB cut
    
    // ============================================
    // BOGNER ÜBERSCHALL TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    this.depth = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750; // 750 Hz base
    this.middle.Q.value = 1.6; // Bogner characteristic
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3200;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 5000;
    this.presence.gain.value = 0;
    
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 80;
    this.depth.gain.value = 0;
    
    // ============================================
    // BOGNER "GERMAN AGGRESSION" VOICING
    // ============================================
    // Upper-mid brutality (Überschall signature)
    this.germanAggression = audioContext.createBiquadFilter();
    this.germanAggression.type = 'peaking';
    this.germanAggression.frequency.value = 1600;
    this.germanAggression.Q.value = 2.4;
    this.germanAggression.gain.value = 4.2; // Überschall signature aggression
    
    // Low-mid control (prevents muddiness)
    this.lowMidControl = audioContext.createBiquadFilter();
    this.lowMidControl.type = 'peaking';
    this.lowMidControl.frequency.value = 340;
    this.lowMidControl.Q.value = 1.6;
    this.lowMidControl.gain.value = -1.8; // Slight scoop for clarity
    
    // ============================================
    // MID SHIFT SWITCH (Bogner signature)
    // ============================================
    this.midShift = false; // false = normal, true = shifted
    
    // ============================================
    // GAIN BOOST SWITCH (Extra stage)
    // ============================================
    this.gainBoost = false;
    this.boostStage = audioContext.createGain();
    this.boostSaturation = audioContext.createWaveShaper();
    this.boostSaturation.curve = this.makeBoostCurve();
    this.boostSaturation.oversample = '4x';
    
    // ============================================
    // BRIGHT SWITCH (channel-dependent)
    // ============================================
    this.brightSwitch = false;
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3500;
    this.brightFilter.gain.value = 0; // +0..+4 dB when enabled
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (Professional grade)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -48,      // Überschall aggressive threshold
      thClose: -56,     // TRUE HYSTERESIS
      attack: 0.0005,   // 0.5ms attack (ultra-fast for metal)
      release: 0.11,    // 110ms release
      rms: 0.013,       // 13ms RMS window
      peakMix: 0.38,    // Peak-focused for key signal
      floorDb: -70,     // Musical floor
      holdMs: 7         // 7ms hold
    });
    this.gateEnabled = true;
    
    // Side-chain tap (signal post ultraTightHPF1 for gate key)
    this.gateSideChainTap = audioContext.createGain();
    this.gateSideChainTap.gain.value = 1.0;
    
    // ============================================
    // POWER AMP (4x EL34 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // POWER SUPPLY SAG - AUDIOWORKLET
    // Überschall uses tube rectifier for organic response
    this.rectifierMode = 'tube'; // 'silicon' or 'tube'
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.15,      // 15% sag (tube rectifier - heavy)
      att: 0.006,       // 6ms attack
      relFast: 0.065,   // 65ms fast recovery
      relSlow: 0.26,    // 260ms slow recovery (Bogner bloom)
      rmsMs: 24.0,      // 24ms RMS window
      shape: 1.6,       // Progressive/tube-like
      floor: 0.24,      // 24% minimum headroom
      peakMix: 0.32     // Balanced peak/RMS
    });
    
    // Power compression (EL34 behavior)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -17;
    this.powerComp.knee.value = 7;
    this.powerComp.ratio.value = 3.8;
    this.powerComp.attack.value = 0.004;
    this.powerComp.release.value = 0.11;
    
    // ============================================
    // DC BLOCKER (Essential for high-gain)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 28;
    this.dcBlock.Q.value = 0.707;
    
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
    // FIZZ TAMER DINÂMICO (post cabinet)
    // ============================================
    // LPF that responds to gain: 11 kHz (low gain) → 9.2 kHz (high gain)
    this.fizzTamer = audioContext.createBiquadFilter();
    this.fizzTamer.type = 'lowpass';
    this.fizzTamer.frequency.value = 11000; // Base frequency
    this.fizzTamer.Q.value = 0.707;
    
    // ============================================
    // LIMITER FINAL DE SEGURANÇA
    // ============================================
    this.finalLimiter = audioContext.createDynamicsCompressor();
    this.finalLimiter.threshold.value = -0.8; // -0.8 dBFS
    this.finalLimiter.knee.value = 0; // Hard knee (brick limiter)
    this.finalLimiter.ratio.value = 20; // Heavy limiting
    this.finalLimiter.attack.value = 0.003; // 3ms
    this.finalLimiter.release.value = 0.050; // 50ms
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    
    // Connect channel bus to channel volume (after crossfade mixer)
    this.channelBus.connect(this.channelVolume);
    
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
      channel: 3, // 1=clean, 2=crunch, 3=lead/überschall
      
      // Gain/Volume
      gain: 85,
      channel_volume: 75,
      
      // Tone stack
      bass: 70,
      middle: 42,
      treble: 72,
      presence: 68,
      depth: 68,
      
      // Switches
      bright: false,
      gain_boost: false,
      mid_shift: false,
      gate: true,
      rectifier: 'tube', // 'silicon' or 'tube'
      
      // Master
      master: 70,
      
      // FX Loop
      fx_loop: false,
      fx_mix: 0,
      fx_send: 80,
      fx_return: 100,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_v30',
      microphone: 'sm57',
      micPosition: 'edge'
    };
    
    // ============================================
    // ROUTING - Setup Lead channel (channel 3) by default
    // ============================================
    // Initialize all channels once (pop-free switching)
    this.initAllChannels();
    this.recreateCabinet();
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN (2 gain stages)
    
    // Gate -> Input (only connect once during init)
    if (!this.channelsInitialized) {
      if (this.gateEnabled) {
        this.input.connect(this.noiseGate);
        this.noiseGate.connect(this.channel1);
      } else {
        this.input.connect(this.channel1);
      }
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
    
    // Connect to channel 1 gain (crossfade mixer)
    this.brightFilter.connect(this.ch1Gain);
    
    // Channel-specific voicing
    this.ultraTightHPF1.frequency.value = 65; // More bass for clean
    this.germanAggression.gain.value = 1.5; // Less aggressive
    
    this.applyChState(1);
  }
  
  setupChannel2() {
    // CHANNEL 2 - CRUNCH (4 gain stages)
    
    // Gate -> Input (only connect once during init)
    if (!this.channelsInitialized) {
      if (this.gateEnabled) {
        this.input.connect(this.noiseGate);
        this.noiseGate.connect(this.channel2);
      } else {
        this.input.connect(this.channel2);
      }
    }
    
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.ultraTightHPF1);
    
    // Tap post ultraTightHPF1 for side-chain gate key (anti-pumping)
    if (!this.channelsInitialized) {
      this.ultraTightHPF1.connect(this.gateSideChainTap);
    }
    
    this.ultraTightHPF1.connect(this.woofNotch);
    this.woofNotch.connect(this.preamp3);
    this.preamp3.connect(this.preEmph3);
    this.preEmph3.connect(this.saturation3);
    this.saturation3.connect(this.deEmph3);
    
    this.deEmph3.connect(this.preamp4);
    this.preamp4.connect(this.preEmph4);
    this.preEmph4.connect(this.saturation4);
    this.saturation4.connect(this.deEmph4);
    this.deEmph4.connect(this.harshnessNotch);
    
    // Tone stack
    this.harshnessNotch.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanAggression);
    this.germanAggression.connect(this.lowMidControl);
    this.lowMidControl.connect(this.brightFilter);
    
    // Connect to channel 2 gain (crossfade mixer)
    this.brightFilter.connect(this.ch2Gain);
    
    // Channel-specific voicing
    this.ultraTightHPF1.frequency.value = 85;
    this.germanAggression.gain.value = 3.2;
    
    this.applyChState(2);
  }
  
  setupChannel3() {
    // CHANNEL 3 - LEAD/ÜBERSCHALL (6 gain stages - MAXIMUM BRUTALITY)
    
    // Gate -> Input (only connect once during init)
    if (!this.channelsInitialized) {
      if (this.gateEnabled) {
        this.input.connect(this.noiseGate);
        this.noiseGate.connect(this.channel3);
      } else {
        this.input.connect(this.channel3);
      }
    }
    
    // Stage 1-2 (no pre/de-emphasis)
    this.channel3.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.ultraTightHPF1);
    
    // Tap post ultraTightHPF1 for side-chain gate key (anti-pumping)
    if (!this.channelsInitialized) {
      this.ultraTightHPF1.connect(this.gateSideChainTap);
    }
    
    // Stage 3 (with pre/de-emphasis + woof notch)
    this.ultraTightHPF1.connect(this.woofNotch); // Remove woof
    this.woofNotch.connect(this.preamp3);
    this.preamp3.connect(this.preEmph3); // Pre-emphasis
    this.preEmph3.connect(this.saturation3);
    this.saturation3.connect(this.deEmph3); // De-emphasis
    
    // Stage 4 (with pre/de-emphasis)
    this.deEmph3.connect(this.preamp4);
    this.preamp4.connect(this.preEmph4);
    this.preEmph4.connect(this.saturation4);
    this.saturation4.connect(this.deEmph4);
    this.deEmph4.connect(this.ultraTightHPF2); // Second ultra-tight filter!
    
    // Gain Boost insertion point (optional extra stage)
    if (this.gainBoost) {
      this.ultraTightHPF2.connect(this.boostStage);
      this.boostStage.connect(this.boostSaturation);
      this.boostSaturation.connect(this.preamp5);
    } else {
      this.ultraTightHPF2.connect(this.preamp5);
    }
    
    // Stage 5 (with pre/de-emphasis)
    this.preamp5.connect(this.preEmph5);
    this.preEmph5.connect(this.saturation5);
    this.saturation5.connect(this.deEmph5);
    
    // Stage 6 (with pre/de-emphasis + harshness notch)
    this.deEmph5.connect(this.preamp6);
    this.preamp6.connect(this.preEmph6);
    this.preEmph6.connect(this.saturation6);
    this.saturation6.connect(this.deEmph6);
    this.deEmph6.connect(this.harshnessNotch); // Remove harshness
    
    // Tone stack
    this.harshnessNotch.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanAggression);
    this.germanAggression.connect(this.lowMidControl);
    this.lowMidControl.connect(this.brightFilter);
    
    // Connect to channel 3 gain (crossfade mixer)
    this.brightFilter.connect(this.ch3Gain);
    
    // Channel-specific voicing (TIGHTEST)
    this.ultraTightHPF1.frequency.value = 100;
    this.ultraTightHPF2.frequency.value = 115;
    this.germanAggression.gain.value = 4.5;
    this.lowMidControl.gain.value = -2.2; // More scoop for brutal clarity
    
    this.applyChState(3);
  }
  
  // Equal-power crossfade between channels (no pops/zippers)
  crossfadeToChannel(targetChannel, fadeMs = 35) {
    const now = this.audioContext.currentTime;
    const fadeTime = fadeMs / 1000;
    
    // Crossfade all 3 channels (equal-power)
    [this.ch1Gain, this.ch2Gain, this.ch3Gain].forEach((gain, idx) => {
      const channelNum = idx + 1;
      const targetGain = channelNum === targetChannel ? 1 : 0;
      
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + fadeTime);
    });
    
    this.activeChannel = targetChannel;
    this.applyChState(targetChannel);
  }
  
  // Initialize all 3 channels once (called at construction)
  initAllChannels() {
    if (this.channelsInitialized) return;
    
    // Setup all 3 channels without disconnecting
    this.setupChannel1();
    this.setupChannel2();
    this.setupChannel3();
    
    // Route power section once
    this.routePowerSection();
    
    // Start with channel 3 active (Lead)
    this.ch1Gain.gain.value = 0;
    this.ch2Gain.gain.value = 0;
    this.ch3Gain.gain.value = 1;
    this.activeChannel = 3;
    
    this.channelsInitialized = true;
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
    
    // Fizz tamer dinâmico (post cabinet)
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
      this.ultraTightHPF1.disconnect();
      this.ultraTightHPF2.disconnect();
      this.woofNotch.disconnect();
      this.harshnessNotch.disconnect();
      // Gain boost
      this.boostStage.disconnect();
      this.boostSaturation.disconnect();
      // Tone stack
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.germanAggression.disconnect();
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
    const gainBase = ch === 1 ? 1.5 : ch === 2 ? 5 : 9;
    this.preamp1.gain.setTargetAtTime(gainBase + (s.gain / 10), t, 0.01);
    this.bass.gain.setTargetAtTime((s.bass - 50) / 8, t, 0.01);
    this.middle.gain.setTargetAtTime((s.middle - 50) / 6, t, 0.01);
    this.treble.gain.setTargetAtTime((s.treble - 50) / 8, t, 0.01);
    this.presence.gain.setTargetAtTime((s.presence - 50) / 8, t, 0.01);
    this.depth.gain.setTargetAtTime((s.depth - 50) / 8, t, 0.01);
    this.channelVolume.gain.setTargetAtTime(s.volume / 100, t, 0.01);
  }
  
  applyInitialSettings() {
    // Preamp gains (cascading)
    this.preamp1.gain.value = 16;
    this.preamp2.gain.value = 3.0;
    this.preamp3.gain.value = 2.2;
    this.preamp4.gain.value = 1.8;
    this.preamp5.gain.value = 1.6;
    this.preamp6.gain.value = 1.4;
    
    // Gain boost stage
    this.boostStage.gain.value = 2.5;
    
    // Channel gains
    this.channel1.gain.value = 0.4;
    this.channel2.gain.value = 0.75;
    this.channel3.gain.value = 1.15;
    
    this.channelVolume.gain.value = 0.75;
    this.powerAmp.gain.value = 1.2;
    this.master.gain.value = 0.7;
  }
  
  makeUberschallPreampCurve({stage=1, drive=8.5, asym=1.10} = {}) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let x = (i * 2) / samples - 1;
      
      // BIAS SHIFT DINÂMICO: simula cathode follower rise
      const biasShift = -0.025 * Math.abs(x) * (stage / 6);
      x += biasShift;
      
      // ÜBERSCHALL "BRUTAL" PRECISION with extreme aggression
      let y = Math.tanh(x * drive);
      
      // ULTRA-TIGHT COMPRESSION with PROGRESSIVE KNEE
      const kneeStart = 0.48 - (stage * 0.02); // Earlier knee in high stages
      if (Math.abs(y) > kneeStart) {
        const excess = Math.abs(y) - kneeStart;
        const compression = 1 - excess * (0.42 + stage * 0.035); // Harder knee per stage
        y *= compression;
      }
      
      // GERMAN AGGRESSION (upper-mid brutality)
      y += 0.16 * Math.tanh(x * 11);
      
      // BRUTAL HIGH HARMONICS
      y += 0.14 * Math.tanh(x * 9.5);
      
      // Progressive hardness per stage
      const stageHardness = 1 + (stage * 0.07);
      y = Math.tanh(y * stageHardness);
      
      // Asymmetry (varies per stage)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.83;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL34 POWER TUBES (Überschall voicing)
      let y = Math.tanh(x * 1.85);
      
      // EL34 compression (tight, brutal)
      if (Math.abs(y) > 0.63) {
        const excess = Math.abs(y) - 0.63;
        y = Math.sign(y) * (0.63 + excess * 0.40);
      }
      
      // ÜBERSCHALL DEPTH (thunderous low-end)
      y += 0.13 * Math.tanh(x * 3.0);
      
      // EL34 aggression (upper harmonics)
      y += 0.11 * Math.tanh(x * 9.0);
      
      // Slight warmth
      y += 0.07 * Math.sin(x * Math.PI * 3.8);
      
      // Asymmetry (EL34 character)
      if (x > 0) y *= 1.20;
      
      curve[i] = y * 0.86;
    }
    return curve;
  }
  
  makeBoostCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // GAIN BOOST - extra brutality
      let y = Math.tanh(x * 12);
      
      // Hard clipping
      if (Math.abs(y) > 0.75) {
        y = Math.sign(y) * (0.75 + (Math.abs(y) - 0.75) * 0.25);
      }
      
      // Extra harmonics
      y += 0.10 * Math.tanh(x * 15);
      
      curve[i] = y * 0.75;
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
        // Use crossfade for pop-free channel switching
        this.crossfadeToChannel(value, 35);
        break;
      
      case 'gain': {
        const g = this.lin2log(value / 100) * 22;
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.50), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.28), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.22), now, 0.01);
        this.preamp4.gain.setTargetAtTime(Math.max(1, g * 0.18), now, 0.01);
        this.preamp5.gain.setTargetAtTime(Math.max(1, g * 0.15), now, 0.01);
        this.preamp6.gain.setTargetAtTime(Math.max(1, g * 0.13), now, 0.01);
        
        // FIZZ TAMER DINÂMICO: 11 kHz (low gain) → 9.2 kHz (high gain)
        const fizzFreq = 11000 - ((value / 100) * 1800); // 11000 → 9200 Hz
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
      
      case 'presence': {
        this.params.presence = value;
        this.channelState[this.activeChannel].presence = value;
        
        // Apply with NFB damping (based on current master)
        const masterVal = this.params.master ?? 70;
        const m = masterVal / 100;
        const nfbScale = 1 - 0.3 * Math.min(1, Math.max(0, (m - 0.7) / 0.3));
        
        this.presence.gain.setTargetAtTime(((value - 50) / 8) * nfbScale, now, 0.01);
        break;
      }
      
      case 'depth': {
        this.params.depth = value;
        this.channelState[this.activeChannel].depth = value;
        
        // Apply with NFB damping (based on current master)
        const masterVal = this.params.master ?? 70;
        const m = masterVal / 100;
        const nfbScale = 1 - 0.3 * Math.min(1, Math.max(0, (m - 0.7) / 0.3));
        
        this.depth.gain.setTargetAtTime(((value - 50) / 8) * nfbScale, now, 0.01);
        break;
      }
      
      case 'mid_shift':
        this.midShift = !!value;
        // Mid Shift: shifts middle frequency 750 Hz → 550 Hz
        const midFreq = this.midShift ? 550 : 750;
        this.middle.frequency.setTargetAtTime(midFreq, now, 0.02);
        break;
      
      case 'gain_boost':
        this.gainBoost = !!value;
        // Re-route channel 3 to add/remove boost stage
        if (this.activeChannel === 3) {
          this.setupChannel3();
        }
        break;
      
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
            depth: 0.08,      // 8% sag (tight silicon rectifier)
            att: 0.004,       // 4ms attack (faster)
            relFast: 0.05,    // 50ms fast recovery
            relSlow: 0.17,    // 170ms slow recovery
            rmsMs: 13.0,      // 13ms RMS window
            shape: 1.0,       // Linear (silicon)
            floor: 0.32,      // 32% minimum headroom
            peakMix: 0.26     // Peak-focused for attack
          });
        } else { // 'tube'
          this.powerSag = this.createSagProcessor('tube', {
            depth: 0.15,      // 15% sag (tube rectifier)
            att: 0.006,       // 6ms attack
            relFast: 0.065,   // 65ms fast recovery
            relSlow: 0.26,    // 260ms slow recovery (Bogner bloom)
            rmsMs: 24.0,      // 24ms RMS window
            shape: 1.6,       // Progressive/tube-like
            floor: 0.24,      // 24% minimum headroom
            peakMix: 0.32     // Balanced peak/RMS
          });
        }
        
        // Re-route current channel to apply new sag
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else this.setupChannel3();
        break;
      
      case 'bright':
        this.brightSwitch = !!value;
        const brightGain = this.brightSwitch ? 3.8 : 0;
        this.brightFilter.gain.setTargetAtTime(brightGain, now, 0.02);
        break;
      
      case 'gate':
        this.gateEnabled = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else this.setupChannel3();
        break;
      
      case 'master': {
        const m = value / 100;
        this.master.gain.setTargetAtTime(this.lin2log(m), now, 0.01);
        
        // NFB damping: Presence/Depth "murcham" with Master high (simulates real NFB)
        // With master > 0.7, reduces ~30% of effect
        const nfbScale = 1 - 0.3 * Math.min(1, Math.max(0, (m - 0.7) / 0.3));
        
        // Re-apply presence and depth with NFB scaling
        const presenceValue = this.params.presence ?? 68;
        const depthValue = this.params.depth ?? 68;
        
        this.presence.gain.setTargetAtTime(((presenceValue - 50) / 8) * nfbScale, now, 0.02);
        this.depth.gain.setTargetAtTime(((depthValue - 50) / 8) * nfbScale, now, 0.02);
        break;
      }
      
      case 'fx_loop':
        this.fxLoop = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else this.setupChannel3();
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
    this.ultraTightHPF1.disconnect();
    this.ultraTightHPF2.disconnect();
    this.boostStage.disconnect();
    this.boostSaturation.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.germanAggression.disconnect();
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

export default BognerUberschallAmp;

