import BaseEffect from './BaseEffect.js';

class LFOFilterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'LFO Filter', 'lfofilter');
    
    // LFO FILTER (Auto filter with LFO modulation)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Swept filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 5;
    this.filter.frequency.value = 1000;
    
    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;
    
    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 2000; // Frequency sweep range
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.filter);
    this.filter.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    
    this.lfo.start();
    
    this.params = { rate: 50, depth: 50, resonance: 50, type: 0 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        this.lfo.frequency.setTargetAtTime(0.1 + (value / 100) * 9.9, now, 0.01);
        break;
      case 'depth':
        this.lfoGain.gain.setTargetAtTime((value / 100) * 5000, now, 0.01);
        break;
      case 'resonance':
        this.filter.Q.setTargetAtTime(0.5 + (value / 100) * 19.5, now, 0.01);
        break;
      case 'type':
        const types = ['lowpass', 'highpass', 'bandpass', 'notch'];
        this.filter.type = types[Math.floor(value / 25)];
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.lfo.stop();
    this.inputGain.disconnect();
    this.filter.disconnect();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default LFOFilterEffect;

