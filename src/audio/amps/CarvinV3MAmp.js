import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Carvin V3M (V3 Micro) - 50W 3-Channel EL34 High-Gain Amplifier
 * 
 * ARCHITECTURE:
 * - 3 independent channels (Clean, Crunch, Lead) with equal-power crossfade
 * - Zipper-free channel switching using setValueCurveAtTime
 * - Pre/de-emphasis anti-aliasing (±4-6dB, channel-specific)
 * - REAL SAG SYSTEM: Hybrid peak/RMS envelope detector with dynamic time constants
 * - NFB (Negative Feedback): Presence/Depth with power amp damping simulation
 * - INTERACTIVE TONE STACK: Gain-dependent tone control interaction
 * - Waveshaper curves with bias shift and grid conduction
 * - POST-CLIP SHAPING: Mid focus + bass tightness (adaptive)
 * - Anti-alias filters: Pre/post saturation + post-cabinet
 * - Cached waveshaper curves for performance
 * - Logarithmic gain taper (x^2.3) for natural feel
 * - Safety limiter at output
 * - JSON preset serialization
 * 
 * NOISE GATE:
 * Uses AudioWorklet-based gate with:
 *   - RMS/peak envelope follower
 *   - Hysteresis (thresholdOpen/thresholdClose)
 *   - Attack/Release envelopes
 */
class CarvinV3MAmp extends BaseAmp {
  // Static curve cache to avoid recreating waveshaper curves
  static _curveCache = {};
  
