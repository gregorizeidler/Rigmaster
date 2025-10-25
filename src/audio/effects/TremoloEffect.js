import BaseEffect from './BaseEffect';

class TremoloEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tremolo', 'tremolo');
    
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.vca = audioContext.createGain();
    
    // Setup LFO
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 4;
    this.lfoGain.gain.value = 0.3;
    
    // Setup VCA
    this.vca.gain.value = 0.7;
    
    // Connect LFO to VCA
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.vca.gain);
    
    // Connect audio chain
    this.input.connect(this.vca);
    this.vca.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.lfo.start();
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'speed':
        this.lfo.frequency.value = value / 10;
        break;
      case 'depth':
        this.lfoGain.gain.value = value / 150;
        break;
      case 'wave':
        const shapes = ['sine', 'square', 'triangle', 'sawtooth'];
        this.lfo.type = shapes[Math.floor(value / 25)] || 'sine';
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.vca.disconnect();
  }
}

export default TremoloEffect;

