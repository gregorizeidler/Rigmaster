import IRLoader from '../IRLoader';

/**
 * CabinetSimulator v3.1 - Professional Physics-Based Cabinet Simulator
 * 
 * Features:
 * ✅ Single/Dual/IR modes
 * ✅ Visual mic positioning (distance 0-50cm, angle 0-90°, height -1/0/+1)
 * ✅ Physics-based modeling:
 *    - Time-of-flight delay (phase accuracy)
 *    - Proximity effect (exponential decay)
 *    - Off-axis comb filtering (notch filter)
 *    - Cone breakup (speaker irregularities)
 *    - Air absorption (distance-dependent lowpass)
 *    - Height affects presence frequency & notch
 * ✅ Dual cabinet blending with micro-delay
 * ✅ Equal-power crossfade with safe correlation
 * ✅ Stereo spread control
 * ✅ Phase inversion
 * ✅ Dry/Wet mixing (parallel blend)
 * ✅ Room ambience (optional short reverb)
 * ✅ Output compression + soft limiter + trim
 * ✅ Real dB values throughout
 * ✅ Smooth parameter transitions (no clicks)
 * ✅ Parameter update without node rebuild (CPU efficient)
 * ✅ IR normalization and latency compensation
 */

class CabinetSimulator {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Smoothing time constant (seconds)
    this.SMOOTH_TIME = 0.03;
    
    // Update throttle (ms) - prevents excessive CPU on UI sliders
    this.UPDATE_THROTTLE_MS = 16;  // ~60 Hz
    this.lastUpdateTime = { A: 0, B: 0 };
    
    // Utility functions
    this.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    
    // =========================================================
    // HELPER: Smooth parameter changes with automation cancel
    // Prevents "fila" of automations when user moves sliders frantically
    // =========================================================
    this._setSmooth = (param, value, timeConstant = this.SMOOTH_TIME) => {
      if (!param || typeof param.setTargetAtTime !== 'function') return;
      const now = this.audioContext.currentTime;
      try {
        // Cancel any scheduled automations to prevent queuing
        if (typeof param.cancelAndHoldAtTime === 'function') {
          param.cancelAndHoldAtTime(now);
        }
      } catch (e) {
        // cancelAndHoldAtTime not supported in older browsers
      }
      param.setTargetAtTime(value, now, timeConstant);
    };
    
    // =========================================================
    // HELPER: Create StereoPanner with fallback for old Safari
    // =========================================================
    this._createStereoPanner = () => {
      if (typeof audioContext.createStereoPanner === 'function') {
        return audioContext.createStereoPanner();
      } else {
        // Fallback to PannerNode for old Safari
        const panner = audioContext.createPanner();
        panner.panningModel = 'equalpower';
        let _val = 0;
        const apply = (v) => {
          const x = Math.max(-1, Math.min(1, v));
          // Map x ∈ [-1,1] → position on front semicircle
          panner.setPosition(x, 0, 1 - Math.abs(x));
        };
        // Reactive pan property with getter/setter
        panner.pan = {
          get value() { return _val; },
          set value(v) { _val = v; apply(v); },
          setTargetAtTime: (v/*, t, k*/) => { _val = v; apply(v); }
        };
        apply(0);
        return panner;
      }
    };
    
    // =========================================================
    // CABINET TYPES (8 authentic models)
    // =========================================================
    this.cabinets = {
      '1x12_open': {
        name: '1x12" Open Back',
        description: 'Fender-style combo, warm and open',
        resonanceFreq: 100,
        resonanceQ: 2.5,
        resonanceGain: 3,  // dB
        lowpassFreq: 4800,
        lowpassQ: 0.8,
        breakupPeaks: [
          { freq: 2800, gain: 2, Q: 1.2 },
          { freq: 4200, gain: -1.5, Q: 0.8 }
        ]
      },
      '1x12_closed': {
        name: '1x12" Closed Back',
        description: 'Tight, focused single speaker',
        resonanceFreq: 120,
        resonanceQ: 3.0,
        resonanceGain: 4,
        lowpassFreq: 4500,
        lowpassQ: 1.0,
        breakupPeaks: [
          { freq: 3000, gain: 2.5, Q: 1.3 },
          { freq: 4500, gain: -2, Q: 0.9 }
        ]
      },
      '2x12_open': {
        name: '2x12" Open Back',
        description: 'Vox AC30 style, rich and full',
        resonanceFreq: 90,
        resonanceQ: 2.0,
        resonanceGain: 2.5,
        lowpassFreq: 5000,
        lowpassQ: 0.7,
        breakupPeaks: [
          { freq: 2500, gain: 1.5, Q: 1.0 },
          { freq: 4000, gain: 2, Q: 1.1 }
        ]
      },
      '2x12_closed': {
        name: '2x12" Closed Back',
        description: 'Marshall-style, punchy mids',
        resonanceFreq: 110,
        resonanceQ: 2.8,
        resonanceGain: 3.5,
        lowpassFreq: 4700,
        lowpassQ: 0.9,
        breakupPeaks: [
          { freq: 2700, gain: 2, Q: 1.2 },
          { freq: 4300, gain: -1.8, Q: 0.85 }
        ]
      },
      '4x12_vintage': {
        name: '4x12" Vintage 30',
        description: 'Classic Marshall stack, aggressive',
        resonanceFreq: 80,
        resonanceQ: 3.5,
        resonanceGain: 5,
        lowpassFreq: 5200,
        lowpassQ: 1.2,
        breakupPeaks: [
          { freq: 2200, gain: 3, Q: 1.4 },
          { freq: 4800, gain: 2.5, Q: 1.0 },
          { freq: 6000, gain: -2, Q: 0.7 }
        ]
      },
      '4x12_greenback': {
        name: '4x12" Greenback',
        description: 'Warm vintage British tone',
        resonanceFreq: 75,
        resonanceQ: 3.0,
        resonanceGain: 4.5,
        lowpassFreq: 4200,
        lowpassQ: 1.1,
        breakupPeaks: [
          { freq: 2400, gain: 2, Q: 1.1 },
          { freq: 3800, gain: 1.5, Q: 0.9 },
          { freq: 5200, gain: -3, Q: 1.0 }
        ]
      },
      '1x10_tweed': {
        name: '1x10" Tweed',
        description: 'Vintage Fender, bright and snappy',
        resonanceFreq: 140,
        resonanceQ: 2.0,
        resonanceGain: 2,
        lowpassFreq: 5500,
        lowpassQ: 0.6,
        breakupPeaks: [
          { freq: 3200, gain: 3, Q: 1.3 },
          { freq: 5000, gain: 2, Q: 0.8 }
        ]
      },
      '4x10_bassman': {
        name: '4x10" Bassman',
        description: 'Full range, clean headroom',
        resonanceFreq: 95,
        resonanceQ: 2.2,
        resonanceGain: 3,
        lowpassFreq: 6000,
        lowpassQ: 0.5,
        breakupPeaks: [
          { freq: 2600, gain: 1.5, Q: 1.0 },
          { freq: 4500, gain: 2, Q: 0.9 }
        ]
      }
    };
    
