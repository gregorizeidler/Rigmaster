import BaseEffect from './BaseEffect';

class OverdriveEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Overdrive', 'overdrive');
    
    // Input calibration
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 0.85;
    
    // Anti-aliasing
    this.antiAliasing = audioContext.createBiquadFilter();
    this.antiAliasing.type = 'lowpass';
    this.antiAliasing.frequency.value = 18000;
    this.antiAliasing.Q.value = 0.707;
    
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 4;
    
    // Waveshaper with 4x oversampling
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.oversample = '4x';
    
    // DC Blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Tone control (classic mid-hump)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowshelf';
    this.toneFilter.frequency.value = 720;
    this.toneFilter.gain.value = 0;
    
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.45;
    
    this.createOvdriveCurve(50);
    
    // Professional chain: input -> inputGain -> antiAliasing -> preGain 
    // -> waveshaper(4x) -> dcBlocker -> toneFilter -> postGain -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasing);
    this.antiAliasing.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  createOvdriveCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const drive = amount / 30; // 0-3.3 range (softer than distortion)
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Soft-clipping overdrive (gentler than distortion)
      let y = Math.tanh(x * drive * 2);
      
      // Asymmetry (tube push-pull stage)
      if (x > 0) {
        y *= 1.1; // Slight bias
      } else {
        y *= 0.98;
      }
      
      // Add warm even harmonics
      y += 0.08 * Math.tanh(x * drive * 4);
      
      // Soft knee at 0.75
      const knee = 0.75;
      if (Math.abs(y) > knee) {
        const excess = Math.abs(y) - knee;
        y = (y > 0 ? 1 : -1) * (knee + excess * 0.4);
      }
      
      curve[i] = y * 0.92;
    }
    
    this.waveshaper.curve = curve;
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'drive':
        this.preGain.gain.value = 1 + (value / 20);
        this.createOvdriveCurve(value);
        break;
      case 'tone':
        this.toneFilter.gain.value = (value - 50) / 5;
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
    this.waveshaper.disconnect();
    this.dcBlocker.disconnect();
    this.toneFilter.disconnect();
    this.postGain.disconnect();
  }
}

export default OverdriveEffect;

