import React from 'react';
import { motion } from 'framer-motion';
import Knob from './Knob';
import './Pedal.css';

const Pedal = ({ effect, onUpdate, onBypass, onRemove }) => {
  const handleKnobChange = (parameter) => (value) => {
    onUpdate(effect.id, parameter, value);
  };

  // Função para obter o texto do display dinamicamente baseado no parâmetro atual
  const getDisplayText = () => {
    const type = effect.type;
    
    // Para pedais multi-efeitos, mostra o algoritmo/tipo atual
    switch (type) {
      case 'timelinedelay':
        const delayType = effect.params?.type || 'digital';
        return delayType.toUpperCase().replace('_', ' ');
      
      case 'bigskyreverb':
        const reverbType = effect.params?.type || 'room';
        return reverbType.toUpperCase();
      
      case 'strymonmobius':
        const modulationType = effect.params?.type || 'chorus';
        return modulationType.toUpperCase().replace('_', ' ');
      
      case 'bossdd500':
        const dd500Mode = effect.params?.mode || 'standard';
        return dd500Mode.toUpperCase().replace('_', ' ');
      
      case 'bossrv500':
        const rv500Mode = effect.params?.mode || 'room';
        return rv500Mode.toUpperCase().replace('_', ' ');
      
      case 'eventideh9':
        const h9Algorithm = effect.params?.algorithm || 'hall';
        return h9Algorithm.toUpperCase().replace('_', ' ');
      
      case 'eventidespace':
        const spaceAlgorithm = effect.params?.algorithm || 'hall';
        return spaceAlgorithm.toUpperCase().replace('_', ' ');
      
      case 'line6dl4':
        const dl4Mode = effect.params?.mode || 'digital';
        return dl4Mode.toUpperCase().replace('-', ' ');
      
      default:
        // Para outros pedais, usa o displayText padrão do config
        const config = getPedalConfig(type);
        return config.displayText || '';
    }
  };

  const getPedalConfig = (type) => {
    const configs = {
      // ============================================
      // CLASSIC PEDALS - AUTHENTIC COLORS
      // ============================================
      
      // TUBE SCREAMER - Ibanez Green
      tubescreamer: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#00a550', // Authentic Ibanez green
        bodyGradient: 'linear-gradient(145deg, #00cc66 0%, #00a550 50%, #008844 100%)',
        metalColor: '#f5deb3', // Cream knobs
        ledColor: '#00ff00',
        label: 'TS-9',
        brand: 'IBANEZ'
      },
      
      // Generic overdrive (keep old style)
      overdrive: { 
        primary: '#00ff44', 
        secondary: '#00cc33',
        bgColor: '#006622',
        bodyGradient: 'linear-gradient(145deg, #00aa33 0%, #006622 50%, #004411 100%)',
        metalColor: '#gold',
        label: 'OD'
      },
      // BOSS DS-1 - Orange
      bossds1: {
        primary: '#ff0000',
        secondary: '#cc0000',
        bgColor: '#ff6600', // Authentic Boss orange
        bodyGradient: 'linear-gradient(145deg, #ff7722 0%, #ff6600 50%, #dd5500 100%)',
        metalColor: '#2a2a2a', // Black knobs
        ledColor: '#ff0000',
        label: 'DS-1',
        brand: 'BOSS'
      },
      
      // Generic distortion
      distortion: { 
        primary: '#ff6600', 
        secondary: '#cc5500',
        bgColor: '#994400',
        bodyGradient: 'linear-gradient(145deg, #cc5500 0%, #994400 50%, #663300 100%)',
        metalColor: '#silver',
        label: 'DIST'
      },
      
      // BIG MUFF - Black with red LED
      bigmuff: {
        primary: '#ff0000',
        secondary: '#cc0000',
        bgColor: '#000000', // Classic black
        bodyGradient: 'linear-gradient(145deg, #1a1a1a 0%, #000000 50%, #000000 100%)',
        metalColor: '#c0c0c0', // Silver knobs
        ledColor: '#ff0000',
        label: 'π',
        brand: 'Big Muff',
        subtitle: 'ELECTRO-HARMONIX'
      },
      
      // Generic fuzz
      fuzz: { 
        primary: '#ffffff', 
        secondary: '#cccccc',
        bgColor: '#1a1a1a',
        bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#silver',
        label: 'FUZZ'
      },
      
      // MODULATION FAMILY
      delay: { 
        primary: '#00ffcc', 
        secondary: '#00cc99',
        bgColor: '#008866',
        bodyGradient: 'linear-gradient(145deg, #00aa88 0%, #008866 50%, #005544 100%)',
        metalColor: '#silver',
        label: 'DD-7' // Boss DD-7
      },
      chorus: { 
        primary: '#4488ff', 
        secondary: '#3366cc',
        bgColor: '#224499',
        bodyGradient: 'linear-gradient(145deg, #3366cc 0%, #224499 50%, #112266 100%)',
        metalColor: '#silver',
        label: 'CH-1' // Boss CH-1
      },
      phaser: { 
        primary: '#ff8800', 
        secondary: '#cc6600',
        bgColor: '#994400',
        bodyGradient: 'linear-gradient(145deg, #cc6600 0%, #994400 50%, #662200 100%)',
        metalColor: '#gold',
        label: 'PH-3' // Boss PH-3 / MXR Phase 90
      },
      flanger: { 
        primary: '#ff00ff', 
        secondary: '#cc00cc',
        bgColor: '#990099',
        bodyGradient: 'linear-gradient(145deg, #cc00cc 0%, #990099 50%, #660066 100%)',
        metalColor: '#silver',
        label: 'BF-3' // Boss BF-3
      },
      tremolo: { 
        primary: '#ffcc00', 
        secondary: '#cc9900',
        bgColor: '#996600',
        bodyGradient: 'linear-gradient(145deg, #cc9900 0%, #996600 50%, #664400 100%)',
        metalColor: '#gold',
        label: 'TR-2' // Boss TR-2
      },
      vibrato: { 
        primary: '#00ccff', 
        secondary: '#0099cc',
        bgColor: '#006699',
        bodyGradient: 'linear-gradient(145deg, #0099cc 0%, #006699 50%, #004466 100%)',
        metalColor: '#silver',
        label: 'VB-2' // Boss VB-2
      },
      univibe: { 
        primary: '#9933ff', 
        secondary: '#7722cc',
        bgColor: '#551199',
        bodyGradient: 'linear-gradient(145deg, #7722cc 0%, #551199 50%, #330066 100%)',
        metalColor: '#gold',
        label: 'UV-1' // Uni-Vibe
      },
      rotary: { 
        primary: '#ff6699', 
        secondary: '#cc4477',
        bgColor: '#992255',
        bodyGradient: 'linear-gradient(145deg, #cc4477 0%, #992255 50%, #661133 100%)',
        metalColor: '#silver',
        label: 'ROT' // Rotary Speaker
      },
      
      // REVERB/DELAY FAMILY
      reverb: { 
        primary: '#bb44ff', 
        secondary: '#8822cc',
        bgColor: '#5522aa',
        bodyGradient: 'linear-gradient(145deg, #9933dd 0%, #5522aa 50%, #331166 100%)',
        metalColor: '#silver',
        label: 'RV-6' // Boss RV-6
      },
      
      // DYNAMIC PROCESSORS
      compressor: { 
        primary: '#4499ff', 
        secondary: '#3377cc',
        bgColor: '#225599',
        bodyGradient: 'linear-gradient(145deg, #3377cc 0%, #225599 50%, #113366 100%)',
        metalColor: '#silver',
        label: 'CS-3' // Boss CS-3
      },
      limiter: { 
        primary: '#6699ff', 
        secondary: '#5577cc',
        bgColor: '#334499',
        bodyGradient: 'linear-gradient(145deg, #5577cc 0%, #334499 50%, #222266 100%)',
        metalColor: '#silver',
        label: 'LM-2'
      },
      noisegate: { 
        primary: '#ff3366', 
        secondary: '#cc2244',
        bgColor: '#991133',
        bodyGradient: 'linear-gradient(145deg, #cc2244 0%, #991133 50%, #660022 100%)',
        metalColor: '#silver',
        label: 'NS-2' // Boss NS-2
      },
      
      // EQ FAMILY
      eq: { 
        primary: '#44ff88', 
        secondary: '#33cc66',
        bgColor: '#229944',
        bodyGradient: 'linear-gradient(145deg, #33cc66 0%, #229944 50%, #116622 100%)',
        metalColor: '#silver',
        label: 'GE-7' // Boss GE-7
      },
      
      // FILTER/WAH FAMILY
      wah: { 
        primary: '#ffaa00', 
        secondary: '#cc8800',
        bgColor: '#996600',
        bodyGradient: 'linear-gradient(145deg, #cc8800 0%, #996600 50%, #664400 100%)',
        metalColor: '#gold',
        label: 'CRY' // Cry Baby
      },
      autowah: { 
        primary: '#ff9933', 
        secondary: '#cc7722',
        bgColor: '#995511',
        bodyGradient: 'linear-gradient(145deg, #cc7722 0%, #995511 50%, #663300 100%)',
        metalColor: '#gold',
        label: 'AW-3'
      },
      envelopefilter: { 
        primary: '#ffdd00', 
        secondary: '#ccaa00',
        bgColor: '#997700',
        bodyGradient: 'linear-gradient(145deg, #ccaa00 0%, #997700 50%, #665500 100%)',
        metalColor: '#gold',
        label: 'EF-X'
      },
      
      // PITCH/HARMONY
      octaver: { 
        primary: '#ff0099', 
        secondary: '#cc0077',
        bgColor: '#990055',
        bodyGradient: 'linear-gradient(145deg, #cc0077 0%, #990055 50%, #660033 100%)',
        metalColor: '#silver',
        label: 'OC-5' // Boss OC-5
      },
      pitchshifter: { 
        primary: '#00ff99', 
        secondary: '#00cc77',
        bgColor: '#009955',
        bodyGradient: 'linear-gradient(145deg, #00cc77 0%, #009955 50%, #006633 100%)',
        metalColor: '#silver',
        label: 'PS-6'
      },
      harmonizer: { 
        primary: '#9900ff', 
        secondary: '#7700cc',
        bgColor: '#550099',
        bodyGradient: 'linear-gradient(145deg, #7700cc 0%, #550099 50%, #330066 100%)',
        metalColor: '#silver',
        label: 'HR-2'
      },
      whammy: { 
        primary: '#ff0000', 
        secondary: '#cc0000',
        bgColor: '#990000',
        bodyGradient: 'linear-gradient(145deg, #cc0000 0%, #990000 50%, #660000 100%)',
        metalColor: '#silver',
        label: 'WH-1' // Digitech Whammy
      },
      
      // SPECIAL FX
      looper: { 
        primary: '#00ffff', 
        secondary: '#00cccc',
        bgColor: '#009999',
        bodyGradient: 'linear-gradient(145deg, #00cccc 0%, #009999 50%, #006666 100%)',
        metalColor: '#silver',
        label: 'RC-5' // Boss RC-5
      },
      bitcrusher: { 
        primary: '#33ff33', 
        secondary: '#22cc22',
        bgColor: '#119911',
        bodyGradient: 'linear-gradient(145deg, #22cc22 0%, #119911 50%, #006600 100%)',
        metalColor: '#silver',
        label: 'BC-1'
      },
      ringmod: { 
        primary: '#ffff00', 
        secondary: '#cccc00',
        bgColor: '#999900',
        bodyGradient: 'linear-gradient(145deg, #cccc00 0%, #999900 50%, #666600 100%)',
        metalColor: '#gold',
        label: 'RM-X'
      },
      slicer: { 
        primary: '#ff33cc', 
        secondary: '#cc2299',
        bgColor: '#991166',
        bodyGradient: 'linear-gradient(145deg, #cc2299 0%, #991166 50%, #660044 100%)',
        metalColor: '#silver',
        label: 'SL-20'
      },
      
      // SPECIFIC LEGENDARY PEDALS
      tapeecho: { 
        primary: '#ffbb77', 
        secondary: '#cc9955',
        bgColor: '#997733',
        bodyGradient: 'linear-gradient(145deg, #cc9955 0%, #997733 50%, #665522 100%)',
        metalColor: '#gold',
        label: 'EP-3'
      },
      springreverb: { 
        primary: '#88ddff', 
        secondary: '#66bbcc',
        bgColor: '#449999',
        bodyGradient: 'linear-gradient(145deg, #66bbcc 0%, #449999 50%, #226666 100%)',
        metalColor: '#silver',
        label: 'SR-16'
      },
      shimmerreverb: { 
        primary: '#ffccff', 
        secondary: '#cc99cc',
        bgColor: '#996699',
        bodyGradient: 'linear-gradient(145deg, #cc99cc 0%, #996699 50%, #663366 100%)',
        metalColor: '#silver',
        label: 'SHM-R'
      },
      
      // NOVOS EFEITOS
      metaldistortion: { 
        primary: '#333333', 
        secondary: '#1a1a1a',
        bgColor: '#000000',
        bodyGradient: 'linear-gradient(145deg, #444444 0%, #222222 50%, #000000 100%)',
        metalColor: '#silver',
        label: 'MT-2'
      },
      boost: { 
        primary: '#ffff00', 
        secondary: '#cccc00',
        bgColor: '#999900',
        bodyGradient: 'linear-gradient(145deg, #cccc00 0%, #999900 50%, #666600 100%)',
        metalColor: '#gold',
        label: 'BOOST'
      },
      tapdelay: { 
        primary: '#00aa88', 
        secondary: '#008866',
        bgColor: '#006655',
        bodyGradient: 'linear-gradient(145deg, #009977 0%, #007766 50%, #005544 100%)',
        metalColor: '#silver',
        label: 'TAP'
      },
      hallreverb: { 
        primary: '#8844ff', 
        secondary: '#6622cc',
        bgColor: '#4411aa',
        bodyGradient: 'linear-gradient(145deg, #7733dd 0%, #5522aa 50%, #331188 100%)',
        metalColor: '#silver',
        label: 'HALL'
      },
      platereverb: { 
        primary: '#cc44ff', 
        secondary: '#9922cc',
        bgColor: '#6611aa',
        bodyGradient: 'linear-gradient(145deg, #aa33dd 0%, #7722aa 50%, #441188 100%)',
        metalColor: '#silver',
        label: 'PLATE'
      },
      roomreverb: { 
        primary: '#ff88cc', 
        secondary: '#cc6699',
        bgColor: '#994477',
        bodyGradient: 'linear-gradient(145deg, #dd77bb 0%, #aa5588 50%, #773366 100%)',
        metalColor: '#silver',
        label: 'ROOM'
      },
      analogchorus: { 
        primary: '#5599ff', 
        secondary: '#3377cc',
        bgColor: '#225599',
        bodyGradient: 'linear-gradient(145deg, #4488dd 0%, #3366aa 50%, #224477 100%)',
        metalColor: '#silver',
        label: 'AC-1'
      },
      analogflanger: { 
        primary: '#ff44ff', 
        secondary: '#cc22cc',
        bgColor: '#991199',
        bodyGradient: 'linear-gradient(145deg, #dd33dd 0%, #aa22aa 50%, #771177 100%)',
        metalColor: '#silver',
        label: 'AF-2'
      },
      autopan: { 
        primary: '#66ff99', 
        secondary: '#44cc77',
        bgColor: '#229955',
        bodyGradient: 'linear-gradient(145deg, #55dd88 0%, #33aa66 50%, #117744 100%)',
        metalColor: '#silver',
        label: 'PAN'
      },
      tubecompressor: { 
        primary: '#ff9966', 
        secondary: '#cc7744',
        bgColor: '#995522',
        bodyGradient: 'linear-gradient(145deg, #dd8855 0%, #aa6633 50%, #774411 100%)',
        metalColor: '#gold',
        label: 'TUBE'
      },
      graphiceq: { 
        primary: '#44ffcc', 
        secondary: '#22cc99',
        bgColor: '#119966',
        bodyGradient: 'linear-gradient(145deg, #33ddaa 0%, #228877 50%, #115544 100%)',
        metalColor: '#silver',
        label: 'GEQ'
      },
      talkbox: { 
        primary: '#ffcc44', 
        secondary: '#cc9922',
        bgColor: '#996611',
        bodyGradient: 'linear-gradient(145deg, #ddaa33 0%, #aa7722 50%, #774411 100%)',
        metalColor: '#gold',
        label: 'TALK'
      },
      lfofilter: { 
        primary: '#99ff44', 
        secondary: '#77cc22',
        bgColor: '#559911',
        bodyGradient: 'linear-gradient(145deg, #88dd33 0%, #66aa22 50%, #447711 100%)',
        metalColor: '#gold',
        label: 'LFO'
      },
      stepfilter: { 
        primary: '#44ff99', 
        secondary: '#22cc77',
        bgColor: '#119955',
        bodyGradient: 'linear-gradient(145deg, #33dd88 0%, #22aa66 50%, #117744 100%)',
        metalColor: '#silver',
        label: 'STEP'
      },
      detune: { 
        primary: '#ff99cc', 
        secondary: '#cc7799',
        bgColor: '#995577',
        bodyGradient: 'linear-gradient(145deg, #dd88bb 0%, #aa6688 50%, #774455 100%)',
        metalColor: '#silver',
        label: 'DET'
      },
      stepslicer: { 
        primary: '#ff44dd', 
        secondary: '#cc22aa',
        bgColor: '#991188',
        bodyGradient: 'linear-gradient(145deg, #dd33cc 0%, #aa2299 50%, #771166 100%)',
        metalColor: '#silver',
        label: 'STEP'
      },
      swell: { 
        primary: '#88ccff', 
        secondary: '#6699cc',
        bgColor: '#447799',
        bodyGradient: 'linear-gradient(145deg, #77aadd 0%, #5588aa 50%, #336677 100%)',
        metalColor: '#silver',
        label: 'SWELL'
      },
      feedback: { 
        primary: '#ff8844', 
        secondary: '#cc6622',
        bgColor: '#994411',
        bodyGradient: 'linear-gradient(145deg, #dd7733 0%, #aa5522 50%, #773311 100%)',
        metalColor: '#gold',
        label: 'FDBK'
      },
      vocoder: { 
        primary: '#4488ff', 
        secondary: '#2266cc',
        bgColor: '#114499',
        bodyGradient: 'linear-gradient(145deg, #3377dd 0%, #2255aa 50%, #113377 100%)',
        metalColor: '#silver',
        label: 'VOC'
      },
      volume: { 
        primary: '#cccccc', 
        secondary: '#999999',
        bgColor: '#666666',
        bodyGradient: 'linear-gradient(145deg, #aaaaaa 0%, #777777 50%, #444444 100%)',
        metalColor: '#silver',
        label: 'VOL'
      },
      tuner: { 
        primary: '#00ff00', 
        secondary: '#00cc00',
        bgColor: '#009900',
        bodyGradient: 'linear-gradient(145deg, #00dd00 0%, #00aa00 50%, #007700 100%)',
        metalColor: '#silver',
        label: 'TU-3'
      },
      abtoggle: { 
        primary: '#ffaa00', 
        secondary: '#cc8800',
        bgColor: '#996600',
        bodyGradient: 'linear-gradient(145deg, #dd9900 0%, #aa7700 50%, #775500 100%)',
        metalColor: '#gold',
        label: 'A/B'
      },
      splitter: { 
        primary: '#00ccff', 
        secondary: '#0099cc',
        bgColor: '#006699',
        bodyGradient: 'linear-gradient(145deg, #00aadd 0%, #0088aa 50%, #005577 100%)',
        metalColor: '#silver',
        label: 'SPLIT'
      },
      
      // NEW EFFECTS 2025 - DRIVE (authentic colors)
      ts808: { primary: '#00ff00', secondary: '#00cc00', bgColor: '#00a550', bodyGradient: 'linear-gradient(145deg, #00cc66 0%, #00a550 50%, #008844 100%)', metalColor: '#f5deb3', ledColor: '#00ff00', label: 'TS808', brand: 'IBANEZ', subtitle: 'Tube Screamer', texture: 'matte', style: 'vintage' },
      bossod3: { primary: '#ff0000', secondary: '#cc0000', bgColor: '#ff6600', bodyGradient: 'linear-gradient(145deg, #ff7722 0%, #ff6600 50%, #dd5500 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'OD-3', brand: 'BOSS', subtitle: 'OverDrive', texture: 'boss-compact', style: 'japanese' },
      maxonod808: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#2d6b1e', bodyGradient: 'linear-gradient(145deg, #3a8a28 0%, #2d6b1e 50%, #1e4d14 100%)', metalColor: '#f5deb3', ledColor: '#00ff00', label: 'OD808', brand: 'Maxon', subtitle: 'Overdrive', texture: 'matte', style: 'vintage' },
      tumnus: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c4a030', bodyGradient: 'linear-gradient(145deg, #e0c860 0%, #c4a030 50%, #a88820 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'TUMNUS', brand: 'Wampler', labelColor: '#000000', texture: 'metallic', style: 'boutique' },
      morningglory: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#daa520', bodyGradient: 'linear-gradient(145deg, #eebb44 0%, #daa520 50%, #bb8810 100%)', metalColor: '#2a2a2a', knobPointer: '#ff0000', ledColor: '#ff0000', label: 'MORNING GLORY', brand: 'JHS', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      soulfood: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#f5f0e0', bodyGradient: 'linear-gradient(145deg, #fffbf0 0%, #f5f0e0 50%, #e0d8c0 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'SOUL FOOD', brand: 'Electro-Harmonix', subtitle: 'Transparent OD', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      zendrive: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#6b3fa0', bodyGradient: 'linear-gradient(145deg, #8855bb 0%, #6b3fa0 50%, #4e2d78 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'ZENDRIVE', brand: 'Hermida Audio', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      timmy: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#e8e0d0', bodyGradient: 'linear-gradient(145deg, #f5f0e8 0%, #e8e0d0 50%, #d0c8b0 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'TIMMY', brand: 'Paul Cochrane', labelColor: '#000000', texture: 'matte', style: 'boutique' },
      friedmanbeod: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(145deg, #333333 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'BE-OD', brand: 'Friedman', subtitle: 'Brown Eye', labelColor: '#ffffff', texture: 'matte', style: 'highgain', footswitchColor: '#c0c0c0' },
      suhrriot: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #050505 100%)', metalColor: '#c0c0c0', knobPointer: '#ff6600', ledColor: '#ff0000', label: 'RIOT', brand: 'Suhr', subtitle: 'Distortion', labelColor: '#ffffff', texture: 'metallic', style: 'highgain' },
      catalinbreaddls: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#8b0000', bodyGradient: 'linear-gradient(145deg, #aa2222 0%, #8b0000 50%, #660000 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'DLS', brand: 'Catalinbread', subtitle: 'Dirty Little Secret', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      bognerecstasyblue: { primary: '#ffffff', secondary: '#aaddff', bgColor: '#0055aa', bodyGradient: 'linear-gradient(145deg, #0077cc 0%, #0055aa 50%, #003388 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'ECSTASY', brand: 'Bogner', subtitle: 'Blue Channel', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      plumes: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#7cfc00', bodyGradient: 'linear-gradient(145deg, #99ff33 0%, #7cfc00 50%, #5abc00 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#00ff00', label: 'PLUMES', brand: 'EQD', subtitle: 'Small Signal Shredder', labelColor: '#000000', texture: 'matte', style: 'boutique' },
      dod250: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#808080', bodyGradient: 'linear-gradient(145deg, #999999 0%, #808080 50%, #666666 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: '250', brand: 'DOD', subtitle: 'Overdrive Preamp', labelColor: '#ffff00', texture: 'metallic', style: 'vintage' },
      darkglassb7k: { primary: '#00ffff', secondary: '#00cccc', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#00ffff', ledColor: '#00ffff', label: 'B7K', brand: 'Darkglass', subtitle: 'Ultra v2', labelColor: '#00ffff', texture: 'metallic', style: 'modern-bass' },
      swollenpickle: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#006400', bodyGradient: 'linear-gradient(145deg, #228b22 0%, #006400 50%, #004400 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#00ff00', label: 'SWOLLEN PICKLE', brand: 'Way Huge', subtitle: 'Jumbo Fuzz', labelColor: '#ffffff', texture: 'matte', style: 'fuzz' },
      greenrussian: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#2e5e1e', bodyGradient: 'linear-gradient(145deg, #3a7a2a 0%, #2e5e1e 50%, #1e4010 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'GREEN RUSSIAN', brand: 'Electro-Harmonix', subtitle: 'Big Muff', labelColor: '#ffffff', texture: 'matte', style: 'ehx' },
      fuzzlordchime: { primary: '#ffff00', secondary: '#cccc00', bgColor: '#4b0082', bodyGradient: 'linear-gradient(145deg, #6a0dad 0%, #4b0082 50%, #300055 100%)', metalColor: '#c0c0c0', knobPointer: '#ffff00', ledColor: '#ff0000', label: 'CHIME', brand: 'Fuzzlord', subtitle: 'Octave Fuzz', labelColor: '#ffff00', texture: 'matte', style: 'fuzz' },
      badmonkey: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#ffcc00', bodyGradient: 'linear-gradient(145deg, #ffdd33 0%, #ffcc00 50%, #ddaa00 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'BAD MONKEY', brand: 'DigiTech', subtitle: 'Tube Overdrive', labelColor: '#000000', texture: 'matte', style: 'budget' },
      amp11: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#cc0000', bodyGradient: 'linear-gradient(145deg, #ee2222 0%, #cc0000 50%, #990000 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'AMP ELEVEN', brand: 'Lovepedal', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      fulldrive2: { primary: '#ffffff', secondary: '#ddeeff', bgColor: '#1a5bb5', bodyGradient: 'linear-gradient(145deg, #2266cc 0%, #1a5bb5 50%, #134a99 100%)', metalColor: '#e0e0e0', knobPointer: '#1a1a1a', ledColor: '#00ff00', label: '', brand: 'Fulltone', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      
      // NEW EFFECTS 2025 - MODULATION (authentic)
      tccorona: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#0066cc', bodyGradient: 'linear-gradient(145deg, #0088ee 0%, #0066cc 50%, #0044aa 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: 'CORONA', brand: 'TC Electronic', subtitle: 'Chorus', texture: 'tc-compact', style: 'danish' },
      strymonola: { primary: '#0099ff', secondary: '#0077cc', bgColor: '#e8e0d0', bodyGradient: 'linear-gradient(145deg, #f5f0e8 0%, #e8e0d0 50%, #d0c8b0 100%)', metalColor: '#c0c0c0', knobPointer: '#0099ff', ledColor: '#0066ff', label: 'Ola', brand: 'Strymon', subtitle: 'dBucket Chorus', labelColor: '#0099ff', texture: 'metallic', style: 'strymon' },
      smallstone: { primary: '#ff6600', secondary: '#cc5500', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d4d4d4 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'SMALL STONE', brand: 'Electro-Harmonix', subtitle: 'Phase Shifter', labelColor: '#ff6600', texture: 'metallic', style: 'ehx' },
      phase100: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#ff6600', bodyGradient: 'linear-gradient(145deg, #ff8822 0%, #ff6600 50%, #dd5500 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'M107', brand: 'MXR', subtitle: 'Phase 100', texture: 'matte', style: 'vintage' },
      electricmistress: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'ELECTRIC MISTRESS', brand: 'Electro-Harmonix', subtitle: 'Flanger', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      tcvortex: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#ff3300', bodyGradient: 'linear-gradient(145deg, #ff5533 0%, #ff3300 50%, #cc2200 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: 'VORTEX', brand: 'TC Electronic', subtitle: 'Flanger', texture: 'tc-compact', style: 'danish' },
      dejavibe: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#f5f0e0', bodyGradient: 'linear-gradient(145deg, #fffbf0 0%, #f5f0e0 50%, #e0d8c0 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'DEJA VIBE', brand: 'Fulltone', subtitle: 'Uni-Vibe', labelColor: '#000000', texture: 'metallic', style: 'boutique' },
      rotovibe: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#8b4513', bodyGradient: 'linear-gradient(145deg, #a0522d 0%, #8b4513 50%, #6b3310 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'ROTOVIBE', brand: 'Dunlop', texture: 'matte', style: 'vintage' },
      diamondtrem: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#4169e1', bodyGradient: 'linear-gradient(145deg, #5588ff 0%, #4169e1 50%, #2244bb 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'TRM-1', brand: 'Diamond', subtitle: 'Tremolo', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      warpedvinyl: { primary: '#ff6600', secondary: '#cc5500', bgColor: '#f5f0e8', bodyGradient: 'linear-gradient(145deg, #fffbf5 0%, #f5f0e8 50%, #e0d8c8 100%)', metalColor: '#2a2a2a', knobPointer: '#ff6600', ledColor: '#ff6600', label: 'WARPED VINYL', brand: 'Chase Bliss', subtitle: 'Analog Vibrato', labelColor: '#ff6600', texture: 'metallic', style: 'chasebliss' },
      polychorus: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'POLYCHORUS', brand: 'Electro-Harmonix', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      tcshaker: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#cc0066', bodyGradient: 'linear-gradient(145deg, #ee0088 0%, #cc0066 50%, #990044 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: 'SHAKER', brand: 'TC Electronic', subtitle: 'Vibrato', texture: 'tc-compact', style: 'danish' },
      monument: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#2f4f4f', bodyGradient: 'linear-gradient(145deg, #4a6a6a 0%, #2f4f4f 50%, #1a3030 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'MONUMENT', brand: 'Walrus Audio', subtitle: 'Harmonic Tap Tremolo', labelColor: '#ffffff', texture: 'matte', style: 'walrus' },
      particle: { primary: '#ff0066', secondary: '#cc0044', bgColor: '#ff3388', bodyGradient: 'linear-gradient(145deg, #ff55aa 0%, #ff3388 50%, #cc1166 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0066', label: 'PARTICLE', brand: 'Red Panda', subtitle: 'Granular Delay', labelColor: '#ffffff', texture: 'matte', style: 'experimental' },
      merisenzo: { primary: '#00ffff', secondary: '#00cccc', bgColor: '#1a1a2e', bodyGradient: 'linear-gradient(145deg, #2a2a44 0%, #1a1a2e 50%, #0a0a1e 100%)', metalColor: '#c0c0c0', knobPointer: '#00ffff', ledColor: '#00ffff', label: 'ENZO', brand: 'Meris', subtitle: 'Multi-Voice Synth', labelColor: '#00ffff', texture: 'metallic', style: 'meris' },
      
      // NEW EFFECTS 2025 - TIME-BASED (authentic)
      tcflashback: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#ff6600', bodyGradient: 'linear-gradient(145deg, #ff8833 0%, #ff6600 50%, #cc4400 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: 'FLASHBACK', brand: 'TC Electronic', subtitle: 'Delay', texture: 'tc-compact', style: 'danish' },
      supapuss: { primary: '#ffff00', secondary: '#cccc00', bgColor: '#663399', bodyGradient: 'linear-gradient(145deg, #8844bb 0%, #663399 50%, #442266 100%)', metalColor: '#c0c0c0', knobPointer: '#ffff00', ledColor: '#ffff00', label: 'SUPA-PUSS', brand: 'Way Huge', subtitle: 'Analog Delay', labelColor: '#ffff00', texture: 'matte', style: 'wayhuge' },
      arp87: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#708090', bodyGradient: 'linear-gradient(145deg, #8899aa 0%, #708090 50%, #556677 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'ARP-87', brand: 'Walrus Audio', subtitle: 'Multi-Function Delay', labelColor: '#ffffff', texture: 'matte', style: 'walrus' },
      dispatchmaster: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#ffd700', bodyGradient: 'linear-gradient(145deg, #ffe033 0%, #ffd700 50%, #ccaa00 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'DISPATCH MASTER', brand: 'EQD', subtitle: 'Delay & Reverb', labelColor: '#000000', texture: 'matte', style: 'boutique' },
      bossdd3: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#0099ff', bodyGradient: 'linear-gradient(145deg, #22aaff 0%, #0099ff 50%, #0077cc 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'DD-3', brand: 'BOSS', subtitle: 'Digital Delay', texture: 'boss-compact', style: 'japanese' },
      bossdd7: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#0077cc', bodyGradient: 'linear-gradient(145deg, #0099ee 0%, #0077cc 50%, #005599 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'DD-7', brand: 'BOSS', subtitle: 'Digital Delay', texture: 'boss-compact', style: 'japanese' },
      maxonad999: { primary: '#ffff00', secondary: '#cccc00', bgColor: '#556b2f', bodyGradient: 'linear-gradient(145deg, #6a7f3a 0%, #556b2f 50%, #445522 100%)', metalColor: '#c0c0c0', knobPointer: '#ffff00', ledColor: '#00ff00', label: 'AD999', brand: 'Maxon', subtitle: 'Analog Delay', labelColor: '#ffff00', texture: 'matte', style: 'vintage' },
      echosystem: { primary: '#00ccff', secondary: '#0099cc', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#00ccff', ledColor: '#00ccff', label: 'ECHOSYSTEM', brand: 'Empress', subtitle: 'Dual Engine Delay', labelColor: '#00ccff', texture: 'metallic', style: 'empress', type: 'rack' },
      thermae: { primary: '#ff6600', secondary: '#cc5500', bgColor: '#f5f0e8', bodyGradient: 'linear-gradient(145deg, #fffbf5 0%, #f5f0e8 50%, #e0d8c8 100%)', metalColor: '#2a2a2a', knobPointer: '#ff6600', ledColor: '#ff6600', label: 'THERMAE', brand: 'Chase Bliss', subtitle: 'Analog Delay', labelColor: '#ff6600', texture: 'metallic', style: 'chasebliss' },
      belleepoch: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#8b6914', bodyGradient: 'linear-gradient(145deg, #a0801a 0%, #8b6914 50%, #6b500e 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'BELLE EPOCH', brand: 'Catalinbread', subtitle: 'Tape Echo', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      elcapistan: { primary: '#0099ff', secondary: '#0077cc', bgColor: '#e8e0d0', bodyGradient: 'linear-gradient(145deg, #f5f0e8 0%, #e8e0d0 50%, #d0c8b0 100%)', metalColor: '#c0c0c0', knobPointer: '#0099ff', ledColor: '#0066ff', label: 'El Capistan', brand: 'Strymon', subtitle: 'dBucket Tape Echo', labelColor: '#0099ff', texture: 'metallic', style: 'strymon' },
      strymonflint: { primary: '#0099ff', secondary: '#0077cc', bgColor: '#e8d8c0', bodyGradient: 'linear-gradient(145deg, #f0e8d8 0%, #e8d8c0 50%, #d0c0a0 100%)', metalColor: '#c0c0c0', knobPointer: '#0099ff', ledColor: '#0066ff', label: 'Flint', brand: 'Strymon', subtitle: 'Tremolo & Reverb', labelColor: '#0099ff', texture: 'metallic', style: 'strymon' },
      immerse: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#4169e1', bodyGradient: 'linear-gradient(145deg, #5577ff 0%, #4169e1 50%, #2244bb 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'IMMERSE', brand: 'Neunaber', subtitle: 'Reverberator', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      cathedral: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'CATHEDRAL', brand: 'Electro-Harmonix', subtitle: 'Stereo Reverb', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      walrusslo: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#4a2060', bodyGradient: 'linear-gradient(145deg, #663388 0%, #4a2060 50%, #300040 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#9933ff', label: 'SLÖ', brand: 'Walrus Audio', subtitle: 'Multi Texture Reverb', labelColor: '#ffffff', texture: 'matte', style: 'walrus' },
      darkstar: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#1a0033', bodyGradient: 'linear-gradient(145deg, #2a0055 0%, #1a0033 50%, #0a0015 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff00ff', label: 'DARK STAR', brand: 'Old Blood Noise', subtitle: 'Pad Reverb', labelColor: '#ffffff', texture: 'matte', style: 'experimental' },
      mercury7: { primary: '#00ccff', secondary: '#0099cc', bgColor: '#1a1a2e', bodyGradient: 'linear-gradient(145deg, #2a2a44 0%, #1a1a2e 50%, #0a0a1e 100%)', metalColor: '#c0c0c0', knobPointer: '#00ccff', ledColor: '#00ccff', label: 'MERCURY7', brand: 'Meris', subtitle: 'Algorithmic Reverb', labelColor: '#00ccff', texture: 'metallic', style: 'meris' },
      rpcontext: { primary: '#ff0066', secondary: '#cc0044', bgColor: '#333333', bodyGradient: 'linear-gradient(145deg, #444444 0%, #333333 50%, #222222 100%)', metalColor: '#c0c0c0', knobPointer: '#ff0066', ledColor: '#ff0066', label: 'CONTEXT', brand: 'Red Panda', subtitle: 'Reverb', labelColor: '#ff0066', texture: 'matte', style: 'experimental' },
      tensor: { primary: '#ff0066', secondary: '#cc0044', bgColor: '#ff3388', bodyGradient: 'linear-gradient(145deg, #ff55aa 0%, #ff3388 50%, #cc1166 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0066', label: 'TENSOR', brand: 'Red Panda', subtitle: 'Tape Effects', labelColor: '#ffffff', texture: 'matte', style: 'experimental' },
      
      // NEW EFFECTS 2025 - DYNAMICS (authentic)
      fmrrnc: { primary: '#00ff00', secondary: '#00cc00', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'RNC 1773', brand: 'FMR Audio', subtitle: 'Really Nice Compressor', labelColor: '#00ff00', texture: 'metallic', style: 'rack', type: 'rack' },
      empresscomp: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ffffff', label: 'COMPRESSOR', brand: 'Empress', subtitle: 'MKII', labelColor: '#ffffff', texture: 'metallic', style: 'empress' },
      cali76: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', knobPointer: '#ff0000', ledColor: '#ff0000', label: 'CALI76', brand: 'Origin Effects', subtitle: 'Compressor', labelColor: '#000000', texture: 'metallic', style: 'boutique' },
      deepsix: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#003366', bodyGradient: 'linear-gradient(145deg, #004488 0%, #003366 50%, #002244 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'DEEP SIX', brand: 'Walrus Audio', subtitle: 'Compressor V3', labelColor: '#ffffff', texture: 'matte', style: 'walrus' },
      blackfinger: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff6600', label: 'BLACK FINGER', brand: 'Electro-Harmonix', subtitle: 'Tube Compressor', labelColor: '#ffffff', texture: 'metallic', style: 'ehx' },
      philosopher: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#8b0000', bodyGradient: 'linear-gradient(145deg, #aa2222 0%, #8b0000 50%, #660000 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: "PHILOSOPHER'S TONE", brand: 'Pigtronix', subtitle: 'Compressor', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      hypergravity: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#cc6600', bodyGradient: 'linear-gradient(145deg, #ee8822 0%, #cc6600 50%, #994400 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: 'HYPERGRAVITY', brand: 'TC Electronic', subtitle: 'Compressor', texture: 'tc-compact', style: 'danish' },
      bosscs3: { primary: '#0099ff', secondary: '#0077cc', bgColor: '#0099ff', bodyGradient: 'linear-gradient(145deg, #22aaff 0%, #0099ff 50%, #0077cc 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'CS-3', brand: 'BOSS', subtitle: 'Compression Sustainer', texture: 'boss-compact', style: 'japanese' },
      wamplerego: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#556b2f', bodyGradient: 'linear-gradient(145deg, #6a7f3a 0%, #556b2f 50%, #445522 100%)', metalColor: '#2a2a2a', knobPointer: '#ffffff', ledColor: '#0066ff', label: 'EGO', brand: 'Wampler', subtitle: 'Compressor', labelColor: '#ffffff', texture: 'matte', style: 'boutique' },
      compulator: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#daa520', bodyGradient: 'linear-gradient(145deg, #eebb44 0%, #daa520 50%, #bb8810 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'COMPULATOR', brand: 'Demeter', subtitle: 'Optical Compressor', labelColor: '#ffffff', texture: 'metallic', style: 'boutique' },
      
      // NEW EFFECTS 2025 - EQ & FILTERS (authentic)
      bossge7: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#ffffff', bodyGradient: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'GE-7', brand: 'BOSS', subtitle: 'Equalizer', labelColor: '#000000', texture: 'boss-compact', style: 'japanese' },
      sourceaudioeq2: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'EQ2', brand: 'Source Audio', subtitle: 'Programmable EQ', labelColor: '#ffffff', texture: 'metallic', style: 'modern' },
      empressparaeq: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ffffff', label: 'ParaEQ', brand: 'Empress', subtitle: 'MKII Deluxe', labelColor: '#ffffff', texture: 'metallic', style: 'empress' },
      talkingmachine: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'TALKING MACHINE', brand: 'Electro-Harmonix', subtitle: 'Vocal Formant Filter', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      moogmf101: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#ffffff', ledColor: '#ff0000', label: 'MF-101', brand: 'Moog', subtitle: 'Lowpass Filter', labelColor: '#ffffff', texture: 'metallic', style: 'moog' },
      dod440: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#ffcc00', bodyGradient: 'linear-gradient(145deg, #ffdd33 0%, #ffcc00 50%, #ddaa00 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: '440', brand: 'DOD', subtitle: 'Envelope Filter', labelColor: '#000000', texture: 'matte', style: 'vintage' },
      mutron: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'MU-TRON III', brand: 'Mu-Tron', subtitle: 'Envelope Filter', labelColor: '#000000', texture: 'metallic', style: 'vintage' },
      qtron: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'Q-TRON', brand: 'Electro-Harmonix', subtitle: 'Envelope Filter', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      dunlop105q: { primary: '#ffffff', secondary: '#cccccc', bgColor: '#000000', bodyGradient: 'linear-gradient(145deg, #1a1a1a 0%, #000000 50%, #000000 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: '105Q', brand: 'Dunlop', subtitle: 'Cry Baby Bass Wah', labelColor: '#ffffff', texture: 'matte', style: 'wah' },
      badhorsie: { primary: '#ff0000', secondary: '#cc0000', bgColor: '#000000', bodyGradient: 'linear-gradient(145deg, #1a1a1a 0%, #000000 50%, #000000 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'BAD HORSIE', brand: 'Morley', subtitle: 'Wah', labelColor: '#ff0000', texture: 'matte', style: 'wah' },
      
      // NEW EFFECTS 2025 - PITCH & SYNTH (authentic)
      ehxpog: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'POG', brand: 'Electro-Harmonix', subtitle: 'Polyphonic Octave Generator', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      micropog: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#b8b8b8', bodyGradient: 'linear-gradient(145deg, #d0d0d0 0%, #b8b8b8 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'MICRO POG', brand: 'Electro-Harmonix', subtitle: 'Polyphonic Octave', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      ehxhog: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'HOG 2', brand: 'Electro-Harmonix', subtitle: 'Harmonic Octave Generator', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      bossps6: { primary: '#ff00ff', secondary: '#cc00cc', bgColor: '#cc00cc', bodyGradient: 'linear-gradient(145deg, #ee22ee 0%, #cc00cc 50%, #aa00aa 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'PS-6', brand: 'BOSS', subtitle: 'Harmonist', texture: 'boss-compact', style: 'japanese' },
      subnup: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#0066cc', bodyGradient: 'linear-gradient(145deg, #0088ee 0%, #0066cc 50%, #0044aa 100%)', metalColor: '#2a2a2a', ledColor: '#ffff00', label: "SUB 'N' UP", brand: 'TC Electronic', subtitle: 'Octaver', texture: 'tc-compact', style: 'danish' },
      pitchfork: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#c0c0c0', bodyGradient: 'linear-gradient(145deg, #d8d8d8 0%, #c0c0c0 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'PITCH FORK', brand: 'Electro-Harmonix', subtitle: 'Polyphonic Pitch Shifter', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      pitchfactor: { primary: '#00ff00', secondary: '#00cc00', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', knobPointer: '#00ff00', ledColor: '#00ff00', label: 'PitchFactor', brand: 'Eventide', subtitle: 'Harmonizer', labelColor: '#00ff00', texture: 'metallic', style: 'eventide', type: 'rack' },
      bossoc5: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#003399', bodyGradient: 'linear-gradient(145deg, #004499 0%, #003399 50%, #002266 100%)', metalColor: '#2a2a2a', ledColor: '#ff0000', label: 'OC-5', brand: 'BOSS', subtitle: 'Super Octave', texture: 'boss-compact', style: 'japanese' },
      freeze: { primary: '#000000', secondary: '#1a1a1a', bgColor: '#b8b8b8', bodyGradient: 'linear-gradient(145deg, #d0d0d0 0%, #b8b8b8 50%, #a0a0a0 100%)', metalColor: '#c0c0c0', ledColor: '#0066ff', label: 'FREEZE', brand: 'Electro-Harmonix', subtitle: 'Sound Retainer', labelColor: '#000000', texture: 'metallic', style: 'ehx' },
      hedra: { primary: '#00ccff', secondary: '#0099cc', bgColor: '#1a1a2e', bodyGradient: 'linear-gradient(145deg, #2a2a44 0%, #1a1a2e 50%, #0a0a1e 100%)', metalColor: '#c0c0c0', knobPointer: '#00ccff', ledColor: '#00ccff', label: 'HEDRA', brand: 'Meris', subtitle: '3-Voice Rhythmic Pitch Shifter', labelColor: '#00ccff', texture: 'metallic', style: 'meris' },
      mood: { primary: '#ff6600', secondary: '#cc5500', bgColor: '#f5f0e8', bodyGradient: 'linear-gradient(145deg, #fffbf5 0%, #f5f0e8 50%, #e0d8c8 100%)', metalColor: '#2a2a2a', knobPointer: '#ff6600', ledColor: '#ff6600', label: 'MOOD', brand: 'Chase Bliss', subtitle: 'Micro-Looper/Delay', labelColor: '#ff6600', texture: 'metallic', style: 'chasebliss' },
      
      // NEW EFFECTS 2025 - MULTI-FX (authentic)
      helix: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #333333 0%, #1a1a1a 50%, #000000 100%)', metalColor: '#c0c0c0', ledColor: '#ff0000', label: 'HELIX', brand: 'Line 6', subtitle: 'Multi-Effects Processor', labelColor: '#ffffff', texture: 'metallic', style: 'modern', type: 'rack' },
      axefx: { primary: '#00ff00', secondary: '#00cc00', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'AXE-FX III', brand: 'Fractal Audio', subtitle: 'Amp Modeler/Multi-FX', labelColor: '#00ff00', texture: 'metallic', style: 'modern', type: 'rack' },
      kemper: { primary: '#00ff00', secondary: '#00cc00', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #333333 0%, #1a1a1a 50%, #000000 100%)', metalColor: '#c0c0c0', ledColor: '#00ff00', label: 'PROFILER', brand: 'Kemper', subtitle: 'Profiling Amplifier', labelColor: '#00ff00', texture: 'metallic', style: 'modern', type: 'rack' },
      quadcortex: { primary: '#ffffff', secondary: '#e0e0e0', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)', metalColor: '#c0c0c0', ledColor: '#ffffff', label: 'QUAD CORTEX', brand: 'Neural DSP', subtitle: 'Quad Core Modeler', labelColor: '#ffffff', texture: 'metallic', style: 'modern', type: 'rack' },
      gt1000: { primary: '#0099ff', secondary: '#0077cc', bgColor: '#000000', bodyGradient: 'linear-gradient(180deg, #1a1a1a 0%, #000000 50%, #000000 100%)', metalColor: '#2a2a2a', ledColor: '#0099ff', label: 'GT-1000', brand: 'BOSS', subtitle: 'Guitar Effects Processor', labelColor: '#0099ff', texture: 'metallic', style: 'japanese', type: 'rack' },
      headrush: { primary: '#ff6600', secondary: '#cc4400', bgColor: '#1a1a1a', bodyGradient: 'linear-gradient(180deg, #333333 0%, #1a1a1a 50%, #000000 100%)', metalColor: '#c0c0c0', ledColor: '#ff6600', label: 'PEDALBOARD', brand: 'HeadRush', subtitle: 'Guitar FX & Amp Modeling', labelColor: '#ff6600', texture: 'metallic', style: 'modern', type: 'rack' },
      
      // ============================================
      // NEW CLASSIC PEDALS - AUTHENTIC COLORS
      // ============================================
      
      // KLON CENTAUR - Gold
      kloncentaur: {
        primary: '#ffffff',
        secondary: '#f0e68c',
        bgColor: '#d4af37', // Authentic gold
        bodyGradient: 'linear-gradient(145deg, #f0d878 0%, #d4af37 50%, #b8941f 100%)',
        metalColor: '#d4af37', // Gold knobs
        ledColor: '#e0f7ff', // White-blue LED
        label: 'CENTAUR',
        brand: 'KLON',
        labelColor: '#3d2b1f', // Dark brown for legibility on gold
        texture: 'sparkle'
      },
      
      // PROCO RAT - Black
      procorat: {
        primary: '#ffffff',
        secondary: '#cccccc',
        bgColor: '#1a1a1a', // Matte black
        bodyGradient: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#2a2a2a', // Black knobs
        ledColor: '#ff0000',
        label: 'RAT',
        brand: 'ProCo'
      },
      
      // BOSS BD-2 - Blue
      bossbd2: {
        primary: '#0099ff',
        secondary: '#0077cc',
        bgColor: '#0066cc', // Boss blue
        bodyGradient: 'linear-gradient(145deg, #0077dd 0%, #0066cc 50%, #0055aa 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#0099ff',
        label: 'BD-2',
        brand: 'BOSS'
      },
      
      // BOSS SD-1 - Yellow
      bosssd1: {
        primary: '#ffff00',
        secondary: '#cccc00',
        bgColor: '#ffcc00', // Boss yellow
        bodyGradient: 'linear-gradient(145deg, #ffdd22 0%, #ffcc00 50%, #ddaa00 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ffff00',
        label: 'SD-1',
        brand: 'BOSS'
      },
      
      // FUZZ FACE - Gray
      fuzzface: {
        primary: '#ff0000',
        secondary: '#cc0000',
        bgColor: '#8c8c8c', // Arbiter gray
        bodyGradient: 'radial-gradient(circle at 30% 30%, #a0a0a0 0%, #8c8c8c 50%, #707070 100%)',
        metalColor: '#c0c0c0', // Silver knobs
        ledColor: '#ff0000',
        label: 'FUZZ',
        brand: 'FACE',
        shape: 'round' // Indicador para formato redondo
      },
      
      // ZVEX FUZZ FACTORY - Hand Painted
      zvexfuzzfactory: {
        primary: '#000000', // Black text (hand-painted style)
        secondary: '#1a1a1a',
        bgColor: '#ffdd22', // Bright yellow (most iconic hand-painted version)
        bodyGradient: 'linear-gradient(145deg, #ffee55 0%, #ffdd22 50%, #ddbb00 100%)',
        metalColor: '#2a2a2a', // Simple black knobs
        knobPointer: '#ffffff', // White pointer
        ledColor: '#ff0000', // Red LED
        label: 'Fuzz Factory',
        brand: 'Z.Vex',
        labelColor: '#000000', // Black hand-painted text
        texture: 'hand-painted',
        footswitchColor: '#c0c0c0', // Metallic silver
        style: 'psychedelic' // Insane, fun, experimental
      },
      
      // FULLTONE OCD - Cream/Off-white (como o original: knobs pretos, indicador laranja)
      fulltoneocd: {
        primary: '#2a2a2a',
        secondary: '#1a1a1a',
        bgColor: '#f5f0e8',
        bodyGradient: 'linear-gradient(145deg, #fffbf5 0%, #f5f0e8 50%, #e8dcc8 100%)',
        metalColor: '#2a2a2a',
        knobPointer: '#ffffff', // Indicador branco tradicional (ou chicken head)
        ledColor: '#0066ff',
        label: 'OCD',
        brand: 'Fulltone',
        labelColor: '#2a2a2a',
        texture: 'metallic',
        footswitchColor: '#4a4a4a', // Dark grey footswitch como no original
        style: 'boutique'
      },
      
      // XOTIC BB PREAMP - Metallic Orange
      xoticbb: {
        primary: '#ffffff',
        secondary: '#e0e0e0',
        bgColor: '#ff6b35', // Metallic orange
        bodyGradient: 'linear-gradient(145deg, #ff8855 0%, #ff6b35 50%, #dd5522 100%)',
        metalColor: '#2a2a2a', // Black knobs
        knobPointer: '#ffffff', // White pointer
        ledColor: '#ff0000', // Red LED
        label: 'BB PREAMP',
        brand: 'Xotic',
        labelColor: '#000000', // Black text for knobs
        texture: 'metallic',
        footswitchColor: '#c0c0c0', // Chrome footswitch
        style: 'boutique' // Vintage boutique warm feel
      },
      
      // JHS SUPERBOLT - Metallic Gray
      jhssuperbolt: {
        primary: '#ffffff', // White text
        secondary: '#e0e0e0',
        bgColor: '#8c8c8c', // Metallic gray
        bodyGradient: 'linear-gradient(145deg, #a8a8a8 0%, #8c8c8c 50%, #707070 100%)',
        metalColor: '#2a2a2a', // Black knobs
        knobPointer: '#ffffff', // White pointer
        ledColor: '#ff0000', // Red LED
        label: 'JHS SUPERBOLT',
        labelColor: '#ffffff', // White text for knobs
        texture: 'metallic',
        footswitchColor: '#c0c0c0', // Chrome footswitch
        style: 'boutique' // Vintage artisan feel
      },
      
      // XOTIC EP BOOSTER - Metallic with transparent knobs
      xoticep: {
        primary: '#ffffff', // White text
        secondary: '#e0e0e0',
        bgColor: '#b8b8b8', // Metallic silver/aluminum
        bodyGradient: 'linear-gradient(145deg, #d0d0d0 0%, #b8b8b8 50%, #9a9a9a 100%)',
        metalColor: 'rgba(255, 255, 255, 0.15)', // Transparent knobs
        knobPointer: '#00aaff', // Blue LED pointer
        ledColor: '#00aaff', // Blue LED
        label: 'EP BOOSTER',
        brand: 'Xotic',
        labelColor: '#333333', // Dark gray text for contrast
        texture: 'metallic',
        footswitchColor: '#b8b8b8', // Metallic footswitch
        style: 'hifi-boutique', // Vintage, hi-fi and artisan
        knobStyle: 'transparent-blue' // Special knob style
      },
      
      // MXR DISTORTION+ - Yellow
      mxrdistortionplus: {
        primary: '#000000', // Black text (authentic)
        secondary: '#1a1a1a',
        bgColor: '#ffdd00', // Bright MXR yellow
        bodyGradient: 'linear-gradient(145deg, #ffee22 0%, #ffdd00 50%, #ddbb00 100%)',
        metalColor: '#2a2a2a', // Black knobs
        knobPointer: '#ffffff', // White pointer
        ledColor: '#ff0000', // Simple red LED
        label: 'Distortion+',
        brand: 'MXR',
        labelColor: '#000000', // Black text on yellow
        texture: 'matte',
        style: 'vintage' // Classic rock vintage feel
      },
      
      // MXR PHASE 90 - Orange
      mxrphase90: {
        primary: '#ff0000',
        secondary: '#cc0000',
        bgColor: '#ff6600', // MXR orange
        bodyGradient: 'linear-gradient(145deg, #ff7722 0%, #ff6600 50%, #dd5500 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ff0000',
        label: 'M101',
        brand: 'MXR',
        subtitle: 'Phase 90'
      },
      
      // CRY BABY WAH - Black
      crybabywah: {
        primary: '#ff0000',
        secondary: '#cc0000',
        bgColor: '#000000', // Classic black
        bodyGradient: 'linear-gradient(145deg, #1a1a1a 0%, #000000 50%, #000000 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#ff0000',
        label: 'Cry Baby',
        brand: 'Dunlop',
        shape: 'wah'
      },
      
      // MXR DYNA COMP - Red
      mxrdynacomp: {
        primary: '#ffff00',
        secondary: '#cccc00',
        bgColor: '#cc0000', // MXR red
        bodyGradient: 'linear-gradient(145deg, #dd2222 0%, #cc0000 50%, #aa0000 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ff0000',
        label: 'M102',
        brand: 'MXR',
        subtitle: 'Dyna Comp'
      },
      
      // BOSS CE-1 - Silver (vintage)
      bossce1: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#c0c0c0', // Vintage silver
        bodyGradient: 'linear-gradient(145deg, #d4d4d4 0%, #c0c0c0 50%, #a8a8a8 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#00ff00',
        label: 'CE-1',
        brand: 'BOSS',
        subtitle: 'Chorus Ensemble',
        vintage: true
      },
      
      // BOSS TR-2 - Yellow
      bosstr2: {
        primary: '#ffff00',
        secondary: '#cccc00',
        bgColor: '#ffcc00',
        bodyGradient: 'linear-gradient(145deg, #ffdd22 0%, #ffcc00 50%, #ddaa00 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ffff00',
        label: 'TR-2',
        brand: 'BOSS',
        subtitle: 'Tremolo'
      },
      
      // BOSS BF-2 - Pink/Magenta
      bossbf2: {
        primary: '#ff00ff',
        secondary: '#cc00cc',
        bgColor: '#ff00ff',
        bodyGradient: 'linear-gradient(145deg, #ff33ff 0%, #ff00ff 50%, #cc00cc 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ff00ff',
        label: 'BF-2',
        brand: 'BOSS',
        subtitle: 'Flanger'
      },
      
      // MXR CARBON COPY - Green
      mxrcarboncopy: {
        primary: '#ffff00',
        secondary: '#cccc00',
        bgColor: '#556b2f', // Military green
        bodyGradient: 'linear-gradient(145deg, #6a7f3a 0%, #556b2f 50%, #445522 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#ffff00',
        label: 'M169',
        brand: 'MXR',
        subtitle: 'Carbon Copy'
      },
      
      // MEMORY MAN - Silver
      memoryman: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#b8b8b8', // Brushed aluminum
        bodyGradient: 'linear-gradient(145deg, #c8c8c8 0%, #b8b8b8 50%, #a0a0a0 100%)',
        metalColor: '#c0c0c0', // Silver knobs
        ledColor: '#00ff00',
        label: 'Memory Man',
        brand: 'ELECTRO-HARMONIX',
        vintage: true
      },
      
      // ============================================
      // RACK EFFECTS - PROFESSIONAL UNITS
      // ============================================
      
      // EVENTIDE TIMEFACTOR - Black Rack
      eventidetimefactor: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#1a1a1a', // Professional black
        bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#00ff00',
        label: 'TimeFactor',
        brand: 'EVENTIDE',
        type: 'rack',
        displayType: 'led-green',
        displayText: 'DIGITAL DELAY'
      },
      
      // BOSS DD-500 - Black with Blue LCD
      bossdd500: {
        primary: '#0099ff',
        secondary: '#0077cc',
        bgColor: '#000000',
        bodyGradient: 'linear-gradient(180deg, #1a1a1a 0%, #000000 50%, #000000 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#0099ff',
        label: 'DD-500',
        brand: 'BOSS',
        type: 'rack',
        displayType: 'lcd-blue',
        displayText: 'TAPE ECHO'
      },
      
      // LINE 6 DL4 - Green
      line6dl4: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#00cc00', // Line 6 green
        bodyGradient: 'linear-gradient(145deg, #22dd22 0%, #00cc00 50%, #00aa00 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#00ff00',
        label: 'DL4',
        brand: 'LINE 6',
        subtitle: 'Delay Modeler',
        type: 'large-pedal'
      },
      
      // EVENTIDE SPACE - Black Rack
      eventidespace: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#1a1a1a',
        bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#00ffff',
        label: 'SPACE',
        brand: 'EVENTIDE',
        type: 'rack',
        displayType: 'led-green',
        displayText: 'HALL REVERB'
      },
      
      // BOSS RV-500 - Black with Blue LCD
      bossrv500: {
        primary: '#0099ff',
        secondary: '#0077cc',
        bgColor: '#000000',
        bodyGradient: 'linear-gradient(180deg, #1a1a1a 0%, #000000 50%, #000000 100%)',
        metalColor: '#2a2a2a',
        ledColor: '#0099ff',
        label: 'RV-500',
        brand: 'BOSS',
        type: 'rack',
        displayType: 'lcd-blue',
        displayText: 'PLATE REVERB'
      },
      
      // STRYMON MOBIUS - Blue
      strymonmobius: {
        primary: '#ffffff',
        secondary: '#cccccc',
        bgColor: '#2266aa', // Strymon blue
        bodyGradient: 'linear-gradient(145deg, #3377bb 0%, #2266aa 50%, #115599 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#ffffff',
        label: 'MOBIUS',
        brand: 'STRYMON',
        type: 'rack',
        displayType: 'oled-white',
        displayText: 'CHORUS'
      },
      
      // EVENTIDE H9 - Black Multi-FX
      eventideh9: {
        primary: '#ffffff',
        secondary: '#cccccc',
        bgColor: '#1a1a1a',
        bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#00ffff',
        label: 'H9',
        brand: 'EVENTIDE',
        subtitle: 'MAX',
        type: 'rack',
        displayType: 'lcd-color',
        displayText: 'SHIMMER'
      },
      
      // MESA V-TWIN - Brushed Aluminum Chassis (Industrial/Vintage)
      mesavtwin: {
        primary: '#000000', // Black text for contrast
        secondary: '#1a1a1a',
        bgColor: '#a0a0a0', // Brushed aluminum
        bodyGradient: 'linear-gradient(180deg, #d4d4d4 0%, #c0c0c0 15%, #a8a8a8 40%, #909090 70%, #787878 100%)',
        metalColor: '#1a1a1a', // Black knobs
        knobPointer: '#ffffff', // White pointer
        ledColor: '#00ff00',
        label: 'V-TWIN',
        brand: 'MESA/Boogie',
        type: 'rack',
        hasStripes: false,
        displayType: 'led-dual',
        chassis: 'aluminum', // Aluminum chassis
        style: 'industrial', // Industrial/heavy/vintage look
        labelColor: '#000000' // Black labels for readability
      },
      
      // TECH 21 SANSAMP - Black Professional
      tech21sansamp: {
        primary: '#00ff00',
        secondary: '#00cc00',
        bgColor: '#1a1a1a',
        bodyGradient: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#00ff00',
        label: 'SansAmp',
        brand: 'TECH 21',
        type: 'rack',
        displayType: 'vu-meter',
        hasVU: true
      },
      
      // TIMELINE DELAY - Authentic Strymon Blue
      timelinedelay: {
        primary: '#ffffff',
        secondary: '#e0e0e0',
        bgColor: '#1a3a5c',
        bodyGradient: 'linear-gradient(145deg, #2a4a6c 0%, #1a3a5c 40%, #0f2744 100%)',
        metalColor: '#c8d0d8',
        ledColor: '#ffffff',
        label: 'TIMELINE',
        brand: 'STRYMON',
        subtitle: 'Delay',
        type: 'rack',
        displayType: 'oled-white',
        displayText: 'DIGITAL',
        hasLargeDisplay: true,
        knobStyle: 'professional',
        knobColor: '#c8d0d8'
      },
      
      // BIGSKY REVERB - Blue Strymon
      bigskyreverb: {
        primary: '#ffffff',
        secondary: '#cccccc',
        bgColor: '#2266aa',
        bodyGradient: 'linear-gradient(145deg, #3377bb 0%, #2266aa 50%, #115599 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#ffffff',
        label: 'BIGSKY',
        brand: 'STRYMON',
        type: 'rack',
        displayType: 'oled-white',
        displayText: 'CLOUD'
      },
      
      // TAPE SATURATION - Vintage
      tapesaturation: {
        primary: '#ff6600',
        secondary: '#cc5500',
        bgColor: '#8b4513', // Brown/tape color
        bodyGradient: 'linear-gradient(145deg, #a0522d 0%, #8b4513 50%, #704010 100%)',
        metalColor: '#c0c0c0',
        ledColor: '#ff6600',
        label: 'TAPE',
        brand: 'SATURATION',
        vintage: true
      }
    };
    return configs[type] || { 
      primary: '#666666', 
      secondary: '#444444',
      bgColor: '#2a2a2a',
      bodyGradient: 'linear-gradient(145deg, #444444 0%, #2a2a2a 50%, #1a1a1a 100%)',
      metalColor: '#silver',
      label: 'FX-1'
    };
  };

  const renderControls = () => {
    switch (effect.type) {
      // OVERDRIVE/DISTORTION FAMILY
      case 'overdrive':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'distortion':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 50} onChange={handleKnobChange('level')} />
          </>
        );
      case 'fuzz':
        return (
          <>
            <Knob label="Fuzz" value={effect.params?.fuzz || 70} onChange={handleKnobChange('fuzz')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Volume" value={effect.params?.volume || 60} onChange={handleKnobChange('volume')} />
          </>
        );
      case 'tubescreamer':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 40} onChange={handleKnobChange('drive')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'bigmuff':
        return (
          <>
            <Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
          </>
        );
      
      // CLASSIC PEDALS
      case 'bossds1':
        return (
          <>
            <Knob label="Dist" value={effect.params?.dist || 50} onChange={handleKnobChange('dist')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'kloncentaur':
        return (
          <>
            <Knob label="Gain" value={effect.params?.gain || 40} onChange={handleKnobChange('gain')} />
            <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'xoticbb':
        return (
          <div className="knobs-2x2">
            <div className="knob-row">
              <Knob label="Gain" value={effect.params?.gain || 40} onChange={handleKnobChange('gain')} />
              <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
            </div>
            <div className="knob-row">
              <Knob label="Volume" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
              <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} />
            </div>
          </div>
        );
      case 'jhssuperbolt':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
              <Knob label="Volume" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
              <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
              <Knob label="Drive" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} />
            </div>
            <div className="toggle-switch" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 'bold', opacity: 0.7 }}>LO</span>
              <label style={{ fontSize: '9px', color: '#ffffff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>GAIN</label>
              <input 
                type="checkbox" 
                checked={effect.params?.more !== 0}
                onChange={(e) => onUpdate(effect.id, 'more', e.target.checked ? 1 : 0)}
                style={{ transform: 'scale(0.8)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 'bold', opacity: 0.7 }}>HI</span>
            </div>
          </div>
        );
      case 'xoticep':
        return (
          <>
            <Knob label="Boost" value={effect.params?.boost || 50} onChange={handleKnobChange('boost')} />
          </>
        );
      case 'procorat':
        return (
          <>
            <Knob label="DISTORTION" value={effect.params?.distortion || 50} onChange={handleKnobChange('distortion')} />
            <Knob label="FILTER" value={effect.params?.filter || 50} onChange={handleKnobChange('filter')} />
            <Knob label="VOLUME" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
          </>
        );
      case 'fuzzface':
        return (
          <>
            <Knob label="Fuzz" value={effect.params?.fuzz || 60} onChange={handleKnobChange('fuzz')} />
            <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
          </>
        );
      case 'mxrphase90':
        return (
          <>
            <Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} />
            <Knob label="Depth" value={effect.params?.depth || 80} onChange={handleKnobChange('depth')} />
            <Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
          </>
        );
      case 'crybabywah':
        return (
          <>
            <Knob label="Position" value={effect.params?.position || 50} onChange={handleKnobChange('position')} />
            <Knob label="Resonance" value={effect.params?.resonance || 70} onChange={handleKnobChange('resonance')} />
            <Knob label="AutoWah" value={effect.params?.autowah || 0} onChange={handleKnobChange('autowah')} />
            <Knob label="Speed" value={effect.params?.speed || 50} onChange={handleKnobChange('speed')} />
          </>
        );
      case 'mxrdynacomp':
        return (
          <>
            <Knob label="Sensitivity" value={effect.params?.sensitivity || 50} onChange={handleKnobChange('sensitivity')} />
            <Knob label="Output" value={effect.params?.output || 70} onChange={handleKnobChange('output')} />
            <Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} />
            <Knob label="Release" value={effect.params?.release || 40} onChange={handleKnobChange('release')} />
          </>
        );
      case 'bossbd2':
        return (
          <>
            <Knob label="Gain" value={effect.params?.gain || 40} onChange={handleKnobChange('gain')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'memoryman':
        return (
          <>
            <Knob label="Delay" value={effect.params?.delay || 50} onChange={handleKnobChange('delay')} />
            <Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
            <Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} />
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} />
            <Knob label="Depth" value={effect.params?.depth || 30} onChange={handleKnobChange('depth')} />
          </>
        );
      case 'bossce1':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Intensity" value={effect.params?.intensity || 50} onChange={handleKnobChange('intensity')} />
          </>
        );
      case 'bosstr2':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 50} onChange={handleKnobChange('rate')} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Wave" value={effect.params?.wave || 25} onChange={handleKnobChange('wave')} />
          </>
        );
      case 'mxrcarboncopy':
        return (
          <>
            <Knob label="Delay" value={effect.params?.delay || 50} onChange={handleKnobChange('delay')} />
            <Knob label="Regen" value={effect.params?.regen || 50} onChange={handleKnobChange('regen')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Mod" value={effect.params?.mod || 0} onChange={handleKnobChange('mod')} />
          </>
        );
      case 'bosssd1':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'fulltoneocd':
        return (
          <div className="ocd-controls">
            <div className="ocd-controls-row">
              <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
              <div className="ocd-toggle-wrap">
                <span className="ocd-toggle-label ocd-hp">HP</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={effect.params?.mode > 50}
                  className={`ocd-toggle ${effect.params?.mode > 50 ? 'ocd-toggle-hp' : 'ocd-toggle-lp'}`}
                  onClick={() => onUpdate(effect.id, 'mode', effect.params?.mode > 50 ? 0 : 100)}
                >
                  <span className="ocd-toggle-lever" />
                </button>
                <span className="ocd-toggle-label ocd-lp">LP</span>
              </div>
              <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            </div>
            <div className="ocd-tone-row">
              <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            </div>
          </div>
        );
      case 'mxrdistortionplus':
        return (
          <>
            <Knob label="Distortion" value={effect.params?.distortion || 60} onChange={handleKnobChange('distortion')} />
            <Knob label="Output" value={effect.params?.output || 70} onChange={handleKnobChange('output')} />
          </>
        );
      case 'bossbf2':
        return (
          <>
            <Knob label="Manual" value={effect.params?.manual || 50} onChange={handleKnobChange('manual')} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} />
            <Knob label="Res" value={effect.params?.res || 50} onChange={handleKnobChange('res')} />
          </>
        );
      case 'zvexfuzzfactory':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            <Knob label="Gate" value={effect.params?.gate || 40} onChange={handleKnobChange('gate')} />
            <Knob label="Comp" value={effect.params?.comp || 50} onChange={handleKnobChange('comp')} />
            <Knob label="Stab" value={effect.params?.stab || 50} onChange={handleKnobChange('stab')} />
          </>
        );
      case 'tapesaturation':
        return (
          <>
            <Knob label="Amount" value={effect.params?.amount || 50} onChange={handleKnobChange('amount')} />
            <Knob label="Output" value={effect.params?.output || 70} onChange={handleKnobChange('output')} />
            <Knob label="Warmth" value={effect.params?.warmth || 50} onChange={handleKnobChange('warmth')} />
          </>
        );
      
      // LARGE PEDALS / RACK EFFECTS
      case 'timelinedelay':
        return (
          <>
            <div className="timeline-controls-layout">
              <div className="timeline-display-section">
                <div className="timeline-oled-display">
                  <div className="oled-content">
                    <div className="oled-machine-type">{(effect.params?.type || 'dtape').toUpperCase()}</div>
                    <div className="oled-params">
                      <span>TIME: {effect.params?.timeMs != null ? effect.params.timeMs : Math.round((effect.params?.time ?? 50) / 100 * 4960 + 40)}ms</span>
                      <span>BPM: {effect.params?.bpm ?? 120}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="timeline-top-row">
                <Knob 
                  label="TIME" 
                  value={effect.params?.time || 50} 
                  onChange={handleKnobChange('time')} 
                  size="large"
                />
                <Knob 
                  label="REPEATS" 
                  value={effect.params?.repeats || 50} 
                  onChange={handleKnobChange('repeats')} 
                  size="large"
                />
                <Knob 
                  label="MIX" 
                  value={effect.params?.mix || 50} 
                  onChange={handleKnobChange('mix')} 
                  size="large"
                />
                <Knob 
                  label="GRIT" 
                  value={effect.params?.grit || 30} 
                  onChange={handleKnobChange('grit')} 
                  size="large"
                />
              </div>
              
              <div className="timeline-bottom-row">
                <Knob 
                  label="FILTER" 
                  value={effect.params?.filter || 50} 
                  onChange={handleKnobChange('filter')} 
                  size="small"
                />
                <Knob 
                  label="MOD" 
                  value={effect.params?.mod || 20} 
                  onChange={handleKnobChange('mod')} 
                  size="small"
                />
                <Knob 
                  label="SPEED" 
                  value={effect.params?.speed || 20} 
                  onChange={handleKnobChange('speed')} 
                  size="small"
                />
                <Knob 
                  label="WIDTH" 
                  value={effect.params?.width || 100} 
                  onChange={handleKnobChange('width')} 
                  size="small"
                />
              </div>
              
              <div className="timeline-value-buttons">
                <div className="value-knob-group">
                  <Knob 
                    label="VALUE 1" 
                    value={effect.params?.value1 || 50} 
                    onChange={handleKnobChange('value1')} 
                    size="mini"
                  />
                </div>
                <div className="value-knob-group">
                  <Knob 
                    label="VALUE 2" 
                    value={effect.params?.value2 || 50} 
                    onChange={handleKnobChange('value2')} 
                    size="mini"
                  />
                </div>
                <div className="value-knob-group">
                  <Knob 
                    label="VALUE 3" 
                    value={effect.params?.value3 || 50} 
                    onChange={handleKnobChange('value3')} 
                    size="mini"
                  />
                </div>
              </div>
              
              <div className="timeline-machine-selector">
                <div className="machine-buttons">
                  {['dtape', 'dbucket', 'tape', 'lofi', 'dual', 'pattern', 'reverse', 'ice', 'duck', 'swell', 'trem', 'filter'].map(type => (
                    <button
                      key={type}
                      className={`machine-btn ${effect.params?.type === type ? 'active' : ''}`}
                      onClick={() => onUpdate(effect.id, 'type', type)}
                      title={type.toUpperCase()}
                    >
                      {type.substring(0, 4).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      case 'bigskyreverb':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Reverb Machine</label>
              <select 
                className="pedal-selector"
                value={effect.params?.type || 'room'}
                onChange={(e) => onUpdate(effect.id, 'type', e.target.value)}
              >
                <option value="room">Room</option>
                <option value="hall">Hall</option>
                <option value="plate">Plate</option>
                <option value="spring">Spring</option>
                <option value="swell">Swell</option>
                <option value="bloom">Bloom</option>
                <option value="cloud">Cloud</option>
                <option value="chorale">Chorale</option>
                <option value="shimmer">Shimmer</option>
                <option value="magneto">Magneto</option>
                <option value="nonlinear">Nonlinear</option>
                <option value="reflections">Reflections</option>
              </select>
            </div>
            <Knob label="Decay" value={effect.params?.decay || 50} onChange={handleKnobChange('decay')} />
            <Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} />
            <Knob label="PreDly" value={effect.params?.predelay || 20} onChange={handleKnobChange('predelay')} />
            <Knob label="Tone" value={effect.params?.tone || 60} onChange={handleKnobChange('tone')} />
            <Knob label="ModRte" value={effect.params?.modrate || 20} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDpt" value={effect.params?.moddepth || 20} onChange={handleKnobChange('moddepth')} />
          </>
        );
      
      // PROFESSIONAL RACK EFFECTS
      case 'eventidetimefactor':
        return (
          <>
            <Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} />
            <Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Filter" value={effect.params?.filter || 60} onChange={handleKnobChange('filter')} />
            <Knob label="ModRate" value={effect.params?.modrate || 20} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDepth" value={effect.params?.moddepth || 20} onChange={handleKnobChange('moddepth')} />
            <Knob label="XFeed" value={effect.params?.xfeed || 0} onChange={handleKnobChange('xfeed')} />
            <Knob label="Spread" value={effect.params?.spread || 30} onChange={handleKnobChange('spread')} />
            <Knob label="Flex" value={effect.params?.flex || 20} onChange={handleKnobChange('flex')} />
            <Knob label="Depth" value={effect.params?.depth || 0} onChange={handleKnobChange('depth')} />
          </>
        );
      case 'bossdd500':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Delay Mode</label>
              <select 
                className="pedal-selector"
                value={effect.params?.mode || 'standard'}
                onChange={(e) => onUpdate(effect.id, 'mode', e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="analog">Analog</option>
                <option value="tape">Tape</option>
                <option value="dual">Dual</option>
                <option value="pattern">Pattern</option>
                <option value="reverse">Reverse</option>
                <option value="tera">Tera Echo</option>
                <option value="shimmer">Shimmer</option>
                <option value="lofi">Lo-Fi</option>
                <option value="twist">Twist</option>
                <option value="warp">Warp</option>
                <option value="sde3000">SDE-3000</option>
              </select>
            </div>
            <Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} />
            <Knob label="Feedbck" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="ModRte" value={effect.params?.modrate || 20} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDpt" value={effect.params?.moddepth || 20} onChange={handleKnobChange('moddepth')} />
          </>
        );
      case 'line6dl4':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Delay Mode</label>
              <select 
                className="pedal-selector"
                value={effect.params?.mode || 'digital'}
                onChange={(e) => onUpdate(effect.id, 'mode', e.target.value)}
              >
                <option value="digital">Digital</option>
                <option value="analog">Analog</option>
                <option value="tape">Tape Echo</option>
                <option value="tube">Tube Echo</option>
                <option value="multitap">Multi-Tap</option>
                <option value="reverse">Reverse</option>
                <option value="ping-pong">Ping Pong</option>
                <option value="dynamicdelay">Dynamic Delay</option>
                <option value="auto-volume">Auto-Volume Echo</option>
                <option value="sweep">Sweep Echo</option>
                <option value="echo-platter">Echo Platter</option>
                <option value="lofi">Lo Res</option>
                <option value="modulated">Modulated</option>
                <option value="loop">Loop Sampler</option>
              </select>
            </div>
            <Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} />
            <Knob label="Repeats" value={effect.params?.repeats || 50} onChange={handleKnobChange('repeats')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Tweez" value={effect.params?.tweez || 50} onChange={handleKnobChange('tweez')} />
          </>
        );
      case 'eventidespace':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Algorithm</label>
              <select 
                className="pedal-selector"
                value={effect.params?.algorithm || 'hall'}
                onChange={(e) => onUpdate(effect.id, 'algorithm', e.target.value)}
              >
                <option value="hall">Hall</option>
                <option value="plate">Plate</option>
                <option value="spring">Spring</option>
                <option value="room">Room</option>
                <option value="chamber">Chamber</option>
                <option value="reverse">Reverse</option>
                <option value="modechoverb">ModEchoVerb</option>
                <option value="dualverb">DualVerb</option>
                <option value="shimmer">Shimmer</option>
                <option value="blackhole">BlackHole</option>
                <option value="mangledverb">MangledVerb</option>
                <option value="tremoloVerb">TremoloVerb</option>
              </select>
            </div>
            <Knob label="Decay" value={effect.params?.decay || 50} onChange={handleKnobChange('decay')} />
            <Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} />
            <Knob label="PreDelay" value={effect.params?.predelay || 20} onChange={handleKnobChange('predelay')} />
            <Knob label="Size" value={effect.params?.size || 50} onChange={handleKnobChange('size')} />
            <Knob label="Tone" value={effect.params?.tone || 60} onChange={handleKnobChange('tone')} />
            <Knob label="ModRate" value={effect.params?.modrate || 20} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDepth" value={effect.params?.moddepth || 20} onChange={handleKnobChange('moddepth')} />
          </>
        );
      case 'bossrv500':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Reverb Mode</label>
              <select 
                className="pedal-selector"
                value={effect.params?.mode || 'room'}
                onChange={(e) => onUpdate(effect.id, 'mode', e.target.value)}
              >
                <option value="room">Room</option>
                <option value="hall">Hall</option>
                <option value="plate">Plate</option>
                <option value="spring">Spring</option>
                <option value="mod">Modulate</option>
                <option value="delay">Delay</option>
                <option value="shimmer">Shimmer</option>
                <option value="dynamic">Dynamic</option>
                <option value="nonlinear">Non-Linear</option>
                <option value="tera">Tera Echo</option>
                <option value="sfx">SFX</option>
                <option value="dual">Dual</option>
              </select>
            </div>
            <Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} />
            <Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} />
            <Knob label="PreDly" value={effect.params?.predelay || 20} onChange={handleKnobChange('predelay')} />
            <Knob label="Tone" value={effect.params?.tone || 60} onChange={handleKnobChange('tone')} />
            <Knob label="ModRte" value={effect.params?.modrate || 20} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDpt" value={effect.params?.moddepth || 20} onChange={handleKnobChange('moddepth')} />
          </>
        );
      case 'strymonmobius':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Modulation Type</label>
              <select 
                className="pedal-selector"
                value={effect.params?.type || 'chorus'}
                onChange={(e) => onUpdate(effect.id, 'type', e.target.value)}
              >
                <option value="chorus">Chorus</option>
                <option value="flanger">Flanger</option>
                <option value="rotary">Rotary</option>
                <option value="vibe">Vibe</option>
                <option value="phaser">Phaser</option>
                <option value="tremolo">Tremolo</option>
                <option value="filter">Filter</option>
                <option value="ringmod">Ring Mod</option>
                <option value="destroyer">Destroyer</option>
                <option value="quadrature">Quadrature</option>
                <option value="arpeggiator">Arpeggiator</option>
                <option value="pattern">Pattern</option>
              </select>
            </div>
            <Knob label="Speed" value={effect.params?.speed || 50} onChange={handleKnobChange('speed')} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Feedbck" value={effect.params?.feedback || 40} onChange={handleKnobChange('feedback')} />
            <Knob label="Wave" value={effect.params?.wave || 33} onChange={handleKnobChange('wave')} />
          </>
        );
      case 'eventideh9':
        return (
          <>
            <div className="pedal-selector-group">
              <label>Algorithm</label>
              <select 
                className="pedal-selector"
                value={effect.params?.algorithm || 'hall'}
                onChange={(e) => onUpdate(effect.id, 'algorithm', e.target.value)}
              >
                <optgroup label="Reverb">
                  <option value="hall">Hall</option>
                  <option value="plate">Plate</option>
                  <option value="room">Room</option>
                  <option value="spring">Spring</option>
                  <option value="shimmer">Shimmer</option>
                  <option value="modechoverb">ModEchoVerb</option>
                  <option value="dualverb">DualVerb</option>
                  <option value="reverse">Reverse</option>
                  <option value="blackhole">BlackHole</option>
                  <option value="mangledverb">MangledVerb</option>
                  <option value="tremoloVerb">TremoloVerb</option>
                </optgroup>
                <optgroup label="Delay">
                  <option value="tapeDelay">Tape Echo</option>
                  <option value="digitalDelay">Digital Delay</option>
                  <option value="dualDelay">Dual Delay</option>
                  <option value="multiDelay">Multi-Tap</option>
                  <option value="vintageDelay">Vintage Delay</option>
                </optgroup>
                <optgroup label="Modulation">
                  <option value="chorus">Chorus</option>
                  <option value="flanger">Flanger</option>
                  <option value="phaser">Phaser</option>
                  <option value="tremolo">Tremolo</option>
                  <option value="rotary">Rotary</option>
                  <option value="vibrato">Vibrato</option>
                  <option value="undulator">Undulator</option>
                </optgroup>
                <optgroup label="Pitch">
                  <option value="pitchflex">PitchFlex</option>
                  <option value="crystals">Crystals</option>
                  <option value="harmodulator">Harmodulator</option>
                  <option value="harmonizer">H910 Harmonizer</option>
                  <option value="quadravox">Quadravox</option>
                  <option value="octaver">Octaver</option>
                </optgroup>
                <optgroup label="Distortion">
                  <option value="sculpt">Sculpt</option>
                  <option value="hotSaw">Hot Saw</option>
                </optgroup>
                <optgroup label="Special FX">
                  <option value="ringmod">Ring Modulator</option>
                  <option value="resonator">Resonator</option>
                  <option value="spacetime">SpaceTime</option>
                </optgroup>
              </select>
            </div>
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
            <Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} />
            <Knob label="Feedbck" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
            <Knob label="Decay" value={effect.params?.reverb || 30} onChange={handleKnobChange('reverb')} />
            <Knob label="ModRte" value={effect.params?.modrate || 30} onChange={handleKnobChange('modrate')} />
            <Knob label="ModDpt" value={effect.params?.moddepth || 30} onChange={handleKnobChange('moddepth')} />
          </>
        );
      case 'mesavtwin':
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            width: '100%', 
            gap: '12px',
            alignItems: 'center'
          }}>
            {/* Channel Selector */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px',
              padding: '10px 20px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.25) 100%)',
              borderRadius: '6px',
              border: '2px solid rgba(120,120,120,0.4)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <button
                onClick={() => onUpdate(effect.id, 'channel', 0)}
                style={{
                  padding: '8px 20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: (effect.params?.channel || 0) < 50 ? '2px solid #888' : '1px solid rgba(100,100,100,0.4)',
                  background: (effect.params?.channel || 0) < 50 ? 'linear-gradient(145deg, #d0d0d0, #a0a0a0)' : 'rgba(40,40,40,0.6)',
                  color: (effect.params?.channel || 0) < 50 ? '#000' : '#666',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (effect.params?.channel || 0) < 50 ? '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                  textShadow: (effect.params?.channel || 0) < 50 ? '0 1px 1px rgba(255,255,255,0.5)' : 'none'
                }}
              >CLEAN</button>
              <button
                onClick={() => onUpdate(effect.id, 'channel', 100)}
                style={{
                  padding: '8px 20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: (effect.params?.channel || 0) >= 50 ? '2px solid #c83a3a' : '1px solid rgba(100,100,100,0.4)',
                  background: (effect.params?.channel || 0) >= 50 ? 'linear-gradient(145deg, #e24a4a, #c83a3a)' : 'rgba(40,40,40,0.6)',
                  color: (effect.params?.channel || 0) >= 50 ? '#ffffff' : '#666',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (effect.params?.channel || 0) >= 50 ? '0 2px 6px rgba(226,74,74,0.5), inset 0 1px 0 rgba(255,100,100,0.3)' : 'none',
                  textShadow: (effect.params?.channel || 0) >= 50 ? '0 0 4px rgba(255,255,255,0.4)' : 'none'
                }}
              >LEAD</button>
            </div>
            
            {/* Knobs Grid - Centered */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '420px',
              justifyItems: 'center',
              padding: '0 10px'
            }}>
              <Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Presence" value={effect.params?.presence || 50} onChange={handleKnobChange('presence')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Contour" value={effect.params?.contour || 0} onChange={handleKnobChange('contour')} color="#1a1a1a" pointerColor="#ffffff" />
              <Knob label="Master" value={effect.params?.master || 60} onChange={handleKnobChange('master')} color="#1a1a1a" pointerColor="#ffffff" />
            </div>
          </div>
        );
      case 'tech21sansamp':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
            <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} />
            <Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} />
            <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
            <Knob label="Presence" value={effect.params?.presence || 50} onChange={handleKnobChange('presence')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
            <Knob label="Character" value={effect.params?.character || 33} onChange={handleKnobChange('character')} />
          </>
        );
      
      // MODULATION FAMILY
      case 'delay':
        return (
          <>
            <Knob label="Time" value={effect.params?.time || 500} onChange={handleKnobChange('time')} min={0} max={2000} />
            <Knob label="Feedback" value={effect.params?.feedback || 40} onChange={handleKnobChange('feedback')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'tapeecho':
        return (
          <>
            <Knob label="Time" value={effect.params?.time || 400} onChange={handleKnobChange('time')} min={0} max={2000} />
            <Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
            <Knob label="Wow" value={effect.params?.wow || 30} onChange={handleKnobChange('wow')} />
          </>
        );
      case 'chorus':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 20} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'phaser':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 30} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} />
            <Knob label="Feedback" value={effect.params?.feedback || 40} onChange={handleKnobChange('feedback')} />
          </>
        );
      case 'flanger':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 25} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} />
          </>
        );
      case 'tremolo':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} />
            <Knob label="Wave" value={effect.params?.wave || 0} onChange={handleKnobChange('wave')} min={0} max={3} />
          </>
        );
      case 'vibrato':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 50} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} />
            <Knob label="Mix" value={effect.params?.mix || 100} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'univibe':
        return (
          <>
            <Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} min={1} max={100} />
            <Knob label="Intensity" value={effect.params?.intensity || 60} onChange={handleKnobChange('intensity')} />
            <Knob label="Chorus" value={effect.params?.chorus || 50} onChange={handleKnobChange('chorus')} />
          </>
        );
      case 'rotary':
        return (
          <>
            <Knob label="Speed" value={effect.params?.speed || 50} onChange={handleKnobChange('speed')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} />
          </>
        );
      
      // REVERB FAMILY
      case 'reverb':
        return (
          <>
            <Knob label="Time" value={effect.params?.time || 20} onChange={handleKnobChange('time')} min={1} max={50} />
            <Knob label="Decay" value={effect.params?.decay || 20} onChange={handleKnobChange('decay')} min={1} max={50} />
            <Knob label="Mix" value={effect.params?.mix || 30} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'springreverb':
        return (
          <>
            <Knob label="Dwell" value={effect.params?.dwell || 50} onChange={handleKnobChange('dwell')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'shimmerreverb':
        return (
          <>
            <Knob label="Decay" value={effect.params?.decay || 30} onChange={handleKnobChange('decay')} min={1} max={50} />
            <Knob label="Shimmer" value={effect.params?.shimmer || 60} onChange={handleKnobChange('shimmer')} />
            <Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} />
          </>
        );
      
      // DYNAMIC PROCESSORS
      case 'compressor':
        return (
          <>
            <Knob label="Threshold" value={effect.params?.threshold || 50} onChange={handleKnobChange('threshold')} />
            <Knob label="Ratio" value={effect.params?.ratio || 40} onChange={handleKnobChange('ratio')} />
            <Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} />
          </>
        );
      case 'noisegate':
        return (
          <>
            <Knob label="Threshold" value={effect.params?.threshold || 30} onChange={handleKnobChange('threshold')} />
            <Knob label="Release" value={effect.params?.release || 40} onChange={handleKnobChange('release')} />
            <Knob label="Decay" value={effect.params?.decay || 50} onChange={handleKnobChange('decay')} />
          </>
        );
      
      // EQ/FILTER FAMILY
      case 'eq':
        return (
          <>
            <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} />
            <Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} />
            <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
          </>
        );
      case 'wah':
        return (
          <>
            <Knob label="Freq" value={effect.params?.frequency || 50} onChange={handleKnobChange('frequency')} />
            <Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} />
            <Knob label="Mix" value={effect.params?.mix || 100} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'autowah':
        return (
          <>
            <Knob label="Sensitivity" value={effect.params?.sensitivity || 50} onChange={handleKnobChange('sensitivity')} />
            <Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} />
            <Knob label="Mix" value={effect.params?.mix || 80} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'envfilter':
        return (
          <>
            <Knob label="Sensitivity" value={effect.params?.sensitivity || 60} onChange={handleKnobChange('sensitivity')} />
            <Knob label="Freq" value={effect.params?.frequency || 50} onChange={handleKnobChange('frequency')} />
            <Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} />
          </>
        );
      
      // PITCH/HARMONY
      case 'octaver':
        return (
          <>
            <Knob label="Oct-1" value={effect.params?.oct1 || 50} onChange={handleKnobChange('oct1')} />
            <Knob label="Oct-2" value={effect.params?.oct2 || 30} onChange={handleKnobChange('oct2')} />
            <Knob label="Direct" value={effect.params?.direct || 70} onChange={handleKnobChange('direct')} />
          </>
        );
      case 'pitchshifter':
        return (
          <>
            <Knob label="Pitch" value={effect.params?.pitch || 50} onChange={handleKnobChange('pitch')} min={0} max={24} />
            <Knob label="Fine" value={effect.params?.fine || 50} onChange={handleKnobChange('fine')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'whammy':
        return (
          <>
            <Knob label="Shift" value={effect.params?.shift || 50} onChange={handleKnobChange('shift')} min={0} max={24} />
            <Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} />
            <Knob label="Detune" value={effect.params?.detune || 0} onChange={handleKnobChange('detune')} />
          </>
        );
      
      // SPECIAL FX
      case 'looper':
        return (
          <>
            <Knob label="Length" value={effect.params?.length || 50} onChange={handleKnobChange('length')} min={1} max={60} />
            <Knob label="Feedback" value={effect.params?.feedback || 100} onChange={handleKnobChange('feedback')} />
            <Knob label="Level" value={effect.params?.level || 100} onChange={handleKnobChange('level')} />
          </>
        );
      case 'bitcrusher':
        return (
          <>
            <Knob label="Bits" value={effect.params?.bits || 8} onChange={handleKnobChange('bits')} min={1} max={16} />
            <Knob label="Rate" value={effect.params?.rate || 50} onChange={handleKnobChange('rate')} />
            <Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'ringmod':
        return (
          <>
            <Knob label="Freq" value={effect.params?.frequency || 440} onChange={handleKnobChange('frequency')} min={20} max={5000} />
            <Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'slicer':
      case 'stepslicer':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 80} onChange={handleKnobChange('depth')} />
            <Knob label="Pattern" value={effect.params?.pattern || 0} onChange={handleKnobChange('pattern')} min={0} max={7} />
          </>
        );
      case 'feedback':
        return (
          <>
            <Knob label="Amount" value={effect.params?.amount || 50} onChange={handleKnobChange('amount')} />
            <Knob label="Freq" value={effect.params?.frequency || 50} onChange={handleKnobChange('frequency')} />
            <Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} />
          </>
        );
      case 'vocoder':
        return (
          <>
            <Knob label="Bands" value={effect.params?.bands || 50} onChange={handleKnobChange('bands')} />
            <Knob label="Formant" value={effect.params?.formant || 50} onChange={handleKnobChange('formant')} />
            <Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'swell':
        return (
          <>
            <Knob label="Attack" value={effect.params?.attack || 50} onChange={handleKnobChange('attack')} />
            <Knob label="Decay" value={effect.params?.decay || 50} onChange={handleKnobChange('decay')} />
            <Knob label="Sensitivity" value={effect.params?.sensitivity || 50} onChange={handleKnobChange('sensitivity')} />
          </>
        );
      
      // NOVOS EFEITOS
      case 'metaldistortion':
        return (
          <>
            <Knob label="Gain" value={effect.params?.gain || 80} onChange={handleKnobChange('gain')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Level" value={effect.params?.level || 60} onChange={handleKnobChange('level')} />
          </>
        );
      case 'boost':
        return (
          <>
            <Knob label="Boost" value={effect.params?.boost || 50} onChange={handleKnobChange('boost')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
            <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
          </>
        );
      case 'tapdelay':
        return (
          <>
            <Knob label="Time" value={effect.params?.time || 500} onChange={handleKnobChange('time')} min={0} max={2000} />
            <Knob label="Feedback" value={effect.params?.feedback || 40} onChange={handleKnobChange('feedback')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'hallreverb':
      case 'platereverb':
      case 'roomreverb':
        return (
          <>
            <Knob label="Size" value={effect.params?.size || 50} onChange={handleKnobChange('size')} />
            <Knob label="Decay" value={effect.params?.decay || 30} onChange={handleKnobChange('decay')} />
            <Knob label="Mix" value={effect.params?.mix || 30} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'analogchorus':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 25} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} />
            <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
          </>
        );
      case 'analogflanger':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 30} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 70} onChange={handleKnobChange('depth')} />
            <Knob label="Regen" value={effect.params?.regen || 60} onChange={handleKnobChange('regen')} />
          </>
        );
      case 'autopan':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Depth" value={effect.params?.depth || 70} onChange={handleKnobChange('depth')} />
            <Knob label="Wave" value={effect.params?.wave || 0} onChange={handleKnobChange('wave')} min={0} max={3} />
          </>
        );
      case 'limiter':
        return (
          <>
            <Knob label="Threshold" value={effect.params?.threshold || 70} onChange={handleKnobChange('threshold')} />
            <Knob label="Release" value={effect.params?.release || 50} onChange={handleKnobChange('release')} />
            <Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} />
          </>
        );
      case 'tubecompressor':
        return (
          <>
            <Knob label="Drive" value={effect.params?.drive || 40} onChange={handleKnobChange('drive')} />
            <Knob label="Sustain" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} />
            <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
          </>
        );
      case 'graphiceq':
        return (
          <>
            <Knob label="Low" value={effect.params?.low || 50} onChange={handleKnobChange('low')} />
            <Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} />
            <Knob label="High" value={effect.params?.high || 50} onChange={handleKnobChange('high')} />
          </>
        );
      case 'talkbox':
        return (
          <>
            <Knob label="Formant" value={effect.params?.formant || 50} onChange={handleKnobChange('formant')} />
            <Knob label="Freq" value={effect.params?.frequency || 50} onChange={handleKnobChange('frequency')} />
            <Knob label="Mix" value={effect.params?.mix || 80} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'lfofilter':
      case 'stepfilter':
        return (
          <>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} min={1} max={100} />
            <Knob label="Freq" value={effect.params?.frequency || 50} onChange={handleKnobChange('frequency')} />
            <Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} />
          </>
        );
      case 'harmonizer':
        return (
          <>
            <Knob label="Interval" value={effect.params?.interval || 7} onChange={handleKnobChange('interval')} min={-12} max={12} />
            <Knob label="Key" value={effect.params?.key || 0} onChange={handleKnobChange('key')} min={0} max={11} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'detune':
        return (
          <>
            <Knob label="Detune" value={effect.params?.detune || 20} onChange={handleKnobChange('detune')} />
            <Knob label="Delay" value={effect.params?.delay || 30} onChange={handleKnobChange('delay')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
      case 'volume':
        return (
          <>
            <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
            <Knob label="Min" value={effect.params?.min || 0} onChange={handleKnobChange('min')} />
            <Knob label="Max" value={effect.params?.max || 100} onChange={handleKnobChange('max')} />
          </>
        );
      case 'tuner':
        return (
          <>
            <Knob label="Calib" value={effect.params?.calibration || 440} onChange={handleKnobChange('calibration')} min={430} max={450} />
            <Knob label="Mode" value={effect.params?.mode || 0} onChange={handleKnobChange('mode')} min={0} max={2} />
            <Knob label="Display" value={effect.params?.display || 50} onChange={handleKnobChange('display')} />
          </>
        );
      case 'abtoggle':
      case 'splitter':
        return (
          <>
            <Knob label="A Level" value={effect.params?.levelA || 100} onChange={handleKnobChange('levelA')} />
            <Knob label="B Level" value={effect.params?.levelB || 100} onChange={handleKnobChange('levelB')} />
            <Knob label="Balance" value={effect.params?.balance || 50} onChange={handleKnobChange('balance')} />
          </>
        );
      
      // NEW EFFECTS 2025 - DRIVE (authentic per-pedal controls)
      case 'ts808':
        return (<><Knob label="Overdrive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'bossod3':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'maxonod808':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Balance" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'tumnus':
      case 'soulfood':
        return (<><Knob label="Drive" value={effect.params?.drive || 40} onChange={handleKnobChange('drive')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'morningglory':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'zendrive':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Voice" value={effect.params?.voice || 50} onChange={handleKnobChange('voice')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'timmy':
        return (<><Knob label="Drive" value={effect.params?.drive || 40} onChange={handleKnobChange('drive')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /></>);
      case 'friedmanbeod':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '4px', flexWrap: 'wrap' }}>
              <Knob label="Gain" value={effect.params?.gain || 60} onChange={handleKnobChange('gain')} />
              <Knob label="Volume" value={effect.params?.volume || 60} onChange={handleKnobChange('volume')} />
              <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
              <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="toggle-switch" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '4px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px',
                border: '2px solid rgba(255,255,255,0.25)', minWidth: '35px'
              }}>
                <span style={{ fontSize: '7px', color: '#fff', fontWeight: 'bold', opacity: 0.9 }}>TIGHT</span>
                <input type="checkbox" checked={effect.params?.tight > 50}
                  onChange={(e) => onUpdate(effect.id, 'tight', e.target.checked ? 100 : 0)}
                  style={{ transform: 'scale(0.8)', cursor: 'pointer' }} />
                <span style={{ fontSize: '7px', color: '#aaa', fontWeight: 'bold', opacity: 0.8 }}>OFF</span>
              </div>
            </div>
          </div>
        );
      case 'suhrriot':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'catalinbreaddls':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'bognerecstasyblue':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '4px', flexWrap: 'wrap' }}>
              <Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} />
              <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
              <Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} />
              <Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="toggle-switch" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '4px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px',
                border: '2px solid rgba(255,255,255,0.25)', minWidth: '35px'
              }}>
                <span style={{ fontSize: '7px', color: '#fff', fontWeight: 'bold', opacity: 0.9 }}>BOOST</span>
                <input type="checkbox" checked={!!effect.params?.boost}
                  onChange={(e) => onUpdate(effect.id, 'boost', e.target.checked ? 1 : 0)}
                  style={{ transform: 'scale(0.8)', cursor: 'pointer' }} />
                <span style={{ fontSize: '7px', color: '#aaa', fontWeight: 'bold', opacity: 0.8 }}>OFF</span>
              </div>
            </div>
          </div>
        );
      case 'plumes':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '5px' }}>
              <Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} />
              <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
              <Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center' }}>
              {[1, 2, 3].map(m => (
                <button key={m} onClick={() => onUpdate(effect.id, 'mode', m)}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    border: (effect.params?.mode || 1) === m ? '2px solid #000' : '1px solid #888',
                    background: (effect.params?.mode || 1) === m ? '#5abc00' : '#e0e0e0',
                    color: (effect.params?.mode || 1) === m ? '#fff' : '#333',
                    fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', padding: 0
                  }}>{m}</button>
              ))}
            </div>
          </div>
        );
      case 'dod250':
        return (<><Knob label="Gain" value={effect.params?.gain || 60} onChange={handleKnobChange('gain')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'darkglassb7k':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      case 'swollenpickle':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} /><Knob label="Filter" value={effect.params?.filter || 50} onChange={handleKnobChange('filter')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Scoop" value={effect.params?.scoop || 50} onChange={handleKnobChange('scoop')} /><Knob label="Crunch" value={effect.params?.crunch || 50} onChange={handleKnobChange('crunch')} /></>);
      case 'greenrussian':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'fuzzlordchime':
        return (<><Knob label="Fuzz" value={effect.params?.fuzz || 70} onChange={handleKnobChange('fuzz')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Octave" value={effect.params?.octave_blend || 50} onChange={handleKnobChange('octave_blend')} /></>);
      case 'badmonkey':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /></>);
      case 'amp11':
        return (<><Knob label="Drive" value={effect.params?.drive || 40} onChange={handleKnobChange('drive')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'fulldrive2':
        return (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', justifyItems: 'center' }}>
              <Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} />
              <Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} />
              <Knob label="OD" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} />
              <Knob label="Boost" value={effect.params?.boost || 0} onChange={handleKnobChange('boost')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', width: '100%' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.25)'
              }}>
                <span style={{ fontSize: '7px', color: '#ddeeff', fontWeight: 'bold', letterSpacing: '0.5px' }}>COMP CUT</span>
                <div onClick={() => onUpdate(effect.id, 'mode', effect.params?.mode >= 50 ? 0 : 100)}
                  style={{
                    width: '16px', height: '26px', background: 'linear-gradient(180deg, #555, #333)',
                    borderRadius: '8px', border: '1px solid #777', cursor: 'pointer',
                    position: 'relative', margin: '2px 0', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                  }}>
                  <div style={{
                    width: '12px', height: '12px', background: 'radial-gradient(circle at 40% 35%, #f0f0f0, #c0c0c0)',
                    borderRadius: '50%', position: 'absolute', left: '1px',
                    top: effect.params?.mode >= 50 ? '1px' : '11px',
                    transition: 'top 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.6)'
                  }}/>
                </div>
                <span style={{ fontSize: '7px', color: '#ddeeff', fontWeight: 'bold', letterSpacing: '0.5px' }}>VINTAGE</span>
              </div>
            </div>
          </div>
        );
      
      // NEW EFFECTS 2025 - MODULATION (authentic per-pedal controls)
      case 'tccorona':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="FX Level" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'strymonola':
        return (<><Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'smallstone':
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '10px' }}>
            <Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} />
            <div className="toggle-switch" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '4px 6px', background: 'rgba(0,0,0,0.15)', borderRadius: '4px',
              border: '2px solid rgba(0,0,0,0.3)', minWidth: '35px', marginTop: '20px'
            }}>
              <span style={{ fontSize: '7px', color: '#ff6600', fontWeight: 'bold', opacity: 0.9 }}>COLOR</span>
              <input type="checkbox" checked={!!effect.params?.color}
                onChange={(e) => onUpdate(effect.id, 'color', e.target.checked ? 1 : 0)}
                style={{ transform: 'scale(0.8)', cursor: 'pointer' }} />
              <span style={{ fontSize: '7px', color: '#666', fontWeight: 'bold', opacity: 0.8 }}>OFF</span>
            </div>
          </div>
        );
      case 'phase100':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Intensity" value={effect.params?.intensity || 60} onChange={handleKnobChange('intensity')} /></>);
      case 'electricmistress':
        return (<><Knob label="Rate" value={effect.params?.rate || 30} onChange={handleKnobChange('rate')} /><Knob label="Range" value={effect.params?.range || 60} onChange={handleKnobChange('range')} /><Knob label="Color" value={effect.params?.filter_matrix || 50} onChange={handleKnobChange('filter_matrix')} /></>);
      case 'tcvortex':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} /></>);
      case 'dejavibe':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Intensity" value={effect.params?.intensity || 60} onChange={handleKnobChange('intensity')} /><Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} /></>);
      case 'rotovibe':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /></>);
      case 'diamondtrem':
        return (<><Knob label="Speed" value={effect.params?.rate || 50} onChange={handleKnobChange('rate')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} /></>);
      case 'warpedvinyl':
        return (<><Knob label="Rate" value={effect.params?.rate || 30} onChange={handleKnobChange('rate')} /><Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Warp" value={effect.params?.warp || 30} onChange={handleKnobChange('warp')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      case 'polychorus':
        return (<><Knob label="Rate" value={effect.params?.rate || 40} onChange={handleKnobChange('rate')} /><Knob label="Width" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} /><Knob label="F.Back" value={effect.params?.feedback || 40} onChange={handleKnobChange('feedback')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'tcshaker':
        return (<><Knob label="Speed" value={effect.params?.speed || 40} onChange={handleKnobChange('speed')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="FX Level" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'monument':
        return (<><Knob label="Rate" value={effect.params?.rate || 50} onChange={handleKnobChange('rate')} /><Knob label="Depth" value={effect.params?.depth || 60} onChange={handleKnobChange('depth')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} /></>);
      case 'particle':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Density" value={effect.params?.density || 50} onChange={handleKnobChange('density')} /><Knob label="Pitch" value={effect.params?.pitch || 50} onChange={handleKnobChange('pitch')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'merisenzo':
        return (<><Knob label="Voice" value={effect.params?.voice || 50} onChange={handleKnobChange('voice')} /><Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Filter" value={effect.params?.filter || 50} onChange={handleKnobChange('filter')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      
      // NEW EFFECTS 2025 - TIME-BASED (authentic per-pedal controls)
      case 'tcflashback':
        return (<><Knob label="Delay" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} /><Knob label="FX Level" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'supapuss':
        return (<><Knob label="Delay" value={effect.params?.delay || 50} onChange={handleKnobChange('delay')} /><Knob label="Repeats" value={effect.params?.repeats || 50} onChange={handleKnobChange('repeats')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Filter" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Speed" value={effect.params?.mod_speed || 30} onChange={handleKnobChange('mod_speed')} /></>);
      case 'arp87':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Repeats" value={effect.params?.repeats || 50} onChange={handleKnobChange('repeats')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Dampen" value={effect.params?.dampen || 50} onChange={handleKnobChange('dampen')} /></>);
      case 'dispatchmaster':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Repeats" value={effect.params?.repeats || 50} onChange={handleKnobChange('repeats')} /><Knob label="Reverb" value={effect.params?.reverb || 40} onChange={handleKnobChange('reverb')} /><Knob label="Flexi" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'bossdd3':
        return (<><Knob label="E.Level" value={effect.params?.level || 50} onChange={handleKnobChange('level')} /><Knob label="F.Back" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} /><Knob label="D.Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /></>);
      case 'bossdd7':
        return (<><Knob label="E.Level" value={effect.params?.level || 50} onChange={handleKnobChange('level')} /><Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} /><Knob label="D.Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      case 'maxonad999':
        return (<><Knob label="Delay" value={effect.params?.delay || 50} onChange={handleKnobChange('delay')} /><Knob label="Repeat" value={effect.params?.repeat || 50} onChange={handleKnobChange('repeat')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /></>);
      case 'echosystem':
        return (<><Knob label="Time A" value={effect.params?.time_a || 50} onChange={handleKnobChange('time_a')} /><Knob label="Time B" value={effect.params?.time_b || 50} onChange={handleKnobChange('time_b')} /><Knob label="Feedback" value={effect.params?.feedback || 50} onChange={handleKnobChange('feedback')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'thermae':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Regen" value={effect.params?.regen || 50} onChange={handleKnobChange('regen')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Int1" value={effect.params?.interval1 || 50} onChange={handleKnobChange('interval1')} /><Knob label="Int2" value={effect.params?.interval2 || 50} onChange={handleKnobChange('interval2')} /></>);
      case 'belleepoch':
        return (<><Knob label="Echo" value={effect.params?.echo || 50} onChange={handleKnobChange('echo')} /><Knob label="Record Level" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Bias" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      case 'elcapistan':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Repeats" value={effect.params?.repeats || 50} onChange={handleKnobChange('repeats')} /><Knob label="Wow&Fltr" value={effect.params?.wow_flutter || 20} onChange={handleKnobChange('wow_flutter')} /><Knob label="Tape Age" value={effect.params?.tape_age || 30} onChange={handleKnobChange('tape_age')} /></>);
      case 'strymonflint':
        return (<><Knob label="Speed" value={effect.params?.trem_speed || 50} onChange={handleKnobChange('trem_speed')} /><Knob label="Intensity" value={effect.params?.trem_depth || 50} onChange={handleKnobChange('trem_depth')} /><Knob label="Decay" value={effect.params?.reverb_decay || 50} onChange={handleKnobChange('reverb_decay')} /><Knob label="Color" value={effect.params?.color || 50} onChange={handleKnobChange('color')} /><Knob label="Mix" value={effect.params?.reverb_mix || 40} onChange={handleKnobChange('reverb_mix')} /></>);
      case 'immerse':
        return (<><Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} /><Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Trail" value={effect.params?.trail || 50} onChange={handleKnobChange('trail')} /></>);
      case 'cathedral':
        return (<><Knob label="Blend" value={effect.params?.blend || 40} onChange={handleKnobChange('blend')} /><Knob label="Feedback" value={effect.params?.feedback || 30} onChange={handleKnobChange('feedback')} /><Knob label="Damping" value={effect.params?.damp || 50} onChange={handleKnobChange('damp')} /><Knob label="Time" value={effect.params?.reverb_time || 50} onChange={handleKnobChange('reverb_time')} /><Knob label="Pre-Delay" value={effect.params?.predelay || 20} onChange={handleKnobChange('predelay')} /></>);
      case 'walrusslo':
        return (<><Knob label="Decay" value={effect.params?.decay || 60} onChange={handleKnobChange('decay')} /><Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} /><Knob label="Filter" value={effect.params?.filter || 50} onChange={handleKnobChange('filter')} /><Knob label="X" value={effect.params?.depth || 40} onChange={handleKnobChange('depth')} /></>);
      case 'darkstar':
        return (<><Knob label="Decay" value={effect.params?.decay || 60} onChange={handleKnobChange('decay')} /><Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} /><Knob label="Voice" value={effect.params?.voice || 50} onChange={handleKnobChange('voice')} /><Knob label="Crush" value={effect.params?.crush || 0} onChange={handleKnobChange('crush')} /></>);
      case 'mercury7':
        return (<><Knob label="Space Decay" value={effect.params?.space_decay || 50} onChange={handleKnobChange('space_decay')} /><Knob label="Mix" value={effect.params?.mix || 40} onChange={handleKnobChange('mix')} /><Knob label="Hi Freq" value={effect.params?.hi_freq || 50} onChange={handleKnobChange('hi_freq')} /><Knob label="Lo Freq" value={effect.params?.lo_freq || 50} onChange={handleKnobChange('lo_freq')} /><Knob label="Mod Speed" value={effect.params?.modulate || 30} onChange={handleKnobChange('modulate')} /><Knob label="Density" value={effect.params?.density || 50} onChange={handleKnobChange('density')} /></>);
      case 'rpcontext':
        return (<><Knob label="Decay" value={effect.params?.decay || 50} onChange={handleKnobChange('decay')} /><Knob label="Blend" value={effect.params?.blend || 40} onChange={handleKnobChange('blend')} /><Knob label="Dampen" value={effect.params?.dampen || 50} onChange={handleKnobChange('dampen')} /><Knob label="Pre-Delay" value={effect.params?.pre_delay || 20} onChange={handleKnobChange('pre_delay')} /></>);
      case 'tensor':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Pitch" value={effect.params?.pitch || 50} onChange={handleKnobChange('pitch')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /><Knob label="Speed" value={effect.params?.speed || 50} onChange={handleKnobChange('speed')} /></>);
      
      // NEW EFFECTS 2025 - DYNAMICS (authentic per-pedal controls)
      case 'fmrrnc':
        return (<><Knob label="Threshold" value={effect.params?.threshold || 50} onChange={handleKnobChange('threshold')} /><Knob label="Ratio" value={effect.params?.ratio || 40} onChange={handleKnobChange('ratio')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Release" value={effect.params?.release || 40} onChange={handleKnobChange('release')} /><Knob label="Gain" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /></>);
      case 'empresscomp':
        return (<><Knob label="Comp" value={effect.params?.threshold || 50} onChange={handleKnobChange('threshold')} /><Knob label="Ratio" value={effect.params?.ratio || 40} onChange={handleKnobChange('ratio')} /><Knob label="Mix" value={effect.params?.mix || 70} onChange={handleKnobChange('mix')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Output" value={effect.params?.output || 70} onChange={handleKnobChange('output')} /></>);
      case 'cali76':
        return (<><Knob label="In" value={effect.params?.input || 50} onChange={handleKnobChange('input')} /><Knob label="Out" value={effect.params?.output || 50} onChange={handleKnobChange('output')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Release" value={effect.params?.release || 40} onChange={handleKnobChange('release')} /><Knob label="Ratio" value={effect.params?.ratio || 40} onChange={handleKnobChange('ratio')} /></>);
      case 'deepsix':
        return (<><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Sustain" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} /><Knob label="Blend" value={effect.params?.blend || 70} onChange={handleKnobChange('blend')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /></>);
      case 'blackfinger':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Squash" value={effect.params?.squash || 30} onChange={handleKnobChange('squash')} /></>);
      case 'philosopher':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 60} onChange={handleKnobChange('sustain')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Grit" value={effect.params?.grit || 20} onChange={handleKnobChange('grit')} /></>);
      case 'hypergravity':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Blend" value={effect.params?.blend || 70} onChange={handleKnobChange('blend')} /></>);
      case 'bosscs3':
        return (<><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Sustain" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} /></>);
      case 'wamplerego':
        return (<><Knob label="Sustain" value={effect.params?.sustain || 50} onChange={handleKnobChange('sustain')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Attack" value={effect.params?.attack || 30} onChange={handleKnobChange('attack')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /><Knob label="Blend" value={effect.params?.blend || 70} onChange={handleKnobChange('blend')} /></>);
      case 'compulator':
        return (<><Knob label="Comp" value={effect.params?.compress || 50} onChange={handleKnobChange('compress')} /><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Tone" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      
      // NEW EFFECTS 2025 - EQ & FILTERS (authentic per-pedal controls)
      case 'bossge7':
        return (<><Knob label="100Hz" value={effect.params?.band1 || 50} onChange={handleKnobChange('band1')} /><Knob label="200Hz" value={effect.params?.band2 || 50} onChange={handleKnobChange('band2')} /><Knob label="400Hz" value={effect.params?.band3 || 50} onChange={handleKnobChange('band3')} /><Knob label="800Hz" value={effect.params?.band4 || 50} onChange={handleKnobChange('band4')} /><Knob label="1.6kHz" value={effect.params?.band5 || 50} onChange={handleKnobChange('band5')} /><Knob label="3.2kHz" value={effect.params?.band6 || 50} onChange={handleKnobChange('band6')} /><Knob label="6.4kHz" value={effect.params?.band7 || 50} onChange={handleKnobChange('band7')} /><Knob label="Level" value={effect.params?.level || 50} onChange={handleKnobChange('level')} /></>);
      case 'sourceaudioeq2':
        return (<><Knob label="Band 1" value={effect.params?.low_gain || 50} onChange={handleKnobChange('low_gain')} /><Knob label="Band 2" value={effect.params?.mid_gain || 50} onChange={handleKnobChange('mid_gain')} /><Knob label="Band 3" value={effect.params?.hi_gain || 50} onChange={handleKnobChange('hi_gain')} /><Knob label="Volume" value={effect.params?.boost || 50} onChange={handleKnobChange('boost')} /></>);
      case 'empressparaeq':
        return (<><Knob label="Low" value={effect.params?.low_gain || 50} onChange={handleKnobChange('low_gain')} /><Knob label="Low Mid" value={effect.params?.lowmid_gain || 50} onChange={handleKnobChange('lowmid_gain')} /><Knob label="Hi Mid" value={effect.params?.mid_gain || 50} onChange={handleKnobChange('mid_gain')} /><Knob label="High" value={effect.params?.hi_gain || 50} onChange={handleKnobChange('hi_gain')} /><Knob label="Gain" value={effect.params?.boost || 50} onChange={handleKnobChange('boost')} /></>);
      case 'talkingmachine':
        return (<><Knob label="Voice" value={effect.params?.voice || 50} onChange={handleKnobChange('voice')} /><Knob label="Sensitivity" value={effect.params?.sensitivity || 50} onChange={handleKnobChange('sensitivity')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /></>);
      case 'moogmf101':
        return (<><Knob label="Cutoff" value={effect.params?.cutoff || 50} onChange={handleKnobChange('cutoff')} /><Knob label="Reso" value={effect.params?.resonance || 50} onChange={handleKnobChange('resonance')} /><Knob label="Amount" value={effect.params?.envelope_amount || 50} onChange={handleKnobChange('envelope_amount')} /><Knob label="Drive" value={effect.params?.drive || 30} onChange={handleKnobChange('drive')} /><Knob label="Mix" value={effect.params?.mix || 100} onChange={handleKnobChange('mix')} /></>);
      case 'dod440':
        return (<><Knob label="Sensitivity" value={effect.params?.sensitivity || 50} onChange={handleKnobChange('sensitivity')} /><Knob label="Range" value={effect.params?.range || 50} onChange={handleKnobChange('range')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /></>);
      case 'mutron':
        return (<><Knob label="Peak" value={effect.params?.peak || 50} onChange={handleKnobChange('peak')} /><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Drive" value={effect.params?.drive || 30} onChange={handleKnobChange('drive')} /></>);
      case 'qtron':
        return (<><Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} /><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Range" value={effect.params?.range || 50} onChange={handleKnobChange('range')} /></>);
      case 'dunlop105q':
        return (<><Knob label="Volume" value={effect.params?.volume || 70} onChange={handleKnobChange('volume')} /><Knob label="Frequency" value={effect.params?.position || 50} onChange={handleKnobChange('position')} /><Knob label="Range" value={effect.params?.range || 50} onChange={handleKnobChange('range')} /><Knob label="Q" value={effect.params?.q || 50} onChange={handleKnobChange('q')} /></>);
      case 'badhorsie':
        return (<><Knob label="Contour" value={effect.params?.contour || 50} onChange={handleKnobChange('contour')} /><Knob label="Level" value={effect.params?.level || 70} onChange={handleKnobChange('level')} /><Knob label="Range" value={effect.params?.wah_range || 50} onChange={handleKnobChange('wah_range')} /></>);
      
      // NEW EFFECTS 2025 - PITCH & SYNTH (authentic per-pedal controls)
      case 'ehxpog':
        return (<><Knob label="Sub Octave" value={effect.params?.sub_octave || 50} onChange={handleKnobChange('sub_octave')} /><Knob label="Dry" value={effect.params?.dry || 100} onChange={handleKnobChange('dry')} /><Knob label="Octave Up" value={effect.params?.octave_up || 50} onChange={handleKnobChange('octave_up')} /><Knob label="Filter" value={effect.params?.lpf || 50} onChange={handleKnobChange('lpf')} /></>);
      case 'micropog':
        return (<><Knob label="Sub Octave" value={effect.params?.sub_octave || 50} onChange={handleKnobChange('sub_octave')} /><Knob label="Dry" value={effect.params?.dry || 100} onChange={handleKnobChange('dry')} /><Knob label="Octave Up" value={effect.params?.octave_up || 50} onChange={handleKnobChange('octave_up')} /></>);
      case 'ehxhog':
        return (<><Knob label="-2 Oct" value={effect.params?.sub2 || 0} onChange={handleKnobChange('sub2')} /><Knob label="-1 Oct" value={effect.params?.sub1 || 50} onChange={handleKnobChange('sub1')} /><Knob label="Dry" value={effect.params?.dry || 100} onChange={handleKnobChange('dry')} /><Knob label="+1 Oct" value={effect.params?.oct1 || 50} onChange={handleKnobChange('oct1')} /><Knob label="+5th" value={effect.params?.fifth || 0} onChange={handleKnobChange('fifth')} /><Knob label="+2 Oct" value={effect.params?.oct2 || 0} onChange={handleKnobChange('oct2')} /></>);
      case 'bossps6':
        return (<><Knob label="Shift" value={effect.params?.shift || 50} onChange={handleKnobChange('shift')} /><Knob label="Fine" value={effect.params?.fine || 50} onChange={handleKnobChange('fine')} /><Knob label="Balance" value={effect.params?.balance || 50} onChange={handleKnobChange('balance')} /></>);
      case 'subnup':
        return (<><Knob label="Sub 1" value={effect.params?.sub1 || 50} onChange={handleKnobChange('sub1')} /><Knob label="Sub 2" value={effect.params?.sub2 || 30} onChange={handleKnobChange('sub2')} /><Knob label="Dry" value={effect.params?.dry || 100} onChange={handleKnobChange('dry')} /><Knob label="Poly" value={effect.params?.tone || 50} onChange={handleKnobChange('tone')} /></>);
      case 'pitchfork':
        return (<><Knob label="Shift" value={effect.params?.shift || 50} onChange={handleKnobChange('shift')} /><Knob label="Blend" value={effect.params?.blend || 50} onChange={handleKnobChange('blend')} /></>);
      case 'pitchfactor':
        return (<><Knob label="Pitch A" value={effect.params?.pitch_a || 50} onChange={handleKnobChange('pitch_a')} /><Knob label="Pitch B" value={effect.params?.pitch_b || 50} onChange={handleKnobChange('pitch_b')} /><Knob label="Delay" value={effect.params?.delay || 20} onChange={handleKnobChange('delay')} /><Knob label="FdBk" value={effect.params?.feedback || 20} onChange={handleKnobChange('feedback')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /></>);
      case 'bossoc5':
        return (<><Knob label="Oct 1" value={effect.params?.oct1 || 50} onChange={handleKnobChange('oct1')} /><Knob label="Oct 2" value={effect.params?.oct2 || 30} onChange={handleKnobChange('oct2')} /><Knob label="Direct" value={effect.params?.dry || 100} onChange={handleKnobChange('dry')} /><Knob label="Range" value={effect.params?.range || 50} onChange={handleKnobChange('range')} /></>);
      case 'freeze':
        return (<><Knob label="Decay" value={effect.params?.decay || 100} onChange={handleKnobChange('decay')} /></>);
      case 'hedra':
        return (<><Knob label="Pitch A" value={effect.params?.pitch_a || 50} onChange={handleKnobChange('pitch_a')} /><Knob label="Pitch B" value={effect.params?.pitch_b || 50} onChange={handleKnobChange('pitch_b')} /><Knob label="Pitch C" value={effect.params?.pitch_c || 50} onChange={handleKnobChange('pitch_c')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Glide" value={effect.params?.glide || 30} onChange={handleKnobChange('glide')} /><Knob label="Feedback" value={effect.params?.feedback || 20} onChange={handleKnobChange('feedback')} /></>);
      case 'mood':
        return (<><Knob label="Time" value={effect.params?.time || 50} onChange={handleKnobChange('time')} /><Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} /><Knob label="Clock" value={effect.params?.clock || 50} onChange={handleKnobChange('clock')} /><Knob label="Filter" value={effect.params?.filter || 50} onChange={handleKnobChange('filter')} /><Knob label="Modify" value={effect.params?.modify || 50} onChange={handleKnobChange('modify')} /></>);
      
      // NEW EFFECTS 2025 - MULTI-FX (authentic per-unit controls)
      case 'helix':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Dly Mix" value={effect.params?.delay_mix || 30} onChange={handleKnobChange('delay_mix')} /><Knob label="Rev Mix" value={effect.params?.reverb_mix || 30} onChange={handleKnobChange('reverb_mix')} /></>);
      case 'axefx':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Presence" value={effect.params?.presence || 50} onChange={handleKnobChange('presence')} /><Knob label="Depth" value={effect.params?.depth || 50} onChange={handleKnobChange('depth')} /></>);
      case 'kemper':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Presence" value={effect.params?.presence || 50} onChange={handleKnobChange('presence')} /><Knob label="Definition" value={effect.params?.definition || 50} onChange={handleKnobChange('definition')} /></>);
      case 'quadcortex':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Presence" value={effect.params?.presence || 50} onChange={handleKnobChange('presence')} /></>);
      case 'gt1000':
        return (<><Knob label="Drive" value={effect.params?.drive || 50} onChange={handleKnobChange('drive')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="FX Level" value={effect.params?.fx_level || 50} onChange={handleKnobChange('fx_level')} /></>);
      case 'headrush':
        return (<><Knob label="Gain" value={effect.params?.gain || 50} onChange={handleKnobChange('gain')} /><Knob label="Bass" value={effect.params?.bass || 50} onChange={handleKnobChange('bass')} /><Knob label="Mid" value={effect.params?.mid || 50} onChange={handleKnobChange('mid')} /><Knob label="Treble" value={effect.params?.treble || 50} onChange={handleKnobChange('treble')} /><Knob label="Dly Mix" value={effect.params?.delay_mix || 30} onChange={handleKnobChange('delay_mix')} /></>);
      
      default:
        return (
          <>
            <Knob label="Param 1" value={effect.params?.param1 || 50} onChange={handleKnobChange('param1')} />
            <Knob label="Param 2" value={effect.params?.param2 || 50} onChange={handleKnobChange('param2')} />
            <Knob label="Mix" value={effect.params?.mix || 50} onChange={handleKnobChange('mix')} />
          </>
        );
    }
  };

  const config = getPedalConfig(effect.type);
  
  // Define large pedals (rack effects, multi-parameter pedals)
  const largePedals = [
    // Original large pedals
    'timelinedelay', 'bigskyreverb', 'memoryman', 'crybabywah',
    'mxrdynacomp', 'bossbf2', 'zvexfuzzfactory', 'fulltoneocd',
    // Professional rack effects
    'eventidetimefactor', 'bossdd500', 'line6dl4',
    'eventidespace', 'bossrv500',
    'strymonmobius', 'eventideh9',
    'mesavtwin', 'tech21sansamp',
    // New rack/multi-fx effects
    'helix', 'axefx', 'kemper', 'quadcortex', 'gt1000', 'headrush',
    'fmrrnc', 'echosystem', 'pitchfactor',
    // New pedals with many knobs
    'bossge7', 'ehxhog', 'empresscomp', 'mercury7', 'warpedvinyl',
    'elcapistan', 'strymonflint', 'philosopher', 'moogmf101',
    'cathedral', 'walrusslo', 'strymonola', 'hedra', 'mood',
    'thermae', 'friedmanbeod', 'swollenpickle', 'darkglassb7k',
    'empressparaeq'
  ];
  const isLarge = largePedals.includes(effect.type);

  return (
    <motion.div
      className={`pedal ${effect.bypassed ? 'bypassed' : ''} pedal-${effect.type}`}
      data-size={isLarge ? 'large' : 'normal'}
      style={{
        '--pedal-primary': config.primary,
        '--pedal-secondary': config.secondary,
        '--pedal-bg': config.bgColor,
        '--pedal-gradient': config.bodyGradient,
        '--pedal-metal': config.metalColor,
        '--pedal-label-color': config.labelColor || config.primary
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -5 }}
    >
      <button className="pedal-remove" onClick={() => onRemove(effect.id)}>×</button>
      
      <div className={`pedal-header ${effect.type === 'fulltoneocd' ? 'pedal-header-ocd' : ''}`}>
        {effect.type === 'fulltoneocd' ? (
          <>
            <div className="pedal-brand">{config.brand}</div>
            <h3 className="pedal-name">{config.label}</h3>
          </>
        ) : (
          <>
            <div className="pedal-brand">{config.brand || 'RIGMASTER'}</div>
            <h3 className="pedal-name">{effect.name}</h3>
            <div className="pedal-model">{config.label}</div>
            {config.subtitle && <div className="pedal-subtitle">{config.subtitle}</div>}
          </>
        )}
      </div>

      {/* LCD/OLED DISPLAY for Rack Effects */}
      {config.displayType && (
        <div className={`pedal-display ${config.displayType}`}>
          <div className="display-screen">
            {config.displayType === 'vu-meter' ? (
              <div className="vu-meter-display">
                <div className="vu-meter-bar">
                  <div className="vu-meter-needle" style={{ transform: 'rotate(-20deg)' }}></div>
                </div>
                <div className="vu-meter-labels">
                  <span>-20</span>
                  <span>0</span>
                  <span>+3</span>
                </div>
              </div>
            ) : config.displayType === 'lcd-color' ? (
              <div className="lcd-color-display">
                <div className="lcd-waveform">
                  <svg viewBox="0 0 100 30" className="waveform-svg">
                    <path d="M0,15 Q10,5 20,15 T40,15 T60,15 T80,15 T100,15" 
                          stroke="currentColor" fill="none" strokeWidth="2" />
                  </svg>
                </div>
                <div className="lcd-text">{getDisplayText()}</div>
                <div className="lcd-params">
                  <span>X: {effect.params?.x || 50}</span>
                  <span>Y: {effect.params?.y || 50}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="display-text">{getDisplayText()}</div>
                <div className="display-params">
                  {effect.params?.time && <span>TIME: {effect.params.time}ms</span>}
                  {effect.params?.decay && <span>DECAY: {effect.params.decay}%</span>}
                  {effect.params?.mix && <span>MIX: {effect.params.mix}%</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mesa Boogie Stripes */}
      {config.hasStripes && (
        <div className="mesa-stripes">
          <div className="stripe"></div>
          <div className="stripe"></div>
        </div>
      )}

      <div className="pedal-controls">
        {renderControls()}
      </div>

      <button
        className={`pedal-footswitch ${!effect.bypassed ? 'active' : ''}`}
        onClick={() => onBypass(effect.id)}
        style={{
          '--led-color': config.ledColor || config.primary
        }}
      >
        <div className="footswitch-led" style={{
          boxShadow: !effect.bypassed 
            ? `0 0 10px ${config.ledColor || config.primary}, 0 0 20px ${config.ledColor || config.primary}`
            : 'none'
        }}></div>
      </button>
    </motion.div>
  );
};

export default Pedal;

