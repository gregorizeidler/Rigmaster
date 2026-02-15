import BaseEffect from './BaseEffect';

class MetalDistortionEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Metal Distortion', 'metaldistortion');
    
    // AGGRESSIVE METAL DISTORTION
    // Tight bass, scooped mids, screaming highs
    
    // Input gate (noise gate before distortion)
    this.inputGate = audioContext.createDynamicsCompressor();
    this.inputGate.threshold.value = -50;
    this.inputGate.knee.value = 0;
    this.inputGate.ratio.value = 20;
    this.inputGate.attack.value = 0.001;
    this.inputGate.release.value = 0.1;
    
    // Tight highpass (remove muddy bass)
    this.tightHP = audioContext.createBiquadFilter();
    this.tightHP.type = 'highpass';
    this.tightHP.frequency.value = 120; // Cut everything below 120Hz
    this.tightHP.Q.value = 1.2; // Steep slope
    
    // Input gain staging
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.2;
    
    // Pre-distortion presence boost (for clarity)
    this.presenceBoost = audioContext.createBiquadFilter();
    this.presenceBoost.type = 'peaking';
    this.presenceBoost.frequency.value = 3000;
    this.presenceBoost.Q.value = 2.0;
    this.presenceBoost.gain.value = 6; // +6dB presence
    
    // Anti-aliasing
    this.antiAliasing = audioContext.createBiquadFilter();
    this.antiAliasing.type = 'lowpass';
    this.antiAliasing.frequency.value = 18000;
    this.antiAliasing.Q.value = 0.707;
    
    // Pre-gain
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 20; // Massive gain for metal
    
    // Waveshaper with HARD clipping (4x oversample)
    this.distortion = audioContext.createWaveShaper();
    this.distortion.oversample = '4x';
    
    // DC Blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Post-distortion scooped mid EQ
    this.midScoop = audioContext.createBiquadFilter();
    this.midScoop.type = 'peaking';
    this.midScoop.frequency.value = 800;
    this.midScoop.Q.value = 1.5;
    this.midScoop.gain.value = -8; // Scoop -8dB at 800Hz
    
    // Aggressive highs
    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 4000;
    this.highShelf.gain.value = 6; // Boost highs
    
    // Tone filter
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 6000;
    this.toneFilter.Q.value = 0.707;
    
    // Post gain
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.25;
    
    // Create metal curve
    this.amount = 80;
    this.updateDistortionCurve();
    
    // ROUTING: gate -> HP -> presenceBoost -> antiAlias -> preGain 
    // -> distortion (4x) -> dcBlocker -> midScoop -> highShelf 
    // -> toneFilter -> postGain -> wetGain -> output
    this.input.connect(this.inputGate);
    this.inputGate.connect(this.tightHP);
    this.tightHP.connect(this.inputGain);
    this.inputGain.connect(this.presenceBoost);
    this.presenceBoost.connect(this.antiAliasing);
    this.antiAliasing.connect(this.preGain);
    this.preGain.connect(this.distortion);
    this.distortion.connect(this.dcBlocker);
    this.dcBlocker.connect(this.midScoop);
    this.midScoop.connect(this.highShelf);
    this.highShelf.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  makeMetalCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const gain = amount / 10; // 0-10 range
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Very hard clipping with asymmetry
      let y = Math.tanh(x * gain * 5);
      
      // Add even MORE saturation
      y = Math.tanh(y * 1.5);
      
      // Asymmetric clipping (tube characteristic)
      if (x > 0) {
        y *= 1.3; // More aggressive on positive
      } else {
        y *= 0.9; // Compressed on negative
      }
      
      // Hard limit
      if (Math.abs(y) > 0.95) {
        y = (y > 0 ? 1 : -1) * 0.95;
      }
      
      curve[i] = y * 0.85; // Prevent digital clipping
    }
    
    return curve;
  }

  updateDistortionCurve() {
    this.distortion.curve = this.makeMetalCurve(this.amount);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'gain':
        this.amount = value;
        this.updateDistortionCurve();
        this.preGain.gain.setTargetAtTime(5 + (value / 5), now, 0.01);
        break;
      case 'tone':
        // Control tone filter
        const cutoff = 2000 + (value * 60); // 2kHz to 8kHz
        this.toneFilter.frequency.setTargetAtTime(cutoff, now, 0.01);
        break;
      case 'level':
        this.postGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGate.disconnect();
    this.tightHP.disconnect();
    this.inputGain.disconnect();
    this.presenceBoost.disconnect();
    this.antiAliasing.disconnect();
    this.preGain.disconnect();
    this.distortion.disconnect();
    this.dcBlocker.disconnect();
    this.midScoop.disconnect();
    this.highShelf.disconnect();
    this.toneFilter.disconnect();
    this.postGain.disconnect();
  }
}

export default MetalDistortionEffect;

