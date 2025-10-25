import BaseEffect from './BaseEffect';

class VibratoEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vibrato', 'vibrato');
    
    this.delay = audioContext.createDelay();
    this.delay.delayTime.value = 0.005;
    
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 5;
    this.lfoGain.gain.value = 0.002;
    
    // Connect LFO
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    
    // Connect audio
    this.input.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal (vibrato is usually 100% wet)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0;
    
    this.lfo.start();
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'rate':
        this.lfo.frequency.value = 0.5 + (value / 100) * 14.5;
        break;
      case 'depth':
        this.lfoGain.gain.value = 0.0001 + (value / 100) * 0.005;
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.delay.disconnect();
    super.disconnect();
  }
}

export default VibratoEffect;

