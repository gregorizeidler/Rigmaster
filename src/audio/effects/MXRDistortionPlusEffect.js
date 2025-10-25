import BaseEffect from './BaseEffect';

class MXRDistortionPlusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR Distortion+', 'mxrdistortionplus');
    
    // MXR DISTORTION+ (1973)
    // Simple, aggressive distortion
    // Used by Randy Rhoads, Jerry Garcia
    
    // Input boost
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 3.0;
    
    // Hard clipping (op-amp distortion)
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeDistortionPlusCurve(50);
    
    // Filter (simple tone control)
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 4000;
    this.filter.Q.value = 0.707;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.4;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.clipper);
    this.clipper.connect(this.filter);
    this.filter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeDistortionPlusCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 15);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Hard clipping (simple op-amp)
      let y = x * drive;
      
      if (y > 0.8) {
        y = 0.8;
      } else if (y < -0.8) {
        y = -0.8;
      }
      
      // Add some harmonics
      y += 0.15 * Math.tanh(x * drive * 3);
      
      curve[i] = y * 0.8;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'distortion':
        this.clipper.curve = this.makeDistortionPlusCurve(value);
        this.inputGain.gain.setTargetAtTime(2 + (value / 33), now, 0.01);
        break;
      case 'output':
        this.outputGain.gain.setTargetAtTime(value / 125, now, 0.01);
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
      this.clipper.disconnect();
      this.filter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default MXRDistortionPlusEffect;

