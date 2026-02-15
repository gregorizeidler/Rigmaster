import BaseEffect from './BaseEffect';

class LimiterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Limiter', 'limiter');
    
    // BRICK-WALL LIMITER
    // Prevents clipping, maximizes loudness
    
    // Input gain
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // Soft clipper (pre-limiter)
    this.softClipper = audioContext.createWaveShaper();
    this.softClipper.oversample = '4x';
    this.softClipper.curve = this.makeSoftClipCurve();
    
    // Main limiter (brick-wall)
    this.limiter = audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -1; // Very hot threshold
    this.limiter.knee.value = 0; // Hard knee
    this.limiter.ratio.value = 20; // Brick-wall ratio
    this.limiter.attack.value = 0.0001; // Ultra-fast attack (0.1ms)
    this.limiter.release.value = 0.1; // Quick release
    
    // Makeup gain
    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 1.5;
    
    // Final safety limiter (hard clip at 0dBFS)
    this.finalClipper = audioContext.createWaveShaper();
    this.finalClipper.oversample = '4x';
    this.finalClipper.curve = this.makeHardClipCurve();
    
    // Anti-aliasing filter before softClipper (lowpass 18kHz)
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 18000;
    this.antiAlias.Q.value = 0.707;
    
    // DC blocker after finalClipper (highpass 10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Output gain
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // ROUTING: input -> inputGain -> antiAlias -> softClipper -> limiter 
    // -> makeupGain -> finalClipper -> dcBlocker -> outputGain -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.antiAlias);
    this.antiAlias.connect(this.softClipper);
    this.softClipper.connect(this.limiter);
    this.limiter.connect(this.makeupGain);
    this.makeupGain.connect(this.finalClipper);
    this.finalClipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  makeSoftClipCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft saturation curve
      curve[i] = Math.tanh(x * 1.5) * 0.9;
    }
    
    return curve;
  }

  makeHardClipCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hard clip at ±0.98
      if (x > 0.98) {
        curve[i] = 0.98;
      } else if (x < -0.98) {
        curve[i] = -0.98;
      } else {
        curve[i] = x;
      }
    }
    
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'threshold':
        // -20dB to 0dB
        const threshold = -20 + (value / 100) * 20;
        this.limiter.threshold.setTargetAtTime(threshold, now, 0.01);
        break;
      case 'release':
        // 10ms to 1000ms
        const release = 0.01 + (value / 100) * 0.99;
        this.limiter.release.setTargetAtTime(release, now, 0.01);
        break;
      case 'gain':
        // 0x to 3x (0dB to +9.5dB makeup gain)
        const gain = (value / 100) * 3;
        this.makeupGain.gain.setTargetAtTime(gain, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.antiAlias.disconnect();
    this.softClipper.disconnect();
    this.limiter.disconnect();
    this.makeupGain.disconnect();
    this.finalClipper.disconnect();
    this.dcBlocker.disconnect();
    this.outputGain.disconnect();
  }
}

export default LimiterEffect;

