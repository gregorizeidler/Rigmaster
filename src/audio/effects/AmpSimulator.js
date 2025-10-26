import BaseEffect from './BaseEffect';
import CabinetSimulator from '../amps/CabinetSimulator';

// Import ALL individual amp models (25 total)
import CleanAmp from '../amps/CleanAmp';
import CrunchAmp from '../amps/CrunchAmp';
import LeadAmp from '../amps/LeadAmp';
import MetalAmp from '../amps/MetalAmp';
import Peavey5150Amp from '../amps/Peavey5150Amp';
import VoxAC30Amp from '../amps/VoxAC30Amp';
import FenderDeluxeReverbAmp from '../amps/FenderDeluxeReverbAmp';
import MarshallJCM800Amp from '../amps/MarshallJCM800Amp';
import MesaDualRectifierAmp from '../amps/MesaDualRectifierAmp';
import DumbleODSAmp from '../amps/DumbleODSAmp';
import FenderBassmanAmp from '../amps/FenderBassmanAmp';
import RolandJC120Amp from '../amps/RolandJC120Amp';
import MatchlessDC30Amp from '../amps/MatchlessDC30Amp';
import OrangeRockerverbAmp from '../amps/OrangeRockerverbAmp';
import HiwattDR103Amp from '../amps/HiwattDR103Amp';
import MarshallJTM45Amp from '../amps/MarshallJTM45Amp';
import BadCatHotCatAmp from '../amps/BadCatHotCatAmp';
import BognerEcstasyAmp from '../amps/BognerEcstasyAmp';
import DiezelVH4Amp from '../amps/DiezelVH4Amp';
import FriedmanBE100Amp from '../amps/FriedmanBE100Amp';
import SoldanoSLO100Amp from '../amps/SoldanoSLO100Amp';
import TwoRockClassicReverbAmp from '../amps/TwoRockClassicReverbAmp';
import MesaMarkVAmp from '../amps/MesaMarkVAmp';
import SuhrBadgerAmp from '../amps/SuhrBadgerAmp';
import VictoryDuchessAmp from '../amps/VictoryDuchessAmp';

class AmpSimulator extends BaseEffect {
  constructor(audioContext, id, ampType = 'clean') {
    super(audioContext, id, `${ampType} Amp`, 'amp');
    
    this.ampType = ampType;
    this.audioContext = audioContext;
    
    // Check if this amp has a dedicated class
    this.dedicatedAmp = null;
    this.useDedicatedAmp = this.initializeDedicatedAmp(ampType);
    
    // If using dedicated amp, skip the old initialization
    if (this.useDedicatedAmp) {
      // Connect dedicated amp
      this.input.connect(this.dedicatedAmp.input);
      this.dedicatedAmp.connect(this.output);
      return;
    }
    
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

  initializeDedicatedAmp(ampType) {
    // Map ALL amp types to their dedicated classes (25 total)
    const ampClasses = {
      // Basic 4
      'clean': CleanAmp,
      'crunch': CrunchAmp,
      'lead': LeadAmp,
      'metal': MetalAmp,
      // Dedicated 21
      'peavey_5150': Peavey5150Amp,
      'vox_ac30': VoxAC30Amp,
      'fender_deluxe': FenderDeluxeReverbAmp,
      'marshall_jcm800': MarshallJCM800Amp,
      'mesa_dual_rectifier': MesaDualRectifierAmp,
      'dumble_ods': DumbleODSAmp,
      'fender_bassman': FenderBassmanAmp,
      'roland_jc120': RolandJC120Amp,
      'matchless_dc30': MatchlessDC30Amp,
      'orange_rockerverb': OrangeRockerverbAmp,
      'hiwatt_dr103': HiwattDR103Amp,
      'marshall_jtm45': MarshallJTM45Amp,
      'badcat_hotcat': BadCatHotCatAmp,
      'bogner_ecstasy': BognerEcstasyAmp,
      'diezel_vh4': DiezelVH4Amp,
      'friedman_be100': FriedmanBE100Amp,
      'soldano_slo100': SoldanoSLO100Amp,
      'tworock_classic': TwoRockClassicReverbAmp,
      'mesa_mark_v': MesaMarkVAmp,
      'suhr_badger': SuhrBadgerAmp,
      'victory_duchess': VictoryDuchessAmp
    };
    
    const AmpClass = ampClasses[ampType];
    if (AmpClass) {
      this.dedicatedAmp = new AmpClass(this.audioContext, this.id);
      console.log(`✅ Using dedicated amp class: ${ampType}`);
      return true;
    }
    
    console.warn(`⚠️ No dedicated amp class for: ${ampType}`);
    return false;
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
      case 'mesa_dual_rectifier':
        this.preAmpGain.gain.value = 15;
        this.saturation.curve = this.makeMesaDualRectifierCurve();
        this.masterGain.gain.value = 0.3;
        this.lowMid.gain.value = 8; // Heavy bass
        this.midPeak.gain.value = -3; // Mid scoop
        this.highShelf.gain.value = 6; // Aggressive highs
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
      // VOX AC30: EF86 pentode preamp + 4x EL84 Class A power
      
      // STAGE 1: EF86 pentode (gritty, high gain)
      let y = Math.tanh(x * 1.8);
      
      // CLASS A COMPRESSION (always active, even at low volumes)
      if (Math.abs(y) > 0.4) {
        const compression = 1 - (Math.abs(y) - 0.4) * 0.3;
        y *= compression;
      }
      
      // MID HONK @ 1kHz (cathode follower tone stack)
      y += 0.2 * Math.tanh(x * 3);
      
      // EL84 "chime" (2-4kHz peak - THE Vox sound!)
      y += 0.12 * Math.sin(x * Math.PI * 5);
      
      // Harmonic richness (Class A)
      y += 0.15 * Math.sin(x * Math.PI * 2);
      
      // EL84 asymmetry (clips more on positive cycle)
      if (x > 0) {
        y *= 1.12;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
    }
    return curve;
  }

  makeFenderDeluxeCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // FENDER DELUXE REVERB: 12AX7 preamp + 2x 6V6 power (blackface)
      
      // STAGE 1: 12AX7 preamp (clean with sparkle)
      let y = Math.tanh(x * 0.8);
      
      // BLACKFACE TONE STACK (mid scoop @ 500Hz)
      if (Math.abs(x) > 0.3) {
        y *= 0.92; // Slight mid scoop
      }
      
      // 6V6 POWER TUBES (soft compression + sag)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.3); // Soft knee
      }
      
