// Professional Cabinet + Microphone Simulator
// Simulates different speaker cabinets and mic positions

class CabinetSimulator {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Cabinet types with their characteristics
    this.cabinets = {
      '1x12_open': {
        name: '1x12" Open Back',
        description: 'Fender-style combo, warm and open',
        resonanceFreq: 100,
        resonanceQ: 2.5,
        lowpassFreq: 4800,
        lowpassQ: 0.8,
        bassBoost: 2,
        presence: 1
      },
      '1x12_closed': {
        name: '1x12" Closed Back',
        description: 'Tight, focused single speaker',
        resonanceFreq: 120,
        resonanceQ: 3.0,
        lowpassFreq: 4500,
        lowpassQ: 1.0,
        bassBoost: 3,
        presence: 0.8
      },
      '2x12_open': {
        name: '2x12" Open Back',
        description: 'Vox AC30 style, rich and full',
        resonanceFreq: 90,
        resonanceQ: 2.0,
        lowpassFreq: 5000,
        lowpassQ: 0.7,
        bassBoost: 1.5,
        presence: 1.2
      },
      '2x12_closed': {
        name: '2x12" Closed Back',
        description: 'Marshall-style, punchy mids',
        resonanceFreq: 110,
        resonanceQ: 2.8,
        lowpassFreq: 4700,
        lowpassQ: 0.9,
        bassBoost: 2.5,
        presence: 1.3
      },
      '4x12_vintage': {
        name: '4x12" Vintage 30',
        description: 'Classic Marshall stack, aggressive',
        resonanceFreq: 80,
        resonanceQ: 3.5,
        lowpassFreq: 5200,
        lowpassQ: 1.2,
        bassBoost: 4,
        presence: 1.5
      },
      '4x12_greenback': {
        name: '4x12" Greenback',
        description: 'Warm vintage British tone',
        resonanceFreq: 75,
        resonanceQ: 3.0,
        lowpassFreq: 4200,
        lowpassQ: 1.1,
        bassBoost: 3.5,
        presence: 1.0
      },
      '1x10_tweed': {
        name: '1x10" Tweed',
        description: 'Vintage Fender, bright and snappy',
        resonanceFreq: 140,
        resonanceQ: 2.0,
        lowpassFreq: 5500,
        lowpassQ: 0.6,
        bassBoost: 1,
        presence: 1.8
      },
      '4x10_bassman': {
        name: '4x10" Bassman',
        description: 'Full range, clean headroom',
        resonanceFreq: 95,
        resonanceQ: 2.2,
        lowpassFreq: 6000,
        lowpassQ: 0.5,
        bassBoost: 2,
        presence: 1.4
      }
    };
    
    // Microphone types with their characteristics
    this.microphones = {
      'sm57': {
        name: 'Shure SM57',
        description: 'Industry standard dynamic, bright',
        presenceBoost: 4,
        presenceFreq: 5000,
        presenceQ: 1.5,
        proximityBoost: 3,
        proximityFreq: 200,
        highpass: 80,
        lowpass: 15000
      },
      'sm7b': {
        name: 'Shure SM7B',
        description: 'Dynamic broadcast mic, full bodied',
        presenceBoost: 2,
        presenceFreq: 4000,
        presenceQ: 1.0,
        proximityBoost: 4,
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
        proximityBoost: 5,
        proximityFreq: 120,
        highpass: 60,
        lowpass: 12000
      },
      'u87': {
        name: 'Neumann U87',
        description: 'Large diaphragm condenser, detailed',
        presenceBoost: 3,
        presenceFreq: 8000,
        presenceQ: 1.2,
        proximityBoost: 2,
        proximityFreq: 180,
        highpass: 40,
        lowpass: 20000
      },
      'md421': {
        name: 'Sennheiser MD421',
        description: 'Dynamic, scooped mids',
        presenceBoost: 3.5,
        presenceFreq: 5500,
        presenceQ: 1.3,
        proximityBoost: 3.5,
        proximityFreq: 160,
        highpass: 75,
        lowpass: 17000
      },
      'e906': {
        name: 'Sennheiser e906',
        description: 'Modern dynamic, tight low end',
        presenceBoost: 4.5,
        presenceFreq: 4500,
        presenceQ: 1.4,
        proximityBoost: 2.5,
        proximityFreq: 190,
        highpass: 85,
        lowpass: 16000
      }
    };
    
