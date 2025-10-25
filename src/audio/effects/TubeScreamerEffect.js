import BaseEffect from './BaseEffect';

class TubeScreamerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tube Screamer', 'tubescreamer');
    
    // Classic mid-hump EQ
    this.inputFilter = audioContext.createBiquadFilter();
    this.inputFilter.type = 'highpass';
    this.inputFilter.frequency.value = 720;
    
    this.midBoost = audioContext.createBiquadFilter();
    this.midBoost.type = 'peaking';
    this.midBoost.frequency.value = 720;
    this.midBoost.Q.value = 1;
    this.midBoost.gain.value = 6;
    
    // Soft clipping
    this.preGain = audioContext.createGain();
    this.clipper = audioContext.createWaveShaper();
    this.postGain = audioContext.createGain();
    
    this.preGain.gain.value = 3;
    this.postGain.gain.value = 0.4;
    
    // Output tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 2000;
    
    this.createTubeScreamerCurve(50);
    
    // Connect chain
    this.input.connect(this.inputFilter);
    this.inputFilter.connect(this.midBoost);
    this.midBoost.connect(this.preGain);
    this.preGain.connect(this.clipper);
    this.clipper.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  createTubeScreamerCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = amount / 100;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft asymmetric clipping
      curve[i] = x / (1 + k * Math.abs(x));
      if (x > 0) curve[i] *= 1.1; // Slight asymmetry
    }
    
    this.clipper.curve = curve;
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'drive':
        this.preGain.gain.value = 1 + (value / 100) * 9;
        this.createTubeScreamerCurve(value);
        break;
      case 'tone':
        this.toneFilter.frequency.value = 500 + (value / 100) * 3500;
        break;
      case 'level':
        this.postGain.gain.value = (value / 100) * 0.8;
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputFilter.disconnect();
    this.midBoost.disconnect();
    this.preGain.disconnect();
    this.clipper.disconnect();
    this.postGain.disconnect();
    this.toneFilter.disconnect();
  }
}

export default TubeScreamerEffect;

