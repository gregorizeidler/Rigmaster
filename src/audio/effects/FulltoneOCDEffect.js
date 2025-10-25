import BaseEffect from './BaseEffect';

class FulltoneOCDEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fulltone OCD', 'fulltoneocd');
    
    // FULLTONE OCD (2004)
    // "Obsessive Compulsive Drive" - amp-like overdrive
    // Used by Robin Trower, Joe Bonamassa
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;
    
    // HP/LP toggle (simulated with filter blend)
    this.hpMode = audioContext.createBiquadFilter();
    this.lpMode = audioContext.createBiquadFilter();
    this.hpMode.type = 'highpass';
    this.lpMode.type = 'lowpass';
    this.hpMode.frequency.value = 80;
    this.lpMode.frequency.value = 8000;
    
    // MOSFET clipping (OCD uses MOSFET diodes)
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeOCDCurve(50);
    
    // Tone stack
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 1200;
    this.toneFilter.Q.value = 1.0;
    this.toneFilter.gain.value = 0;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.6;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.hpMode);
    this.hpMode.connect(this.lpMode);
    this.lpMode.connect(this.clipper);
    this.clipper.connect(this.toneFilter);
    this.toneFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeOCDCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 25);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // MOSFET clipping (very amp-like)
      let y = x * drive;
      
      // Hard-soft hybrid clipping
      if (Math.abs(y) > 0.7) {
        y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.3);
      } else {
        y = Math.tanh(y * 1.3);
      }
      
      // Add harmonics
      y += 0.12 * Math.tanh(x * drive * 2.5);
      
      curve[i] = y * 0.88;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'drive':
        this.clipper.curve = this.makeOCDCurve(value);
        this.inputGain.gain.setTargetAtTime(1.5 + (value / 50), now, 0.01);
        break;
      case 'tone':
        this.toneFilter.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;
      case 'volume':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mode':
        // HP/LP mode toggle
        if (value > 50) {
          // HP mode (more bass)
          this.hpMode.frequency.setTargetAtTime(50, now, 0.01);
        } else {
          // LP mode (tighter bass)
          this.hpMode.frequency.setTargetAtTime(120, now, 0.01);
        }
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
      this.hpMode.disconnect();
      this.lpMode.disconnect();
      this.clipper.disconnect();
      this.toneFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FulltoneOCDEffect;

