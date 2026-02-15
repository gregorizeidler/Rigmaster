import BaseEffect from './BaseEffect';

/**
 * IbanezTS808Effect
 *
 * Classic Ibanez TS808 Tube Screamer – the original green machine.
 * Faithful to the vintage JRC4558D op-amp circuit with germanium
 * clipping diodes for softer, warmer saturation.
 *
 * Key characteristics:
 *  - Softer germanium-diode clipping (lower threshold, rounder knee)
 *  - Prominent mid-hump centred at ~720 Hz (narrower than TS9)
 *  - Less available gain than the TS9/TS10 variants
 *  - Bass roll-off before clipping (characteristic of all TS circuits)
 *  - Warm, compressed tone even at low drive settings
 *
 * Params: overdrive (0-100), tone (0-100), level (0-100)
 */
class IbanezTS808Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Ibanez TS808', 'ibanezts808');

    // ===== Input conditioning =====
    // Sub-bass HPF – remove rumble before clipping stage
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== TS808 Mid-Hump EQ (signature sound) =====
    // The TS808 feedback network creates a resonant peak around 720 Hz
    // with a gentle bass roll-off – this is THE sound of the pedal
    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 720;
    this.midHump.Q.value = 1.2; // narrower than TS9 for vintage character
    this.midHump.gain.value = 7;

    // Bass cut before clipping – TS808 rolls off lows aggressively
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 340; // higher than TS9 – vintage spec
    this.preBassHPF.Q.value = 0.5;

    // ===== Pre-gain stage (4558 op-amp character) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.0; // lower max gain than TS9

    // ===== Anti-alias LPF before WaveShaper =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== WaveShaper – germanium diode clipping =====
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeTS808Curve(50);

    // ===== DC Blocker HPF after WaveShaper =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip tone shaping =====
    // Tone control – single-pole LPF like the original RC network
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2200;
    this.toneLPF.Q.value = 0.5;

    // Post high-pass – restore a bit of tightness
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 120;
    this.postHPF.Q.value = 0.5;

    // Gentle high-shelf to soften fizz (vintage germanium rolloff)
    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 4500;
    this.highShelf.gain.value = -2;

    // ===== Output level =====
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.5;

    // ===== Signal routing =====
    // Wet path:
    // input -> inHPF -> preBassHPF -> midHump -> preGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> toneLPF -> postHPF -> highShelf -> levelGain
    //   -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.midHump);
    this.midHump.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.highShelf);
    this.highShelf.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (BaseEffect bypass):
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal parameter state =====
    this.params = {
      overdrive: 50,
      tone: 50,
      level: 70
    };
  }

  /**
   * Generate the TS808 germanium-diode clipping curve.
   * Germanium diodes have a lower forward voltage (~0.3V) than silicon (~0.6V),
   * producing softer, earlier onset clipping with rounder harmonic content.
   * Slight asymmetry adds even-order harmonics (warmth).
   */
  _makeTS808Curve(overdrive) {
    const n = 65536;
    const curve = new Float32Array(n);

    // Drive multiplier – TS808 has LESS gain range than TS9
    const driveMul = 1 + (overdrive / 100) * 3.5; // ~1..4.5
    // Germanium diode knee – softer than silicon
    const geKnee = 0.65;
    // Slight asymmetry for even-order harmonic warmth
    const asymPos = 1.08;
    const asymNeg = 0.92;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1; // -1..+1
      let y = x * driveMul;

      // Soft germanium clipping – lower threshold, rounder knee
      y = Math.tanh(y * geKnee);

      // Asymmetric clipping (even harmonics)
      if (x >= 0) {
        y *= asymPos;
      } else {
        y *= asymNeg;
      }

      // Gentle compression – 4558 op-amp sag character
      y *= 1 - 0.05 * Math.min(1, Math.abs(x));

      // Touch of second-harmonic warmth
      y += 0.015 * Math.tanh(x * driveMul * 1.5);

      // Slight low-level smoothing (germanium crossover softness)
      const crossover = 0.02 * Math.sin(x * Math.PI * 0.5);
      y += crossover;

      curve[i] = y * 0.92;
    }
    return curve;
  }

  /** Map 0-100 knob to a range [min, max] */
  _map(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'overdrive': {
        // Update pre-gain (less range than TS9)
        const gain = 1 + (value / 100) * 3.5;
        this.preGain.gain.setTargetAtTime(gain, now, 0.01);
        // Regenerate clipping curve
        this.clip.curve = this._makeTS808Curve(value);
        // Adjust mid-hump intensity with drive (higher drive = more hump)
        const humpGain = 5 + (value / 100) * 4; // 5..9 dB
        this.midHump.gain.setTargetAtTime(humpGain, now, 0.02);
        break;
      }

      case 'tone': {
        // Tone sweeps LPF cutoff: 800 Hz (dark) to 4500 Hz (bright)
        const cutoff = this._map(value, 800, 4500);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        // High shelf tracks tone – less fizz when dark
        const shelfGain = this._map(value, -4, 0);
        this.highShelf.gain.setTargetAtTime(shelfGain, now, 0.02);
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
      this.preBassHPF.disconnect();
      this.midHump.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.highShelf.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default IbanezTS808Effect;
