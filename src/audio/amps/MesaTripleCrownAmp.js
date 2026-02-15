import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Mesa Boogie Triple Crown - 3-Channel British-Voiced High-Gain Amplifier
 * 
 * ARCHITECTURE:
 * - 3 independent channels (Clean, Crunch, Lead) with TRUE equal-power crossfade (sin/cos)
 * - Zipper-free channel switching using setValueCurveAtTime (64 samples)
 * - Pre/de-emphasis anti-aliasing (±4-6dB, channel-specific pivot frequencies)
 * - Non-accumulative power gain computation (100W/50W switching)
 * - REAL SAG SYSTEM: Hybrid peak/RMS envelope detector with dynamic time constants
 * - NFB (Negative Feedback): Presence/Depth with power amp damping simulation
 * - PROGRESSIVE LINKAGE CIRCUIT: Gain-dependent tone stack interaction
 * - Waveshaper curves with bias shift: grid conduction, cathode voltage rise
 * - POST-CLIP SHAPING: Mid focus + low tightness (adaptive, gain-dependent)
 * - Anti-alias filters: Pre/post saturation + post-cabinet
 * - Cached waveshaper curves (32k samples max) with asymmetric clipping
 * - Dynamic LPF on fizz taming (gain-dependent)
 * - Logarithmic taper (x^2.2) on gain control for natural feel
 * - Safety limiter at output
 * - JSON preset serialization
 * 
 * NOISE GATE NOTE:
 * Uses AudioWorklet-based gate with:
 *   - Envelope follower (RMS/peak detector)
 *   - Hysteresis (thresholdOpen/thresholdClose)
 *   - Attack/Release envelopes
 */
class MesaTripleCrownAmp extends BaseAmp {
  // Static curve cache to avoid recreating waveshaper curves
  static _curveCache = {};
  
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Triple Crown', 'mesa_triple_crown');
    
    // MESA/BOOGIE TRIPLE CROWN (3-Channel British-Voiced High-Gain)
    // Used by: Mark Tremonti, Aaron Marshall, British rock players
    // Known for: EL34 power tubes, British voicing with Mesa tightness
    
    // ============================================
    // POWER FACTORS (avoid accumulative gain bug)
    // ============================================
    this._powerFactors = {
      watt: 1.0  // 100W=1.0, 50W=0.78
    };
    
    // ============================================
    // FRONT PANEL CONTROLS
    // ============================================
    
    // === CHANNEL 1 (CLEAN) ===
    this.ch1Gain = audioContext.createGain();
    this.ch1Bass = audioContext.createBiquadFilter();
    this.ch1Middle = audioContext.createBiquadFilter();
    this.ch1Treble = audioContext.createBiquadFilter();
    this.ch1Presence = audioContext.createBiquadFilter();
    this.ch1Master = audioContext.createGain();
    this.ch1Fader = audioContext.createGain(); // For smooth channel switching
    
    // === CHANNEL 2 (CRUNCH) ===
    this.ch2Gain = audioContext.createGain();
    this.ch2Bass = audioContext.createBiquadFilter();
    this.ch2Middle = audioContext.createBiquadFilter();
    this.ch2Treble = audioContext.createBiquadFilter();
    this.ch2Presence = audioContext.createBiquadFilter();
    this.ch2Master = audioContext.createGain();
    this.ch2Fader = audioContext.createGain(); // For smooth channel switching
    
    // === CHANNEL 2 (CRUNCH) - Tightening filter ===
    this.ch2TighteningFilter = audioContext.createBiquadFilter();
    this.ch2TighteningFilter.type = 'highpass';
    this.ch2TighteningFilter.frequency.value = 85; // Tight mode
    this.ch2TighteningFilter.Q.value = 0.8;
    
    // === CHANNEL 3 (LEAD) ===
    this.ch3Gain = audioContext.createGain();
    // Progressive linkage tone stack (pre-clip, interactive)
    this.ch3TighteningFilter = audioContext.createBiquadFilter(); // Tight/Loose switch
    this.ch3Bass = audioContext.createBiquadFilter();
    this.ch3Middle = audioContext.createBiquadFilter();
    this.ch3Treble = audioContext.createBiquadFilter();
    this.ch3ToneStackMakeup = audioContext.createGain(); // Makeup gain after tone stack
    this.ch3Master = audioContext.createGain();
    this.ch3Fader = audioContext.createGain(); // For smooth channel switching
    
    // === GLOBAL CONTROLS ===
    this.outputMaster = audioContext.createGain();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // MULTI-WATT POWER (100W/50W)
    this.wattage = 100; // 100 or 50
    this.powerAmp = audioContext.createGain();
    