  constructor(audioContext, id) {
    super(audioContext, id, 'Carvin V3M', 'carvin_v3m');
    
    // CARVIN V3M (V3 MICRO)
    // 50W, 3-channel EL34 amplifier with British/American hybrid voicing
    // Used by: Session players, metal guitarists, versatile players
    // Known for: EL34 punch, tight bass, modern features, 3-channel versatility
    
    // ============================================
    // POWER FACTORS
    // ============================================
    this._powerFactors = {
      watt: 1.0  // 50W fixed
    };
    
    // ============================================
    // FRONT PANEL CONTROLS - 3 CHANNELS
    // ============================================
    
    // === CHANNEL 1 (CLEAN) ===
    this.ch1Gain = audioContext.createGain();
    this.ch1Bass = audioContext.createBiquadFilter();
    this.ch1Middle = audioContext.createBiquadFilter();
    this.ch1Treble = audioContext.createBiquadFilter();
    this.ch1Master = audioContext.createGain();
    this.ch1Fader = audioContext.createGain(); // For smooth channel switching
    
    // === CHANNEL 2 (CRUNCH) ===
    this.ch2Gain = audioContext.createGain();
    this.ch2Bass = audioContext.createBiquadFilter();
    this.ch2Middle = audioContext.createBiquadFilter();
    this.ch2Treble = audioContext.createBiquadFilter();
    this.ch2Master = audioContext.createGain();
    this.ch2Fader = audioContext.createGain();
    
    // Channel 2 tightening filter
    this.ch2TighteningFilter = audioContext.createBiquadFilter();
    this.ch2TighteningFilter.type = 'highpass';
    this.ch2TighteningFilter.frequency.value = 80;
    this.ch2TighteningFilter.Q.value = 0.8;
    
    // === CHANNEL 3 (LEAD) ===
    this.ch3Gain = audioContext.createGain();
    this.ch3TighteningFilter = audioContext.createBiquadFilter();
    this.ch3Bass = audioContext.createBiquadFilter();
    this.ch3Middle = audioContext.createBiquadFilter();
    this.ch3Treble = audioContext.createBiquadFilter();
    this.ch3ToneStackMakeup = audioContext.createGain();
    this.ch3Master = audioContext.createGain();
    this.ch3Fader = audioContext.createGain();
    
    // === GLOBAL CONTROLS ===
    this.outputMaster = audioContext.createGain();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // Modern/Vintage voicing switch
    this.voicingMode = 'modern'; // 'modern' or 'vintage'
    
    // Boost switch (pre-gain boost for channel 3)
    this.boostEnabled = false;
    this.boostGain = audioContext.createGain();
    
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (EL34 simulation)
    // ============================================
    // V3M uses EL34 tubes with hybrid rectifier
    // Ajustado para bloom EL34 autêntico
    this.powerSag = this.createSagProcessor('hybrid', {
      depth: 0.11,      // 11% sag (moderate EL34 compression)
      att: 0.006,       // 6ms attack
      relFast: 0.065,   // 65ms fast recovery
      relSlow: 0.30,    // 300ms slow recovery (EL34 bloom aumentado)
      rmsMs: 16.0,      // 16ms RMS window
      shape: 1.35,      // Progressive response
      floor: 0.28,      // 28% minimum headroom
      peakMix: 0.28     // Menos peak, mais RMS para bloom suave
    });
    
    this._rectifierType = 'hybrid';
    
    // ============================================
    // POWER AMP
    // ============================================
    this.powerAmp = audioContext.createGain();
    
    // ============================================
    // NFB (Negative Feedback) - Presence/Depth
    // ============================================
    this.nfbHi = audioContext.createBiquadFilter(); // Presence
    this.nfbHi.type = 'highshelf';
    this.nfbHi.frequency.value = 3300; // Dinamizado com master (3.3k → 4.2k)
    this.nfbHi.gain.value = 0;
    
    this.nfbLo = audioContext.createBiquadFilter(); // Depth
    this.nfbLo.type = 'lowshelf';
    this.nfbLo.frequency.value = 95;
    this.nfbLo.gain.value = 0;
    
    // Ressonância adicional 120Hz para "encher" a caixa típica da Carvin
    this.depthResonance = audioContext.createBiquadFilter();
    this.depthResonance.type = 'peaking';
    this.depthResonance.frequency.value = 120;
    this.depthResonance.Q.value = 3.5;
    this.depthResonance.gain.value = 1.5; // +1.5dB
    
    // ============================================
    // SATURATION & DISTORTION (with pre-emphasis/de-emphasis)
    // ============================================
    
    // Pre-emphasis filters (reduce aliasing)
    this.ch1PreEmph = audioContext.createBiquadFilter();
    this.ch2PreEmph = audioContext.createBiquadFilter();
    this.ch3PreEmph = audioContext.createBiquadFilter();
    this.powerPreEmph = audioContext.createBiquadFilter();
    
    this.ch1PreEmph.type = 'highshelf';
    this.ch1PreEmph.frequency.value = 1150;
    this.ch1PreEmph.gain.value = 4;
    
    this.ch2PreEmph.type = 'highshelf';
    this.ch2PreEmph.frequency.value = 1000;
    this.ch2PreEmph.gain.value = 5;
    
    this.ch3PreEmph.type = 'highshelf';
    this.ch3PreEmph.frequency.value = 820;
    this.ch3PreEmph.gain.value = 6;
    
    this.powerPreEmph.type = 'highshelf';
    this.powerPreEmph.frequency.value = 950;
    this.powerPreEmph.gain.value = 4;
    
    // Channel-specific saturation
    this.ch1Saturation = audioContext.createWaveShaper();
    this.ch2Saturation = audioContext.createWaveShaper();
    this.ch3Saturation = audioContext.createWaveShaper();
    
    // Power amp saturation (EL34)
    this.powerSaturation = audioContext.createWaveShaper();
    
    // De-emphasis filters
    this.ch1DeEmph = audioContext.createBiquadFilter();
    this.ch2DeEmph = audioContext.createBiquadFilter();
    this.ch3DeEmph = audioContext.createBiquadFilter();
    this.powerDeEmph = audioContext.createBiquadFilter();
    
    this.ch1DeEmph.type = 'highshelf';
    this.ch1DeEmph.frequency.value = 1150;
    this.ch1DeEmph.gain.value = -4;
    
    this.ch2DeEmph.type = 'highshelf';
    this.ch2DeEmph.frequency.value = 1000;
    this.ch2DeEmph.gain.value = -5;
    
    this.ch3DeEmph.type = 'highshelf';
    this.ch3DeEmph.frequency.value = 820;
    this.ch3DeEmph.gain.value = -6;
    
    this.powerDeEmph.type = 'highshelf';
    this.powerDeEmph.frequency.value = 950;
    this.powerDeEmph.gain.value = -4;
    
    // Set curves
    this.ch1Saturation.curve = this.makeCleanCurve();
    this.ch2Saturation.curve = this.makeCrunchCurve();
    this.ch3Saturation.curve = this.makeLeadCurve();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    
    this.ch1Saturation.oversample = '4x';
    this.ch2Saturation.oversample = '4x';
    this.ch3Saturation.oversample = '4x';
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // NOISE GATE (for CH2/CH3) - AUDIOWORKLET
    // ============================================
    this.ch2NoiseGate = this.createNoiseGate({
      thOpen: -50,      // Open threshold (dB)
      thClose: -58,     // Close threshold (dB) - TRUE HYSTERESIS
      attack: 0.0007,   // 0.7ms attack
      release: 0.12,    // 120ms release
      rms: 0.014,       // 14ms RMS window
      peakMix: 0.35,    // 35% peak, 65% RMS
      floorDb: -66,     // Gate floor
      holdMs: 6         // 6ms hold time
    });
    
    this.ch3NoiseGate = this.createNoiseGate({
      thOpen: -48,      // Tighter for high-gain
      thClose: -56,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack
      release: 0.105,   // 105ms release (mais orgânico para palm-mutes)
      rms: 0.014,       // 14ms RMS window
      peakMix: 0.35,    // Balanced
      floorDb: -66,     // Musical floor
      holdMs: 9         // 9ms hold (respiração mais musical)
    });
    
    // ============================================
    // LEAD CHANNEL SHAPING & FOCUS
    // ============================================
    // Pre-clip mid boost (modern focus)
    this.ch3MidBoost = audioContext.createBiquadFilter();
    this.ch3MidBoost.type = 'peaking';
    this.ch3MidBoost.frequency.value = 850; // Modern mid push
    this.ch3MidBoost.Q.value = 1.5;
    this.ch3MidBoost.gain.value = 2.2;
    
    // De-esser dinâmico (reduz sibilância conforme ganho aumenta)
    this.ch3DeEsser = audioContext.createBiquadFilter();
    this.ch3DeEsser.type = 'peaking';
    this.ch3DeEsser.frequency.value = 6000;
    this.ch3DeEsser.Q.value = 2.0;
    this.ch3DeEsser.gain.value = 0; // Dinamizado com ganho
    
    // Post-clip presence peak (EL34 character)
    this.ch3PresencePeak = audioContext.createBiquadFilter();
    this.ch3PresencePeak.type = 'peaking';
    this.ch3PresencePeak.frequency.value = 2800; // EL34 bite
    this.ch3PresencePeak.Q.value = 1.7;
    this.ch3PresencePeak.gain.value = 1.5;
    
    // Anti-alias filters
    this.ch3AntiAlias1 = audioContext.createBiquadFilter();
    this.ch3AntiAlias1.type = 'lowpass';
    this.ch3AntiAlias1.frequency.value = 11000;
    this.ch3AntiAlias1.Q.value = 0.707;
    
    this.ch3AntiAlias2 = audioContext.createBiquadFilter();
    this.ch3AntiAlias2.type = 'lowpass';
    this.ch3AntiAlias2.frequency.value = 10500;
    this.ch3AntiAlias2.Q.value = 0.707;
    
    // ============================================
    // DC BLOCK & FIZZ TAMING
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 26;
    this.dcBlock.Q.value = 0.707;
    
    this.fizzTaming = audioContext.createBiquadFilter();
    this.fizzTaming.type = 'lowpass';
    this.fizzTaming.frequency.value = 10000; // Dynamic, gain-dependent (7.2-10.5kHz)
    this.fizzTaming.Q.value = 0.707;
    
    // LPF suave antes do power saturation (reduz aliasing digital)
    this.prePowerLPF = audioContext.createBiquadFilter();
    this.prePowerLPF.type = 'lowpass';
    this.prePowerLPF.frequency.value = 9500;
    this.prePowerLPF.Q.value = 0.707;
    
    // ============================================
    // SPEAKER IMPEDANCE SIMULATION (4x12 V30/G12T-75 mix)
    // ============================================
    
    // Low resonance peak (cabinet resonance)
    this.spkrResonance = audioContext.createBiquadFilter();
    this.spkrResonance.type = 'peaking';
    this.spkrResonance.frequency.value = 95; // Modern 4x12
    this.spkrResonance.Q.value = 2.9;
    this.spkrResonance.gain.value = 3.5;
    
    // V30 característico: notch 2.2kHz (punch definition)
    this.spkrV30Notch = audioContext.createBiquadFilter();
    this.spkrV30Notch.type = 'peaking';
    this.spkrV30Notch.frequency.value = 2200;
    this.spkrV30Notch.Q.value = 1.2;
    this.spkrV30Notch.gain.value = -1.5; // -1.5dB
    
    // V30 característico: bump 3.2kHz (presença mordaz)
    this.spkrV30Peak = audioContext.createBiquadFilter();
    this.spkrV30Peak.type = 'peaking';
    this.spkrV30Peak.frequency.value = 3200;
    this.spkrV30Peak.Q.value = 1.4;
    this.spkrV30Peak.gain.value = 2.0; // +2dB
    
    // Voice coil inductance (presence peak original mantido)
    this.spkrVoiceCoil = audioContext.createBiquadFilter();
    this.spkrVoiceCoil.type = 'peaking';
    this.spkrVoiceCoil.frequency.value = 3000; // V30/G12T-75 character
    this.spkrVoiceCoil.Q.value = 2.1;
    this.spkrVoiceCoil.gain.value = 2.6;
    
    // Cone breakup / high frequency rolloff
    this.spkrRolloff = audioContext.createBiquadFilter();
    this.spkrRolloff.type = 'lowpass';
    this.spkrRolloff.frequency.value = 7500; // Modern speaker rolloff
    this.spkrRolloff.Q.value = 0.65;
    
    // Envelope follower for dynamic NFB coupling
    this.spkrEnvelope = audioContext.createAnalyser();
    this.spkrEnvelope.fftSize = 512;
    this.spkrEnvelope.smoothingTimeConstant = 0.85;
    this._spkrEnvData = new Uint8Array(this.spkrEnvelope.frequencyBinCount);
    this._lastSpkrEnv = 0;
    
    // Post-cabinet anti-alias
    this.postCabAntiAlias = audioContext.createBiquadFilter();
    this.postCabAntiAlias.type = 'lowpass';
    this.postCabAntiAlias.frequency.value = 10000;
    this.postCabAntiAlias.Q.value = 0.707;
    
    // ============================================
    // FX LOOP (Series/Parallel)
    // ============================================
    this.fxLoopSend = audioContext.createGain();
    this.fxLoopReturn = audioContext.createGain();
    this.fxLoopMix = audioContext.createGain();
    this.fxLoopDry = audioContext.createGain();
    this.fxLoopWet = audioContext.createGain();
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30'; // Carvin standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // SAFETY LIMITER (prevent overs)
    // ============================================
    this.finalLimiter = audioContext.createDynamicsCompressor();
    this.finalLimiter.threshold.value = -1;
    this.finalLimiter.knee.value = 0;
    this.finalLimiter.ratio.value = 20;
    this.finalLimiter.attack.value = 0.003;
    this.finalLimiter.release.value = 0.05;
    
    // ============================================
    // CHANNEL MIXER (for smooth switching)
    // ============================================
    this.channelMixer = audioContext.createGain();
    this.activeChannel = 3; // 1, 2, or 3
    
    // Tone stack values (for interactive calculation)
    this.ch3BassValue = 50;
    this.ch3MidValue = 50;
    this.ch3TrebleValue = 50;
    
    // Depth base value (user knob setting)
    this._depthBaseDb = 0;
    
    // Reusable time domain buffer for envelope detection
    this._timeData = new Uint8Array(this.spkrEnvelope.fftSize);
    
    // ============================================
    // COMPLETE ROUTING - ALL CHANNELS
    // ============================================
    this.setupCompleteRouting();
    
    // ============================================
    // INITIALIZE PARAMETERS
    // ============================================
    this.params = {
      // Channel selection
      channel: 3, // 1=Clean, 2=Crunch, 3=Lead
      
      // Channel 1 (Clean) controls
      ch1_gain: 30,
      ch1_bass: 52,
      ch1_middle: 48,
      ch1_treble: 58,
      ch1_master: 68,
      
      // Channel 2 (Crunch) controls
      ch2_gain: 62,
      ch2_bass: 60,
      ch2_middle: 52,
      ch2_treble: 66,
      ch2_master: 58,
      
      // Channel 3 (Lead) controls
      ch3_gain: 72,
      ch3_bass: 62,
      ch3_middle: 50, // Modern focus
      ch3_treble: 70,
      ch3_presence: 60,
      ch3_master: 68,
      
      // Global controls
      output_master: 68,
      depth: 52,
      
      // Back panel
      voicing: 'modern', // 'modern' or 'vintage'
      boost: false,
      
      // Effects
      fx_loop_mix: 100, // 0=all dry, 100=all wet (series mode)
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_v30',
      micType: 'sm57',
      micPosition: 'edge'
    };
    
    this.applyInitialSettings();
    
    // Initialize channel 3 immediately (no fade in constructor)
    this.activeChannel = 3;
    this.ch1Fader.gain.value = 0;
    this.ch2Fader.gain.value = 0;
    this.ch3Fader.gain.value = 1;
    
    console.log('🔥 Carvin V3M Constructor Complete:');
    console.log(`   Active Channel: ${this.activeChannel}`);
    console.log(`   Faders: CH1=${this.ch1Fader.gain.value}, CH2=${this.ch2Fader.gain.value}, CH3=${this.ch3Fader.gain.value}`);
  }
  