    // =========================================================
    // MICROPHONE TYPES (6 professional models)
    // =========================================================
    this.microphones = {
      'sm57': {
        name: 'Shure SM57',
        description: 'Industry standard dynamic, bright',
        presenceBoost: 5,  // dB
        presenceFreq: 5000,
        presenceQ: 1.5,
        proximityBoost: 12,  // max dB
        proximityDecay: 0.05,  // meters (decay constant)
        proximityFreq: 200,
        highpass: 80,
        lowpass: 15000
      },
      'sm7b': {
        name: 'Shure SM7B',
        description: 'Dynamic broadcast mic, full bodied',
        presenceBoost: 3,
        presenceFreq: 4000,
        presenceQ: 1.0,
        proximityBoost: 10,
        proximityDecay: 0.06,
        proximityFreq: 150,
        highpass: 70,
        lowpass: 18000
      },
      'royer121': {
        name: 'Royer R-121',
        description: 'Ribbon mic, smooth and dark',
        presenceBoost: -2,
        presenceFreq: 6000,
        presenceQ: 0.8,
        proximityBoost: 14,  // ribbons have strong proximity
        proximityDecay: 0.04,
        proximityFreq: 120,
        highpass: 60,
        lowpass: 12000
      },
      'u87': {
        name: 'Neumann U87',
        description: 'Large diaphragm condenser, detailed',
        presenceBoost: 4,
        presenceFreq: 8000,
        presenceQ: 1.2,
        proximityBoost: 6,  // condensers have less proximity
        proximityDecay: 0.08,
        proximityFreq: 180,
        highpass: 40,
        lowpass: 20000
      },
      'md421': {
        name: 'Sennheiser MD421',
        description: 'Dynamic, scooped mids',
        presenceBoost: 4.5,
        presenceFreq: 5500,
        presenceQ: 1.3,
        proximityBoost: 11,
        proximityDecay: 0.055,
        proximityFreq: 160,
        highpass: 75,
        lowpass: 17000
      },
      'e906': {
        name: 'Sennheiser e906',
        description: 'Modern dynamic, tight low end',
        presenceBoost: 5.5,
        presenceFreq: 4500,
        presenceQ: 1.4,
        proximityBoost: 9,
        proximityDecay: 0.07,
        proximityFreq: 190,
        highpass: 85,
        lowpass: 16000
      }
    };
    
    // =========================================================
    // IR LOADER
    // =========================================================
    this.irLoader = new IRLoader(audioContext);
    
    // =========================================================
    // CABINET A (primary)
    // =========================================================
    this.cabinetA = {
      type: '4x12_vintage',
      mic: 'sm57',
      distance: 3,  // cm (0-50)
      angle: 0,     // degrees (0-90)
      height: 0,    // -1 (low), 0 (center), 1 (high)
      filters: null
    };
    
    // =========================================================
    // CABINET B (secondary, for dual mode)
    // =========================================================
    this.cabinetB = {
      type: '4x12_greenback',
      mic: 'royer121',
      distance: 8,
      angle: 30,
      height: 0,
      filters: null
    };
    
    // =========================================================
    // ROUTING & MIXING
    // =========================================================
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    
    // Dry delay (aligns dry path with wet path to avoid comb filtering)
    this.dryDelay = audioContext.createDelay(0.05);
    this.dryDelay.delayTime.value = 0;
    
    // Cabinet gains (for dual mode)
    this.cabAGain = audioContext.createGain();
    this.cabBGain = audioContext.createGain();
    this.cabAGain.gain.value = 1.0;
    this.cabBGain.gain.value = 0.0;
    
    // Stereo spread (pan) - with fallback for old Safari
    this.panA = this._createStereoPanner();
    this.panB = this._createStereoPanner();
    this.panA.pan.value = -0.3;  // slight left
    this.panB.pan.value = 0.3;   // slight right
    
    // Phase inverter for Cabinet B (polarity flip)
    this.phaseInverter = audioContext.createGain();
    this.phaseInverter.gain.value = 1;  // 1 = normal, -1 = inverted
    
