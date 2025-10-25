import BaseEffect from './BaseEffect';

class PlateReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Plate Reverb', 'platereverb');
    
    // PLATE REVERB - Bright, dense, metallic character
    // Shorter delays, more high-frequency content
    
    this.combDelayTimes = [
      0.0253, 0.0289, 0.0313, 0.0347,  // Medium delays
      0.0043, 0.0029, 0.0023, 0.0019
    ];
    
    this.allpassDelayTimes = [0.0043, 0.0061, 0.0071, 0.0083];
    
    // Create comb filters
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.15);
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.86; // Medium feedback
      combGain.gain.value = 0.13;
      
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
    this.reverbGain.gain.value = 0.45;
    
    // Less damping for bright plate character
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 9000; // Very bright
    this.dampingFilter.Q.value = 0.707;
    
    // High shelf boost for plate character
    this.plateShine = audioContext.createBiquadFilter();
    this.plateShine.type = 'highshelf';
    this.plateShine.frequency.value = 4000;
    this.plateShine.gain.value = 3; // Bright plate shimmer
    
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
    
    // Add plate shine
    allpassInput.connect(this.plateShine);
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
      this.combGains[i].disconnect();
    }
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].delay.disconnect();
      this.allpassFilters[i].feedforward.disconnect();
      this.allpassFilters[i].feedback.disconnect();
    }
    this.combMixer.disconnect();
    this.dampingFilter.disconnect();
    this.plateShine.disconnect();
    this.reverbGain.disconnect();
  }
}

export default PlateReverbEffect;