  setupCompleteRouting() {
    // ============================================
    // CHANNEL 1 (CLEAN) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch1Gain);
    this.ch1Gain.connect(this.ch1PreEmph);
    this.ch1PreEmph.connect(this.ch1Saturation);
    this.ch1Saturation.connect(this.ch1DeEmph);
    this.ch1DeEmph.connect(this.ch1Bass);
    this.ch1Bass.connect(this.ch1Middle);
    this.ch1Middle.connect(this.ch1Treble);
    this.ch1Treble.connect(this.ch1Master);
    this.ch1Master.connect(this.ch1Fader);
    
    // ============================================
    // CHANNEL 2 (CRUNCH) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch2Gain);
    if (this.ch2NoiseGate) {
      this.ch2Gain.connect(this.ch2NoiseGate);
      this.ch2NoiseGate.connect(this.ch2PreEmph);
    } else {
      this.ch2Gain.connect(this.ch2PreEmph);
    }
    this.ch2PreEmph.connect(this.ch2Saturation);
    this.ch2Saturation.connect(this.ch2DeEmph);
    this.ch2DeEmph.connect(this.ch2TighteningFilter);
    this.ch2TighteningFilter.connect(this.ch2Bass);
    this.ch2Bass.connect(this.ch2Middle);
    this.ch2Middle.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Master);
    this.ch2Master.connect(this.ch2Fader);
    