    // Micro-delay for Cabinet B (stereo width enhancement)
    this.dualSkew = audioContext.createDelay(0.002);
    this.dualSkew.delayTime.value = 0.0006;  // 0.6ms default
    
    // Master output processing
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -8;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 2;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.2;
    
    // Soft limiter (prevents clipping on preset changes)
    this.limiter = this.createSoftLimiter(3.0);
    
    this.outputTrim = audioContext.createGain();
    this.outputTrim.gain.value = 0.5;  // -6 dB headroom
    
    // Dry/Wet mixing (parallel blend)
    this.mixDry = audioContext.createGain();
    this.mixWet = audioContext.createGain();
    this.mixDry.gain.value = 0;    // 0% dry (100% wet default)
    this.mixWet.gain.value = 1;    // 100% wet
    
    // Room ambience (optional short reverb)
    this.roomEnabled = false;
    this.roomGain = audioContext.createGain();
    this.roomGain.gain.value = 0.15;  // 15% room mix
    this.roomDelay = audioContext.createDelay(0.1);
    this.roomDelay.delayTime.value = 0.023;  // 23ms (small room)
    this.roomFeedback = audioContext.createGain();
    this.roomFeedback.gain.value = 0.25;  // subtle feedback
    this.roomLP = audioContext.createBiquadFilter();
    this.roomLP.type = 'lowpass';
    this.roomLP.frequency.value = 4000;  // dark room
    this.roomLP.Q.value = 0.707;
    
    // Room routing (feedback loop)
    this.roomDelay.connect(this.roomLP);
    this.roomLP.connect(this.roomFeedback);
    this.roomFeedback.connect(this.roomDelay);
    
    // Mode: 'single', 'dual', 'ir'
    this.mode = 'single';
    
