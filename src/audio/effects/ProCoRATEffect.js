import BaseEffect from './BaseEffect';

class ProCoRATEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'ProCo RAT', 'procorat');
    
    // PROCO RAT (Classic distortion, 1978)
    // Aggressive mid-heavy distortion
    // Used by Jeff Beck, David Gilmour, Kurt Cobain
    
    // Input
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;
    
    // Pre-emphasis (mid boost before clipping)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.value = 1500;
    this.preEmphasis.Q.value = 2.0;
    this.preEmphasis.gain.value = 12; // Heavy mid boost
    
    // RAT distortion (LM308 op-amp simulation - slow slew rate)
    this.ratClip = audioContext.createWaveShaper();
    this.ratClip.oversample = '4x';
    this.ratClip.curve = this.makeRATCurve(50);
    
    // Filter (tone control - unique RAT filter)
    this.ratFilter = audioContext.createBiquadFilter();
    this.ratFilter.type = 'lowpass';
    this.ratFilter.frequency.value = 2000;
    this.ratFilter.Q.value = 2.5; // Resonant filter
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.35;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.preEmphasis);
    this.preEmphasis.connect(this.ratClip);
    this.ratClip.connect(this.ratFilter);
    this.ratFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeRATCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 12);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // RAT uses hard clipping with slow slew rate (LM308)
      let y = x * drive;
      
      // Hard clipping with slight softness
      if (y > 0.8) {
        y = 0.8;
      } else if (y < -0.8) {
        y = -0.8;
      } else {
        // Compress in the middle
        y = Math.tanh(y * 1.3);
      }
      
      // Add harsh odd harmonics (RAT characteristic)
      y += 0.15 * Math.tanh(x * drive * 2.5);
      y += 0.08 * Math.tanh(x * drive * 5);
      
      curve[i] = y * 0.75;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'distortion':
        this.ratClip.curve = this.makeRATCurve(value);
        this.inputGain.gain.setTargetAtTime(1.5 + (value / 50), now, 0.01);
        break;
      case 'filter':
        // RAT's unique reverse tone control (counterclockwise = brighter)
        this.ratFilter.frequency.setTargetAtTime(500 + ((100 - value) * 50), now, 0.01);
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
      this.preEmphasis.disconnect();
      this.ratClip.disconnect();
      this.ratFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default ProCoRATEffect;

