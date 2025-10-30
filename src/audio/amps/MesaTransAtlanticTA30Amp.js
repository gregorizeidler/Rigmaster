import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class MesaTransAtlanticTA30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa TransAtlantic TA-30', 'mesa_transatlantic_ta30');
    
    // MESA/BOOGIE TRANSATLANTIC TA-30
    // The boutique tone machine - British meets American
    // 2 CHANNELS with different modes and controls
    // EL84 power tubes (British character with Mesa precision)
    // Used by: Session players, boutique tone seekers
    // Known for: Versatility, responsive dynamics, tight low-end
    
    // ============================================
    // 2 CHANNELS (each with different modes and controls)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean/Edge
    this.channel2 = audioContext.createGain(); // Tweed/Hi1/Hi2
    
    // Channel mixer for pop-free switching (equal-power crossfade)
    this.channelBus = audioContext.createGain();
    this.ch1Gain = audioContext.createGain();
    this.ch2Gain = audioContext.createGain();
    
    // Initialize channel gains
    this.ch1Gain.gain.value = 0;
    this.ch2Gain.gain.value = 1; // Start on Lead channel
    
    // Connect channel gains to bus
    this.ch1Gain.connect(this.channelBus);
    this.ch2Gain.connect(this.channelBus);
    
    // Active channel and modes
    this.activeChannel = 2; // 1=Clean/Edge, 2=Tweed/Hi1/Hi2
    this.channel1Mode = 'clean'; // 'clean', 'edge'
    this.channel2Mode = 'hi1'; // 'tweed', 'hi1', 'hi2'
    this.channelsInitialized = false;
    
    // ============================================
    // CHANNEL STATE MEMORY (Per-channel settings)
    // ============================================
    this.channelState = {
      1: { gain: 35, bass: 60, treble: 65, cut: 50, master: 65 },
      2: { gain: 70, bass: 58, middle: 48, treble: 68, presence: 62, master: 70 }
    };
    
    // ============================================
    // TRANSATLANTIC VOICE SWITCH (British/American)
    // ============================================
    this.voice = 'american'; // 'british' or 'american'
    
    // British voice characteristics (adjusted frequencies)
    this.britishMidBoost = audioContext.createBiquadFilter();
    this.britishMidBoost.type = 'peaking';
    this.britishMidBoost.frequency.value = 950; // Adjusted from 1200
    this.britishMidBoost.Q.value = 1.6; // Adjusted from 1.8
    this.britishMidBoost.gain.value = 0; // Dynamic based on voice
    
    this.britishPresencePeak = audioContext.createBiquadFilter();
    this.britishPresencePeak.type = 'peaking';
    this.britishPresencePeak.frequency.value = 4700; // Adjusted from 3500
    this.britishPresencePeak.Q.value = 2.2; // Adjusted
    this.britishPresencePeak.gain.value = 0; // Dynamic based on voice
    
    // ============================================
    // PREAMP (4 cascading gain stages - EL84 inspired voicing)
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
    
    // Each stage has progressive character
    this.saturation1.curve = this.makeTransAtlanticPreampCurve({stage: 1, drive: 6.5, asym: 1.03});
    this.saturation2.curve = this.makeTransAtlanticPreampCurve({stage: 2, drive: 7.0, asym: 1.05});
    this.saturation3.curve = this.makeTransAtlanticPreampCurve({stage: 3, drive: 7.5, asym: 1.08});
    this.saturation4.curve = this.makeTransAtlanticPreampCurve({stage: 4, drive: 8.0, asym: 1.10});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // PRE/DE-EMPHASIS (Anti-aliasing tilt filters)
    // ============================================
    this.preEmph2 = audioContext.createBiquadFilter();
    this.preEmph3 = audioContext.createBiquadFilter();
    this.preEmph4 = audioContext.createBiquadFilter();
    
    this.preEmph2.type = 'highshelf';
    this.preEmph2.frequency.value = 1000;
    this.preEmph2.gain.value = 4;
    
    this.preEmph3.type = 'highshelf';
    this.preEmph3.frequency.value = 1000;
    this.preEmph3.gain.value = 5;
    
    this.preEmph4.type = 'highshelf';
    this.preEmph4.frequency.value = 1000;
    this.preEmph4.gain.value = 5;
    
    this.deEmph2 = audioContext.createBiquadFilter();
    this.deEmph3 = audioContext.createBiquadFilter();
    this.deEmph4 = audioContext.createBiquadFilter();
    
    this.deEmph2.type = 'highshelf';
    this.deEmph2.frequency.value = 1000;
    this.deEmph2.gain.value = -4;
    
    this.deEmph3.type = 'highshelf';
    this.deEmph3.frequency.value = 1000;
    this.deEmph3.gain.value = -5;
    
    this.deEmph4.type = 'highshelf';
    this.deEmph4.frequency.value = 1000;
    this.deEmph4.gain.value = -5;
    
    // ============================================
    // MESA TIGHTENING FILTERS (Clean low-end)
    // ============================================
    // Primary HPF - removes sub-bass
    this.tighteningHPF1 = audioContext.createBiquadFilter();
    this.tighteningHPF1.type = 'highpass';
    this.tighteningHPF1.frequency.value = 80;
    this.tighteningHPF1.Q.value = 0.8;
    
    // Secondary HPF - mode-dependent tightness (adjusted per mode)
    this.tighteningHPF2 = audioContext.createBiquadFilter();
    this.tighteningHPF2.type = 'highpass';
    this.tighteningHPF2.frequency.value = 95;
    this.tighteningHPF2.Q.value = 0.9;
    
    // Low-mid control (Mesa clarity)
    this.lowMidControl = audioContext.createBiquadFilter();
    this.lowMidControl.type = 'peaking';
    this.lowMidControl.frequency.value = 320;
    this.lowMidControl.Q.value = 1.5;
    this.lowMidControl.gain.value = -1.5; // Slight scoop
    
    // ============================================
    // TRANSATLANTIC TONE STACK
    // ============================================
    // Channel 1: Bass, Treble, Cut (no Mid or Presence)
    this.ch1Bass = audioContext.createBiquadFilter();
    this.ch1Treble = audioContext.createBiquadFilter();
    this.ch1Cut = audioContext.createBiquadFilter(); // High-end cut (like presence but inverted)
    
    this.ch1Bass.type = 'lowshelf';
    this.ch1Bass.frequency.value = 110;
    this.ch1Bass.gain.value = 0;
    
    this.ch1Treble.type = 'highshelf';
    this.ch1Treble.frequency.value = 3000;
    this.ch1Treble.gain.value = 0;
    
    this.ch1Cut.type = 'highshelf';
    this.ch1Cut.frequency.value = 4500; // Cut filter (inverted presence)
    this.ch1Cut.gain.value = 0; // Negative = more cut
    
    // Channel 2: Bass, Middle, Treble, Presence (full stack)
    this.ch2Bass = audioContext.createBiquadFilter();
    this.ch2Middle = audioContext.createBiquadFilter();
    this.ch2Treble = audioContext.createBiquadFilter();
    this.ch2Presence = audioContext.createBiquadFilter();
    
    this.ch2Bass.type = 'lowshelf';
    this.ch2Bass.frequency.value = 110;
    this.ch2Bass.gain.value = 0;
    
    this.ch2Middle.type = 'peaking';
    this.ch2Middle.frequency.value = 800; // American default
    this.ch2Middle.Q.value = 1.4;
    this.ch2Middle.gain.value = 0;
    
    this.ch2Treble.type = 'highshelf';
    this.ch2Treble.frequency.value = 3000;
    this.ch2Treble.gain.value = 0;
    
    this.ch2Presence.type = 'highshelf';
    this.ch2Presence.frequency.value = 4500;
    this.ch2Presence.gain.value = 0;
    
    // ============================================
    // BRIGHT CAP SIMULATION (Gain AND Master dependent)
    // ============================================
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2000;
    this.brightCap.gain.value = 0; // Dynamic based on gain AND master
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (More relaxed for dynamics)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -52,      // More relaxed
      thClose: -60,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack (preserve dynamics)
      release: 0.15,    // 150ms release (allow bloom)
      rms: 0.016,       // 16ms RMS window
      peakMix: 0.38,    // More RMS for smoothness
      floorDb: -60,     // Higher floor (less aggressive)
      holdMs: 5         // Shorter hold for dynamics
    });
    this.gateEnabled = false; // Start disabled for clean tones
    
    // Side-chain tap for gate key
    this.gateSideChainTap = audioContext.createGain();
    this.gateSideChainTap.gain.value = 1.0;
    
    // ============================================
    // PHASE INVERTER (PI) - Before power amp
    // ============================================
    this.phaseInverter = audioContext.createWaveShaper();
    this.phaseInverter.curve = this.makePhaseInverterCurve();
    this.phaseInverter.oversample = '2x';
    
    // PI high-pass and mid boost
    this.piHighPass = audioContext.createBiquadFilter();
    this.piHighPass.type = 'highpass';
    this.piHighPass.frequency.value = 60;
    this.piHighPass.Q.value = 0.707;
    
    this.piMidBoost = audioContext.createBiquadFilter();
    this.piMidBoost.type = 'peaking';
    this.piMidBoost.frequency.value = 3000;
    this.piMidBoost.Q.value = 1.2;
    this.piMidBoost.gain.value = 1.5; // Slight boost 2-4kHz
    
    // ============================================
    // POWER AMP (4x EL84 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // NEGATIVE FEEDBACK (NFB) - Presence control
    // ============================================
    this.nfbTap = audioContext.createBiquadFilter();
    this.nfbTap.type = 'highshelf';
    this.nfbTap.frequency.value = 3000;
    this.nfbTap.gain.value = 0; // Controlled by presence (inverted)
    
    // ============================================
    // POWER SWITCHING (30W / 15W / 5W)
    // ============================================
    this.wattage = 30; // 30, 15, 5
    this.powerScale = audioContext.createGain();
    this.powerScale.gain.value = 1.0;
    
    // ============================================
    // RECTIFIER SELECT (SILICON/TUBE)
    // ============================================
    this.rectifierMode = 'silicon'; // 'silicon' or 'tube'
    
    // POWER SUPPLY SAG - AUDIOWORKLET (dynamic depth)
    // Silicon rectifier (default) - tight, fast response
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.09,      // 9% sag (will be modulated)
      att: 0.005,       // 5ms attack
      relFast: 0.058,   // 58ms fast recovery
      relSlow: 0.22,    // 220ms slow recovery (EL84 bloom)
      rmsMs: 12.0,      // 12ms RMS window
      shape: 1.0,       // Linear response
      floor: 0.28,      // 28% minimum headroom
      peakMix: 0.32     // Balanced peak/RMS
    });
    
    // Envelope follower for dynamic sag modulation
    this.sagEnvelope = audioContext.createAnalyser();
    this.sagEnvelope.fftSize = 512;
    this.sagEnvelope.smoothingTimeConstant = 0.8;
    
    // Power compression (EL84 behavior)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -15;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3.5;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.09;
    
    // ============================================
    // DC BLOCKER (Essential for high-gain)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 25;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_blue'; // TA-30 typically runs into 1x12 or 2x12
    this.micType = 'sm57';
    this.micPosition = 'off_axis'; // More realistic than center
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // FIZZ TAMER DINÂMICO (post cabinet, gain-dependent)
    // ============================================
    this.fizzTamer = audioContext.createBiquadFilter();
    this.fizzTamer.type = 'lowpass';
    this.fizzTamer.frequency.value = 10000; // Dynamic: 10kHz clean → 9.5kHz high gain
    this.fizzTamer.Q.value = 0.707;
    
    // ============================================
    // LIMITER FINAL DE SEGURANÇA (more relaxed)
    // ============================================
    this.finalLimiter = audioContext.createDynamicsCompressor();
    this.finalLimiter.threshold.value = -1.5; // More headroom
    this.finalLimiter.knee.value = 0;
    this.finalLimiter.ratio.value = 20;
    this.finalLimiter.attack.value = 0.005;
    this.finalLimiter.release.value = 0.08;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelMaster = audioContext.createGain();
    this.outputMaster = audioContext.createGain();
    
    // ============================================
    // REVERB (per channel)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    this.reverbSend.gain.value = 0; // Off by default
    this.reverbReturn.gain.value = 0.5;
    
    // Simple spring reverb delays
    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    
    this.spring1.delayTime.value = 0.029;
    this.spring2.delayTime.value = 0.037;
    this.spring3.delayTime.value = 0.041;
    
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3500;
    this.reverbFilter.Q.value = 0.707;
    
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.35;
    
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
      channel: 2, // 1=clean/edge, 2=tweed/hi1/hi2
      mode: 'hi1', // depends on channel
      
      // Channel 1 controls
      ch1_gain: 35,
      ch1_bass: 60,
      ch1_treble: 65,
      ch1_cut: 50,
      ch1_master: 65,
      
      // Channel 2 controls
      ch2_gain: 70,
      ch2_bass: 58,
      ch2_middle: 48,
      ch2_treble: 68,
      ch2_presence: 62,
      ch2_master: 70,
      
      // Voice switch
      voice: 'american', // 'british' or 'american'
      
      // Power
      wattage: 30, // 30, 15, 5
      rectifier: 'silicon', // 'silicon' or 'tube'
      
      // Master
      master: 70,
      
      // Reverb
      reverb: 0,
      
      // Gate
      gate: false, // Start disabled
      
      // FX Loop
      fx_loop: false,
      fx_mix: 0,
      fx_send: 80,
      fx_return: 100,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '2x12_blue',
      microphone: 'sm57',
      micPosition: 'off_axis'
    };
    
    // ============================================
    // ROUTING - Setup Lead channel (channel 2) by default
    // ============================================
    this.initAllChannels();
    this.recreateCabinet();
    this.applyInitialSettings();
    
    // Start dynamic sag modulation loop
    this._startSagLoop();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN/EDGE
    // Tone stack comes EARLY (after first saturation) for open, dynamic feel
    
    // Gate -> Input (only connect once during init)
    if (!this.channelsInitialized) {
      if (this.gateEnabled) {
        this.input.connect(this.noiseGate);
        this.noiseGate.connect(this.channel1);
      } else {
        this.input.connect(this.channel1);
      }
    }
    
    // Stage 1
    this.channel1.connect(this.tighteningHPF1);
    this.tighteningHPF1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    
    // TONE STACK EARLY (Ch1 characteristic - more open/dynamic)
    this.saturation1.connect(this.ch1Bass);
    this.ch1Bass.connect(this.ch1Treble);
    this.ch1Treble.connect(this.ch1Cut);
    this.ch1Cut.connect(this.brightCap);
    this.brightCap.connect(this.britishMidBoost);
    this.britishMidBoost.connect(this.britishPresencePeak);
    
    // Stage 2
    this.britishPresencePeak.connect(this.preamp2);
    this.preamp2.connect(this.preEmph2);
    this.preEmph2.connect(this.saturation2);
    this.saturation2.connect(this.deEmph2);
    
    // Mode-dependent routing
    if (this.channel1Mode === 'clean') {
      // CLEAN mode: 2 stages, most open
      this.deEmph2.connect(this.lowMidControl);
    } else { // 'edge'
      // EDGE mode: 3 stages with second HPF
      this.deEmph2.connect(this.tighteningHPF2);
      this.tighteningHPF2.connect(this.preamp3);
      this.preamp3.connect(this.preEmph3);
      this.preEmph3.connect(this.saturation3);
      this.saturation3.connect(this.deEmph3);
      this.deEmph3.connect(this.lowMidControl);
    }
    
    // Connect to channel 1 gain (crossfade mixer)
    this.lowMidControl.connect(this.ch1Gain);
    
    this.applyChState(1);
    this.applyModeVoicing();
  }
  
  setupChannel2() {
    // CHANNEL 2 - TWEED/HI1/HI2
    // Tone stack comes LATER (after 2-3 stages) for compressed, creamy feel
    
    // Gate -> Input (only connect once during init)
    if (!this.channelsInitialized) {
      if (this.gateEnabled) {
        this.input.connect(this.noiseGate);
        this.noiseGate.connect(this.channel2);
      } else {
        this.input.connect(this.channel2);
      }
    }
    
    // Stage 1-2
    this.channel2.connect(this.tighteningHPF1);
    
    // Tap for side-chain gate key
    if (!this.channelsInitialized) {
      this.tighteningHPF1.connect(this.gateSideChainTap);
    }
    
    this.tighteningHPF1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.preEmph2);
    this.preEmph2.connect(this.saturation2);
    this.saturation2.connect(this.deEmph2);
    
    // Mode-dependent routing
    if (this.channel2Mode === 'tweed') {
      // TWEED mode: 2 stages, then tone stack
      this.deEmph2.connect(this.ch2Bass);
    } else if (this.channel2Mode === 'hi1') {
      // HI1 mode: 3 stages with second HPF, then tone stack
      this.deEmph2.connect(this.tighteningHPF2);
      this.tighteningHPF2.connect(this.preamp3);
      this.preamp3.connect(this.preEmph3);
      this.preEmph3.connect(this.saturation3);
      this.saturation3.connect(this.deEmph3);
      this.deEmph3.connect(this.ch2Bass);
    } else { // 'hi2'
      // HI2 mode: 4 stages maximum gain, then tone stack
      this.deEmph2.connect(this.tighteningHPF2);
      this.tighteningHPF2.connect(this.preamp3);
      this.preamp3.connect(this.preEmph3);
      this.preEmph3.connect(this.saturation3);
      this.saturation3.connect(this.deEmph3);
      this.deEmph3.connect(this.preamp4);
      this.preamp4.connect(this.preEmph4);
      this.preEmph4.connect(this.saturation4);
      this.saturation4.connect(this.deEmph4);
      this.deEmph4.connect(this.ch2Bass);
    }
    
    // TONE STACK LATE (Ch2 characteristic - more compressed/creamy)
    this.ch2Bass.connect(this.ch2Middle);
    this.ch2Middle.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Presence);
    this.ch2Presence.connect(this.brightCap);
    this.brightCap.connect(this.britishMidBoost);
    this.britishMidBoost.connect(this.britishPresencePeak);
    this.britishPresencePeak.connect(this.lowMidControl);
    
    // Connect to channel 2 gain (crossfade mixer)
    this.lowMidControl.connect(this.ch2Gain);
    
    this.applyChState(2);
    this.applyModeVoicing();
  }
  
  // Equal-power crossfade between channels
  crossfadeToChannel(targetChannel, fadeMs = 35) {
    const now = this.audioContext.currentTime;
    const fadeTime = fadeMs / 1000;
    
    // Crossfade both channels (equal-power)
    [this.ch1Gain, this.ch2Gain].forEach((gain, idx) => {
      const channelNum = idx + 1;
      const targetGain = channelNum === targetChannel ? 1 : 0;
      
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + fadeTime);
    });
    
    this.activeChannel = targetChannel;
    this.applyChState(targetChannel);
    this.applyModeVoicing();
  }
  
  // Initialize all channels once
  initAllChannels() {
    if (this.channelsInitialized) return;
    
    // Setup both channels
    this.setupChannel1();
    this.setupChannel2();
    
    // Route power section once
    this.routePowerSection();
    
    // Start with channel 2 active (Lead)
    this.ch1Gain.gain.value = 0;
    this.ch2Gain.gain.value = 1;
    this.activeChannel = 2;
    
    this.channelsInitialized = true;
  }
  
  routePowerSection() {
    // Channel master
    this.channelBus.connect(this.channelMaster);
    
    // Reverb (parallel)
    this.channelMaster.connect(this.reverbSend);
    this.reverbSend.connect(this.spring1);
    this.reverbSend.connect(this.spring2);
    this.reverbSend.connect(this.spring3);
    
    // Continue to power section
    this.channelMaster.connect(this.powerScale);
    
    // Mix reverb return
    this.reverbReturn.connect(this.powerScale);
    
    // FX loop (if enabled)
    if (this.fxLoop) {
      this.powerScale.connect(this.fxDryTap);
      this.powerScale.connect(this.fxSendLevel);
      this.fxSendLevel.connect(this.fxSend);
      this.fxReturn.connect(this.fxReturnLevel);
      
      // Phase Inverter
      this.fxDryTap.connect(this.piHighPass);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.piHighPass);
    } else {
      // Phase Inverter
      this.powerScale.connect(this.piHighPass);
    }
    
    // PI chain
    this.piHighPass.connect(this.piMidBoost);
    this.piMidBoost.connect(this.phaseInverter);
    
    // Power section with sag
    this.phaseInverter.connect(this.powerSag || this.powerAmp);
    
    // Tap for sag envelope
    this.phaseInverter.connect(this.sagEnvelope);
    
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    
    // NFB (Negative Feedback) - emulates presence interaction
    this.powerComp.connect(this.nfbTap);
    this.nfbTap.connect(this.dcBlock);
    
    // Cabinet routing
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    
    // Fizz tamer (post cabinet)
    this.postCabinet.connect(this.fizzTamer);
    
    // Master and limiter
    this.fizzTamer.connect(this.outputMaster);
    this.outputMaster.connect(this.finalLimiter);
    this.finalLimiter.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.tighteningHPF1.disconnect();
      this.tighteningHPF2.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.preEmph2.disconnect();
      this.preEmph3.disconnect();
      this.preEmph4.disconnect();
      this.deEmph2.disconnect();
      this.deEmph3.disconnect();
      this.deEmph4.disconnect();
      this.ch1Bass.disconnect();
      this.ch1Treble.disconnect();
      this.ch1Cut.disconnect();
      this.ch2Bass.disconnect();
      this.ch2Middle.disconnect();
      this.ch2Treble.disconnect();
      this.ch2Presence.disconnect();
      this.britishMidBoost.disconnect();
      this.britishPresencePeak.disconnect();
      this.brightCap.disconnect();
      this.lowMidControl.disconnect();
      this.channelMaster.disconnect();
      this.reverbSend.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbReturn.disconnect();
      this.fxDryTap.disconnect();
      this.fxSendLevel.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.fxReturnLevel.disconnect();
      this.fxMix.disconnect();
      this.powerScale.disconnect();
      this.piHighPass.disconnect();
      this.piMidBoost.disconnect();
      this.phaseInverter.disconnect();
      this.sagEnvelope.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.nfbTap.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.fizzTamer.disconnect();
      this.outputMaster.disconnect();
      this.finalLimiter.disconnect();
    } catch (e) {}
  }
  
  applyChState(ch) {
    const s = this.channelState[ch];
    const t = this.audioContext.currentTime;
    
    if (ch === 1) {
      // Channel 1 controls
      const gainBase = 2.0;
      this.preamp1.gain.setTargetAtTime(gainBase + (s.gain / 12), t, 0.01);
      this.ch1Bass.gain.setTargetAtTime((s.bass - 50) / 8, t, 0.01);
      this.ch1Treble.gain.setTargetAtTime((s.treble - 50) / 8, t, 0.01);
      this.ch1Cut.gain.setTargetAtTime(-(s.cut - 50) / 8, t, 0.01); // Inverted (cut, not boost)
      this.channelMaster.gain.setTargetAtTime(s.master / 100, t, 0.01);
    } else {
      // Channel 2 controls
      const gainBase = 5.0;
      this.preamp1.gain.setTargetAtTime(gainBase + (s.gain / 12), t, 0.01);
      this.ch2Bass.gain.setTargetAtTime((s.bass - 50) / 8, t, 0.01);
      this.ch2Middle.gain.setTargetAtTime((s.middle - 50) / 7, t, 0.01);
      this.ch2Treble.gain.setTargetAtTime((s.treble - 50) / 8, t, 0.01);
      this.ch2Presence.gain.setTargetAtTime((s.presence - 50) / 8, t, 0.01);
      this.channelMaster.gain.setTargetAtTime(s.master / 100, t, 0.01);
    }
  }
  
  applyModeVoicing() {
    const now = this.audioContext.currentTime;
    
    // Adjust HPF2 based on mode (tight vs thicker)
    if (this.activeChannel === 1) {
      if (this.channel1Mode === 'clean') {
        // Clean: open low-end
        this.tighteningHPF1.frequency.setTargetAtTime(80, now, 0.02);
        this.tighteningHPF2.frequency.setTargetAtTime(90, now, 0.02);
        this.tighteningHPF2.Q.setTargetAtTime(0.7, now, 0.02);
      } else { // 'edge'
        // Edge: tight low-end
        this.tighteningHPF1.frequency.setTargetAtTime(80, now, 0.02);
        this.tighteningHPF2.frequency.setTargetAtTime(130, now, 0.02);
        this.tighteningHPF2.Q.setTargetAtTime(0.95, now, 0.02);
      }
    } else {
      if (this.channel2Mode === 'tweed') {
        // Tweed: thick, open
        this.tighteningHPF1.frequency.setTargetAtTime(75, now, 0.02);
        this.tighteningHPF2.frequency.setTargetAtTime(85, now, 0.02);
        this.tighteningHPF2.Q.setTargetAtTime(0.75, now, 0.02);
      } else if (this.channel2Mode === 'hi1') {
        // Hi1: balanced tightness
        this.tighteningHPF1.frequency.setTargetAtTime(80, now, 0.02);
        this.tighteningHPF2.frequency.setTargetAtTime(110, now, 0.02);
        this.tighteningHPF2.Q.setTargetAtTime(0.85, now, 0.02);
      } else { // 'hi2'
        // Hi2: tightest
        this.tighteningHPF1.frequency.setTargetAtTime(85, now, 0.02);
        this.tighteningHPF2.frequency.setTargetAtTime(130, now, 0.02);
        this.tighteningHPF2.Q.setTargetAtTime(0.95, now, 0.02);
      }
    }
  }
  
  applyInitialSettings() {
    // Preamp gains (cascading)
    this.preamp1.gain.value = 10;
    this.preamp2.gain.value = 2.5;
    this.preamp3.gain.value = 2.0;
    this.preamp4.gain.value = 1.7;
    
    // Channel gains
    this.channel1.gain.value = 0.6;
    this.channel2.gain.value = 1.0;
    
    this.channelMaster.gain.value = 0.70;
    this.powerAmp.gain.value = 1.15;
    this.outputMaster.gain.value = 0.70;
    
    // Apply voice setting
    this.updateVoice();
  }
  
  makeTransAtlanticPreampCurve({stage=1, drive=7.0, asym=1.05} = {}) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let x = (i * 2) / samples - 1;
      
      // BIAS SHIFT: simulates cathode follower
      const biasShift = -0.02 * Math.abs(x) * (stage / 4);
      x += biasShift;
      
      // TRANSATLANTIC CHARACTER: British/American hybrid
      // Smooth compression with EL84 character
      let y = Math.tanh(x * drive);
      
      // PROGRESSIVE KNEE (earlier in high stages)
      const kneeStart = 0.52 - (stage * 0.015);
      if (Math.abs(y) > kneeStart) {
        const excess = Math.abs(y) - kneeStart;
        const compression = 1 - excess * (0.38 + stage * 0.03);
        y *= compression;
      }
      
      // BRITISH MID CHARACTER (when voice is british)
      y += 0.12 * Math.tanh(x * 8.5);
      
      // MESA CLARITY (upper harmonics)
      y += 0.10 * Math.tanh(x * 9);
      
      // Progressive hardness per stage
      const stageHardness = 1 + (stage * 0.05);
      y = Math.tanh(y * stageHardness);
      
      // Asymmetry (varies per stage)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePhaseInverterCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // PHASE INVERTER - Soft, musical clipping
      let y = Math.tanh(x * 1.3);
      
      // Soft knee compression
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.6);
      }
      
      // Asymmetry (PI characteristic)
      y *= x > 0 ? 1.06 : 0.97;
      
      curve[i] = y * 0.92;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL84 POWER TUBES (Class A/B)
      // EL84: More compression than EL34, less than 6L6
      let y = Math.tanh(x * 1.75);
      
      // EL84 compression (smooth, musical)
      if (Math.abs(y) > 0.60) {
        const excess = Math.abs(y) - 0.60;
        y = Math.sign(y) * (0.60 + excess * 0.45);
      }
      
      // EL84 CHARACTER (British warmth)
      y += 0.12 * Math.tanh(x * 2.8);
      
      // EL84 harmonics (sweeter than 6L6)
      y += 0.10 * Math.tanh(x * 8.5);
      
      // Slight warmth
      y += 0.06 * Math.sin(x * Math.PI * 3.5);
      
      // Asymmetry (EL84 character - grows with level)
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.87;
    }
    return curve;
  }
  
  lin2log(value01) {
    return 0.001 * Math.pow(1000, value01); // ~-60dB to 0dB
  }
  
  updateVoice() {
    const now = this.audioContext.currentTime;
    
    if (this.voice === 'british') {
      // BRITISH VOICE: Mid-focused, presence peak (adjusted frequencies)
      this.britishMidBoost.gain.setTargetAtTime(3.5, now, 0.02);
      this.britishPresencePeak.gain.setTargetAtTime(2.8, now, 0.02);
      this.ch2Middle.frequency.setTargetAtTime(950, now, 0.02); // Adjusted
      this.ch2Middle.Q.setTargetAtTime(1.6, now, 0.02); // Sharper Q
      this.tighteningHPF1.frequency.setTargetAtTime(85, now, 0.02); // Slightly looser
    } else { // 'american'
      // AMERICAN VOICE: More scooped, tighter low-end
      this.britishMidBoost.gain.setTargetAtTime(0, now, 0.02);
      this.britishPresencePeak.gain.setTargetAtTime(0, now, 0.02);
      this.ch2Middle.frequency.setTargetAtTime(800, now, 0.02); // Lower mid freq
      this.ch2Middle.Q.setTargetAtTime(1.2, now, 0.02); // Wider Q
      this.tighteningHPF1.frequency.setTargetAtTime(80, now, 0.02); // Tighter
    }
  }
  
  updateWattage() {
    const now = this.audioContext.currentTime;
    
    // Wattage affects power amp behavior and sag depth
    const wattageMap = {
      30: { gain: 1.15, comp_thr: -15, comp_rat: 3.5, lpf: 10000, sagMult: 1.0 },
      15: { gain: 1.05, comp_thr: -12, comp_rat: 4.0, lpf: 9800, sagMult: 1.15 },
      5:  { gain: 0.85, comp_thr: -9, comp_rat: 4.5, lpf: 9600, sagMult: 1.35 }
    };
    
    const settings = wattageMap[this.wattage] || wattageMap[30];
    
    this.powerAmp.gain.setTargetAtTime(settings.gain, now, 0.02);
    this.powerComp.threshold.setTargetAtTime(settings.comp_thr, now, 0.05);
    this.powerComp.ratio.setTargetAtTime(settings.comp_rat, now, 0.05);
    this.fizzTamer.frequency.setTargetAtTime(settings.lpf, now, 0.05);
    
    // Update sag based on wattage (5W breathes more)
    if (this.powerSag && this.powerSag.parameters) {
      const baseSag = this.rectifierMode === 'tube' ? 0.14 : 0.09;
      const sagDepth = baseSag * settings.sagMult;
      this.powerSag.parameters.get('depth').setValueAtTime(sagDepth, now);
    }
  }
  
  _startSagLoop() {
    // Dynamic sag modulation based on power amp level
    this._sagInterval = setInterval(() => {
      if (!this.powerSag || !this.powerSag.parameters || !this.sagEnvelope) return;
      
      const now = this.audioContext.currentTime;
      const buffer = new Uint8Array(this.sagEnvelope.frequencyBinCount);
      this.sagEnvelope.getByteTimeDomainData(buffer);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const normalized = (buffer[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / buffer.length);
      
      // Modulate sag depth based on signal level
      const baseSag = this.rectifierMode === 'tube' ? 0.14 : 0.09;
      const wattageMap = { 30: 1.0, 15: 1.15, 5: 1.35 };
      const sagMult = wattageMap[this.wattage] || 1.0;
      
      // More sag when signal is high
      const dynamicSag = baseSag * sagMult * (1 + rms * 0.3);
      
      this.powerSag.parameters.get('depth').setValueAtTime(Math.min(dynamicSag, 0.25), now);
      
      // Also modulate release time (slower when pushed hard)
      const baseRelSlow = this.rectifierMode === 'tube' ? 0.27 : 0.22;
      const dynamicRelSlow = baseRelSlow * (1 + rms * 0.2);
      this.powerSag.parameters.get('relSlow').setValueAtTime(Math.min(dynamicRelSlow, 0.35), now);
      
    }, 16); // ~60 Hz
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
      
      case 'mode':
        // Store mode for current channel
        if (this.activeChannel === 1) {
          this.channel1Mode = value;
          this.setupChannel1();
        } else {
          this.channel2Mode = value;
          this.setupChannel2();
        }
        this.routePowerSection();
        break;
      
      // CHANNEL 1 CONTROLS
      case 'ch1_gain':
      case 'gain': {
        if (this.activeChannel === 1 || parameter === 'ch1_gain') {
          const g = this.lin2log(value / 100) * 15;
          this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.60), now, 0.01);
          this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.32), now, 0.01);
          
          // BRIGHT CAP: boost when gain is LOW, reduced by master
          const masterFactor = 1 - (this.channelState[1].master / 150); // Reduce with master
          const brightBoost = (1 - (value / 100)) * 1.5 * masterFactor;
          this.brightCap.gain.setTargetAtTime(brightBoost, now, 0.01);
          
          // FIZZ TAMER: darken with high gain (only above 65)
          const fizzFreq = value > 65 ? 10000 - ((value - 65) / 35 * 500) : 10000;
          this.fizzTamer.frequency.setTargetAtTime(fizzFreq, now, 0.01);
          
          this.channelState[1].gain = value;
        }
        break;
      }
      
      case 'ch1_bass':
      case 'bass':
        if (this.activeChannel === 1 || parameter === 'ch1_bass') {
          this.ch1Bass.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
          this.channelState[1].bass = value;
        }
        break;
      
      case 'ch1_treble':
      case 'treble':
        if (this.activeChannel === 1 || parameter === 'ch1_treble') {
          this.ch1Treble.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
          this.channelState[1].treble = value;
        }
        break;
      
      case 'ch1_cut':
      case 'cut':
        if (this.activeChannel === 1 || parameter === 'ch1_cut') {
          this.ch1Cut.gain.setTargetAtTime(-(value - 50) / 8, now, 0.01); // Inverted
          this.channelState[1].cut = value;
        }
        break;
      
      case 'ch1_master':
        if (this.activeChannel === 1) {
          this.channelMaster.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
          
          // Update bright cap (reduced with master)
          const gainValue = this.channelState[1].gain;
          const masterFactor = 1 - (value / 150);
          const brightBoost = (1 - (gainValue / 100)) * 1.5 * masterFactor;
          this.brightCap.gain.setTargetAtTime(brightBoost, now, 0.01);
          
          this.channelState[1].master = value;
        }
        break;
      
      // CHANNEL 2 CONTROLS
      case 'ch2_gain':
        if (this.activeChannel === 2) {
          const g = this.lin2log(value / 100) * 18;
          this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.55), now, 0.01);
          this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.30), now, 0.01);
          this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.24), now, 0.01);
          this.preamp4.gain.setTargetAtTime(Math.max(1, g * 0.20), now, 0.01);
          
          // BRIGHT CAP: boost when gain is LOW, reduced by master
          const masterFactor = 1 - (this.channelState[2].master / 150);
          const brightBoost = (1 - (value / 100)) * 2.0 * masterFactor;
          this.brightCap.gain.setTargetAtTime(brightBoost, now, 0.01);
          
          // FIZZ TAMER: darken with high gain (only above 65)
          const fizzFreq = value > 65 ? 10000 - ((value - 65) / 35 * 400) : 10000;
          this.fizzTamer.frequency.setTargetAtTime(fizzFreq, now, 0.01);
          
          this.channelState[2].gain = value;
        }
        break;
      
      case 'ch2_bass':
        if (this.activeChannel === 2) {
          this.ch2Bass.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
          this.channelState[2].bass = value;
        }
        break;
      
      case 'ch2_middle':
      case 'middle':
      case 'mid':
        if (this.activeChannel === 2) {
          this.ch2Middle.gain.setTargetAtTime((value - 50) / 7, now, 0.01);
          this.channelState[2].middle = value;
        }
        break;
      
      case 'ch2_treble':
        if (this.activeChannel === 2) {
          this.ch2Treble.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
          this.channelState[2].treble = value;
        }
        break;
      
      case 'ch2_presence':
      case 'presence':
        if (this.activeChannel === 2) {
          this.ch2Presence.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
          
          // NFB TAP (inverted presence for feedback simulation)
          this.nfbTap.gain.setTargetAtTime(-(value - 50) / 12, now, 0.01);
          
          this.channelState[2].presence = value;
        }
        break;
      
      case 'ch2_master':
        if (this.activeChannel === 2) {
          this.channelMaster.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
          
          // Update bright cap (reduced with master)
          const gainValue = this.channelState[2].gain;
          const masterFactor = 1 - (value / 150);
          const brightBoost = (1 - (gainValue / 100)) * 2.0 * masterFactor;
          this.brightCap.gain.setTargetAtTime(brightBoost, now, 0.01);
          
          this.channelState[2].master = value;
        }
        break;
      
      case 'voice':
        this.voice = value;
        this.updateVoice();
        break;
      
      case 'wattage':
        this.wattage = parseInt(value);
        this.updateWattage();
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
            depth: 0.09,      // Will be modulated dynamically
            att: 0.005,       // 5ms attack
            relFast: 0.058,   // 58ms fast recovery
            relSlow: 0.22,    // 220ms slow recovery
            rmsMs: 12.0,      // 12ms RMS window
            shape: 1.0,       // Linear
            floor: 0.28,      // 28% minimum headroom
            peakMix: 0.32     // Balanced
          });
        } else { // 'tube'
          this.powerSag = this.createSagProcessor('tube', {
            depth: 0.14,      // Will be modulated dynamically
            att: 0.006,       // 6ms attack
            relFast: 0.065,   // 65ms fast recovery
            relSlow: 0.27,    // 270ms slow recovery (EL84 bloom)
            rmsMs: 22.0,      // 22ms RMS window
            shape: 1.5,       // Progressive
            floor: 0.26,      // 26% minimum headroom
            peakMix: 0.34     // More RMS
          });
        }
        
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else this.setupChannel2();
        this.routePowerSection();
        this.updateWattage(); // Re-apply wattage settings
        break;
      
      case 'gate':
        this.gateEnabled = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else this.setupChannel2();
        this.routePowerSection();
        break;
      
      case 'reverb':
        this.reverbSend.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'master': {
        const m = value / 100;
        this.outputMaster.gain.setTargetAtTime(this.lin2log(m), now, 0.01);
        
        // PI asymmetry grows with master
        const piAsym = 1.06 + (m * 0.06); // 1.06 → 1.12
        this.phaseInverter.curve = this.makePhaseInverterCurveWithAsymmetry(piAsym);
        break;
      }
      
      case 'fx_loop':
        this.fxLoop = !!value;
        // Re-route current channel
        if (this.activeChannel === 1) this.setupChannel1();
        else this.setupChannel2();
        this.routePowerSection();
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
  
  makePhaseInverterCurveWithAsymmetry(asym = 1.06) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // PHASE INVERTER - Soft, musical clipping
      let y = Math.tanh(x * 1.3);
      
      // Soft knee compression
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.6);
      }
      
      // Asymmetry (grows with master)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.92;
    }
    return curve;
  }
  
  disconnect() {
    super.disconnect();
    
    // Stop sag loop
    if (this._sagInterval) {
      clearInterval(this._sagInterval);
      this._sagInterval = null;
    }
    
    this.noiseGate.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.tighteningHPF1.disconnect();
    this.tighteningHPF2.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.ch1Bass.disconnect();
    this.ch1Treble.disconnect();
    this.ch1Cut.disconnect();
    this.ch2Bass.disconnect();
    this.ch2Middle.disconnect();
    this.ch2Treble.disconnect();
    this.ch2Presence.disconnect();
    this.britishMidBoost.disconnect();
    this.britishPresencePeak.disconnect();
    this.brightCap.disconnect();
    this.lowMidControl.disconnect();
    this.channelMaster.disconnect();
    this.reverbSend.disconnect();
    this.reverbReturn.disconnect();
    this.fxDryTap.disconnect();
    this.fxSendLevel.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.fxReturnLevel.disconnect();
    this.fxMix.disconnect();
    this.powerScale.disconnect();
    this.piHighPass.disconnect();
    this.piMidBoost.disconnect();
    this.phaseInverter.disconnect();
    this.sagEnvelope.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.nfbTap.disconnect();
    this.dcBlock.disconnect();
    this.preCabinet.disconnect();
    this.postCabinet.disconnect();
    if (this.cabinet && this.cabinet.input) {
      this.cabinet.input.disconnect();
    }
    if (this.cabinet && this.cabinet.output) {
      this.cabinet.output.disconnect();
    }
    this.outputMaster.disconnect();
  }
}

export default MesaTransAtlanticTA30Amp;
