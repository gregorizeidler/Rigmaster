import BaseEffect from './BaseEffect';

class HallReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Hall Reverb', 'hallreverb');
    
    // LARGE HALL REVERB - Spacious, long decay
    // Longer delay times for hall acoustics
    
    this.combDelayTimes = [
      0.0437, 0.0527, 0.0617, 0.0697,
      0.0371, 0.0411, 0.0457, 0.0491
    ];
    
    this.allpassDelayTimes = [0.0089, 0.0113, 0.0137, 0.0151];
    
    // Create comb filters (each with its own damping filter)
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 7000; // Less damping for hall
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.88; // Higher feedback for long decay
      combGain.gain.value = 0.125;
      
      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combGain);
    }
    
    // Create allpass filters (correct Schroeder structure)
    this.allpassFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const delay = audioContext.createDelay(0.1);
      const fbGain = audioContext.createGain();
      const ffGain = audioContext.createGain();
      
      delay.delayTime.value = this.allpassDelayTimes[i];
      fbGain.gain.value = 0.7;
      ffGain.gain.value = -0.7;
      
      // Feed-forward path: input → ffGain → output
      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      // Delay path: input → delay → output
      apInput.connect(delay);
      delay.connect(apOutput);
      // Feedback: delay → fbGain → input
      delay.connect(fbGain);
      fbGain.connect(apInput);
      
      this.allpassFilters.push({ input: apInput, output: apOutput, delay, fbGain, ffGain });
    }
    
    this.combMixer = audioContext.createGain();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.5;
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Connect comb filters in parallel (each with isolated feedback loop)
    for (let i = 0; i < 8; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.input.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Connect allpass filters in series
    this.combMixer.connect(this.allpassFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].output.connect(this.allpassFilters[i + 1].input);
    }
    
    // Final output through DC blocker
    this.allpassFilters[3].output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbGain);
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
      this.combFilters[i].damping.disconnect();
      this.combGains[i].disconnect();
    }
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].input.disconnect();
      this.allpassFilters[i].output.disconnect();
      this.allpassFilters[i].delay.disconnect();
      this.allpassFilters[i].fbGain.disconnect();
      this.allpassFilters[i].ffGain.disconnect();
    }
    this.combMixer.disconnect();
    this.dcBlocker.disconnect();
    this.reverbGain.disconnect();
  }
}

export default HallReverbEffect;
