import BaseEffect from './BaseEffect';
import CabinetSimulator from '../amps/CabinetSimulator';

class AmpSimulator extends BaseEffect {
  constructor(audioContext, id, ampType = 'clean') {
    super(audioContext, id, `${ampType} Amp`, 'amp');
    
    this.ampType = ampType;
    
    // Input calibration
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 0.9;
    
    // Pre-amp stage with power amp sag simulation
    this.preAmpGain = audioContext.createGain();
    
    // Power amp sag (compression at high levels)
    this.powerAmpCompressor = audioContext.createDynamicsCompressor();
    this.powerAmpCompressor.threshold.value = -10;
    this.powerAmpCompressor.knee.value = 12;
    this.powerAmpCompressor.ratio.value = 8;
    this.powerAmpCompressor.attack.value = 0.003;
    this.powerAmpCompressor.release.value = 0.05;
    
    // Enhanced EQ section (4-band)
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowMid = audioContext.createBiquadFilter();
    this.midPeak = audioContext.createBiquadFilter();
    this.highShelf = audioContext.createBiquadFilter();
    
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 120;
    this.lowShelf.gain.value = 0;
    
    this.lowMid.type = 'peaking';
    this.lowMid.frequency.value = 400;
    this.lowMid.Q.value = 1.2;
    this.lowMid.gain.value = 0;
    
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1200;
    this.midPeak.Q.value = 0.7;
    this.midPeak.gain.value = 0;
    
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3000;
    this.highShelf.gain.value = 0;
    
    // CRITICAL QUALITY IMPROVEMENTS:
    // Anti-aliasing filter (BEFORE saturation)
    this.antiAliasing = audioContext.createBiquadFilter();
    this.antiAliasing.type = 'lowpass';
    this.antiAliasing.frequency.value = 18000;
    this.antiAliasing.Q.value = 0.707;
    
    // Saturation/distortion with 4x oversampling
    this.saturation = audioContext.createWaveShaper();
    this.saturation.oversample = '4x'; // 4x oversampling for PROFESSIONAL quality
    
    // DC Blocker (AFTER saturation - removes DC offset)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Professional Cabinet + Microphone Simulator
    this.cabinetSim = new CabinetSimulator(audioContext);
    this.currentCabinet = '2x12_closed'; // Default Marshall style
    this.currentMic = 'sm57'; // Default SM57
    this.currentPosition = 'edge'; // Default edge position
    
    // Create cabinet nodes
    this.cabinet = this.cabinetSim.createCabinet(
      this.currentCabinet,
      this.currentMic,
      this.currentPosition
    );
    
    // Master volume
    this.masterGain = audioContext.createGain();
    
    // ===========================================
    // SPECIFIC AMP FEATURES
    // ===========================================
    
    // REVERB (Fender, Two-Rock)
    this.springReverb = audioContext.createConvolver();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0;
    this.hasSpringReverb = false;
    
    // TREMOLO (Vox)
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloGain = audioContext.createGain();
    this.tremoloDepth = audioContext.createGain();
    this.tremoloLFO.frequency.value = 5;
    this.tremoloGain.gain.value = 1;
    this.tremoloDepth.gain.value = 0;
    this.tremoloLFO.start();
    
    // CHORUS (Roland JC-120)
    this.chorusDelay = audioContext.createDelay(0.05);
    this.chorusLFO = audioContext.createOscillator();
    this.chorusDepth = audioContext.createGain();
    this.chorusGain = audioContext.createGain();
    this.chorusLFO.frequency.value = 1.5;
    this.chorusDepth.gain.value = 0.002;
    this.chorusGain.gain.value = 0;
    this.chorusLFO.connect(this.chorusDepth);
    this.chorusDepth.connect(this.chorusDelay.delayTime);
    this.chorusLFO.start();
    
    // BRIGHT SWITCH (Fender)
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 2000;
    this.brightFilter.gain.value = 0;
    
    // RESONANCE/DEPTH (High Gain amps)
    this.resonanceFilter = audioContext.createBiquadFilter();
    this.resonanceFilter.type = 'lowshelf';
    this.resonanceFilter.frequency.value = 100;
    this.resonanceFilter.gain.value = 0;
    
    // PRESENCE (Most amps)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 4000;
    this.presenceFilter.gain.value = 0;
    
    // BOOST
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1;
    
    // SHAPE (Orange - mid scoop)
    this.shapeFilter = audioContext.createBiquadFilter();
    this.shapeFilter.type = 'peaking';
    this.shapeFilter.frequency.value = 800;
    this.shapeFilter.Q.value = 1.5;
    this.shapeFilter.gain.value = 0;
    
    // ===========================================
    // ADVANCED AMP FEATURES (Professional Level)
    // ===========================================
    
    // TUBE TYPE MODELING
    this.tubeType = 'EL34'; // EL34, 6L6, EL84, KT88, 6V6
    this.tubeCharacteristics = {
      EL34: { gain: 1.0, warmth: 0.7, headroom: 0.6, compression: 0.7 },
      '6L6': { gain: 0.9, warmth: 0.8, headroom: 0.8, compression: 0.5 },
      EL84: { gain: 1.1, warmth: 0.6, headroom: 0.4, compression: 0.8 },
      KT88: { gain: 0.8, warmth: 0.5, headroom: 0.9, compression: 0.4 },
      '6V6': { gain: 1.0, warmth: 0.9, headroom: 0.5, compression: 0.6 }
    };
    
    // BIAS CONTROL
    this.biasAmount = 50; // 0-100 (cold to hot)
    this.biasGain = audioContext.createGain();
    this.biasGain.gain.value = 1.0;
    
    // ENHANCED POWER AMP SAG
    this.sagAmount = 50; // 0-100%
    this.sagCompressor = audioContext.createDynamicsCompressor();
    this.sagCompressor.threshold.value = -15;
    this.sagCompressor.knee.value = 20;
    this.sagCompressor.ratio.value = 4;
    this.sagCompressor.attack.value = 0.01;
    this.sagCompressor.release.value = 0.15;
    
    // RECTIFIER TYPE (tube vs solid-state)
    this.rectifierType = 'tube'; // 'tube' or 'solid-state'
    this.rectifierSag = audioContext.createGain();
    this.rectifierSag.gain.value = 1.0;
    
    // TRANSFORMER SATURATION
    this.transformerSaturation = audioContext.createWaveShaper();
    this.transformerSaturation.oversample = '2x';
    this.transformerSaturation.curve = this.makeTransformerCurve();
    this.transformerGain = audioContext.createGain();
    this.transformerGain.gain.value = 1.0;
    
    // TRANSFORMER HUM (50/60Hz)
    this.humOscillator = audioContext.createOscillator();
    this.humOscillator.frequency.value = 60; // 60Hz (US) or 50Hz (EU)
    this.humGain = audioContext.createGain();
    this.humGain.gain.value = 0; // Off by default
    this.humOscillator.start();
    
    // IMPEDANCE MATCHING
    this.impedance = '8'; // '4', '8', '16' ohms
    this.impedanceFilter = audioContext.createBiquadFilter();
    this.impedanceFilter.type = 'lowshelf';
    this.impedanceFilter.frequency.value = 100;
    this.impedanceFilter.gain.value = 0;
    
    // SPEAKER DAMPING
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'highshelf';
    this.dampingFilter.frequency.value = 3000;
    this.dampingFilter.gain.value = 0;
    
    // NEGATIVE FEEDBACK LOOP (for Resonance/Presence)
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.1;
    this.feedbackDelay = audioContext.createDelay(0.001);
    this.feedbackDelay.delayTime.value = 0.0005; // 0.5ms delay
    this.feedbackFilter = audioContext.createBiquadFilter();
    this.feedbackFilter.type = 'lowpass';
    this.feedbackFilter.frequency.value = 5000;
    
    // DYNAMIC ROOM MODELING
    this.roomSize = 'medium'; // 'small', 'medium', 'large'
    this.roomType = 'studio'; // 'booth', 'studio', 'live', 'arena'
    this.roomReverbNode = audioContext.createConvolver();
    this.roomGain = audioContext.createGain();
    this.roomGain.gain.value = 0; // Off by default
    this.earlyReflections = audioContext.createDelay(0.1);
    this.earlyReflections.delayTime.value = 0.02;
    this.earlyReflectionsGain = audioContext.createGain();
    this.earlyReflectionsGain.gain.value = 0;
    
    // AMBIENT MIC (Room Mic)
    this.ambientMicGain = audioContext.createGain();
    this.ambientMicGain.gain.value = 0;
    this.ambientMicFilter = audioContext.createBiquadFilter();
    this.ambientMicFilter.type = 'lowpass';
    this.ambientMicFilter.frequency.value = 8000;
    
    // STEREO WIDTH CONTROL
    this.stereoWidth = 50; // 0-100%
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.widthGainL = audioContext.createGain();
    this.widthGainR = audioContext.createGain();
    this.widthGainL.gain.value = 1.0;
    this.widthGainR.gain.value = 1.0;
    
    // FX LOOP
    this.fxLoopSend = audioContext.createGain();
    this.fxLoopReturn = audioContext.createGain();
    this.fxLoopSend.gain.value = 0.8;
    this.fxLoopReturn.gain.value = 0.8;
    this.fxLoopMode = 'series'; // 'series' or 'parallel'
    this.fxLoopPosition = 'post'; // 'pre' (before preamp) or 'post' (after preamp, before power amp)
    
    // Setup amp type
    this.setAmpType(ampType);
    
    // PROFESSIONAL AUDIO CHAIN (Updated with 4x oversampling + anti-aliasing + DC blocking):
    // input -> inputGain -> brightFilter -> boostGain -> preAmpGain 
    // -> powerAmpCompressor -> EQ (4-band) -> shapeFilter 
    // -> antiAliasing (18kHz LP) -> saturation (4x oversample) -> dcBlocker (10Hz HP)
    // -> presenceFilter -> resonanceFilter -> cabinet -> masterGain 
    // -> [tremolo branch] -> [chorus branch] -> [reverb branch] -> wetGain -> output
    
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.brightFilter);
    this.brightFilter.connect(this.boostGain);
    this.boostGain.connect(this.preAmpGain);
    this.preAmpGain.connect(this.powerAmpCompressor);
    this.powerAmpCompressor.connect(this.lowShelf);
    this.lowShelf.connect(this.lowMid);
    this.lowMid.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.shapeFilter);
    this.shapeFilter.connect(this.antiAliasing); // Anti-aliasing BEFORE saturation
    this.antiAliasing.connect(this.saturation); // 4x oversampling saturation
    this.saturation.connect(this.dcBlocker); // DC blocker AFTER saturation
    this.dcBlocker.connect(this.presenceFilter);
    this.presenceFilter.connect(this.resonanceFilter);
    this.resonanceFilter.connect(this.cabinet.input);
    this.cabinet.output.connect(this.masterGain);
    
    // Tremolo path (optional)
    this.masterGain.connect(this.tremoloGain);
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    
    // Main output path (connects all optional effects)
    this.tremoloGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal (though amps usually don't have dry signal)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0; // Default to fully wet
  }

  setAmpType(type) {
    this.ampType = type;
    
    // Reset EQ to neutral
    this.lowShelf.gain.value = 0;
    this.lowMid.gain.value = 0;
    this.midPeak.gain.value = 0;
    this.highShelf.gain.value = 0;
    
    switch (type) {
      // ORIGINAL 4
      case 'clean':
        this.preAmpGain.gain.value = 1.5;
        this.saturation.curve = this.makeCleanCurve();
        this.masterGain.gain.value = 0.8;
        this.lowShelf.gain.value = 2;
        this.highShelf.gain.value = 3;
        break;
      case 'crunch':
        this.preAmpGain.gain.value = 3;
        this.saturation.curve = this.makeCrunchCurve();
        this.masterGain.gain.value = 0.6;
        this.midPeak.gain.value = 4;
        break;
      case 'lead':
        this.preAmpGain.gain.value = 8;
        this.saturation.curve = this.makeLeadCurve();
        this.masterGain.gain.value = 0.4;
        this.midPeak.gain.value = 6;
        break;
      case 'metal':
        this.preAmpGain.gain.value = 15;
        this.saturation.curve = this.makeMetalCurve();
        this.masterGain.gain.value = 0.3;
        this.lowShelf.gain.value = -2;
        this.midPeak.gain.value = 8;
        this.highShelf.gain.value = 4;
        break;
      
      // CLEAN/VINTAGE (5)
      case 'vox_ac30':
        this.preAmpGain.gain.value = 2.5;
        this.saturation.curve = this.makeVoxAC30Curve();
        this.masterGain.gain.value = 0.7;
        this.highShelf.gain.value = 5; // Chimey highs
        this.midPeak.gain.value = 3; // Top boost
        break;
      case 'fender_deluxe':
        this.preAmpGain.gain.value = 1.2;
        this.saturation.curve = this.makeFenderDeluxeCurve();
        this.masterGain.gain.value = 0.85;
        this.lowShelf.gain.value = 3; // Fat lows
        this.lowMid.gain.value = -2; // Scooped mids
        this.highShelf.gain.value = 2;
        break;
      case 'fender_bassman':
        this.preAmpGain.gain.value = 2.8;
        this.saturation.curve = this.makeFenderBassmanCurve();
        this.masterGain.gain.value = 0.65;
        this.lowShelf.gain.value = 4; // Bass-heavy
        this.midPeak.gain.value = 2;
        break;
      case 'roland_jc120':
        this.preAmpGain.gain.value = 1.0;
        this.saturation.curve = this.makeRolandJC120Curve();
        this.masterGain.gain.value = 0.9;
        // Flat EQ (hi-fi)
        break;
      case 'matchless_dc30':
        this.preAmpGain.gain.value = 2.2;
        this.saturation.curve = this.makeMatchlessDC30Curve();
        this.masterGain.gain.value = 0.75;
        this.midPeak.gain.value = 4;
        this.highShelf.gain.value = 3;
        break;
      
      // CRUNCH/BRITISH (5)
      case 'marshall_jcm800':
        this.preAmpGain.gain.value = 10;
        this.saturation.curve = this.makeMarshallJCM800Curve();
        this.masterGain.gain.value = 0.35;
        this.midPeak.gain.value = 7; // Aggressive mids
        this.highShelf.gain.value = 3;
        break;
      case 'orange_rockerverb':
        this.preAmpGain.gain.value = 6;
        this.saturation.curve = this.makeOrangeRockerverbCurve();
        this.masterGain.gain.value = 0.5;
        this.lowMid.gain.value = 4; // Fat mids
        this.midPeak.gain.value = 5;
        break;
      case 'hiwatt_dr103':
        this.preAmpGain.gain.value = 1.8;
        this.saturation.curve = this.makeHiwattDR103Curve();
        this.masterGain.gain.value = 0.8;
        // Flat response (hi-fi)
        break;
      case 'marshall_jtm45':
        this.preAmpGain.gain.value = 2.5;
        this.saturation.curve = this.makeMarshallJTM45Curve();
        this.masterGain.gain.value = 0.7;
        this.midPeak.gain.value = 3;
        break;
      case 'badcat_hotcat':
        this.preAmpGain.gain.value = 3.5;
        this.saturation.curve = this.makeBadCatHotCatCurve();
        this.masterGain.gain.value = 0.6;
        this.midPeak.gain.value = 4;
        this.highShelf.gain.value = 2;
        break;
      
      // HIGH GAIN/MODERN (5)
      case 'peavey_5150':
        this.preAmpGain.gain.value = 20;
        this.saturation.curve = this.makePeavey5150Curve();
        this.masterGain.gain.value = 0.25;
        this.lowShelf.gain.value = -3; // Tight bass
        this.lowMid.gain.value = -4; // Scooped
        this.midPeak.gain.value = 9;
        this.highShelf.gain.value = 5;
        break;
      case 'bogner_ecstasy':
        this.preAmpGain.gain.value = 12;
        this.saturation.curve = this.makeBognerEcstasyCurve();
        this.masterGain.gain.value = 0.32;
        this.lowShelf.gain.value = -1;
        this.midPeak.gain.value = 6;
        this.highShelf.gain.value = 3;
        break;
      case 'diezel_vh4':
        this.preAmpGain.gain.value = 18;
        this.saturation.curve = this.makeDiezelVH4Curve();
        this.masterGain.gain.value = 0.28;
        this.lowShelf.gain.value = -2;
        this.midPeak.gain.value = 8;
        this.highShelf.gain.value = 4;
        break;
      case 'friedman_be100':
        this.preAmpGain.gain.value = 14;
        this.saturation.curve = this.makeFriedmanBE100Curve();
        this.masterGain.gain.value = 0.3;
        this.midPeak.gain.value = 7;
        this.highShelf.gain.value = 4;
        break;
      case 'soldano_slo100':
        this.preAmpGain.gain.value = 11;
        this.saturation.curve = this.makeSoldanoSLO100Curve();
        this.masterGain.gain.value = 0.35;
        this.midPeak.gain.value = 6;
        this.highShelf.gain.value = 2;
        break;
      
      // BOUTIQUE/MODERN (5)
      case 'tworock_classic':
        this.preAmpGain.gain.value = 1.3;
        this.saturation.curve = this.makeTwoRockClassicCurve();
        this.masterGain.gain.value = 0.85;
        this.lowShelf.gain.value = 1;
        this.highShelf.gain.value = 2;
        break;
      case 'dumble_ods':
        this.preAmpGain.gain.value = 4;
        this.saturation.curve = this.makeDumbleODSCurve();
        this.masterGain.gain.value = 0.6;
        this.lowMid.gain.value = 2;
        this.midPeak.gain.value = 5; // Vocal mids
        break;
      case 'mesa_mark_v':
        this.preAmpGain.gain.value = 12;
        this.saturation.curve = this.makeMesaMarkVCurve();
        this.masterGain.gain.value = 0.35;
        this.midPeak.gain.value = 7;
        this.highShelf.gain.value = 3;
        break;
      case 'suhr_badger':
        this.preAmpGain.gain.value = 5;
        this.saturation.curve = this.makeSuhrBadgerCurve();
        this.masterGain.gain.value = 0.55;
        this.midPeak.gain.value = 4;
        this.highShelf.gain.value = 3;
        break;
      case 'victory_duchess':
        this.preAmpGain.gain.value = 7;
        this.saturation.curve = this.makeVictoryDuchessCurve();
        this.masterGain.gain.value = 0.45;
        this.midPeak.gain.value = 5;
        this.highShelf.gain.value = 2;
        break;
      
      default:
        // Fallback to clean
        this.preAmpGain.gain.value = 1.5;
        this.saturation.curve = this.makeCleanCurve();
        this.masterGain.gain.value = 0.8;
        break;
    }
  }

  makeCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 0.5);
    }
    return curve;
  }

  makeCrunchCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2);
    }
    return curve;
  }

  makeLeadCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 5);
    }
    return curve;
  }

  makeMetalCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const distortion = Math.tanh(x * 10);
      curve[i] = distortion * 0.9;
    }
    return curve;
  }

  // CLEAN/VINTAGE CURVES (5)
  makeVoxAC30Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Class A compression + chimey breakup
      let y = Math.tanh(x * 1.8);
      y += 0.15 * Math.sin(x * Math.PI * 2); // Harmonic richness
      curve[i] = y * 0.85;
    }
    return curve;
  }

  makeFenderDeluxeCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Ultra-clean with gentle breakup
      curve[i] = Math.tanh(x * 0.6);
    }
    return curve;
  }

  makeFenderBassmanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Warm tweed breakup
      let y = Math.tanh(x * 2.2);
      if (x > 0) y *= 1.1; // Asymmetry
      curve[i] = y * 0.9;
    }
    return curve;
  }

  makeRolandJC120Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Solid-state: virtually no distortion
      curve[i] = Math.tanh(x * 0.3);
    }
    return curve;
  }

  makeMatchlessDC30Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Boutique Class A warmth
      let y = Math.tanh(x * 1.6);
      y += 0.12 * Math.tanh(x * 3.2); // Rich harmonics
      curve[i] = y * 0.88;
    }
    return curve;
  }

  // CRUNCH/BRITISH CURVES (5)
  makeMarshallJCM800Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Aggressive British crunch
      let y = Math.tanh(x * 6);
      y = Math.tanh(y * 1.5); // Second stage
      if (x > 0) y *= 1.15;
      curve[i] = y * 0.75;
    }
    return curve;
  }

  makeOrangeRockerverbCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Thick, saturated British tone
      let y = Math.tanh(x * 4);
      y += 0.2 * Math.tanh(x * 8); // Harmonic density
      curve[i] = y * 0.8;
    }
    return curve;
  }

  makeHiwattDR103Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Transparent, hi-fi clean power
      curve[i] = Math.tanh(x * 0.8);
    }
    return curve;
  }

  makeMarshallJTM45Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Vintage Marshall warmth
      let y = Math.tanh(x * 1.9);
      if (x > 0) y *= 1.08;
      curve[i] = y * 0.9;
    }
    return curve;
  }

  makeBadCatHotCatCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Boutique clarity
      let y = Math.tanh(x * 2.5);
      y += 0.1 * Math.sin(x * Math.PI * 3);
      curve[i] = y * 0.85;
    }
    return curve;
  }

  // HIGH GAIN/MODERN CURVES (5)
  makePeavey5150Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Extreme gain, tight & brutal
      let y = Math.tanh(x * 12);
      y = Math.tanh(y * 2);
      y = Math.tanh(y * 1.3);
      if (x > 0) y *= 1.25;
      curve[i] = y * 0.7;
    }
    return curve;
  }

  makeBognerEcstasyCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Smooth high gain
      let y = Math.tanh(x * 7);
      y = Math.tanh(y * 1.4);
      y += 0.08 * Math.tanh(x * 14);
      curve[i] = y * 0.78;
    }
    return curve;
  }

  makeDiezelVH4Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // German precision high gain
      let y = Math.tanh(x * 10);
      y = Math.tanh(y * 1.6);
      if (x > 0) y *= 1.2;
      curve[i] = y * 0.72;
    }
    return curve;
  }

  makeFriedmanBE100Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Modified Marshall high gain
      let y = Math.tanh(x * 8);
      y = Math.tanh(y * 1.5);
      if (x > 0) y *= 1.18;
      curve[i] = y * 0.75;
    }
    return curve;
  }

  makeSoldanoSLO100Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Smooth singing lead
      let y = Math.tanh(x * 6.5);
      y = Math.tanh(y * 1.3);
      y += 0.1 * Math.tanh(x * 13);
      curve[i] = y * 0.8;
    }
    return curve;
  }

  // BOUTIQUE/MODERN CURVES (5)
  makeTwoRockClassicCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Pristine boutique clean
      curve[i] = Math.tanh(x * 0.65);
    }
    return curve;
  }

  makeDumbleODSCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Legendary smooth overdrive
      let y = Math.tanh(x * 3);
      y += 0.15 * Math.tanh(x * 6); // Vocal character
      if (x > 0) y *= 1.1;
      curve[i] = y * 0.82;
    }
    return curve;
  }

  makeMesaMarkVCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Versatile high gain
      let y = Math.tanh(x * 7);
      y = Math.tanh(y * 1.4);
      curve[i] = y * 0.77;
    }
    return curve;
  }

  makeSuhrBadgerCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Articulate boutique
      let y = Math.tanh(x * 3.5);
      y += 0.12 * Math.tanh(x * 7);
      curve[i] = y * 0.83;
    }
    return curve;
  }

  makeVictoryDuchessCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Modern British clarity
      let y = Math.tanh(x * 4.5);
      y = Math.tanh(y * 1.2);
      curve[i] = y * 0.8;
    }
    return curve;
  }

  // ===========================================
  // ADVANCED AMP METHODS
  // ===========================================

  // Transformer saturation curve
  makeTransformerCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Transformer saturation with soft knee and asymmetry
      let y = Math.tanh(x * 1.2);
      
      // Add transformer saturation characteristics
      y += 0.05 * Math.tanh(x * 2.4); // 2nd harmonic
      y += 0.02 * Math.tanh(x * 3.6); // 3rd harmonic
      
      // Asymmetry (transformers are not perfectly symmetrical)
      if (x > 0) {
        y *= 1.03;
      } else {
        y *= 0.97;
      }
      
      curve[i] = y * 0.95;
    }
    return curve;
  }

  // Set tube type and update characteristics
  setTubeType(type) {
    if (!this.tubeCharacteristics[type]) return;
    
    this.tubeType = type;
    const chars = this.tubeCharacteristics[type];
    
    // Update gain based on tube type
    this.biasGain.gain.value = chars.gain;
    
    // Update power amp compression based on tube characteristics
    this.powerAmpCompressor.threshold.value = -10 - (chars.headroom * 10);
    this.powerAmpCompressor.ratio.value = 4 + (chars.compression * 8);
    
    // Update saturation curve based on tube warmth
    // (In a real implementation, you'd have different curves per tube type)
    const currentCurve = this.saturation.curve;
    if (currentCurve) {
      // Modify existing curve slightly based on tube warmth
      this.saturation.curve = currentCurve; // Simplified for now
    }
  }

  // Set bias amount (cold = 0, hot = 100)
  setBias(amount) {
    this.biasAmount = Math.max(0, Math.min(100, amount));
    
    // Cold bias = more headroom, less compression, cleaner
    // Hot bias = less headroom, more compression, warmer
    const normalized = amount / 100;
    
    // Adjust threshold based on bias
    this.powerAmpCompressor.threshold.value = -5 - (15 * (1 - normalized));
    
    // Adjust gain slightly
    this.biasGain.gain.value = 0.9 + (0.2 * normalized);
  }

  // Set sag amount
  setSag(amount) {
    this.sagAmount = Math.max(0, Math.min(100, amount));
    const normalized = amount / 100;
    
    // More sag = more compression and "bloom"
    this.sagCompressor.threshold.value = -20 + (normalized * 10);
    this.sagCompressor.ratio.value = 2 + (normalized * 6);
    this.sagCompressor.attack.value = 0.005 + (normalized * 0.015);
    this.sagCompressor.release.value = 0.1 + (normalized * 0.2);
  }

  // Set rectifier type
  setRectifierType(type) {
    this.rectifierType = type;
    
    if (type === 'tube') {
      // Tube rectifier: more sag, warmer, softer attack
      this.rectifierSag.gain.value = 0.95;
      this.sagCompressor.attack.value = 0.015;
    } else {
      // Solid-state: tighter, faster response
      this.rectifierSag.gain.value = 1.0;
      this.sagCompressor.attack.value = 0.003;
    }
  }

  // Set speaker impedance
  setImpedance(ohms) {
    this.impedance = ohms;
    
    switch (ohms) {
      case '4':
        // 4 ohms: tighter bass, more presence
        this.impedanceFilter.gain.value = -2;
        this.dampingFilter.gain.value = 3;
        break;
      case '8':
        // 8 ohms: balanced (default)
        this.impedanceFilter.gain.value = 0;
        this.dampingFilter.gain.value = 0;
        break;
      case '16':
        // 16 ohms: looser bass, warmer highs
        this.impedanceFilter.gain.value = 2;
        this.dampingFilter.gain.value = -2;
        break;
    }
  }

  // Set hum amount (0-100)
  setHum(amount) {
    this.humGain.gain.value = (amount / 100) * 0.002; // Very subtle
  }

  // Set room size and type
  setRoom(size, type) {
    this.roomSize = size;
    this.roomType = type;
    
    // Adjust early reflections delay based on room size
    const delays = {
      small: 0.01,
      medium: 0.025,
      large: 0.05
    };
    this.earlyReflections.delayTime.value = delays[size] || 0.025;
    
    // Adjust room reverb characteristics
    // (In a real implementation, you'd load different IR files)
    const gains = {
      booth: 0.1,
      studio: 0.2,
      live: 0.4,
      arena: 0.6
    };
    this.roomGain.gain.value = gains[type] || 0.2;
  }

  // Set ambient mic blend
  setAmbientMic(amount) {
    this.ambientMicGain.gain.value = amount / 100;
  }

  // Set stereo width (0 = mono, 100 = wide)
  setStereoWidth(amount) {
    this.stereoWidth = Math.max(0, Math.min(100, amount));
    const normalized = amount / 100;
    
    // Calculate L/R gains for stereo width
    // 0 = mono (both channels equal)
    // 100 = wide (full L/R separation)
    const mid = (1 - normalized) * 0.5;
    const side = normalized * 0.5;
    
    this.widthGainL.gain.value = mid + side;
    this.widthGainR.gain.value = mid + side;
  }

  // Method to change cabinet
  setCabinet(cabinetType) {
    this.currentCabinet = cabinetType;
    this.recreateCabinet();
  }
  
  // Method to change microphone
  setMicrophone(micType) {
    this.currentMic = micType;
    this.recreateCabinet();
  }
  
  // Method to change mic position
  setMicPosition(position) {
    this.currentPosition = position;
    this.recreateCabinet();
  }
  
  // Recreate cabinet with new settings
  recreateCabinet() {
    // Disconnect old cabinet
    this.saturation.disconnect();
    if (this.cabinet) {
      this.cabinet.input.disconnect();
      this.cabinet.output.disconnect();
    }
    
    // Create new cabinet
    this.cabinet = this.cabinetSim.createCabinet(
      this.currentCabinet,
      this.currentMic,
      this.currentPosition
    );
    
    // Reconnect
    this.saturation.connect(this.cabinet.input);
    this.cabinet.output.connect(this.masterGain);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // STANDARD CONTROLS
      case 'gain':
        this.preAmpGain.gain.setTargetAtTime(1 + (value / 10), now, 0.01);
        break;
      case 'bass':
        this.lowShelf.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'mid':
        this.midPeak.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'treble':
        this.highShelf.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'presence':
        this.presenceFilter.gain.setTargetAtTime((value - 50) / 3, now, 0.01);
        break;
      case 'master':
        this.masterGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'type':
        this.setAmpType(value);
        break;
      case 'cabinet':
        this.setCabinet(value);
        break;
      case 'microphone':
        this.setMicrophone(value);
        break;
      case 'micPosition':
        this.setMicPosition(value);
        break;
        
      // SPECIFIC CONTROLS - FENDER
      case 'reverb':
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'bright':
        this.brightFilter.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      case 'vibrato':
        // Implement vibrato as pitch modulation
        this.tremoloLFO.frequency.setTargetAtTime(value / 10, now, 0.01);
        break;
        
      // VOX AC30
      case 'topboost':
        // Top Boost adds high frequencies
        this.presenceFilter.gain.setTargetAtTime(value ? 8 : 0, now, 0.01);
        this.highShelf.gain.setTargetAtTime(value ? 4 : 0, now, 0.01);
        break;
      case 'tremolo':
        this.tremoloDepth.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'cut':
        // Vox cut control (reduces treble)
        this.highShelf.gain.setTargetAtTime((50 - value) / 5, now, 0.01);
        break;
        
      // ROLAND JC-120
      case 'chorus':
        this.chorusGain.gain.setTargetAtTime(value ? 0.5 : 0, now, 0.01);
        break;
      case 'distortion':
        // JC-120 distortion mode
        this.preAmpGain.gain.setTargetAtTime(value ? 5 : 1.5, now, 0.01);
        break;
        
      // HIGH GAIN AMPS
      case 'resonance':
        this.resonanceFilter.gain.setTargetAtTime((value - 50) / 4, now, 0.01);
        break;
      case 'depth':
        this.resonanceFilter.frequency.setTargetAtTime(80 + (value * 2), now, 0.01);
        this.resonanceFilter.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'shape':
        // Orange Shape (mid scoop)
        this.shapeFilter.gain.setTargetAtTime((50 - value) / 5, now, 0.01);
        break;
        
      // PEAVEY 5150
      case 'pregain':
        this.preAmpGain.gain.setTargetAtTime(1 + (value / 5), now, 0.01);
        break;
      case 'postgain':
        this.masterGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      // MESA BOOGIE
      case 'graphiceq':
        // Enable/disable graphic EQ (for now just boost mids)
        this.midPeak.gain.setTargetAtTime(value ? 4 : 0, now, 0.01);
        break;
      case 'soloboost':
        this.boostGain.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        break;
        
      // BOOST
      case 'boost':
        this.boostGain.gain.setTargetAtTime(value ? 2 : 1, now, 0.01);
        break;
        
      // DIEZEL
      case 'deepcontrol':
        this.lowShelf.gain.setTargetAtTime((value - 50) / 3, now, 0.01);
        break;
        
      // FRIEDMAN
      case 'tightswitch':
        // Tight switch reduces low-end flub
        this.lowShelf.frequency.setTargetAtTime(value ? 150 : 120, now, 0.01);
        break;
        
      // MATCHLESS
      case 'mastervolume':
        this.masterGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      // DUMBLE ODS
      case 'oddrive':
        this.preAmpGain.gain.setTargetAtTime(1 + (value / 20), now, 0.01);
        break;
      case 'ratio':
        // Dumble ratio control (compression-like)
        this.powerAmpCompressor.ratio.setTargetAtTime(1 + (value / 10), now, 0.01);
        break;
        
      // SUHR BADGER
      case 'variac':
        // Variac simulation (reduces voltage, affects headroom)
        this.masterGain.gain.setTargetAtTime(value / 120, now, 0.01);
        break;
        
      // VICTORY DUCHESS
      case 'gainstructure':
        // Gain structure adjustment
        this.powerAmpCompressor.threshold.setTargetAtTime(-30 + (value / 5), now, 0.01);
        break;
        
      // ===========================================
      // ADVANCED AMP PARAMETERS
      // ===========================================
      
      // TUBE TYPE
      case 'tubetype':
        this.setTubeType(value); // value = 'EL34', '6L6', 'EL84', 'KT88', '6V6'
        break;
      
      // BIAS CONTROL
      case 'bias':
        this.setBias(value); // 0-100
        break;
      
      // POWER AMP SAG
      case 'sag':
        this.setSag(value); // 0-100
        break;
      
      // RECTIFIER TYPE
      case 'rectifier':
        this.setRectifierType(value); // 'tube' or 'solid-state'
        break;
      
      // IMPEDANCE MATCHING
      case 'impedance':
        this.setImpedance(value); // '4', '8', '16'
        break;
      
      // TRANSFORMER HUM
      case 'hum':
        this.setHum(value); // 0-100
        break;
      case 'humfrequency':
        this.humOscillator.frequency.setTargetAtTime(value, now, 0.01); // 50 or 60 Hz
        break;
      
      // ROOM MODELING
      case 'roomsize':
        this.setRoom(value, this.roomType); // 'small', 'medium', 'large'
        break;
      case 'roomtype':
        this.setRoom(this.roomSize, value); // 'booth', 'studio', 'live', 'arena'
        break;
      case 'roomamount':
        this.roomGain.gain.setTargetAtTime(value / 100, now, 0.01); // 0-100
        break;
      case 'earlyreflections':
        this.earlyReflectionsGain.gain.setTargetAtTime(value / 100, now, 0.01); // 0-100
        break;
      case 'ambientmic':
        this.setAmbientMic(value); // 0-100
        break;
      
      // STEREO WIDTH
      case 'stereowidth':
        this.setStereoWidth(value); // 0-100
        break;
      
      // FX LOOP
      case 'fxloopsend':
        this.fxLoopSend.gain.setTargetAtTime(value / 100, now, 0.01); // 0-100
        break;
      case 'fxloopreturn':
        this.fxLoopReturn.gain.setTargetAtTime(value / 100, now, 0.01); // 0-100
        break;
      case 'fxloopmode':
        this.fxLoopMode = value; // 'series' or 'parallel'
        break;
      case 'fxloopposition':
        this.fxLoopPosition = value; // 'pre' or 'post'
        break;
        
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.brightFilter.disconnect();
      this.boostGain.disconnect();
      this.preAmpGain.disconnect();
      this.powerAmpCompressor.disconnect();
      this.lowShelf.disconnect();
      this.lowMid.disconnect();
      this.midPeak.disconnect();
      this.highShelf.disconnect();
      this.shapeFilter.disconnect();
      this.antiAliasing.disconnect(); // NEW: anti-aliasing filter
      this.saturation.disconnect();
      this.dcBlocker.disconnect(); // NEW: DC blocker
      this.presenceFilter.disconnect();
      this.resonanceFilter.disconnect();
      
      // Disconnect cabinet nodes
      if (this.cabinet) {
        Object.values(this.cabinet).forEach(node => {
          if (node && node.disconnect) {
            try {
              node.disconnect();
            } catch (e) {}
          }
        });
      }
      
      this.masterGain.disconnect();
      this.tremoloGain.disconnect();
      this.tremoloLFO.stop();
      this.tremoloLFO.disconnect();
      this.tremoloDepth.disconnect();
      
      this.chorusDelay.disconnect();
      this.chorusLFO.stop();
      this.chorusLFO.disconnect();
      this.chorusDepth.disconnect();
      this.chorusGain.disconnect();
      
      this.reverbGain.disconnect();
      if (this.springReverb) {
        this.springReverb.disconnect();
      }
      
      // Disconnect advanced amp nodes
      this.biasGain.disconnect();
      this.sagCompressor.disconnect();
      this.rectifierSag.disconnect();
      this.transformerSaturation.disconnect();
      this.transformerGain.disconnect();
      this.humOscillator.stop();
      this.humOscillator.disconnect();
      this.humGain.disconnect();
      this.impedanceFilter.disconnect();
      this.dampingFilter.disconnect();
      this.feedbackGain.disconnect();
      this.feedbackDelay.disconnect();
      this.feedbackFilter.disconnect();
      this.roomReverbNode.disconnect();
      this.roomGain.disconnect();
      this.earlyReflections.disconnect();
      this.earlyReflectionsGain.disconnect();
      this.ambientMicGain.disconnect();
      this.ambientMicFilter.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
      this.widthGainL.disconnect();
      this.widthGainR.disconnect();
      this.fxLoopSend.disconnect();
      this.fxLoopReturn.disconnect();
    } catch (e) {
      console.warn('Error disconnecting amp nodes:', e);
    }
  }
  
  // Get available cabinets
  getCabinets() {
    return this.cabinetSim.getCabinets();
  }
  
  // Get available microphones
  getMicrophones() {
    return this.cabinetSim.getMicrophones();
  }
  
  // Get available positions
  getPositions() {
    return this.cabinetSim.getPositions();
  }
}

export default AmpSimulator;