    // =========================================================
    // INITIALIZE
    // =========================================================
    this.initializeSingleMode();
  }
  
  // =========================================================
  // SOFT LIMITER (prevents harsh clipping)
  // =========================================================
  createSoftLimiter(k = 3.0) {
    const curve = new Float32Array(65536);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x);
    }
    const limiter = this.audioContext.createWaveShaper();
    limiter.curve = curve;
    limiter.oversample = '4x';
    return limiter;
  }
  
  // =========================================================
  // CREATE CABINET FILTER CHAIN (Physics-Based)
  // =========================================================
  createCabinetFilters(cabinetType, micType, distance, angle, height = 0) {
    const cabinet = this.cabinets[cabinetType];
    const mic = this.microphones[micType];
    
    if (!cabinet || !mic) {
      console.error('Invalid cabinet or mic type');
      return null;
    }
    
    const now = this.audioContext.currentTime;
    const distanceM = this.clamp(distance, 0, 50) / 100;  // cm to meters
    const angleDeg = this.clamp(angle, 0, 90);
    const angleRad = (angleDeg * Math.PI) / 180;
    const heightNorm = this.clamp(height, -1, 1);  // -1 (low), 0 (center), 1 (high)
    
    const f = {
      input: this.audioContext.createGain(),
      output: this.audioContext.createGain(),
      
      // Stage 1: Cabinet rumble HPF (removes sub-bass)
      cabHP: this.audioContext.createBiquadFilter(),
      
      // Stage 2: Cabinet resonance (cone resonance peak)
      resonance: this.audioContext.createBiquadFilter(),
      
      // Stage 3: Cone breakup peaks (2-6 kHz irregularities)
      breakup1: null,
      breakup2: null,
      breakup3: null,
      
      // Stage 4: Cabinet lowpass (speaker physical limit)
      cabinetLP: this.audioContext.createBiquadFilter(),
      
      // Stage 5: Mic highpass (DC removal)
      micHP: this.audioContext.createBiquadFilter(),
      
      // Stage 6: Proximity effect (bass boost from distance)
      proximity: this.audioContext.createBiquadFilter(),
      
      // Stage 7: Mic presence peak
      presence: this.audioContext.createBiquadFilter(),
      
      // Stage 8: Off-axis notch (comb filtering)
      offAxisNotch: null,
      
      // Stage 9: Mic lowpass (HF rolloff)
      micLP: this.audioContext.createBiquadFilter(),
      
      // Stage 10: Air absorption (distance-dependent)
      airLoss: this.audioContext.createBiquadFilter(),
      
      // Stage 11: Time-of-flight delay (phase accuracy!)
      timeOfFlight: this.audioContext.createDelay(0.05)
    };
    
    // ====== STAGE 1: CABINET RUMBLE HPF ======
    f.cabHP.type = 'highpass';
    f.cabHP.frequency.setTargetAtTime(65, now, this.SMOOTH_TIME);
    f.cabHP.Q.setTargetAtTime(0.707, now, this.SMOOTH_TIME);
    
    // ====== STAGE 2: CABINET RESONANCE ======
    f.resonance.type = 'peaking';
    f.resonance.frequency.setTargetAtTime(cabinet.resonanceFreq, now, this.SMOOTH_TIME);
    f.resonance.Q.setTargetAtTime(cabinet.resonanceQ, now, this.SMOOTH_TIME);
    f.resonance.gain.setTargetAtTime(cabinet.resonanceGain, now, this.SMOOTH_TIME);
    
    // ====== STAGE 3: CONE BREAKUP ======
    cabinet.breakupPeaks.forEach((peak, idx) => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.setTargetAtTime(
        this.clamp(peak.freq, 100, 10000), 
        now, 
        this.SMOOTH_TIME
      );
      filter.Q.setTargetAtTime(peak.Q, now, this.SMOOTH_TIME);
      filter.gain.setTargetAtTime(peak.gain, now, this.SMOOTH_TIME);
      
      if (idx === 0) f.breakup1 = filter;
      else if (idx === 1) f.breakup2 = filter;
      else if (idx === 2) f.breakup3 = filter;
    });
    
    // ====== STAGE 4: CABINET LOWPASS ======
    // Frequency decreases slightly with distance (less bite far away)
    const cabLPFreq = cabinet.lowpassFreq * (1 - 0.1 * Math.min(distanceM * 2, 1));
    f.cabinetLP.type = 'lowpass';
    f.cabinetLP.frequency.setTargetAtTime(
      this.clamp(cabLPFreq, cabinet.lowpassFreq * 0.9, cabinet.lowpassFreq), 
      now, 
      this.SMOOTH_TIME
    );
    f.cabinetLP.Q.setTargetAtTime(cabinet.lowpassQ, now, this.SMOOTH_TIME);
    
    // ====== STAGE 5: MIC HIGHPASS ======
    f.micHP.type = 'highpass';
    f.micHP.frequency.setTargetAtTime(mic.highpass, now, this.SMOOTH_TIME);
    f.micHP.Q.setTargetAtTime(0.707, now, this.SMOOTH_TIME);
    
    // ====== STAGE 6: PROXIMITY EFFECT (exponential decay) ======
    const proxDb = Math.max(
      0,
      mic.proximityBoost * Math.exp(-distanceM / mic.proximityDecay)
    );
    // Proximity frequency decreases slightly with distance (less focus)
    const proxFreq = mic.proximityFreq * (1 - 0.2 * distanceM);
    f.proximity.type = 'lowshelf';
    f.proximity.frequency.setTargetAtTime(
      this.clamp(proxFreq, 80, mic.proximityFreq), 
      now, 
      this.SMOOTH_TIME
    );
    f.proximity.gain.setTargetAtTime(
      this.clamp(proxDb, 0, mic.proximityBoost), 
      now, 
      this.SMOOTH_TIME
    );
    
    // ====== STAGE 7: MIC PRESENCE (cosine curve for angle + height shift) ======
    const presenceGainDb = mic.presenceBoost * Math.cos(angleRad);
    // Height affects presence frequency: higher = more cone, lower = more cabinet edge
    const heightMul = 1 + 0.12 * heightNorm;  // ±12% frequency shift
    const presenceFreqAdjusted = mic.presenceFreq * heightMul;
    // Q increases slightly with angle (more focused off-axis resonance)
    const presenceQAdjusted = mic.presenceQ * (1 + 0.3 * (angleDeg / 90));
    
    f.presence.type = 'peaking';
    f.presence.frequency.setTargetAtTime(
      this.clamp(presenceFreqAdjusted, 1500, 12000), 
      now, 
      this.SMOOTH_TIME
    );
    f.presence.Q.setTargetAtTime(presenceQAdjusted, now, this.SMOOTH_TIME);
    f.presence.gain.setTargetAtTime(
      this.clamp(presenceGainDb, -6, 6), 
      now, 
      this.SMOOTH_TIME
    );
    
    // ====== STAGE 8: OFF-AXIS NOTCH (always present, bypassed via params) ======
    f.offAxisNotch = this.audioContext.createBiquadFilter();
    f.offAxisNotch.type = 'notch';
    const notchBase = 3500 + 1500 * (angleDeg / 90);  // 3.5-5 kHz
    const notchShift = 1 + 0.15 * heightNorm;  // ±15% shift
    const notchHz = this.clamp(notchBase * notchShift, 2000, 9000);
    const notchQ = 1.0 + 0.6 * (angleDeg / 90);
    const enabled = angleDeg > 10;
    f.offAxisNotch.frequency.setTargetAtTime(
      enabled ? notchHz : 20000, 
      now, 
      this.SMOOTH_TIME
    );
    f.offAxisNotch.Q.setTargetAtTime(
      enabled ? notchQ : 0.1, 
      now, 
      this.SMOOTH_TIME
    );
    
    // ====== STAGE 9: MIC LOWPASS ======
    f.micLP.type = 'lowpass';
    f.micLP.frequency.setTargetAtTime(mic.lowpass, now, this.SMOOTH_TIME);
    f.micLP.Q.setTargetAtTime(0.707, now, this.SMOOTH_TIME);
    
    // ====== STAGE 10: AIR ABSORPTION (distance-dependent lowpass) ======
    const fAir = 20000 / (1 + distanceM * 25);
    f.airLoss.type = 'lowpass';
    f.airLoss.frequency.setTargetAtTime(
      this.clamp(Math.max(6000, fAir), 6000, 20000), 
      now, 
      this.SMOOTH_TIME
    );
    f.airLoss.Q.setTargetAtTime(0.707, now, this.SMOOTH_TIME);
    
    // ====== STAGE 11: TIME-OF-FLIGHT DELAY (phase accuracy!) ======
    const delaySec = distanceM / 343;  // speed of sound ~343 m/s
    f.timeOfFlight.delayTime.setTargetAtTime(
      this.clamp(delaySec, 0, 0.05), 
      now, 
      this.SMOOTH_TIME
    );
    
    // =========================================================
    // ROUTING (optimized signal flow)
    // =========================================================
    let currentNode = f.input;
    
    // Cabinet processing
    currentNode.connect(f.cabHP);
    currentNode = f.cabHP;
    
    currentNode.connect(f.resonance);
    currentNode = f.resonance;
    
    // Cone breakup (only connect existing peaks)
    if (f.breakup1) {
      currentNode.connect(f.breakup1);
      currentNode = f.breakup1;
    }
    if (f.breakup2) {
      currentNode.connect(f.breakup2);
      currentNode = f.breakup2;
    }
    if (f.breakup3) {
      currentNode.connect(f.breakup3);
      currentNode = f.breakup3;
    }
    
    currentNode.connect(f.cabinetLP);
    currentNode = f.cabinetLP;
    
    // Microphone processing
    currentNode.connect(f.micHP);
    currentNode = f.micHP;
    
    currentNode.connect(f.proximity);
    currentNode = f.proximity;
    
    currentNode.connect(f.presence);
    currentNode = f.presence;
    
    // Off-axis notch (always present)
    currentNode.connect(f.offAxisNotch);
    currentNode = f.offAxisNotch;
    
    currentNode.connect(f.micLP);
    currentNode = f.micLP;
    
    // Distance and phase processing
    currentNode.connect(f.airLoss);
    currentNode = f.airLoss;
    
    currentNode.connect(f.timeOfFlight);
    currentNode = f.timeOfFlight;
    
    currentNode.connect(f.output);
    
    return f;
  }
  
  // =========================================================
  // UPDATE CABINET PARAMETERS (without rebuild - efficient!)
  // =========================================================
  updateCabinetParameters(cabinetLetter) {
    const cab = cabinetLetter === 'A' ? this.cabinetA : this.cabinetB;
    const cabData = this.cabinets[cab.type];
    const mic = this.microphones[cab.mic];
    const f = cab.filters;
    
    if (!f || !cabData || !mic) return;
    
    const now = this.audioContext.currentTime;
    const distanceM = this.clamp(cab.distance, 0, 50) / 100;
    const angleDeg = this.clamp(cab.angle, 0, 90);
    const angleRad = (angleDeg * Math.PI) / 180;
    const heightNorm = this.clamp(cab.height, -1, 1);
    
    // Update proximity effect (exponential decay)
    const proxDb = Math.max(0, mic.proximityBoost * Math.exp(-distanceM / mic.proximityDecay));
    const proxFreq = mic.proximityFreq * (1 - 0.2 * distanceM);
    this._setSmooth(f.proximity.frequency, this.clamp(proxFreq, 80, mic.proximityFreq));
    this._setSmooth(f.proximity.gain, this.clamp(proxDb, 0, mic.proximityBoost));
    
    // Update presence (cosine curve + height shift)
    const presenceGainDb = mic.presenceBoost * Math.cos(angleRad);
    const heightMul = 1 + 0.12 * heightNorm;
    const presenceFreqAdjusted = mic.presenceFreq * heightMul;
    const presenceQAdjusted = mic.presenceQ * (1 + 0.3 * (angleDeg / 90));
    this._setSmooth(f.presence.frequency, this.clamp(presenceFreqAdjusted, 1500, 12000));
    this._setSmooth(f.presence.Q, presenceQAdjusted);
    this._setSmooth(f.presence.gain, this.clamp(presenceGainDb, -6, 6));
    
    // Update off-axis notch (always present, bypassed via params)
    if (f.offAxisNotch) {
      const notchBase = 3500 + 1500 * (angleDeg / 90);
      const notchShift = 1 + 0.15 * heightNorm;
      const targetF = this.clamp(notchBase * notchShift, 2000, 9000);
      const targetQ = 1.0 + 0.6 * (angleDeg / 90);
      const enabled = angleDeg > 10;
      this._setSmooth(f.offAxisNotch.frequency, enabled ? targetF : 20000);
      this._setSmooth(f.offAxisNotch.Q, enabled ? targetQ : 0.1);
    }
    
    // Update air absorption (distance-dependent lowpass)
    const fAir = 20000 / (1 + distanceM * 25);
    this._setSmooth(f.airLoss.frequency, this.clamp(Math.max(6000, fAir), 6000, 20000));
    
    // Update time-of-flight delay (phase accuracy)
    const delaySec = distanceM / 343;
    this._setSmooth(f.timeOfFlight.delayTime, this.clamp(delaySec, 0, 0.05));
  }
  
  // =========================================================
  // MODE INITIALIZATION
  // =========================================================
  
  initializeSingleMode() {
    this.mode = 'single';
    this.disconnectAll();
    
    // Create Cabinet A filters
    this.cabinetA.filters = this.createCabinetFilters(
      this.cabinetA.type,
      this.cabinetA.mic,
      this.cabinetA.distance,
      this.cabinetA.angle,
      this.cabinetA.height
    );
    
    // Routing: Input → [Dry] + [Cabinet A → Comp → Limiter → Trim → Wet] → Output
    // Dry path (with alignment delay)
    this.input.connect(this.dryDelay);
    this.dryDelay.connect(this.mixDry);
    this.mixDry.connect(this.output);
    
    // Wet path
    this.input.connect(this.cabinetA.filters.input);
    this.cabinetA.filters.output.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.outputTrim);
    this.outputTrim.connect(this.mixWet);
    this.mixWet.connect(this.output);
    
    // Room (if enabled)
    if (this.roomEnabled) {
      this.outputTrim.connect(this.roomDelay);
      this.roomDelay.connect(this.roomGain);
      this.roomGain.connect(this.mixWet);
    }
    
    // Align dry delay to wet path
    this.alignDryToWet();
  }
  
  initializeDualMode() {
    this.mode = 'dual';
    this.disconnectAll();
    
    // Create filters for both cabinets
    this.cabinetA.filters = this.createCabinetFilters(
      this.cabinetA.type,
      this.cabinetA.mic,
      this.cabinetA.distance,
      this.cabinetA.angle,
      this.cabinetA.height
    );
    
    this.cabinetB.filters = this.createCabinetFilters(
      this.cabinetB.type,
      this.cabinetB.mic,
      this.cabinetB.distance,
      this.cabinetB.angle,
      this.cabinetB.height
    );
    
    // Routing:
    // Input → [Dry] + [Cabinet A+B → Comp → Limiter → Trim → Wet] → Output
    
    // Dry path (with alignment delay)
    this.input.connect(this.dryDelay);
    this.dryDelay.connect(this.mixDry);
    this.mixDry.connect(this.output);
    
    // Cabinet A path
    this.input.connect(this.cabinetA.filters.input);
    this.cabinetA.filters.output.connect(this.panA);
    this.panA.connect(this.cabAGain);
    this.cabAGain.connect(this.compressor);
    
    // Cabinet B path (with micro-delay and phase)
    this.input.connect(this.cabinetB.filters.input);
    this.cabinetB.filters.output.connect(this.dualSkew);
    this.dualSkew.connect(this.phaseInverter);
    this.phaseInverter.connect(this.panB);
    this.panB.connect(this.cabBGain);
    this.cabBGain.connect(this.compressor);
    
    // Master output with limiter
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.outputTrim);
    this.outputTrim.connect(this.mixWet);
    this.mixWet.connect(this.output);
    
    // Room (if enabled)
    if (this.roomEnabled) {
      this.outputTrim.connect(this.roomDelay);
      this.roomDelay.connect(this.roomGain);
      this.roomGain.connect(this.mixWet);
    }
    
    // Align dry delay to wet path
    this.alignDryToWet();
  }
  
  initializeIRMode() {
    this.mode = 'ir';
    this.disconnectAll();
    
    // Routing: Input → [Dry] + [IR → Comp → Limiter → Trim → Wet] → Output
    // Dry path (with alignment delay)
    this.input.connect(this.dryDelay);
    this.dryDelay.connect(this.mixDry);
    this.mixDry.connect(this.output);
    
    // Wet path
    this.input.connect(this.irLoader.input);
    this.irLoader.output.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.outputTrim);
    this.outputTrim.connect(this.mixWet);
    this.mixWet.connect(this.output);
    
    // Room (if enabled)
    if (this.roomEnabled) {
      this.outputTrim.connect(this.roomDelay);
      this.roomDelay.connect(this.roomGain);
      this.roomGain.connect(this.mixWet);
    }
    
    // Align dry delay to wet path
    this.alignDryToWet();
  }
  
  // =========================================================
  // PARAMETER UPDATES (with throttle for efficiency)
  // =========================================================
  
  updateCabinetA(forceRebuild = false) {
    if (this.mode === 'ir') return;
    
    // Throttle updates (unless forced rebuild)
    const now = Date.now();
    if (!forceRebuild && (now - this.lastUpdateTime.A) < this.UPDATE_THROTTLE_MS) {
      return;
    }
    this.lastUpdateTime.A = now;
    
    // If filters exist and no type change, just update parameters (efficient!)
    if (!forceRebuild && this.cabinetA.filters) {
      this.updateCabinetParameters('A');
      this.alignDryToWet();
      return;
    }
    
    // Otherwise, rebuild (for type/mic changes)
    const newFilters = this.createCabinetFilters(
      this.cabinetA.type,
      this.cabinetA.mic,
      this.cabinetA.distance,
      this.cabinetA.angle,
      this.cabinetA.height
    );
    
    // Disconnect old
    if (this.cabinetA.filters) {
      try { this.cabinetA.filters.input.disconnect(); } catch(e) {}
    }
    
    // Connect new
    this.cabinetA.filters = newFilters;
    
    if (this.mode === 'single') {
      this.input.connect(this.cabinetA.filters.input);
      this.cabinetA.filters.output.connect(this.compressor);
    } else if (this.mode === 'dual') {
      this.input.connect(this.cabinetA.filters.input);
      this.cabinetA.filters.output.connect(this.panA);
    }
    
    this.alignDryToWet();
  }
  
  updateCabinetB(forceRebuild = false) {
    if (this.mode !== 'dual') return;
    
    // Throttle updates
    const now = Date.now();
    if (!forceRebuild && (now - this.lastUpdateTime.B) < this.UPDATE_THROTTLE_MS) {
      return;
    }
    this.lastUpdateTime.B = now;
    
    // If filters exist and no type change, just update parameters
    if (!forceRebuild && this.cabinetB.filters) {
      this.updateCabinetParameters('B');
      this.alignDryToWet();
      return;
    }
    
    // Otherwise, rebuild
    const newFilters = this.createCabinetFilters(
      this.cabinetB.type,
      this.cabinetB.mic,
      this.cabinetB.distance,
      this.cabinetB.angle,
      this.cabinetB.height
    );
    
    // Disconnect old
    if (this.cabinetB.filters) {
      try { this.cabinetB.filters.input.disconnect(); } catch(e) {}
    }
    
    // Connect new
    this.cabinetB.filters = newFilters;
    this.input.connect(this.cabinetB.filters.input);
    this.cabinetB.filters.output.connect(this.dualSkew);
    
    this.alignDryToWet();
  }
  
  // =========================================================
  // CABINET A API
  // =========================================================
  
  setCabinetAType(type) {
    if (this.cabinets[type]) {
      this.cabinetA.type = type;
      this.updateCabinetA(true);  // force rebuild (cabinet type changed)
    }
  }
  
  setMicAType(micType) {
    if (this.microphones[micType]) {
      this.cabinetA.mic = micType;
      this.updateCabinetA(true);  // force rebuild (mic type changed)
    }
  }
  
  setMicPositionA(distance, angle, height = 0) {
    this.cabinetA.distance = this.clamp(distance, 0, 50);
    this.cabinetA.angle = this.clamp(angle, 0, 90);
    this.cabinetA.height = this.clamp(height, -1, 1);
    this.updateCabinetA();  // parameter update only (efficient!)
  }
  
  // =========================================================
  // CABINET B API
  // =========================================================
  
  setCabinetBType(type) {
    if (this.cabinets[type]) {
      this.cabinetB.type = type;
      this.updateCabinetB(true);  // force rebuild
    }
  }
  
  setMicBType(micType) {
    if (this.microphones[micType]) {
      this.cabinetB.mic = micType;
      this.updateCabinetB(true);  // force rebuild
    }
  }
  
  setMicPositionB(distance, angle, height = 0) {
    this.cabinetB.distance = this.clamp(distance, 0, 50);
    this.cabinetB.angle = this.clamp(angle, 0, 90);
    this.cabinetB.height = this.clamp(height, -1, 1);
    this.updateCabinetB();  // parameter update only
  }
  
  // =========================================================
  // DUAL MODE CONTROLS
  // =========================================================
  
  setDualMix(percentage) {
    if (this.mode !== 'dual') return;
    
    const mix = this.clamp(percentage, 0, 100) / 100;
    
    // Equal-power crossfade with smooth automation cancel
    this._setSmooth(this.cabAGain.gain, Math.cos(mix * Math.PI / 2));
    this._setSmooth(this.cabBGain.gain, Math.sin(mix * Math.PI / 2));
  }
  
  setStereoSpread(amount) {
    if (this.mode !== 'dual') return;
    
    const spread = this.clamp(amount, -100, 100) / 100;
    
    this._setSmooth(this.panA.pan, -spread);
    this._setSmooth(this.panB.pan, spread);
  }
  
  setPhaseB(inverted) {
    this._setSmooth(this.phaseInverter.gain, inverted ? -1 : 1);
  }
  
  setMicroDelayB(milliseconds) {
    // Safe range: 0.2-1.5ms (prevents excessive phase cancellation in mono)
    const delayMs = this.clamp(milliseconds, 0, 2);
    if (delayMs > 1.5) {
      console.warn('Micro-delay >1.5ms may cause phase issues in mono. Recommended: 0.2-1.5ms');
    }
    const delaySec = delayMs / 1000;
    this._setSmooth(this.dualSkew.delayTime, delaySec);
    
    // Realign dry/wet phase compensation when micro-delay changes
    this.alignDryToWet();
  }
  
  // =========================================================
  // GLOBAL CONTROLS
  // =========================================================
  
  setWet(percent) {
    const w = this.clamp(percent, 0, 100) / 100;
    
    // Equal-power fade with smooth automation cancel
    this._setSmooth(this.mixWet.gain, Math.sqrt(w));
    this._setSmooth(this.mixDry.gain, Math.sqrt(1 - w));
    
    // Realign dry/wet phase compensation (perceptible in parallel mix)
    this.alignDryToWet();
  }
  
  setOutputGainDb(db) {
    // Clamp to safe range to prevent preset explosions
    const safeDb = this.clamp(db, -60, +12);
    const g = Math.pow(10, safeDb / 20);
    this._setSmooth(this.outputTrim.gain, g);
  }
  
  setRoom(enabled, roomSize = 0.023, feedback = 0.25, tone = 4000, mix = 0.15) {
    this.roomEnabled = enabled;
    
    if (enabled) {
      const now = this.audioContext.currentTime;
      
      // Room size (delay time in seconds)
      this.roomDelay.delayTime.setTargetAtTime(
        this.clamp(roomSize, 0.01, 0.1),
        now,
        this.SMOOTH_TIME
      );
      
      // Feedback amount
      this.roomFeedback.gain.setTargetAtTime(
        this.clamp(feedback, 0, 0.5),
        now,
        this.SMOOTH_TIME
      );
      
      // Tone (lowpass frequency)
      this.roomLP.frequency.setTargetAtTime(
        this.clamp(tone, 1000, 8000),
        now,
        this.SMOOTH_TIME
      );
      
      // Mix amount
      this.roomGain.gain.setTargetAtTime(
        this.clamp(mix, 0, 0.5),
        now,
        this.SMOOTH_TIME
      );
      
      // Reconnect room in any mode
      try { this.outputTrim.disconnect(this.roomDelay); } catch(e) {}
      this.outputTrim.connect(this.roomDelay);
      this.roomDelay.connect(this.roomGain);
      this.roomGain.connect(this.mixWet);
    } else {
      // Disconnect room (break all loop connections)
      try { 
        this.outputTrim.disconnect(this.roomDelay);
        this.roomDelay.disconnect(this.roomGain);
        this.roomGain.disconnect(this.mixWet);
      } catch(e) {}
    }
  }
  
  // =========================================================
  // DRY/WET ALIGNMENT (avoids comb filtering in parallel mode)
  // =========================================================
  
  alignDryToWet() {
    let tof = 0;
    
    if (this.mode === 'single' && this.cabinetA.filters) {
      tof = this.cabinetA.filters.timeOfFlight.delayTime.value || 0;
    } else if (this.mode === 'dual' && this.cabinetA.filters && this.cabinetB.filters) {
      const a = this.cabinetA.filters.timeOfFlight.delayTime.value || 0;
      const b = this.cabinetB.filters.timeOfFlight.delayTime.value || 0;
      tof = Math.max(a, b);
    } else if (this.mode === 'ir' && this.irLoader?.latencySec) {
      tof = this.irLoader.latencySec;
    }
    
    this.dryDelay.delayTime.setTargetAtTime(
      Math.min(0.05, tof),
      this.audioContext.currentTime,
      this.SMOOTH_TIME
    );
  }
  
  // =========================================================
  // MODE SWITCHING
  // =========================================================
  
  setMode(mode) {
    // Guard: avoid unnecessary rebuild if already in this mode
    if (mode === this.mode) return;
    
    switch (mode) {
      case 'single':
        this.initializeSingleMode();
        break;
      case 'dual':
        this.initializeDualMode();
        break;
      case 'ir':
        this.initializeIRMode();
        break;
      default:
        console.warn('Invalid mode:', mode);
    }
  }
  
  // =========================================================
  // IR LOADING
  // =========================================================
  
  async loadIR(url, channel = 'A') {
    this.initializeIRMode();
    return await this.irLoader.loadIR(url, channel);
  }
  
  async loadIRFromFile(file, channel = 'A') {
    this.initializeIRMode();
    return await this.irLoader.loadIRFromFile(file, channel);
  }
  
  // =========================================================
  // LEGACY API (for backwards compatibility)
  // =========================================================
  
  createCabinet(cabinetType, micType, position) {
    // Legacy position mapping (for backwards compatibility)
    const positionMap = {
      'center': { distance: 3, angle: 0, height: 0 },
      'edge': { distance: 5, angle: 30, height: 0 },
      'off_axis': { distance: 8, angle: 45, height: 0 },
      'room': { distance: 30, angle: 60, height: 0 }
    };
    
    const pos = positionMap[position] || { distance: 3, angle: 0, height: 0 };
    
    return this.createCabinetFilters(
      cabinetType,
      micType,
      pos.distance,
      pos.angle,
      pos.height
    );
  }
  
  // =========================================================
  // UTILITY METHODS
  // =========================================================
  
  getCabinets() {
    return Object.keys(this.cabinets).map(key => ({
      id: key,
      ...this.cabinets[key]
    }));
  }
  
  getMicrophones() {
    return Object.keys(this.microphones).map(key => ({
      id: key,
      ...this.microphones[key]
    }));
  }
  
  getPositions() {
    // Legacy positions for backwards compatibility
    return [
      { id: 'center', name: 'Center (On-Axis)', description: 'Bright, focused' },
      { id: 'edge', name: 'Edge (Off-Center)', description: 'Balanced' },
      { id: 'off_axis', name: 'Off-Axis', description: 'Smooth' },
      { id: 'room', name: 'Room (1ft back)', description: 'Ambient' }
    ];
  }
  
  getMicPositionInfo(cabinet = 'A') {
    const cab = cabinet === 'A' ? this.cabinetA : this.cabinetB;
    const mic = this.microphones[cab.mic];
    const distanceM = cab.distance / 100;
    const angleRad = (cab.angle * Math.PI) / 180;
    const heightNorm = this.clamp(cab.height, -1, 1);
    const heightMul = 1 + 0.12 * heightNorm;
    
    return {
      distance: cab.distance,
      angle: cab.angle,
      height: cab.height,
      proximityGain: mic.proximityBoost * Math.exp(-distanceM / mic.proximityDecay),
      presenceGain: mic.presenceBoost * Math.cos(angleRad),
      presenceFreq: mic.presenceFreq * heightMul,
      airLossFreq: 20000 / (1 + distanceM * 25),
      timeOfFlightMs: (distanceM / 343) * 1000
    };
  }
  
  // Public connect/disconnect helpers (safer than direct output access)
  connect(node) {
    if (this.output && node) {
      this.output.connect(node);
    }
  }
  
  disconnect(node) {
    if (this.output) {
      try {
        if (node) {
          this.output.disconnect(node);
        } else {
          this.output.disconnect();
        }
      } catch (e) {
        // Already disconnected
      }
    }
  }
  
  disconnectAll() {
    // Safe disconnect helper
    const safeDisconnect = (node) => {
      if (node && typeof node.disconnect === 'function') {
        try {
          // Check if node has outputs before disconnecting
          if (node.numberOfOutputs === undefined || node.numberOfOutputs > 0) {
            node.disconnect();
          }
        } catch (e) {
          // Silently ignore disconnect errors
        }
      }
    };
    
    // Disconnect main nodes (NOT this.output - prevents breaking downstream connections)
    safeDisconnect(this.input);
    safeDisconnect(this.compressor);
    safeDisconnect(this.limiter);
    safeDisconnect(this.outputTrim);
    safeDisconnect(this.mixDry);
    safeDisconnect(this.mixWet);
    
    // Disconnect room nodes
    safeDisconnect(this.roomDelay);
    safeDisconnect(this.roomLP);
    safeDisconnect(this.roomFeedback);
    safeDisconnect(this.roomGain);
    
    // Disconnect cabinet filters
    if (this.cabinetA.filters) {
      Object.values(this.cabinetA.filters).forEach(safeDisconnect);
    }
    
    if (this.cabinetB.filters) {
      Object.values(this.cabinetB.filters).forEach(safeDisconnect);
    }
    
    // Disconnect routing nodes
    safeDisconnect(this.cabAGain);
    safeDisconnect(this.cabBGain);
    safeDisconnect(this.panA);
    safeDisconnect(this.panB);
    safeDisconnect(this.phaseInverter);
    safeDisconnect(this.dualSkew);
    safeDisconnect(this.irLoader.input);
    safeDisconnect(this.irLoader.output);
  }
}

export default CabinetSimulator;
