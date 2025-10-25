import BaseEffect from './BaseEffect';

class FlangerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Flanger', 'flanger');
    
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.delay = audioContext.createDelay(1.0);
    this.feedback = audioContext.createGain();
    
    // Setup
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.25;
    this.lfoGain.gain.value = 0.002;
    this.delay.delayTime.value = 0.003;
    this.feedback.gain.value = 0.5;
    
    // Connect LFO
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    
    // Connect audio chain
    this.input.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.lfo.start();
    this.setMix(0.5);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'rate':
        this.lfo.frequency.value = value / 40;
        break;
      case 'depth':
        this.lfoGain.gain.value = value / 5000;
        break;
      case 'feedback':
        this.feedback.gain.value = value / 100;
        break;
      case 'mix':
        this.setMix(value / 100);
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
    this.delay.disconnect();
    this.feedback.disconnect();
  }
}

export default FlangerEffect;

