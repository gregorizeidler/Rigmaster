import BaseEffect from './BaseEffect.js';

class ABToggleEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'A/B Toggle', 'abtoggle');
    
    // A/B TOGGLE (Signal switcher between two outputs)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Two output paths
    this.outputA = audioContext.createGain();
    this.outputB = audioContext.createGain();
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.outputA);
    this.inputGain.connect(this.outputB);
    this.outputA.connect(this.outputGain);
    this.outputB.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Default: A active, B muted
    this.outputA.gain.value = 1.0;
    this.outputB.gain.value = 0.0;
    this.currentOutput = 'A';
    
    this.params = { output: 0, mode: 0 };
  }
  
  toggle() {
    const now = this.audioContext.currentTime;
    
    if (this.currentOutput === 'A') {
      // Switch to B
      this.outputA.gain.setTargetAtTime(0, now, 0.001);
      this.outputB.gain.setTargetAtTime(1, now, 0.001);
      this.currentOutput = 'B';
    } else {
      // Switch to A
      this.outputA.gain.setTargetAtTime(1, now, 0.001);
      this.outputB.gain.setTargetAtTime(0, now, 0.001);
      this.currentOutput = 'A';
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'output':
        if (value < 50) {
          // Output A
          this.outputA.gain.setTargetAtTime(1, now, 0.001);
          this.outputB.gain.setTargetAtTime(0, now, 0.001);
          this.currentOutput = 'A';
        } else {
          // Output B
          this.outputA.gain.setTargetAtTime(0, now, 0.001);
          this.outputB.gain.setTargetAtTime(1, now, 0.001);
          this.currentOutput = 'B';
        }
        break;
      case 'mode':
        // 0=toggle, 1=both (Y-cable)
        if (value > 50) {
          this.outputA.gain.setTargetAtTime(1, now, 0.001);
          this.outputB.gain.setTargetAtTime(1, now, 0.001);
        }
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.outputA.disconnect();
    this.outputB.disconnect();
    this.outputGain.disconnect();
  }
}

export default ABToggleEffect;

