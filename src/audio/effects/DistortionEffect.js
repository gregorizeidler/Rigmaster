import BaseEffect from './BaseEffect';

class DistortionEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Distortion', 'distortion');
    
    // Input calibration (headroom)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 0.8; // -1.9dB headroom
    
    // Anti-aliasing filter (before distortion)
    this.antiAliasing = audioContext.createBiquadFilter();
    this.antiAliasing.type = 'lowpass';
    this.antiAliasing.frequency.value = 18000;
    this.antiAliasing.Q.value = 0.707;
    
    this.preGain = audioContext.createGain();
    
    // Waveshaper with 4x oversampling (CRITICAL for quality!)
    this.distortion = audioContext.createWaveShaper();
    this.distortion.oversample = '4x'; // 4x oversampling to reduce aliasing
    
    // DC Blocker (removes DC offset after distortion)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Tone filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 3000;
    this.filter.Q.value = 1;
    
    this.postGain = audioContext.createGain();
    
    // Setup gains
    this.preGain.gain.value = 8;
    this.postGain.gain.value = 0.35;
    
    // Create distortion curve
    this.amount = 50;
    this.updateDistortionCurve();
    
    // Professional signal chain:
    // input -> inputGain -> antiAliasing -> preGain -> distortion (4x oversample) 
    // -> dcBlocker -> filter -> postGain -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasing);
    this.antiAliasing.connect(this.preGain);
    this.preGain.connect(this.distortion);
    this.distortion.connect(this.dcBlocker);
    this.dcBlocker.connect(this.filter);
    this.filter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = amount / 20; // 0-5 range
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Soft-clipping with tanh (tube-like saturation)
      let y = Math.tanh(x * drive * 3);
      
      // Add asymmetry (tubes clip differently on positive/negative cycles)
      if (x > 0) {
        y *= 1.15; // More gain on positive cycle
      } else {
        y *= 0.95; // Slight compression on negative cycle
      }
      
      // Add subtle even harmonics (tube characteristic)
      y += 0.05 * Math.tanh(x * drive * 6);
      
      // Soft knee (smooth transition into clipping)
      const knee = 0.7;
      if (Math.abs(y) > knee) {
        const excess = Math.abs(y) - knee;
        y = (y > 0 ? 1 : -1) * (knee + excess * 0.3);
      }
      
      curve[i] = y * 0.9; // Normalize to avoid digital clipping
    }
    
    return curve;
  }

  updateDistortionCurve() {
    this.distortion.curve = this.makeDistortionCurve(this.amount);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'drive':
        this.amount = value;
        this.updateDistortionCurve();
        this.preGain.gain.value = 1 + (value / 10);
        break;
      case 'tone':
        this.filter.frequency.value = 500 + (value * 45);
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
    this.distortion.disconnect();
    this.dcBlocker.disconnect();
    this.filter.disconnect();
    this.postGain.disconnect();
  }
}

export default DistortionEffect;

