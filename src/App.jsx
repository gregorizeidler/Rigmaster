import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Guitar, Speaker, Sliders, Zap, Flame, Waves, Sparkles, 
  Radio, Repeat, Clock, Timer, Cloud, CloudRain, CircleDot,
  Volume2, Activity, Settings, Target, Shuffle, Sparkle,
  Music, Music2, Music3, Music4, TrendingUp, Minimize2,
  Filter, Blend, Circle, Square, Triangle, Save, BookOpen,
  Library, Layers, Crosshair, RotateCw, Play, Pause, Disc,
  FileAudio, Cpu, Power, Inbox, Eye, EyeOff, Check, X, Plus,
  Minus, MoreHorizontal, ChevronDown, ChevronUp, Lock, Unlock,
  AlertCircle, Info, HelpCircle, Search, Settings2
} from 'lucide-react';
import AudioEngine from './audio/AudioEngine';
import BaseEffect from './audio/effects/BaseEffect';
import DistortionEffect from './audio/effects/DistortionEffect';
import DelayEffect from './audio/effects/DelayEffect';
import ChorusEffect from './audio/effects/ChorusEffect';
import ReverbEffect from './audio/effects/ReverbEffect';
import AmpSimulator from './audio/effects/AmpSimulator';
import OverdriveEffect from './audio/effects/OverdriveEffect';
import FuzzEffect from './audio/effects/FuzzEffect';
import PhaserEffect from './audio/effects/PhaserEffect';
import FlangerEffect from './audio/effects/FlangerEffect';
import CompressorEffect from './audio/effects/CompressorEffect';
import EQEffect from './audio/effects/EQEffect';
import TremoloEffect from './audio/effects/TremoloEffect';
import NoiseGateEffect from './audio/effects/NoiseGateEffect';
import WahEffect from './audio/effects/WahEffect';
import LooperEffect from './audio/effects/LooperEffect';
import OctaverEffect from './audio/effects/OctaverEffect';
import BitCrusherEffect from './audio/effects/BitCrusherEffect';
import PitchShifterEffect from './audio/effects/PitchShifterEffect';
import AutoWahEffect from './audio/effects/AutoWahEffect';
import SlicerEffect from './audio/effects/SlicerEffect';
import UniVibeEffect from './audio/effects/UniVibeEffect';
import RotaryEffect from './audio/effects/RotaryEffect';
import VibratoEffect from './audio/effects/VibratoEffect';
import RingModulatorEffect from './audio/effects/RingModulatorEffect';
import EnvelopeFilterEffect from './audio/effects/EnvelopeFilterEffect';
import TapeEchoEffect from './audio/effects/TapeEchoEffect';
import SpringReverbEffect from './audio/effects/SpringReverbEffect';
import ShimmerReverbEffect from './audio/effects/ShimmerReverbEffect';
import WhammyEffect from './audio/effects/WhammyEffect';
import TubeScreamerEffect from './audio/effects/TubeScreamerEffect';
import BigMuffEffect from './audio/effects/BigMuffEffect';
import MetalDistortionEffect from './audio/effects/MetalDistortionEffect';
import BoostEffect from './audio/effects/BoostEffect';
import HallReverbEffect from './audio/effects/HallReverbEffect';
import PlateReverbEffect from './audio/effects/PlateReverbEffect';
import RoomReverbEffect from './audio/effects/RoomReverbEffect';
import GraphicEQEffect from './audio/effects/GraphicEQEffect';
import LimiterEffect from './audio/effects/LimiterEffect';
import TubeCompressorEffect from './audio/effects/TubeCompressorEffect';
import AutoPanEffect from './audio/effects/AutoPanEffect';
// CLASSIC PEDALS
import BossDS1Effect from './audio/effects/BossDS1Effect';
import KlonCentaurEffect from './audio/effects/KlonCentaurEffect';
import ProCoRATEffect from './audio/effects/ProCoRATEffect';
import FuzzFaceEffect from './audio/effects/FuzzFaceEffect';
import MXRPhase90Effect from './audio/effects/MXRPhase90Effect';
import CryBabyWahEffect from './audio/effects/CryBabyWahEffect';
import MXRDynaCompEffect from './audio/effects/MXRDynaCompEffect';
import BossBD2Effect from './audio/effects/BossBD2Effect';
import MemoryManEffect from './audio/effects/MemoryManEffect';
import BossCE1Effect from './audio/effects/BossCE1Effect';
import BossTR2Effect from './audio/effects/BossTR2Effect';
import MXRCarbonCopyEffect from './audio/effects/MXRCarbonCopyEffect';
import BossSD1Effect from './audio/effects/BossSD1Effect';
import FulltoneOCDEffect from './audio/effects/FulltoneOCDEffect';
import MXRDistortionPlusEffect from './audio/effects/MXRDistortionPlusEffect';
import BossBF2Effect from './audio/effects/BossBF2Effect';
import ZVexFuzzFactoryEffect from './audio/effects/ZVexFuzzFactoryEffect';
import TapeSaturationEffect from './audio/effects/TapeSaturationEffect';
import TimelineDelayEffect from './audio/effects/TimelineDelayEffect';
import BigskyReverbEffect from './audio/effects/BigskyReverbEffect';
// PROFESSIONAL RACK EFFECTS
import EventideTimeFactorEffect from './audio/effects/EventideTimeFactorEffect';
import BossDD500Effect from './audio/effects/BossDD500Effect';
import Line6DL4Effect from './audio/effects/Line6DL4Effect';
import EventideSpaceEffect from './audio/effects/EventideSpaceEffect';
import BossRV500Effect from './audio/effects/BossRV500Effect';
import StrymonMobiusEffect from './audio/effects/StrymonMobiusEffect';
import EventideH9Effect from './audio/effects/EventideH9Effect';
import MesaBoogieVTwinEffect from './audio/effects/MesaBoogieVTwinEffect';
import Tech21SansAmpEffect from './audio/effects/Tech21SansAmpEffect';
// NEW EFFECTS 2024
import XoticBBPreampEffect from './audio/effects/XoticBBPreampEffect';
import XoticEPBoosterEffect from './audio/effects/XoticEPBoosterEffect';
import JHSSuperBoltEffect from './audio/effects/JHSSuperBoltEffect';
import KeeleyCompressorEffect from './audio/effects/KeeleyCompressorEffect';
import MXR10BandEQEffect from './audio/effects/MXR10BandEQEffect';
import WalrusJuliaEffect from './audio/effects/WalrusJuliaEffect';
import EHXHolyGrailEffect from './audio/effects/EHXHolyGrailEffect';
import TCHallOfFameEffect from './audio/effects/TCHallOfFameEffect';
// NEW EFFECTS 2025 - Drive/Distortion/Fuzz
import IbanezTS808Effect from './audio/effects/IbanezTS808Effect';
import BossOD3Effect from './audio/effects/BossOD3Effect';
import MaxonOD808Effect from './audio/effects/MaxonOD808Effect';
import WamplerTumnusEffect from './audio/effects/WamplerTumnusEffect';
import JHSMorningGloryEffect from './audio/effects/JHSMorningGloryEffect';
import EHXSoulFoodEffect from './audio/effects/EHXSoulFoodEffect';
import HermidaZendriveEffect from './audio/effects/HermidaZendriveEffect';
import PaulCochraneTimmy from './audio/effects/PaulCochraneTimmy';
import FriedmanBEODEffect from './audio/effects/FriedmanBEODEffect';
import SuhrRiotEffect from './audio/effects/SuhrRiotEffect';
import CatalinbreadDLSEffect from './audio/effects/CatalinbreadDLSEffect';
import BognerEcstasyBlueEffect from './audio/effects/BognerEcstasyBlueEffect';
import EarthquakerPlumesEffect from './audio/effects/EarthquakerPlumesEffect';
import DOD250Effect from './audio/effects/DOD250Effect';
import DarkglassB7KEffect from './audio/effects/DarkglassB7KEffect';
import WayHugeSwollenPickleEffect from './audio/effects/WayHugeSwollenPickleEffect';
import EHXGreenRussianBigMuffEffect from './audio/effects/EHXGreenRussianBigMuffEffect';
import FuzzlordChimeEffect from './audio/effects/FuzzlordChimeEffect';
import DigitechBadMonkeyEffect from './audio/effects/DigitechBadMonkeyEffect';
import LovepedalAmp11Effect from './audio/effects/LovepedalAmp11Effect';
import FulltoneFulldrive2Effect from './audio/effects/FulltoneFulldrive2Effect';
// NEW EFFECTS 2025 - Modulation
import TCCoronaChorusEffect from './audio/effects/TCCoronaChorusEffect';
import StrymonOlaEffect from './audio/effects/StrymonOlaEffect';
import EHXSmallStoneEffect from './audio/effects/EHXSmallStoneEffect';
import MXRPhase100Effect from './audio/effects/MXRPhase100Effect';
import EHXElectricMistressEffect from './audio/effects/EHXElectricMistressEffect';
import TCVortexFlangerEffect from './audio/effects/TCVortexFlangerEffect';
import FulltoneDejaVibeEffect from './audio/effects/FulltoneDejaVibeEffect';
import DunlopRotovibe from './audio/effects/DunlopRotovibe';
import DiamondTremoloEffect from './audio/effects/DiamondTremoloEffect';
import ChaseBlissWarpedVinylEffect from './audio/effects/ChaseBlissWarpedVinylEffect';
import EHXPolyChorusEffect from './audio/effects/EHXPolyChorusEffect';
import TCShakerVibratoEffect from './audio/effects/TCShakerVibratoEffect';
import WalrusMonumentEffect from './audio/effects/WalrusMonumentEffect';
import RedPandaParticleEffect from './audio/effects/RedPandaParticleEffect';
import MerisEnzoEffect from './audio/effects/MerisEnzoEffect';
// NEW EFFECTS 2025 - Time-Based
import TCFlashbackEffect from './audio/effects/TCFlashbackEffect';
import WayHugeSupaPussEffect from './audio/effects/WayHugeSupaPussEffect';
import WalrusARP87Effect from './audio/effects/WalrusARP87Effect';
import EQDDispatchMasterEffect from './audio/effects/EQDDispatchMasterEffect';
import BossDD3Effect from './audio/effects/BossDD3Effect';
import BossDD7Effect from './audio/effects/BossDD7Effect';
import MaxonAD999Effect from './audio/effects/MaxonAD999Effect';
import EmpressEchosystemEffect from './audio/effects/EmpressEchosystemEffect';
import ChaseBlissThermaeEffect from './audio/effects/ChaseBlissThermaeEffect';
import CatalinbreadBelleEpochEffect from './audio/effects/CatalinbreadBelleEpochEffect';
import StrymonElCapistanEffect from './audio/effects/StrymonElCapistanEffect';
import StrymonFlintEffect from './audio/effects/StrymonFlintEffect';
import NeunaberImmerseEffect from './audio/effects/NeunaberImmerseEffect';
import EHXCathedralEffect from './audio/effects/EHXCathedralEffect';
import WalrusSloEffect from './audio/effects/WalrusSloEffect';
import OBNDarkStarEffect from './audio/effects/OBNDarkStarEffect';
import MerisMercury7Effect from './audio/effects/MerisMercury7Effect';
import RedPandaContextEffect from './audio/effects/RedPandaContextEffect';
import RedPandaTensorEffect from './audio/effects/RedPandaTensorEffect';
// NEW EFFECTS 2025 - Dynamics
import FMRAudioRNCEffect from './audio/effects/FMRAudioRNCEffect';
import EmpressCompressorEffect from './audio/effects/EmpressCompressorEffect';
import Cali76Effect from './audio/effects/Cali76Effect';
import WalrusDeepSixEffect from './audio/effects/WalrusDeepSixEffect';
import EHXBlackFingerEffect from './audio/effects/EHXBlackFingerEffect';
import PigtronixPhilosopherEffect from './audio/effects/PigtronixPhilosopherEffect';
import TCHyperGravityEffect from './audio/effects/TCHyperGravityEffect';
import BossCS3Effect from './audio/effects/BossCS3Effect';
import WamplerEgoEffect from './audio/effects/WamplerEgoEffect';
import DemeterCompulatorEffect from './audio/effects/DemeterCompulatorEffect';
// NEW EFFECTS 2025 - EQ & Filters
import BossGE7Effect from './audio/effects/BossGE7Effect';
import SourceAudioEQ2Effect from './audio/effects/SourceAudioEQ2Effect';
import EmpressParaEQEffect from './audio/effects/EmpressParaEQEffect';
import EHXTalkingMachineEffect from './audio/effects/EHXTalkingMachineEffect';
import MoogMF101Effect from './audio/effects/MoogMF101Effect';
import DOD440Effect from './audio/effects/DOD440Effect';
import MuTronIIIEffect from './audio/effects/MuTronIIIEffect';
import EHXQTronEffect from './audio/effects/EHXQTronEffect';
import Dunlop105QEffect from './audio/effects/Dunlop105QEffect';
import MorleyBadHorsieEffect from './audio/effects/MorleyBadHorsieEffect';
// NEW EFFECTS 2025 - Pitch & Synth
import EHXPOGEffect from './audio/effects/EHXPOGEffect';
import EHXMicroPOGEffect from './audio/effects/EHXMicroPOGEffect';
import EHXHOGEffect from './audio/effects/EHXHOGEffect';
import BossPS6Effect from './audio/effects/BossPS6Effect';
import TCSubNUpEffect from './audio/effects/TCSubNUpEffect';
import EHXPitchForkEffect from './audio/effects/EHXPitchForkEffect';
import EventidePitchFactorEffect from './audio/effects/EventidePitchFactorEffect';
import BossOC5Effect from './audio/effects/BossOC5Effect';
import EHXFreezeEffect from './audio/effects/EHXFreezeEffect';
import MerisHedraEffect from './audio/effects/MerisHedraEffect';
import ChaseBlissMoodEffect from './audio/effects/ChaseBlissMoodEffect';
// NEW EFFECTS 2025 - Multi-FX
import Line6HelixEffect from './audio/effects/Line6HelixEffect';
import FractalAxeFXEffect from './audio/effects/FractalAxeFXEffect';
import KemperProfilerEffect from './audio/effects/KemperProfilerEffect';
import NeuralDSPQuadCortexEffect from './audio/effects/NeuralDSPQuadCortexEffect';
import BossGT1000Effect from './audio/effects/BossGT1000Effect';
import HeadrushPedalboardEffect from './audio/effects/HeadrushPedalboardEffect';
import Pedal from './components/Pedal';
import AmpComponent from './components/AmpComponent';
import VUMeter from './components/VUMeter';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import ThemeSelector from './components/ThemeSelector';
import PresetBrowser from './components/PresetBrowser';
import SignalFlow from './components/SignalFlow';
import EffectIcon from './components/EffectIcon';
import RecorderPanel from './components/RecorderPanel';
import InputMonitor from './components/InputMonitor';
import AudioDeviceSelector from './components/AudioDeviceSelector';
import AudioFileInput from './components/AudioFileInput';
import PresetManager from './utils/PresetManager';
import { useTheme } from './contexts/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import presetService from './services/presetService';
import './App.css';

