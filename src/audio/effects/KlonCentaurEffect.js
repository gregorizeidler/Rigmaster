import BaseEffect from './BaseEffect';

/**
 * KlonCentaurEffect (turbo)
 * 
 * Legendary transparent overdrive with:
 *  - Dual path (clean + dirty blend) — Klon's signature topology
 *  - Piecewise soft-knee clipping with per-side diode thresholds
 *  - Diode type selection (ge/si/led/hard)
 *  - Adjustable asymmetry (true threshold offset, not post-multiply)
 *  - Pre-clip HPF (prevents intermod/fart at high gain)
 *  - Bass cut, air cut, mid voicing
 *  - Equal-power internal sum + headroom trim
 *  - Mix wet/dry global
 *
 * Params:
 *   gain, treble, level, mix,
 *   diode ('ge'|'si'|'led'|'hard'), asym (0..50),
 *   bass_cut, air_cut, mid_db, pre_mid_db
 */
class KlonCentaurEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Klon Centaur', 'kloncentaur');

    // Curve cache (Map, composite key, 8192 samples)
    this._curveCache = new Map();

    // Track ALL params
    this.params = {
      gain: 50,
      treble: 50,
      level: 70,
      mix: 100,
      diode: 'ge',
      asym: 15,        // 0..50 (wider range, more noticeable)
      bass_cut: 20,    // maps to 20..200 Hz
      air_cut: 90,     // maps to 4k..18k
      mid_db: 0,       // -6..+6 dB
      pre_mid_db: 0,   // -4..+4 dB
    };

    // ===== Input protection =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;

    // ===== Clean path (always present — Klon signature) =====
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.65;

    // ===== Dirty path =====
    // Pre-EQ (mid voicing before clip)
    this.preEQ = audioContext.createBiquadFilter();
    this.preEQ.type = 'peaking';
    this.preEQ.frequency.value = 800;
    this.preEQ.Q.value = 0.7;
    this.preEQ.gain.value = 0;

    // Pre-clip HPF (prevents intermod/fart — adjustable, higher than inHPF)
    this.preClipHPF = audioContext.createBiquadFilter();
    this.preClipHPF.type = 'highpass';
    this.preClipHPF.frequency.value = 80;
    this.preClipHPF.Q.value = 0.707;

    // Dirty gain (drive push into the shaper)
    this.dirtyGain = audioContext.createGain();
    this.dirtyGain.gain.value = 2.0;

    // Anti-alias pre-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper (piecewise soft-knee)
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._getCachedCurve(this.params.gain, this.params.diode, this.params.asym);

    // DC blocker post-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Post-clip filters
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 15000;

    // Treble (high shelf — 2800 Hz, ±4 dB, more "Klon" attack/presence)
    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;

    // Mid voicing (transparent by default)
    this.midVoice = audioContext.createBiquadFilter();
    this.midVoice.type = 'peaking';
    this.midVoice.frequency.value = 1200;
    this.midVoice.Q.value = 0.9;
    this.midVoice.gain.value = 0;

    // ===== Summing: clean + dirty with headroom =====
    this.sumGain = audioContext.createGain();
    this.sumGain.gain.value = 1.0;

    // Headroom trim (auto — keeps sum from clipping)
    this.trimGain = audioContext.createGain();
    this.trimGain.gain.value = 1.0;

    // User level
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.7;
    this.level = this.levelGain; // alias for compat

    // ===== Signal Chain =====
    // input → inHPF ──┬── cleanGain ──────────────────────────── sumGain
    //                  └── preEQ → preClipHPF → dirtyGain → AA →
    //                      clip → dcBlocker → postHPF → postLPF →
    //                      treble → midVoice ──────────────────── sumGain
    // sumGain → trimGain → levelGain → wetGain → output
    this.input.connect(this.inHPF);

    // Clean path
    this.inHPF.connect(this.cleanGain);
    this.cleanGain.connect(this.sumGain);

    // Dirty path
    this.inHPF.connect(this.preEQ);
    this.preEQ.connect(this.preClipHPF);
    this.preClipHPF.connect(this.dirtyGain);
    this.dirtyGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.treble);
    this.treble.connect(this.midVoice);
    this.midVoice.connect(this.sumGain);

    // Sum → output
    this.sumGain.connect(this.trimGain);
    this.trimGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (global bypass blend)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial state
    this._applyGain();
    this.updateParameter('treble', this.params.treble);
    this.updateParameter('level', this.params.level);
    this.updateParameter('mix', this.params.mix);
    this.updateParameter('bass_cut', this.params.bass_cut);
    this.updateParameter('air_cut', this.params.air_cut);
    this.updateParameter('mid_db', this.params.mid_db);
    this.updateParameter('pre_mid_db', this.params.pre_mid_db);
  }

  // =========================================
  // CURVE CACHE (Map, composite key, 8192 samples, clamped ±1)
  // =========================================
  _getCachedCurve(drive, diode, asym) {
    const rDrive = Math.round(drive);
    const rAsym = Math.round(asym);
    const key = `v1_${rDrive}_${diode}_${rAsym}`;
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makeKlonCurve(rDrive, diode, rAsym));
    }
    return this._curveCache.get(key);
  }

  /**
   * Piecewise soft-knee clipping with per-side diode thresholds.
   * More realistic than post-multiply asymmetry:
   *   - Positive side has threshold thrPos
   *   - Negative side has threshold thrNeg (offset by asym)
   *   - Smooth knee transition (no tanh — uses exponential soft clip)
   */
  _makeKlonCurve(drive = 50, diode = 'ge', asym = 15) {
    const n = 8192;
    const c = new Float32Array(n);

    // Drive multiplier: wider range than before (1.5..5.0)
    const driveMul = 1.5 + (drive / 100) * 3.5;

    // Diode characteristics: threshold and softness
    const diodeMap = {
      ge:   { thr: 0.28, soft: 3.5 },  // germanium: low threshold, very soft
      si:   { thr: 0.45, soft: 4.5 },  // silicon: medium threshold, medium soft
      led:  { thr: 0.65, soft: 6.0 },  // LED: high threshold, cleaner
      hard: { thr: 0.20, soft: 12.0 }, // hard clip: low threshold, sharp knee
    };
    const d = diodeMap[diode] || diodeMap.ge;

    // Asymmetry offsets the thresholds per-side (true diode mismatch)
    const asymAmount = (asym / 100) * 0.35; // 0..0.175 at asym=50
    const thrPos = d.thr * (1 + asymAmount);
    const thrNeg = d.thr * (1 - asymAmount * 0.6);

    // Soft-knee function: linear below threshold, compressed above
    const softClip = (x, thr, softness) => {
      const ax = Math.abs(x);
      if (ax < thr) return x;
      const sign = x >= 0 ? 1 : -1;
      const excess = ax - thr;
      // Exponential knee: smooth transition into compression
      const compressed = thr + (1 - thr) * (1 - Math.exp(-softness * excess / (1 - thr)));
      return sign * compressed;
    };

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Per-side threshold clipping
      if (y >= 0) {
        y = softClip(y, thrPos, d.soft);
      } else {
        y = softClip(y, thrNeg, d.soft * 0.85); // neg side slightly harder
      }

      // Subtle even harmonics (opamp/diode character — cubic, not tube-ish tanh)
      y += 0.012 * x * x * x;

      // Gentle amplitude-dependent compression
      y *= 1 - 0.05 * Math.min(1, Math.abs(x));

      // Clamp to ±1
      c[i] = Math.max(-1, Math.min(1, y * 0.92));
    }
    return c;
  }

  /** Public API (compat) — normalizes inputs before cache lookup */
  makeKlonCurve(opts) {
    const drive = Math.max(0, Math.min(100, opts?.drive ?? 50));
    const asym = Math.max(0, Math.min(50, opts?.asym ?? 15));
    const diode = opts?.diode ?? 'ge';
    return this._getCachedCurve(drive, diode, asym);
  }

  // =========================================
  // GAIN: drive push + clean/dirty blend + headroom trim
  // =========================================
  _applyGain() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    const t = Math.max(0, Math.min(100, g)) / 100;

    // Dirty gain: 0.8..3.5 (wider range — Klon really pushes at high gain)
    const dirty = 0.8 + t * 2.7;
    // Clean gain: 0.85 → 0.15 (never fully zero — Klon signature)
    const clean = 0.85 * (1 - Math.pow(t, 0.6)) + 0.15;

    this.dirtyGain.gain.setTargetAtTime(dirty, now, 0.01);
    this.cleanGain.gain.setTargetAtTime(clean, now, 0.01);

    // Pre-clip HPF: tighter at high gain (80 → 115 Hz)
    this.preClipHPF.frequency.setTargetAtTime(80 + t * 35, now, 0.02);

    // Update curve
    this.clip.curve = this._getCachedCurve(g, this.params.diode, this.params.asym);

    // Headroom trim: compensate for louder dirty path
    // Equal-power-ish: attenuate sum as dirty increases
    const trim = Math.max(0.55, 1.0 - 0.40 * Math.pow(t, 1.1));
    this.trimGain.gain.setTargetAtTime(trim, now, 0.03);
  }

  // Helper: map 0..100 → [a..b]
  _map(v, a, b) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return a + t * (b - a);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'gain':
        this.params.gain = Math.max(0, Math.min(100, value));
        this._applyGain();
        break;

      // Treble: ±4 dB @ 2800 Hz (refined Klon presence)
      case 'treble': {
        this.params.treble = Math.max(0, Math.min(100, value));
        const dB = ((value - 50) / 50) * 4; // ±4 dB
        this.treble.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'level':
        this.params.level = Math.max(0, Math.min(100, value));
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      // Mix: equal-power crossfade
      case 'mix': {
        this.params.mix = Math.max(0, Math.min(100, value));
        const w = value / 100;
        this.wetGain.gain.setTargetAtTime(Math.sin(w * Math.PI / 2), now, 0.01);
        this.dryGain.gain.setTargetAtTime(Math.cos(w * Math.PI / 2), now, 0.01);
        break;
      }

      // Diode type (validated)
      case 'diode': {
        const v = (value === 'ge' || value === 'si' || value === 'led' || value === 'hard') ? value : 'ge';
        this.params.diode = v;
        this.clip.curve = this._getCachedCurve(this.params.gain, v, this.params.asym);
        break;
      }

      // Asymmetry 0..50 (true threshold offset)
      case 'asym':
        this.params.asym = Math.max(0, Math.min(50, value));
        this.clip.curve = this._getCachedCurve(this.params.gain, this.params.diode, this.params.asym);
        break;

      // Bass cut: 20..200 Hz (post-clip HPF)
      case 'bass_cut':
        this.params.bass_cut = Math.max(0, Math.min(100, value));
        this.postHPF.frequency.setTargetAtTime(this._map(value, 20, 200), now, 0.02);
        break;

      // Air cut: 4k..18k (post-clip LPF)
      case 'air_cut':
        this.params.air_cut = Math.max(0, Math.min(100, value));
        this.postLPF.frequency.setTargetAtTime(this._map(value, 4000, 18000), now, 0.02);
        break;

      // Mid voicing: -6..+6 dB (post-clip)
      case 'mid_db':
        this.params.mid_db = Math.max(-6, Math.min(6, value));
        this.midVoice.gain.setTargetAtTime(this.params.mid_db, now, 0.02);
        break;

      // Pre-mid voicing: -4..+4 dB (before clip)
      case 'pre_mid_db':
        this.params.pre_mid_db = Math.max(-4, Math.min(4, value));
        this.preEQ.gain.setTargetAtTime(this.params.pre_mid_db, now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.cleanGain.disconnect();
      this.preEQ.disconnect();
      this.preClipHPF.disconnect();
      this.dirtyGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.treble.disconnect();
      this.midVoice.disconnect();
      this.sumGain.disconnect();
      this.trimGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    // Free cache
    this._curveCache.clear();
  }
}

export default KlonCentaurEffect;
