import BaseEffect from './BaseEffect.js';

class AnalogFlangerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Analog Flanger', 'analogflanger');
    
    // ANALOG FLANGER (BBD-style jet flanger)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Short delay for flanger (0-10ms)
    this.delay = audioContext.createDelay(0.02);
    this.delay.delayTime.value = 0.003; // 3ms base
    
    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.2;
    
    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 0.003; // 3ms modulation
    
    // Feedback (key to flanger sound)
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.7;
    
    // BBD filter
    this.bbdFilter = audioContext.createBiquadFilter();
    this.bbdFilter.type = 'lowpass';
    this.bbdFilter.frequency.value = 6000;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    this.inputGain.connect(this.delay);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    
    // Feedback loop
    this.delay.connect(this.feedback);
    this.feedback.connect(this.bbdFilter);
    this.bbdFilter.connect(this.delay);
    
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.lfo.start();
    
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 1.0;
    
    this.params = { rate: 20, depth: 50, feedback: 70, mix: 50 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        this.lfo.frequency.setTargetAtTime(0.05 + (value / 100) * 4.95, now, 0.01);
        break;
      case 'depth':
        this.lfoGain.gain.setTargetAtTime((value / 100) * 0.008, now, 0.01);
        break;
      case 'feedback':
        this.feedback.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mix':
        this.wetGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.lfo.stop();
    this.inputGain.disconnect();
    this.delay.disconnect();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.feedback.disconnect();
    this.bbdFilter.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default AnalogFlangerEffect;

