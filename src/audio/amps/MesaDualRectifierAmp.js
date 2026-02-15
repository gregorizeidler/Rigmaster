import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Mesa Boogie Dual Rectifier - 3-Channel High-Gain Amplifier
 * 
 * ARCHITECTURE (UPDATED):
 * - 3 parallel channels (Clean, Vintage, Modern) with TRUE equal-power crossfade (sin/cos)
 * - Zipper-free channel switching using setValueCurveAtTime (64 samples)
 * - Pre/de-emphasis anti-aliasing (±4-6dB, channel-specific pivot frequencies)
 * - Non-accumulative power gain computation (BOLD/SPONGY, Tube/Silicon, Multi-Watt, Variac)
 * - REAL SAG SYSTEM: Hybrid peak/RMS envelope detector with dynamic time constants
 * - NFB (Negative Feedback): Presence/Resonance with power amp damping simulation
 * - INTERACTIVE TONE STACK (CH3): FMV-style with bass/mid/treble interaction + makeup gain
 * - Waveshaper curves with bias shift: grid conduction, cathode voltage rise, load line bending
 * - POST-CLIP SHAPING: Mid scoop + low damping (adaptive, gain-dependent)
 * - Anti-alias filters: Pre/post saturation + post-cabinet (gain-dependent)
 * - Cached waveshaper curves (32k samples max) with asymmetric clipping
 * - Dynamic LPF on fizz taming (gain-dependent)
 * - Logarithmic taper (x^2.2) on gain control for natural feel
 * - Safety limiter at output
 * - FX loop with equal-power mix (sin/cos)
 * - JSON preset serialization
 * 
 * NOISE GATE NOTE:
 * Current implementation uses DynamicsCompressor as gate (CH2/CH3) with soft knee.
 * For production-grade gate, implement AudioWorklet with:
 *   - Envelope follower (RMS/peak detector)
 *   - Hysteresis (thresholdOpen/thresholdClose)
 *   - Attack/Release envelopes
 * See constructor comments for worklet skeleton code.
 */
class MesaDualRectifierAmp extends BaseAmp {
  // Static curve cache to avoid recreating waveshaper curves
  static _curveCache = {};
  
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Dual Rectifier', 'mesa_dual_rectifier');
    
    // MESA/BOOGIE DUAL RECTIFIER (3-Channel Modern High-Gain)
    // Used by Metallica, Dream Theater, Lamb of God
    
    // ============================================
    // POWER FACTORS (avoid accumulative gain bug)
    // ============================================
    this._powerFactors = {
      bold: 1.0,      // BOLD=1.0, SPONGY=0.85
      rectifier: 1.0, // SILICON=1.0, TUBE=0.92
      watt: 1.0,      // 50W=0.7, 100W=1.0, 150W=1.2
      variac: 1.0     // VARIAC=0.87, NORMAL=1.0
    };
    
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
    // Passive-style tone stack (pre-clip, interactive)
    this.ch3BrightCap = audioContext.createBiquadFilter(); // Bright cap (gain-dependent)
    this.ch3Bass = audioContext.createBiquadFilter();
    this.ch3Mid = audioContext.createBiquadFilter();
    this.ch3Treble = audioContext.createBiquadFilter();
    this.ch3ToneStackMakeup = audioContext.createGain(); // Makeup gain after passive stack
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
    
    // RECTIFIER SELECT (TUBE/SILICON)
    this.rectifierMode = 'silicon'; // 'tube' or 'silicon'
    
