import BaseEffect from './BaseEffect';

class BossBD2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss BD-2', 'bossbd2');
    
    // BOSS BD-2 BLUES DRIVER (1995)
    // Smooth, amp-like overdrive
    // Used by John Mayer, The Edge
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Pre-filter (shape before clipping)
    this.preFilter = audioContext.createBiquadFilter();
    this.preFilter.type = 'highshelf';
    this.preFilter.frequency.value = 1500;
    this.preFilter.gain.value = 3;
    
    // Soft clipping (amp-like)
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeBD2Curve(50);
    
    // Tone stack
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 800;
    this.toneFilter.Q.value = 1.0;
    this.toneFilter.gain.value = 0;
    
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
  
  makeBD2Curve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 25);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Smooth soft clipping (BD-2 characteristic)
      let y = x * drive;
      
      // Very soft knee
      y = Math.tanh(y * 1.5);
      
      // Add subtle even harmonics (warmth)
      y += 0.08 * Math.tanh(x * drive * 2);
      
      // Slight asymmetry
      if (x > 0) {
        y *= 1.05;
      }
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain':
        this.clipper.curve = this.makeBD2Curve(value);
        this.inputGain.gain.setTargetAtTime(1 + (value / 100), now, 0.01);
        break;
      case 'tone':
        this.toneFilter.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
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

export default BossBD2Effect;