function App() {
  const { theme, zoomLevel } = useTheme();
  const [effects, setEffects] = useState([]);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null);
  const [usingAudioFile, setUsingAudioFile] = useState(false);
  const [presets, setPresets] = useState([]);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [showPresetBrowser, setShowPresetBrowser] = useState(false);
  const [presetManager] = useState(() => new PresetManager());
  
  // Master Volume & Input Gain
  const [masterVolume, setMasterVolumeState] = useState(80);
  const [inputGain, setInputGainState] = useState(50);
  
  // BPM / Tap Tempo
  const [bpm, setBpmState] = useState(120);
  
  // CPU Meter
  const [cpuUsage, setCpuUsage] = useState(0);
  
  // MIDI
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiInputs, setMidiInputs] = useState([]);
  const [midiLearnActive, setMidiLearnActive] = useState(false);
  const [midiSupported, setMidiSupported] = useState(false);
  
  // Undo/Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const audioEngineRef = useRef(null);
  const nextIdRef = useRef(1);
  const cpuIntervalRef = useRef(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    
    // Check backend connection
    presetService.checkBackendStatus().then(status => {
      setBackendConnected(status);
      if (status) {
        loadPresets();
      }
    });
    
    return () => {
      if (cpuIntervalRef.current) {
        clearInterval(cpuIntervalRef.current);
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);

  // CPU meter polling
  useEffect(() => {
    if (isAudioActive && audioEngineRef.current) {
      cpuIntervalRef.current = setInterval(() => {
        if (audioEngineRef.current) {
          setCpuUsage(audioEngineRef.current.getCpuUsage());
        }
      }, 500);
    } else {
      if (cpuIntervalRef.current) {
        clearInterval(cpuIntervalRef.current);
        cpuIntervalRef.current = null;
      }
      setCpuUsage(0);
    }
    return () => {
      if (cpuIntervalRef.current) {
        clearInterval(cpuIntervalRef.current);
      }
    };
  }, [isAudioActive]);

  // ============================================
  // UNDO / REDO SYSTEM
  // ============================================
  const pushUndoState = (currentEffects) => {
    const snapshot = currentEffects.map(e => ({
      type: e.type,
      params: { ...e.params },
      bypassed: e.bypassed,
      ampType: e.ampType
    }));
    setUndoStack(prev => [...prev.slice(-30), snapshot]); // keep last 30 states
    setRedoStack([]); // clear redo on new action
  };

  const restoreEffectsFromSnapshot = (snapshot) => {
    if (!audioEngineRef.current?.audioContext) return;
    
    // Remove all current effects
    effects.forEach(e => {
      try { audioEngineRef.current.removeEffect(e.id); } catch (err) {}
    });
    
    // Recreate from snapshot
    const newEffects = [];
    snapshot.forEach(data => {
      const newEffect = addEffectToEngine(data.type, data);
      if (newEffect) {
        if (data.params) {
          Object.entries(data.params).forEach(([param, value]) => {
            try { newEffect.instance.updateParameter(param, value); } catch (err) {}
          });
        }
        if (data.bypassed && newEffect.instance.toggleBypass) {
          newEffect.instance.toggleBypass();
        }
        newEffects.push(newEffect);
      }
    });
    
    setEffects(newEffects);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    // Save current state to redo
    const currentSnapshot = effects.map(e => ({
      type: e.type,
      params: { ...e.params },
      bypassed: e.bypassed,
      ampType: e.ampType
    }));
    setRedoStack(prev => [...prev, currentSnapshot]);
    
    // Pop last undo state
    const newUndoStack = [...undoStack];
    const prevState = newUndoStack.pop();
    setUndoStack(newUndoStack);
    
    restoreEffectsFromSnapshot(prevState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    // Save current state to undo
    const currentSnapshot = effects.map(e => ({
      type: e.type,
      params: { ...e.params },
      bypassed: e.bypassed,
      ampType: e.ampType
    }));
    setUndoStack(prev => [...prev, currentSnapshot]);
    
    // Pop last redo state
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop();
    setRedoStack(newRedoStack);
    
    restoreEffectsFromSnapshot(nextState);
  };

  // ============================================
  // MASTER VOLUME & INPUT GAIN HANDLERS
  // ============================================
  const handleMasterVolumeChange = (value) => {
    const v = Number(value);
    setMasterVolumeState(v);
    if (audioEngineRef.current) {
      audioEngineRef.current.setMasterVolume(v);
    }
  };

  const handleInputGainChange = (value) => {
    const v = Number(value);
    setInputGainState(v);
    if (audioEngineRef.current) {
      audioEngineRef.current.setInputGain(v);
    }
  };

  // ============================================
  // BPM / TAP TEMPO HANDLERS
  // ============================================
  const handleBpmChange = (value) => {
    const v = Math.max(20, Math.min(300, Number(value)));
    setBpmState(v);
    if (audioEngineRef.current) {
      audioEngineRef.current.setBPM(v);
    }
  };

  const handleTapTempo = () => {
    if (audioEngineRef.current) {
      const newBpm = audioEngineRef.current.tapTempo();
      setBpmState(newBpm);
    }
  };

  // ============================================
  // MIDI HANDLER
  // ============================================
  const handleMidiToggle = async () => {
    if (!midiEnabled && audioEngineRef.current) {
      const result = await audioEngineRef.current.initMIDI();
      setMidiSupported(result.supported);
      if (result.supported) {
        setMidiInputs(result.inputs);
        setMidiEnabled(true);
        
        // Set up MIDI CC callback for UI updates
        audioEngineRef.current.onMidiCC((mapping, value) => {
          if (mapping.effectId === '__master__') {
            setMasterVolumeState(Math.round(value));
          } else if (mapping.effectId === '__input__') {
            setInputGainState(Math.round(value));
          } else if (mapping.effectId === '__bpm__') {
            setBpmState(Math.round(value));
          }
        });
      } else {
        alert('Web MIDI API not supported in this browser. Try Chrome or Edge.');
      }
    } else {
      setMidiEnabled(false);
      setMidiLearnActive(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    ' ': () => setShowAddMenu(true),
    'escape': () => {
      setShowAddMenu(false);
      setShowPresetMenu(false);
    },
    'delete': () => {
      if (selectedEffect) {
        removeEffect(selectedEffect);
      }
    },
    'backspace': () => {
      if (selectedEffect) {
        removeEffect(selectedEffect);
      }
    },
    'b': () => {
      if (selectedEffect) {
        toggleBypass(selectedEffect);
      }
    },
    'ctrl+s': () => saveCurrentPreset(),
    'ctrl+o': () => setShowPresetMenu(true),
    'ctrl+n': () => clearEffects(),
    'ctrl+z': () => undo(),
    'ctrl+shift+z': () => redo(),
    'ctrl+y': () => redo(),
  });

  const startAudio = async () => {
    if (audioEngineRef.current && !isAudioActive) {
      const success = await audioEngineRef.current.initialize(selectedAudioDevice);
      if (success) {
        // Wait for audioContext to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsAudioActive(true);
        
        // Re-create existing effects with the new audio context
        if (effects.length > 0) {
          console.log(`🔄 Recreating ${effects.length} effects with new AudioContext`);
          const savedEffectsData = effects.map(e => ({
            type: e.type,
            params: e.params,
            bypassed: e.bypassed,
            ampType: e.ampType
          }));
          
          // Clear old effects from state
          setEffects([]);
          
          // Recreate effects with new audio context
          const newEffects = [];
          savedEffectsData.forEach(effectData => {
            const newEffect = addEffectToEngine(effectData.type, effectData);
            if (newEffect) {
              // Restore parameters
              if (effectData.params) {
                Object.entries(effectData.params).forEach(([param, value]) => {
                  newEffect.instance.updateParameter(param, value);
                });
              }
              // Restore bypass state
              if (effectData.bypassed && newEffect.instance.toggleBypass) {
                newEffect.instance.toggleBypass();
              }
              newEffects.push(newEffect);
            }
          });
          
          setEffects(newEffects);
        }
      }
    }
  };

  const handleDeviceChange = async (deviceId, deviceInfo) => {
    console.log('Selected device:', deviceInfo);
    setSelectedAudioDevice(deviceId);
    
    // If audio is already active, restart with new device
    if (isAudioActive) {
      // Save current effects state
      const savedEffectsData = effects.map(e => ({
        type: e.type,
        params: e.params,
        bypassed: e.bypassed,
        ampType: e.ampType
      }));
      
      // Stop current audio
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setIsAudioActive(false);
      setEffects([]);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Restart with new device
      const success = await audioEngineRef.current.initialize(deviceId);
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsAudioActive(true);
        
        // Recreate effects with new audio context
        console.log(`🔄 Recreating ${savedEffectsData.length} effects with new device`);
        const newEffects = [];
        savedEffectsData.forEach(effectData => {
          const newEffect = addEffectToEngine(effectData.type, effectData);
          if (newEffect) {
            // Restore parameters
            if (effectData.params) {
              Object.entries(effectData.params).forEach(([param, value]) => {
                newEffect.instance.updateParameter(param, value);
              });
            }
            // Restore bypass state
            if (effectData.bypassed && newEffect.instance.toggleBypass) {
              newEffect.instance.toggleBypass();
            }
            newEffects.push(newEffect);
          }
        });
        
        setEffects(newEffects);
      }
    }
  };

  const addEffectToEngine = (type, effectData = null) => {
    const id = effectData?.id || `effect-${nextIdRef.current++}`;
    let effectInstance;
    
    const audioContext = audioEngineRef.current?.audioContext;
    
    // Se o audioContext não estiver inicializado, retorna null
    if (!audioContext) {
      console.warn('AudioContext not initialized yet. Please start audio first.');
      return null;
    }
    
    switch (type) {
      case 'distortion':
        effectInstance = new DistortionEffect(audioContext, id);
        break;
      case 'overdrive':
        effectInstance = new OverdriveEffect(audioContext, id);
        break;
      case 'fuzz':
        effectInstance = new FuzzEffect(audioContext, id);
        break;
      case 'delay':
        effectInstance = new DelayEffect(audioContext, id);
        break;
      case 'chorus':
        effectInstance = new ChorusEffect(audioContext, id);
        break;
      case 'phaser':
        effectInstance = new PhaserEffect(audioContext, id);
        break;
      case 'flanger':
        effectInstance = new FlangerEffect(audioContext, id);
        break;
      case 'reverb':
        effectInstance = new ReverbEffect(audioContext, id);
        break;
      case 'compressor':
        effectInstance = new CompressorEffect(audioContext, id);
        break;
      case 'eq':
        effectInstance = new EQEffect(audioContext, id);
        break;
      case 'tremolo':
        effectInstance = new TremoloEffect(audioContext, id);
        break;
      case 'noisegate':
        effectInstance = new NoiseGateEffect(audioContext);
        break;
      case 'wah':
        effectInstance = new WahEffect(audioContext);
        break;
      case 'looper':
        effectInstance = new LooperEffect(audioContext);
        break;
      case 'octaver':
        effectInstance = new OctaverEffect(audioContext);
        break;
      case 'bitcrusher':
        effectInstance = new BitCrusherEffect(audioContext);
        break;
      case 'pitchshifter':
        effectInstance = new PitchShifterEffect(audioContext);
        break;
      case 'autowah':
        effectInstance = new AutoWahEffect(audioContext);
        break;
      case 'slicer':
        effectInstance = new SlicerEffect(audioContext, id);
        break;
      case 'univibe':
        effectInstance = new UniVibeEffect(audioContext, id);
        break;
      case 'rotary':
        effectInstance = new RotaryEffect(audioContext, id);
        break;
      case 'vibrato':
        effectInstance = new VibratoEffect(audioContext, id);
        break;
      case 'ringmod':
        effectInstance = new RingModulatorEffect(audioContext, id);
        break;
      case 'envfilter':
        effectInstance = new EnvelopeFilterEffect(audioContext, id);
        break;
      case 'tapeecho':
        effectInstance = new TapeEchoEffect(audioContext, id);
        break;
      case 'springreverb':
        effectInstance = new SpringReverbEffect(audioContext, id);
        break;
      case 'shimmerreverb':
        effectInstance = new ShimmerReverbEffect(audioContext, id);
        break;
      case 'whammy':
        effectInstance = new WhammyEffect(audioContext, id);
        break;
      case 'tubescreamer':
        effectInstance = new TubeScreamerEffect(audioContext, id);
        break;
      case 'bigmuff':
        effectInstance = new BigMuffEffect(audioContext, id);
        break;
      case 'amp':
        effectInstance = new AmpSimulator(audioContext, id, effectData?.ampType || 'fender_twin_reverb');
        break;
      
      // NOVOS EFEITOS IMPLEMENTADOS
      case 'metaldistortion':
        effectInstance = new MetalDistortionEffect(audioContext, id);
        break;
      case 'boost':
        effectInstance = new BoostEffect(audioContext, id);
        break;
      case 'hallreverb':
        effectInstance = new HallReverbEffect(audioContext, id);
        break;
      case 'platereverb':
        effectInstance = new PlateReverbEffect(audioContext, id);
        break;
      case 'roomreverb':
        effectInstance = new RoomReverbEffect(audioContext, id);
        break;
      case 'graphiceq':
        effectInstance = new GraphicEQEffect(audioContext, id);
        break;
      case 'limiter':
        effectInstance = new LimiterEffect(audioContext, id);
        break;
      case 'tubecompressor':
        effectInstance = new TubeCompressorEffect(audioContext, id);
        break;
      case 'autopan':
        effectInstance = new AutoPanEffect(audioContext, id);
        break;
      
      // CLASSIC PEDALS
      case 'bossds1':
        effectInstance = new BossDS1Effect(audioContext, id);
        break;
      case 'kloncentaur':
        effectInstance = new KlonCentaurEffect(audioContext, id);
        break;
      case 'procorat':
        effectInstance = new ProCoRATEffect(audioContext, id);
        break;
      case 'fuzzface':
        effectInstance = new FuzzFaceEffect(audioContext, id);
        break;
      case 'mxrphase90':
        effectInstance = new MXRPhase90Effect(audioContext, id);
        break;
      case 'crybabywah':
        effectInstance = new CryBabyWahEffect(audioContext, id);
        break;
      case 'mxrdynacomp':
        effectInstance = new MXRDynaCompEffect(audioContext, id);
        break;
      case 'bossbd2':
        effectInstance = new BossBD2Effect(audioContext, id);
        break;
      case 'memoryman':
        effectInstance = new MemoryManEffect(audioContext, id);
        break;
      case 'bossce1':
        effectInstance = new BossCE1Effect(audioContext, id);
        break;
      case 'bosstr2':
        effectInstance = new BossTR2Effect(audioContext, id);
        break;
      case 'mxrcarboncopy':
        effectInstance = new MXRCarbonCopyEffect(audioContext, id);
        break;
      case 'bosssd1':
        effectInstance = new BossSD1Effect(audioContext, id);
        break;
      case 'fulltoneocd':
        effectInstance = new FulltoneOCDEffect(audioContext, id);
        break;
      case 'mxrdistortionplus':
        effectInstance = new MXRDistortionPlusEffect(audioContext, id);
        break;
      case 'bossbf2':
        effectInstance = new BossBF2Effect(audioContext, id);
        break;
      case 'zvexfuzzfactory':
        effectInstance = new ZVexFuzzFactoryEffect(audioContext, id);
        break;
      case 'tapesaturation':
        effectInstance = new TapeSaturationEffect(audioContext, id);
        break;
      case 'timelinedelay':
        effectInstance = new TimelineDelayEffect(audioContext, id);
        break;
      case 'bigskyreverb':
        effectInstance = new BigskyReverbEffect(audioContext, id);
        break;
      
      // PROFESSIONAL RACK EFFECTS
      case 'eventidetimefactor':
        effectInstance = new EventideTimeFactorEffect(audioContext, id);
        break;
      case 'bossdd500':
        effectInstance = new BossDD500Effect(audioContext, id);
        break;
      case 'line6dl4':
        effectInstance = new Line6DL4Effect(audioContext, id);
        break;
      case 'eventidespace':
        effectInstance = new EventideSpaceEffect(audioContext, id);
        break;
      case 'bossrv500':
        effectInstance = new BossRV500Effect(audioContext, id);
        break;
      case 'strymonmobius':
        effectInstance = new StrymonMobiusEffect(audioContext, id);
        break;
      case 'eventideh9':
        effectInstance = new EventideH9Effect(audioContext, id);
        break;
      case 'mesavtwin':
        effectInstance = new MesaBoogieVTwinEffect(audioContext, id);
        break;
      case 'tech21sansamp':
        effectInstance = new Tech21SansAmpEffect(audioContext, id);
        break;
      
      // NEW EFFECTS 2024
      case 'xoticbb':
        effectInstance = new XoticBBPreampEffect(audioContext, id);
        break;
      case 'xoticep':
        effectInstance = new XoticEPBoosterEffect(audioContext, id);
        break;
      case 'jhssuperbolt':
        effectInstance = new JHSSuperBoltEffect(audioContext, id);
        break;
      case 'keeleycomp':
        effectInstance = new KeeleyCompressorEffect(audioContext, id);
        break;
      case 'mxr10bandeq':
        effectInstance = new MXR10BandEQEffect(audioContext, id);
        break;
      case 'walrusjulia':
        effectInstance = new WalrusJuliaEffect(audioContext, id);
        break;
      case 'ehxholygrail':
        effectInstance = new EHXHolyGrailEffect(audioContext, id);
        break;
      case 'tchalloffame':
        effectInstance = new TCHallOfFameEffect(audioContext, id);
        break;
      
      // NEW EFFECTS 2025 - Drive
      case 'ts808': effectInstance = new IbanezTS808Effect(audioContext, id); break;
      case 'bossod3': effectInstance = new BossOD3Effect(audioContext, id); break;
      case 'maxonod808': effectInstance = new MaxonOD808Effect(audioContext, id); break;
      case 'tumnus': effectInstance = new WamplerTumnusEffect(audioContext, id); break;
      case 'morningglory': effectInstance = new JHSMorningGloryEffect(audioContext, id); break;
      case 'soulfood': effectInstance = new EHXSoulFoodEffect(audioContext, id); break;
      case 'zendrive': effectInstance = new HermidaZendriveEffect(audioContext, id); break;
      case 'timmy': effectInstance = new PaulCochraneTimmy(audioContext, id); break;
      case 'friedmanbeod': effectInstance = new FriedmanBEODEffect(audioContext, id); break;
      case 'suhrriot': effectInstance = new SuhrRiotEffect(audioContext, id); break;
      case 'catalinbreaddls': effectInstance = new CatalinbreadDLSEffect(audioContext, id); break;
      case 'bognerecstasyblue': effectInstance = new BognerEcstasyBlueEffect(audioContext, id); break;
      case 'plumes': effectInstance = new EarthquakerPlumesEffect(audioContext, id); break;
      case 'dod250': effectInstance = new DOD250Effect(audioContext, id); break;
      case 'darkglassb7k': effectInstance = new DarkglassB7KEffect(audioContext, id); break;
      case 'swollenpickle': effectInstance = new WayHugeSwollenPickleEffect(audioContext, id); break;
      case 'greenrussian': effectInstance = new EHXGreenRussianBigMuffEffect(audioContext, id); break;
      case 'fuzzlordchime': effectInstance = new FuzzlordChimeEffect(audioContext, id); break;
      case 'badmonkey': effectInstance = new DigitechBadMonkeyEffect(audioContext, id); break;
      case 'amp11': effectInstance = new LovepedalAmp11Effect(audioContext, id); break;
      case 'fulldrive2': effectInstance = new FulltoneFulldrive2Effect(audioContext, id); break;
      // NEW EFFECTS 2025 - Modulation
      case 'tccorona': effectInstance = new TCCoronaChorusEffect(audioContext, id); break;
      case 'strymonola': effectInstance = new StrymonOlaEffect(audioContext, id); break;
      case 'smallstone': effectInstance = new EHXSmallStoneEffect(audioContext, id); break;
      case 'phase100': effectInstance = new MXRPhase100Effect(audioContext, id); break;
      case 'electricmistress': effectInstance = new EHXElectricMistressEffect(audioContext, id); break;
      case 'tcvortex': effectInstance = new TCVortexFlangerEffect(audioContext, id); break;
      case 'dejavibe': effectInstance = new FulltoneDejaVibeEffect(audioContext, id); break;
      case 'rotovibe': effectInstance = new DunlopRotovibe(audioContext, id); break;
      case 'diamondtrem': effectInstance = new DiamondTremoloEffect(audioContext, id); break;
      case 'warpedvinyl': effectInstance = new ChaseBlissWarpedVinylEffect(audioContext, id); break;
      case 'polychorus': effectInstance = new EHXPolyChorusEffect(audioContext, id); break;
      case 'tcshaker': effectInstance = new TCShakerVibratoEffect(audioContext, id); break;
      case 'monument': effectInstance = new WalrusMonumentEffect(audioContext, id); break;
      case 'particle': effectInstance = new RedPandaParticleEffect(audioContext, id); break;
      case 'merisenzo': effectInstance = new MerisEnzoEffect(audioContext, id); break;
      // NEW EFFECTS 2025 - Time-Based
      case 'tcflashback': effectInstance = new TCFlashbackEffect(audioContext, id); break;
      case 'supapuss': effectInstance = new WayHugeSupaPussEffect(audioContext, id); break;
      case 'arp87': effectInstance = new WalrusARP87Effect(audioContext, id); break;
      case 'dispatchmaster': effectInstance = new EQDDispatchMasterEffect(audioContext, id); break;
      case 'bossdd3': effectInstance = new BossDD3Effect(audioContext, id); break;
      case 'bossdd7': effectInstance = new BossDD7Effect(audioContext, id); break;
      case 'maxonad999': effectInstance = new MaxonAD999Effect(audioContext, id); break;
      case 'echosystem': effectInstance = new EmpressEchosystemEffect(audioContext, id); break;
      case 'thermae': effectInstance = new ChaseBlissThermaeEffect(audioContext, id); break;
      case 'belleepoch': effectInstance = new CatalinbreadBelleEpochEffect(audioContext, id); break;
      case 'elcapistan': effectInstance = new StrymonElCapistanEffect(audioContext, id); break;
      case 'strymonflint': effectInstance = new StrymonFlintEffect(audioContext, id); break;
      case 'immerse': effectInstance = new NeunaberImmerseEffect(audioContext, id); break;
      case 'cathedral': effectInstance = new EHXCathedralEffect(audioContext, id); break;
      case 'walrusslo': effectInstance = new WalrusSloEffect(audioContext, id); break;
      case 'darkstar': effectInstance = new OBNDarkStarEffect(audioContext, id); break;
      case 'mercury7': effectInstance = new MerisMercury7Effect(audioContext, id); break;
      case 'rpcontext': effectInstance = new RedPandaContextEffect(audioContext, id); break;
      case 'tensor': effectInstance = new RedPandaTensorEffect(audioContext, id); break;
      // NEW EFFECTS 2025 - Dynamics
      case 'fmrrnc': effectInstance = new FMRAudioRNCEffect(audioContext, id); break;
      case 'empresscomp': effectInstance = new EmpressCompressorEffect(audioContext, id); break;
      case 'cali76': effectInstance = new Cali76Effect(audioContext, id); break;
      case 'deepsix': effectInstance = new WalrusDeepSixEffect(audioContext, id); break;
      case 'blackfinger': effectInstance = new EHXBlackFingerEffect(audioContext, id); break;
      case 'philosopher': effectInstance = new PigtronixPhilosopherEffect(audioContext, id); break;
      case 'hypergravity': effectInstance = new TCHyperGravityEffect(audioContext, id); break;
      case 'bosscs3': effectInstance = new BossCS3Effect(audioContext, id); break;
      case 'wamplerego': effectInstance = new WamplerEgoEffect(audioContext, id); break;
      case 'compulator': effectInstance = new DemeterCompulatorEffect(audioContext, id); break;
      // NEW EFFECTS 2025 - EQ & Filters
      case 'bossge7': effectInstance = new BossGE7Effect(audioContext, id); break;
      case 'sourceaudioeq2': effectInstance = new SourceAudioEQ2Effect(audioContext, id); break;
      case 'empressparaeq': effectInstance = new EmpressParaEQEffect(audioContext, id); break;
      case 'talkingmachine': effectInstance = new EHXTalkingMachineEffect(audioContext, id); break;
      case 'moogmf101': effectInstance = new MoogMF101Effect(audioContext, id); break;
      case 'dod440': effectInstance = new DOD440Effect(audioContext, id); break;
      case 'mutron': effectInstance = new MuTronIIIEffect(audioContext, id); break;
      case 'qtron': effectInstance = new EHXQTronEffect(audioContext, id); break;
      case 'dunlop105q': effectInstance = new Dunlop105QEffect(audioContext, id); break;
      case 'badhorsie': effectInstance = new MorleyBadHorsieEffect(audioContext, id); break;
      // NEW EFFECTS 2025 - Pitch & Synth
      case 'ehxpog': effectInstance = new EHXPOGEffect(audioContext, id); break;
      case 'micropog': effectInstance = new EHXMicroPOGEffect(audioContext, id); break;
      case 'ehxhog': effectInstance = new EHXHOGEffect(audioContext, id); break;
      case 'bossps6': effectInstance = new BossPS6Effect(audioContext, id); break;
      case 'subnup': effectInstance = new TCSubNUpEffect(audioContext, id); break;
      case 'pitchfork': effectInstance = new EHXPitchForkEffect(audioContext, id); break;
      case 'pitchfactor': effectInstance = new EventidePitchFactorEffect(audioContext, id); break;
      case 'bossoc5': effectInstance = new BossOC5Effect(audioContext, id); break;
      case 'freeze': effectInstance = new EHXFreezeEffect(audioContext, id); break;
      case 'hedra': effectInstance = new MerisHedraEffect(audioContext, id); break;
      case 'mood': effectInstance = new ChaseBlissMoodEffect(audioContext, id); break;
      // NEW EFFECTS 2025 - Multi-FX
      case 'helix': effectInstance = new Line6HelixEffect(audioContext, id); break;
      case 'axefx': effectInstance = new FractalAxeFXEffect(audioContext, id); break;
      case 'kemper': effectInstance = new KemperProfilerEffect(audioContext, id); break;
      case 'quadcortex': effectInstance = new NeuralDSPQuadCortexEffect(audioContext, id); break;
      case 'gt1000': effectInstance = new BossGT1000Effect(audioContext, id); break;
      case 'headrush': effectInstance = new HeadrushPedalboardEffect(audioContext, id); break;

      // EFEITOS AINDA NÃO IMPLEMENTADOS (usam BaseEffect)
      case 'tapdelay':
      case 'analogchorus':
      case 'analogflanger':
      case 'talkbox':
      case 'lfofilter':
      case 'stepfilter':
      case 'harmonizer':
      case 'detune':
      case 'stepslicer':
      case 'swell':
      case 'feedback':
      case 'vocoder':
      case 'volume':
      case 'tuner':
      case 'abtoggle':
      case 'splitter':
        // Estes efeitos usam BaseEffect por enquanto (passthrough com wet/dry mix)
        effectInstance = new BaseEffect(audioContext, id, type.charAt(0).toUpperCase() + type.slice(1), type);
        effectInstance.input.connect(effectInstance.wetGain);
        effectInstance.wetGain.connect(effectInstance.output);
        effectInstance.input.connect(effectInstance.dryGain);
        effectInstance.dryGain.connect(effectInstance.output);
        break;
      
      default:
        return null;
    }

    audioEngineRef.current.addEffect(effectInstance);
    
    return {
      id,
      type,
      name: effectInstance.name,
      bypassed: false,
      params: effectData?.params || {},
      ampType: effectData?.ampType || (type === 'amp' ? 'fender_twin_reverb' : undefined),
      instance: effectInstance
    };
  };

  const addEffect = (type) => {
    // Check if audio is active
    if (!isAudioActive) {
      alert('Por favor, clique em "START AUDIO" primeiro!');
      return;
    }
    
    // Check if audioContext is ready (with retry)
    if (!audioEngineRef.current?.audioContext) {
      console.warn('AudioContext not ready yet, retrying...');
      // Retry after a short delay
      setTimeout(() => {
        if (audioEngineRef.current?.audioContext) {
          addEffect(type); // Retry
        } else {
          alert('Erro ao inicializar áudio. Por favor, recarregue a página.');
        }
      }, 200);
      return;
    }

    const newEffect = addEffectToEngine(type);
    if (newEffect) {
      pushUndoState(effects);
      setEffects([...effects, newEffect]);
      setShowAddMenu(false);
    }
  };

  const removeEffect = (id) => {
    pushUndoState(effects);
    audioEngineRef.current.removeEffect(id);
    setEffects(effects.filter(e => e.id !== id));
  };

  const updateEffect = (id, parameter, value) => {
    // Se trocar o tipo de amplificador, precisa recriar o amp
    if (parameter === 'ampType') {
      const effect = effects.find(e => e.id === id);
      if (effect && effect.type === 'amp') {
        console.log(`🔄 Recreating amp: ${effect.ampType} → ${value}`);
        
        // Salvar parâmetros atuais
        const savedParams = { ...effect.params };
        const savedBypassed = effect.bypassed;
        
        // Remover amp antigo
        audioEngineRef.current.removeEffect(id);
        
        // Pequeno delay para garantir cleanup
        setTimeout(() => {
          // Criar novo amp com o novo tipo
          const newAmp = addEffectToEngine('amp', {
            id: id,
            ampType: value,
            params: { ...savedParams, ampType: value },
            bypassed: savedBypassed
          });
          
          if (newAmp) {
            // Atualizar estado React
            setEffects(effects.map(e => e.id === id ? newAmp : e));
            
            // CRÍTICO: Atualizar também o effectsChain interno do AudioEngine
            const effectIndex = audioEngineRef.current.effectsChain.findIndex(e => e.id === id);
            if (effectIndex !== -1) {
              audioEngineRef.current.effectsChain[effectIndex] = newAmp.instance;
              console.log(`🔄 Updated effectsChain[${effectIndex}] with new amp instance`);
            }
            
            // IMPORTANTE: Forçar reconexão da cadeia após criar o amp
            audioEngineRef.current.reconnectChain();
            console.log(`🔗 Chain reconnected after amp creation (usingAudioFile: ${audioEngineRef.current.usingAudioFile})`);
            
            // Restaurar parâmetros após um pequeno delay
            setTimeout(() => {
              // Garantir que master volume está sempre configurado
              if (newAmp.instance && newAmp.instance.updateParameter) {
                try {
                  // Aplicar master primeiro
                  const masterVol = savedParams.master !== undefined ? savedParams.master : 70;
                  newAmp.instance.updateParameter('master', masterVol);
                  
                  // Para Mesa Dual Rectifier, apenas restaurar parâmetros salvos (não forçar defaults)
                  if (value === 'mesa_dual_rectifier') {
                    const channel = savedParams.channel || 3;
                    
                    // Apenas restaurar parâmetros que foram salvos
                    if (savedParams.channel !== undefined) {
                      newAmp.instance.updateParameter('channel', channel);
                    }
                    
                    console.log(`✅ Mesa Dual Rectifier switched - Channel ${channel}`);
                  }
                  
                  // Depois aplicar outros parâmetros
                  // Para amps multicanal (Mesa, Peavey, etc), não aplicar parâmetros genéricos
                  const isMultichannelAmp = ['mesa_dual_rectifier', 'peavey_5150'].includes(value);
                  
                  Object.entries(savedParams).forEach(([param, val]) => {
                    // Pular ampType e master (já aplicados)
                    if (param === 'ampType' || param === 'master') return;
                    
                    // Para amps multicanal, só aplicar parâmetros específicos do canal
                    if (isMultichannelAmp) {
                      // Aplicar apenas se for parâmetro específico do canal (ch1_*, ch2_*, ch3_*)
                      // ou parâmetros de back panel (presence, resonance, etc)
                      if (param.startsWith('ch') || ['channel', 'presence', 'resonance', 'reverb', 'cabinet_enabled'].includes(param)) {
                        try {
                          newAmp.instance.updateParameter(param, val);
                        } catch (error) {
                          console.warn(`Failed to set ${param}:`, error);
                        }
                      }
                    } else {
                      // Para amps single-channel, aplicar todos os parâmetros normalmente
                      try {
                        newAmp.instance.updateParameter(param, val);
                      } catch (error) {
                        console.warn(`Failed to set ${param}:`, error);
                      }
                    }
                  });
                  console.log(`✅ Amp switched to: ${value} (master: ${masterVol})`);
                } catch (error) {
                  console.error('Error setting amp parameters:', error);
                }
              }
            }, 50);
          }
        }, 50);
        return;
      }
    }
    
    // Para outros parâmetros, atualização normal
    audioEngineRef.current.updateEffect(id, parameter, value);
    
    setEffects(effects.map(e => {
      if (e.id === id) {
        return {
          ...e,
          params: { ...e.params, [parameter]: value },
          ampType: parameter === 'ampType' ? value : e.ampType
        };
      }
      return e;
    }));
  };

  const toggleBypass = (id) => {
    audioEngineRef.current.toggleBypass(id);
    setEffects(effects.map(e => 
      e.id === id ? { ...e, bypassed: !e.bypassed } : e
    ));
  };

  const clearEffects = () => {
    if (effects.length > 0) {
      pushUndoState(effects);
    }
    effects.forEach(effect => {
      audioEngineRef.current.removeEffect(effect.id);
    });
    setEffects([]);
    setSelectedEffect(null);
  };

  const reorderEffects = (newOrder) => {
    pushUndoState(effects);
    setEffects(newOrder);
    // Atualizar a cadeia interna do AudioEngine com a nova ordem
    if (audioEngineRef.current) {
      audioEngineRef.current.effectsChain = newOrder
        .map(e => e.instance)
        .filter(instance => instance != null);
      audioEngineRef.current.reconnectChain();
    }
  };

  const loadPresets = async () => {
    const loadedPresets = await presetService.getPresets();
    setPresets(loadedPresets);
  };

  const saveCurrentPreset = async () => {
    if (effects.length === 0) {
      alert('Adicione alguns efeitos antes de salvar!');
      return;
    }

    const name = prompt('Nome do preset:');
    if (name) {
      const saved = await presetService.savePreset(name, effects);
      if (saved) {
        alert('Preset salvo com sucesso!');
        loadPresets();
      } else {
        alert('Erro ao salvar preset. Verifique se o backend está rodando.');
      }
    }
  };

  const loadPreset = async (presetId) => {
    const preset = await presetService.getPreset(presetId);
    if (preset) {
      // Clear current effects
      clearEffects();
      
      // Load preset effects
      const newEffects = preset.effects.map(e => addEffectToEngine(e.type, e));
      setEffects(newEffects.filter(e => e !== null));
      setShowPresetMenu(false);
    }
  };

  const deletePreset = async (presetId) => {
    if (window.confirm('Tem certeza que deseja deletar este preset?')) {
      const success = await presetService.deletePreset(presetId);
      if (success) {
        loadPresets();
      }
    }
  };

  // Handle loading preset from PresetBrowser
  const handleLoadPreset = (preset) => {
    try {
      // Clear current effects
      effects.forEach(effect => {
        if (effect.instance) {
          audioEngineRef.current.removeEffect(effect.instance);
        }
      });
      setEffects([]);

      // Load amp if present
      if (preset.amp) {
        const ampEffect = addEffectToEngine('amp', preset.amp);
        if (ampEffect) {
          setEffects(prev => [...prev, ampEffect]);
          
          // Update amp parameters
          Object.entries(preset.amp.params || {}).forEach(([param, value]) => {
            if (ampEffect.instance) {
              ampEffect.instance.updateParameter(param, value);
            }
          });
          
          // Set bypassed state
          if (preset.amp.bypassed && ampEffect.instance) {
            ampEffect.instance.bypass();
          }
        }
      }

      // Load effects
      if (preset.effects && Array.isArray(preset.effects)) {
        preset.effects.forEach((effectData) => {
          const effect = addEffectToEngine(effectData.type, effectData);
          if (effect) {
            setEffects(prev => [...prev, effect]);
            
            // Update effect parameters
            if (effectData.params && effect.instance) {
              Object.entries(effectData.params).forEach(([param, value]) => {
                effect.instance.updateParameter(param, value);
              });
            }
            
            // Set bypassed state
            if (effectData.bypassed && effect.instance) {
              effect.instance.bypass();
            }
          }
        });
      }

      console.log(`✅ Preset "${preset.name}" loaded successfully!`);
    } catch (error) {
      console.error('Error loading preset:', error);
      alert('Error loading preset. Check console for details.');
    }
  };

  // Icon mapping helper
  const getEffectIcon = (type) => {
    const iconMap = {
      // Amp
      'amp': Speaker,
      // Drive/Distortion
      'mesavtwin': Sliders, 'tech21sansamp': Settings, 'xoticbb': Flame,
      'xoticep': TrendingUp, 'jhssuperbolt': Zap, 'tubescreamer': Circle,
      'kloncentaur': Sparkles, 'bossds1': Circle, 'bossbd2': Circle,
      'bosssd1': Circle, 'procorat': Zap, 'fulltoneocd': Settings,
      'mxrdistortionplus': Plus, 'bigmuff': Circle, 'fuzzface': Circle,
      'zvexfuzzfactory': Cpu, 'distortion': Guitar, 'overdrive': Flame,
      'fuzz': Zap, 'metaldistortion': Zap, 'boost': TrendingUp,
      'tapesaturation': Radio,
      // Time/Delay
      'memoryman': Clock, 'mxrcarboncopy': Repeat, 'timelinedelay': Timer,
      'eventidetimefactor': Clock, 'bossdd500': Sliders, 'line6dl4': Circle,
      'delay': Clock, 'tapeecho': Radio, 'tapdelay': Timer,
      // Reverb
      'bigskyreverb': Cloud, 'eventidespace': Sparkles, 'bossrv500': Sliders,
      'ehxholygrail': Sparkle, 'tchalloffame': CloudRain, 'reverb': Cloud,
      'springreverb': Waves, 'shimmerreverb': Sparkles, 'hallreverb': CloudRain,
      'platereverb': Radio, 'roomreverb': Cloud,
      // Modulation
      'strymonmobius': Waves, 'walrusjulia': Waves, 'bossce1': Music,
      'mxrphase90': RotateCw, 'univibe': Waves, 'bossbf2': Waves,
      'bosstr2': Activity, 'chorus': Waves, 'analogchorus': Waves,
      'phaser': RotateCw, 'flanger': Waves, 'analogflanger': Waves,
      'tremolo': Activity, 'vibrato': Activity, 'rotary': RotateCw,
      'autopan': Shuffle,
      // Dynamics
      'keeleycomp': Minimize2, 'mxrdynacomp': Minimize2, 'compressor': Minimize2,
      'limiter': Minimize2, 'noisegate': Volume2, 'tubecompressor': Minimize2,
      // EQ/Filter
      'mxr10bandeq': Sliders, 'crybabywah': Filter, 'eq': Sliders,
      'graphiceq': Sliders, 'wah': Filter, 'autowah': Filter,
      'envfilter': Filter, 'talkbox': Music2, 'lfofilter': Waves,
      'stepfilter': Activity,
      // Pitch
      'octaver': Music3, 'pitchshifter': Music4, 'harmonizer': Music,
      'whammy': Guitar, 'detune': Music2,
      // Special
      'eventideh9': Sparkles, 'looper': Repeat, 'ringmod': Circle,
      'bitcrusher': Cpu, 'slicer': Activity, 'stepslicer': Activity,
      'swell': Waves, 'feedback': Volume2, 'vocoder': Music2,
      // Utility
      'volume': Volume2, 'tuner': Target, 'abtoggle': Shuffle,
      'splitter': Layers,
      // NEW EFFECTS 2025 - Drive
      'ts808': Circle, 'bossod3': Circle, 'maxonod808': Circle,
      'tumnus': Sparkles, 'morningglory': Flame, 'soulfood': Sparkles,
      'zendrive': Flame, 'timmy': Settings, 'friedmanbeod': Zap,
      'suhrriot': Zap, 'catalinbreaddls': Guitar, 'bognerecstasyblue': Flame,
      'plumes': Circle, 'dod250': Zap, 'darkglassb7k': Zap,
      'swollenpickle': Circle, 'greenrussian': Circle, 'fuzzlordchime': Zap,
      'badmonkey': Circle, 'amp11': TrendingUp, 'fulldrive2': Circle,
      // NEW EFFECTS 2025 - Modulation
      'tccorona': Waves, 'strymonola': Waves, 'smallstone': RotateCw,
      'phase100': RotateCw, 'electricmistress': Waves, 'tcvortex': Waves,
      'dejavibe': Waves, 'rotovibe': RotateCw, 'diamondtrem': Activity,
      'warpedvinyl': Waves, 'polychorus': Waves, 'tcshaker': Activity,
      'monument': Activity, 'particle': Sparkles, 'merisenzo': Music,
      // NEW EFFECTS 2025 - Time-Based
      'tcflashback': Clock, 'supapuss': Clock, 'arp87': Timer,
      'dispatchmaster': Clock, 'bossdd3': Circle, 'bossdd7': Circle,
      'maxonad999': Clock, 'echosystem': Timer, 'thermae': Sparkles,
      'belleepoch': Radio, 'elcapistan': Radio, 'strymonflint': Activity,
      'immerse': Cloud, 'cathedral': CloudRain, 'walrusslo': Cloud,
      'darkstar': Sparkle, 'mercury7': Sparkles, 'rpcontext': Cloud,
      'tensor': Repeat,
      // NEW EFFECTS 2025 - Dynamics
      'fmrrnc': Minimize2, 'empresscomp': Minimize2, 'cali76': Minimize2,
      'deepsix': Minimize2, 'blackfinger': Minimize2, 'philosopher': Minimize2,
      'hypergravity': Minimize2, 'bosscs3': Circle, 'wamplerego': Minimize2,
      'compulator': Minimize2,
      // NEW EFFECTS 2025 - EQ & Filters
      'bossge7': Sliders, 'sourceaudioeq2': Sliders, 'empressparaeq': Sliders,
      'talkingmachine': Music2, 'moogmf101': Filter, 'dod440': Filter,
      'mutron': Filter, 'qtron': Filter, 'dunlop105q': Filter,
      'badhorsie': Filter,
      // NEW EFFECTS 2025 - Pitch & Synth
      'ehxpog': Music3, 'micropog': Music3, 'ehxhog': Music3,
      'bossps6': Music4, 'subnup': Music3, 'pitchfork': Music4,
      'pitchfactor': Music, 'bossoc5': Music3, 'freeze': Sparkle,
      'hedra': Music, 'mood': Sparkles,
      // NEW EFFECTS 2025 - Multi-FX
      'helix': Sliders, 'axefx': Sliders, 'kemper': Sliders,
      'quadcortex': Cpu, 'gt1000': Sliders, 'headrush': Sliders
    };
    return iconMap[type] || Circle;
  };

  const effectTypes = [
    // AMP
    { type: 'amp', name: 'Amplifier', icon: 'amp', category: 'amp' },
    
    // OVERDRIVE/DISTORTION (CLASSIC + RACK)
    { type: 'mesavtwin', name: 'Mesa V-Twin', icon: 'mesavtwin', category: 'drive' },
    { type: 'tech21sansamp', name: 'Tech 21 SansAmp', icon: 'tech21sansamp', category: 'drive' },
    { type: 'xoticbb', name: 'Xotic BB Preamp', icon: 'xoticbb', category: 'drive' },
    { type: 'xoticep', name: 'Xotic EP Booster', icon: 'xoticep', category: 'drive' },
    { type: 'jhssuperbolt', name: 'JHS Superbolt', icon: 'jhssuperbolt', category: 'drive' },
    { type: 'tubescreamer', name: 'Tube Screamer', icon: 'tubescreamer', category: 'drive' },
    { type: 'kloncentaur', name: 'Klon Centaur', icon: 'kloncentaur', category: 'drive' },
    { type: 'bossds1', name: 'Boss DS-1', icon: 'bossds1', category: 'drive' },
    { type: 'bossbd2', name: 'Boss BD-2', icon: 'bossbd2', category: 'drive' },
    { type: 'bosssd1', name: 'Boss SD-1', icon: 'bosssd1', category: 'drive' },
    { type: 'procorat', name: 'ProCo RAT', icon: 'procorat', category: 'drive' },
    { type: 'fulltoneocd', name: 'Fulltone OCD', icon: 'fulltoneocd', category: 'drive' },
    { type: 'mxrdistortionplus', name: 'MXR Distortion+', icon: 'mxrdistortionplus', category: 'drive' },
    { type: 'bigmuff', name: 'Big Muff', icon: 'bigmuff', category: 'drive' },
    { type: 'fuzzface', name: 'Fuzz Face', icon: 'fuzzface', category: 'drive' },
    { type: 'zvexfuzzfactory', name: 'Z.Vex Fuzz Factory', icon: 'zvexfuzzfactory', category: 'drive' },
    { type: 'distortion', name: 'Distortion', icon: 'distortion', category: 'drive' },
    { type: 'overdrive', name: 'Overdrive', icon: 'overdrive', category: 'drive' },
    { type: 'fuzz', name: 'Fuzz', icon: 'fuzz', category: 'drive' },
    { type: 'metaldistortion', name: 'Metal Distortion', icon: 'metaldistortion', category: 'drive' },
    { type: 'boost', name: 'Clean Boost', icon: 'boost', category: 'drive' },
    { type: 'tapesaturation', name: 'Tape Saturation', icon: 'tapesaturation', category: 'drive' },
    { type: 'ts808', name: 'Ibanez TS808', icon: 'ts808', category: 'drive' },
    { type: 'bossod3', name: 'Boss OD-3', icon: 'bossod3', category: 'drive' },
    { type: 'maxonod808', name: 'Maxon OD808', icon: 'maxonod808', category: 'drive' },
    { type: 'tumnus', name: 'Wampler Tumnus', icon: 'tumnus', category: 'drive' },
    { type: 'morningglory', name: 'JHS Morning Glory', icon: 'morningglory', category: 'drive' },
    { type: 'soulfood', name: 'EHX Soul Food', icon: 'soulfood', category: 'drive' },
    { type: 'zendrive', name: 'Hermida Zendrive', icon: 'zendrive', category: 'drive' },
    { type: 'timmy', name: 'Paul Cochrane Timmy', icon: 'timmy', category: 'drive' },
    { type: 'friedmanbeod', name: 'Friedman BE-OD', icon: 'friedmanbeod', category: 'drive' },
    { type: 'suhrriot', name: 'Suhr Riot', icon: 'suhrriot', category: 'drive' },
    { type: 'catalinbreaddls', name: 'Catalinbread DLS', icon: 'catalinbreaddls', category: 'drive' },
    { type: 'bognerecstasyblue', name: 'Bogner Ecstasy Blue', icon: 'bognerecstasyblue', category: 'drive' },
    { type: 'plumes', name: 'EQD Plumes', icon: 'plumes', category: 'drive' },
    { type: 'dod250', name: 'DOD 250', icon: 'dod250', category: 'drive' },
    { type: 'darkglassb7k', name: 'Darkglass B7K', icon: 'darkglassb7k', category: 'drive' },
    { type: 'swollenpickle', name: 'Swollen Pickle', icon: 'swollenpickle', category: 'drive' },
    { type: 'greenrussian', name: 'Green Russian Muff', icon: 'greenrussian', category: 'drive' },
    { type: 'fuzzlordchime', name: 'Fuzzlord Chime', icon: 'fuzzlordchime', category: 'drive' },
    { type: 'badmonkey', name: 'Digitech Bad Monkey', icon: 'badmonkey', category: 'drive' },
    { type: 'amp11', name: 'Lovepedal Amp 11', icon: 'amp11', category: 'drive' },
    { type: 'fulldrive2', name: 'Fulltone Fulldrive 2 MOSFET', icon: 'fulldrive2', category: 'drive' },
    
    // DELAY/ECHO (CLASSIC + RACK)
    { type: 'memoryman', name: 'Memory Man', icon: 'memoryman', category: 'time' },
    { type: 'mxrcarboncopy', name: 'MXR Carbon Copy', icon: 'mxrcarboncopy', category: 'time' },
    { type: 'timelinedelay', name: 'Timeline Delay', icon: 'timelinedelay', category: 'time' },
    { type: 'eventidetimefactor', name: 'Eventide TimeFactor', icon: 'eventidetimefactor', category: 'time' },
    { type: 'bossdd500', name: 'Boss DD-500', icon: 'bossdd500', category: 'time' },
    { type: 'line6dl4', name: 'Line 6 DL4', icon: 'line6dl4', category: 'time' },
    { type: 'delay', name: 'Digital Delay', icon: 'delay', category: 'time' },
    { type: 'tapeecho', name: 'Tape Echo', icon: 'tapeecho', category: 'time' },
    { type: 'tapdelay', name: 'Tap Delay', icon: 'tapdelay', category: 'time' },
    
    // REVERB (CLASSIC + RACK)
    { type: 'bigskyreverb', name: 'Bigsky Reverb', icon: 'bigskyreverb', category: 'time' },
    { type: 'eventidespace', name: 'Eventide Space', icon: 'eventidespace', category: 'time' },
    { type: 'bossrv500', name: 'Boss RV-500', icon: 'bossrv500', category: 'time' },
    { type: 'ehxholygrail', name: 'EHX Holy Grail', icon: 'ehxholygrail', category: 'time' },
    { type: 'tchalloffame', name: 'TC Hall of Fame', icon: 'tchalloffame', category: 'time' },
    { type: 'reverb', name: 'Reverb', icon: 'reverb', category: 'time' },
    { type: 'springreverb', name: 'Spring Reverb', icon: 'springreverb', category: 'time' },
    { type: 'shimmerreverb', name: 'Shimmer Reverb', icon: 'shimmerreverb', category: 'time' },
    { type: 'hallreverb', name: 'Hall Reverb', icon: 'hallreverb', category: 'time' },
    { type: 'platereverb', name: 'Plate Reverb', icon: 'platereverb', category: 'time' },
    { type: 'roomreverb', name: 'Room Reverb', icon: 'roomreverb', category: 'time' },
    { type: 'tcflashback', name: 'TC Flashback', icon: 'tcflashback', category: 'time' },
    { type: 'supapuss', name: 'Way Huge Supa-Puss', icon: 'supapuss', category: 'time' },
    { type: 'arp87', name: 'Walrus ARP-87', icon: 'arp87', category: 'time' },
    { type: 'dispatchmaster', name: 'EQD Dispatch Master', icon: 'dispatchmaster', category: 'time' },
    { type: 'bossdd3', name: 'Boss DD-3', icon: 'bossdd3', category: 'time' },
    { type: 'bossdd7', name: 'Boss DD-7', icon: 'bossdd7', category: 'time' },
    { type: 'maxonad999', name: 'Maxon AD999', icon: 'maxonad999', category: 'time' },
    { type: 'echosystem', name: 'Empress Echosystem', icon: 'echosystem', category: 'time' },
    { type: 'thermae', name: 'Chase Bliss Thermae', icon: 'thermae', category: 'time' },
    { type: 'belleepoch', name: 'Catalinbread Belle Epoch', icon: 'belleepoch', category: 'time' },
    { type: 'elcapistan', name: 'Strymon El Capistan', icon: 'elcapistan', category: 'time' },
    { type: 'strymonflint', name: 'Strymon Flint', icon: 'strymonflint', category: 'time' },
    { type: 'immerse', name: 'Neunaber Immerse', icon: 'immerse', category: 'time' },
    { type: 'cathedral', name: 'EHX Cathedral', icon: 'cathedral', category: 'time' },
    { type: 'walrusslo', name: 'Walrus Slo', icon: 'walrusslo', category: 'time' },
    { type: 'darkstar', name: 'OBN Dark Star', icon: 'darkstar', category: 'time' },
    { type: 'mercury7', name: 'Meris Mercury7', icon: 'mercury7', category: 'time' },
    { type: 'rpcontext', name: 'Red Panda Context', icon: 'rpcontext', category: 'time' },
    { type: 'tensor', name: 'Red Panda Tensor', icon: 'tensor', category: 'time' },
    
    // MODULATION (CLASSIC + RACK)
    { type: 'strymonmobius', name: 'Strymon Mobius', icon: 'strymonmobius', category: 'modulation' },
    { type: 'walrusjulia', name: 'Walrus Julia', icon: 'walrusjulia', category: 'modulation' },
    { type: 'bossce1', name: 'Boss CE-1', icon: 'bossce1', category: 'modulation' },
    { type: 'mxrphase90', name: 'MXR Phase 90', icon: 'mxrphase90', category: 'modulation' },
    { type: 'univibe', name: 'Uni-Vibe', icon: 'univibe', category: 'modulation' },
    { type: 'bossbf2', name: 'Boss BF-2', icon: 'bossbf2', category: 'modulation' },
    { type: 'bosstr2', name: 'Boss TR-2', icon: 'bosstr2', category: 'modulation' },
    { type: 'chorus', name: 'Chorus', icon: 'chorus', category: 'modulation' },
    { type: 'analogchorus', name: 'Analog Chorus', icon: 'analogchorus', category: 'modulation' },
    { type: 'phaser', name: 'Phaser', icon: 'phaser', category: 'modulation' },
    { type: 'flanger', name: 'Flanger', icon: 'flanger', category: 'modulation' },
    { type: 'analogflanger', name: 'Analog Flanger', icon: 'analogflanger', category: 'modulation' },
    { type: 'tremolo', name: 'Tremolo', icon: 'tremolo', category: 'modulation' },
    { type: 'vibrato', name: 'Vibrato', icon: 'vibrato', category: 'modulation' },
    { type: 'rotary', name: 'Rotary Speaker', icon: 'rotary', category: 'modulation' },
    { type: 'autopan', name: 'Auto Pan', icon: 'autopan', category: 'modulation' },
    { type: 'tccorona', name: 'TC Corona', icon: 'tccorona', category: 'modulation' },
    { type: 'strymonola', name: 'Strymon Ola', icon: 'strymonola', category: 'modulation' },
    { type: 'smallstone', name: 'EHX Small Stone', icon: 'smallstone', category: 'modulation' },
    { type: 'phase100', name: 'MXR Phase 100', icon: 'phase100', category: 'modulation' },
    { type: 'electricmistress', name: 'Electric Mistress', icon: 'electricmistress', category: 'modulation' },
    { type: 'tcvortex', name: 'TC Vortex', icon: 'tcvortex', category: 'modulation' },
    { type: 'dejavibe', name: 'Fulltone Deja Vibe', icon: 'dejavibe', category: 'modulation' },
    { type: 'rotovibe', name: 'Dunlop Rotovibe', icon: 'rotovibe', category: 'modulation' },
    { type: 'diamondtrem', name: 'Diamond Tremolo', icon: 'diamondtrem', category: 'modulation' },
    { type: 'warpedvinyl', name: 'Warped Vinyl', icon: 'warpedvinyl', category: 'modulation' },
    { type: 'polychorus', name: 'EHX Poly Chorus', icon: 'polychorus', category: 'modulation' },
    { type: 'tcshaker', name: 'TC Shaker', icon: 'tcshaker', category: 'modulation' },
    { type: 'monument', name: 'Walrus Monument', icon: 'monument', category: 'modulation' },
    { type: 'particle', name: 'Red Panda Particle', icon: 'particle', category: 'modulation' },
    { type: 'merisenzo', name: 'Meris Enzo', icon: 'merisenzo', category: 'modulation' },
    
    // DYNAMICS (CLASSIC)
    { type: 'keeleycomp', name: 'Keeley Compressor', icon: 'keeleycomp', category: 'dynamics' },
    { type: 'mxrdynacomp', name: 'MXR Dyna Comp', icon: 'mxrdynacomp', category: 'dynamics' },
    { type: 'compressor', name: 'Compressor', icon: 'compressor', category: 'dynamics' },
    { type: 'limiter', name: 'Limiter', icon: 'limiter', category: 'dynamics' },
    { type: 'noisegate', name: 'Noise Gate', icon: 'noisegate', category: 'dynamics' },
    { type: 'tubecompressor', name: 'Tube Compressor', icon: 'tubecompressor', category: 'dynamics' },
    { type: 'fmrrnc', name: 'FMR RNC', icon: 'fmrrnc', category: 'dynamics' },
    { type: 'empresscomp', name: 'Empress Compressor', icon: 'empresscomp', category: 'dynamics' },
    { type: 'cali76', name: 'Cali76', icon: 'cali76', category: 'dynamics' },
    { type: 'deepsix', name: 'Walrus Deep Six', icon: 'deepsix', category: 'dynamics' },
    { type: 'blackfinger', name: 'EHX Black Finger', icon: 'blackfinger', category: 'dynamics' },
    { type: 'philosopher', name: 'Pigtronix Philosopher', icon: 'philosopher', category: 'dynamics' },
    { type: 'hypergravity', name: 'TC HyperGravity', icon: 'hypergravity', category: 'dynamics' },
    { type: 'bosscs3', name: 'Boss CS-3', icon: 'bosscs3', category: 'dynamics' },
    { type: 'wamplerego', name: 'Wampler Ego', icon: 'wamplerego', category: 'dynamics' },
    { type: 'compulator', name: 'Demeter Compulator', icon: 'compulator', category: 'dynamics' },
    
    // EQ/FILTER (CLASSIC)
    { type: 'mxr10bandeq', name: 'MXR 10-Band EQ', icon: 'mxr10bandeq', category: 'filter' },
    { type: 'crybabywah', name: 'Cry Baby Wah', icon: 'crybabywah', category: 'filter' },
    { type: 'eq', name: 'Parametric EQ', icon: 'eq', category: 'filter' },
    { type: 'graphiceq', name: 'Graphic EQ', icon: 'graphiceq', category: 'filter' },
    { type: 'wah', name: 'Wah-Wah', icon: 'wah', category: 'filter' },
    { type: 'autowah', name: 'Auto-Wah', icon: 'autowah', category: 'filter' },
    { type: 'envfilter', name: 'Envelope Filter', icon: 'envfilter', category: 'filter' },
    { type: 'talkbox', name: 'Talk Box', icon: 'talkbox', category: 'filter' },
    { type: 'lfofilter', name: 'LFO Filter', icon: 'lfofilter', category: 'filter' },
    { type: 'stepfilter', name: 'Step Filter', icon: 'stepfilter', category: 'filter' },
    { type: 'bossge7', name: 'Boss GE-7', icon: 'bossge7', category: 'filter' },
    { type: 'sourceaudioeq2', name: 'Source Audio EQ2', icon: 'sourceaudioeq2', category: 'filter' },
    { type: 'empressparaeq', name: 'Empress ParaEQ', icon: 'empressparaeq', category: 'filter' },
    { type: 'talkingmachine', name: 'EHX Talking Machine', icon: 'talkingmachine', category: 'filter' },
    { type: 'moogmf101', name: 'Moog MF-101', icon: 'moogmf101', category: 'filter' },
    { type: 'dod440', name: 'DOD 440', icon: 'dod440', category: 'filter' },
    { type: 'mutron', name: 'Mu-Tron III', icon: 'mutron', category: 'filter' },
    { type: 'qtron', name: 'EHX Q-Tron', icon: 'qtron', category: 'filter' },
    { type: 'dunlop105q', name: 'Dunlop 105Q', icon: 'dunlop105q', category: 'filter' },
    { type: 'badhorsie', name: 'Morley Bad Horsie', icon: 'badhorsie', category: 'filter' },
    
    // PITCH/HARMONY
    { type: 'octaver', name: 'Octaver', icon: 'octaver', category: 'pitch' },
    { type: 'pitchshifter', name: 'Pitch Shifter', icon: 'pitchshifter', category: 'pitch' },
    { type: 'harmonizer', name: 'Harmonizer', icon: 'harmonizer', category: 'pitch' },
    { type: 'whammy', name: 'Whammy', icon: 'whammy', category: 'pitch' },
    { type: 'detune', name: 'Detune', icon: 'detune', category: 'pitch' },
    { type: 'ehxpog', name: 'EHX POG', icon: 'ehxpog', category: 'pitch' },
    { type: 'micropog', name: 'EHX Micro POG', icon: 'micropog', category: 'pitch' },
    { type: 'ehxhog', name: 'EHX HOG', icon: 'ehxhog', category: 'pitch' },
    { type: 'bossps6', name: 'Boss PS-6', icon: 'bossps6', category: 'pitch' },
    { type: 'subnup', name: 'TC Sub N Up', icon: 'subnup', category: 'pitch' },
    { type: 'pitchfork', name: 'EHX Pitch Fork', icon: 'pitchfork', category: 'pitch' },
    { type: 'pitchfactor', name: 'Eventide PitchFactor', icon: 'pitchfactor', category: 'pitch' },
    { type: 'bossoc5', name: 'Boss OC-5', icon: 'bossoc5', category: 'pitch' },
    { type: 'freeze', name: 'EHX Freeze', icon: 'freeze', category: 'pitch' },
    { type: 'hedra', name: 'Meris Hedra', icon: 'hedra', category: 'pitch' },
    { type: 'mood', name: 'Chase Bliss Mood', icon: 'mood', category: 'pitch' },
    
    // SPECIAL FX + MULTI-FX
    { type: 'eventideh9', name: 'Eventide H9', icon: 'eventideh9', category: 'special' },
    { type: 'looper', name: 'Looper', icon: 'looper', category: 'special' },
    { type: 'ringmod', name: 'Ring Modulator', icon: 'ringmod', category: 'special' },
    { type: 'bitcrusher', name: 'Bit Crusher', icon: 'bitcrusher', category: 'special' },
    { type: 'slicer', name: 'Slicer', icon: 'slicer', category: 'special' },
    { type: 'stepslicer', name: 'Step Slicer', icon: 'stepslicer', category: 'special' },
    { type: 'swell', name: 'Swell', icon: 'swell', category: 'special' },
    { type: 'feedback', name: 'Feedback', icon: 'feedback', category: 'special' },
    { type: 'vocoder', name: 'Vocoder', icon: 'vocoder', category: 'special' },
    // MULTI-FX UNITS
    { type: 'helix', name: 'Line 6 Helix', icon: 'helix', category: 'special' },
    { type: 'axefx', name: 'Fractal Axe-FX III', icon: 'axefx', category: 'special' },
    { type: 'kemper', name: 'Kemper Profiler', icon: 'kemper', category: 'special' },
    { type: 'quadcortex', name: 'Neural DSP Quad Cortex', icon: 'quadcortex', category: 'special' },
    { type: 'gt1000', name: 'Boss GT-1000', icon: 'gt1000', category: 'special' },
    { type: 'headrush', name: 'Headrush Pedalboard', icon: 'headrush', category: 'special' },
    
    // UTILITY
    { type: 'volume', name: 'Volume Pedal', icon: 'volume', category: 'utility' },
    { type: 'tuner', name: 'Tuner', icon: 'tuner', category: 'utility' },
    { type: 'abtoggle', name: 'A/B Toggle', icon: 'abtoggle', category: 'utility' },
    { type: 'splitter', name: 'Signal Splitter', icon: 'splitter', category: 'utility' }
  ];

  return (
    <div className="app" style={{ 
      background: theme.background,
      color: theme.text 
    }}>
      <header className="app-header">
        <h1 className="app-title">
          RIGMASTER
          <span className="title-subtitle">Pro</span>
        </h1>
        
        <div className="header-controls">
          <ThemeSelector />
          
          <button 
            className="preset-button"
            onClick={() => setShowPresetBrowser(true)}
            title="Preset Browser - Factory & User Presets"
          >
            <Library size={16} />
            <span>Browse Presets</span>
          </button>
          
          <button 
            className="preset-button"
            onClick={() => setShowPresetMenu(true)}
            disabled={!backendConnected}
            title={backendConnected ? 'Gerenciar Presets (Backend)' : 'Backend desconectado'}
          >
            <Save size={16} />
            <span>Backend Presets</span>
          </button>
          
          {!isAudioActive ? (
            <button className="start-button" onClick={startAudio}>
              <Power size={16} />
              <span>START AUDIO</span>
            </button>
          ) : (
            <div className="audio-active-indicator">
              <Activity size={14} />
              <span>AUDIO ACTIVE</span>
            </div>
          )}
        </div>
      </header>

      {isAudioActive && (
        <>
          <div className="visualizers">
            <VUMeter 
              audioContext={audioEngineRef.current?.audioContext} 
              inputNode={audioEngineRef.current?.inputNode}
            />
            <SpectrumAnalyzer 
              audioContext={audioEngineRef.current?.audioContext} 
              inputNode={audioEngineRef.current?.inputNode}
            />
          </div>
        </>
      )}

      {/* SIDEBAR */}
      <aside className="sidebar">
        {/* Audio Device Selector - Always Visible */}
        <AudioDeviceSelector 
          onDeviceChange={handleDeviceChange}
          currentDevice={selectedAudioDevice}
        />

        {/* Audio File Input - Upload audio files to test effects */}
        <AudioFileInput 
          audioEngine={audioEngineRef.current}
          isActive={usingAudioFile}
          onToggle={() => setUsingAudioFile(!usingAudioFile)}
        />

        {/* Input Monitor - Always Visible */}
        <InputMonitor audioEngine={audioEngineRef.current} isActive={isAudioActive} />

        <div className="sidebar-section">
          <h3>
            <Settings2 size={16} />
            <span>Global</span>
          </h3>
          <div className="sidebar-controls">
            <div className="sidebar-control">
              <label>Master Vol <span className="control-value">{masterVolume}%</span></label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={masterVolume} 
                onChange={(e) => handleMasterVolumeChange(e.target.value)}
              />
            </div>
            <div className="sidebar-control">
              <label>Input Gain <span className="control-value">{inputGain}%</span></label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={inputGain} 
                onChange={(e) => handleInputGainChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>
            <Layers size={16} />
            <span>Chain</span>
          </h3>
          <div className="chain-info">
            <div className="chain-stat">
              <span>Effects:</span>
              <strong>{effects.length}</strong>
            </div>
            <div className="chain-stat">
              <span>Active:</span>
              <strong>{effects.filter(e => !e.bypassed).length}</strong>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>
            <Zap size={16} />
            <span>Quick Actions</span>
          </h3>
          <button className="sidebar-btn" onClick={() => effects.forEach(e => updateEffect(e.id, 'bypass', true))}>
            <EyeOff size={14} />
            <span>Bypass All</span>
          </button>
          <button className="sidebar-btn" onClick={() => effects.forEach(e => updateEffect(e.id, 'bypass', false))}>
            <Eye size={14} />
            <span>Enable All</span>
          </button>
          <button className="sidebar-btn danger" onClick={() => effects.forEach(e => removeEffect(e.id))}>
            <X size={14} />
            <span>Clear All</span>
          </button>
        </div>

        {/* Recorder Panel - Always at bottom */}
        <RecorderPanel audioEngine={audioEngineRef.current} />
      </aside>

      <Reorder.Group 
        axis="x" 
        values={effects} 
        onReorder={reorderEffects}
        className="pedalboard" 
        style={{ 
          background: theme.pedalboard,
          transform: `scale(${zoomLevel})`
        }}
      >
        <AnimatePresence>
          {effects.map((effect) => (
            <Reorder.Item
              key={effect.id}
              value={effect}
              onClick={() => setSelectedEffect(effect.id)}
              className={selectedEffect === effect.id ? 'selected' : ''}
              whileDrag={{ 
                scale: 1.05, 
                zIndex: 1000,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                cursor: 'grabbing',
                rotate: 2
              }}
              style={{ cursor: 'grab' }}
            >
              {effect.type === 'amp' ? (
                <AmpComponent
                  amp={effect}
                  onUpdate={updateEffect}
                  onBypass={toggleBypass}
                  onRemove={removeEffect}
                />
              ) : (
                <Pedal
                  effect={effect}
                  onUpdate={updateEffect}
                  onBypass={toggleBypass}
                  onRemove={removeEffect}
                />
              )}
            </Reorder.Item>
          ))}
        </AnimatePresence>

        <motion.button
          className="add-effect-button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="add-icon">+</span>
          Adicionar Efeito
        </motion.button>

        {/* SIGNAL FLOW VISUALIZATION */}
        <SignalFlow effects={effects} />
      </Reorder.Group>

      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            className="add-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddMenu(false)}
          >
            <motion.div
              className="add-menu"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="add-menu-title">Escolha um Efeito</h2>
              
              {['amp', 'drive', 'time', 'modulation', 'dynamics', 'filter', 'pitch', 'special', 'utility'].map(category => {
                const categoryEffects = effectTypes.filter(e => e.category === category);
                if (categoryEffects.length === 0) return null;
                
                const categoryIcons = {
                  amp: Speaker,
                  drive: Guitar,
                  time: Clock,
                  modulation: Waves,
                  dynamics: Activity,
                  filter: Filter,
                  pitch: Music,
                  special: Sparkles,
                  utility: Settings
                };
                
                const categoryNames = {
                  amp: 'Amplifiers',
                  drive: 'Drive & Distortion',
                  time: 'Delay & Reverb',
                  modulation: 'Modulation',
                  dynamics: 'Dynamics',
                  filter: 'Filters',
                  pitch: 'Pitch',
                  special: 'Special FX',
                  utility: 'Utilities'
                };
                
                const CategoryIcon = categoryIcons[category] || Circle;
                
                return (
                  <div key={category} className="effect-category">
                    <h3 className="category-title">
                      <CategoryIcon size={20} />
                      <span>{categoryNames[category]}</span>
                    </h3>
                    <div className="effect-grid">
                      {categoryEffects.map((effectType) => {
                        const IconComponent = getEffectIcon(effectType.icon);
                        return (
                          <motion.button
                            key={effectType.type}
                            className="effect-option"
                            onClick={() => addEffect(effectType.type)}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            title={`Add ${effectType.name}`}
                          >
                            <div className="effect-icon-wrapper">
                              <IconComponent size={32} strokeWidth={1.5} />
                            </div>
                            <span className="effect-name">{effectType.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              <button className="close-menu" onClick={() => setShowAddMenu(false)}>
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPresetMenu && (
          <motion.div
            className="add-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPresetMenu(false)}
          >
            <motion.div
              className="add-menu preset-menu"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="add-menu-title">Presets</h2>
              
              {!backendConnected && (
                <div className="backend-warning">
                  <AlertCircle size={16} />
                  <span>Backend offline. Start Python server to use presets.</span>
                </div>
              )}

              <div className="preset-actions">
                <button 
                  className="preset-action-button save"
                  onClick={saveCurrentPreset}
                  disabled={effects.length === 0}
                >
                  <Save size={16} />
                  <span>Save Current</span>
                </button>
              </div>

              <div className="preset-list">
                {presets.length === 0 ? (
                  <p className="no-presets">Nenhum preset salvo ainda.</p>
                ) : (
                  presets.map(preset => (
                    <div key={preset.id} className="preset-item">
                      <div className="preset-info">
                        <h4>{preset.name}</h4>
                        <small>{preset.effects.length} efeitos</small>
                      </div>
                      <div className="preset-buttons">
                        <button 
                          className="preset-load"
                          onClick={() => loadPreset(preset.id)}
                        >
                          <Play size={14} />
                          <span>Load</span>
                        </button>
                        <button 
                          className="preset-delete"
                          onClick={() => deletePreset(preset.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="close-menu" onClick={() => setShowPresetMenu(false)}>
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPresetBrowser && (
          <PresetBrowser
            presetManager={presetManager}
            onLoadPreset={handleLoadPreset}
            onClose={() => setShowPresetBrowser(false)}
            currentAmpConfig={effects.find(e => e.type === 'amp')}
            currentEffects={effects.filter(e => e.type !== 'amp').map(e => ({
              type: e.type,
              params: e.params,
              bypassed: e.bypassed
            }))}
          />
        )}
      </AnimatePresence>

      <footer className="app-footer">
        <div className="keyboard-shortcuts">
          <span className="shortcut">
            <kbd>Espaço</kbd> = Adicionar
          </span>
          <span className="shortcut">
            <kbd>Del</kbd> = Remover
          </span>
          <span className="shortcut">
            <kbd>B</kbd> = Bypass
          </span>
          <span className="shortcut">
            <kbd>Ctrl+S</kbd> = Salvar Preset
          </span>
          <span className="shortcut">
            <kbd>Ctrl+O</kbd> = Abrir Presets
          </span>
          <span className="shortcut">
            <kbd>Ctrl+N</kbd> = Limpar Tudo
          </span>
          <span className="shortcut">
            <kbd>Ctrl+Z</kbd> = Undo
          </span>
          <span className="shortcut">
            <kbd>Ctrl+Y</kbd> = Redo
          </span>
        </div>
      </footer>

      {/* BOTTOM CONTROL BAR */}
      <div className="bottom-bar">
        <div className="bottom-section">
          <div className="bottom-control">
            <label>Tempo (BPM)</label>
            <input 
              type="number" 
              min="20" 
              max="300" 
              value={bpm} 
              onChange={(e) => handleBpmChange(e.target.value)}
              className="bpm-input" 
            />
            <button 
              className={`tap-tempo ${midiLearnActive ? 'midi-learn-pulse' : ''}`}
              onClick={handleTapTempo}
              title="Tap to set tempo (syncs delays & tremolos)"
            >
              TAP
            </button>
          </div>
        </div>

        <div className="bottom-section">
          <div className="cpu-meter">
            <label>CPU</label>
            <div className="meter-bar">
              <div 
                className={`meter-fill ${cpuUsage > 80 ? 'meter-fill-danger' : cpuUsage > 50 ? 'meter-fill-warning' : ''}`} 
                style={{width: `${cpuUsage}%`}}
              ></div>
            </div>
            <span>{cpuUsage}%</span>
          </div>
        </div>

        <div className="bottom-section">
          <button 
            className={`utility-btn ${midiEnabled ? 'utility-btn-active' : ''}`} 
            title={midiEnabled ? `MIDI Active (${midiInputs.length} device${midiInputs.length !== 1 ? 's' : ''})` : 'Enable MIDI'}
            onClick={handleMidiToggle}
          >
            🎹 MIDI{midiEnabled ? ' ✓' : ''}
          </button>
          <button 
            className={`utility-btn ${undoStack.length === 0 ? 'utility-btn-disabled' : ''}`} 
            title={`Undo (Ctrl+Z)${undoStack.length > 0 ? ` - ${undoStack.length} state${undoStack.length !== 1 ? 's' : ''}` : ''}`}
            onClick={undo}
            disabled={undoStack.length === 0}
          >
            ↶ Undo
          </button>
          <button 
            className={`utility-btn ${redoStack.length === 0 ? 'utility-btn-disabled' : ''}`} 
            title={`Redo (Ctrl+Shift+Z)${redoStack.length > 0 ? ` - ${redoStack.length} state${redoStack.length !== 1 ? 's' : ''}` : ''}`}
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            ↷ Redo
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

