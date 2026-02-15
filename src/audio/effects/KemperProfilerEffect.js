import BaseEffect from './BaseEffect';

/**
 * Kemper Profiler - Profiling Amplifier & Multi-FX
 * 
 * The Kemper Profiler uses patented "profiling" technology to capture
 * the exact sound of any real amplifier. Known for incredibly accurate
 * amp tones, used by touring professionals and session musicians worldwide.
 * 
 * Signal Chain: Input → Compressor → Gain Stage (profiled amp model)
 *              → EQ (Bass/Mid/Treble/Presence) → Definition/Clarity → Output
 * 
 * Parameters:
 *   gain (0-100)         - Profile gain (preamp drive)
 *   bass (0-100)         - Low frequency EQ
 *   mid (0-100)          - Mid frequency EQ
 *   treble (0-100)       - High frequency EQ
 *   presence (0-100)     - Upper harmonic content
 *   definition (0-100)   - Tightness of low end (Kemper-specific)
 *   clarity (0-100)      - High-frequency detail (Kemper-specific)
 *   power_sagging (0-100) - Power amp sag simulation
 */
class KemperProfilerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Kemper Profiler', 'kemperprofiler');

    // ============================================
    // STAGE 1: INPUT COMPRESSOR (studio-grade)
    // ============================================
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.2;

    // ============================================
    // STAGE 2: PROFILED AMP GAIN STAGE
    // ============================================
    // The Kemper uses a complex profiling algorithm; we emulate this
    // with multiple cascaded waveshapers and coupling filters

    this.profileInputGain = audioContext.createGain();
    this.profileInputGain.gain.value = 2.0;

    // Definition filter (tightens low end before clipping)
    this.definitionHP = audioContext.createBiquadFilter();
    this.definitionHP.type = 'highpass';
    this.definitionHP.frequency.value = 80;
    this.definitionHP.Q.value = 0.707;

    // Profile Stage 1: Clean preamp
    this.profileStage1 = audioContext.createWaveShaper();
    this.profileStage1.oversample = '4x';
    this.profileStage1.curve = this._makeProfileCurve(1.5, 0.02);

    // Coupling filter between stages
    this.coupling1LP = audioContext.createBiquadFilter();
    this.coupling1LP.type = 'lowpass';
    this.coupling1LP.frequency.value = 7500;
    this.coupling1LP.Q.value = 0.5;

    this.coupling1HP = audioContext.createBiquadFilter();
    this.coupling1HP.type = 'highpass';
    this.coupling1HP.frequency.value = 50;
    this.coupling1HP.Q.value = 0.5;

    // Profile Stage 2: Main drive
    this.profileStage2 = audioContext.createWaveShaper();
    this.profileStage2.oversample = '4x';
    this.profileStage2.curve = this._makeProfileCurve(3.0, 0.04);

    // Coupling filter 2
    this.coupling2LP = audioContext.createBiquadFilter();
    this.coupling2LP.type = 'lowpass';
    this.coupling2LP.frequency.value = 6500;
    this.coupling2LP.Q.value = 0.6;

    // Profile Stage 3: Power amp saturation
    this.profileStage3 = audioContext.createWaveShaper();
    this.profileStage3.oversample = '4x';
    this.profileStage3.curve = this._makePowerSagCurve(1.2);

    this.profileOutputGain = audioContext.createGain();
    this.profileOutputGain.gain.value = 0.7;

    // DC blocker (removes offset from asymmetric clipping)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // ============================================
    // STAGE 3: TONE STACK (Kemper EQ)
    // ============================================
    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 130;
    this.eqBass.gain.value = 0;

    this.eqMid = audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 750;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = 0;

    this.eqTreble = audioContext.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 3000;
    this.eqTreble.gain.value = 0;

    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5000;
    this.eqPresence.Q.value = 1.2;
    this.eqPresence.gain.value = 0;

    // ============================================
    // STAGE 4: DEFINITION CONTROL
    // ============================================
    // Definition tightens low-frequency response
    this.definitionLowCut = audioContext.createBiquadFilter();
    this.definitionLowCut.type = 'highpass';
    this.definitionLowCut.frequency.value = 60;
    this.definitionLowCut.Q.value = 0.707;

    // Definition resonance peak (adds punch)
    this.definitionPeak = audioContext.createBiquadFilter();
    this.definitionPeak.type = 'peaking';
    this.definitionPeak.frequency.value = 200;
    this.definitionPeak.Q.value = 1.5;
    this.definitionPeak.gain.value = 0;

    // ============================================
    // STAGE 5: CLARITY CONTROL
    // ============================================
    // Clarity enhances upper harmonic detail
    this.clarityBoost = audioContext.createBiquadFilter();
    this.clarityBoost.type = 'peaking';
    this.clarityBoost.frequency.value = 4500;
    this.clarityBoost.Q.value = 1.5;
    this.clarityBoost.gain.value = 0;

    this.clarityAir = audioContext.createBiquadFilter();
    this.clarityAir.type = 'highshelf';
    this.clarityAir.frequency.value = 8000;
    this.clarityAir.gain.value = 0;

    // ============================================
    // STAGE 6: POWER SAGGING CONTROL
    // ============================================
    // Simulates tube rectifier power supply sag
    this.sagCompressor = audioContext.createDynamicsCompressor();
    this.sagCompressor.threshold.value = -20;
    this.sagCompressor.knee.value = 15;
    this.sagCompressor.ratio.value = 2;
    this.sagCompressor.attack.value = 0.008;
    this.sagCompressor.release.value = 0.2;

    this.sagMakeup = audioContext.createGain();
    this.sagMakeup.gain.value = 1.0;

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

  _makeProfileCurve(amount, asymmetry) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xShifted = x + asymmetry;
      let y = Math.tanh(xShifted * amount);
      // Kemper profiles add subtle even harmonics
      y += 0.025 * Math.sin(xShifted * amount * Math.PI * 2);
      // Remove DC offset from asymmetry
      y -= Math.tanh(asymmetry * amount);
      // Soft knee compression at extremes
      if (Math.abs(y) > 0.85) {
        y = Math.sign(y) * (0.85 + (Math.abs(y) - 0.85) * 0.3);
      }
      curve[i] = y * 0.95;
    }
    return curve;
  }

  _makePowerSagCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Softer saturation simulating power tube sag
      let y = Math.tanh(x * amount * 0.8);
      // Add compression feel
      if (Math.abs(x) > 0.4) {
        const excess = Math.abs(x) - 0.4;
        y = Math.sign(x) * (Math.abs(y) - excess * 0.15);
      }
      // Subtle even harmonic content
      y += 0.03 * x * (1 - x * x) * amount;
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    // Input → Compressor
    this.input.connect(this.compressor);
    this.compressor.connect(this.compMakeup);

    // Compressor → Profile gain stages
    this.compMakeup.connect(this.profileInputGain);
    this.profileInputGain.connect(this.definitionHP);
    this.definitionHP.connect(this.profileStage1);
    this.profileStage1.connect(this.coupling1LP);
    this.coupling1LP.connect(this.coupling1HP);
    this.coupling1HP.connect(this.profileStage2);
    this.profileStage2.connect(this.coupling2LP);
    this.coupling2LP.connect(this.profileStage3);
    this.profileStage3.connect(this.profileOutputGain);
    this.profileOutputGain.connect(this.dcBlocker);

    // DC Blocker → EQ
    this.dcBlocker.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.eqPresence);

    // EQ → Definition → Clarity
    this.eqPresence.connect(this.definitionLowCut);
    this.definitionLowCut.connect(this.definitionPeak);
    this.definitionPeak.connect(this.clarityBoost);
    this.clarityBoost.connect(this.clarityAir);

    // Clarity → Power Sag → Output
    this.clarityAir.connect(this.sagCompressor);
    this.sagCompressor.connect(this.sagMakeup);
    this.sagMakeup.connect(this.outputGain);
    this.outputGain.connect(this.outputLimiter);
    this.outputLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'gain': {
        const gainAmount = 0.5 + (value / 100) * 8.0;
        this.profileInputGain.gain.setTargetAtTime(gainAmount, now, 0.02);
        const tanhAmount = 1.0 + (value / 100) * 8.0;
        this.profileStage1.curve = this._makeProfileCurve(tanhAmount * 0.4, 0.02);
        this.profileStage2.curve = this._makeProfileCurve(tanhAmount, 0.04);
        this.profileStage3.curve = this._makePowerSagCurve(0.8 + (value / 100) * 1.2);
        // More gain = tighter bass to prevent mud
        const tightFreq = 60 + (value / 100) * 60;
        this.definitionHP.frequency.setTargetAtTime(tightFreq, now, 0.02);
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
      case 'definition': {
        // Definition tightens low end: higher = tighter
        const freq = 40 + (value / 100) * 120;
        this.definitionLowCut.frequency.setTargetAtTime(freq, now, 0.02);
        const peakGain = (value / 100) * 4;
        this.definitionPeak.gain.setTargetAtTime(peakGain, now, 0.02);
        break;
      }
      case 'clarity': {
        // Clarity adds high-frequency detail
        const boostGain = (value / 100) * 6;
        this.clarityBoost.gain.setTargetAtTime(boostGain, now, 0.02);
        const airGain = (value / 100) * 4;
        this.clarityAir.gain.setTargetAtTime(airGain, now, 0.02);
        break;
      }
      case 'power_sagging': {
        // Power sag: more sag = more compression, softer attack
        const thresh = -10 - (value / 100) * 25;
        this.sagCompressor.threshold.value = thresh;
        const ratio = 1.5 + (value / 100) * 3.5;
        this.sagCompressor.ratio.value = ratio;
        const attack = 0.004 + (value / 100) * 0.016;
        this.sagCompressor.attack.value = attack;
        const release = 0.1 + (value / 100) * 0.3;
        this.sagCompressor.release.value = release;
        // Makeup gain to compensate for compression
        const makeup = 1.0 + (value / 100) * 0.5;
        this.sagMakeup.gain.setTargetAtTime(makeup, now, 0.02);
        break;
      }
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
      this.profileInputGain.disconnect();
      this.definitionHP.disconnect();
      this.profileStage1.disconnect();
      this.coupling1LP.disconnect();
      this.coupling1HP.disconnect();
      this.profileStage2.disconnect();
      this.coupling2LP.disconnect();
      this.profileStage3.disconnect();
      this.profileOutputGain.disconnect();
      this.dcBlocker.disconnect();
      this.eqBass.disconnect();
      this.eqMid.disconnect();
      this.eqTreble.disconnect();
      this.eqPresence.disconnect();
      this.definitionLowCut.disconnect();
      this.definitionPeak.disconnect();
      this.clarityBoost.disconnect();
      this.clarityAir.disconnect();
      this.sagCompressor.disconnect();
      this.sagMakeup.disconnect();
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Kemper Profiler:', e);
    }
  }
}

export default KemperProfilerEffect;
