// Famous amp models inspired by real gear
export const AmpModels = {
  // FENDER STYLE AMPS
  'twin-reverb': {
    name: 'Twin Reverb',
    type: 'clean',
    color: '#000000',
    grill: '#silver',
    preGain: 1.2,
    saturationAmount: 0.3,
    bass: 2,
    mid: 0,
    treble: 4,
    presence: 3500,
    master: 0.9,
    description: 'Classic American clean tone'
  },
  
  'deluxe-reverb': {
    name: 'Deluxe Reverb',
    type: 'clean',
    color: '#000000',
    grill: '#gold',
    preGain: 1.5,
    saturationAmount: 0.4,
    bass: 3,
    mid: 1,
    treble: 3,
    presence: 4000,
    master: 0.85,
    description: 'Warm bluesy cleans with breakup'
  },
  
  'vibro-king': {
    name: 'Vibro-King',
    type: 'clean',
    color: '#000000',
    grill: '#silver',
    preGain: 2.2,
    saturationAmount: 0.35,
    bass: 3,
    mid: 1,
    treble: 4,
    presence: 4500,
    master: 0.9,
    description: 'Boutique Fender with lush reverb and vibrato'
  },
  
  // MARSHALL STYLE AMPS
  'plexi': {
    name: 'Plexi Lead',
    type: 'crunch',
    color: '#d4af37',
    grill: '#brown',
    preGain: 4,
    saturationAmount: 2,
    bass: 4,
    mid: 6,
    treble: 5,
    presence: 3200,
    master: 0.7,
    description: 'British rock crunch'
  },
  
  'plexi-super-lead-100': {
    name: 'Plexi Super Lead 100',
    type: 'crunch',
    color: '#d4af37',
    grill: '#basketweave',
    preGain: 6,
    saturationAmount: 3,
    bass: 5,
    mid: 5,
    treble: 6,
    presence: 4500,
    master: 0.7,
    description: 'THE legendary Marshall - Hendrix, Page, Van Halen tone'
  },
  
  'jcm800': {
    name: 'JCM 800',
    type: 'lead',
    color: '#000000',
    grill: '#brown',
    preGain: 8,
    saturationAmount: 5,
    bass: 3,
    mid: 7,
    treble: 6,
    presence: 3000,
    master: 0.6,
    description: 'High gain British lead'
  },
  
  // MESA BOOGIE STYLE
  'dual-rectifier': {
    name: 'Dual Rectifier',
    type: 'metal',
    color: '#8b0000',
    grill: '#black',
    preGain: 12,
    saturationAmount: 8,
    bass: 5,
    mid: 5,
    treble: 7,
    presence: 2800,
    master: 0.5,
    description: 'Modern high-gain metal'
  },
  
  'mark-v': {
    name: 'Mark V',
    type: 'lead',
    color: '#000000',
    grill: '#beige',
    preGain: 10,
    saturationAmount: 6,
    bass: 4,
    mid: 8,
    treble: 6,
    presence: 3100,
    master: 0.55,
    description: 'Versatile high-gain lead'
  },
  
  'triple-crown': {
    name: 'Triple Crown',
    type: 'lead',
    color: '#000000',
    grill: '#beige',
    preGain: 11,
    saturationAmount: 7,
    bass: 5,
    mid: 7,
    treble: 7,
    presence: 3000,
    master: 0.6,
    description: 'British-voiced high-gain with EL34 power'
  },
  
  // VOX STYLE
  'ac30': {
    name: 'AC30',
    type: 'crunch',
    color: '#654321',
    grill: '#brown',
    preGain: 3.5,
    saturationAmount: 1.5,
    bass: 5,
    mid: 4,
    treble: 5,
    presence: 3800,
    master: 0.75,
    description: 'Classic British chime'
  },
  
  'nighttrain-nt50': {
    name: 'Night Train NT50H-G2',
    type: 'crunch',
    color: '#000000',
    grill: '#8b0000',
    preGain: 6,
    saturationAmount: 4,
    bass: 5,
    mid: 6,
    treble: 6,
    presence: 3600,
    master: 0.7,
    description: 'Modern British boutique with Vox DNA - 2 channels, 50W'
  },
  
  // ORANGE STYLE
  'orange-rockerverb': {
    name: 'Rockerverb',
    type: 'lead',
    color: '#ff6600',
    grill: '#brown',
    preGain: 9,
    saturationAmount: 5.5,
    bass: 6,
    mid: 5,
    treble: 5,
    presence: 3300,
    master: 0.6,
    description: 'Thick British gain'
  },
  
  'orange-tiny-terror': {
    name: 'Tiny Terror',
    type: 'lead',
    color: '#ff6600',
    grill: '#brown',
    preGain: 8,
    saturationAmount: 5,
    bass: 5,
    mid: 6,
    treble: 5,
    presence: 3500,
    master: 0.65,
    description: 'Lunchbox legend'
  },
  
  // SOLDANO STYLE
  'soldano-slo': {
    name: 'SLO 100',
    type: 'lead',
    color: '#000000',
    grill: '#red',
    preGain: 11,
    saturationAmount: 7,
    bass: 4,
    mid: 7,
    treble: 6,
    presence: 2900,
    master: 0.5,
    description: 'Legendary high-gain'
  },
  
  // PEAVEY STYLE
  '5150': {
    name: '5150',
    type: 'metal',
    color: '#ffffff',
    grill: '#black',
    preGain: 13,
    saturationAmount: 9,
    bass: 6,
    mid: 4,
    treble: 7,
    presence: 2700,
    master: 0.45,
    description: 'Brutal metal tone'
  },
  
  // ENGL STYLE
  'powerball': {
    name: 'Powerball',
    type: 'metal',
    color: '#000000',
    grill: '#red',
    preGain: 14,
    saturationAmount: 9.5,
    bass: 5,
    mid: 6,
    treble: 7,
    presence: 2600,
    master: 0.4,
    description: 'German precision metal'
  },
  
  // DIEZEL STYLE
  'vh4': {
    name: 'VH4',
    type: 'metal',
    color: '#4a4a4a',
    grill: '#silver',
    preGain: 13,
    saturationAmount: 8.5,
    bass: 5,
    mid: 7,
    treble: 6,
    presence: 2800,
    master: 0.45,
    description: 'Ultra-tight modern metal'
  },
  
  // CARVIN STYLE
  'carvin-v3m': {
    name: 'Carvin V3M',
    type: 'lead',
    color: '#2c2c2c',
    grill: '#silver',
    preGain: 10,
    saturationAmount: 7,
    bass: 5,
    mid: 6,
    treble: 7,
    presence: 3000,
    master: 0.55,
    description: '50W EL34 modern high-gain with 3-channel versatility'
  }
};

export default AmpModels;

