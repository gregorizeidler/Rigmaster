import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class FenderVibroKingAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Vibro-King', 'fender_vibro_king');
    
    // FENDER VIBRO-KING (1993-present)
    // THE boutique Fender - Robben Ford signature sound
    // 60W (3x 6L6), 3x10" speakers, BOTH tremolo AND pitch vibrato
    // Famous for: Pristine cleans, lush reverb, complex modulation
    // Used by: Robben Ford, John Mayer, Eric Johnson
    
    // ============================================
    // INPUT STAGE (High-pass for subsonic cleanup)
    // ============================================
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 40;
    this.inputHPF.Q.value = 0.707;
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (Very light for clean amp)
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -58,      // Very light gate (Fender clean transparency)
      thClose: -65,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack (ultra-fast, preserves transients)
      release: 0.18,    // 180ms release (smooth, natural)
      rms: 0.025,       // 25ms RMS window (smooth for clean tones)
      peakMix: 0.25,    // More RMS (clean amp doesn't need fast peak response)
      floorDb: -75,     // Very low floor (pristine clean silence)
      holdMs: 6         // Short hold (clean amp dynamics)
    });
    
    // ============================================
    // BRIGHT SWITCH & CAP (Interactive with volume)
    // ============================================
    this.brightSwitch = false;
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 3200; // Vibro-King sweet spot
    this.brightCap.gain.value = 0;
    this._currentVolume = 65; // Track for bright cap interaction
    
    // ============================================
    // PREAMP STAGES (12AX7 tubes - 3 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages with Fender blackface character
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeVibroKingPreampCurve({stage: 1});
    this.saturation2.curve = this.makeVibroKingPreampCurve({stage: 2});
    this.saturation3.curve = this.makeVibroKingPreampCurve({stage: 3});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // COUPLING CAPACITORS (Shape frequency response)
    // ============================================
    this.couplingCap1 = audioContext.createBiquadFilter();
    this.couplingCap2 = audioContext.createBiquadFilter();
    
    this.couplingCap1.type = 'highpass';
    this.couplingCap1.frequency.value = 70; // Vibro-King has deep bass response
    this.couplingCap1.Q.value = 0.707;
    
    this.couplingCap2.type = 'highpass';
    this.couplingCap2.frequency.value = 85;
    this.couplingCap2.Q.value = 0.707;
    
    // ============================================
    // VOLUME CONTROL
    // ============================================
    this.volume = audioContext.createGain();
    
    // ============================================
    // BLACKFACE TONE STACK (Bass, Mid, Treble)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 90; // Vibro-King deep bass
    this.bass.gain.value = 0;
    
    // Fender "mid scoop" characteristic (but less than Twin)
    this.mid.type = 'peaking';
    this.mid.frequency.value = 600; // Vibro-King smoother mids
    this.mid.Q.value = 1.0;
    this.mid.gain.value = -1.5; // Slight natural scoop
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2600; // Vibro-King smooth highs
    this.treble.gain.value = 0;
    
    // ============================================
    // FENDER SPARKLE (Signature chimey highs)
    // ============================================
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 3800; // Vibro-King air
    this.sparkle.Q.value = 2.2;
    this.sparkle.gain.value = 1.8; // More sparkle than standard Fender
    
    // ============================================
    // SPRING REVERB (6-spring tank - Vibro-King signature!)
    // ============================================
    // Vibro-King has one of the best spring reverbs ever made
    this.reverbDwell = audioContext.createGain(); // Send amount
    this.reverbMix = audioContext.createGain(); // Return amount
    
    // Six parallel spring delays (luxury reverb!)
    this.spring1 = audioContext.createDelay(0.25);
    this.spring2 = audioContext.createDelay(0.25);
    this.spring3 = audioContext.createDelay(0.25);
    this.spring4 = audioContext.createDelay(0.25);
    this.spring5 = audioContext.createDelay(0.25);
    this.spring6 = audioContext.createDelay(0.25);
    
    // Staggered delay times for lush reverb
    this.spring1.delayTime.value = 0.027;
    this.spring2.delayTime.value = 0.032;
    this.spring3.delayTime.value = 0.037;
    this.spring4.delayTime.value = 0.041;
    this.spring5.delayTime.value = 0.046;
    this.spring6.delayTime.value = 0.051;
    
    // Spring reverb character filters
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 180; // Clean up lows
    this.reverbHPF.Q.value = 0.707;
    
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 4200; // Vibro-King reverb is brighter
    this.reverbLPF.Q.value = 0.707;
    
    // Allpass for diffusion (lush "drip")
    this.reverbAllpass1 = audioContext.createBiquadFilter();
    this.reverbAllpass1.type = 'allpass';
    this.reverbAllpass1.frequency.value = 1100;
    this.reverbAllpass1.Q.value = 2.5;
    
    this.reverbAllpass2 = audioContext.createBiquadFilter();
    this.reverbAllpass2.type = 'allpass';
    this.reverbAllpass2.frequency.value = 1700;
    this.reverbAllpass2.Q.value = 2.5;
    
    // Spring "boing" resonance
    this.springResonance = audioContext.createBiquadFilter();
    this.springResonance.type = 'peaking';
    this.springResonance.frequency.value = 2400; // Vibro-King spring character
    this.springResonance.Q.value = 3.5;
    this.springResonance.gain.value = 5; // Pronounced "drip"
    
    // Reverb feedback
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.45; // Lush decay
    
    // Spring reverb routing
    this.spring1.connect(this.reverbLPF);
    this.spring2.connect(this.reverbLPF);
    this.spring3.connect(this.reverbLPF);
    this.spring4.connect(this.reverbLPF);
    this.spring5.connect(this.reverbLPF);
    this.spring6.connect(this.reverbLPF);
    
    this.reverbLPF.connect(this.reverbAllpass1);
    this.reverbAllpass1.connect(this.reverbAllpass2);
    this.reverbAllpass2.connect(this.springResonance);
    this.springResonance.connect(this.reverbFeedback);
    
    // Feedback loop
    this.reverbFeedback.connect(this.spring1);
    this.reverbFeedback.connect(this.spring2);
    this.reverbFeedback.connect(this.spring3);
    this.reverbFeedback.connect(this.spring4);
    this.reverbFeedback.connect(this.spring5);
    this.reverbFeedback.connect(this.spring6);
    
    // Reverb output
    this.springResonance.connect(this.reverbMix);
    
    // ============================================
    // REVERB PREDELAY (2-6ms for amp-room separation)
    // ============================================
    this.reverbPreDelay = audioContext.createDelay(0.02);
    this.reverbPreDelay.delayTime.value = 0.004; // 4ms predelay
    
    // ============================================
    // REVERB TILT (Dynamic EQ based on wet level)
    // ============================================
    this.reverbTilt = audioContext.createBiquadFilter();
    this.reverbTilt.type = 'highshelf';
    this.reverbTilt.frequency.value = 3000;
    this.reverbTilt.gain.value = 0;
    
    // Reverb sum (dry + wet mixer BEFORE power amp)
    this.reverbSum = audioContext.createGain();
    
    // ============================================
    // TREMOLO (Optical AM tremolo with lamp "throb")
    // ============================================
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 5;
    
    // Waveshaper for lamp-like throb (photo-cell characteristic)
    this.tremShaper = audioContext.createWaveShaper();
    this.tremShaper.curve = this.makeLampThrobCurve();
    
    this.tremoloDepthControl = audioContext.createGain();
    this.tremoloDepthControl.gain.value = 0;
    
    // Amplitude modulation
    this.tremoloGain = audioContext.createGain();
    this.tremoloGain.gain.value = 1;
    
    // Anti-pump HPF (prevents bass pumping at high depth)
    this.postTremHPF = audioContext.createBiquadFilter();
    this.postTremHPF.type = 'highpass';
    this.postTremHPF.frequency.value = 35;
    this.postTremHPF.Q.value = 0.7;
    
    this.tremoloLFO.connect(this.tremShaper);
    this.tremShaper.connect(this.tremoloDepthControl);
    this.tremoloDepthControl.connect(this.tremoloGain.gain);
    
    this.tremoloLFO.start();
    
    // ============================================
    // HARMONIC VIBRATO (Fender-style split-band tremolo)
    // ============================================
    // This is the CORRECT "Vibrato" effect on Fender amps
    // (Not pitch modulation, but psychoacoustic AM on split bands)
    
    // Split bands at ~700 Hz
    this.lowBand = audioContext.createBiquadFilter();
    this.lowBand.type = 'lowpass';
    this.lowBand.frequency.value = 700;
    this.lowBand.Q.value = 0.707;
    
    this.highBand = audioContext.createBiquadFilter();
    this.highBand.type = 'highpass';
    this.highBand.frequency.value = 700;
    this.highBand.Q.value = 0.707;
    
    // Gain nodes for each band
    this.harmLoGain = audioContext.createGain();
    this.harmHiGain = audioContext.createGain();
    this.harmLoGain.gain.value = 1.0;
    this.harmHiGain.gain.value = 1.0;
    
    // Harmonic LFO (same freq as tremolo but out-of-phase between bands)
    this.harmLFO = audioContext.createOscillator();
    this.harmLFO.type = 'sine';
    this.harmLFO.frequency.value = 5;
    
    this.harmDepthLo = audioContext.createGain();
    this.harmDepthHi = audioContext.createGain();
    this.harmDepthLo.gain.value = 0;
    this.harmDepthHi.gain.value = 0;
    
    // LFO modulates both bands (with inverted polarity on one)
    this.harmLFO.connect(this.harmDepthLo);
    this.harmLFO.connect(this.harmDepthHi);
    this.harmDepthLo.connect(this.harmLoGain.gain);
    this.harmDepthHi.connect(this.harmHiGain.gain);
    
    this.harmLFO.start();
    
    // Mix node for harmonic vibrato
    this.harmMix = audioContext.createGain();
    
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (Tube rectifier)
    // ============================================
    // Vibro-King uses 5U4GB tube rectifier (vintage sag)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.12,      // 12% sag (medium vintage sag)
      att: 0.010,       // 10ms attack (tube rectifier character)
      relFast: 0.09,    // 90ms fast recovery
      relSlow: 0.28,    // 280ms slow recovery (vintage breathing)
      rmsMs: 22.0,      // 22ms RMS window (vintage smooth)
      shape: 1.6,       // Progressive (vintage tube sag)
      floor: 0.28,      // 28% minimum headroom
      peakMix: 0.27     // More RMS-focused (smooth vintage compression)
    });
    
    // ============================================
    // POWER AMP (3x 6L6 tubes @ 60W - Class AB)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeVibroKing6L6Curve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression (gentle 6L6 behavior)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18; // Lots of headroom
    this.powerComp.knee.value = 12; // Very soft knee
    this.powerComp.ratio.value = 2.2;
    this.powerComp.attack.value = 0.012;
    this.powerComp.release.value = 0.14;
    
    // ============================================
    // PRESENCE CONTROL (Negative feedback)
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500; // Vibro-King presence
    this.presence.gain.value = 0;
    
    // ============================================
    // OUTPUT TRANSFORMER SIMULATION (60W large OT)
    // ============================================
    this.transformerLPF = audioContext.createBiquadFilter();
    this.transformerLPF.type = 'lowpass';
    this.transformerLPF.frequency.value = 9200; // Vibro-King extended top end
    this.transformerLPF.Q.value = 1.2; // Resonant peak
    
    this.transformerHPF = audioContext.createBiquadFilter();
    this.transformerHPF.type = 'highpass';
    this.transformerHPF.frequency.value = 75; // Deep bass response
    this.transformerHPF.Q.value = 0.8;
    
    // Transformer saturation (very subtle for clean amp)
    this.transformerSat = audioContext.createWaveShaper();
    this.transformerSat.curve = this.makeTransformerCurve();
    this.transformerSat.oversample = '4x';
    
    // ============================================
    // DC BLOCKER
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR (3x10" - Vibro-King unique config)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '3x10_open'; // Vibro-King signature cabinet
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // POST-CABINET CHARACTER (3x10 sweetness)
    // ============================================
    this.postCabBite = audioContext.createBiquadFilter();
    this.postCabBite.type = 'peaking';
    this.postCabBite.frequency.value = 3200; // 3x10 character
    this.postCabBite.Q.value = 1.3;
    this.postCabBite.gain.value = 1.8; // Sweet presence bump
    
    // ============================================
    // SAFETY LIMITER (Ceiling without crushing dynamics)
    // ============================================
    this.safetyLimiter = audioContext.createDynamicsCompressor();
    this.safetyLimiter.threshold.value = -0.8;
    this.safetyLimiter.knee.value = 0;
    this.safetyLimiter.ratio.value = 20;
    this.safetyLimiter.attack.value = 0.002;
    this.safetyLimiter.release.value = 0.05;
    
    // ============================================
    // MASTER OUTPUT
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMS (BEFORE SETUP - CRITICAL!)
    // ============================================
    this.params = {
      // Controls
      volume: 65,
      bass: 55,
      mid: 50,
      treble: 65,
      
      // Switches
      bright: false,
      
      // Reverb
      reverb: 35,
      reverb_dwell: 50, // Feedback amount
      
      // Tremolo
      tremolo_speed: 50,
      tremolo_intensity: 0,
      
      // Vibrato (pitch modulation)
      vibrato_speed: 50,
      vibrato_intensity: 0,
      
      // Presence
      presence: 50,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '3x10_open',
      microphone: 'sm57',
      micPosition: 'edge',
      
      // Master
      master: 70
    };
    
    // ============================================
    // ROUTING
    // ============================================
    this.setupRouting();
    this.recreateCabinet();
    this.applyInitialSettings();
  }
  
  setupRouting() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // SIGNAL PATH (Vibro-King signal chain)
    // ============================================
    // Input → Gate → HPF → Preamp cascade
    this.input.connect(this.noiseGate);
    this.noiseGate.connect(this.inputHPF);
    this.inputHPF.connect(this.preamp1);
    
    // Stage 1
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.couplingCap1);
    
    // Stage 2
    this.couplingCap1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.couplingCap2);
    
    // Stage 3
    this.couplingCap2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Volume control with bright cap
    this.saturation3.connect(this.volume);
    this.volume.connect(this.brightCap);
    
    // Tone stack
    this.brightCap.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.sparkle);
    
    // ============================================
    // HARMONIC VIBRATO (Split-band tremolo) - BEFORE REVERB
    // ============================================
    // Split into low and high bands
    this.sparkle.connect(this.lowBand);
    this.sparkle.connect(this.highBand);
    
    this.lowBand.connect(this.harmLoGain);
    this.highBand.connect(this.harmHiGain);
    
    // Mix bands back together
    this.harmLoGain.connect(this.harmMix);
    this.harmHiGain.connect(this.harmMix);
    
    // ============================================
    // REVERB BEFORE POWER AMP (like real Vibro-King)
    // ============================================
    // Send to reverb with predelay
    this.harmMix.connect(this.reverbDwell);
    this.reverbDwell.connect(this.reverbPreDelay);
    this.reverbPreDelay.connect(this.reverbHPF);
    this.reverbHPF.connect(this.spring1);
    this.reverbHPF.connect(this.spring2);
    this.reverbHPF.connect(this.spring3);
    this.reverbHPF.connect(this.spring4);
    this.reverbHPF.connect(this.spring5);
    this.reverbHPF.connect(this.spring6);
    
    // Mix dry + wet BEFORE power amp
    this.harmMix.connect(this.reverbSum); // Dry
    this.reverbTilt.connect(this.reverbSum); // Wet (through tilt EQ)
    
    // ============================================
    // TREMOLO (Amplitude Modulation) - AFTER REVERB
    // ============================================
    // Tremolo is applied AFTER reverb in Vibro-King
    this.reverbSum.connect(this.tremoloGain);
    
    // Anti-pump HPF after tremolo
    this.tremoloGain.connect(this.postTremHPF);
    
    // Power section with sag
    if (this.powerSag) {
      this.postTremHPF.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.postTremHPF.connect(this.powerAmp);
    }
    
    // Connect reverb mix to tilt EQ
    this.reverbMix.disconnect();
    this.springResonance.disconnect();
    this.springResonance.connect(this.reverbTilt);
    this.reverbTilt.connect(this.reverbMix);
    
    // Power amp saturation and compression
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    
    // Presence control
    this.powerComp.connect(this.presence);
    
    // Output transformer
    this.presence.connect(this.transformerSat);
    this.transformerSat.connect(this.transformerLPF);
    this.transformerLPF.connect(this.transformerHPF);
    this.transformerHPF.connect(this.dcBlock);
    
    // Cabinet routing with CabinetSimulator
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    
    // Post-cabinet bite → Master → Safety Limiter → Output
    this.postCabinet.connect(this.postCabBite);
    this.postCabBite.connect(this.master);
    this.master.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.couplingCap2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.lowBand.disconnect();
      this.highBand.disconnect();
      this.harmLoGain.disconnect();
      this.harmHiGain.disconnect();
      this.harmMix.disconnect();
      this.reverbDwell.disconnect();
      this.reverbPreDelay.disconnect();
      this.reverbHPF.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.spring4.disconnect();
      this.spring5.disconnect();
      this.spring6.disconnect();
      this.reverbLPF.disconnect();
      this.reverbAllpass1.disconnect();
      this.reverbAllpass2.disconnect();
      this.springResonance.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.reverbSum.disconnect();
      this.tremoloGain.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.presence.disconnect();
      this.transformerSat.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.postCabBite.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (3x 12AX7 - Fender cascade)
    // ============================================
    this.preamp1.gain.value = 2.2; // First stage higher than typical Fender
    this.preamp2.gain.value = 1.8; // Second stage moderate
    this.preamp3.gain.value = 1.5; // Third stage caps it
    
    // ============================================
    // VOLUME
    // ============================================
    this.volume.gain.value = 0.65;
    this.updateBrightCapGain(); // Set initial bright cap
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass.gain.value = 0.5; // Slight bass boost (Vibro-King character)
    this.mid.gain.value = -1.5; // Slight scoop
    this.treble.gain.value = 1.5; // Slight treble boost
    
    // ============================================
    // POWER AMP (3x 6L6)
    // ============================================
    this.powerAmp.gain.value = 1.15; // Good headroom
    
    // ============================================
    // REVERB
    // ============================================
    this.reverbDwell.gain.value = 0.35; // Send amount
    this.reverbMix.gain.value = 0.55; // Return amount (lush!)
    
    // ============================================
    // MASTER (logarithmic curve for better control)
    // ============================================
    const log01 = v => 0.001 * Math.pow(1000, v);
    this.master.gain.value = log01(0.7);
  }
  
  // Helper function: Bright cap gain depends on volume (more at low volume)
  brightDbFor(volumePercent) {
    // Vibro-King bright cap curve
    const t = volumePercent / 100;
    // Smooth easing curve
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return (1 - eased) * 7.0; // Up to +7dB (Vibro-King has strong bright cap)
  }
  
  updateBrightCapGain() {
    const now = this.audioContext.currentTime;
    let brightGain = this.brightSwitch ? this.brightDbFor(this._currentVolume) : 0;
    
    // Freio nos volumes mais altos (pra não ficar vidrado em single-coil quente)
    const t = (this._currentVolume || 0) / 100;
    const cap = 7.0 - (t * 3.0); // de +7 dB caindo até +4 dB
    brightGain = Math.min(brightGain, cap);
    
    this.brightCap.gain.setTargetAtTime(brightGain, now, 0.02);
  }
  
  makeLampThrobCurve() {
    // Photo-cell lamp throb characteristic (non-linear optical tremolo)
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 2 - 1; // -1 to 1
      // Lamp-like curve (more "lampada" feel)
      curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.7);
    }
    return curve;
  }
  
  makeVibroKingPreampCurve({stage = 1} = {}) {
    // Vibro-King preamp tubes - pristine clean with subtle compression
    const n = 65536; // High resolution for smooth transients
    const curve = new Float32Array(n);
    
    // Stage-dependent characteristics
    const drive = stage === 1 ? 1.3 : stage === 2 ? 1.5 : 1.7;
    const asym = 1.02 + (stage * 0.01); // Subtle asymmetry increases per stage
    
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // FENDER BLACKFACE CLEAN CHARACTER
      let y = Math.tanh(x * drive);
      
      // Subtle sparkle (even-order harmonics)
      y += 0.05 * Math.tanh(x * 4.5);
      
      // Very gentle compression (Vibro-King stays clean)
      if (Math.abs(y) > 0.60) {
        const excess = Math.abs(y) - 0.60;
        y *= (1 - excess * 0.22);
      }
      
      // Sweet even harmonics
      y += 0.08 * Math.sin(x * Math.PI * 2);
      y += 0.04 * Math.sin(x * Math.PI * 4);
      
      // Subtle asymmetry (Fender character)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.90;
    }
    return curve;
  }
  
  makeVibroKing6L6Curve() {
    // 3x 6L6 tubes (Class AB, 60W) - Pristine clean with sweet harmonics
    const n = 65536; // High resolution for smooth transients
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // 6L6 Class AB characteristic (Vibro-King clean power)
      let y = Math.tanh(x * 1.25);
      
      // 6L6 sweetness - gentle harmonics
      y += 0.08 * Math.tanh(x * 3.2);
      
      // 6L6 harmonics - pristine clean texture
      y += 0.06 * Math.sin(x * Math.PI * 3);
      y += 0.04 * Math.sin(x * Math.PI * 5);
      
      // Very gentle clipping (musical clean breakup)
      if (Math.abs(y) > 0.68) {
        const excess = Math.abs(y) - 0.68;
        y = Math.sign(y) * (0.68 + excess * 0.48);
      }
      
      // 6L6 asymmetry (Class AB push-pull)
      if (x > 0) y *= 1.08;
      
      // Fender warmth
      y += 0.05 * Math.sin(x * Math.PI * 2);
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makeTransformerCurve() {
    // Large output transformer - pristine with subtle warmth
    const n = 8192; // Lower resolution is fine for transformer
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // Transformer saturation (very subtle for clean amp)
      let y = Math.tanh(x * 1.05);
      
      // Core saturation (adds warmth at extremes)
      if (Math.abs(y) > 0.78) {
        const excess = Math.abs(y) - 0.78;
        y = Math.sign(y) * (0.78 + excess * 0.85);
      }
      
      // Transformer harmonics (very subtle)
      y += 0.03 * Math.sin(x * Math.PI * 2);
      
      curve[i] = y * 0.99;
    }
    return curve;
  }
  
  // ============================================
  // CABINET SIMULATOR
  // ============================================
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
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // VOLUME CONTROL (also affects bright cap gain)
      // ============================================
      case 'volume':
      case 'gain': {
        this._currentVolume = value;
        const t = value / 100;
        
        // Logarithmic taper for natural volume control
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.volume.gain.setTargetAtTime(log01(t), now, 0.01);
        
        // Distribute volume change across preamp stages for natural breakup
        this.preamp1.gain.setTargetAtTime(2.2 * (1 + 0.5 * t), now, 0.02);
        this.preamp2.gain.setTargetAtTime(1.8 * (1 + 0.4 * t), now, 0.02);
        this.preamp3.gain.setTargetAtTime(1.5 * (1 + 0.3 * t), now, 0.02);
        
        // Update bright cap gain based on new volume
        this.updateBrightCapGain();
        
        // Power amp push at high volume (Vibro-King character)
        const powerGain = 1.15 + (t * 0.12); // 1.15 → 1.27
        this.powerAmp.gain.setTargetAtTime(powerGain, now, 0.02);
        break;
      }
      
      // ============================================
      // BRIGHT SWITCH
      // ============================================
      case 'bright': {
        this.brightSwitch = !!value;
        this.updateBrightCapGain();
        break;
      }
      
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass': {
        // -5dB to +5dB
        const bassGain = (value - 50) / 10;
        this.bass.gain.setTargetAtTime(bassGain, now, 0.01);
        break;
      }
      
      case 'mid': {
        // -5dB to +5dB (centered on slight scoop)
        const midGain = (value - 50) / 10;
        this.mid.gain.setTargetAtTime(midGain, now, 0.01);
        break;
      }
      
      case 'treble': {
        // -5dB to +5dB
        const trebleGain = (value - 50) / 10;
        this.treble.gain.setTargetAtTime(trebleGain, now, 0.01);
        
        // Treble also affects sparkle (Vibro-King interaction)
        const sparkleGain = 1.8 + (value / 100) * 0.8; // 1.8 → 2.6 dB
        this.sparkle.gain.setTargetAtTime(sparkleGain, now, 0.02);
        
        // Dynamic sparkle Q and freq (mais "vidro Fender sem aspereza")
        const sparkleQ = value > 70 ? 1.8 : 2.2; // Suaviza Q em trebles altos
        this.sparkle.Q.setTargetAtTime(sparkleQ, now, 0.02);
        
        // Leve shift de freq com treble alto (mais "ar" e menos mordida)
        const spFreq = value > 70 ? 4000 : 3800;
        this.sparkle.frequency.setTargetAtTime(spFreq, now, 0.02);
        break;
      }
      
      // ============================================
      // REVERB
      // ============================================
      case 'reverb': {
        const wet = value / 100;
        this.reverbMix.gain.setTargetAtTime(wet, now, 0.01);
        
        // Tilt dinâmico no retorno: mais brilho em níveis baixos, menos em altos
        const tilt = (1 - wet) * 2.0 - wet * 1.0; // +2dB no wet baixo, -1dB no alto
        this.reverbTilt.gain.setTargetAtTime(tilt, now, 0.05);
        break;
      }
      
      case 'reverb_dwell': {
        // Dwell controls feedback (decay time)
        const feedbackGain = 0.3 + (value / 100) * 0.3; // 0.3 → 0.6
        this.reverbFeedback.gain.setTargetAtTime(feedbackGain, now, 0.02);
        break;
      }
      
      // ============================================
      // TREMOLO (Amplitude Modulation)
      // ============================================
      case 'tremolo_speed': {
        // 1 Hz to 12 Hz (typical optical tremolo range)
        const speed = 1.0 + (value / 100) * 11.0;
        this.tremoloLFO.frequency.setTargetAtTime(speed, now, 0.02);
        break;
      }
      
      case 'tremolo_intensity':
      case 'tremolo_depth': {
        // AM tremolo depth - up to ~60%
        this.tremoloDepthControl.gain.setTargetAtTime((value / 100) * 0.6, now, 0.02);
        break;
      }
      
      // ============================================
      // HARMONIC VIBRATO (Split-band tremolo)
      // ============================================
      case 'vibrato_speed': {
        // 1 Hz to 12 Hz (same range as tremolo)
        const speed = 1.0 + (value / 100) * 11.0;
        this.harmLFO.frequency.setTargetAtTime(speed, now, 0.02);
        // Sync with tremolo if both active
        break;
      }
      
      case 'vibrato_intensity':
      case 'vibrato_depth': {
        // Harmonic vibrato depth (psychoacoustic pitch effect)
        // Value 0-100 maps to 0-0.5 depth (max 50% modulation per band)
        const depth = (value / 100) * 0.5;
        
        // +depth na banda baixa, -depth na banda alta (ou vice-versa)
        this.harmDepthLo.gain.setTargetAtTime(depth, now, 0.02);
        this.harmDepthHi.gain.setTargetAtTime(-depth, now, 0.02); // Inverted polarity
        break;
      }
      
      // ============================================
      // PRESENCE CONTROL (NFB-like)
      // ============================================
      case 'presence': {
        // -6dB to +6dB
        const pr = (value - 50) / 50; // -1..+1
        const presenceGain = pr * 6;
        this.presence.gain.setTargetAtTime(presenceGain, now, 0.01);
        
        // NFB-like: modula Q do transformer LPF (abre o pico quando presence sobe)
        const q = 1.2 + (pr * 0.2); // 1.0 a 1.4
        this.transformerLPF.Q.setTargetAtTime(q, now, 0.02);
        
        // Presence also affects post-cabinet bite (Vibro-King character)
        const biteGain = 1.8 + (value / 100) * 0.6; // 1.8 → 2.4 dB
        this.postCabBite.gain.setTargetAtTime(biteGain, now, 0.02);
        break;
      }
      
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
      
      // ============================================
      // MASTER (logarithmic curve)
      // ============================================
      case 'master': {
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.master.gain.setTargetAtTime(log01(value / 100), now, 0.01);
        break;
      }
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    try {
      // Stop oscillators
      this.tremoloLFO.stop();
      this.harmLFO.stop();
      
      // Disconnect all nodes
      this.noiseGate.disconnect();
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.couplingCap2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.lowBand.disconnect();
      this.highBand.disconnect();
      this.harmLoGain.disconnect();
      this.harmHiGain.disconnect();
      this.harmDepthLo.disconnect();
      this.harmDepthHi.disconnect();
      this.harmLFO.disconnect();
      this.harmMix.disconnect();
      this.reverbDwell.disconnect();
      this.reverbPreDelay.disconnect();
      this.reverbHPF.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.spring4.disconnect();
      this.spring5.disconnect();
      this.spring6.disconnect();
      this.reverbLPF.disconnect();
      this.reverbAllpass1.disconnect();
      this.reverbAllpass2.disconnect();
      this.springResonance.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.reverbTilt.disconnect();
      this.reverbSum.disconnect();
      this.tremShaper.disconnect();
      this.tremoloLFO.disconnect();
      this.tremoloDepthControl.disconnect();
      this.tremoloGain.disconnect();
      this.postTremHPF.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.presence.disconnect();
      this.transformerSat.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      
      // Cleanup cabinet
      if (this.cabinet) {
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      }
      
      this.postCabinet.disconnect();
      this.postCabBite.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Some nodes may not be connected
    }
  }
}

export default FenderVibroKingAmp;

