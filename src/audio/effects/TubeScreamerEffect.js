import BaseEffect from './BaseEffect';

/**
 * TubeScreamerEffect (turbo)
 * 
 * Ibanez TS808/TS9 com upgrades:
 *  - Controle de diodos (si/led/ge/hard)
 *  - Assimetria e dureza ajustáveis
 *  - Mid-hump configurável (freq, Q, gain)
 *  - Fat/Bright switches
 *  - Lowcut/Highcut ajustáveis
 *  - Mix wet/dry (equal-power)
 *
 * Params aceitos:
 *   drive, tone, level, mix, lowcut, highcut,
 *   mids, q, hump, fat (0/1), bright (0/1),
 *   diode ('si'|'led'|'ge'|'hard'), asym, hard
 */
class TubeScreamerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tube Screamer', 'tubescreamer');

    // Curve cache (Map, composite key, 8192 samples)
    this._curveCache = new Map();

    // ========= Defaults / Params =========
    this.params = {
      drive: 50,
      tone: 50,
      level: 70,
      mix: 100,        // 0..100
      lowcut: 10,      // maps to 20..300 Hz
      highcut: 85,     // maps to 3k..16k (post-clip)
      mids: 720,       // Hz (mid-hump center)
      q: 1.0,
      hump: 6,         // dB
      fat: 0,          // 0/1
      bright: 0,       // 0/1
      diode: 'si',     // 'si' | 'led' | 'ge' | 'hard'
      asym: 12,        // 0..30 (% asymmetry)
      hard: 35         // 0..100 (clip hardness)
    };

    // ========= Pre/Protection =========
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 25;

    // ========= Mid-hump EQ (classic TS character) =========
    // HPF + peaking work together — both track the "mids" param
    this.hpfTS = audioContext.createBiquadFilter();
    this.hpfTS.type = 'highpass';
    this.hpfTS.frequency.value = 720;

    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 720;
    this.midHump.Q.value = 1.0;
    this.midHump.gain.value = 6;

    // ========= Anti-alias (fixed high, pre-clip protection only) =========
    // 18k keeps "air" open — post-clip LPFs (tone/highcut/polish) handle fizz
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ========= Pre-gain / Clip =========
    // preGain is the SOLE drive control; curve defines character only
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 3.0;

    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    // Set default curve immediately
    this.clip.curve = this._getCachedCurve(
      this.params.drive, this.params.asym,
      this.params.hard, this.params.diode
    );

    // ========= DC blocker post-clip =========
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ========= Post-clip polish LPF (dynamic: 16k clean → 10k max drive) =========
    this.polishLPF = audioContext.createBiquadFilter();
    this.polishLPF.type = 'lowpass';
    this.polishLPF.frequency.value = 16000;
    this.polishLPF.Q.value = 0.707;

    // ========= Tone (post-clip LPF sweep) =========
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2000;

    // ========= Highcut (post-clip, separate from anti-alias) =========
    this.highcutLPF = audioContext.createBiquadFilter();
    this.highcutLPF.type = 'lowpass';
    this.highcutLPF.frequency.value = 14000;
    this.highcutLPF.Q.value = 0.707;

    // ========= Lowcut (post-clip HPF) =========
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 40;

    // ========= Shelves (fat / bright) =========
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 180;
    this.lowShelf.gain.value = 0;

    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3500;
    this.highShelf.gain.value = 0;

    // ========= Output: trimGain (auto attenuation) + levelGain (user) =========
    this.makeupGain = audioContext.createGain(); // named makeupGain for chain compat
    this.makeupGain.gain.value = 1.0;

    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.4;

    // ========= Signal Chain =========
    // input → inHPF → hpfTS → midHump → antiAliasLPF → preGain → clip
    //       → dcBlocker → polishLPF → toneLPF → highcutLPF → postHPF
    //       → lowShelf → highShelf → makeupGain → levelGain → wetGain → output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.hpfTS);
    this.hpfTS.connect(this.midHump);
    this.midHump.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preGain);
    this.preGain.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.polishLPF);
    this.polishLPF.connect(this.toneLPF);
    this.toneLPF.connect(this.highcutLPF);
    this.highcutLPF.connect(this.postHPF);
    this.postHPF.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.makeupGain);
    this.makeupGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (for mix)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial state
    this._applyDrive();
    this.updateParameter('tone', this.params.tone);
    this.updateParameter('level', this.params.level);
    this.updateParameter('mix', this.params.mix);
    this.updateParameter('lowcut', this.params.lowcut);
    this.updateParameter('highcut', this.params.highcut);
    this.updateParameter('mids', this.params.mids);
    this.updateParameter('q', this.params.q);
    this.updateParameter('hump', this.params.hump);
    this.updateParameter('fat', this.params.fat);
    this.updateParameter('bright', this.params.bright);
  }

  // =========================================
  // CURVE CACHE (Map, composite key, 8192 samples, clamped ±1)
  // =========================================
  _getCachedCurve(drive, asym, hard, diode) {
    // drive only affects preGain now; asym/hard/diode shape the curve
    // algo version prevents stale cache if curve formula changes
    const key = `v2_${Math.round(asym)}_${Math.round(hard)}_${diode}`;
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makeClipCurve(asym, hard, diode));
    }
    return this._curveCache.get(key);
  }

  /**
   * Internal: clip curve shaped by character params only (not drive).
   * Drive is handled entirely by preGain to avoid double-gain explosion.
   */
  _makeClipCurve(asym = 12, hard = 35, diode = 'si') {
    const n = 8192;
    const c = new Float32Array(n);

    // Fixed moderate gain inside curve — character shaping only
    const kDrive = 1.8;
    const asymFac = 1 + (asym / 100) * 0.8; // 1..1.8 (more noticeable)
    const hardness = 0.7 + (hard / 100) * 3.3;

    const diodeMap = { si: 1.0, led: 1.35, ge: 0.8, hard: 1.8 };
    const knee = hardness * (diodeMap[diode] ?? 1.0);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * kDrive;

      // Soft clip with diode-dependent knee
      y = Math.tanh(y * knee);

      // Asymmetry (positive side slightly hotter)
      y *= x >= 0 ? asymFac : (2 - asymFac);

      // Subtle opamp compression
      y *= (1 - 0.08 * Math.min(1, Math.abs(x)));

      // Clamp to ±1
      c[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    return c;
  }

  /** Public API (compat) — returns cached curve */
  makeClipCurve(drive, asym, hard, diode) {
    return this._getCachedCurve(drive, asym, hard, diode);
  }

  // Helper: map 0..100 → freq range
  _mapRange01(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  // =========================================
  // DRIVE (preGain is sole drive control + auto-trim + dynamic polish)
  // =========================================
  _applyDrive() {
    const now = this.audioContext.currentTime;
    const d = this.params.drive;
    // preGain: 1..6 (sole drive control)
    this.preGain.gain.setTargetAtTime(1 + (d / 100) * 5, now, 0.01);
    // Auto-trim: attenuate hotter signal from more saturation (not "makeup")
    this._recalcTrim();
    // Dynamic polish: tighter fizz control at high drive
    this._updatePolish();
    // Mid gain subtly increases with drive (TS pre-emphasis character)
    this._updateMidDrive();
  }

  // Auto-trim: more drive → hotter post-clip signal → attenuate to keep level stable
  _recalcTrim() {
    const now = this.audioContext.currentTime;
    const d = this.params.drive;
    // Non-linear attenuation: gentle at low drive, more at high; floor at 0.5
    const trim = Math.max(0.5, 0.95 - 0.40 * Math.pow(d / 100, 1.3));
    this.makeupGain.gain.setTargetAtTime(trim, now, 0.03);
  }

  // Polish LPF: dynamic with drive (16k at clean → 10k at max drive)
  _updatePolish() {
    const now = this.audioContext.currentTime;
    const d = this.params.drive / 100;
    this.polishLPF.frequency.setTargetAtTime(16000 - d * 6000, now, 0.02);
  }

  // Mid gain subtly tracks drive (TS pre-emphasis: more drive → slightly more mid push)
  _updateMidDrive() {
    const now = this.audioContext.currentTime;
    const d = this.params.drive / 100;
    const baseHump = this.params.hump;
    // Add up to +2 dB of mid boost at max drive
    this.midHump.gain.setTargetAtTime(baseHump + d * 2, now, 0.02);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      // DRIVE: only preGain (curve is character-only)
      case 'drive':
        this.params.drive = Math.max(0, Math.min(100, value));
        this._applyDrive();
        break;

      // TONE: post-clip LPF 500..7000 Hz (wider range for TS character)
      case 'tone': {
        this.params.tone = Math.max(0, Math.min(100, value));
        const cutoff = this._mapRange01(value, 500, 7000);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        break;
      }

      // LEVEL: user volume (independent from makeup)
      case 'level':
        this.params.level = Math.max(0, Math.min(100, value));
        this.levelGain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
        break;

      // MIX: equal-power crossfade (sin/cos)
      case 'mix': {
        this.params.mix = Math.max(0, Math.min(100, value));
        const w = value / 100;
        this.wetGain.gain.setTargetAtTime(Math.sin(w * Math.PI / 2), now, 0.01);
        this.dryGain.gain.setTargetAtTime(Math.cos(w * Math.PI / 2), now, 0.01);
        break;
      }

      // LOWCUT: post-clip HPF 20..300 Hz
      case 'lowcut':
        this.params.lowcut = Math.max(0, Math.min(100, value));
        this.postHPF.frequency.setTargetAtTime(this._mapRange01(value, 20, 300), now, 0.01);
        break;

      // HIGHCUT: dedicated post-clip LPF 3k..16k (NOT the anti-alias)
      case 'highcut':
        this.params.highcut = Math.max(0, Math.min(100, value));
        this.highcutLPF.frequency.setTargetAtTime(this._mapRange01(value, 3000, 16000), now, 0.01);
        break;

      // MIDS: center freq for midHump + hpfTS slightly below (classic TS pre-emphasis)
      case 'mids': {
        const f = Math.max(400, Math.min(1200, value));
        this.params.mids = f;
        this.midHump.frequency.setTargetAtTime(f, now, 0.02);
        // HPF sits ~15% below peak for natural TS low-cut interaction
        this.hpfTS.frequency.setTargetAtTime(f * 0.85, now, 0.02);
        break;
      }

      case 'q':
        this.params.q = Math.max(0.3, Math.min(4, value));
        this.midHump.Q.setTargetAtTime(this.params.q, now, 0.02);
        break;

      case 'hump':
        this.params.hump = Math.max(-6, Math.min(12, value));
        // Re-apply with drive interaction (hump base + drive bonus)
        this._updateMidDrive();
        break;

      // FAT: shelf boost at 180 Hz (preserves default 0 when off)
      case 'fat':
        this.params.fat = value ? 1 : 0;
        this.lowShelf.gain.setTargetAtTime(value ? 3.5 : 0, now, 0.01);
        break;

      // BRIGHT: shelf boost at 3.5k (preserves default 0 when off)
      case 'bright':
        this.params.bright = value ? 1 : 0;
        this.highShelf.gain.setTargetAtTime(value ? 3.5 : 0, now, 0.01);
        break;

      // DIODE / ASYM / HARD: re-render curve (character only, no drive in curve)
      case 'diode': {
        const v = (value === 'si' || value === 'led' || value === 'ge' || value === 'hard') ? value : 'si';
        this.params.diode = v;
        this.clip.curve = this._getCachedCurve(
          this.params.drive, this.params.asym,
          this.params.hard, v
        );
        break;
      }

      case 'asym':
        this.params.asym = Math.max(0, Math.min(30, value));
        this.clip.curve = this._getCachedCurve(
          this.params.drive, this.params.asym,
          this.params.hard, this.params.diode
        );
        break;

      case 'hard':
        this.params.hard = Math.max(0, Math.min(100, value));
        this.clip.curve = this._getCachedCurve(
          this.params.drive, this.params.asym,
          this.params.hard, this.params.diode
        );
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
      this.hpfTS.disconnect();
      this.midHump.disconnect();
      this.antiAliasLPF.disconnect();
      this.preGain.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.polishLPF.disconnect();
      this.toneLPF.disconnect();
      this.highcutLPF.disconnect();
      this.postHPF.disconnect();
      this.lowShelf.disconnect();
      this.highShelf.disconnect();
      this.makeupGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    // Free cache
    this._curveCache.clear();
  }
}

export default TubeScreamerEffect;
