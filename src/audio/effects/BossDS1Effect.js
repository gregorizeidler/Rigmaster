import BaseEffect from './BaseEffect';

class BossDS1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss DS-1', 'bossds1');
    
    // BOSS DS-1 DISTORTION (Classic hard distortion, 1978)
    // Iconic orange pedal, used by Kurt Cobain, Steve Vai
    
    // Input stage
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // TRANSISTOR GAIN STAGE (before op-amp)
    // This adds compression and warmth
    this.transistorStage = audioContext.createDynamicsCompressor();
    this.transistorStage.threshold.value = -20;
    this.transistorStage.knee.value = 10;
    this.transistorStage.ratio.value = 2.5;
    this.transistorStage.attack.value = 0.002;
    this.transistorStage.release.value = 0.1;
    
    // Pre-filter (shape input before clipping)
    this.preFilter = audioContext.createBiquadFilter();
    this.preFilter.type = 'highshelf';
    this.preFilter.frequency.value = 1000;
    this.preFilter.gain.value = 6; // Boost highs before clipping
    
    // Hard clipping (asymmetric)
    this.distortion = audioContext.createWaveShaper();
    this.distortion.oversample = '4x';
    this.distortion.curve = this.makeDS1Curve(50);
    
    // Post-filter (tone control)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 3000;
    this.toneFilter.Q.value = 1.5;
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.4;
    
    // Chain (NEW: transistor stage added)
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.transistorStage); // NEW
    this.transistorStage.connect(this.preFilter);
    this.preFilter.connect(this.distortion);
    this.distortion.connect(this.toneFilter);
    this.toneFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeDS1Curve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 10);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Hard asymmetric clipping (op-amp characteristic)
      let y = x * drive;
      
      if (y > 0.7) {
        y = 0.7 + (y - 0.7) * 0.1; // Hard clip positive
      } else if (y < -0.6) {
        y = -0.6 + (y + 0.6) * 0.15; // Slightly softer negative
      }
      
      // Add harmonics (including even harmonics from transistor stage)
      y += 0.1 * Math.tanh(x * drive * 3); // Odd harmonics
      y += 0.05 * Math.tanh(x * drive * 2); // Even harmonics (NEW)
      
      curve[i] = y * 0.8;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'dist':
        this.distortion.curve = this.makeDS1Curve(value);
        this.inputGain.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        break;
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(1000 + (value * 50), now, 0.01);
        break;
      case 'level':
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
      this.transistorStage.disconnect();
      this.preFilter.disconnect();
      this.distortion.disconnect();
      this.toneFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossDS1Effect;

