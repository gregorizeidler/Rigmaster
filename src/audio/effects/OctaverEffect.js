import BaseEffect from './BaseEffect';

class OctaverEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Octaver', 'octaver');

    // Create nodes for pitch shifting
    this.directGain = audioContext.createGain();
    this.octaveUpGain = audioContext.createGain();
    this.octaveDownGain = audioContext.createGain();
    this.outputMix = audioContext.createGain();

    // Initial mix
    this.directGain.gain.value = 1;
    this.octaveUpGain.gain.value = 0;
    this.octaveDownGain.gain.value = 0;

    // Pitch shift using delay (simple octaver simulation)
    this.upDelay = audioContext.createDelay();
    this.downDelay = audioContext.createDelay();
    this.upDelay.delayTime.value = 0.001; // Very short delay
    this.downDelay.delayTime.value = 0.002;

    // Filters for octave effect simulation
    this.upFilter = audioContext.createBiquadFilter();
    this.upFilter.type = 'highpass';
    this.upFilter.frequency.value = 1000;

    this.downFilter = audioContext.createBiquadFilter();
    this.downFilter.type = 'lowpass';
    this.downFilter.frequency.value = 500;

    // Connect direct
    this.input.connect(this.directGain);
    this.directGain.connect(this.outputMix);

    // Connect octave up
    this.input.connect(this.upDelay);
    this.upDelay.connect(this.upFilter);
    this.upFilter.connect(this.octaveUpGain);
    this.octaveUpGain.connect(this.outputMix);

    // Connect octave down
    this.input.connect(this.downDelay);
    this.downDelay.connect(this.downFilter);
    this.downFilter.connect(this.octaveDownGain);
    this.octaveDownGain.connect(this.outputMix);

    // Output mix -> wetGain -> output
    this.outputMix.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal from BaseEffect
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'dry':
        this.directGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'up':
        this.octaveUpGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'down':
        this.octaveDownGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.directGain.disconnect();
    this.octaveUpGain.disconnect();
    this.octaveDownGain.disconnect();
    this.outputMix.disconnect();
    this.upDelay.disconnect();
    this.downDelay.disconnect();
    this.upFilter.disconnect();
    this.downFilter.disconnect();
    super.disconnect();
  }
}

export default OctaverEffect;

