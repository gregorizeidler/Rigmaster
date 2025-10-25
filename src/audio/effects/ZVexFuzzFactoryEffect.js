import BaseEffect from './BaseEffect';

class ZVexFuzzFactoryEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Z.Vex Fuzz Factory', 'zvexfuzzfactory');
    
    // Z.VEX FUZZ FACTORY (1995)
    // Wild, oscillating fuzz - unpredictable and extreme
    // Used by Jack White, Matt Bellamy
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 5.0; // Very hot input
    
    // Bias filter (gate simulation)
    this.biasFilter = audioContext.createBiquadFilter();
    this.biasFilter.type = 'highpass';
    this.biasFilter.frequency.value = 100;
    this.biasFilter.Q.value = 5.0; // Resonant for instability
    
    // Fuzz clipper (extreme)
    this.fuzzClip = audioContext.createWaveShaper();
    this.fuzzClip.oversample = '4x';
    this.fuzzClip.curve = this.makeFuzzFactoryCurve(50);
    
    // Oscillator (for self-oscillation mode)
    this.oscillator = audioContext.createOscillator();
    this.oscGain = audioContext.createGain();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 100;
    this.oscGain.gain.value = 0; // Off by default
    this.oscillator.start();
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.2;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.biasFilter);
    this.biasFilter.connect(this.fuzzClip);
    this.fuzzClip.connect(this.outputGain);
    
    // Oscillator (for wild modes)
    this.oscillator.connect(this.oscGain);
    this.oscGain.connect(this.outputGain);
    
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeFuzzFactoryCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 10);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Extreme clipping (Fuzz Factory is brutal)
      let y = x * drive;
      
      // Hard clipping
      if (y > 0.5) {
        y = 0.5 + (y - 0.5) * 0.05;
      } else if (y < -0.5) {
        y = -0.5 + (y + 0.5) * 0.05;
      }
      
      // Add harsh harmonics
      y += 0.2 * Math.tanh(x * drive * 5);
      y += 0.15 * Math.tanh(x * drive * 10);
      
      // Instability (random element)
      y += 0.05 * Math.sin(x * 100);
      
      curve[i] = y * 0.7;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'drive':
        this.fuzzClip.curve = this.makeFuzzFactoryCurve(value);
        this.inputGain.gain.setTargetAtTime(3 + (value / 25), now, 0.01);
        break;
      case 'gate':
        // Gate/Bias control
        this.biasFilter.frequency.setTargetAtTime(50 + (value * 5), now, 0.01);
        this.biasFilter.Q.setTargetAtTime(1 + (value / 20), now, 0.01);
        break;
      case 'comp':
        // Compression (output attenuation)
        this.outputGain.gain.setTargetAtTime(0.1 + ((100 - value) / 250), now, 0.01);
        break;
      case 'stab':
        // Stability (oscillator blend)
        this.oscGain.gain.setTargetAtTime((100 - value) / 200, now, 0.01);
        this.oscillator.frequency.setTargetAtTime(50 + value * 3, now, 0.01);
        break;
      case 'mix':
        this.updateMix(value);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.biasFilter.disconnect();
      this.fuzzClip.disconnect();
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscGain.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default ZVexFuzzFactoryEffect;

