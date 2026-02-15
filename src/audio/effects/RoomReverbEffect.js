import BaseEffect from './BaseEffect';

class RoomReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Room Reverb', 'roomreverb');
    
    // SMALL ROOM REVERB - Intimate, quick decay, natural
    // Shorter delay times for small space
    
    this.combDelayTimes = [
      0.0153, 0.0171, 0.0193, 0.0211,
      0.0131, 0.0139, 0.0149, 0.0161
    ];
    
    this.allpassDelayTimes = [0.0029, 0.0037, 0.0041, 0.0047];
    
    // Create comb filters (each with its own damping filter)
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 4500; // Warmer, more damped for room
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.70; // Short decay
      combGain.gain.value = 0.15;
      
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
    this.reverbGain.gain.value = 0.35; // Subtle for room
    
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
        const feedback = 0.6 + (value / 100) * 0.25; // 0.6 to 0.85
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

export default RoomReverbEffect;
