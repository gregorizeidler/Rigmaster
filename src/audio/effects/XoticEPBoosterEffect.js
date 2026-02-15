import BaseEffect from './BaseEffect';

/**
 * XoticEPBoosterEffect (turbo)
 * Echoplex EP-3 preamp vibe, com:
 *  - Tilt-EQ (tone)        -> shelves opostos
 *  - Lowcut/Highcut        -> controle de corpo/brilho
 *  - Headroom & Bias       -> sensação de "tubo"/assimetria
 *  - Comp ajustável        -> cola mais forte se quiser
 *  - Bright/Fat switches   -> presets rápidos
 *  - Blend wet/dry         -> sempre no lugar na mix
 *  - Cab-sim simples       -> LPF removível p/ direto na mesa
 *
 * Params aceitos:
 *   boost, level, tone, lowcut, highcut, headroom, bias,
 *   comp, bright (0/1), fat (0/1), blend, cab (0/1)
 */
class XoticEPBoosterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Xotic EP Booster', 'xoticep');

    // Curve cache (Map, composite key, 8192 samples)
    this._curveCache = new Map();

    // Track ALL params for cross-recalculation
    this.params = {
      boost: 50,
      level: 80,
      tone: 50,
      lowcut: 10,
      highcut: 80,
      headroom: 50,
      bias: 40,
      comp: 40,
      bright: 0,
      fat: 0,
      blend: 100,
      cab: 0,
    };

    // -------- Pre/Protection --------
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 30;

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;

    // Anti-alias pre-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // -------- Preamp EP-3 --------
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.oversample = '4x';
    // Set default curve immediately (avoids null-curve frame)
    this.preampShaper.curve = this._getCachedCurve(50, 0.1);

    // DC blocker post-saturation
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // -------- Compression (EP glue) --------
    this.comp = audioContext.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 16;
    this.comp.ratio.value = 2.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    // -------- EQ --------
    // Body (low-mid) & Presence (hi-mid)
    this.body = audioContext.createBiquadFilter();
    this.body.type = 'peaking';
    this.body.frequency.value = 400;
    this.body.Q.value = 0.8;
    this.body.gain.value = 1; // default character

    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 2400;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = 2; // default character

    // Tilt-EQ: pair of shelves for musical "tone" control
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 180;
    this.lowShelf.gain.value = 0;

    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3200;
    this.highShelf.gain.value = 0;

    // Band limiters (Lowcut/Highcut)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 35;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 16000;

    // Nyquist-safe "off" frequency (works at any sample rate, even 32k)
    this._cabOff = audioContext.sampleRate * 0.5 * 0.95;

    // Cab-sim (lower LPF) — optional
    this.cabSim = audioContext.createBiquadFilter();
    this.cabSim.type = 'lowpass';
    this.cabSim.frequency.value = this._cabOff;
    this.cabSim.Q.value = 0.8;

    // -------- Output / Blend --------
    // Separated: boostGain (main boost) + makeupGain (auto) + levelGain (user)
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.5;

    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 1.0;

    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.8;

    // Blend wet/dry (valid for a booster)
    this.blendVal = 1.0; // 100% wet default
    this.wetGain.gain.value = 1.0;
    this.dryGain.gain.value = 0;

    // -------- Signal Chain --------
    // input → preHPF → inputGain → antiAliasLPF → preampShaper → dcBlock
    //       → comp → body → presence → lowShelf → highShelf
    //       → postHPF → postLPF → cabSim
    //       → boostGain → makeupGain → levelGain → wetGain → output
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preampShaper);
    this.preampShaper.connect(this.dcBlock);
    this.dcBlock.connect(this.comp);
    this.comp.connect(this.body);
    this.body.connect(this.presence);
    this.presence.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.cabSim);
    this.cabSim.connect(this.boostGain);
    this.boostGain.connect(this.makeupGain);
    this.makeupGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (for blend)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial state so audio matches params/UI from the start
    this.updateParameter('boost', this.params.boost);
    this.updateParameter('level', this.params.level);
    this.updateParameter('tone', this.params.tone);
    this.updateParameter('lowcut', this.params.lowcut);
    this.updateParameter('highcut', this.params.highcut);
    this.updateParameter('headroom', this.params.headroom);
    this.updateParameter('bias', this.params.bias);
    this.updateParameter('comp', this.params.comp);
    this.updateParameter('bright', this.params.bright);
    this.updateParameter('fat', this.params.fat);
    this.updateParameter('blend', this.params.blend);
    this.updateParameter('cab', this.params.cab);
  }

  // =========================================
  // CURVE CACHE (Map, composite key, 8192 samples, clamped ±1)
  // =========================================
  _getCachedCurve(headroom, bias) {
    // Quantize: headroom to integer, bias to 0.01 steps
    // Limits cache to ~101 * ~26 = ~2626 max entries (realistic: far fewer)
    const h = Math.round(headroom);
    const bq = Math.round(bias * 100) / 100;
    const key = `${h}_${Math.round(bq * 1000)}`;
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makeEPCurve(h, bq));
    }
    return this._curveCache.get(key);
  }

  _makeEPCurve(headroom = 50, bias = 0.1) {
    const n = 8192;
    const c = new Float32Array(n);
    // headroom baixo = mais drive
    const drive = 1.1 + (100 - headroom) / 70; // ~1.1..2.5
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // base: soft EP saturation
      let y = Math.tanh(x * drive * 1.25);
      // soft even harmonics (EP color)
      y += 0.06 * Math.tanh(x * drive * 3.0);
      // slight asymmetry
      y *= x >= 0 ? (1 + bias) : (1 - bias * 0.6);
      // subtle amplitude-dependent compression
      y *= (1 - 0.08 * Math.min(1, Math.abs(x)));
      // Clamp to ±1
      c[i] = Math.max(-1, Math.min(1, y * 0.95));
    }
    return c;
  }

  /** Public API (compat) — returns cached curve */
  makeEPCurve(headroom, bias) {
    return this._getCachedCurve(headroom, bias);
  }

  // =========================================
  // MAKEUP GAIN (auto compensation for boost level)
  // =========================================
  _recalcMakeup() {
    const now = this.audioContext.currentTime;
    const b = this.params.boost;
    // boost 0→100 maps to 1x→3x, so compensate inversely
    // Non-linear: gentle at low boost, stronger at high
    const makeup = 1.0 / (1 + (b / 100) * 1.2); // ~1.0 → ~0.45
    this.makeupGain.gain.setTargetAtTime(makeup, now, 0.03);
  }

  // =========================================
  // UNIFIED COMP THRESHOLD (comp base + boost offset)
  // Prevents boost and comp knobs from "fighting" each other.
  // =========================================
  _recalcCompThreshold() {
    const now = this.audioContext.currentTime;
    const k = this.params.comp / 100;        // 0..1
    const b = this.params.boost / 100;       // 0..1
    // comp sets the base: -26 (max squash) to -12 (lightest)
    const base = -26 + k * 14;
    // boost offsets: more boost → raise threshold (less aggressive), up to +8 dB
    const offset = b * 8;
    this.comp.threshold.setTargetAtTime(base + offset, now, 0.03);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    // Clamp all knob inputs to 0..100 (except toggles handled per-case)
    if (param !== 'bright' && param !== 'fat' && param !== 'cab') {
      value = Math.max(0, Math.min(100, value));
    }

    switch (param) {
      // Boost: 1x..3x + comp interaction + auto-makeup
      case 'boost': {
        this.params.boost = value;
        const amt = 1 + (value / 100) * 2;
        this.boostGain.gain.setTargetAtTime(amt, now, 0.01);
        // Unified comp threshold (boost + comp together)
        this._recalcCompThreshold();
        // Auto-makeup so volume doesn't jump
        this._recalcMakeup();
        break;
      }

      case 'level':
        this.params.level = value;
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      // Tilt-EQ: +hi = open treble, hold bass (and vice-versa)
      case 'tone': {
        this.params.tone = value;
        const t = (value - 50) / 50; // -1..+1
        const tiltDb = 6 * t;        // up to ±6 dB
        this.highShelf.gain.setTargetAtTime( tiltDb, now, 0.01);
        this.lowShelf.gain.setTargetAtTime(-tiltDb, now, 0.01);
        break;
      }

      // Lowcut 20..200 Hz
      case 'lowcut':
        this.params.lowcut = value;
        this.postHPF.frequency.setTargetAtTime(20 + (value / 100) * 180, now, 0.01);
        break;

      // Highcut 4k..18k
      case 'highcut':
        this.params.highcut = value;
        this.postLPF.frequency.setTargetAtTime(4000 + (value / 100) * 14000, now, 0.01);
        break;

      // Headroom (0..100) — cached curve
      case 'headroom': {
        this.params.headroom = value;
        const bias = this.params.bias / 100 * 0.25;
        this.preampShaper.curve = this._getCachedCurve(value, bias);
        break;
      }

      // Bias (0..100) — cached curve
      case 'bias': {
        this.params.bias = value;
        const b = (value / 100) * 0.25; // 0..0.25
        this.preampShaper.curve = this._getCachedCurve(this.params.headroom, b);
        break;
      }

      // Comp (0..100): increases ratio + unified threshold
      case 'comp': {
        this.params.comp = value;
        const k = value / 100;
        this.comp.ratio.setTargetAtTime(1.5 + k * 4, now, 0.05);   // 1.5..5.5
        // Unified comp threshold (comp + boost together)
        this._recalcCompThreshold();
        break;
      }

      // Bright switch: toggles between default presence and boosted
      case 'bright':
        this.params.bright = value ? 1 : 0;
        // Default presence = 2 dB, bright = 4.5 dB (not 0 when off)
        this.presence.gain.setTargetAtTime(value ? 4.5 : 2, now, 0.01);
        break;

      // Fat switch: toggles between default body and boosted
      case 'fat':
        this.params.fat = value ? 1 : 0;
        // Default body = 1 dB, fat = 3 dB (not 0 when off)
        this.body.gain.setTargetAtTime(value ? 3 : 1, now, 0.01);
        break;

      // Blend wet/dry
      case 'blend': {
        this.params.blend = value;
        const bl = value / 100;
        this.blendVal = bl;
        this.wetGain.gain.setTargetAtTime(bl, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - bl, now, 0.01);
        break;
      }

      // Cab-sim on/off (LPF strong vs Nyquist-safe transparent)
      case 'cab':
        this.params.cab = value ? 1 : 0;
        this.cabSim.frequency.setTargetAtTime(value ? 6000 : this._cabOff, now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.inputGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.preampShaper.disconnect();
      this.dcBlock.disconnect();
      this.comp.disconnect();
      this.body.disconnect();
      this.presence.disconnect();
      this.lowShelf.disconnect();
      this.highShelf.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.cabSim.disconnect();
      this.boostGain.disconnect();
      this.makeupGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    // Free cache
    this._curveCache.clear();
  }
}

export default XoticEPBoosterEffect;