    // TIGHT/LOOSE BASS SWITCH (per channel)
    this.tightMode = true; // true=tight, false=loose
    
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (EL34 rectifier simulation)
    // ============================================
    // EL34 amps typically use tube rectifier for British feel
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.12,      // 12% sag (EL34 compression)
      att: 0.007,       // 7ms attack (slightly slower droop)
      relFast: 0.07,    // 70ms fast recovery
      relSlow: 0.24,    // 240ms slow recovery (British bloom)
      rmsMs: 15.0,      // 15ms RMS window (EL34 dynamics)
      shape: 1.4,       // Progressive response (British sag)
      floor: 0.27,      // 27% minimum headroom
      peakMix: 0.33     // Balanced peak/RMS
    });
    
    // Store rectifier type
    this._rectifierType = 'tube';
    
    // ============================================
    // NFB (Negative Feedback) - Presence/Depth
    // ============================================
    this.nfbHi = audioContext.createBiquadFilter(); // Presence (high shelf)
    this.nfbHi.type = 'highshelf';
    this.nfbHi.frequency.value = 3800; // EL34 characteristic
    this.nfbHi.gain.value = 0;
    
    this.nfbLo = audioContext.createBiquadFilter(); // Depth (low shelf)
    this.nfbLo.type = 'lowshelf';
    this.nfbLo.frequency.value = 100;
    this.nfbLo.gain.value = 0;
    
    // ============================================
    // SATURATION & DISTORTION (with pre-emphasis/de-emphasis)
    // ============================================
    
    // Pre-emphasis filters (tilt +6dB/oct before clipping to reduce aliasing)
    this.ch1PreEmph = audioContext.createBiquadFilter();
    this.ch2PreEmph = audioContext.createBiquadFilter();
    this.ch3PreEmph = audioContext.createBiquadFilter();
    this.powerPreEmph = audioContext.createBiquadFilter();
    
    this.ch1PreEmph.type = 'highshelf';
    this.ch1PreEmph.frequency.value = 1200; // Clean: higher pivot (reduced alias)
    this.ch1PreEmph.gain.value = 4;
    
    this.ch2PreEmph.type = 'highshelf';
    this.ch2PreEmph.frequency.value = 1050; // Crunch: medium pivot (less "areia")
    this.ch2PreEmph.gain.value = 5;
    
    this.ch3PreEmph.type = 'highshelf';
    this.ch3PreEmph.frequency.value = 850; // Lead: lower pivot for high-gain
    this.ch3PreEmph.gain.value = 6;
    
    this.powerPreEmph.type = 'highshelf';
    this.powerPreEmph.frequency.value = 1000;
    this.powerPreEmph.gain.value = 4;
    
    // Channel-specific saturation
    this.ch1Saturation = audioContext.createWaveShaper();
    this.ch2Saturation = audioContext.createWaveShaper();
    this.ch3Saturation = audioContext.createWaveShaper();
    
    // Power amp saturation (EL34)
    this.powerSaturation = audioContext.createWaveShaper();
    
    // De-emphasis filters (tilt -6dB/oct after clipping)
    this.ch1DeEmph = audioContext.createBiquadFilter();
    this.ch2DeEmph = audioContext.createBiquadFilter();
    this.ch3DeEmph = audioContext.createBiquadFilter();
    this.powerDeEmph = audioContext.createBiquadFilter();
    
    this.ch1DeEmph.type = 'highshelf';
    this.ch1DeEmph.frequency.value = 1200; // Match pre-emphasis pivot
    this.ch1DeEmph.gain.value = -4;
    
    this.ch2DeEmph.type = 'highshelf';
    this.ch2DeEmph.frequency.value = 1050; // Match pre-emphasis pivot
    this.ch2DeEmph.gain.value = -5;
    
    this.ch3DeEmph.type = 'highshelf';
    this.ch3DeEmph.frequency.value = 850; // Match pre-emphasis pivot
    this.ch3DeEmph.gain.value = -6;
    
    this.powerDeEmph.type = 'highshelf';
    this.powerDeEmph.frequency.value = 1000;
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
    // Production-grade noise gates with true hysteresis, RMS/peak detection
    this.ch2NoiseGate = this.createNoiseGate({
      thOpen: -51,      // Open threshold (dB)
      thClose: -59,     // Close threshold (dB) - TRUE HYSTERESIS
      attack: 0.0006,   // Ultra-fast attack (0.6ms) - preserves pick transients
      release: 0.14,    // Smooth release (140ms) - no chattering
      rms: 0.015,       // 15ms RMS window
      peakMix: 0.36,    // 36% peak, 64% RMS (balanced)
      floorDb: -68,     // Gate floor (not digital silence)
      holdMs: 7         // 7ms hold time prevents chattering
    });
    
    this.ch3NoiseGate = this.createNoiseGate({
      thOpen: -49,      // Slightly tighter for lead high-gain
      thClose: -57,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack
      release: 0.15,    // 150ms release (allows sustain bloom)
      rms: 0.015,       // 15ms RMS window
      peakMix: 0.36,    // Balanced peak/RMS
      floorDb: -68,     // Musical floor
      holdMs: 7         // Prevents chattering on fast riffs
    });
    
    // ============================================
    // LEAD CHANNEL SHAPING & FOCUS
    // ============================================
    // Pre-clip mid boost (British focus)
    this.ch3MidBoost = audioContext.createBiquadFilter();
    this.ch3MidBoost.type = 'peaking';
    this.ch3MidBoost.frequency.value = 900; // British mid push
    this.ch3MidBoost.Q.value = 1.4;
    this.ch3MidBoost.gain.value = 2.5; // Moderate mid boost
    
    // Post-clip presence peak (EL34 character)
    this.ch3PresencePeak = audioContext.createBiquadFilter();
    this.ch3PresencePeak.type = 'peaking';
    this.ch3PresencePeak.frequency.value = 2600; // EL34 bite
    this.ch3PresencePeak.Q.value = 1.6;
    this.ch3PresencePeak.gain.value = 1.8; // Subtle presence
    
    // Anti-alias filters
    this.ch3AntiAlias1 = audioContext.createBiquadFilter();
    this.ch3AntiAlias1.type = 'lowpass';
    this.ch3AntiAlias1.frequency.value = 10500;
    this.ch3AntiAlias1.Q.value = 0.707;
    
    this.ch3AntiAlias2 = audioContext.createBiquadFilter();
    this.ch3AntiAlias2.type = 'lowpass';
    this.ch3AntiAlias2.frequency.value = 10000;
    this.ch3AntiAlias2.Q.value = 0.707;
    
    // ============================================
    // DC BLOCK & FIZZ TAMING
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 28; // Slightly lower for EL34 warmth
    this.dcBlock.Q.value = 0.707;
    
    this.fizzTaming = audioContext.createBiquadFilter();
    this.fizzTaming.type = 'lowpass';
    this.fizzTaming.frequency.value = 9500; // Dynamic, gain-dependent
    this.fizzTaming.Q.value = 0.707;
    
    // ============================================
    // SPEAKER IMPEDANCE SIMULATION (4x12 British with Greenbacks/V30s)
    // ============================================
    // Models the frequency-dependent impedance curve of a real 4x12 cabinet
    
    // Low resonance peak (cabinet resonance ~100 Hz for British)
    this.spkrResonance = audioContext.createBiquadFilter();
    this.spkrResonance.type = 'peaking';
    this.spkrResonance.frequency.value = 100; // British 4x12 fundamental
    this.spkrResonance.Q.value = 2.8; // High Q for sharp resonance
    this.spkrResonance.gain.value = 3.2; // +3.2dB thump
    
    // Voice coil inductance (presence peak ~2.8 kHz for Greenback/V30)
    this.spkrVoiceCoil = audioContext.createBiquadFilter();
    this.spkrVoiceCoil.type = 'peaking';
    this.spkrVoiceCoil.frequency.value = 2800; // British speaker bite
    this.spkrVoiceCoil.Q.value = 2.0;
    this.spkrVoiceCoil.gain.value = 2.8; // +2.8dB presence
    
    // Cone breakup / high frequency rolloff
    this.spkrRolloff = audioContext.createBiquadFilter();
    this.spkrRolloff.type = 'lowpass';
    this.spkrRolloff.frequency.value = 7200; // Greenback rolloff
    this.spkrRolloff.Q.value = 0.6; // Gentle slope
    
    // Envelope follower for dynamic NFB coupling
    this.spkrEnvelope = audioContext.createAnalyser();
    this.spkrEnvelope.fftSize = 512;
    this.spkrEnvelope.smoothingTimeConstant = 0.85;
    this._spkrEnvData = new Uint8Array(this.spkrEnvelope.frequencyBinCount);
    this._lastSpkrEnv = 0;
    
    // Post-cabinet anti-alias
    this.postCabAntiAlias = audioContext.createBiquadFilter();
    this.postCabAntiAlias.type = 'lowpass';
    this.postCabAntiAlias.frequency.value = 9500; // Gain-dependent
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
    // SPRING REVERB (built-in)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // Pre-delay for separation (5ms)
    this.reverbPreDelay = audioContext.createDelay(0.02);
    this.reverbPreDelay.delayTime.value = 0.005;
    
    // Spring reverb delays
    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    
    this.spring1.delayTime.value = 0.033;
    this.spring2.delayTime.value = 0.041;
    this.spring3.delayTime.value = 0.047;
    
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3200;
    this.reverbFilter.Q.value = 0.707;
    
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.38;
    
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
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_greenback'; // British voicing
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
      ch1_gain: 35,
      ch1_bass: 55,
      ch1_middle: 50,
      ch1_treble: 60,
      ch1_presence: 45,
      ch1_master: 65,
      
      // Channel 2 (Crunch) controls
      ch2_gain: 60,
      ch2_bass: 58,
      ch2_middle: 55,
      ch2_treble: 65,
      ch2_presence: 52,
      ch2_master: 55,
      
      // Channel 3 (Lead) controls
      ch3_gain: 70,
      ch3_bass: 60,
      ch3_middle: 48, // British midrange focus
      ch3_treble: 68,
      ch3_presence: 58,
      ch3_master: 65,
      
      // Global controls
      output_master: 65,
      depth: 50, // Low-end depth control
      
      // Back panel
      multi_watt: 100, // 100 or 50
      tight_loose: true, // true=TIGHT, false=LOOSE
      
      // Effects
      fx_loop_mix: 100, // 0=all dry, 100=all wet (series mode)
      reverb: 0,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_greenback',
      micType: 'sm57',
      micPosition: 'edge'
    };
    
    this.applyInitialSettings();
    
    // Initialize channel 3 immediately (no fade in constructor)
    this.activeChannel = 3;
    this.ch1Fader.gain.value = 0;
    this.ch2Fader.gain.value = 0;
    this.ch3Fader.gain.value = 1;
    
    console.log('🔥 Mesa Triple Crown Constructor Complete:');
    console.log(`   Active Channel: ${this.activeChannel}`);
    console.log(`   Faders: CH1=${this.ch1Fader.gain.value}, CH2=${this.ch2Fader.gain.value}, CH3=${this.ch3Fader.gain.value}`);
  }
  
  setupCompleteRouting() {
    // ============================================
    // CHANNEL 1 (CLEAN) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch1Gain);
    this.ch1Gain.connect(this.ch1PreEmph); // Pre-emphasis (+6dB/oct)
    this.ch1PreEmph.connect(this.ch1Saturation);
    this.ch1Saturation.connect(this.ch1DeEmph); // De-emphasis (-6dB/oct)
    this.ch1DeEmph.connect(this.ch1Bass);
    this.ch1Bass.connect(this.ch1Middle);
    this.ch1Middle.connect(this.ch1Treble);
    this.ch1Treble.connect(this.ch1Presence);
    this.ch1Presence.connect(this.ch1Master);
    this.ch1Master.connect(this.ch1Fader);
    
    // ============================================
    // CHANNEL 2 (CRUNCH) - COMPLETE CHAIN
    // ============================================
    this.input.connect(this.ch2Gain);
    // ENABLED: Production-grade AudioWorklet noise gate
    if (this.ch2NoiseGate) {
      this.ch2Gain.connect(this.ch2NoiseGate);
      this.ch2NoiseGate.connect(this.ch2PreEmph);
    } else {
      this.ch2Gain.connect(this.ch2PreEmph);
    }
    this.ch2PreEmph.connect(this.ch2Saturation);
    this.ch2Saturation.connect(this.ch2DeEmph); // De-emphasis (-6dB/oct)
    this.ch2DeEmph.connect(this.ch2TighteningFilter); // Tight/Loose filter
    this.ch2TighteningFilter.connect(this.ch2Bass);
    this.ch2Bass.connect(this.ch2Middle);
    this.ch2Middle.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Presence);
    this.ch2Presence.connect(this.ch2Master);
    this.ch2Master.connect(this.ch2Fader);
    
    // ============================================
    // CHANNEL 3 (LEAD) - COMPLETE CHAIN
    // ============================================
    // Input → Gain → Gate → Tightening HPF → Mid Boost → Tone Stack → AntiAlias → Saturation → Presence Peak → AntiAlias → Master
    this.input.connect(this.ch3Gain);
    // ENABLED: Production-grade AudioWorklet noise gate
    if (this.ch3NoiseGate) {
      this.ch3Gain.connect(this.ch3NoiseGate);
      this.ch3NoiseGate.connect(this.ch3TighteningFilter);
    } else {
      this.ch3Gain.connect(this.ch3TighteningFilter);
    }
    
    // Pre-clip shaping
    this.ch3TighteningFilter.connect(this.ch3MidBoost); // British mid focus
    
    // PROGRESSIVE LINKAGE TONE STACK (pre-clip, interactive)
    this.ch3MidBoost.connect(this.ch3Bass);
    this.ch3Bass.connect(this.ch3Middle);
    this.ch3Middle.connect(this.ch3Treble);
    this.ch3Treble.connect(this.ch3ToneStackMakeup); // Makeup gain
    
    // Pre-emphasis + Anti-alias before saturation
    this.ch3ToneStackMakeup.connect(this.ch3AntiAlias1);
    this.ch3AntiAlias1.connect(this.ch3PreEmph); // Pre-emphasis (+6dB/oct)
    this.ch3PreEmph.connect(this.ch3Saturation);
    
    // POST-CLIP: De-emphasis + Presence peak + Anti-alias
    this.ch3Saturation.connect(this.ch3DeEmph); // De-emphasis (-6dB/oct)
    this.ch3DeEmph.connect(this.ch3PresencePeak);
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
    this.channelMixer.connect(this.fxLoopDry); // Dry path
    this.channelMixer.connect(this.fxLoopSend); // Send to external FX
    
    // Reverb in parallel (with pre-delay)
    this.fxLoopSend.connect(this.reverbPreDelay);
    this.reverbPreDelay.connect(this.reverbSend);
    this.reverbSend.connect(this.spring1);
    this.reverbSend.connect(this.spring2);
    this.reverbSend.connect(this.spring3);
    
    // FX return path
    this.fxLoopReturn.connect(this.fxLoopWet);
    this.reverbReturn.connect(this.fxLoopWet);
    
    // Mix dry + wet
    this.fxLoopDry.connect(this.fxLoopMix);
    this.fxLoopWet.connect(this.fxLoopMix);
    
    // ============================================
    // POWER SECTION (COMMON TO ALL CHANNELS)
    // ============================================
    // FX Loop Mix → Power Sag (AudioWorklet) → Power Amp → Power Saturation → NFB (Presence/Depth) → Fizz → DC Block
    if (this.powerSag) {
      this.fxLoopMix.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.fxLoopMix.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerPreEmph); // Pre-emphasis (+4dB/oct)
    this.powerPreEmph.connect(this.powerSaturation);
    
    // NFB (Negative Feedback): Presence + Depth after power saturation
    this.powerSaturation.connect(this.powerDeEmph); // De-emphasis (-4dB/oct)
    this.powerDeEmph.connect(this.nfbHi); // Presence (high shelf)
    this.nfbHi.connect(this.nfbLo); // Depth (low shelf)
    this.nfbLo.connect(this.fizzTaming);
    this.fizzTaming.connect(this.dcBlock);
    
    // ============================================
    // SPEAKER IMPEDANCE CHAIN (before cabinet)
    // ============================================
    this.dcBlock.connect(this.spkrResonance);
    this.spkrResonance.connect(this.spkrVoiceCoil);
    this.spkrVoiceCoil.connect(this.spkrRolloff);
    this.spkrRolloff.connect(this.spkrEnvelope); // Tap for envelope
    this.spkrRolloff.connect(this.preCabinet); // Continue to cabinet
    
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
      // Real speakers dynamically affect NFB based on cone excursion
      if (this.spkrEnvelope && this.nfbLo) {
        const spkrEnv = this._estimateEnvelope(this.spkrEnvelope).rms;
        
        // Smooth envelope (simulates mechanical inertia of speaker cone)
        const alpha = 0.1; // Slow smoothing (~10Hz cutoff)
        const smoothEnv = this._lastSpkrEnv * (1 - alpha) + spkrEnv * alpha;
        this._lastSpkrEnv = smoothEnv;
        
        // Modulate depth (NFB low shelf) based on speaker excursion
        // More signal → more cone movement → impedance rises → tighter bass
        const baseDepthDb = this._depthBaseDb || 0; // Base setting (from user control)
        const dynamicDb = smoothEnv * 2.5; // Up to +2.5dB when speaker works hard
        const targetDb = baseDepthDb + dynamicDb; // Sum dynamics to base
        
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
    
    // Reuse pre-allocated buffer to reduce GC
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
    // Cleanup old cabinet properly
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Disconnect preCabinet
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
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
    this.ch1Gain.gain.value = 1.8; // Clean channel
    this.ch1Master.gain.value = 0.65;
    
    this.ch1Bass.type = 'lowshelf';
    this.ch1Bass.frequency.value = 110;
    this.ch1Bass.gain.value = 0;
    
    this.ch1Middle.type = 'peaking';
    this.ch1Middle.frequency.value = 850; // British mid focus
    this.ch1Middle.Q.value = 1.3;
    this.ch1Middle.gain.value = 0;
    
    this.ch1Treble.type = 'highshelf';
    this.ch1Treble.frequency.value = 3200;
    this.ch1Treble.gain.value = 1;
    
    this.ch1Presence.type = 'highshelf';
    this.ch1Presence.frequency.value = 5000;
    this.ch1Presence.gain.value = 0;
    
    // ============================================
    // CHANNEL 2 (CRUNCH) - Initial Settings
    // ============================================
    this.ch2Gain.gain.value = 3.5; // Crunch gain
    this.ch2Master.gain.value = 0.55;
    
    this.ch2Bass.type = 'lowshelf';
    this.ch2Bass.frequency.value = 110;
    this.ch2Bass.gain.value = 1.5;
    
    this.ch2Middle.type = 'peaking';
    this.ch2Middle.frequency.value = 900; // British character
    this.ch2Middle.Q.value = 1.4;
    this.ch2Middle.gain.value = 0;
    
    this.ch2Treble.type = 'highshelf';
    this.ch2Treble.frequency.value = 3000;
    this.ch2Treble.gain.value = 2;
    
    this.ch2Presence.type = 'highshelf';
    this.ch2Presence.frequency.value = 4800;
    this.ch2Presence.gain.value = 1;
    
    // ============================================
    // CHANNEL 3 (LEAD) - Initial Settings
    // ============================================
    this.ch3Gain.gain.value = 6; // High gain
    this.ch3Master.gain.value = 0.65;
    
    // Tightening filter (Tight/Loose switch)
    this.ch3TighteningFilter.type = 'highpass';
    this.ch3TighteningFilter.frequency.value = 95; // Tight mode
    this.ch3TighteningFilter.Q.value = 0.707;
    
    // Progressive linkage tone stack
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.value = 105; // Slightly lower for EL34
    this.ch3Bass.gain.value = 2.5;
    
    this.ch3Middle.type = 'peaking';
    this.ch3Middle.frequency.value = 850; // British focus
    this.ch3Middle.gain.value = 0;
    this.ch3Middle.Q.value = 1.2;
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.value = 2800; // British voicing
    this.ch3Treble.gain.value = 2.5;
    
    // Makeup gain after progressive linkage
    this.ch3ToneStackMakeup.gain.value = 1.6; // ~+4 dB makeup
    
    // Initialize interactive tone stack
    this._updateProgressiveToneStack();
    
    // ============================================
    // POWER SECTION
    // ============================================
    this.setWattage(100);
    this.setTightLoose(true);
    
    // ============================================
    // FX LOOP
    // ============================================
    this.fxLoopDry.gain.value = 1.0; // Pass signal through when no FX connected
    this.fxLoopWet.gain.value = 0.0; // No wet when nothing connected
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
    this.outputMaster.gain.value = 0.65;
  }
  
  // ============================================
  // POWER GAIN COMPUTATION (non-accumulative)
  // ============================================
  
  _recomputePowerGain() {
    const f = this._powerFactors;
    const total = f.watt;
    this.powerAmp.gain.setValueAtTime(total, this.audioContext.currentTime);
  }
  
  // ============================================
  // SATURATION CURVES (cached for performance)
  // ============================================
  
  _makeCurve(key, fn) {
    if (!MesaTripleCrownAmp._curveCache[key]) {
      const samples = 65536;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = fn(x);
      }
      MesaTripleCrownAmp._curveCache[key] = curve;
    }
    return MesaTripleCrownAmp._curveCache[key];
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makeCleanCurve() {
    return this._makeCurve('tc_clean_v1', (x) => {
      // Clean channel - British character with slight compression
      let y = Math.tanh(x * 1.6);
      
      // Grid conduction at extremes
      if (Math.abs(x) > 0.7) {
        const excess = Math.abs(x) - 0.7;
        y += Math.sign(x) * excess * 0.12;
      }
      
      // Slight asymmetry (EL34 character)
      y *= x > 0 ? 1.04 : 0.98;
      
      return Math.tanh(y * 1.1);
    });
  }
  
  makeCrunchCurve() {
    return this._makeCurve('tc_crunch_v1', (x) => {
      // Crunch channel - British rock gain with EL34 character
      const biasShift = x * 0.09;
      const xShifted = x - biasShift;
      
      let y = Math.tanh(xShifted * 7);
      y = Math.tanh(y * 1.4);
      
      // British midrange push
      y += 0.14 * Math.tanh(x * 8);
      
      // Asymmetric clipping (EL34)
      y = y > 0 ? y * 1.10 : y * 0.96;
      
      return y * 0.8;
    });
  }
  
  makeLeadCurve() {
    return this._makeCurve('tc_lead_v1', (x) => {
      // LEAD CHANNEL - High gain with British EL34 character
      // Simulates cascaded 12AX7 stages with cathode bias shift
      
      // Stage 1: Early asymmetry + bias shift
      const biasShift1 = x * 0.13;
      let y = Math.tanh((x - biasShift1) * 15);
      
      // Stage 2: British mid push
      y += 0.16 * Math.tanh(x * 9);
      y = Math.tanh(y * 1.6);
      
      // Stage 3: Final gain stage with EL34 compression
      const biasShift2 = y * 0.09;
      y = Math.tanh((y - biasShift2) * 1.4);
      
      // EL34 asymmetry (British character - slightly less aggressive than 6L6)
      if (y > 0) {
        y = Math.tanh(y * 1.15) * 1.12;
      } else {
        y = Math.tanh(y * 1.08) * 1.03;
      }
      
      // Dynamic compression (smoother than 6L6)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.65);
      }
      
      return y * 0.72;
    });
  }
  
  makePowerAmpCurve() {
    return this._makeCurve('tc_power_v1', (x) => {
      // EL34 power tubes with British character
      // More compression and midrange than 6L6
      
      // Bias shift under drive
      const biasShift = x * 0.07;
      let y = Math.tanh((x - biasShift) * 1.6);
      
      // EL34 CHARACTER: More compressed, midrange focused
      y += 0.13 * Math.tanh(x * 8);
      
      // EL34 asymmetry: smoother than 6L6
      if (x > 0) {
        y *= 1.08;
        // Grid conduction (softer than 6L6)
        if (x > 0.8) {
          y += (x - 0.8) * 0.12;
        }
      } else {
        y *= 0.96;
      }
      
      // Output transformer saturation (British character - more gradual)
      if (Math.abs(y) > 0.72) {
        const excess = Math.abs(y) - 0.72;
        y = Math.sign(y) * (0.72 + excess * 0.55);
      }
      
      return y;
    });
  }
  
  // ============================================
  // PROGRESSIVE LINKAGE TONE STACK (Triple Crown interactive circuit)
  // ============================================
  _updateProgressiveToneStack() {
    const now = this.audioContext.currentTime;
    
    // Normalize to 0..1 (pot rotation)
    const bass = this.ch3BassValue / 100;
    const mid = this.ch3MidValue / 100;
    const treble = this.ch3TrebleValue / 100;
    
    // PROGRESSIVE LINKAGE: Pots interact through impedance (British style)
    
    // BASS: Low shelf with treble loading interaction
    const bassFreq = 105 + (treble * 25); // 105-130 Hz
    const bassGainDb = (bass - 0.5) * 18; // ±9dB (wider range for EL34)
    const bassQ = 0.707 + (treble * 0.25);
    
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.setTargetAtTime(bassFreq, now, 0.01);
    this.ch3Bass.gain.setTargetAtTime(bassGainDb, now, 0.01);
    this.ch3Bass.Q.setTargetAtTime(bassQ, now, 0.01);
    
    // MID: Peaking - British focus (more interactive)
    const bassMidShift = (bass - 0.5) * 180;
    const trebleMidShift = (treble - 0.5) * 220;
    const midFreq = 750 + bassMidShift + trebleMidShift; // 550-950 Hz
    const midGainDb = (mid - 0.5) * 22; // ±11dB (British presence)
    const midQ = mid > 0.5 ? 
      (1.3 + (mid - 0.5) * 1.2) :  // Boost: 1.3→1.9
      (1.3 + (mid - 0.5) * 0.7);   // Cut: 1.3→1.0
    
    this.ch3Middle.type = 'peaking';
    this.ch3Middle.frequency.setTargetAtTime(midFreq, now, 0.01);
    this.ch3Middle.gain.setTargetAtTime(midGainDb, now, 0.01);
    this.ch3Middle.Q.setTargetAtTime(midQ, now, 0.01);
    
    // TREBLE: High shelf with bass loading interaction
    const trebleFreq = 2600 - (bass - 0.5) * 700; // 2250-2950 Hz (EL34 voicing)
    const trebleGainDb = (treble - 0.5) * 20; // ±10dB
    const trebleQ = 0.707 + ((1 - bass) * 0.35);
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.setTargetAtTime(trebleFreq, now, 0.01);
    this.ch3Treble.gain.setTargetAtTime(trebleGainDb, now, 0.01);
    this.ch3Treble.Q.setTargetAtTime(trebleQ, now, 0.01);
    
    // MAKEUP GAIN: Progressive linkage has insertion loss
    const avgSetting = (bass + mid + treble) / 3;
    const deviation = Math.abs(bass - avgSetting) + Math.abs(mid - avgSetting) + Math.abs(treble - avgSetting);
    const baseLoss = 0.38; // Slightly more loss than Dual Rectifier
    const deviationLoss = deviation * 0.09;
    const insertionLoss = baseLoss + deviationLoss;
    const makeupGain = 1 / (1 - insertionLoss);
    
    // Extra makeup for extreme boost settings
    const extremeBoost = Math.max(0, (bass - 0.7) + (treble - 0.7)) * 0.18;
    const finalMakeup = makeupGain * (1 + extremeBoost);
    
    this.ch3ToneStackMakeup.gain.setTargetAtTime(finalMakeup, now, 0.01);
  }
  
  // ============================================
  // BACK PANEL CONTROLS
  // ============================================
  
  setWattage(watts) {
    this.wattage = watts;
    
    const now = this.audioContext.currentTime;
    
    switch (watts) {
      case 50:
        this._powerFactors.watt = 0.78; // Lower headroom
        // Adjust sag for 50W mode (more sag)
        if (this.powerSag && this.powerSag.parameters) {
          this.powerSag.parameters.get('depth').value = 0.15; // 15% sag
        }
        // 50W "feel": slightly more saturated power amp
        const gain50W = this._powerFactors.watt * 1.08;
        this.powerAmp.gain.setTargetAtTime(gain50W, now, 0.02);
        break;
      case 100:
        this._powerFactors.watt = 1.0; // Full power
        // Restore 100W sag
        if (this.powerSag && this.powerSag.parameters) {
          this.powerSag.parameters.get('depth').value = 0.12; // 12% sag
        }
        // 100W: clean headroom
        this.powerAmp.gain.setTargetAtTime(this._powerFactors.watt, now, 0.02);
        break;
    }
  }
  
  setTightLoose(isTight) {
    this.tightMode = isTight;
    
    if (isTight) {
      // TIGHT: Higher HPF, tighter bass
      this.ch2TighteningFilter.frequency.value = 85;
      this.ch2TighteningFilter.Q.value = 0.8;
      this.ch3TighteningFilter.frequency.value = 95;
      this.ch3TighteningFilter.Q.value = 0.9;
    } else {
      // LOOSE: Lower HPF, more open
      this.ch2TighteningFilter.frequency.value = 65;
      this.ch2TighteningFilter.Q.value = 0.707;
      this.ch3TighteningFilter.frequency.value = 70;
      this.ch3TighteningFilter.Q.value = 0.707;
    }
  }
  
  setChannel(channel) {
    const now = this.audioContext.currentTime;
    const fadeTime = 0.035; // 35ms true equal-power crossfade
    
    this.activeChannel = channel;
    
    const faders = [this.ch1Fader.gain, this.ch2Fader.gain, this.ch3Fader.gain];
    
    // Pre-compute sin/cos curves (64 samples for smooth, zipper-free crossfade)
    const N = 64;
    const sinCurve = new Float32Array(N);
    const cosCurve = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      sinCurve[i] = Math.sin(x * Math.PI / 2); // 0 → 1
      cosCurve[i] = Math.cos(x * Math.PI / 2); // 1 → 0
    }
    
    faders.forEach((fader, i) => {
      const isTarget = (i + 1) === channel;
      const curve = isTarget ? sinCurve : cosCurve;
      
      // Cancel previous automations and apply smooth curve
      // cancelAndHoldAtTime protects against rapid channel switching
      fader.cancelScheduledValues(now);
      try { fader.cancelAndHoldAtTime(now); } catch(e) {}
      fader.setValueAtTime(fader.value, now);
      fader.setValueCurveAtTime(curve, now, fadeTime);
    });
    
    console.log(`Mesa Triple Crown: Channel ${channel} (zipper-free equal-power crossfade)`);
  }
  
  // ============================================
  // FX LOOP API (explicit access for external effects)
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
      ampType: 'mesa_triple_crown',
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
        this.ch1Gain.gain.setTargetAtTime(1 + (value / 35), now, 0.01);
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
      case 'ch1_presence':
        this.ch1Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch1_master':
        this.ch1Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 2 (CRUNCH) CONTROLS
      // ============================================
      case 'ch2_gain':
        {
          // Logarithmic taper with dynamic fizz taming
          const norm = Math.pow(value / 100, 2.0);
          this.ch2Gain.gain.setTargetAtTime(1 + (value / 18), now, 0.01);
          
          // Fizz taming (less aggressive than Lead)
          const minHz = 8000, maxHz = 11000;
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
      case 'ch2_presence':
        this.ch2Presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'ch2_master':
        this.ch2Master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // CHANNEL 3 (LEAD) CONTROLS
      // ============================================
      case 'ch3_gain':
      case 'gain': // Alias for default gain control
        {
          // Logarithmic taper (x^2.2) for more natural feel
          const norm = Math.pow(value / 100, 2.2);
          const ch3GainValue = 1 + norm * 9; // 1x to 10x
          this.ch3Gain.gain.setTargetAtTime(ch3GainValue, now, 0.01);
          
          // Dynamic LPF on fizz taming (more gain = slightly darker tone)
          const minHz = 7500, maxHz = 10500;
          const fizzFreq = maxHz - (maxHz - minHz) * norm;
          this.fizzTaming.frequency.setTargetAtTime(fizzFreq, now, 0.02);
          
          // Post-cabinet anti-alias (gain-dependent)
          const postCabFreq = 10000 - norm * 800; // 10 kHz to 9.2 kHz
          this.postCabAntiAlias.frequency.setTargetAtTime(postCabFreq, now, 0.02);
        }
        break;
      case 'ch3_bass':
      case 'bass': // Alias
        this.ch3BassValue = value;
        this._updateProgressiveToneStack();
        break;
      case 'ch3_middle':
      case 'ch3_mid':
      case 'mid': // Alias
        this.ch3MidValue = value;
        this._updateProgressiveToneStack();
        break;
      case 'ch3_treble':
      case 'treble': // Alias
        this.ch3TrebleValue = value;
        this._updateProgressiveToneStack();
        break;
      case 'ch3_presence':
      case 'presence': // Alias (NFB high shelf)
        {
          const dB = (value - 50) / 50 * 6;
          const master = this.outputMaster.gain.value;
          const dampingFactor = 0.6 + 0.4 * (1 - master);
          const effective = dB * dampingFactor;
          this.nfbHi.gain.setTargetAtTime(effective, now, 0.01);
          
          // De-esser: gentle LPF reduction when presence is high
          const base = 10000, min = 9000;
          const t = value / 100;
          const fc = base - (base - min) * t * 0.3; // 10k → 9.7k
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
        
        // Dynamic Presence/Depth Q: higher Q at lower volumes
        const qMul = linValue < 0.3 ? (1 + (0.3 - linValue) * 2) : 1.0;
        this.nfbHi.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        this.nfbLo.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        break;
      
      case 'depth':
        // Depth control (NFB low shelf, affects all channels)
        {
          const clampedValue = Math.max(0, Math.min(100, value));
          const dB = (clampedValue - 50) / 50 * 8; // -8dB..+8dB
          this._depthBaseDb = dB; // Store user knob setting
          this.nfbLo.gain.setTargetAtTime(dB, now, 0.02);
        }
        break;
      
      // ============================================
      // BACK PANEL CONTROLS
      // ============================================
      case 'multi_watt':
      case 'wattage':
        const watts = typeof value === 'string' ? parseInt(value) : value;
        this.setWattage(watts);
        break;
      
      case 'tight_loose':
        this.setTightLoose(value);
        break;
      
      // ============================================
      // FX LOOP & REVERB
      // ============================================
      case 'fx_loop_mix':
        // 0 = all dry (parallel), 100 = all wet (series)
        const mix = value / 100;
        const dryAmount = Math.cos(mix * Math.PI / 2);
        const wetAmount = Math.sin(mix * Math.PI / 2);
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
        this.cabinetEnabled = !!value; // Always normalize to boolean
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
      this.ch1Presence.disconnect();
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
      this.ch2Presence.disconnect();
      this.ch2Master.disconnect();
      this.ch2Fader.disconnect();
      
      // Channel 3
      this.ch3Gain.disconnect();
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
      this.ch3PresencePeak.disconnect();
      this.ch3AntiAlias2.disconnect();
      this.ch3Master.disconnect();
      this.ch3Fader.disconnect();
      
      // FX Loop & Reverb
      this.channelMixer.disconnect();
      this.fxLoopDry.disconnect();
      this.fxLoopSend.disconnect();
      this.fxLoopReturn.disconnect();
      this.fxLoopWet.disconnect();
      this.fxLoopMix.disconnect();
      this.reverbPreDelay.disconnect();
      this.reverbSend.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbReturn.disconnect();
      
      // Power section
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerPreEmph.disconnect();
      this.powerSaturation.disconnect();
      this.powerDeEmph.disconnect();
      this.nfbHi.disconnect();
      this.nfbLo.disconnect();
      this.fizzTaming.disconnect();
      this.dcBlock.disconnect();
      
      // Speaker impedance
      this.spkrResonance.disconnect();
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
      console.warn('Error disconnecting MesaTripleCrownAmp:', e);
    }
  }
}

export default MesaTripleCrownAmp;

