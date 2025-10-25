import BaseEffect from './BaseEffect';

class HallReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Hall Reverb', 'hallreverb');
    
    // LARGE HALL REVERB - Spacious, long decay
    // Optimized delay times for hall acoustics
    
    this.combDelayTimes = [
      0.0437, 0.0527, 0.0617, 0.0697,  // Longer delays for hall
      0.0089, 0.0067, 0.0053, 0.0041
    ];
    
    this.allpassDelayTimes = [0.0089, 0.0113, 0.0137, 0.0151];
    
    // Create comb filters
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.88; // Higher feedback for long decay
      combGain.gain.value = 0.125;
      
      this.combFilters.push({ delay, feedback });
      this.combGains.push(combGain);
    }
    
    // Create allpass filters
    this.allpassFilters = [];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedforward = audioContext.createGain();
      const feedback = audioContext.createGain();
      
      delay.delayTime.value = this.allpassDelayTimes[i];
      feedforward.gain.value = 0.7;
      feedback.gain.value = -0.7;
      
      this.allpassFilters.push({ delay, feedforward, feedback });
    }
    
    this.combMixer = audioContext.createGain();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.5;
    
    // Damping filter (hall has less HF absorption)
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 7000; // Less damping for hall
    this.dampingFilter.Q.value = 0.707;
    
    // Connect comb filters
    for (let i = 0; i < 8; i++) {
      const { delay, feedback } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.input.connect(delay);
      delay.connect(feedback);
      feedback.connect(this.dampingFilter);
      this.dampingFilter.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Connect allpass filters
    let allpassInput = this.combMixer;
    for (let i = 0; i < 4; i++) {
      const { delay, feedforward, feedback } = this.allpassFilters[i];
      const sumNode = audioContext.createGain();
      
      allpassInput.connect(delay);
      allpassInput.connect(feedforward);
      delay.connect(feedback);
      feedforward.connect(sumNode);
      feedback.connect(sumNode);
      delay.connect(sumNode);
      
      allpassInput = sumNode;
    }
    
    allpassInput.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'size':
        const scale = 0.7 + (value / 100) * 1.3; // 0.7x to 2x
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].delay.delayTime.setTargetAtTime(
            this.combDelayTimes[i] * scale,
            now,
            0.01
          );
        }
        break;
      case 'decay':
        const feedback = 0.8 + (value / 100) * 0.15; // 0.8 to 0.95
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].feedback.gain.setTargetAtTime(feedback, now, 0.01);
        }
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    for (let i = 0; i < 8; i++) {
      this.combFilters[i].delay.disconnect();
      this.combFilters[i].feedback.disconnect();
      this.combGains[i].disconnect();
    }
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].delay.disconnect();
      this.allpassFilters[i].feedforward.disconnect();
      this.allpassFilters[i].feedback.disconnect();
    }
    this.combMixer.disconnect();
    this.dampingFilter.disconnect();
    this.reverbGain.disconnect();
  }
}

export default HallReverbEffect;

