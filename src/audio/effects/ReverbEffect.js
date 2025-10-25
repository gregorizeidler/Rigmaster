import BaseEffect from './BaseEffect';

class ReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Reverb', 'reverb');
    
    // Freeverb algorithm (Schroeder reverberator)
    // Uses 8 parallel comb filters + 4 series allpass filters
    
    // Comb filter delays (tuned for natural sound)
    this.combDelayTimes = [
      0.0297, 0.0371, 0.0411, 0.0437,
      0.0050, 0.0017, 0.0013, 0.0011
    ];
    
    // Allpass filter delays
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    
    // Create comb filters
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.84; // Decay factor
      combGain.gain.value = 0.15; // Mix factor
      
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
    
    // Create mixer nodes
    this.combMixer = audioContext.createGain();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.4;
    
    // Damping filter (reduces high frequencies over time)
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 5000;
    this.dampingFilter.Q.value = 0.707;
    
    // Connect comb filters in parallel
    for (let i = 0; i < 8; i++) {
      const { delay, feedback } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.input.connect(delay);
      delay.connect(feedback);
      feedback.connect(this.dampingFilter);
      this.dampingFilter.connect(delay); // Feedback loop
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Connect allpass filters in series
    let allpassInput = this.combMixer;
    for (let i = 0; i < 4; i++) {
      const { delay, feedforward, feedback } = this.allpassFilters[i];
      
      // Allpass structure: input -> delay -> output
      //                     input -> feedforward -> output
      //                     delay -> feedback -> input
      const sumNode = audioContext.createGain();
      
      allpassInput.connect(delay);
      allpassInput.connect(feedforward);
      delay.connect(feedback);
      
      feedforward.connect(sumNode);
      feedback.connect(sumNode);
      delay.connect(sumNode);
      
      allpassInput = sumNode;
    }
    
    // Final output
    allpassInput.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'time':
        // Scale room size (delay times)
        const scale = 0.5 + (value / 100) * 1.5; // 0.5x to 2x
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].delay.delayTime.setTargetAtTime(
            this.combDelayTimes[i] * scale,
            now,
            0.01
          );
        }
        break;
      case 'decay':
        // Control feedback (decay time)
        const feedback = 0.7 + (value / 100) * 0.25; // 0.7 to 0.95
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].feedback.gain.setTargetAtTime(feedback, now, 0.01);
        }
        break;
      case 'damping':
        // Control high frequency damping
        const cutoff = 2000 + (value / 100) * 8000; // 2kHz to 10kHz
        this.dampingFilter.frequency.setTargetAtTime(cutoff, now, 0.01);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      case 'level':
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    
    // Disconnect all comb filters
    for (let i = 0; i < 8; i++) {
      this.combFilters[i].delay.disconnect();
      this.combFilters[i].feedback.disconnect();
      this.combGains[i].disconnect();
    }
    
    // Disconnect all allpass filters
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

export default ReverbEffect;

