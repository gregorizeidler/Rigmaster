import BaseEffect from './BaseEffect';

class SpringReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Spring Reverb', 'springreverb');
    
    // Multiple delays to simulate spring reflections
    this.delays = [];
    this.gains = [];
    
    const delayTimes = [0.025, 0.027, 0.031, 0.033, 0.037, 0.041];
    
    for (let i = 0; i < delayTimes.length; i++) {
      const delay = audioContext.createDelay();
      const gain = audioContext.createGain();
      
      delay.delayTime.value = delayTimes[i];
      gain.gain.value = 0.7 / (i + 1);
      
      this.delays.push(delay);
      this.gains.push(gain);
    }
    
    // Spring character filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1500;
    this.filter.Q.value = 2;
    
    // "Boing" effect - add some metallic resonance
    this.resonance = audioContext.createBiquadFilter();
    this.resonance.type = 'peaking';
    this.resonance.frequency.value = 800;
    this.resonance.Q.value = 8;
    this.resonance.gain.value = 6;
    
    // Mix all delays
    const mixer = audioContext.createGain();
    
    // Connect delays
    this.delays.forEach((delay, i) => {
      this.input.connect(delay);
      delay.connect(this.gains[i]);
      this.gains[i].connect(mixer);
    });
    
    // Add spring character
    mixer.connect(this.filter);
    this.filter.connect(this.resonance);
    this.resonance.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.setMix(0.3);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'decay':
        this.gains.forEach((gain, i) => {
          gain.gain.value = (value / 100) * 0.8 / (i + 1);
        });
        break;
      case 'tone':
        this.filter.frequency.value = 500 + (value / 100) * 3000;
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.delays.forEach(d => d.disconnect());
    this.gains.forEach(g => g.disconnect());
    this.filter.disconnect();
    this.resonance.disconnect();
    super.disconnect();
  }
}

export default SpringReverbEffect;

