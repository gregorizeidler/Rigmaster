import BaseEffect from './BaseEffect.js';

class StepSlicerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Step Slicer', 'stepslicer');
    
    // STEP SLICER (Rhythmic gate with step sequencer)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.gate = audioContext.createGain();
    
    // Step pattern (1=on, 0=off)
    this.pattern = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0];
    this.currentStep = 0;
    this.stepInterval = null;
    this.bpm = 120;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.gate);
    this.gate.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.startSequence();
    
    this.params = { rate: 120, depth: 100, pattern: 0, attack: 5, release: 5 };
  }
  
  startSequence() {
    if (this.stepInterval) clearInterval(this.stepInterval);
    
    const stepTime = (60 / this.bpm) * 1000 / 4; // 16th notes
    this.stepInterval = setInterval(() => {
      this.currentStep = (this.currentStep + 1) % this.pattern.length;
      const gateValue = this.pattern[this.currentStep];
      const now = this.audioContext.currentTime;
      
      if (gateValue === 1) {
        this.gate.gain.setTargetAtTime(1, now, 0.005); // Fast attack
      } else {
        this.gate.gain.setTargetAtTime(0, now, 0.005); // Fast release
      }
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
        // Gate depth (0-100%)
        break;
      case 'pattern':
        // Preset patterns
        const patterns = [
          [1, 0, 1, 0, 1, 0, 1, 0],
          [1, 1, 0, 0, 1, 1, 0, 0],
          [1, 0, 0, 1, 0, 0, 1, 0],
          [1, 1, 1, 0, 1, 0, 1, 0]
        ];
        this.pattern = patterns[Math.floor(value / 25)] || patterns[0];
        break;
      case 'attack':
        // Attack time (ms)
        break;
      case 'release':
        // Release time (ms)
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    if (this.stepInterval) clearInterval(this.stepInterval);
    this.inputGain.disconnect();
    this.gate.disconnect();
    this.outputGain.disconnect();
  }
}

export default StepSlicerEffect;

