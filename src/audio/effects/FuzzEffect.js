import BaseEffect from './BaseEffect';

class FuzzEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzz', 'fuzz');
    
    // Input calibration
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 0.9;
    
    // Anti-aliasing (fuzz creates LOTS of aliasing!)
    this.antiAliasing = audioContext.createBiquadFilter();
    this.antiAliasing.type = 'lowpass';
    this.antiAliasing.frequency.value = 16000;
    this.antiAliasing.Q.value = 0.707;
    
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 15;
    
    // Waveshaper with 4x oversampling (CRITICAL for fuzz!)
    this.fuzz = audioContext.createWaveShaper();
    this.fuzz.oversample = '4x';
    
    // DC Blocker (fuzz creates DC offset)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 15;
    this.dcBlocker.Q.value = 0.707;
    
    // Tone filter (resonant lowpass)
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 5;
    
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.25;
    
    this.createFuzzCurve(100);
    
    // Professional chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasing);
    this.antiAliasing.connect(this.preGain);
    this.preGain.connect(this.fuzz);
    this.fuzz.connect(this.dcBlocker);
    this.dcBlocker.connect(this.filter);
    this.filter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  createFuzzCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const threshold = amount / 150; // 0.66 - 0.01 range
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Hard clipping fuzz (germanium transistor style)
      let y;
      if (Math.abs(x) < threshold) {
        // Linear region
        y = x * (1 / threshold);
      } else {
        // Hard clip with slight rounding
        const sign = x > 0 ? 1 : -1;
        const excess = Math.abs(x) - threshold;
        y = sign * (1 - 0.1 * Math.exp(-excess * 10));
      }
      
      // Add asymmetry (germanium transistors are asymmetric)
      if (x > 0) {
        y *= 0.95; // Compress positive cycle more
      } else {
        y *= 1.05; // Expand negative cycle
      }
      
      // Add intermodulation distortion (fuzz characteristic)
      y += 0.02 * Math.sin(x * 30);
      
      curve[i] = Math.max(-0.98, Math.min(0.98, y));
    }
    
    this.fuzz.curve = curve;
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'fuzz':
        this.preGain.gain.value = 5 + (value / 5);
        this.createFuzzCurve(100 - value);
        break;
      case 'tone':
        this.filter.frequency.value = 500 + (value * 35);
        break;
      case 'level':
        this.postGain.gain.value = value / 100;
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.antiAliasing.disconnect();
    this.preGain.disconnect();
    this.fuzz.disconnect();
    this.dcBlocker.disconnect();
    this.filter.disconnect();
    this.postGain.disconnect();
  }
}

export default FuzzEffect;

