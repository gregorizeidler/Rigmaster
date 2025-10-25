import BaseEffect from './BaseEffect';

class RoomReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Room Reverb', 'roomreverb');
    
    // SMALL ROOM REVERB - Intimate, quick decay, natural
    // Very short delays for small space
    
    this.combDelayTimes = [
      0.0153, 0.0171, 0.0193, 0.0211,  // Short delays
      0.0029, 0.0019, 0.0013, 0.0011
    ];
    
    this.allpassDelayTimes = [0.0029, 0.0037, 0.0041, 0.0047];
    
    // Create comb filters
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.70; // Short decay
      combGain.gain.value = 0.15;
      
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
    this.reverbGain.gain.value = 0.35; // Subtle for room
    
    // More damping for room (furniture/walls absorb HF)
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 4500; // Warmer, more damped
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

export default RoomReverbEffect;

