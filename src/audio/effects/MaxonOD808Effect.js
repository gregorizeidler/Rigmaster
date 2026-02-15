import BaseEffect from './BaseEffect';

/**
 * MaxonOD808Effect
 *
 * Maxon OD808 – the original manufacturer's premium TS808 reissue.
 * Built with the coveted JRC4558D op-amp and tighter component tolerances.
 *
 * Key characteristics vs. TS808:
 *  - JRC4558D op-amp: slightly brighter, more defined transients
 *  - Tighter bass response (less flub at higher drive)
 *  - Same mid-hump topology but with slightly higher Q
 *  - Slightly more open top end than vintage TS808
 *  - Premium silicon diode clipping (crisper than germanium)
 *
 * Params: drive (0-100), tone (0-100), level (0-100)
 */
class MaxonOD808Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Maxon OD808', 'maxonod808');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== TS-style Mid-Hump (tighter than TS808) =====
    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 740; // slightly higher centre
    this.midHump.Q.value = 1.4; // tighter Q than TS808
    this.midHump.gain.value = 7.5;

    // Tighter bass cut – Maxon has less low-end flub
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 380; // tighter than TS808 ~340
    this.preBassHPF.Q.value = 0.5;

    // Slight brightness boost (JRC4558D character)
    this.brightBoost = audioContext.createBiquadFilter();
    this.brightBoost.type = 'highshelf';
    this.brightBoost.frequency.value = 3200;
    this.brightBoost.gain.value = 1.5; // subtle brightness

    // ===== Drive stage =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.5;

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – silicon diode clipping (crisper than germanium)
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeOD808Curve(50);

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip tone shaping =====
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2500;
    this.toneLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 130;
    this.postHPF.Q.value = 0.5;

    // Post presence – JRC4558D has slightly more HF clarity
    this.postPresence = audioContext.createBiquadFilter();
    this.postPresence.type = 'peaking';
    this.postPresence.frequency.value = 2800;
    this.postPresence.Q.value = 0.8;
    this.postPresence.gain.value = 1.0;

    // Fizz taming shelf
    this.fizzShelf = audioContext.createBiquadFilter();
    this.fizzShelf.type = 'highshelf';
    this.fizzShelf.frequency.value = 5500;
    this.fizzShelf.gain.value = -1.5;

    // ===== Output level =====
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.5;

    // ===== Signal routing =====
    // Wet path:
    // input -> inHPF -> preBassHPF -> midHump -> brightBoost -> preGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> toneLPF -> postHPF -> postPresence -> fizzShelf -> levelGain
    //   -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.midHump);
    this.midHump.connect(this.brightBoost);
    this.brightBoost.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.postPresence);
    this.postPresence.connect(this.fizzShelf);
    this.fizzShelf.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      drive: 50,
      tone: 50,
      level: 70
    };
  }

  /**
   * OD808 silicon diode clipping curve.
   * Slightly crisper than germanium – higher forward voltage
   * results in more defined transient attack before clipping onset.
   */
  _makeOD808Curve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);

    const driveMul = 1 + (drive / 100) * 4.0; // 1..5
    const siKnee = 0.9; // silicon – firmer than germanium (0.65)
    const asymPos = 1.06;
    const asymNeg = 0.94;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Silicon diode clipping – firmer knee than germanium
      y = Math.tanh(y * siKnee);

      // Slight asymmetry
      y *= x >= 0 ? asymPos : asymNeg;

      // JRC4558D op-amp compression character
      y *= 1 - 0.06 * Math.min(1, Math.abs(x));

      // Subtle second harmonic
      y += 0.012 * Math.tanh(x * driveMul * 1.8);

      // Tighter transient feel
      const transient = 0.008 * x * Math.exp(-4 * x * x);
      y += transient;

      curve[i] = y * 0.93;
    }
    return curve;
  }

  _map(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        const gain = 1 + (value / 100) * 4.0;
        this.preGain.gain.setTargetAtTime(gain, now, 0.01);
        this.clip.curve = this._makeOD808Curve(value);
        // Mid-hump intensity tracks drive
        const humpGain = 5.5 + (value / 100) * 4; // 5.5..9.5 dB
        this.midHump.gain.setTargetAtTime(humpGain, now, 0.02);
        break;
      }

      case 'tone': {
        const cutoff = this._map(value, 900, 5500);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        // Fizz shelf tracks tone
        const fizzGain = this._map(value, -3, 0);
        this.fizzShelf.gain.setTargetAtTime(fizzGain, now, 0.02);
        // Brightness boost tracks tone
        const brightGain = this._map(value, 0, 2.5);
        this.brightBoost.gain.setTargetAtTime(brightGain, now, 0.02);
        break;
      }

      case 'level': {
        const vol = this._map(value, 0, 0.9);
        this.levelGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.midHump.disconnect();
      this.preBassHPF.disconnect();
      this.brightBoost.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.postPresence.disconnect();
      this.fizzShelf.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default MaxonOD808Effect;
