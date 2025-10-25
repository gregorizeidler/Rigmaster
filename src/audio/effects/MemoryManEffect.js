import BaseEffect from './BaseEffect';

class MemoryManEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Memory Man', 'memoryman');
    
    // ELECTRO-HARMONIX MEMORY MAN (1976)
    // Analog delay with modulation
    // Used by The Edge, David Gilmour
    
    // Delay line
    this.delay = audioContext.createDelay(1.5); // Max 1.5 seconds
    this.delay.delayTime.value = 0.375; // Classic 375ms
    
    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;
    
    // Filter (analog delay darkening)
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 4000;
    this.filter.Q.value = 0.8;
    
    // Modulation (chorus effect on delays)
    this.modLFO = audioContext.createOscillator();
    this.modDepth = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.4;
    this.modDepth.gain.value = 0.003; // 3ms modulation
    this.modLFO.start();
    
    // Mix
    this.wetGainNode = audioContext.createGain();
    this.wetGainNode.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.delay);
    this.delay.connect(this.filter);
    this.filter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay); // Feedback loop
    
    this.filter.connect(this.wetGainNode);
    this.wetGainNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Modulation
    this.modLFO.connect(this.modDepth);
    this.modDepth.connect(this.delay.delayTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'delay':
        this.delay.delayTime.setTargetAtTime(0.05 + (value / 100) * 1.45, now, 0.01);
        break;
      case 'feedback':
        this.feedbackGain.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        break;
      case 'blend':
        this.wetGainNode.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'rate':
        this.modLFO.frequency.setTargetAtTime(0.1 + (value / 100) * 2, now, 0.01);
        break;
      case 'depth':
        this.modDepth.gain.setTargetAtTime(value / 100 * 0.01, now, 0.01);
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
      this.delay.disconnect();
      this.feedbackGain.disconnect();
      this.filter.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepth.disconnect();
      this.wetGainNode.disconnect();
    } catch (e) {}
  }
}

export default MemoryManEffect;

