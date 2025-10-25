import BaseEffect from './BaseEffect';

class WahEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Wah-Wah', 'wah');

    // Create filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 10;
    this.filter.frequency.value = 500;

    // LFO for auto-wah
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.frequency.value = 0.5;
    this.lfoGain.gain.value = 0;

    // Connect: input -> filter -> wetGain -> output
    this.input.connect(this.filter);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // LFO routing (for auto mode)
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Params
    this.minFreq = 300;
    this.maxFreq = 3000;
    this.manualPosition = 0.5;
    this.autoMode = false;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'position':
        this.manualPosition = value / 100;
        if (!this.autoMode) {
          const freq = this.minFreq + (this.maxFreq - this.minFreq) * this.manualPosition;
          this.filter.frequency.cancelScheduledValues(now);
          this.filter.frequency.setTargetAtTime(freq, now, 0.01);
        }
        break;
      case 'resonance':
        this.filter.Q.value = 5 + (value / 100) * 15; // 5 to 20
        break;
      case 'auto':
        this.autoMode = value > 50;
        if (this.autoMode) {
          this.lfoGain.gain.setTargetAtTime((this.maxFreq - this.minFreq) * 0.3, now, 0.1);
        } else {
          this.lfoGain.gain.setTargetAtTime(0, now, 0.1);
          const freq = this.minFreq + (this.maxFreq - this.minFreq) * this.manualPosition;
          this.filter.frequency.setTargetAtTime(freq, now, 0.1);
        }
        break;
      case 'speed':
        this.lfo.frequency.setValueAtTime(0.1 + (value / 100) * 5, now); // 0.1Hz to 5Hz
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.filter.disconnect();
    super.disconnect();
  }
}

export default WahEffect;

