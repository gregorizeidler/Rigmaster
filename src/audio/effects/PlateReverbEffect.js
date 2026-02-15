import BaseEffect from './BaseEffect';

class PlateReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Plate Reverb', 'platereverb');
    
    // PLATE REVERB - Bright, dense, metallic character
    // Medium delays, more high-frequency content
    
    this.combDelayTimes = [
      0.0253, 0.0289, 0.0313, 0.0347,
      0.0219, 0.0233, 0.0247, 0.0263
    ];
    
    this.allpassDelayTimes = [0.0043, 0.0061, 0.0071, 0.0083];
    
    // Create comb filters (each with its own damping filter)
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.15);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 9000; // Very bright for plate
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.86; // Medium feedback
      combGain.gain.value = 0.13;
      
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
    this.reverbGain.gain.value = 0.45;
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // High shelf boost for plate character
    this.plateShine = audioContext.createBiquadFilter();
    this.plateShine.type = 'highshelf';
    this.plateShine.frequency.value = 4000;
    this.plateShine.gain.value = 3; // Bright plate shimmer
    
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
    
    // Add plate shine and DC blocker
    this.allpassFilters[3].output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.plateShine);
    this.plateShine.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'size':
        const scale = 0.6 + (value / 100) * 1.4; // 0.6x to 2x
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].delay.delayTime.setTargetAtTime(
            this.combDelayTimes[i] * scale,
            now,
            0.01
          );
        }
        break;
      case 'decay':
        const feedback = 0.75 + (value / 100) * 0.2; // 0.75 to 0.95
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
    this.plateShine.disconnect();
    this.reverbGain.disconnect();
  }
}

export default PlateReverbEffect;
