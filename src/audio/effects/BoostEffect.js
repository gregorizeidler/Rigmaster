import BaseEffect from './BaseEffect';

class BoostEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Clean Boost', 'boost');
    
    // TRANSPARENT CLEAN BOOST
    // Increases signal level without adding distortion
    // Subtle EQ shaping for clarity
    
    // Input buffer
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;
    
    // Subtle highpass (clean up subsonic rumble)
    this.highpass = audioContext.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 20;
    this.highpass.Q.value = 0.707;
    
    // Low shelf (gentle bass control)
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 150;
    this.lowShelf.gain.value = 0; // Neutral by default
    
    // Presence peak (add clarity without harshness)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 2400;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = 2; // Subtle +2dB presence
    
    // Smooth highshelf (air and sparkle)
    this.airBoost = audioContext.createBiquadFilter();
    this.airBoost.type = 'highshelf';
    this.airBoost.frequency.value = 8000;
    this.airBoost.gain.value = 1; // Subtle +1dB air
    
    // Main boost gain (clean, transparent)
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 2.0; // +6dB boost
    
    // Output level
    this.outputLevel = audioContext.createGain();
    this.outputLevel.gain.value = 1.0;
    
    // Soft limiter (prevent clipping on extreme boost)
    this.limiter = audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.1;
    
    // ROUTING: Clean and transparent signal path
    // input -> inputBuffer -> highpass -> lowShelf -> presence 
    // -> airBoost -> boostGain -> limiter -> outputLevel -> wetGain -> output
    this.input.connect(this.inputBuffer);
    this.inputBuffer.connect(this.highpass);
    this.highpass.connect(this.lowShelf);
    this.lowShelf.connect(this.presence);
    this.presence.connect(this.airBoost);
    this.airBoost.connect(this.boostGain);
    this.boostGain.connect(this.limiter);
    this.limiter.connect(this.outputLevel);
    this.outputLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'boost':
        // 0-100 -> 1x to 4x (0dB to +12dB)
        const gain = 1 + (value / 100) * 3;
        this.boostGain.gain.setTargetAtTime(gain, now, 0.01);
        break;
      case 'tone':
        // Control low shelf (bass boost/cut)
        const bassGain = -3 + (value / 100) * 6; // -3dB to +3dB
        this.lowShelf.gain.setTargetAtTime(bassGain, now, 0.01);
        // Adjust presence inversely (balance)
        const presenceGain = 4 - (value / 100) * 2; // +4dB to +2dB
        this.presence.gain.setTargetAtTime(presenceGain, now, 0.01);
        break;
      case 'volume':
        // Output level control
        const volume = value / 100;
        this.outputLevel.gain.setTargetAtTime(volume, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputBuffer.disconnect();
    this.highpass.disconnect();
    this.lowShelf.disconnect();
    this.presence.disconnect();
    this.airBoost.disconnect();
    this.boostGain.disconnect();
    this.limiter.disconnect();
    this.outputLevel.disconnect();
  }
}

export default BoostEffect;

