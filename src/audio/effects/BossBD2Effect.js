import BaseEffect from './BaseEffect';

/**
 * BossBD2Effect (turbo)
 * 
 * Boss BD-2 Blues Driver com:
 *  - Clipping suave amp-like com assimetria sutil
 *  - True tilt-EQ (symmetric low-shelf + high-shelf)
 *  - Pré-ênfase peaking para pick attack
 *  - SAG compression antes do clip (amp-like dynamic drive)
 *  - Body mid correction para madeira BD-2
 *  - Post-clip polish LPF
 *  - Mix wet/dry (equal-power)
 *
 * Params aceitos:
 *   gain, tone, level, mix
 */
class BossBD2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'BD-2', 'bossbd2');

    // Single character curve (generated once, reused)
    this._bd2Curve = null;

    // Track ALL params
    this.params = {
      gain: 50,
      tone: 50,
      level: 70,
      mix: 100,
    };

    // ===== Front-end / conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;

    // inputGain: sole drive control (base lower, knob does the work)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;

    // Pre-emphasis: peaking (not shelf) for focused pick attack without pushing all treble
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.value = 2200;
    this.preEmphasis.Q.value = 0.8;
    this.preEmphasis.gain.value = 2.5;

    // ===== SAG before clip (amp-like dynamic drive) =====
    this.sagComp = audioContext.createDynamicsCompressor();
    this.sagComp.threshold.value = -22;
    this.sagComp.knee.value = 12;
    this.sagComp.ratio.value = 2.0;
    this.sagComp.attack.value = 0.010;
    this.sagComp.release.value = 0.18;

    // ===== Anti-alias pre-clip (15kHz — balanced with oversample 4x) =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 15000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipping "amp-like" (character only, drive in inputGain) =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._ensureCurve();

    // DC blocker post-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip polish LPF (tames digital hash) =====
    this.polishLPF = audioContext.createBiquadFilter();
    this.polishLPF.type = 'lowpass';
    this.polishLPF.frequency.value = 13000;
    this.polishLPF.Q.value = 0.707;

    // ===== TONE: True tilt-EQ (symmetric shelves) =====
    this.toneLow = audioContext.createBiquadFilter();
    this.toneLow.type = 'lowshelf';
    this.toneLow.frequency.value = 280;

    this.toneHigh = audioContext.createBiquadFilter();
    this.toneHigh.type = 'highshelf';
    this.toneHigh.frequency.value = 2200;

    // Mid body correction (BD-2 "wood" character)
    this.bodyMid = audioContext.createBiquadFilter();
    this.bodyMid.type = 'peaking';
    this.bodyMid.frequency.value = 800;
    this.bodyMid.Q.value = 0.9;
    this.bodyMid.gain.value = 0;

    // ===== Output: trimGain (auto) + levelGain (user) =====
    this.trimGain = audioContext.createGain();
    this.trimGain.gain.value = 1.0;

    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.5;

    // ===== Signal Chain =====
    // input → inHPF → inputGain → preEmphasis → sagComp → antiAliasLPF
    //       → clipper → dcBlocker → polishLPF
    //       → toneLow → toneHigh → bodyMid
    //       → trimGain → levelGain → wetGain → output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preEmphasis);
    this.preEmphasis.connect(this.sagComp);
    this.sagComp.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.polishLPF);
    this.polishLPF.connect(this.toneLow);
    this.toneLow.connect(this.toneHigh);
    this.toneHigh.connect(this.bodyMid);
    this.bodyMid.connect(this.trimGain);
    this.trimGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // BD-2 is an overdrive — 100% wet by default
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0;

    // Apply initial state
    this._applyGain();
    this._applyToneTilt(this.params.tone);
    this.updateParameter('level', this.params.level);
    this.updateParameter('mix', this.params.mix);
  }

  // =========================================
  // CURVE (single character curve, peak-normalized, clamped ±1)
  // Drive is entirely in inputGain — curve defines character only.
  // =========================================
  _ensureCurve() {
    if (!this._bd2Curve) {
      this._bd2Curve = this._makeBD2Curve();
    }
    return this._bd2Curve;
  }

  _makeBD2Curve() {
    const n = 8192;
    const c = new Float32Array(n);
    const drive = 2.2;

    let maxAbs = 0;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Soft knee (BD-2 amp-like)
      y = Math.tanh(y * 1.5);

      // Even harmonics (warmth) + subtle asymmetry
      y += 0.08 * Math.tanh(x * drive * 2);
      if (x > 0) y *= 1.04;

      c[i] = y;
      const abs = Math.abs(y);
      if (abs > maxAbs) maxAbs = abs;
    }

    // Peak-normalize to ±0.92 (prevents volume jumps, keeps headroom)
    const norm = maxAbs > 0 ? 0.92 / maxAbs : 1;
    for (let i = 0; i < n; i++) {
      c[i] = Math.max(-1, Math.min(1, c[i] * norm));
    }
    return c;
  }

  /** Public API (compat) */
  makeBD2Curve() {
    return this._ensureCurve();
  }

  // =========================================
  // GAIN (inputGain is sole drive + auto-trim)
  // =========================================
  _applyGain() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    // inputGain: 1..5 (sole drive, base is 1.0 not 1.5)
    this.inputGain.gain.setTargetAtTime(1 + (g / 100) * 4, now, 0.01);
    // Curve is always the same (character only) — no need to re-set
    // inputGain is the sole drive control
    // Auto-trim
    this._recalcTrim();
  }

  _recalcTrim() {
    const now = this.audioContext.currentTime;
    const d = this.params.gain / 100;
    const trim = Math.max(0.45, 0.95 - 0.45 * Math.pow(d, 1.2));
    this.trimGain.gain.setTargetAtTime(trim, now, 0.03);
  }

  // =========================================
  // TONE: True symmetric tilt-EQ
  // =========================================
  _applyToneTilt(value) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, value)) / 100;
    const range = 8; // dB total per band

    // True tilt: symmetric around 0 (-range/2 .. +range/2)
    const tilt = (t - 0.5) * 2; // -1..+1
    const lowGain = -tilt * (range / 2);   // +4..-4 dB
    const highGain = tilt * (range / 2);   // -4..+4 dB
    // Mid compensation: slight opposite push to keep body consistent
    const midComp = -tilt * 1.0;           // -1..+1 dB

    this.toneLow.gain.setTargetAtTime(lowGain, now, 0.02);
    this.toneHigh.gain.setTargetAtTime(highGain, now, 0.02);
    this.bodyMid.gain.setTargetAtTime(midComp, now, 0.02);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'gain': {
        const v = Math.max(0, Math.min(100, value));
        this.params.gain = v;
        this._applyGain();
        break;
      }

      case 'tone': {
        const v = Math.max(0, Math.min(100, value));
        this.params.tone = v;
        this._applyToneTilt(v);
        break;
      }

      case 'level': {
        const v = Math.max(0, Math.min(100, value));
        this.params.level = v;
        // 0..1 = unity at 100%; use 1.2 for pedal-style boost if desired
    const levelMax = 1.0;
    this.levelGain.gain.setTargetAtTime((v / 100) * levelMax, now, 0.01);
        break;
      }

      case 'mix': {
        const v = Math.max(0, Math.min(100, value));
        this.params.mix = v;
        if (v >= 99.9) {
          this.wetGain.gain.setTargetAtTime(1, now, 0.01);
          this.dryGain.gain.setTargetAtTime(0, now, 0.01);
        } else {
          const w = v / 100;
          this.wetGain.gain.setTargetAtTime(Math.sin(w * Math.PI / 2), now, 0.01);
          this.dryGain.gain.setTargetAtTime(Math.cos(w * Math.PI / 2), now, 0.01);
        }
        break;
      }

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
      this.preEmphasis.disconnect();
      this.sagComp.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.polishLPF.disconnect();
      this.toneLow.disconnect();
      this.toneHigh.disconnect();
      this.bodyMid.disconnect();
      this.trimGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    this._bd2Curve = null;
  }
}

export default BossBD2Effect;