      // SPARKLE HIGHS (Fender characteristic "chime")
      y += 0.05 * Math.sin(x * Math.PI * 4);
      
      // EVEN HARMONICS (tube warmth)
      y += 0.08 * Math.tanh(x * 1.6); // 2nd harmonic
      
      // 6V6 slight asymmetry
      if (x > 0) {
        y *= 1.05;
      }
      
      curve[i] = y * 0.95;
    }
    return curve;
  }

  makeFenderBassmanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // FENDER BASSMAN: Tweed era, warm breakup, 4x 5881 tubes
      
      // TWEED BREAKUP (warm, musical distortion)
      let y = Math.tanh(x * 2.2);
      
      // TWEED COMPRESSION (earlier than blackface)
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.5);
      }
      
      // WARM HARMONICS (tweed characteristic)
      y += 0.12 * Math.tanh(x * 4.4); // 2nd harmonic (warmth)
      y += 0.06 * Math.tanh(x * 6.6); // 3rd harmonic
      
      // 5881/6L6 asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.9;
    }
    return curve;
  }

  makeRolandJC120Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // ROLAND JC-120: Solid-state, ultra-clean "Jazz Chorus"
      
      // SOLID-STATE (transistor - almost linear)
      let y = Math.tanh(x * 0.3);
      
      // CRYSTAL CLEAR HIGHS (no tube warmth)
      y += 0.02 * Math.sin(x * Math.PI * 6);
      
      // MINIMAL EVEN HARMONICS (solid-state characteristic)
      y += 0.015 * Math.tanh(x * 0.6);
      
      // NO asymmetry (solid-state = symmetric)
      
      curve[i] = y * 1.0;
    }
    return curve;
  }

  makeMatchlessDC30Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // MATCHLESS DC-30: Boutique Class A, chimey, rich harmonics
      
      // CLASS A (EL84 tubes, always on)
      let y = Math.tanh(x * 1.6);
      
      // CLASS A COMPRESSION (smooth, musical)
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.25;
        y *= compression;
      }
      
      // RICH HARMONICS (boutique characteristic)
      y += 0.12 * Math.tanh(x * 3.2); // 2nd harmonic
      y += 0.06 * Math.tanh(x * 4.8); // 3rd harmonic
      
      // CHIME (EL84 top end)
      y += 0.08 * Math.sin(x * Math.PI * 4);
      
      // EL84 asymmetry
      if (x > 0) y *= 1.08;
      
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
      // MARSHALL JCM800: 3 cascading 12AX7 stages + EL34 power
      
      // STAGE 1: Input gain
      let y = Math.tanh(x * 6);
      
      // STAGE 2: Cascading gain
      y = Math.tanh(y * 1.5);
      
      // STAGE 3: Final preamp stage (NEW!)
      y = Math.tanh(y * 1.2);
      
      // EL34 power tube compression
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.4);
      }
      
      // Marshall "sizzle" (high-frequency bite)
      y += 0.08 * Math.tanh(x * 12); // Odd harmonics
      
      // British presence (4-5kHz peak)
      y += 0.06 * Math.sin(x * Math.PI * 8);
      
      // EL34 asymmetry
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
      // ORANGE ROCKERVERB: Thick, saturated British tone
      
      // THICK GAIN (Orange characteristic)
      let y = Math.tanh(x * 4);
      
      // HARMONIC DENSITY (very saturated)
      y += 0.2 * Math.tanh(x * 8); // Strong harmonics
      y += 0.08 * Math.tanh(x * 12); // Extra saturation
      
      // MID PRESENCE (Orange mid push)
      y += 0.1 * Math.tanh(x * 6);
      
      // BASS RESPONSE (thick low end)
      if (x < 0) {
        y *= 1.05;
      }
      
      // EL34 characteristic
      if (x > 0) y *= 1.12;
      
      curve[i] = y * 0.8;
    }
    return curve;
  }

  makeHiwattDR103Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // HIWATT DR103: Clean headroom, powerful, transparent
      
      // MASSIVE HEADROOM (EL34 x4, very clean)
      let y = Math.tanh(x * 0.8);
      
      // TRANSPARENCY (minimal coloration)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.45); // Late breakup
      }
      
      // CLARITY (hi-fi response)
      y += 0.05 * Math.tanh(x * 1.6); // Clean harmonics
      
      // BRITISH CHIME (but cleaner than Vox)
      y += 0.06 * Math.sin(x * Math.PI * 3);
      
      // EL34 slight asymmetry
      if (x > 0) y *= 1.06;
      
      curve[i] = y * 0.98;
    }
    return curve;
  }

  makeMarshallJTM45Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // MARSHALL JTM45: Vintage Marshall, warm plexi breakup
      
      // PLEXI BREAKUP (smooth, warm)
      let y = Math.tanh(x * 1.9);
      
      // VINTAGE WARMTH (KT66 tubes)
      y += 0.1 * Math.tanh(x * 3.8); // 2nd harmonic warmth
      
      // PLEXI CHARACTER (mid focus)
      y += 0.06 * Math.tanh(x * 5.7); // 3rd harmonic
      
      // WARM COMPRESSION
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.55);
      }
      
      // KT66/EL34 asymmetry
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
      // BAD CAT HOT CAT: Boutique clarity, EL34 crunch
      
      // BOUTIQUE CLARITY (high-quality components)
      let y = Math.tanh(x * 2.5);
      
      // ARTICULATION (clear note definition)
      y += 0.1 * Math.sin(x * Math.PI * 3);
      
      // HARMONIC COMPLEXITY (boutique characteristic)
      y += 0.08 * Math.tanh(x * 5); // Rich harmonics
      y += 0.04 * Math.tanh(x * 7.5); // Extra detail
      
      // TOUCH SENSITIVITY (responds to playing dynamics)
      const dynamics = 1 + (Math.abs(x) * 0.15);
      y *= dynamics;
      
      // EL34 asymmetry
      if (x > 0) y *= 1.1;
      
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
      // PEAVEY 5150: 5 gain stages, 6L6 power tubes, brutal tight gain
      let y = Math.tanh(x * 12);
      y = Math.tanh(y * 2);
      y = Math.tanh(y * 1.3);
      
      // MID SCOOP (V-shape EQ characteristic)
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.5) {
        y *= 0.85; // Scoop mid frequencies
      }
      
      // 6L6 tightness (fast attack, tight bass)
      if (x < 0) {
        y *= 1.05; // Negative cycle tighter
      }
      
      // Asymmetry (6L6 power tubes)
      if (x > 0) y *= 1.25;
      
      // Harmonic saturation (5 gain stages!)
      y += 0.1 * Math.tanh(x * 24); // High-order harmonics
      y += 0.05 * Math.tanh(x * 36); // Even higher (brutal)
      
      curve[i] = y * 0.7;
    }
    return curve;
  }

  makeBognerEcstasyCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // BOGNER ECSTASY: Versatile, smooth, rich harmonics
      
      // CASCADING GAIN
      let y = Math.tanh(x * 7);
      y = Math.tanh(y * 1.4);
      
      // PLEXI MODE (structure switch simulation)
      y += 0.08 * Math.tanh(x * 14); // Harmonic richness
      
      // SMOOTH COMPRESSION (Bogner characteristic)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.6); // Soft knee
      }
      
      // HARMONIC BLOOM
      y += 0.06 * Math.tanh(x * 21); // 3rd harmonic
      
      // EL34 characteristic
      if (x > 0) y *= 1.14;
      
      curve[i] = y * 0.78;
    }
    return curve;
  }

  makeDiezelVH4Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // DIEZEL VH4: German precision, tight, surgical high gain
      
      // STAGE 1: High gain
      let y = Math.tanh(x * 10);
      
      // STAGE 2: Cascading
      y = Math.tanh(y * 1.6);
      
      // GERMAN PRECISION (extremely tight, controlled)
      if (Math.abs(y) > 0.65) {
        // Hard limiting (precise)
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.25);
      }
      
      // TIGHT LOW END (Diezel signature)
      if (x < -0.2) {
        y *= 0.92; // Very tight bass
      }
      
      // MID FOCUS (surgical precision)
      y += 0.08 * Math.tanh(x * 20); // Focused mids
      
      // EL34 asymmetry
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
      // FRIEDMAN BE-100: Modified Marshall, tight & aggressive
      
      // HIGH GAIN (modified Marshall circuit)
      let y = Math.tanh(x * 8);
      y = Math.tanh(y * 1.5);
      
      // TIGHT SWITCH (bass tightening)
      if (x < -0.2) {
        y *= 0.93; // Tight low end
      }
      
      // AGGRESSIVE MIDS (Friedman characteristic)
      y += 0.09 * Math.tanh(x * 16); // Aggressive
      
      // SAT SWITCH (extra saturation)
      y += 0.05 * Math.tanh(x * 24);
      
      // EL34/6L6 hybrid character
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
      // SOLDANO SLO-100: Smooth, liquid lead, cascading gain
      
      // CASCADING GAIN (Soldano signature)
      let y = Math.tanh(x * 6.5);
      y = Math.tanh(y * 1.3);
      
      // LIQUID SATURATION (smooth clipping)
      y = Math.tanh(y * 1.1);
      
      // DEEP SWITCH (low-end thump)
      if (x < -0.25) {
        y *= 1.08; // Deep bass
      }
      
      // SMOOTH HIGH HARMONICS (liquid lead tone)
      y += 0.1 * Math.tanh(x * 13); // Singing highs
      y += 0.05 * Math.tanh(x * 19.5); // Sustain
      
      // 5881/6L6 tubes
      if (x > 0) y *= 1.12;
      
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
      // TWO-ROCK CLASSIC REVERB: Pristine boutique clean, touch sensitive
      
      // ULTRA-CLEAN (studio quality)
      let y = Math.tanh(x * 0.65);
      
      // TRANSPARENCY (pristine headroom)
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.4); // Very late breakup
      }
      
      // HARMONIC RICHNESS (boutique quality)
      y += 0.08 * Math.tanh(x * 1.3); // Clean harmonics
      y += 0.04 * Math.tanh(x * 1.95); // Extra detail
      
      // SPARKLE (high-end sheen)
      y += 0.05 * Math.sin(x * Math.PI * 3);
      
      // TOUCH SENSITIVITY (responds to pick attack)
      const touch = 1 + (Math.abs(x) * 0.12);
      y *= touch;
      
      curve[i] = y * 0.96;
    }
    return curve;
  }

  makeDumbleODSCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // DUMBLE OVERDRIVE SPECIAL: Legendary smooth, vocal overdrive
      
      // TRANSPARENCY (clean headroom - almost linear at low volumes)
      if (Math.abs(x) < 0.3) {
        curve[i] = x * 1.05; // Quase linear
        continue;
      }
      
      // STAGE 1: Overdrive special circuit
      let y = Math.tanh(x * 3);
      
      // DUMBLE "BLOOM" (compression que cresce com o volume)
      const bloom = 1 + (Math.abs(x) * 0.2);
      y *= bloom;
      
      // RATIO CONTROL (compression sutil e musical)
      if (Math.abs(y) > 0.5) {
        const ratio = 0.7; // Dumble ratio característico
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * ratio);
      }
      
      // "SINGING" SUSTAIN (strong even harmonics)
      y += 0.18 * Math.tanh(x * 4); // 2nd harmonic
      y += 0.08 * Math.tanh(x * 8); // 4th harmonic
      
      // VOCAL CHARACTER (mid-range focus)
      y += 0.15 * Math.tanh(x * 6);
      
      // Slight asymmetry
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
      // MESA/BOOGIE MARK V: Cascading gain, tight low end, singing leads
      
      // CASCADING GAIN (Mesa characteristic)
      let y = Math.tanh(x * 7);
      y = Math.tanh(y * 1.4);
      
      // TIGHT LOW END (Mesa signature)
      if (x < -0.3) {
        y *= 0.95; // Tighten bass
      }
      
      // GRAPHIC EQ MID SCOOP (V-shape)
      if (Math.abs(x) > 0.25 && Math.abs(x) < 0.6) {
        y *= 0.88; // Mid scoop
      }
      
      // SINGING SUSTAIN (lead characteristic)
      y += 0.1 * Math.tanh(x * 14); // High harmonics
      y += 0.06 * Math.tanh(x * 21); // Sustain
      
      // 6L6 power tubes
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.77;
    }
    return curve;
  }

  makeMesaDualRectifierCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // MESA/BOOGIE DUAL RECTIFIER: Modern high-gain monster
      // 3 channels (Clean, Vintage, Modern), Tube/Silicon rectifier modes
      // Used by Metallica, Dream Theater, Lamb of God
      
      // === MODERN CHANNEL (Red) - MOST AGGRESSIVE ===
      
      // STAGE 1: Massive gain (4+ preamp stages)
      let y = Math.tanh(x * 15);
      
      // STAGE 2: Additional cascading
      y = Math.tanh(y * 1.6);
      
      // STAGE 3: Final gain stage
      y = Math.tanh(y * 1.2);
      
      // === DUAL RECTIFIER CHARACTERISTICS ===
      
      // TUBE RECTIFIER MODE (saggy, compressed)
      // vs SILICON MODE (tight, aggressive) - simulating SILICON
      if (Math.abs(y) > 0.5) {
        const excess = Math.abs(y) - 0.5;
        y = Math.sign(y) * (0.5 + excess * 0.35); // Hard compression
      }
      
      // MASSIVE BASS (low-end thump)
      if (x < -0.15) {
        y *= 1.12; // Heavy bass response
      }
      
      // EXTREME MID SCOOP (V-shaped EQ signature)
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.65) {
        y *= 0.82; // Extreme mid scoop (scooped mids = Rectifier sound)
      }
      
      // AGGRESSIVE HIGHS (cutting presence)
      if (Math.abs(x) > 0.7) {
        y += 0.12 * Math.tanh(x * 30); // Sharp highs
      }
      
      // BOLD/SPONGY POWER (simulating BOLD mode - tighter)
      y += 0.08 * Math.tanh(x * 25); // Tight harmonics
      
      // MULTI-WATT (simulating 100W mode - more headroom)
      y += 0.05 * Math.tanh(x * 40); // Extra saturation
      
      // 6L6 POWER TUBES (tight, modern)
      if (x > 0) {
        y *= 1.22; // Strong asymmetry
      } else {
        y *= 1.05; // Tight negative cycle
      }
      
      // PRESENCE CONTROL (high-frequency emphasis)
      y += 0.1 * Math.sin(x * Math.PI * 9);
      
      curve[i] = y * 0.68;
    }
    return curve;
  }

  makeSuhrBadgerCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // SUHR BADGER: Articulate boutique, British voicing
      
      // BRITISH VOICING (EL34 based)
      let y = Math.tanh(x * 3.5);
      
      // ARTICULATION (note clarity)
      y += 0.12 * Math.tanh(x * 7); // Harmonic detail
      
      // BRITISH MIDS (characteristic presence)
      y += 0.08 * Math.tanh(x * 10.5); // Mid focus
      
      // TOUCH RESPONSIVENESS
      const touch = 1 + (Math.abs(x) * 0.18);
      y *= touch;
      
      // SMOOTH COMPRESSION (boutique quality)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.55);
      }
      
      // EL34 asymmetry
      if (x > 0) y *= 1.12;
      
      curve[i] = y * 0.83;
    }
    return curve;
  }

  makeVictoryDuchessCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // VICTORY DUCHESS: Modern British clarity, high headroom
      
      // HIGH HEADROOM (modern design)
      let y = Math.tanh(x * 4.5);
      y = Math.tanh(y * 1.2);
      
      // MODERN VOICING (tight, focused)
      y += 0.06 * Math.tanh(x * 13.5); // Detail
      
      // PRESENCE (modern top end)
      y += 0.08 * Math.sin(x * Math.PI * 5);
      
      // TIGHT LOW END (modern characteristic)
      if (x < -0.2) {
        y *= 0.96;
      }
      
      // KT88/EL34 hybrid character
      if (x > 0) y *= 1.12;
      
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
    // Delegate to dedicated amp if present
    if (this.useDedicatedAmp && this.dedicatedAmp) {
      this.dedicatedAmp.updateParameter(parameter, value);
      return;
    }
    
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

