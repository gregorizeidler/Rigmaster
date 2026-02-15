import BaseEffect from './BaseEffect';

/**
 * Neural DSP Quad Cortex - AI-Powered Amp Modeler & Multi-FX
 * 
 * The Quad Cortex uses proprietary neural capture technology with
 * machine learning to model amps, cabs, and effects with unprecedented
 * accuracy. Features a quad-core SHARC DSP, touchscreen interface,
 * and WiFi connectivity. Known for its desktop-quality captures.
 * 
 * Signal Chain: Input → Compressor → Gain Stage (neural model)
 *              → EQ (Bass/Mid/Treble/Presence/Depth) → Output
 * 
 * Models: clean, crunch, hi-gain, lead
 * 
 * Parameters:
 *   gain (0-100)      - Neural capture gain
 *   bass (0-100)      - Low frequency EQ
 *   mid (0-100)       - Mid frequency EQ
 *   treble (0-100)    - High frequency EQ
 *   presence (0-100)  - Upper harmonics
 *   depth (0-100)     - Sub-bass resonance
 *   model (string)    - clean/crunch/hi-gain/lead
 */
class NeuralDSPQuadCortexEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Neural DSP Quad Cortex', 'neuralquadcortex');

    // ============================================
    // MODEL PRESETS (neural capture voicings)
    // ============================================
    this.models = {
      clean:    { gainMul: 1.2,  tanhK: 1.1,  asymmetry: 0.01, postGain: 0.95, tightFreq: 60,  midFreq: 700,  midQ: 0.8,  lpFreq: 8000 },
      crunch:   { gainMul: 4.0,  tanhK: 3.5,  asymmetry: 0.03, postGain: 0.8,  tightFreq: 85,  midFreq: 850,  midQ: 1.2,  lpFreq: 7000 },
      'hi-gain': { gainMul: 12.0, tanhK: 8.0,  asymmetry: 0.06, postGain: 0.6,  tightFreq: 110, midFreq: 900,  midQ: 1.8,  lpFreq: 5500 },
      lead:     { gainMul: 18.0, tanhK: 12.0, asymmetry: 0.08, postGain: 0.5,  tightFreq: 100, midFreq: 1000, midQ: 2.0,  lpFreq: 5000 }
    };
    this.currentModel = 'clean';

    // ============================================
    // STAGE 1: INPUT COMPRESSOR
    // ============================================
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.14;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.3;

    // ============================================
    // STAGE 2: NEURAL CAPTURE GAIN STAGES
    // ============================================
    this.captureInputGain = audioContext.createGain();
    this.captureInputGain.gain.value = 1.2;

    // Tightness control HP
    this.captureHP = audioContext.createBiquadFilter();
    this.captureHP.type = 'highpass';
    this.captureHP.frequency.value = 60;
    this.captureHP.Q.value = 0.707;

    // Neural capture stage 1 (preamp)
    this.captureStage1 = audioContext.createWaveShaper();
    this.captureStage1.oversample = '4x';
    this.captureStage1.curve = this._makeNeuralCurve(1.1, 0.01);

    // Interstage coupling
    this.interLP1 = audioContext.createBiquadFilter();
    this.interLP1.type = 'lowpass';
    this.interLP1.frequency.value = 8000;
    this.interLP1.Q.value = 0.5;

    this.interHP1 = audioContext.createBiquadFilter();
    this.interHP1.type = 'highpass';
    this.interHP1.frequency.value = 45;
    this.interHP1.Q.value = 0.5;

    // Neural capture stage 2 (main drive)
    this.captureStage2 = audioContext.createWaveShaper();
    this.captureStage2.oversample = '4x';
    this.captureStage2.curve = this._makeNeuralCurve(3.0, 0.03);

    // Interstage coupling 2
    this.interLP2 = audioContext.createBiquadFilter();
    this.interLP2.type = 'lowpass';
    this.interLP2.frequency.value = 7000;
    this.interLP2.Q.value = 0.5;

    // Neural capture stage 3 (power section)
    this.captureStage3 = audioContext.createWaveShaper();
    this.captureStage3.oversample = '4x';
    this.captureStage3.curve = this._makeNeuralPowerCurve(1.0);

    this.captureOutputGain = audioContext.createGain();
    this.captureOutputGain.gain.value = 0.95;

    // Post-drive LP (speaker emulation in model)
    this.captureLP = audioContext.createBiquadFilter();
    this.captureLP.type = 'lowpass';
    this.captureLP.frequency.value = 8000;
    this.captureLP.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // ============================================
    // STAGE 3: TONE STACK (5-band EQ)
    // ============================================
    this.eqDepth = audioContext.createBiquadFilter();
    this.eqDepth.type = 'lowshelf';
    this.eqDepth.frequency.value = 60;
    this.eqDepth.gain.value = 0;

    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 140;
    this.eqBass.gain.value = 0;

    this.eqMid = audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 700;
    this.eqMid.Q.value = 0.8;
    this.eqMid.gain.value = 0;

    this.eqTreble = audioContext.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 3200;
    this.eqTreble.gain.value = 0;

    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5500;
    this.eqPresence.Q.value = 1.0;
    this.eqPresence.gain.value = 0;

    // ============================================
    // OUTPUT
    // ============================================
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.85;

    this.outputLimiter = audioContext.createDynamicsCompressor();
    this.outputLimiter.threshold.value = -2;
    this.outputLimiter.knee.value = 3;
    this.outputLimiter.ratio.value = 20;
    this.outputLimiter.attack.value = 0.001;
    this.outputLimiter.release.value = 0.05;

    // ============================================
    // ROUTING
    // ============================================
    this._setupRouting();
  }

  _makeNeuralCurve(amount, asymmetry) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xShift = x + asymmetry;
      // Neural DSP uses a more complex transfer function
      let y = Math.tanh(xShift * amount);
      // Add subtle harmonic richness (neural model characteristic)
      y += 0.02 * Math.tanh(xShift * amount * 3);
      y += 0.01 * Math.tanh(xShift * amount * 7);
      // Soft knee compression
      if (Math.abs(y) > 0.88) {
        y = Math.sign(y) * (0.88 + (Math.abs(y) - 0.88) * 0.25);
      }
      // Remove DC
      y -= Math.tanh(asymmetry * amount) + 0.02 * Math.tanh(asymmetry * amount * 3);
      curve[i] = y * 0.93;
    }
    return curve;
  }

  _makeNeuralPowerCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Power amp: symmetric soft clipping with sag feel
      let y = Math.tanh(x * amount * 1.2);
      // Power tube compression
      if (Math.abs(x * amount) > 0.5) {
        const excess = Math.abs(x * amount) - 0.5;
        y -= Math.sign(x) * excess * 0.08;
      }
      // Subtle push-pull asymmetry
      y += 0.015 * x * (1 - x * x);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    // Input → Compressor
    this.input.connect(this.compressor);
    this.compressor.connect(this.compMakeup);

    // Compressor → Neural capture chain
    this.compMakeup.connect(this.captureInputGain);
    this.captureInputGain.connect(this.captureHP);
    this.captureHP.connect(this.captureStage1);
    this.captureStage1.connect(this.interLP1);
    this.interLP1.connect(this.interHP1);
    this.interHP1.connect(this.captureStage2);
    this.captureStage2.connect(this.interLP2);
    this.interLP2.connect(this.captureStage3);
    this.captureStage3.connect(this.captureOutputGain);
    this.captureOutputGain.connect(this.captureLP);
    this.captureLP.connect(this.dcBlocker);

    // DC Blocker → EQ
    this.dcBlocker.connect(this.eqDepth);
    this.eqDepth.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.eqPresence);

    // EQ → Output
    this.eqPresence.connect(this.outputGain);
    this.outputGain.connect(this.outputLimiter);
    this.outputLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  _applyModel(modelName) {
    const m = this.models[modelName];
    if (!m) return;
    this.currentModel = modelName;
    const now = this.audioContext.currentTime;

    this.captureInputGain.gain.setTargetAtTime(m.gainMul * 0.3, now, 0.02);
    this.captureStage1.curve = this._makeNeuralCurve(m.tanhK * 0.4, m.asymmetry * 0.5);
    this.captureStage2.curve = this._makeNeuralCurve(m.tanhK, m.asymmetry);
    this.captureStage3.curve = this._makeNeuralPowerCurve(0.8 + m.tanhK * 0.1);
    this.captureOutputGain.gain.setTargetAtTime(m.postGain, now, 0.02);
    this.captureHP.frequency.setTargetAtTime(m.tightFreq, now, 0.02);
    this.captureLP.frequency.setTargetAtTime(m.lpFreq, now, 0.02);
    this.eqMid.frequency.setTargetAtTime(m.midFreq, now, 0.02);
    this.eqMid.Q.setTargetAtTime(m.midQ, now, 0.02);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'gain': {
        const m = this.models[this.currentModel];
        const scaledGain = m.gainMul * (0.2 + (value / 100) * 0.8) * 0.3;
        this.captureInputGain.gain.setTargetAtTime(scaledGain, now, 0.02);
        const scaledTanh = m.tanhK * (0.3 + (value / 100) * 1.2);
        this.captureStage1.curve = this._makeNeuralCurve(scaledTanh * 0.4, m.asymmetry * 0.5);
        this.captureStage2.curve = this._makeNeuralCurve(scaledTanh, m.asymmetry);
        break;
      }
      case 'bass':
        this.eqBass.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'mid':
        this.eqMid.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'treble':
        this.eqTreble.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'presence':
        this.eqPresence.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'depth':
        this.eqDepth.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'model':
        this._applyModel(value);
        break;
      default:
        super.updateParameter(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.captureInputGain.disconnect();
      this.captureHP.disconnect();
      this.captureStage1.disconnect();
      this.interLP1.disconnect();
      this.interHP1.disconnect();
      this.captureStage2.disconnect();
      this.interLP2.disconnect();
      this.captureStage3.disconnect();
      this.captureOutputGain.disconnect();
      this.captureLP.disconnect();
      this.dcBlocker.disconnect();
      this.eqDepth.disconnect();
      this.eqBass.disconnect();
      this.eqMid.disconnect();
      this.eqTreble.disconnect();
      this.eqPresence.disconnect();
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Neural DSP Quad Cortex:', e);
    }
  }
}

export default NeuralDSPQuadCortexEffect;
