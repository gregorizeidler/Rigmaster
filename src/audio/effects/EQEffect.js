import BaseEffect from './BaseEffect';

class EQEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EQ', 'eq');
    
    // 3-band parametric EQ
    this.lowShelf = audioContext.createBiquadFilter();
    this.midPeak = audioContext.createBiquadFilter();
    this.highShelf = audioContext.createBiquadFilter();
    
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 200;
    this.lowShelf.gain.value = 0;
    
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1000;
    this.midPeak.Q.value = 1;
    this.midPeak.gain.value = 0;
    
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3000;
    this.highShelf.gain.value = 0;
    
    // Connect chain
    this.input.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0;
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'low':
        this.lowShelf.gain.value = (value - 50) / 2.5;
        break;
      case 'mid':
        this.midPeak.gain.value = (value - 50) / 2.5;
        break;
      case 'high':
        this.highShelf.gain.value = (value - 50) / 2.5;
        break;
      case 'midfreq':
        this.midPeak.frequency.value = 200 + (value * 40);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.lowShelf.disconnect();
    this.midPeak.disconnect();
    this.highShelf.disconnect();
  }
}

export default EQEffect;

