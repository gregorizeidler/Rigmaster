import BaseEffect from './BaseEffect';

class MXRDynaCompEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR Dyna Comp', 'mxrdynacomp');
    
    // MXR DYNA COMP (1972)
    // Classic compressor - simple, musical
    // Used by David Gilmour, John Frusciante
    
    // Compressor
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24; // Default threshold
    this.compressor.knee.value = 30; // Soft knee
    this.compressor.ratio.value = 4; // 4:1 ratio
    this.compressor.attack.value = 0.003; // Fast attack (3ms)
    this.compressor.release.value = 0.25; // Medium release (250ms)
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Output (makeup gain)
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 2.0; // Dyna Comp boosts output
    
    // High-pass filter (remove low-end pumping)
    this.hpf = audioContext.createBiquadFilter();
    this.hpf.type = 'highpass';
    this.hpf.frequency.value = 80;
    this.hpf.Q.value = 0.707;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.hpf);
    this.hpf.connect(this.compressor);
    this.compressor.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'sensitivity':
        // Sensitivity = threshold
        this.compressor.threshold.setTargetAtTime(-50 + (value / 2), now, 0.01);
        break;
      case 'output':
        // Output level (makeup gain)
        this.outputGain.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        break;
      case 'attack':
        // Attack time
        this.compressor.attack.setTargetAtTime(0.001 + (value / 1000), now, 0.01);
        break;
      case 'release':
        // Release time
        this.compressor.release.setTargetAtTime(0.05 + (value / 100), now, 0.01);
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
      this.compressor.disconnect();
      this.outputGain.disconnect();
      this.hpf.disconnect();
    } catch (e) {}
  }
}

export default MXRDynaCompEffect;

