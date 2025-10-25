import BaseEffect from './BaseEffect';

class AutoPanEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Auto Pan', 'autopan');
    
    // AUTO PAN - Stereo panning with LFO modulation
    
    // Stereo panner
    this.panner = audioContext.createStereoPanner();
    this.panner.pan.value = 0; // Center
    
    // LFO for modulation
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine'; // Default sine wave
    this.lfo.frequency.value = 2; // 2 Hz default
    
    // LFO gain (controls depth)
    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 0.7; // 70% depth (±0.7 pan)
    
    // Connect LFO to panner
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.panner.pan);
    
    // Start LFO
    this.lfo.start();
    
    // Input/Output
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // ROUTING: input -> inputGain -> panner -> wetGain -> output
    // LFO modulates panner.pan
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.panner);
    this.panner.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'rate':
        // 0.1 Hz to 10 Hz
        const rate = 0.1 + (value / 100) * 9.9;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        break;
      case 'depth':
        // 0% to 100% pan depth
        const depth = (value / 100) * 1.0; // ±1.0 pan
        this.lfoGain.gain.setTargetAtTime(depth, now, 0.01);
        break;
      case 'wave':
        // 0=sine, 1=triangle, 2=square, 3=sawtooth
        const waveTypes = ['sine', 'triangle', 'square', 'sawtooth'];
        const waveIndex = Math.floor(value / 25); // 0-3
        if (waveIndex >= 0 && waveIndex < 4) {
          this.lfo.type = waveTypes[waveIndex];
        }
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.inputGain.disconnect();
    this.panner.disconnect();
  }
}

export default AutoPanEffect;

