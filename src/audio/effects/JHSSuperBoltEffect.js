import BaseEffect from './BaseEffect';

/**
 * JHSSuperBoltEffect (turbo)
 * - Plexi-ish brit crunch com upgrades:
 *   1) HPF de entrada (tight)                -> param: lowcut
 *   2) DC-block pós-clip                     -> fix de offset
 *   3) Duplo clipping (op-amp + diodos)      -> mais textura e pares
 *   4) Post-LPF anti-areia                   -> param: highcut
 *   5) Mid voice ativo (mid hump)            -> param: mids
 *   6) Presence shelf                        -> param: presence
 *   7) "MORE" (hi/lo gain) + bias assimétr.  -> param: more / bias
 *   8) SAG (comp leve) + blend seco/molhado  -> param: sag / blend
 *   9) Cab-sim simples (LPF)                 -> param: cab
 *
 * Knobs/params aceitos:
 *   gain, tone, level, mids, presence, bias, more (0/1),
 *   lowcut, highcut, sag, blend, cab (0/1)
 */
class JHSSuperBoltEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'JHS Superbolt', 'jhssuperbolt');

    // Curve caches (Map, composite keys, 8192 samples)
    this._opampCache = new Map();
    this._diodeCache = new Map();

    // Track ALL params for cross-recalculation
    this.params = {
      gain: 50,
      tone: 50,
      level: 70,
      mids: 60,
      presence: 55,
      bias: 48,
      more: 1,
      lowcut: 20,
      highcut: 50,
      sag: 40,
      blend: 100,
      cab: 1,
    };

    // Derived drive values (used by gain AND bias)
    this._driveA = 60;
    this._driveB = 48;
    this._bias = 0.12;

    // Nyquist-safe cab-off frequency
    this._cabOff = audioContext.sampleRate * 0.5 * 0.95;

    // --- Pre / Tight ---
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 60;

    // Input gain stage
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;

    // Anti-alias pre-clip (16k — tighter than 18k for less fizz at high drive)
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 16000;
    this.antiAliasLPF.Q.value = 0.707;

    // Clipping 1 (op-amp style, base crunch)
    this.clipA = audioContext.createWaveShaper();
    this.clipA.oversample = '4x';
    this.clipA.curve = this._getCachedOpamp(this._driveA, this._bias);

    // DC blocker post-clip
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // Clipping 2 (diode blend for even harmonics / texture)
    this.clipB = audioContext.createWaveShaper();
    this.clipB.oversample = '4x';
    this.clipB.curve = this._getCachedDiode(this._driveB, this._bias * 0.9);

    // Post-clip LPF (raised default — avoids stacking darkness with tone + cab)
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 11000;
    this.postLPF.Q.value = 0.707;

    // Mid hump (Marshall Plexi vibe — wider Q for more musical sweep)
    this.midBoost = audioContext.createBiquadFilter();
    this.midBoost.type = 'peaking';
    this.midBoost.frequency.value = 1000;
    this.midBoost.Q.value = 1.3;
    this.midBoost.gain.value = 5;

    // Presence (high shelf)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 3500;
    this.presenceFilter.gain.value = 3;

    // Tone (lowpass sweep)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 5000;
    this.toneFilter.Q.value = 0.707;

    // SAG comp (amp feel when gain is high)
    this.sagComp = audioContext.createDynamicsCompressor();
    this.sagComp.threshold.value = -20;
    this.sagComp.knee.value = 6;
    this.sagComp.ratio.value = 3;
    this.sagComp.attack.value = 0.006;
    this.sagComp.release.value = 0.10;

    // Cab sim (LPF) — toggleable
    this.cabSim = audioContext.createBiquadFilter();
    this.cabSim.type = 'lowpass';
    this.cabSim.frequency.value = 5500;
    this.cabSim.Q.value = 0.9;

    // =========================================
    // SEPARATED GAIN STAGES:
    //   makeupGain — auto compensation (inverse of gain/more)
    //   levelGain  — user volume knob (independent)
    // =========================================
    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 1.0;

    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.7;

    // =========================================
    // SIGNAL CHAIN:
    // input → preHPF → inputGain → antiAliasLPF → clipA → dcBlock → clipB
    //       → postLPF → midBoost → presenceFilter → toneFilter
    //       → sagComp → cabSim → makeupGain → levelGain → wetGain → output
    // =========================================
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipA);
    this.clipA.connect(this.dcBlock);
    this.dcBlock.connect(this.clipB);
    this.clipB.connect(this.postLPF);
    this.postLPF.connect(this.midBoost);
    this.midBoost.connect(this.presenceFilter);
    this.presenceFilter.connect(this.toneFilter);
    this.toneFilter.connect(this.sagComp);
    this.sagComp.connect(this.cabSim);
    this.cabSim.connect(this.makeupGain);
    this.makeupGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (for blend)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial state so audio matches params/UI from the start
    this._applyGain();
    this._recalcSag();
    this.updateParameter('tone', this.params.tone);
    this.updateParameter('level', this.params.level);
    this.updateParameter('mids', this.params.mids);
    this.updateParameter('presence', this.params.presence);
    this.updateParameter('lowcut', this.params.lowcut);
    this.updateParameter('highcut', this.params.highcut);
    this.updateParameter('blend', this.params.blend);
    this.updateParameter('cab', this.params.cab);
  }

  // =========================================
  // CURVE CACHES (Map, composite key, 8192 samples, clamped ±1)
  // =========================================
  _getCachedOpamp(drive, bias) {
    const key = `${Math.round(drive)}_${Math.round(bias * 1000)}`;
    if (!this._opampCache.has(key)) {
      this._opampCache.set(key, this._makeOpampCurve(Math.round(drive), bias));
    }
    return this._opampCache.get(key);
  }

  _getCachedDiode(drive, bias) {
    const key = `${Math.round(drive)}_${Math.round(bias * 1000)}`;
    if (!this._diodeCache.has(key)) {
      this._diodeCache.set(key, this._makeDiodeCurve(Math.round(drive), bias));
    }
    return this._diodeCache.get(key);
  }

  // Op-amp soft clip with slight asymmetry
  _makeOpampCurve(drive = 35, asym = 0.12) {
    const n = 8192, c = new Float32Array(n);
    const g = 1 + drive / 25;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh(x * g * 1.8);
      y += 0.06 * Math.tanh(x * g * 3.2);
      y *= (x >= 0) ? (1 + asym) : (1 - asym * 0.6);
      y *= (1 - 0.10 * Math.min(1, Math.abs(x)));
      c[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    return c;
  }

  // Soft diode clipping for even harmonics / texture
  _makeDiodeCurve(drive = 28, asym = 0.10) {
    const n = 8192, c = new Float32Array(n);
    const g = 1 + drive / 22;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh(x * g * 1.4);
      y += 0.09 * Math.tanh(x * g * 5.0);
      y *= (x >= 0) ? (1 + asym) : (1 - asym);
      c[i] = Math.max(-1, Math.min(1, y * 0.88));
    }
    return c;
  }

  /** Public API (compat) */
  makeOpampCurve(drive, asym) { return this._getCachedOpamp(drive, asym); }
  makeDiodeCurve(drive, asym) { return this._getCachedDiode(drive, asym); }

  // =========================================
  // DERIVED DRIVE + CURVES (gain + more + bias all in one place)
  // =========================================
  _applyGain() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    const moreFactor = this.params.more ? 1.6 : 1.0;

    // Input gain: 0.6..3.6 (normal) or 0.6..5.4 (more)
    this.inputGain.gain.setTargetAtTime(0.6 + (g / 100) * 3 * moreFactor, now, 0.01);

    // Derive drive values and store them (so bias can reuse)
    this._driveA = 25 + g * 0.7 * (this.params.more ? 1.2 : 1.0);
    this._driveB = this._driveA * 0.8;

    // Update curves with current drive AND current bias
    this._applyCurves();

    // Auto-makeup (more gain → less output to compensate)
    this._recalcMakeup();
  }

  _applyCurves() {
    this.clipA.curve = this._getCachedOpamp(this._driveA, this._bias);
    this.clipB.curve = this._getCachedDiode(this._driveB, this._bias * 0.9);
  }

  // =========================================
  // MAKEUP GAIN (auto compensation for gain/more)
  // =========================================
  _recalcMakeup() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    const more = this.params.more ? 1 : 0;
    // Non-linear: gentle at low gain, stronger at high; more adds extra drop
    const t = g / 100;
    const makeup = Math.max(0.5, (0.95 - 0.45 * Math.pow(t, 1.3)) * (more ? 0.7 : 1.0));
    this.makeupGain.gain.setTargetAtTime(makeup, now, 0.03);
  }

  // =========================================
  // UNIFIED SAG (sag knob base + gain offset)
  // =========================================
  _recalcSag() {
    const now = this.audioContext.currentTime;
    const s = this.params.sag / 100;   // 0..1
    const g = this.params.gain / 100;  // 0..1
    // sag sets base ratio/threshold, gain adds offset
    const ratio = 2 + s * 4 + g * 2;  // 2..8
    const threshold = -28 + s * 14 + g * 6; // -28..-8
    this.sagComp.ratio.setTargetAtTime(Math.min(ratio, 10), now, 0.05);
    this.sagComp.threshold.setTargetAtTime(Math.min(threshold, -4), now, 0.05);
  }

  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    // Clamp all knob inputs to 0..100 (except toggles)
    if (param !== 'more' && param !== 'cab') {
      value = Math.max(0, Math.min(100, value));
    }

    switch (param) {
      // GAIN: input level + curves + sag + makeup (all via _applyGain)
      case 'gain':
        this.params.gain = value;
        this._applyGain();
        this._recalcSag();
        break;

      // Tone sweeps LPF (2k..10k)
      case 'tone':
        this.params.tone = value;
        this.toneFilter.frequency.setTargetAtTime(2000 + (value / 100) * 8000, now, 0.01);
        break;

      // Level (user volume — independent from makeup)
      case 'level':
        this.params.level = value;
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      // Mids: ±9 dB @ 1kHz (wider range for more Marshall character)
      case 'mids':
        this.params.mids = value;
        this.midBoost.gain.setTargetAtTime((value - 50) / 50 * 9, now, 0.01);
        break;

      // Presence: ±9 dB @ 3.5k
      case 'presence':
        this.params.presence = value;
        this.presenceFilter.gain.setTargetAtTime((value - 50) / 50 * 9, now, 0.01);
        break;

      // Bias (0..100 → asymmetry 0..0.25) — re-renders curves with CURRENT drive
      case 'bias': {
        this.params.bias = value;
        this._bias = 0.25 * (value / 100);
        // Re-render curves with stored _driveA/_driveB (not hardcoded values)
        this._applyCurves();
        break;
      }

      // MORE switch (0/1) — re-applies gain with new moreFactor
      case 'more':
        this.params.more = value ? 1 : 0;
        this._applyGain();
        this._recalcSag();
        break;

      // Lowcut 20..200 Hz
      case 'lowcut':
        this.params.lowcut = value;
        this.preHPF.frequency.setTargetAtTime(20 + (value / 100) * 180, now, 0.01);
        break;

      // Highcut 3k..16k
      case 'highcut':
        this.params.highcut = value;
        this.postLPF.frequency.setTargetAtTime(3000 + (value / 100) * 13000, now, 0.01);
        break;

      // SAG (0..100) — unified with gain
      case 'sag':
        this.params.sag = value;
        this._recalcSag();
        break;

      // Blend wet/dry
      case 'blend': {
        this.params.blend = value;
        const b = value / 100;
        this.wetGain.gain.setTargetAtTime(b, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - b, now, 0.01);
        break;
      }

      // Cab sim on/off (Nyquist-safe)
      case 'cab':
        this.params.cab = value ? 1 : 0;
        this.cabSim.frequency.setTargetAtTime(value ? 5500 : this._cabOff, now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
    }

    // Always keep params in sync (compat/UI generic access)
    this.params[param] = value;
  }

  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.inputGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipA.disconnect();
      this.dcBlock.disconnect();
      this.clipB.disconnect();
      this.postLPF.disconnect();
      this.midBoost.disconnect();
      this.presenceFilter.disconnect();
      this.toneFilter.disconnect();
      this.sagComp.disconnect();
      this.cabSim.disconnect();
      this.makeupGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
    // Free caches
    this._opampCache.clear();
    this._diodeCache.clear();
  }
}

export default JHSSuperBoltEffect;
