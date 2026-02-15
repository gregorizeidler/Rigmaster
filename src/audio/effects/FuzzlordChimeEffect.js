import BaseEffect from './BaseEffect';

/**
 * FuzzlordChimeEffect
 *
 * Fuzzlord Chime – octave fuzz with upper octave overtone.
 * Chaotic and wild. The octave effect is created by full-wave
 * rectification (frequency doubling) blended with the fuzz signal.
 *
 * Signal chain:
 *   input → inputHPF → splitter
 *     FUZZ path: fuzzPreGain → antiAliasLPF1 → fuzzClipper → fuzzGain
 *     OCTAVE path: octavePreGain → antiAliasLPF2 → rectifier → octaveBPF
 *                  → octaveGain
 *   splitter → mixer → dcBlocker → postLPF → postHPF → outputGain
 *            → wetGain → output
 *
 * Params: fuzz (0-100), volume (0-100), octave_blend (0-100)
 */
class FuzzlordChimeEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzzlord Chime', 'fuzzlordchime');

    // ===== Input HPF =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== FUZZ PATH =====
    this.fuzzPreGain = audioContext.createGain();
    this.fuzzPreGain.gain.value = 6.0;

    // Pre-emphasis for fuzz (boost mids before clipping)
    this.fuzzMidBoost = audioContext.createBiquadFilter();
    this.fuzzMidBoost.type = 'peaking';
    this.fuzzMidBoost.frequency.value = 900;
    this.fuzzMidBoost.Q.value = 0.7;
    this.fuzzMidBoost.gain.value = 4;

    // Anti-alias LPF (fuzz path)
    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    // Fuzz clipper (heavy, chaotic)
    this.fuzzClipper = audioContext.createWaveShaper();
    this.fuzzClipper.oversample = '4x';
    this.fuzzClipper.curve = this._makeFuzzCurve(50);

    this.fuzzGain = audioContext.createGain();
    this.fuzzGain.gain.value = 0.7;

    // ===== OCTAVE PATH =====
    this.octavePreGain = audioContext.createGain();
    this.octavePreGain.gain.value = 8.0;

    // Octave HPF (isolate upper harmonics for cleaner octave tracking)
    this.octaveHPF = audioContext.createBiquadFilter();
    this.octaveHPF.type = 'highpass';
    this.octaveHPF.frequency.value = 250;
    this.octaveHPF.Q.value = 0.5;

    // Anti-alias LPF (octave path)
    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    // Rectifier (full-wave = frequency doubling = octave up)
    this.rectifier = audioContext.createWaveShaper();
    this.rectifier.oversample = '4x';
    this.rectifier.curve = this._makeRectifierCurve();

    // Bandpass filter to isolate the octave-up content
    this.octaveBPF = audioContext.createBiquadFilter();
    this.octaveBPF.type = 'bandpass';
    this.octaveBPF.frequency.value = 1400;
    this.octaveBPF.Q.value = 0.5;

    // Octave post-processing
    this.octavePostClip = audioContext.createWaveShaper();
    this.octavePostClip.oversample = '4x';
    this.octavePostClip.curve = this._makeOctaveClipCurve();

    this.octaveGain = audioContext.createGain();
    this.octaveGain.gain.value = 0.0; // controlled by octave_blend

    // ===== Mixer =====
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post filtering =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 6500;
    this.postLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;
    this.postHPF.Q.value = 0.5;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.35;

    // ===== Routing =====
    this.input.connect(this.inputHPF);

    // Fuzz path
    this.inputHPF.connect(this.fuzzMidBoost);
    this.fuzzMidBoost.connect(this.fuzzPreGain);
    this.fuzzPreGain.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.fuzzClipper);
    this.fuzzClipper.connect(this.fuzzGain);
    this.fuzzGain.connect(this.mixer);

    // Octave path
    this.inputHPF.connect(this.octaveHPF);
    this.octaveHPF.connect(this.octavePreGain);
    this.octavePreGain.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.rectifier);
    this.rectifier.connect(this.octaveBPF);
    this.octaveBPF.connect(this.octavePostClip);
    this.octavePostClip.connect(this.octaveGain);
    this.octaveGain.connect(this.mixer);

    // Output chain
    this.mixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postLPF);
    this.postLPF.connect(this.postHPF);
    this.postHPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      fuzz: 50,
      volume: 70,
      octave_blend: 30
    };

    this._applyOctaveBlend(30);
  }

  /**
   * Heavy fuzz clipping curve – wild, chaotic, harmonically rich.
   */
  _makeFuzzCurve(fuzz) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 2 + (fuzz / 100) * 10;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Heavy asymmetric clipping (chaotic character)
      const vtPos = 0.18;
      const vtNeg = 0.24;
      const knee = 0.12;

      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // Hard saturation
      y = Math.tanh(y * 2.5);

      // Chaotic harmonic content
      y += 0.08 * Math.sin(x * drive * Math.PI * 2);
      y += 0.05 * Math.tanh(x * drive * 3);

      // Asymmetry for "spit"
      y *= x >= 0 ? 1.12 : 0.88;

      curve[i] = Math.max(-1, Math.min(1, y * 0.85));
    }
    return curve;
  }

  /**
   * Full-wave rectifier curve: |x| – creates frequency doubling (octave up).
   */
  _makeRectifierCurve() {
    const n = 65536;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Full-wave rectification with slight smoothing
      curve[i] = Math.abs(x) * 0.95;
    }
    return curve;
  }

  /**
   * Post-rectifier clipping to add grit to the octave signal.
   */
  _makeOctaveClipCurve() {
    const n = 65536;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * 3;
      y = Math.tanh(y * 1.5);
      // Add harmonic richness
      y += 0.06 * Math.sin(x * Math.PI * 4);
      curve[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    return curve;
  }

  /**
   * Blend between fuzz and octave paths.
   */
  _applyOctaveBlend(blend) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, blend)) / 100;
    // Fuzz always present, octave blends in
    this.fuzzGain.gain.setTargetAtTime(0.7, now, 0.01);
    this.octaveGain.gain.setTargetAtTime(t * 0.9, now, 0.01);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'fuzz': {
        const g = 2 + (value / 100) * 14;
        this.fuzzPreGain.gain.setTargetAtTime(g, now, 0.01);
        this.fuzzClipper.curve = this._makeFuzzCurve(value);
        // Also push octave pre-gain
        const og = 4 + (value / 100) * 10;
        this.octavePreGain.gain.setTargetAtTime(og, now, 0.01);
        // Higher fuzz → tighter post LPF
        const lpf = 7500 - (value / 100) * 3000;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
        break;
      }

      case 'volume':
        this.outputGain.gain.setTargetAtTime((value / 100) * 0.7, now, 0.01);
        break;

      case 'octave_blend':
        this._applyOctaveBlend(value);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputHPF.disconnect();
      this.fuzzMidBoost.disconnect();
      this.fuzzPreGain.disconnect();
      this.antiAliasLPF1.disconnect();
      this.fuzzClipper.disconnect();
      this.fuzzGain.disconnect();
      this.octaveHPF.disconnect();
      this.octavePreGain.disconnect();
      this.antiAliasLPF2.disconnect();
      this.rectifier.disconnect();
      this.octaveBPF.disconnect();
      this.octavePostClip.disconnect();
      this.octaveGain.disconnect();
      this.mixer.disconnect();
      this.dcBlocker.disconnect();
      this.postLPF.disconnect();
      this.postHPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FuzzlordChimeEffect;