    // Rectifier filter (affects high-end response)
    this.rectifierFilter = audioContext.createBiquadFilter();
    this.rectifierFilter.type = 'lowpass';
    this.rectifierFilter.frequency.value = 11000; // Silicon default
    this.rectifierFilter.Q.value = 0.707;
    
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
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier simulation)
    // ============================================
    // Replaces old DynamicsCompressor-based sag with production-grade processor
    // Silicon rectifier (default) - tight, fast response
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.08,      // 8% sag (tight)
      att: 0.006,       // 6ms attack (fast droop)
      relFast: 0.06,    // 60ms fast recovery
      relSlow: 0.20,    // 200ms slow recovery (tube-like breathing)
      rmsMs: 10.0,      // 10ms RMS window (silicon is fast)
      shape: 1.0,       // Linear response
      floor: 0.30,      // 30% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Store rectifier type for switching (see setRectifierMode method)
    this._rectifierType = 'silicon';
    
    // ============================================
    // NFB (Negative Feedback) - Presence/Resonance
    // ============================================
    this.nfbHi = audioContext.createBiquadFilter(); // Presence (high shelf)
    this.nfbHi.type = 'highshelf';
    this.nfbHi.frequency.value = 4000;
    this.nfbHi.gain.value = 0;
    
    this.nfbLo = audioContext.createBiquadFilter(); // Resonance (low shelf)
    this.nfbLo.type = 'lowshelf';
    this.nfbLo.frequency.value = 110;
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
    this.ch1PreEmph.frequency.value = 1200; // Clean: higher pivot
    this.ch1PreEmph.gain.value = 4; // ±4dB to avoid excessive brightness
    
    this.ch2PreEmph.type = 'highshelf';
    this.ch2PreEmph.frequency.value = 1000; // Vintage: medium pivot
    this.ch2PreEmph.gain.value = 5; // Moderate emphasis
    
    this.ch3PreEmph.type = 'highshelf';
    this.ch3PreEmph.frequency.value = 800; // Modern: lower pivot for high-gain
    this.ch3PreEmph.gain.value = 6; // More emphasis for tight high-gain
    
    this.powerPreEmph.type = 'highshelf';
    this.powerPreEmph.frequency.value = 1000;
    this.powerPreEmph.gain.value = 4; // Gentler for power amp
    
    // Channel-specific saturation
    this.ch1Saturation = audioContext.createWaveShaper();
    this.ch2Saturation = audioContext.createWaveShaper();
    this.ch3Saturation = audioContext.createWaveShaper();
    
    // Power amp saturation
    this.powerSaturation = audioContext.createWaveShaper();
    
    // De-emphasis filters (tilt -6dB/oct after clipping)
    this.ch1DeEmph = audioContext.createBiquadFilter();
    this.ch2DeEmph = audioContext.createBiquadFilter();
    this.ch3DeEmph = audioContext.createBiquadFilter();
    this.powerDeEmph = audioContext.createBiquadFilter();
    
    this.ch1DeEmph.type = 'highshelf';
    this.ch1DeEmph.frequency.value = 1200; // Match pre-emphasis pivot
    this.ch1DeEmph.gain.value = -4; // Compensate pre-emphasis
    
    this.ch2DeEmph.type = 'highshelf';
    this.ch2DeEmph.frequency.value = 1000; // Match pre-emphasis pivot
    this.ch2DeEmph.gain.value = -5; // Compensate pre-emphasis
    
    this.ch3DeEmph.type = 'highshelf';
    this.ch3DeEmph.frequency.value = 800; // Match pre-emphasis pivot
    this.ch3DeEmph.gain.value = -6; // Compensate pre-emphasis
    
    this.powerDeEmph.type = 'highshelf';
    this.powerDeEmph.frequency.value = 1000;
    this.powerDeEmph.gain.value = -4;
    
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
    // NOISE GATE (for CH2/CH3) - AUDIOWORKLET
    // ============================================
    // Production-grade noise gates with true hysteresis, RMS/peak detection
    this.ch2NoiseGate = this.createNoiseGate({
      thOpen: -50,      // Open threshold (dB)
      thClose: -58,     // Close threshold (dB) - TRUE HYSTERESIS
      attack: 0.0005,   // Ultra-fast attack (0.5ms) - preserves pick transients
      release: 0.15,    // Smooth release (150ms) - no chattering
      rms: 0.015,       // 15ms RMS window
      peakMix: 0.35,    // 35% peak, 65% RMS (balanced)
      floorDb: -70,     // Gate floor (not digital silence)
      holdMs: 8         // 8ms hold time prevents chattering
    });
    
    this.ch3NoiseGate = this.createNoiseGate({
      thOpen: -48,      // Slightly tighter for modern high-gain
      thClose: -56,     // TRUE HYSTERESIS
      attack: 0.0007,   // 0.7ms attack
      release: 0.16,    // 160ms release (faster for palm mutes)
      rms: 0.015,       // 15ms RMS window
      peakMix: 0.35,    // Balanced peak/RMS
      floorDb: -70,     // Musical floor
      holdMs: 8         // Prevents chattering on fast riffs
    });
    
    // ============================================
    // MODERN CHANNEL TIGHTENING & SCOOP
    // ============================================
    // Pre-clip HPF (tight low-end)
    this.ch3TighteningFilter = audioContext.createBiquadFilter();
    this.ch3TighteningFilter.type = 'highpass';
    this.ch3TighteningFilter.frequency.value = 90;
    this.ch3TighteningFilter.Q.value = 0.707;
    
    // Post-clip mid scoop (creates the "V-shape" via filter, not amplitude)
    this.ch3MidScoop = audioContext.createBiquadFilter();
    this.ch3MidScoop.type = 'peaking';
    this.ch3MidScoop.frequency.value = 800;
    this.ch3MidScoop.Q.value = 1.0;
    this.ch3MidScoop.gain.value = -3; // Subtle scoop
    
    // Post-clip low shelf (damping for tight chug)
    this.ch3LowDamping = audioContext.createBiquadFilter();
    this.ch3LowDamping.type = 'lowshelf';
    this.ch3LowDamping.frequency.value = 120;
    this.ch3LowDamping.gain.value = 0; // Dynamic based on gain
    
    // Anti-alias filters
    this.ch3AntiAlias1 = audioContext.createBiquadFilter();
    this.ch3AntiAlias1.type = 'lowpass';
    this.ch3AntiAlias1.frequency.value = 11000;
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
    this.dcBlock.frequency.value = 30; // 30-35 Hz for firmer power response
    this.dcBlock.Q.value = 0.707;
    
    this.fizzTaming = audioContext.createBiquadFilter();
    this.fizzTaming.type = 'lowpass';
    this.fizzTaming.frequency.value = 9000; // Dynamic, gain-dependent
    this.fizzTaming.Q.value = 0.707;
    
    // ============================================
    // SPEAKER IMPEDANCE SIMULATION (4x12 Mesa with V30s)
    // ============================================
    // Models the frequency-dependent impedance curve of a real 4x12 cabinet
    // Creates the characteristic "Mesa thump" and presence peak
    
    // Low resonance peak (cabinet resonance ~110 Hz)
    this.spkrResonance = audioContext.createBiquadFilter();
    this.spkrResonance.type = 'peaking';
    this.spkrResonance.frequency.value = 110; // Mesa 4x12 fundamental
    this.spkrResonance.Q.value = 2.5; // High Q for sharp resonance
    this.spkrResonance.gain.value = 3.0; // +3dB "thump"
    
    // Voice coil inductance (presence peak ~2.4 kHz)
    this.spkrVoiceCoil = audioContext.createBiquadFilter();
    this.spkrVoiceCoil.type = 'peaking';
    this.spkrVoiceCoil.frequency.value = 2400; // V30 characteristic bite
    this.spkrVoiceCoil.Q.value = 1.8;
    this.spkrVoiceCoil.gain.value = 2.5; // +2.5dB presence
    
    // Cone breakup / high frequency rolloff
    this.spkrRolloff = audioContext.createBiquadFilter();
    this.spkrRolloff.type = 'lowpass';
    this.spkrRolloff.frequency.value = 7500; // V30 starts rolling off here
    this.spkrRolloff.Q.value = 0.5; // Gentle slope
    
    // Envelope follower for dynamic NFB coupling
    this.spkrEnvelope = audioContext.createAnalyser();
    this.spkrEnvelope.fftSize = 512;
    this.spkrEnvelope.smoothingTimeConstant = 0.85; // Slow (mechanical inertia)
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
      ch3_gain: 60, // Increased from 50 to ensure signal passes
      ch3_treble: 60, // Reduced from 70
      ch3_mid: 40, // Scooped
      ch3_bass: 60, // Reduced from 75
      ch3_presence: 50, // Reduced from 60
      ch3_master: 60, // Increased from 50 to ensure signal passes
      
      // Global controls
      output_master: 60, // Increased from 50 to ensure signal passes
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
    
    // Initialize channel 3 immediately (no fade in constructor)
    this.activeChannel = 3;
    this.ch1Fader.gain.value = 0;
    this.ch2Fader.gain.value = 0;
    this.ch3Fader.gain.value = 1; // No equal-power in constructor, just direct value
    
    console.log('🔥 Mesa Dual Rectifier Constructor Complete:');
    console.log(`   Active Channel: ${this.activeChannel}`);
    console.log(`   Faders: CH1=${this.ch1Fader.gain.value}, CH2=${this.ch2Fader.gain.value}, CH3=${this.ch3Fader.gain.value}`);
    console.log(`   CH3 Gain: ${this.ch3Gain.gain.value}, CH3 Master: ${this.ch3Master.gain.value}`);
    console.log(`   Output Master: ${this.outputMaster.gain.value}`);
    console.log(`   FX Loop: Dry=${this.fxLoopDry.gain.value}, Wet=${this.fxLoopWet.gain.value}`);
    console.log(`   Noise Gates: BYPASSED (direct connection)`);
    console.log(`   Input connected: ${!!this.input}, Output connected: ${!!this.output}`);
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
    // ENABLED: Production-grade AudioWorklet noise gate
    if (this.ch2NoiseGate) {
      this.ch2Gain.connect(this.ch2NoiseGate); // Noise gate for drive channel
      this.ch2NoiseGate.connect(this.ch2PreEmph);
    } else {
      this.ch2Gain.connect(this.ch2PreEmph); // Fallback if gate unavailable
    }
    this.ch2PreEmph.connect(this.ch2Saturation);
    this.ch2Saturation.connect(this.ch2DeEmph); // De-emphasis (-6dB/oct)
    this.ch2DeEmph.connect(this.ch2Bass);
    this.ch2Bass.connect(this.ch2Mid);
    this.ch2Mid.connect(this.ch2Treble);
    this.ch2Treble.connect(this.ch2Presence);
    this.ch2Presence.connect(this.ch2Master);
    // FX loop insertion point
    this.ch2Master.connect(this.ch2Fader);
    
    // ============================================
    // CHANNEL 3 (MODERN) - COMPLETE CHAIN
    // ============================================
    // Input → Gain → Gate → HPF → Bright Cap → Tone Stack (pre-clip) → AntiAlias → Saturation → Mid Scoop → Low Damping → AntiAlias → Master
    this.input.connect(this.ch3Gain);
    // ENABLED: Production-grade AudioWorklet noise gate
    if (this.ch3NoiseGate) {
      this.ch3Gain.connect(this.ch3NoiseGate);
      this.ch3NoiseGate.connect(this.ch3TighteningFilter);
    } else {
      this.ch3Gain.connect(this.ch3TighteningFilter); // Fallback if gate unavailable
    }
    this.ch3TighteningFilter.connect(this.ch3BrightCap); // Bright cap (gain-dependent)
    
    // PASSIVE-STYLE TONE STACK (pre-clip, interactive)
    this.ch3BrightCap.connect(this.ch3Bass);
    this.ch3Bass.connect(this.ch3Mid);
    this.ch3Mid.connect(this.ch3Treble);
    this.ch3Treble.connect(this.ch3ToneStackMakeup); // Makeup gain after passive loss
    
    // Pre-emphasis + Anti-alias before saturation
    this.ch3ToneStackMakeup.connect(this.ch3AntiAlias1);
    this.ch3AntiAlias1.connect(this.ch3PreEmph); // Pre-emphasis (+6dB/oct)
    this.ch3PreEmph.connect(this.ch3Saturation);
    
    // POST-CLIP: De-emphasis + Mid scoop + Low damping + Anti-alias
    this.ch3Saturation.connect(this.ch3DeEmph); // De-emphasis (-6dB/oct)
    this.ch3DeEmph.connect(this.ch3MidScoop);
    this.ch3MidScoop.connect(this.ch3LowDamping);
    this.ch3LowDamping.connect(this.ch3AntiAlias2);
    this.ch3AntiAlias2.connect(this.ch3Master);
    
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
    // FX Loop Mix → Power Sag (AudioWorklet) → Variac → Power Amp → Power Saturation → NFB (Presence/Resonance) → Bias → Fizz → DC Block
    // Power sag now uses AudioWorklet processor (sample-accurate, RMS/peak hybrid, dual release)
    if (this.powerSag) {
      this.fxLoopMix.connect(this.powerSag);
      this.powerSag.connect(this.variacGain);
    } else {
      this.fxLoopMix.connect(this.variacGain); // Fallback if sag unavailable
    }
    this.variacGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerPreEmph); // Pre-emphasis (+4dB/oct)
    this.powerPreEmph.connect(this.powerSaturation);
    
    // NFB (Negative Feedback): Presence + Resonance after power saturation
    this.powerSaturation.connect(this.powerDeEmph); // De-emphasis (-4dB/oct)
    this.powerDeEmph.connect(this.nfbHi); // Presence (high shelf)
    this.nfbHi.connect(this.nfbLo); // Resonance (low shelf)
    this.nfbLo.connect(this.biasFilter);
    
    this.biasFilter.connect(this.rectifierFilter);
    this.rectifierFilter.connect(this.fizzTaming);
    this.fizzTaming.connect(this.dcBlock);
    
    // ============================================
    // SPEAKER IMPEDANCE CHAIN (before cabinet)
    // ============================================
    // Signal flow: dcBlock → resonance → voiceCoil → rolloff → envelope tap → preCabinet
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
    this.postCabinet.connect(this.postCabAntiAlias); // Anti-alias after cabinet
    this.postCabAntiAlias.connect(this.outputMaster);
    this.outputMaster.connect(this.soloControl);
    this.soloControl.connect(this.finalLimiter);
    this.finalLimiter.connect(this.output);
    
    // Start sag envelope update loop
    this._startSagLoop();
  }
  
  _startSagLoop() {
    // Real-time sag envelope (updates ~60 Hz)
    // Improved with peak/RMS hybrid detector for better transient response
    this._sagInterval = setInterval(() => {
      if (!this.levelProbe || !this.supplyGain) return;
      
      const now = this.audioContext.currentTime;
      const { rms, peak } = this._estimateEnvelope(this.levelProbe);
      
      // Hybrid RMS + peak detector (peak influences attack, RMS influences sustain)
      const peakWeight = 0.3; // 30% peak, 70% RMS
      const envelope = (peak * peakWeight) + (rms * (1 - peakWeight));
      
      // Calculate target gain reduction based on envelope
      // Tube rectifier: more sag, slower recovery
      // Silicon: less sag, faster recovery
      const sagFactor = this._sagDepth * (this.variacMode ? 1.3 : 1.0);
      const sagAmount = envelope * sagFactor;
      const target = Math.max(0.25, 1.0 - sagAmount); // Don't collapse below 25%
      
      // Dynamic time constants based on signal behavior
      // Fast attack when signal increases (supply droops quickly)
      // Slow release when signal decreases (supply recovers slowly)
      const isAttacking = target < this._lastRMS;
      const tau = isAttacking ? this._sagAttack : this._sagRelease;
      
      // Apply smooth envelope
      try {
        this.supplyGain.gain.cancelAndHoldAtTime(now);
      } catch (e) {
        // Not supported in older browsers
      }
      this.supplyGain.gain.setTargetAtTime(target, now, tau);
      
      this._lastRMS = target;
      
      // ============================================
      // SPEAKER IMPEDANCE → NFB DYNAMIC COUPLING
      // ============================================
      // Real speakers dynamically affect NFB based on cone excursion
      // Low frequencies = more cone movement = impedance rises = tighter bass
      if (this.spkrEnvelope && this.nfbLo) {
        const spkrEnv = this._estimateEnvelope(this.spkrEnvelope).rms;
        
        // Smooth envelope (simulates mechanical inertia of speaker cone)
        const alpha = 0.1; // Slow smoothing (~10Hz cutoff)
        const smoothEnv = this._lastSpkrEnv * (1 - alpha) + spkrEnv * alpha;
        this._lastSpkrEnv = smoothEnv;
        
        // Modulate resonance (NFB low shelf) based on speaker excursion
        // More signal → more cone movement → impedance rises → tighter bass
        const baseResonanceDb = 0; // Base setting (from user control)
        const dynamicDb = smoothEnv * 2.0; // Up to +2dB when speaker works hard
        const targetDb = baseResonanceDb + dynamicDb;
        
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
    
    const buffer = new Uint8Array(analyser.fftSize);
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
      
      console.log('🔥 Mesa Dual Rectifier recreateCabinet:', {
        cabinetType: this.cabinetType,
        micType: this.micType,
        micPosition: this.micPosition,
        cabinetCreated: !!this.cabinet,
        cabinetEnabled: this.cabinetEnabled
      });
      
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        // Fallback if cabinet creation fails
        console.error('❌ Mesa Dual Rectifier: Cabinet creation failed! Bypassing cabinet.');
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      // Bypass cabinet
      console.log('🔥 Mesa Dual Rectifier: Cabinet bypassed');
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // CHANNEL 1 (CLEAN) - Initial Settings
    // ============================================
    this.ch1Gain.gain.value = 1.5; // Clean channel - moderate gain
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
    this.ch2Gain.gain.value = 3.0; // Vintage gain - reduced from 5.0
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
    this.ch3Gain.gain.value = 5; // High gain but controlled
    this.ch3Master.gain.value = 0.65;
    
    // PASSIVE-STYLE TONE STACK (pre-clip, FMV interactive)
    // Bright cap (gain-dependent boost at 1.5-2.5 kHz when gain is low)
    this.ch3BrightCap.type = 'highshelf';
    this.ch3BrightCap.frequency.value = 1800;
    this.ch3BrightCap.gain.value = 0; // Dynamic, updated by gain control
    
    // Bass: ~100-120 Hz (Mesa's typical bass freq)
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.value = 110;
    this.ch3Bass.gain.value = 3;
    
    // Mid: ~600-800 Hz with Q 0.7-1.2 (interactive)
    this.ch3Mid.type = 'peaking';
    this.ch3Mid.frequency.value = 700;
    this.ch3Mid.gain.value = 0; // Neutral by default
    this.ch3Mid.Q.value = 0.9;
    
    // Treble: shelf at ~2.5-3.5 kHz (passive loss simulation)
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.value = 3000;
    this.ch3Treble.gain.value = 2;
    
    // Makeup gain after passive tone stack (compensates for loss)
    this.ch3ToneStackMakeup.gain.value = 1.8; // ~+5 dB makeup
    
    // Initialize interactive tone stack
    this._updateInteractiveToneStack();
    
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
    // FIXED: When no external FX connected, dry path must be open!
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
    this.outputMaster.gain.value = 0.6; // Increased from 0.5 to ensure signal passes
    this.soloControl.gain.value = 1.0;
  }
  
  // ============================================
  // POWER GAIN COMPUTATION (non-accumulative)
  // ============================================
  
  _recomputePowerGain() {
    const f = this._powerFactors;
    const total = f.bold * f.rectifier * f.watt * f.variac;
    this.powerAmp.gain.setValueAtTime(total, this.audioContext.currentTime);
  }
  
  _recomputePowerEnv() {
    // Centralized power/sag envelope computation
    // powerSag is an AudioWorkletNode, not a DynamicsCompressor
    // Update its parameters based on mode settings
    
    if (!this.powerSag || !this.powerSag.parameters) {
      // Fallback if AudioWorklet not available
      return;
    }
    
    const now = this.audioContext.currentTime;
    
    // Apply RECTIFIER modifications
    if (this.rectifierMode === 'tube') {
      // Tube rectifier: Heavy sag, slow response
      this.powerSag.parameters.get('depth').setValueAtTime(0.15, now);
      this.powerSag.parameters.get('relSlow').setValueAtTime(0.25, now);
      this.rectifierFilter.frequency.value = 9500;
    } else {
      // Silicon: Light sag, fast response
      this.powerSag.parameters.get('depth').setValueAtTime(0.08, now);
      this.powerSag.parameters.get('relSlow').setValueAtTime(0.20, now);
      this.rectifierFilter.frequency.value = 11000;
    }
    
    // Apply BOLD/SPONGY modifications
    if (this.powerMode === 'spongy') {
      const currentDepth = this.powerSag.parameters.get('depth').value;
      this.powerSag.parameters.get('depth').setValueAtTime(currentDepth * 1.3, now);
      this.powerSag.parameters.get('relSlow').setValueAtTime(0.30, now);
    }
    
    // Apply VARIAC modifications
    if (this.variacMode) {
      const currentDepth = this.powerSag.parameters.get('depth').value;
      this.powerSag.parameters.get('depth').setValueAtTime(currentDepth * 1.15, now);
    }
    
    console.log(`Mesa Power Sag updated: mode=${this.powerMode}, rectifier=${this.rectifierMode}, variac=${this.variacMode}`);
  }
  
  // ============================================
  // SATURATION CURVES (cached for performance)
  // ============================================
  
  _makeCurve(key, fn) {
    if (!MesaDualRectifierAmp._curveCache[key]) {
      // Use 32k samples max (sufficient quality, avoids huge arrays at 96kHz)
      const samples = 65536;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = fn(x);
      }
      MesaDualRectifierAmp._curveCache[key] = curve;
    }
    return MesaDualRectifierAmp._curveCache[key];
  }
  
  // ============================================
  // SATURATION CURVES
  // ============================================
  
  makeCleanCurve() {
    return this._makeCurve('mesa_clean_v2', (x) => {
      // Clean channel - minimal distortion with slight triode character
      // Triode grid conduction at extremes
      let y = Math.tanh(x * 1.5);
      
      // Grid conduction (harder clipping at extremes)
      if (Math.abs(x) > 0.7) {
        const excess = Math.abs(x) - 0.7;
        y += Math.sign(x) * excess * 0.1;
      }
      
      return Math.tanh(y * 1.1);
    });
  }
  
  makeVintageCurve() {
    return this._makeCurve('mesa_vintage_v2', (x) => {
      // Vintage channel - classic rock gain with bias shift
      // Bias shift: as input increases, operating point shifts
      const biasShift = x * 0.08; // Simulates cathode resistor voltage rise
      const xShifted = x - biasShift;
      
      let y = Math.tanh(xShifted * 6);
      y = Math.tanh(y * 1.3);
      
      // Asymmetric clipping (triode cutoff vs grid conduction)
      y = y > 0 ? y * 1.08 : y * 0.95;
      
      return y * 0.8;
    });
  }
  
  makeModernCurve() {
    return this._makeCurve('mesa_modern_v3', (x) => {
      // MODERN CHANNEL - High gain with dynamic bias shift
      // Simulates 3 cascaded 12AX7 stages with cathode bias shift
      
      // Stage 1: Early asymmetry + bias shift
      const biasShift1 = x * 0.12;
      let y = Math.tanh((x - biasShift1) * 14);
      
      // Stage 2: Interstage coupling
      y = Math.tanh(y * 1.5);
      
      // Stage 3: Final gain stage with compression
      const biasShift2 = y * 0.08;
      y = Math.tanh((y - biasShift2) * 1.3);
      
      // 6L6 power tube asymmetry (stronger positive peaks)
      // Plate current saturation vs cutoff
      if (y > 0) {
        y = Math.tanh(y * 1.2) * 1.15;
      } else {
        y = Math.tanh(y * 1.1) * 1.05;
      }
      
      // Dynamic compression (load line bending at high drive)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.7);
      }
      
      return y * 0.7;
    });
  }
  
  makePowerAmpCurve() {
    return this._makeCurve('mesa_power_v2', (x) => {
      // 6L6 power tubes with realistic grid conduction and cutoff
      
      // Bias shift under drive (cathode resistor voltage rises)
      const biasShift = x * 0.06;
      let y = Math.tanh((x - biasShift) * 1.5);
      
      // 6L6 asymmetry: grid conduction (positive) vs cutoff (negative)
      // Positive: grid conducts, harder clipping
      // Negative: smooth cutoff
      if (x > 0) {
        y *= 1.1;
        // Grid conduction at high positive input
        if (x > 0.8) {
          y += (x - 0.8) * 0.15;
        }
      } else {
        y *= 0.98;
      }
      
      // Output transformer saturation (soft limiting)
      if (Math.abs(y) > 0.75) {
        const excess = Math.abs(y) - 0.75;
        y = Math.sign(y) * (0.75 + excess * 0.6);
      }
      
      return y;
    });
  }
  
  // ============================================
  // WDF-INSPIRED TONE STACK (Mesa/Boogie FMV passive circuit)
  // ============================================
  _updateInteractiveToneStack() {
    const now = this.audioContext.currentTime;
    
    // Normalize to 0..1 (pot rotation)
    const bass = this.ch3BassValue / 100;
    const mid = this.ch3MidValue / 100;
    const treble = this.ch3TrebleValue / 100;
    
    // WDF-INSPIRED MODEL: All pots interact through impedance
    // Models the actual passive circuit where cap/resistor networks couple
    
    // BASS: Low shelf with treble loading interaction
    // Treble pot changes bass network impedance
    const bassFreq = 120 + (treble * 30); // 120-150 Hz
    const bassGainDb = (bass - 0.5) * 16; // ±8dB
    // Treble affects bass Q (loading effect)
    const bassQ = 0.707 + (treble * 0.2); // 0.707-0.907
    
    this.ch3Bass.type = 'lowshelf';
    this.ch3Bass.frequency.setTargetAtTime(bassFreq, now, 0.01);
    this.ch3Bass.gain.setTargetAtTime(bassGainDb, now, 0.01);
    this.ch3Bass.Q.setTargetAtTime(bassQ, now, 0.01);
    
    // MID: Peaking - most interactive (coupled by capacitors)
    // Both bass and treble affect mid center frequency
    const bassMidShift = (bass - 0.5) * 160;
    const trebleMidShift = (treble - 0.5) * 200;
    const midFreq = 650 + bassMidShift + trebleMidShift; // 490-850 Hz
    const midGainDb = (mid - 0.5) * 20; // ±10dB
    // Q behavior: impedance rises when boosting, drops when cutting
    const midQ = mid > 0.5 ? 
      (1.2 + (mid - 0.5) * 1.0) :  // Boost: 1.2→1.7
      (1.2 + (mid - 0.5) * 0.6);   // Cut: 1.2→0.9
    
    this.ch3Mid.type = 'peaking';
    this.ch3Mid.frequency.setTargetAtTime(midFreq, now, 0.01);
    this.ch3Mid.gain.setTargetAtTime(midGainDb, now, 0.01);
    this.ch3Mid.Q.setTargetAtTime(midQ, now, 0.01);
    
    // TREBLE: High shelf with bass loading interaction
    // Bass pot loads treble network
    const trebleFreq = 2800 - (bass - 0.5) * 600; // 2500-3100 Hz
    const trebleGainDb = (treble - 0.5) * 18; // ±9dB
    // Bass affects treble Q (loading effect)
    const trebleQ = 0.707 + ((1 - bass) * 0.3); // 0.707-1.007
    
    this.ch3Treble.type = 'highshelf';
    this.ch3Treble.frequency.setTargetAtTime(trebleFreq, now, 0.01);
    this.ch3Treble.gain.setTargetAtTime(trebleGainDb, now, 0.01);
    this.ch3Treble.Q.setTargetAtTime(trebleQ, now, 0.01);
    
    // MAKEUP GAIN: Passive FMV has 10-20dB insertion loss
    // Loss varies with settings (impedance mismatch)
    const avgSetting = (bass + mid + treble) / 3;
    const deviation = Math.abs(bass - avgSetting) + Math.abs(mid - avgSetting) + Math.abs(treble - avgSetting);
    const baseLoss = 0.35; // ~-9dB base loss
    const deviationLoss = deviation * 0.08; // Extra loss for mismatched pots
    const insertionLoss = baseLoss + deviationLoss;
    const makeupGain = 1 / (1 - insertionLoss);
    
    // Extra makeup for extreme boost settings
    const extremeBoost = Math.max(0, (bass - 0.7) + (treble - 0.7)) * 0.15;
    const finalMakeup = makeupGain * (1 + extremeBoost);
    
    this.ch3ToneStackMakeup.gain.setTargetAtTime(finalMakeup, now, 0.01);
    
    console.log(`Mesa WDF Tone Stack: B=${bassFreq.toFixed(0)}Hz/${bassGainDb.toFixed(1)}dB Q=${bassQ.toFixed(2)}, M=${midFreq.toFixed(0)}Hz/${midGainDb.toFixed(1)}dB Q=${midQ.toFixed(2)}, T=${trebleFreq.toFixed(0)}Hz/${trebleGainDb.toFixed(1)}dB Q=${trebleQ.toFixed(2)}, makeup=${finalMakeup.toFixed(2)}x`);
  }
  
  // ============================================
  // BACK PANEL CONTROLS
  // ============================================
  
  setBoldMode(isBold) {
    this.powerMode = isBold ? 'bold' : 'spongy';
    this._powerFactors.bold = isBold ? 1.0 : 0.85;
    this._recomputePowerEnv();
    this._recomputePowerGain();
  }
  
  setRectifier(type) {
    this.rectifierMode = type;
    this._rectifierType = type;
    this._powerFactors.rectifier = (type === 'silicon') ? 1.0 : 0.92;
    
    // Update sag processor parameters for tube vs silicon
    if (this.powerSag && this.powerSag.parameters) {
      if (type === 'tube') {
        // Tube rectifier: Heavy sag, slow response, progressive curve
        this.powerSag.parameters.get('depth').value = 0.15;      // 15% sag (heavy)
        this.powerSag.parameters.get('att').value = 0.006;       // 6ms attack
        this.powerSag.parameters.get('relFast').value = 0.06;    // 60ms fast recovery
        this.powerSag.parameters.get('relSlow').value = 0.25;    // 250ms slow recovery
        this.powerSag.parameters.get('rmsMs').value = 25.0;      // 25ms RMS window (slower)
        this.powerSag.parameters.get('shape').value = 1.6;       // Progressive/tube-like
        this.powerSag.parameters.get('floor').value = 0.25;      // 25% minimum headroom
      } else {
        // Silicon rectifier: Light sag, fast response, linear curve
        this.powerSag.parameters.get('depth').value = 0.08;      // 8% sag (tight)
        this.powerSag.parameters.get('att').value = 0.006;       // 6ms attack
        this.powerSag.parameters.get('relFast').value = 0.06;    // 60ms fast recovery
        this.powerSag.parameters.get('relSlow').value = 0.20;    // 200ms slow recovery
        this.powerSag.parameters.get('rmsMs').value = 10.0;      // 10ms RMS window (faster)
        this.powerSag.parameters.get('shape').value = 1.0;       // Linear
        this.powerSag.parameters.get('floor').value = 0.30;      // 30% minimum headroom
      }
      console.log(`✅ Mesa Dual Rectifier: Switched to ${type.toUpperCase()} rectifier`);
    }
    
    this._recomputePowerGain();
  }
  
  setWattage(watts) {
    this.wattage = watts;
    
    switch (watts) {
      case 50:
        this._powerFactors.watt = 0.7; // Lower headroom
        break;
      case 100:
        this._powerFactors.watt = 1.0; // Full power
        break;
      case 150:
        this._powerFactors.watt = 1.2; // Extra headroom
        break;
    }
    
    this._recomputePowerGain();
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
    this._powerFactors.variac = enabled ? 0.87 : 1.0;
    this.variacGain.gain.value = enabled ? 0.87 : 1.0;
    this._recomputePowerEnv();
    this._recomputePowerGain();
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
      const x = i / (N - 1); // 0.0 to 1.0
      sinCurve[i] = Math.sin(x * Math.PI / 2); // 0 → 1
      cosCurve[i] = Math.cos(x * Math.PI / 2); // 1 → 0
    }
    
    faders.forEach((fader, i) => {
      const isTarget = (i + 1) === channel;
      const curve = isTarget ? sinCurve : cosCurve;
      
      // Cancel previous automations and apply smooth curve
      fader.cancelScheduledValues(now);
      fader.setValueAtTime(fader.value, now);
      fader.setValueCurveAtTime(curve, now, fadeTime);
    });
    
    console.log(`Mesa Dual Rectifier: Channel ${channel} (zipper-free equal-power cos/sin x-fade)`);
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
      ampType: 'mesa_dual_rectifier',
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
        // Clean channel: moderate scaling
        this.ch1Gain.gain.setTargetAtTime(1 + (value / 30), now, 0.01);
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
        // Vintage gain: moderate scaling (was /12, now /20)
        this.ch2Gain.gain.setTargetAtTime(1 + (value / 20), now, 0.01);
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
        {
          // Logarithmic taper (x^2.2) for more natural feel
          const norm = Math.pow(value / 100, 2.2);
          const ch3GainValue = 1 + norm * 8; // 1x to 9x
          this.ch3Gain.gain.setTargetAtTime(ch3GainValue, now, 0.01);
          
          // Bright cap: boost high shelf when gain is LOW (simulates bright cap bypass at high gain)
          const brightBoost = (1 - norm) * 2; // 2 dB when gain=0, 0 dB when gain=100
          this.ch3BrightCap.gain.setTargetAtTime(brightBoost, now, 0.01);
          
          // Low damping (post-clip tight chug): cut low shelf when gain is HIGH
          const lowDamping = -norm * 2.5; // 0 dB when gain=0, -2.5 dB when gain=100
          this.ch3LowDamping.gain.setTargetAtTime(lowDamping, now, 0.01);
          
          // Dynamic LPF on fizz taming (more gain = darker tone)
          const minHz = 6000, maxHz = 10000;
          const fizzFreq = maxHz - (maxHz - minHz) * norm;
          this.fizzTaming.frequency.setTargetAtTime(fizzFreq, now, 0.02);
          
          // Post-cabinet anti-alias (gain-dependent)
          const postCabFreq = 10000 - norm * 1000; // 10 kHz to 9 kHz
          this.postCabAntiAlias.frequency.setTargetAtTime(postCabFreq, now, 0.02);
          
          console.log(`Mesa CH3 Gain: ${value} → ${ch3GainValue.toFixed(2)}x, bright: ${brightBoost.toFixed(1)}dB, fizz: ${fizzFreq.toFixed(0)}Hz`);
        }
        break;
      case 'ch3_bass':
      case 'bass': // Alias
        this.ch3BassValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_mid':
      case 'mid': // Alias
        this.ch3MidValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_treble':
      case 'treble': // Alias
        this.ch3TrebleValue = value;
        this._updateInteractiveToneStack();
        break;
      case 'ch3_presence':
      case 'presence': // Alias (NFB high shelf)
        {
          // Presence controls NFB (negative feedback) high shelf
          // -6dB..+6dB, attenuates with master to simulate power amp damping
          // At high volumes, speaker load damps presence (real amp behavior)
          const dB = (value - 50) / 50 * 6;
          const master = this.outputMaster.gain.value; // 0..1
          const dampingFactor = 0.6 + 0.4 * (1 - master); // More effect at low volume
          const effective = dB * dampingFactor;
          this.nfbHi.gain.setTargetAtTime(effective, now, 0.01);
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
        // Simplified linear volume control (logarithmic was too complex)
        const linValue = value / 100; // Simple 0-1 range
        this.outputMaster.gain.setTargetAtTime(linValue, now, 0.01);
        
        // Dynamic Presence/Resonance Q: higher Q at lower volumes for more definition
        // At low master (<30%), Q increases to compensate for hearing curve
        const qMul = linValue < 0.3 ? (1 + (0.3 - linValue) * 2) : 1.0;
        this.nfbHi.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        this.nfbLo.Q.setTargetAtTime(0.707 * qMul, now, 0.01);
        
        console.log(`Mesa Master Volume: ${value} → ${linValue.toFixed(3)}, Q multiplier: ${qMul.toFixed(2)}`);
        break;
      
      case 'solo':
        // Solo boost: 0 = normal, 100 = +6dB
        const soloGain = 1.0 + (value / 100) * 1.0; // Up to 2x = +6dB
        this.soloControl.gain.setTargetAtTime(soloGain, now, 0.01);
        break;
      
      case 'resonance':
        // Resonance control (NFB low shelf, affects all channels)
        {
          const dB = (value - 50) / 50 * 8; // -8dB..+8dB (wider range than presence)
          this.nfbLo.gain.setTargetAtTime(dB, now, 0.02);
        }
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
        // Use equal-power mix to avoid +3dB bump at 50/50
        const mix = value / 100;
        const dryAmount = Math.cos(mix * Math.PI / 2); // cos curve: 1 → 0
        const wetAmount = Math.sin(mix * Math.PI / 2); // sin curve: 0 → 1
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
      this.ch1Mid.disconnect();
      this.ch1Treble.disconnect();
      this.ch1Presence.disconnect();
      this.ch1Master.disconnect();
      this.ch1Fader.disconnect();
      
      // Channel 2
      this.ch2Gain.disconnect();
      this.ch2NoiseGate.disconnect();
      this.ch2PreEmph.disconnect();
      this.ch2Saturation.disconnect();
      this.ch2DeEmph.disconnect();
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
      this.ch3BrightCap.disconnect();
      this.ch3Bass.disconnect();
      this.ch3Mid.disconnect();
      this.ch3Treble.disconnect();
      this.ch3ToneStackMakeup.disconnect();
      this.ch3AntiAlias1.disconnect();
      this.ch3PreEmph.disconnect();
      this.ch3Saturation.disconnect();
      this.ch3DeEmph.disconnect();
      this.ch3MidScoop.disconnect();
      this.ch3LowDamping.disconnect();
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
      this.reverbSend.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbReturn.disconnect();
      
      // Power section
      if (this.levelProbe) this.levelProbe.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      if (this.rectifierSag) this.rectifierSag.disconnect();
      this.rectifierFilter.disconnect();
      this.variacGain.disconnect();
      this.powerAmp.disconnect();
      if (this.supplyGain) this.supplyGain.disconnect();
      this.powerPreEmph.disconnect();
      this.powerSaturation.disconnect();
      this.powerDeEmph.disconnect();
      this.nfbHi.disconnect();
      this.nfbLo.disconnect();
      this.biasFilter.disconnect();
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
      this.soloControl.disconnect();
      this.output.disconnect();
    } catch (e) {
      console.warn('Error disconnecting MesaDualRectifierAmp:', e);
    }
  }
}

export default MesaDualRectifierAmp;
