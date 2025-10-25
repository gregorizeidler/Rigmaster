import BaseEffect from './BaseEffect';

class FuzzFaceEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzz Face', 'fuzzface');
    
    // DALLAS ARBITER FUZZ FACE (1966)
    // THE Hendrix fuzz sound
    // Germanium transistor fuzz - warm, dynamic, touch-sensitive
    
    // Input (Fuzz Face is sensitive to guitar volume)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 3.0;
    
    // Bias network (germanium transistor sim)
    this.biasFilter = audioContext.createBiquadFilter();
    this.biasFilter.type = 'highpass';
    this.biasFilter.frequency.value = 200;
    this.biasFilter.Q.value = 0.5;
    
    // Fuzz clipper (germanium - soft, warm clipping)
    this.fuzzClip = audioContext.createWaveShaper();
    this.fuzzClip.oversample = '4x';
    this.fuzzClip.curve = this.makeFuzzFaceCurve(50);
    
    // Output filter (natural treble rolloff)
    this.outputFilter = audioContext.createBiquadFilter();
    this.outputFilter.type = 'lowpass';
    this.outputFilter.frequency.value = 6000;
    this.outputFilter.Q.value = 0.707;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.3;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.biasFilter);
    this.biasFilter.connect(this.fuzzClip);
    this.fuzzClip.connect(this.outputFilter);
    this.outputFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeFuzzFaceCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const fuzz = 1 + (amount / 20);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Germanium soft clipping (very smooth)
      let y = x * fuzz;
      
      // Soft saturation (transistor characteristic)
      y = Math.tanh(y * 2.5);
      
      // Add even harmonics (germanium warmth)
      y += 0.15 * Math.tanh(x * fuzz * 1.5);
      
      // Compression (touch sensitivity)
      y *= (1 - Math.abs(x) * 0.2);
      
      // Slight asymmetry
      if (x > 0) {
        y *= 1.1;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'fuzz':
        this.fuzzClip.curve = this.makeFuzzFaceCurve(value);
        this.inputGain.gain.setTargetAtTime(2 + (value / 33), now, 0.01);
        break;
      case 'volume':
        this.outputGain.gain.setTargetAtTime(value / 150, now, 0.01);
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
      this.outputFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FuzzFaceEffect;

