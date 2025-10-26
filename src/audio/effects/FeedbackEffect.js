import BaseEffect from './BaseEffect.js';

class FeedbackEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Feedback', 'feedback');
    
    // FEEDBACK (Controlled feedback generator)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.feedbackGain = audioContext.createGain();
    
    // Delay for feedback loop
    this.delay = audioContext.createDelay(1.0);
    this.delay.delayTime.value = 0.1;
    
    // Filter to shape feedback
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 10;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Feedback loop
    this.inputGain.connect(this.delay);
    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.filter);
    this.filter.connect(this.delay);
    this.filter.connect(this.outputGain);
    
    this.feedbackGain.gain.value = 0;
    
    this.params = { amount: 0, frequency: 50, resonance: 50, delay: 10 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'amount':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'frequency':
        this.filter.frequency.setTargetAtTime(200 + (value / 100) * 8000, now, 0.01);
        break;
      case 'resonance':
        this.filter.Q.setTargetAtTime(1 + (value / 100) * 29, now, 0.01);
        break;
      case 'delay':
        this.delay.delayTime.setTargetAtTime((value / 100) * 0.5, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.delay.disconnect();
    this.feedbackGain.disconnect();
    this.filter.disconnect();
    this.outputGain.disconnect();
  }
}

export default FeedbackEffect;

