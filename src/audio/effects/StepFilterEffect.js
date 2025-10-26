import BaseEffect from './BaseEffect.js';

class StepFilterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Step Filter', 'stepfilter');
    
    // STEP FILTER (Step sequencer controlled filter)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 10;
    
    // Step sequencer
    this.steps = [500, 1000, 2000, 4000, 3000, 1500, 800, 600];
    this.currentStep = 0;
    this.stepInterval = null;
    this.bpm = 120;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.filter);
    this.filter.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.startSequence();
    
    this.params = { rate: 120, depth: 50, resonance: 50, steps: 8 };
  }
  
  startSequence() {
    if (this.stepInterval) clearInterval(this.stepInterval);
    
    const stepTime = (60 / this.bpm) * 1000 / 4; // 16th notes
    this.stepInterval = setInterval(() => {
      this.currentStep = (this.currentStep + 1) % this.steps.length;
      const freq = this.steps[this.currentStep];
      this.filter.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.001);
    }, stepTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        this.bpm = 40 + (value / 100) * 240; // 40-280 BPM
        this.startSequence();
        break;
      case 'depth':
        // Adjust step frequency range
        const baseFreq = 200;
        const range = (value / 100) * 8000;
        for (let i = 0; i < this.steps.length; i++) {
          this.steps[i] = baseFreq + (range * (i / this.steps.length));
        }
        break;
      case 'resonance':
        this.filter.Q.setTargetAtTime(1 + (value / 100) * 19, now, 0.01);
        break;
      case 'steps':
        this.steps.length = Math.floor(4 + (value / 100) * 12); // 4-16 steps
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    if (this.stepInterval) clearInterval(this.stepInterval);
    this.inputGain.disconnect();
    this.filter.disconnect();
    this.outputGain.disconnect();
  }
}

export default StepFilterEffect;

