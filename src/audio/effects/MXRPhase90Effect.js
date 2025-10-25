import BaseEffect from './BaseEffect';

class MXRPhase90Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR Phase 90', 'mxrphase90');
    
    // MXR PHASE 90 (1974)
    // Classic 4-stage phaser
    // Used by Eddie Van Halen, Jimmy Page
    
    // 4 allpass filters (phase shifters)
    this.allpass = [];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 500 + (i * 300);
      filter.Q.value = 0.8;
      this.allpass.push(filter);
    }
    
    // LFO for modulation
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.type = 'triangle'; // Phase 90 uses triangle wave
    this.lfo.frequency.value = 0.5; // Classic slow sweep
    this.lfoGain.gain.value = 800;
    this.lfo.start();
    
    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5; // Moderate feedback
    
    // Mix
    this.phaseGain = audioContext.createGain();
    this.phaseGain.gain.value = 0.7;
    
    // Chain allpass filters
    this.input.connect(this.allpass[0]);
    for (let i = 0; i < 3; i++) {
      this.allpass[i].connect(this.allpass[i + 1]);
    }
    
    // Feedback loop
    this.allpass[3].connect(this.feedbackGain);
    this.feedbackGain.connect(this.allpass[0]);
    
    // Output
    this.allpass[3].connect(this.phaseGain);
    this.phaseGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // LFO modulation
    this.lfo.connect(this.lfoGain);
    for (let i = 0; i < 4; i++) {
      this.lfoGain.connect(this.allpass[i].frequency);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'speed':
        // Classic Phase 90 speed range
        this.lfo.frequency.setTargetAtTime(0.1 + (value / 100) * 8, now, 0.01);
        break;
      case 'depth':
        this.lfoGain.gain.setTargetAtTime(value * 10, now, 0.01);
        break;
      case 'feedback':
        this.feedbackGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mix':
        this.updateMix(value);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.allpass.forEach(f => f.disconnect());
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoGain.disconnect();
      this.feedbackGain.disconnect();
      this.phaseGain.disconnect();
    } catch (e) {}
  }
}

export default MXRPhase90Effect;