    // Microphone positions
    this.positions = {
      'center': {
        name: 'Center (On-Axis)',
        description: 'Bright, focused, most aggressive',
        presenceMult: 1.5,
        bassMult: 0.8,
        distanceMult: 0.5
      },
      'edge': {
        name: 'Edge (Off-Center)',
        description: 'Warmer, fuller, balanced',
        presenceMult: 1.0,
        bassMult: 1.2,
        distanceMult: 0.7
      },
      'off_axis': {
        name: 'Off-Axis',
        description: 'Natural, less harsh, smooth',
        presenceMult: 0.7,
        bassMult: 1.0,
        distanceMult: 0.9
      },
      'room': {
        name: 'Room (1ft back)',
        description: 'Ambient, airy, spacious',
        presenceMult: 0.5,
        bassMult: 0.9,
        distanceMult: 1.5
      }
    };
  }
  
  // Create a cabinet simulation filter chain
  createCabinet(cabinetType, micType, position) {
    const cabinet = this.cabinets[cabinetType];
    const mic = this.microphones[micType];
    const pos = this.positions[position];
    
    if (!cabinet || !mic || !pos) {
      console.error('Invalid cabinet/mic/position config');
      return null;
    }
    
    const nodes = {
      input: this.audioContext.createGain(),
      output: this.audioContext.createGain(),
      
      // Cabinet resonance (speaker cone resonance)
      resonance: this.audioContext.createBiquadFilter(),
      
      // Cabinet lowpass (speaker physical limitation)
      cabLowpass: this.audioContext.createBiquadFilter(),
      
      // Mic highpass (remove DC and subsonic)
      micHighpass: this.audioContext.createBiquadFilter(),
      
      // Mic lowpass (HF rolloff)
      micLowpass: this.audioContext.createBiquadFilter(),
      
      // Mic presence peak
      micPresence: this.audioContext.createBiquadFilter(),
      
      // Proximity effect
      proximity: this.audioContext.createBiquadFilter(),
      
      // Air absorption (distance)
      airAbsorption: this.audioContext.createBiquadFilter()
    };
    
    // Configure cabinet resonance
    nodes.resonance.type = 'peaking';
    nodes.resonance.frequency.value = cabinet.resonanceFreq;
    nodes.resonance.Q.value = cabinet.resonanceQ;
    nodes.resonance.gain.value = cabinet.bassBoost * pos.bassMult;
    
    // Configure cabinet lowpass
    nodes.cabLowpass.type = 'lowpass';
    nodes.cabLowpass.frequency.value = cabinet.lowpassFreq;
    nodes.cabLowpass.Q.value = cabinet.lowpassQ;
    
    // Configure mic highpass
    nodes.micHighpass.type = 'highpass';
    nodes.micHighpass.frequency.value = mic.highpass;
    nodes.micHighpass.Q.value = 0.707;
    
    // Configure mic lowpass
    nodes.micLowpass.type = 'lowpass';
    nodes.micLowpass.frequency.value = mic.lowpass;
    nodes.micLowpass.Q.value = 0.707;
    
    // Configure mic presence
    nodes.micPresence.type = 'peaking';
    nodes.micPresence.frequency.value = mic.presenceFreq;
    nodes.micPresence.Q.value = mic.presenceQ;
    nodes.micPresence.gain.value = mic.presenceBoost * pos.presenceMult * cabinet.presence;
    
    // Configure proximity effect
    nodes.proximity.type = 'lowshelf';
    nodes.proximity.frequency.value = mic.proximityFreq;
    nodes.proximity.gain.value = mic.proximityBoost * pos.distanceMult;
    
    // Configure air absorption (simulates distance)
    nodes.airAbsorption.type = 'highshelf';
    nodes.airAbsorption.frequency.value = 4000;
    nodes.airAbsorption.gain.value = -2 * pos.distanceMult;
    
    // Connect the chain
    nodes.input.connect(nodes.resonance);
    nodes.resonance.connect(nodes.cabLowpass);
    nodes.cabLowpass.connect(nodes.micHighpass);
    nodes.micHighpass.connect(nodes.proximity);
    nodes.proximity.connect(nodes.micPresence);
    nodes.micPresence.connect(nodes.micLowpass);
    nodes.micLowpass.connect(nodes.airAbsorption);
    nodes.airAbsorption.connect(nodes.output);
    
    return nodes;
  }
  
  // Get list of all cabinets
  getCabinets() {
    return Object.keys(this.cabinets).map(key => ({
      id: key,
      ...this.cabinets[key]
    }));
  }
  
  // Get list of all microphones
  getMicrophones() {
    return Object.keys(this.microphones).map(key => ({
      id: key,
      ...this.microphones[key]
    }));
  }
  
  // Get list of all positions
  getPositions() {
    return Object.keys(this.positions).map(key => ({
      id: key,
      ...this.positions[key]
    }));
  }
}

export default CabinetSimulator;

