import BaseEffect from './BaseEffect';

class BossSD1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss SD-1', 'bosssd1');
    
    // BOSS SD-1 SUPER OVERDRIVE (1981)
    // Asymmetric overdrive - smooth, musical
    // Used by Zakk Wylde, Billy Gibbons
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.8;
    
    // Pre-filter
    this.preFilter = audioContext.createBiquadFilter();
    this.preFilter.type = 'highshelf';
    this.preFilter.frequency.value = 1000;
    this.preFilter.gain.value = 4;
    
    // Asymmetric clipping
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeSD1Curve(50);
    
    // Tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 3500;
    this.toneFilter.Q.value = 0.707;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preFilter);
    this.preFilter.connect(this.clipper);
    this.clipper.connect(this.toneFilter);
    this.toneFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeSD1Curve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 30);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Asymmetric clipping (SD-1 characteristic)
      let y = x * drive;
      
      // Different clipping for positive/negative
      if (y > 0) {
        y = Math.tanh(y * 1.5);
      } else {
        y = Math.tanh(y * 1.8); // Harder negative clip
      }
      
      // Add warmth
      y += 0.1 * Math.tanh(x * drive * 2);
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'drive':
        this.clipper.curve = this.makeSD1Curve(value);
        this.inputGain.gain.setTargetAtTime(1.5 + (value / 66), now, 0.01);
        break;
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(1000 + (value * 60), now, 0.01);
        break;
      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
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
      this.preFilter.disconnect();
      this.clipper.disconnect();
      this.toneFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossSD1Effect;

