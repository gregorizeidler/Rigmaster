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
    
    // HP filter (always active)
    this.hpFilter = audioContext.createBiquadFilter();
    this.hpFilter.type = 'highpass';
    this.hpFilter.frequency.value = 80;
    this.hpFilter.Q.value = 0.707;
    
    // Bass cut (for LP mode)
    this.bassCut = audioContext.createBiquadFilter();
    this.bassCut.type = 'highshelf';
    this.bassCut.frequency.value = 500;
    this.bassCut.gain.value = 0; // Neutral by default (HP mode)
    
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
    
    // Chain (CORRECTED: HP + bass cut for LP mode)
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.hpFilter);
    this.hpFilter.connect(this.bassCut); // NEW: bass cut for LP mode
    this.bassCut.connect(this.clipper);
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
        // HP/LP mode toggle (CORRECTED IMPLEMENTATION)
        if (value > 50) {
          // HP mode: Full bass, tighter low end
          this.hpFilter.frequency.setTargetAtTime(120, now, 0.01);
          this.bassCut.gain.setTargetAtTime(0, now, 0.01); // No cut
        } else {
          // LP mode: More bass, less tight
          this.hpFilter.frequency.setTargetAtTime(50, now, 0.01);
          this.bassCut.gain.setTargetAtTime(-3, now, 0.01); // Cut bass @ 500Hz
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
      this.hpFilter.disconnect();
      this.bassCut.disconnect();
      this.clipper.disconnect();
      this.toneFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FulltoneOCDEffect;

