import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  const [presets, setPresets] = useState([]);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [showPresetBrowser, setShowPresetBrowser] = useState(false);
  const [presetManager] = useState(() => new PresetManager());
  const audioEngineRef = useRef(null);
  const nextIdRef = useRef(1);

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
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);

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
  });

  const startAudio = async () => {
    if (audioEngineRef.current && !isAudioActive) {
      const success = await audioEngineRef.current.initialize(selectedAudioDevice);
      if (success) {
        // Wait for audioContext to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsAudioActive(true);
        // Re-add existing effects to the new audio context
        effects.forEach(effect => {
          addEffectToEngine(effect.type, effect);
        });
      }
    }
  };

  const handleDeviceChange = async (deviceId, deviceInfo) => {
    console.log('Selected device:', deviceInfo);
    setSelectedAudioDevice(deviceId);
    
    // If audio is already active, restart with new device
    if (isAudioActive) {
      // Stop current audio
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
      setIsAudioActive(false);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Restart with new device
      const success = await audioEngineRef.current.initialize(deviceId);
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsAudioActive(true);
        effects.forEach(effect => {
          addEffectToEngine(effect.type, effect);
        });
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
        effectInstance = new AmpSimulator(audioContext, id, effectData?.ampType || 'clean');
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
      ampType: effectData?.ampType || (type === 'amp' ? 'clean' : undefined),
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
      setEffects([...effects, newEffect]);
      setShowAddMenu(false);
    }
  };

  const removeEffect = (id) => {
    audioEngineRef.current.removeEffect(id);
    setEffects(effects.filter(e => e.id !== id));
  };

  const updateEffect = (id, parameter, value) => {
    audioEngineRef.current.updateEffect(id, parameter, value);
    
    setEffects(effects.map(e => {
      if (e.id === id) {
        return {
          ...e,
          params: { ...e.params, [parameter]: value },
          ampType: parameter === 'type' ? value : e.ampType
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
    effects.forEach(effect => {
      audioEngineRef.current.removeEffect(effect.id);
    });
    setEffects([]);
    setSelectedEffect(null);
  };

  const reorderEffects = (newOrder) => {
    setEffects(newOrder);
    // Reconectar a cadeia de áudio na nova ordem
    audioEngineRef.current.reconnectChain(newOrder.map(e => e.instance));
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

  const effectTypes = [
    // AMP (apenas um - os tipos ficam dentro dele)
    { type: 'amp', name: 'Amplifier', icon: '🔊', category: 'amp' },
    
    // OVERDRIVE/DISTORTION (CLASSIC + RACK)
    { type: 'mesavtwin', name: 'Mesa V-Twin', icon: '🎛️', category: 'drive' },
    { type: 'tech21sansamp', name: 'Tech 21 SansAmp', icon: '🔧', category: 'drive' },
    { type: 'xoticbb', name: 'Xotic BB Preamp', icon: '🟠', category: 'drive' },
    { type: 'xoticep', name: 'Xotic EP Booster', icon: '⬆️', category: 'drive' },
    { type: 'jhssuperbolt', name: 'JHS Superbolt', icon: '⚡', category: 'drive' },
    { type: 'tubescreamer', name: 'Tube Screamer', icon: '🟢', category: 'drive' },
    { type: 'kloncentaur', name: 'Klon Centaur', icon: '🐴', category: 'drive' },
    { type: 'bossds1', name: 'Boss DS-1', icon: '🟠', category: 'drive' },
    { type: 'bossbd2', name: 'Boss BD-2', icon: '🔵', category: 'drive' },
    { type: 'bosssd1', name: 'Boss SD-1', icon: '🟡', category: 'drive' },
    { type: 'procorat', name: 'ProCo RAT', icon: '🐀', category: 'drive' },
    { type: 'fulltoneocd', name: 'Fulltone OCD', icon: '⚙️', category: 'drive' },
    { type: 'mxrdistortionplus', name: 'MXR Distortion+', icon: '➕', category: 'drive' },
    { type: 'bigmuff', name: 'Big Muff', icon: '🔴', category: 'drive' },
    { type: 'fuzzface', name: 'Fuzz Face', icon: '😎', category: 'drive' },
    { type: 'zvexfuzzfactory', name: 'Z.Vex Fuzz Factory', icon: '🏭', category: 'drive' },
    { type: 'distortion', name: 'Distortion', icon: '🎸', category: 'drive' },
    { type: 'overdrive', name: 'Overdrive', icon: '🔥', category: 'drive' },
    { type: 'fuzz', name: 'Fuzz', icon: '⚡', category: 'drive' },
    { type: 'metaldistortion', name: 'Metal Distortion', icon: '🤘', category: 'drive' },
    { type: 'boost', name: 'Clean Boost', icon: '⬆️', category: 'drive' },
    { type: 'tapesaturation', name: 'Tape Saturation', icon: '📼', category: 'drive' },
    
    // DELAY/ECHO (CLASSIC + RACK)
    { type: 'memoryman', name: 'Memory Man', icon: '🧠', category: 'time' },
    { type: 'mxrcarboncopy', name: 'MXR Carbon Copy', icon: '📄', category: 'time' },
    { type: 'timelinedelay', name: 'Timeline Delay', icon: '⏰', category: 'time' },
    { type: 'eventidetimefactor', name: 'Eventide TimeFactor', icon: '⏲️', category: 'time' },
    { type: 'bossdd500', name: 'Boss DD-500', icon: '🎛️', category: 'time' },
    { type: 'line6dl4', name: 'Line 6 DL4', icon: '🟢', category: 'time' },
    { type: 'delay', name: 'Digital Delay', icon: '⏱️', category: 'time' },
    { type: 'tapeecho', name: 'Tape Echo', icon: '📼', category: 'time' },
    { type: 'tapdelay', name: 'Tap Delay', icon: '👆', category: 'time' },
    
    // REVERB (CLASSIC + RACK)
    { type: 'bigskyreverb', name: 'Bigsky Reverb', icon: '☁️', category: 'time' },
    { type: 'eventidespace', name: 'Eventide Space', icon: '🌌', category: 'time' },
    { type: 'bossrv500', name: 'Boss RV-500', icon: '🎚️', category: 'time' },
    { type: 'ehxholygrail', name: 'EHX Holy Grail', icon: '🏆', category: 'time' },
    { type: 'tchalloffame', name: 'TC Hall of Fame', icon: '🌟', category: 'time' },
    { type: 'reverb', name: 'Reverb', icon: '🏛️', category: 'time' },
    { type: 'springreverb', name: 'Spring Reverb', icon: '🌀', category: 'time' },
    { type: 'shimmerreverb', name: 'Shimmer Reverb', icon: '✨', category: 'time' },
    { type: 'hallreverb', name: 'Hall Reverb', icon: '🎭', category: 'time' },
    { type: 'platereverb', name: 'Plate Reverb', icon: '📻', category: 'time' },
    { type: 'roomreverb', name: 'Room Reverb', icon: '🏠', category: 'time' },
    
    // MODULATION (CLASSIC + RACK)
    { type: 'strymonmobius', name: 'Strymon Mobius', icon: '🌀', category: 'modulation' },
    { type: 'walrusjulia', name: 'Walrus Julia', icon: '🌊', category: 'modulation' },
    { type: 'bossce1', name: 'Boss CE-1', icon: '🎵', category: 'modulation' },
    { type: 'mxrphase90', name: 'MXR Phase 90', icon: '🔄', category: 'modulation' },
    { type: 'univibe', name: 'Uni-Vibe', icon: '🌈', category: 'modulation' },
    { type: 'bossbf2', name: 'Boss BF-2', icon: '✈️', category: 'modulation' },
    { type: 'bosstr2', name: 'Boss TR-2', icon: '〰️', category: 'modulation' },
    { type: 'chorus', name: 'Chorus', icon: '🌊', category: 'modulation' },
    { type: 'analogchorus', name: 'Analog Chorus', icon: '🌀', category: 'modulation' },
    { type: 'phaser', name: 'Phaser', icon: '🌈', category: 'modulation' },
    { type: 'flanger', name: 'Flanger', icon: '💫', category: 'modulation' },
    { type: 'analogflanger', name: 'Analog Flanger', icon: '🎪', category: 'modulation' },
    { type: 'tremolo', name: 'Tremolo', icon: '📳', category: 'modulation' },
    { type: 'vibrato', name: 'Vibrato', icon: '〰️', category: 'modulation' },
    { type: 'rotary', name: 'Rotary Speaker', icon: '🔄', category: 'modulation' },
    { type: 'autopan', name: 'Auto Pan', icon: '↔️', category: 'modulation' },
    
    // DYNAMICS (CLASSIC)
    { type: 'keeleycomp', name: 'Keeley Compressor', icon: '🎚️', category: 'dynamics' },
    { type: 'mxrdynacomp', name: 'MXR Dyna Comp', icon: '🔘', category: 'dynamics' },
    { type: 'compressor', name: 'Compressor', icon: '📊', category: 'dynamics' },
    { type: 'limiter', name: 'Limiter', icon: '🛑', category: 'dynamics' },
    { type: 'noisegate', name: 'Noise Gate', icon: '🚪', category: 'dynamics' },
    { type: 'tubecompressor', name: 'Tube Compressor', icon: '🎚️', category: 'dynamics' },
    
    // EQ/FILTER (CLASSIC)
    { type: 'mxr10bandeq', name: 'MXR 10-Band EQ', icon: '📊', category: 'filter' },
    { type: 'crybabywah', name: 'Cry Baby Wah', icon: '👶', category: 'filter' },
    { type: 'eq', name: 'Parametric EQ', icon: '🎚️', category: 'filter' },
    { type: 'graphiceq', name: 'Graphic EQ', icon: '📊', category: 'filter' },
    { type: 'wah', name: 'Wah-Wah', icon: '👄', category: 'filter' },
    { type: 'autowah', name: 'Auto-Wah', icon: '🤖', category: 'filter' },
    { type: 'envfilter', name: 'Envelope Filter', icon: '📈', category: 'filter' },
    { type: 'talkbox', name: 'Talk Box', icon: '🗣️', category: 'filter' },
    { type: 'lfofilter', name: 'LFO Filter', icon: '🌊', category: 'filter' },
    { type: 'stepfilter', name: 'Step Filter', icon: '📶', category: 'filter' },
    
    // PITCH/HARMONY
    { type: 'octaver', name: 'Octaver', icon: '🎵', category: 'pitch' },
    { type: 'pitchshifter', name: 'Pitch Shifter', icon: '🎼', category: 'pitch' },
    { type: 'harmonizer', name: 'Harmonizer', icon: '🎹', category: 'pitch' },
    { type: 'whammy', name: 'Whammy', icon: '🎸', category: 'pitch' },
    { type: 'detune', name: 'Detune', icon: '🎵', category: 'pitch' },
    
    // SPECIAL FX + MULTI-FX
    { type: 'eventideh9', name: 'Eventide H9', icon: '🌟', category: 'special' },
    { type: 'looper', name: 'Looper', icon: '⭕', category: 'special' },
    { type: 'ringmod', name: 'Ring Modulator', icon: '🛸', category: 'special' },
    { type: 'bitcrusher', name: 'Bit Crusher', icon: '🤖', category: 'special' },
    { type: 'slicer', name: 'Slicer', icon: '✂️', category: 'special' },
    { type: 'stepslicer', name: 'Step Slicer', icon: '🔪', category: 'special' },
    { type: 'swell', name: 'Swell', icon: '🌊', category: 'special' },
    { type: 'feedback', name: 'Feedback', icon: '🔊', category: 'special' },
    { type: 'vocoder', name: 'Vocoder', icon: '🎤', category: 'special' },
    
    // UTILITY
    { type: 'volume', name: 'Volume Pedal', icon: '🔊', category: 'utility' },
    { type: 'tuner', name: 'Tuner', icon: '🎯', category: 'utility' },
    { type: 'abtoggle', name: 'A/B Toggle', icon: '🔀', category: 'utility' },
    { type: 'splitter', name: 'Signal Splitter', icon: '🔱', category: 'utility' }
  ];

  return (
    <div className="app" style={{ 
      background: theme.background,
      color: theme.text 
    }}>
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🎸</span>
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
            📚 Browse Presets
          </button>
          
          <button 
            className="preset-button"
            onClick={() => setShowPresetMenu(true)}
            disabled={!backendConnected}
            title={backendConnected ? 'Gerenciar Presets (Backend)' : 'Backend desconectado'}
          >
            💾 Backend Presets
          </button>
          
          {!isAudioActive ? (
            <button className="start-button" onClick={startAudio}>
              🎤 START AUDIO
            </button>
          ) : (
            <div className="audio-active-indicator">
              <span className="pulse-dot"></span>
              AUDIO ATIVO
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

        {/* Input Monitor - Always Visible */}
        <InputMonitor audioEngine={audioEngineRef.current} isActive={isAudioActive} />

        <div className="sidebar-section">
          <h3>🎚️ Global</h3>
          <div className="sidebar-controls">
            <div className="sidebar-control">
              <label>Master Vol</label>
              <input type="range" min="0" max="100" defaultValue="80" />
            </div>
            <div className="sidebar-control">
              <label>Input Gain</label>
              <input type="range" min="0" max="100" defaultValue="50" />
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>🎸 Chain</h3>
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
          <h3>⚡ Quick</h3>
          <button className="sidebar-btn" onClick={() => effects.forEach(e => updateEffect(e.id, 'bypass', true))}>
            Bypass All
          </button>
          <button className="sidebar-btn" onClick={() => effects.forEach(e => updateEffect(e.id, 'bypass', false))}>
            Enable All
          </button>
          <button className="sidebar-btn danger" onClick={() => effects.forEach(e => removeEffect(e.id))}>
            Clear All
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
                
                const categoryNames = {
                  amp: '🔊 Amplificadores',
                  drive: '🎸 Drive & Distorção',
                  time: '⏱️ Delay & Reverb',
                  modulation: '🌊 Modulação',
                  dynamics: '📊 Dinâmica',
                  filter: '🎚️ Filtros',
                  pitch: '🎵 Pitch',
                  special: '✨ Especiais',
                  utility: '🔧 Utilitários'
                };
                
                return (
                  <div key={category} className="effect-category">
                    <h3 className="category-title">{categoryNames[category]}</h3>
                    <div className="effect-grid">
                      {categoryEffects.map((effectType) => (
                        <motion.button
                          key={effectType.type}
                          className="effect-option"
                          onClick={() => addEffect(effectType.type)}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <EffectIcon type={effectType.type} size={48} />
                          <span className="effect-name">{effectType.name}</span>
                        </motion.button>
                      ))}
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
                  ⚠️ Backend desconectado. Inicie o servidor Python para usar presets.
                </div>
              )}

              <div className="preset-actions">
                <button 
                  className="preset-action-button save"
                  onClick={saveCurrentPreset}
                  disabled={effects.length === 0}
                >
                  💾 Salvar Atual
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
                          Carregar
                        </button>
                        <button 
                          className="preset-delete"
                          onClick={() => deletePreset(preset.id)}
                        >
                          🗑️
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
        </div>
      </footer>

      {/* BOTTOM CONTROL BAR */}
      <div className="bottom-bar">
        <div className="bottom-section">
          <div className="bottom-control">
            <label>Tempo (BPM)</label>
            <input type="number" min="40" max="300" defaultValue="120" className="bpm-input" />
            <button className="tap-tempo">TAP</button>
          </div>
        </div>

        <div className="bottom-section">
          <div className="cpu-meter">
            <label>CPU</label>
            <div className="meter-bar">
              <div className="meter-fill" style={{width: '35%'}}></div>
            </div>
            <span>35%</span>
          </div>
        </div>

        <div className="bottom-section">
          <button className="utility-btn" title="MIDI Learn">
            🎹 MIDI
          </button>
          <button className="utility-btn" title="Undo">
            ↶
          </button>
          <button className="utility-btn" title="Redo">
            ↷
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