    // ============================================
    // CHANNEL 3 (LEAD) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch3Gain);
    
    // Optional boost (pre-gain)
    if (this.boostEnabled) {
      this.ch3Gain.connect(this.boostGain);
      if (this.ch3NoiseGate) {
        this.boostGain.connect(this.ch3NoiseGate);
        this.ch3NoiseGate.connect(this.ch3TighteningFilter);
      } else {
        this.boostGain.connect(this.ch3TighteningFilter);
      }
    } else {
      if (this.ch3NoiseGate) {
        this.ch3Gain.connect(this.ch3NoiseGate);
        this.ch3NoiseGate.connect(this.ch3TighteningFilter);
      } else {
        this.ch3Gain.connect(this.ch3TighteningFilter);
      }
    }
    
    // Pre-clip shaping
    this.ch3TighteningFilter.connect(this.ch3MidBoost);
    
    // Interactive tone stack (pre-clip)
    this.ch3MidBoost.connect(this.ch3Bass);
    this.ch3Bass.connect(this.ch3Middle);
    this.ch3Middle.connect(this.ch3Treble);
    this.ch3Treble.connect(this.ch3ToneStackMakeup);
    
    // Pre-emphasis + Anti-alias before saturation
    this.ch3ToneStackMakeup.connect(this.ch3AntiAlias1);
    this.ch3AntiAlias1.connect(this.ch3PreEmph);
    this.ch3PreEmph.connect(this.ch3Saturation);
    
    // POST-CLIP: De-emphasis + De-esser + Presence peak + Anti-alias
    this.ch3Saturation.connect(this.ch3DeEmph);
    this.ch3DeEmph.connect(this.ch3DeEsser);
    this.ch3DeEsser.connect(this.ch3PresencePeak);
    this.ch3PresencePeak.connect(this.ch3AntiAlias2);
    this.ch3AntiAlias2.connect(this.ch3Master);
    
    this.ch3Master.connect(this.ch3Fader);
    
    // ============================================
    // CHANNEL MIXER → FX LOOP → POWER SECTION
    // ============================================
    this.ch1Fader.connect(this.channelMixer);
    this.ch2Fader.connect(this.channelMixer);
    this.ch3Fader.connect(this.channelMixer);
    
    // FX Loop (series/parallel mix)
    this.channelMixer.connect(this.fxLoopDry);
    this.channelMixer.connect(this.fxLoopSend);
    
    // FX return path
    this.fxLoopReturn.connect(this.fxLoopWet);
    
    // Mix dry + wet
    this.fxLoopDry.connect(this.fxLoopMix);
    this.fxLoopWet.connect(this.fxLoopMix);
    
    // ============================================
    // POWER SECTION (COMMON TO ALL CHANNELS)
    // ============================================
    if (this.powerSag) {
      this.fxLoopMix.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.fxLoopMix.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.prePowerLPF); // LPF antes do power saturation (reduz aliasing)
    this.prePowerLPF.connect(this.powerPreEmph);
    this.powerPreEmph.connect(this.powerSaturation);
    
    // NFB (Negative Feedback): Presence + Depth + Ressonância after power saturation
    this.powerSaturation.connect(this.powerDeEmph);
    this.powerDeEmph.connect(this.nfbHi);
    this.nfbHi.connect(this.nfbLo);
    this.nfbLo.connect(this.depthResonance); // Ressonância 120Hz
    this.depthResonance.connect(this.fizzTaming);
    this.fizzTaming.connect(this.dcBlock);
    
    // ============================================
    // SPEAKER IMPEDANCE CHAIN (before cabinet)
    // ============================================
    this.dcBlock.connect(this.spkrResonance);
    this.spkrResonance.connect(this.spkrV30Notch); // V30 notch 2.2kHz
    this.spkrV30Notch.connect(this.spkrV30Peak); // V30 peak 3.2kHz
    this.spkrV30Peak.connect(this.spkrVoiceCoil);
    this.spkrVoiceCoil.connect(this.spkrRolloff);
    this.spkrRolloff.connect(this.spkrEnvelope);
    this.spkrRolloff.connect(this.preCabinet);
    
    // ============================================
    // CABINET SIMULATOR (OPTIONAL)
    // ============================================
    this.recreateCabinet();
    
    // ============================================
    // OUTPUT
    // ============================================
    this.postCabinet.connect(this.postCabAntiAlias);
    this.postCabAntiAlias.connect(this.outputMaster);
    this.outputMaster.connect(this.finalLimiter);
    this.finalLimiter.connect(this.output);
    
