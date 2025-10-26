import BaseEffect from './BaseEffect.js';

class SignalSplitterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Signal Splitter', 'splitter');
    
    // SIGNAL SPLITTER (Y-cable/parallel routing)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Multiple output paths
    this.output1 = audioContext.createGain();
    this.output2 = audioContext.createGain();
    this.output3 = audioContext.createGain();
    
    // Routing - split signal to multiple paths
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.output1);
    this.inputGain.connect(this.output2);
    this.inputGain.connect(this.output3);
    
    // Mix outputs
    this.output1.connect(this.outputGain);
    this.output2.connect(this.outputGain);
    this.output3.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // All outputs active by default
    this.output1.gain.value = 1.0;
    this.output2.gain.value = 1.0;
    this.output3.gain.value = 1.0;
    
    this.params = { output1: 100, output2: 100, output3: 100, phase: 0 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'output1':
        this.output1.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'output2':
        this.output2.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'output3':
        this.output3.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'phase':
        // Phase inversion on output 2
        if (value > 50) {
          this.output2.gain.setTargetAtTime(-(this.params.output2 / 100), now, 0.01);
        } else {
          this.output2.gain.setTargetAtTime(this.params.output2 / 100, now, 0.01);
        }
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.output1.disconnect();
    this.output2.disconnect();
    this.output3.disconnect();
    this.outputGain.disconnect();
  }
}

export default SignalSplitterEffect;

