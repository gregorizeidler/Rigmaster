import BaseEffect from './BaseEffect';

class ReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Reverb', 'reverb');
    
    // Freeverb algorithm (Schroeder reverberator)
    // Uses 8 parallel comb filters + 4 series allpass filters
    
    // Comb filter delays (Freeverb tunings, all in proper 25-44ms range)
    this.combDelayTimes = [
      0.0297, 0.0371, 0.0411, 0.0437,
      0.0253, 0.0269, 0.0290, 0.0307
    ];
    
    // Allpass filter delays
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    
    // Create comb filters (each with its own damping filter to avoid cross-coupling)
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 5000;
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.84; // Decay factor
      combGain.gain.value = 0.15; // Mix factor
      
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
      ffGain.gain.value = -0.7; // Negative of feedback gain
      
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
    
    // Create mixer nodes
    this.combMixer = audioContext.createGain();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.4;
    
    // DC blocker (highpass at 10Hz to prevent DC accumulation in feedback loops)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Connect comb filters in parallel (each with isolated feedback loop)
    for (let i = 0; i < 8; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      // Input → delay
      this.input.connect(delay);
      // Feedback loop: delay → per-comb damping → feedback gain → delay
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      // Output: delay → combGain → mixer
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
        // Control high frequency damping on all comb filters
        const cutoff = 2000 + (value / 100) * 8000; // 2kHz to 10kHz
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].damping.frequency.setTargetAtTime(cutoff, now, 0.01);
        }
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
      this.combFilters[i].damping.disconnect();
      this.combGains[i].disconnect();
    }
    
    // Disconnect all allpass filters
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

export default ReverbEffect;