    // Start sag envelope update loop
    this._startSagLoop();
  }
  
  _startSagLoop() {
    // Real-time sag envelope (updates ~60 Hz)
    this._sagInterval = setInterval(() => {
      if (!this.spkrEnvelope || !this.nfbLo) return;
      
      const now = this.audioContext.currentTime;
      
      // ============================================
      // SPEAKER IMPEDANCE → NFB DYNAMIC COUPLING
      // ============================================
      if (this.spkrEnvelope && this.nfbLo) {
        const spkrEnv = this._estimateEnvelope(this.spkrEnvelope).rms;
        
        // Smooth envelope
        const alpha = 0.1;
        const smoothEnv = this._lastSpkrEnv * (1 - alpha) + spkrEnv * alpha;
        this._lastSpkrEnv = smoothEnv;
        
        // Modulate depth based on speaker excursion
        const baseDepthDb = this._depthBaseDb || 0;
        const dynamicDb = smoothEnv * 2.2;
        const targetDb = baseDepthDb + dynamicDb;
        
        // Apply smooth transition
        try {
          this.nfbLo.gain.cancelAndHoldAtTime(now);
        } catch (e) {
          // Not supported in older browsers
        }
        this.nfbLo.gain.setTargetAtTime(targetDb, now, 0.05);
      }
    }, 16); // ~60 Hz
  }
  
  _estimateEnvelope(analyser) {
    if (!analyser) return { rms: 0, peak: 0 };
    
    const buffer = this._timeData;
    analyser.getByteTimeDomainData(buffer);
    
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const normalized = (buffer[i] - 128) / 128;
      const abs = Math.abs(normalized);
      
      sum += normalized * normalized;
      if (abs > peak) peak = abs;
    }
    
    const rms = Math.sqrt(sum / buffer.length);
    
    return { rms, peak };
  }
  
  recreateCabinet() {
    // Cleanup old cabinet
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
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
  
  applyInitialSettings() {
    // ============================================
    // CHANNEL 1 (CLEAN) - Initial Settings
    // ============================================
    this.ch1Gain.gain.value = 1.6;
    this.ch1Master.gain.value = 0.68;
    
    this.ch1Bass.type = 'lowshelf';
    this.ch1Bass.frequency.value = 115;
    this.ch1Bass.gain.value = 0;
    
    this.ch1Middle.type = 'peaking';
    this.ch1Middle.frequency.value = 800;
    this.ch1Middle.Q.value = 1.4;
    this.ch1Middle.gain.value = 0;
    
    this.ch1Treble.type = 'highshelf';
    this.ch1Treble.frequency.value = 3100;
    this.ch1Treble.gain.value = 1;
    
    // ============================================
    // CHANNEL 2 (CRUNCH) - Initial Settings
    // ============================================
    this.ch2Gain.gain.value = 3.8;
    this.ch2Master.gain.value = 0.58;
    
    this.ch2Bass.type = 'lowshelf';
    this.ch2Bass.frequency.value = 115;
    this.ch2Bass.gain.value = 2;
    
    this.ch2Middle.type = 'peaking';
    this.ch2Middle.frequency.value = 850;
    this.ch2Middle.Q.value = 1.5;
    this.ch2Middle.gain.value = 0;
    
    this.ch2Treble.type = 'highshelf';
    this.ch2Treble.frequency.value = 2900;
    this.ch2Treble.gain.value = 2.2;
    
    // ============================================
    // CHANNEL 3 (LEAD) - Initial Settings
    // ============================================
    this.ch3Gain.gain.value = 6.5;
    this.ch3Master.gain.value = 0.68;
    
    // Boost gain
    this.boostGain.gain.value = 1.6;
    
    // Tightening filter
    this.ch3TighteningFilter.type = 'highpass';
    this.ch3TighteningFilter.frequency.value = 88;
    this.ch3TighteningFilter.Q.value = 0.707;
    
    // Interactive tone stack
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.value = 100;
    this.ch3Bass.gain.value = 2.8;
    
    this.ch3Middle.type = 'peaking';
    this.ch3Middle.frequency.value = 820;
    this.ch3Middle.gain.value = 0;
    this.ch3Middle.Q.value = 1.3;
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.value = 2700;
    this.ch3Treble.gain.value = 2.8;
    
    // Makeup gain
    this.ch3ToneStackMakeup.gain.value = 1.7;
    
    // Initialize interactive tone stack
    this._updateInteractiveToneStack();
    
    // ============================================
    // POWER SECTION
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // FX LOOP
    // ============================================
    this.fxLoopDry.gain.value = 1.0;
    this.fxLoopWet.gain.value = 0.0;
    this.fxLoopSend.gain.value = 1.0;
    this.fxLoopReturn.gain.value = 1.0;
    
    // ============================================
    // OUTPUT
    // ============================================
    this.outputMaster.gain.value = 0.68;
  }
  
  // ============================================
  // SATURATION CURVES (cached for performance)
  // ============================================
  
  _makeCurve(key, fn) {
    if (!CarvinV3MAmp._curveCache[key]) {
      const samples = Math.min(32768, this.audioContext.sampleRate);
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = fn(x);
      }
      CarvinV3MAmp._curveCache[key] = curve;
    }
    return CarvinV3MAmp._curveCache[key];
  }
  
  makeCleanCurve() {
    return this._makeCurve('v3m_clean_v1', (x) => {
      // Clean channel - warm with slight compression
      let y = Math.tanh(x * 1.7);
      
      // Grid conduction at extremes
      if (Math.abs(x) > 0.65) {
        const excess = Math.abs(x) - 0.65;
        y += Math.sign(x) * excess * 0.11;
      }
      
      // Slight asymmetry (EL34 character)
      y *= x > 0 ? 1.05 : 0.97;
      
      return Math.tanh(y * 1.05);
    });
  }
  
  makeCrunchCurve() {
    return this._makeCurve('v3m_crunch_v1', (x) => {
      // Crunch channel - modern rock gain
      const biasShift = x * 0.08;
      const xShifted = x - biasShift;
      
      let y = Math.tanh(xShifted * 7.5);
      y = Math.tanh(y * 1.35);
      
      // Modern mid push
      y += 0.12 * Math.tanh(x * 9);
      
      // Asymmetric clipping (EL34)
      y = y > 0 ? y * 1.12 : y * 0.95;
      
      return y * 0.78;
    });
  }
  
  makeLeadCurve() {
    return this._makeCurve('v3m_lead_v1', (x) => {
      // LEAD CHANNEL - Modern high gain
      
      // Stage 1: Early asymmetry + bias shift
      const biasShift1 = x * 0.12;
      let y = Math.tanh((x - biasShift1) * 16);
      
      // Stage 2: Modern mid focus
      y += 0.15 * Math.tanh(x * 10);
      y = Math.tanh(y * 1.55);
      
      // Stage 3: Final gain stage with EL34 compression
      const biasShift2 = y * 0.08;
      y = Math.tanh((y - biasShift2) * 1.35);
      
      // EL34 asymmetry (modern character)
      if (y > 0) {
        y = Math.tanh(y * 1.16) * 1.14;
      } else {
        y = Math.tanh(y * 1.07) * 1.02;
      }
      
      // Dynamic compression
      if (Math.abs(y) > 0.62) {
        const excess = Math.abs(y) - 0.62;
        y = Math.sign(y) * (0.62 + excess * 0.68);
      }
      
      return y * 0.70;
    });
  }
  
  makePowerAmpCurve() {
    return this._makeCurve('v3m_power_v1', (x) => {
      // EL34 power tubes (50W configuration)
      
      // Bias shift under drive
      const biasShift = x * 0.065;
      let y = Math.tanh((x - biasShift) * 1.65);
      
      // EL34 CHARACTER: Modern punch with warmth
      y += 0.12 * Math.tanh(x * 8.5);
      
      // EL34 asymmetry
      if (x > 0) {
        y *= 1.09;
        // Grid conduction
        if (x > 0.78) {
          y += (x - 0.78) * 0.11;
        }
      } else {
        y *= 0.94;
      }
      
      // Output transformer saturation (modern)
      if (Math.abs(y) > 0.70) {
        const excess = Math.abs(y) - 0.70;
        y = Math.sign(y) * (0.70 + excess * 0.58);
      }
      
      return y;
    });
  }
  
  // ============================================
  // INTERACTIVE TONE STACK (V3M circuit)
  // ============================================
  _updateInteractiveToneStack() {
    const now = this.audioContext.currentTime;
    
    // Normalize to 0..1 (pot rotation)
    const bass = this.ch3BassValue / 100;
    const mid = this.ch3MidValue / 100;
    const treble = this.ch3TrebleValue / 100;
    
    // INTERACTIVE CIRCUIT: Controls affect each other
    
    // BASS: Low shelf with treble interaction
    const bassFreq = 100 + (treble * 22);
    const bassGainDb = (bass - 0.5) * 17;
    const bassQ = 0.707 + (treble * 0.22);
    
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.setTargetAtTime(bassFreq, now, 0.01);
    this.ch3Bass.gain.setTargetAtTime(bassGainDb, now, 0.01);
    this.ch3Bass.Q.setTargetAtTime(bassQ, now, 0.01);
    
    // MID: Peaking - modern focus
    const bassMidShift = (bass - 0.5) * 160;
    const trebleMidShift = (treble - 0.5) * 200;
    const midFreq = 720 + bassMidShift + trebleMidShift;
    const midGainDb = (mid - 0.5) * 21;
    const midQ = mid > 0.5 ? 
      (1.4 + (mid - 0.5) * 1.1) :
      (1.4 + (mid - 0.5) * 0.65);
    
    this.ch3Middle.type = 'peaking';
    this.ch3Middle.frequency.setTargetAtTime(midFreq, now, 0.01);
    this.ch3Middle.gain.setTargetAtTime(midGainDb, now, 0.01);
    this.ch3Middle.Q.setTargetAtTime(midQ, now, 0.01);
    
    // TREBLE: High shelf with bass interaction
    const trebleFreq = 2500 - (bass - 0.5) * 650;
    const trebleGainDb = (treble - 0.5) * 19;
    const trebleQ = 0.707 + ((1 - bass) * 0.32);
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.setTargetAtTime(trebleFreq, now, 0.01);
    this.ch3Treble.gain.setTargetAtTime(trebleGainDb, now, 0.01);
    this.ch3Treble.Q.setTargetAtTime(trebleQ, now, 0.01);
    
    // MAKEUP GAIN: Compensate for insertion loss
    const avgSetting = (bass + mid + treble) / 3;
    const deviation = Math.abs(bass - avgSetting) + Math.abs(mid - avgSetting) + Math.abs(treble - avgSetting);
    const baseLoss = 0.36;
    const deviationLoss = deviation * 0.08;
    const insertionLoss = baseLoss + deviationLoss;
    const makeupGain = 1 / (1 - insertionLoss);
    
    // Extra makeup for extreme boost settings
    const extremeBoost = Math.max(0, (bass - 0.7) + (treble - 0.7)) * 0.16;
    const finalMakeup = makeupGain * (1 + extremeBoost);
    
    this.ch3ToneStackMakeup.gain.setTargetAtTime(finalMakeup, now, 0.01);
  }
  
  setChannel(channel) {
    const now = this.audioContext.currentTime;
    const fadeTime = 0.032; // 32ms true equal-power crossfade
    
    this.activeChannel = channel;
    
    const faders = [this.ch1Fader.gain, this.ch2Fader.gain, this.ch3Fader.gain];
    
    // Pre-compute sin/cos curves (64 samples for smooth crossfade)
    const N = 64;
    const sinCurve = new Float32Array(N);
    const cosCurve = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      sinCurve[i] = Math.sin(x * Math.PI / 2);
      cosCurve[i] = Math.cos(x * Math.PI / 2);
    }
    
    faders.forEach((fader, i) => {
      const isTarget = (i + 1) === channel;
      const curve = isTarget ? sinCurve : cosCurve;
      
      fader.cancelScheduledValues(now);
      try { fader.cancelAndHoldAtTime(now); } catch(e) {}
      fader.setValueAtTime(fader.value, now);
      fader.setValueCurveAtTime(curve, now, fadeTime);
    });
    
    console.log(`Carvin V3M: Channel ${channel} (zipper-free equal-power crossfade)`);
  }
  
  setVoicing(mode) {
    this.voicingMode = mode;
    const now = this.audioContext.currentTime;
    
    if (mode === 'vintage') {
      // Vintage: warmer, less aggressive
      this.ch3MidBoost.frequency.setTargetAtTime(780, now, 0.02);
      this.ch3MidBoost.gain.setTargetAtTime(1.8, now, 0.02);
      this.ch3PresencePeak.frequency.setTargetAtTime(2400, now, 0.02);
      this.ch3PresencePeak.gain.setTargetAtTime(1.2, now, 0.02);
    } else {
      // Modern: tighter, more aggressive
      this.ch3MidBoost.frequency.setTargetAtTime(850, now, 0.02);
      this.ch3MidBoost.gain.setTargetAtTime(2.2, now, 0.02);
      this.ch3PresencePeak.frequency.setTargetAtTime(2800, now, 0.02);
      this.ch3PresencePeak.gain.setTargetAtTime(1.5, now, 0.02);
    }
  }
  
  // ============================================
  // FX LOOP API
  // ============================================
  
  getFxSendNode() {
    return this.fxLoopSend;
  }
  
  getFxReturnNode() {
    return this.fxLoopReturn;
  }
  
  // ============================================
  // PRESET MANAGEMENT (JSON serialization)
  // ============================================
  
  toJSON() {
    return {
      ampType: 'carvin_v3m',
      params: { ...this.params },
      cabinetType: this.cabinetType,
      micType: this.micType,
      micPosition: this.micPosition,
      cabinetEnabled: this.cabinetEnabled
    };
  }
  
  fromJSON(data) {
    if (!data?.params) return;
    
    // Apply cabinet settings first
    if (data.cabinetType !== undefined) this.cabinetType = data.cabinetType;
    if (data.micType !== undefined) this.micType = data.micType;
    if (data.micPosition !== undefined) this.micPosition = data.micPosition;
    if (data.cabinetEnabled !== undefined) this.cabinetEnabled = data.cabinetEnabled;
    
    // Recreate cabinet with new settings
    this.recreateCabinet();
    
    // Apply all parameters
    Object.entries(data.params).forEach(([key, value]) => {
      this.updateParameter(key, value);
    });
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
        this.ch1Gain.gain.setTargetAtTime(1 + (value / 38), now, 0.01);
        break;
      case 'ch1_bass':
        this.ch1Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_middle':
      case 'ch1_mid':
        this.ch1Middle.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_treble':
        this.ch1Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_master':
        this.ch1Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 2 (CRUNCH) CONTROLS
      // ============================================
      case 'ch2_gain':
        {
          const norm = Math.pow(value / 100, 2.1);
          this.ch2Gain.gain.setTargetAtTime(1 + (value / 16), now, 0.01);
          
          // Fizz taming
          const minHz = 8500, maxHz = 11500;
          const fizzFreq = maxHz - (maxHz - minHz) * norm;
          this.fizzTaming.frequency.setTargetAtTime(fizzFreq, now, 0.02);
        }
        break;
      case 'ch2_bass':
        this.ch2Bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_middle':
      case 'ch2_mid':
        this.ch2Middle.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_treble':
        this.ch2Treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_master':
        this.ch2Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 3 (LEAD) CONTROLS
      // ============================================
      case 'ch3_gain':
      case 'gain':
        {
          // Logarithmic taper (x^2.3)
          const norm = Math.pow(value / 100, 2.3);
          const ch3GainValue = 1 + norm * 9.5;
          this.ch3Gain.gain.setTargetAtTime(ch3GainValue, now, 0.01);
          
          // Dynamic LPF on fizz taming (range expandido: 7.2-10.5kHz)
          const minHz = 7200, maxHz = 10500;
          const fizzFreq = maxHz - (maxHz - minHz) * norm;
          this.fizzTaming.frequency.setTargetAtTime(fizzFreq, now, 0.02);
          
          // Post-cabinet anti-alias (9.5-10.5kHz dinâmico)
          const postCabFreq = 10500 - norm * 1000;
          this.postCabAntiAlias.frequency.setTargetAtTime(postCabFreq, now, 0.02);
          
          // De-esser dinâmico (0 a -2.5dB conforme ganho sobe)
          const deEss = -2.5 * Math.pow(norm, 2.0);
          this.ch3DeEsser.gain.setTargetAtTime(deEss, now, 0.05);
        }
        break;
      case 'ch3_bass':
      case 'bass':
        this.ch3BassValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_middle':
      case 'ch3_mid':
      case 'mid':
        this.ch3MidValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_treble':
      case 'treble':
        this.ch3TrebleValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_presence':
      case 'presence':
        {
          const dB = (value - 50) / 50 * 6;
          const master = this.outputMaster.gain.value;
          const dampingFactor = 0.6 + 0.4 * (1 - master);
          const effective = dB * dampingFactor;
          this.nfbHi.gain.setTargetAtTime(effective, now, 0.01);
          
          // De-esser
          const base = 10500, min = 9200;
          const t = value / 100;
          const fc = base - (base - min) * t * 0.3;
          this.postCabAntiAlias.frequency.setTargetAtTime(fc, now, 0.02);
        }
        break;
      case 'ch3_master':
        this.ch3Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'output_master':
      case 'master':
        const linValue = value / 100;
        this.outputMaster.gain.setTargetAtTime(linValue, now, 0.01);
        
        // Presença dinâmica com master (3.3kHz → 4.2kHz)
        const presFc = 3300 + (linValue) * 900;
        this.nfbHi.frequency.setTargetAtTime(presFc, now, 0.02);
        
        // Dynamic Presence/Depth Q
        const qMul = linValue < 0.3 ? (1 + (0.3 - linValue) * 2) : 1.0;
        this.nfbHi.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        this.nfbLo.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        break;
      
      case 'depth':
        {
          const clampedValue = Math.max(0, Math.min(100, value));
          const dB = (clampedValue - 50) / 50 * 8;
          this._depthBaseDb = dB;
          this.nfbLo.gain.setTargetAtTime(dB, now, 0.02);
        }
        break;
      
      // ============================================
      // BACK PANEL CONTROLS
      // ============================================
      case 'voicing':
        this.setVoicing(value);
        break;
      
      case 'boost':
        this.boostEnabled = !!value;
        // Need to reconnect channel 3 routing
        if (this.activeChannel === 3) {
          this._reconnectChannel3Boost();
        }
        break;
      
      // ============================================
      // FX LOOP
      // ============================================
      case 'fx_loop_mix':
        const mix = value / 100;
        const dryAmount = Math.cos(mix * Math.PI / 2);
        const wetAmount = Math.sin(mix * Math.PI / 2);
        this.fxLoopDry.gain.setTargetAtTime(dryAmount, now, 0.01);
        this.fxLoopWet.gain.setTargetAtTime(wetAmount, now, 0.01);
        break;
      
      // ============================================
      // CABINET SIMULATOR
      // ============================================
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
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
  
  _reconnectChannel3Boost() {
    // Reconnect channel 3 to enable/disable boost
    try {
      this.ch3Gain.disconnect();
      if (this.boostGain) this.boostGain.disconnect();
      if (this.ch3NoiseGate) this.ch3NoiseGate.disconnect();
      
      if (this.boostEnabled) {
        this.ch3Gain.connect(this.boostGain);
        if (this.ch3NoiseGate) {
          this.boostGain.connect(this.ch3NoiseGate);
          this.ch3NoiseGate.connect(this.ch3TighteningFilter);
        } else {
          this.boostGain.connect(this.ch3TighteningFilter);
        }
      } else {
        if (this.ch3NoiseGate) {
          this.ch3Gain.connect(this.ch3NoiseGate);
          this.ch3NoiseGate.connect(this.ch3TighteningFilter);
        } else {
          this.ch3Gain.connect(this.ch3TighteningFilter);
        }
      }
    } catch (e) {
      console.warn('Error reconnecting channel 3 boost:', e);
    }
  }
  
  disconnect() {
    super.disconnect();
    
    // Stop sag loop
    if (this._sagInterval) {
      clearInterval(this._sagInterval);
      this._sagInterval = null;
    }
    
    // Disconnect all nodes
    try {
      this.input.disconnect();
      
      // Channel 1
      this.ch1Gain.disconnect();
      this.ch1PreEmph.disconnect();
      this.ch1Saturation.disconnect();
      this.ch1DeEmph.disconnect();
      this.ch1Bass.disconnect();
      this.ch1Middle.disconnect();
      this.ch1Treble.disconnect();
      this.ch1Master.disconnect();
      this.ch1Fader.disconnect();
      
      // Channel 2
      this.ch2Gain.disconnect();
      if (this.ch2NoiseGate) this.ch2NoiseGate.disconnect();
      this.ch2PreEmph.disconnect();
      this.ch2Saturation.disconnect();
      this.ch2DeEmph.disconnect();
      this.ch2TighteningFilter.disconnect();
      this.ch2Bass.disconnect();
      this.ch2Middle.disconnect();
      this.ch2Treble.disconnect();
      this.ch2Master.disconnect();
      this.ch2Fader.disconnect();
      
      // Channel 3
      this.ch3Gain.disconnect();
      if (this.boostGain) this.boostGain.disconnect();
      if (this.ch3NoiseGate) this.ch3NoiseGate.disconnect();
      this.ch3TighteningFilter.disconnect();
      this.ch3MidBoost.disconnect();
      this.ch3Bass.disconnect();
      this.ch3Middle.disconnect();
      this.ch3Treble.disconnect();
      this.ch3ToneStackMakeup.disconnect();
      this.ch3AntiAlias1.disconnect();
      this.ch3PreEmph.disconnect();
      this.ch3Saturation.disconnect();
      this.ch3DeEmph.disconnect();
      this.ch3DeEsser.disconnect();
      this.ch3PresencePeak.disconnect();
      this.ch3AntiAlias2.disconnect();
      this.ch3Master.disconnect();
      this.ch3Fader.disconnect();
      
      // FX Loop
      this.channelMixer.disconnect();
      this.fxLoopDry.disconnect();
      this.fxLoopSend.disconnect();
      this.fxLoopReturn.disconnect();
      this.fxLoopWet.disconnect();
      this.fxLoopMix.disconnect();
      
      // Power section
      if (this.powerSag) this.powerSag.disconnect();
      if (this.powerAmp) this.powerAmp.disconnect();
      this.prePowerLPF.disconnect();
      this.powerPreEmph.disconnect();
      this.powerSaturation.disconnect();
      this.powerDeEmph.disconnect();
      this.nfbHi.disconnect();
      this.nfbLo.disconnect();
      this.depthResonance.disconnect();
      this.fizzTaming.disconnect();
      this.dcBlock.disconnect();
      
      // Speaker impedance
      this.spkrResonance.disconnect();
      this.spkrV30Notch.disconnect();
      this.spkrV30Peak.disconnect();
      this.spkrVoiceCoil.disconnect();
      this.spkrRolloff.disconnect();
      this.spkrEnvelope.disconnect();
      
      // Cabinet
      this.preCabinet.disconnect();
      if (this.cabinet) {
        this.cabinet.input.disconnect();
        this.cabinet.output.disconnect();
      }
      this.postCabinet.disconnect();
      
      // Output
      this.postCabAntiAlias.disconnect();
      this.outputMaster.disconnect();
      this.finalLimiter.disconnect();
      this.output.disconnect();
    } catch (e) {
      console.warn('Error disconnecting CarvinV3MAmp:', e);
    }
  }
}

export default CarvinV3MAmp;

