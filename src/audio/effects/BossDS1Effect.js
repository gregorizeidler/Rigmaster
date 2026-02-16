import BaseEffect from './BaseEffect';

/**
 * BossDS1Effect (turbo)
 * 
 * Boss DS-1 Distortion com:
 *  - Hard clipping assimétrico tipo op-amp
 *  - Crossfade tone (dark/bright) igual ao original (equal-power)
 *  - Pré-ênfase antes do clip
 *  - Compressão transistor stage
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   dist, tone, level, mix, anti_alias_hz
 */
class BossDS1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'DS-1', 'bossds1');

    // Curve cache (Map, composite key, 8192 samples)
    this._curveCache = new Map();

    // Track ALL params
    this.params = {
      dist: 50,
      tone: 50,
      level: 70,
      mix: 100,
      anti_alias_hz: 15000,
    };

    // ===== Front-end / conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;

    // inputGain is the SOLE drive control (curve defines character only)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;

    // "Transistor stage" (subtle glue/attack)
    this.preComp = audioContext.createDynamicsCompressor();
    this.preComp.threshold.value = -20;
    this.preComp.knee.value = 10;
    this.preComp.ratio.value = 2.3;
    this.preComp.attack.value = 0.002;
    this.preComp.release.value = 0.09;

    // Pre-emphasis (boosts highs before clip — DS-1 signature)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 1000;
    this.preEmphasis.gain.value = 5.5;

    // ===== Anti-alias pre-clip (15kHz default — effective with oversample 4x) =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 15000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Distortion (op-amp hard clip, asymmetric) =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    // Set default curve immediately
    this.clipper.curve = this._getCachedCurve(50);

    // DC blocker post-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== TONE network (crossfade HPF/LPF — equal-power) =====
    // "dark" branch (LPF post-clip)
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2000;

    // "bright" branch (HPF post-clip)
    this.toneHPF = audioContext.createBiquadFilter();
    this.toneHPF.type = 'highpass';
    this.toneHPF.frequency.value = 720;

    // Crossfade gains
    this.toneXFadeA = audioContext.createGain(); // dark
    this.toneXFadeB = audioContext.createGain(); // bright
    this.toneXFadeA.gain.value = 0.5;
    this.toneXFadeB.gain.value = 0.5;

    // Sum of branches
    this.toneSum = audioContext.createGain();
    this.toneSum.gain.value = 1.0;

    // ===== Output: trimGain (auto) + levelGain (user) =====
    this.trimGain = audioContext.createGain();
    this.trimGain.gain.value = 1.0;

    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.45;

    // ===== Signal Chain =====
    // input → inHPF → inputGain → preComp → preEmphasis → antiAliasLPF → clipper
    //       → dcBlocker ──┬── toneLPF → toneXFadeA ──┬── toneSum
    //                     └── toneHPF → toneXFadeB ──┘
    //       → trimGain → levelGain → wetGain → output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preComp);
    this.preComp.connect(this.preEmphasis);
    this.preEmphasis.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);

    // Tone split
    this.dcBlocker.connect(this.toneLPF);
    this.dcBlocker.connect(this.toneHPF);
    this.toneLPF.connect(this.toneXFadeA);
    this.toneHPF.connect(this.toneXFadeB);
    this.toneXFadeA.connect(this.toneSum);
    this.toneXFadeB.connect(this.toneSum);

    // Output
    this.toneSum.connect(this.trimGain);
    this.trimGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // DS-1 is a distortion — 100% wet by default
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0;

    // Apply initial state
    this._applyDist();
    this._applyToneCrossfade(this.params.tone);
    this.updateParameter('level', this.params.level);
    this.updateParameter('mix', this.params.mix);
  }

  // =========================================
  // CURVE CACHE (Map, 8192 samples, clamped ±1)
  // =========================================
  _getCachedCurve(amount) {
    const key = Math.round(amount);
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makeDS1Curve(key));
    }
    return this._curveCache.get(key);
  }

  /**
   * DS-1 hard-clip curve: character only (drive is in inputGain).
   * Fixed moderate drive multiplier inside; knees define the asymmetric clip.
   */
  _makeDS1Curve(amount, posKnee = 0.7, negKnee = 0.6) {
    const n = 8192;
    const c = new Float32Array(n);
    // Fixed moderate drive inside curve (character shaping)
    const drive = 2.8;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Asymmetric hard knees (DS-1 op-amp clip)
      if (y > posKnee) {
        y = posKnee + (y - posKnee) * 0.1;
      } else if (y < -negKnee) {
        y = -negKnee + (y + negKnee) * 0.15;
      }

      // DS-1 harmonic content: odd + slight even
      y += 0.10 * Math.tanh(x * drive * 3);
      y += 0.05 * Math.tanh(x * drive * 2);

      // Clamp to ±1
      c[i] = Math.max(-1, Math.min(1, y * 0.8));
    }
    return c;
  }

  /** Public API (compat) — posKnee/negKnee baked into character curve */
  makeDS1Curve(amount) {
    return this._getCachedCurve(amount);
  }

  // =========================================
  // DRIVE (inputGain is sole drive + auto-trim)
  // =========================================
  _applyDist() {
    const now = this.audioContext.currentTime;
    const d = this.params.dist;
    // inputGain: 1..5 (sole drive control)
    this.inputGain.gain.setTargetAtTime(1 + (d / 100) * 4, now, 0.01);
    // Curve stays character-only (cached, explicit round for clarity)
    this.clipper.curve = this._getCachedCurve(Math.round(d));
    // Auto-trim: more dist → hotter signal → attenuate
    this._recalcTrim();
  }

  _recalcTrim() {
    const now = this.audioContext.currentTime;
    const d = this.params.dist / 100;
    const trim = Math.max(0.45, 0.95 - 0.45 * Math.pow(d, 1.2));
    this.trimGain.gain.setTargetAtTime(trim, now, 0.03);
  }

  // =========================================
  // TONE (equal-power crossfade dark/bright)
  // =========================================
  _applyToneCrossfade(value) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, value)) / 100;

    // Equal-power crossfade (no volume dip at center)
    const a = Math.cos(t * Math.PI * 0.5); // dark
    const b = Math.sin(t * Math.PI * 0.5); // bright
    this.toneXFadeA.gain.setTargetAtTime(a, now, 0.01);
    this.toneXFadeB.gain.setTargetAtTime(b, now, 0.01);

    // Sweep filter cutoffs for more useful range
    // LPF 1k..5k (dark→less treble / bright→more treble)
    this.toneLPF.frequency.setTargetAtTime(1000 + t * 4000, now, 0.01);
    // HPF 350..1200 (dark→less HPF / bright→more HPF)
    this.toneHPF.frequency.setTargetAtTime(350 + t * 850, now, 0.01);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'dist': {
        const v = Math.max(0, Math.min(100, value));
        this.params.dist = v;
        this._applyDist();
        break;
      }

      case 'tone': {
        const v = Math.max(0, Math.min(100, value));
        this.params.tone = v;
        this._applyToneCrossfade(v);
        break;
      }

      case 'level': {
        const v = Math.max(0, Math.min(100, value));
        this.params.level = v;
        this.levelGain.gain.setTargetAtTime((v / 100) * 0.75, now, 0.01);
        break;
      }

      case 'mix': {
        const v = Math.max(0, Math.min(100, value));
        this.params.mix = v;
        const w = v / 100;
        this.wetGain.gain.setTargetAtTime(Math.sin(w * Math.PI / 2), now, 0.01);
        this.dryGain.gain.setTargetAtTime(Math.cos(w * Math.PI / 2), now, 0.01);
        break;
      }

      case 'anti_alias_hz':
        this.params.anti_alias_hz = Math.max(4000, Math.min(18000, value));
        this.antiAliasLPF.frequency.setTargetAtTime(this.params.anti_alias_hz, now, 0.02);
        break;

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.inputGain.disconnect();
      this.preComp.disconnect();
      this.preEmphasis.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.toneLPF.disconnect();
      this.toneHPF.disconnect();
      this.toneXFadeA.disconnect();
      this.toneXFadeB.disconnect();
      this.toneSum.disconnect();
      this.trimGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    // Free cache
    this._curveCache.clear();
  }
}

export default BossDS1Effect;
