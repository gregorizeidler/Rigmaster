import BaseEffect from './BaseEffect';

/**
 * DigitechBadMonkeyEffect
 *
 * Digitech Bad Monkey – budget TS-style overdrive with separate
 * bass and treble EQ controls (instead of a single "tone" knob).
 * Clean and transparent at low gain, with a warm midrange push.
 *
 * Signal chain:
 *   input → inputHPF → tsHPF → midHump → preGain → antiAliasLPF
 *         → clipper → dcBlocker → bassEQ → trebleEQ → postHPF
 *         → postLPF → outputGain → wetGain → output
 *
 * Params: gain (0-100), level (0-100), bass (0-100), treble (0-100)
 */
class DigitechBadMonkeyEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bad Monkey', 'digitechbadmonkey');

    // ===== Input HPF (sub-bass cut) =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== TS-style bass roll-off =====
    this.tsHPF = audioContext.createBiquadFilter();
    this.tsHPF.type = 'highpass';
    this.tsHPF.frequency.value = 500;
    this.tsHPF.Q.value = 0.5;

    // ===== Mid hump (TS character but gentler than TS808) =====
    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 700;
    this.midHump.Q.value = 0.8;
    this.midHump.gain.value = 4;

    // ===== Pre-gain =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.5;

    // ===== Anti-alias LPF =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper (diode-style, slightly softer than TS) =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeBadMonkeyCurve(50);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Bass EQ (low shelf – the Bad Monkey's bass knob) =====
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 250;
    this.bassEQ.gain.value = 0;

    // ===== Treble EQ (high shelf – the Bad Monkey's treble knob) =====
    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 3000;
    this.trebleEQ.gain.value = 0;

    // ===== Post HPF (tighten bottom after EQ) =====
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;
    this.postHPF.Q.value = 0.5;

    // ===== Post LPF (roll off harshness) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    this.postLPF.Q.value = 0.5;

    // ===== Presence (slight upper-mid clarity) =====
    this.presenceEQ = audioContext.createBiquadFilter();
    this.presenceEQ.type = 'peaking';
    this.presenceEQ.frequency.value = 4000;
    this.presenceEQ.Q.value = 0.8;
    this.presenceEQ.gain.value = 1.5;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.45;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.tsHPF);
    this.tsHPF.connect(this.midHump);
    this.midHump.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.bassEQ);
    this.bassEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.presenceEQ);
    this.presenceEQ.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      gain: 50,
      level: 70,
      bass: 50,
      treble: 50
    };
  }

  /**
   * Bad Monkey clipping: TS-derived but slightly more open/transparent.
   * Silicon diodes with slightly wider headroom than a TS808.
   */
  _makeBadMonkeyCurve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 1.2 + (gain / 100) * 5;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Soft-clip diodes (slightly softer than TS for transparency)
      const vt = 0.38;
      const knee = 0.22;

      if (y > vt) {
        const over = y - vt;
        y = vt + Math.tanh(over / knee) * knee;
      } else if (y < -vt) {
        const under = y + vt;
        y = -vt + Math.tanh(under / knee) * knee;
      }

      // Gentle saturation
      y = Math.tanh(y * 1.1);

      // Slight asymmetry (real diode mismatch)
      y *= x >= 0 ? 1.05 : 0.96;

      // Op-amp compression feel
      y *= 1 - 0.06 * Math.min(1, Math.abs(x));

      // Small even harmonic component (warmth)
      y += 0.025 * Math.tanh(x * drive * 1.5);

      curve[i] = y * 0.92;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        const g = 1.2 + (value / 100) * 8;
        this.preGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._makeBadMonkeyCurve(value);
        // More gain → more mid hump
        const hump = 3 + (value / 100) * 4;
        this.midHump.gain.setTargetAtTime(hump, now, 0.02);
        // Tighten the TS HPF slightly with more gain
        const tsFreq = 450 + (value / 100) * 150;
        this.tsHPF.frequency.setTargetAtTime(tsFreq, now, 0.02);
        break;
      }

      case 'level':
        this.outputGain.gain.setTargetAtTime((value / 100) * 0.85, now, 0.01);
        break;

      case 'bass': {
        // ±8 dB low shelf
        const dB = ((value - 50) / 50) * 8;
        this.bassEQ.gain.setTargetAtTime(dB, now, 0.02);
        // Also adjust post HPF to prevent mud when bass is boosted
        const hpf = 80 - (value / 100) * 40;
        this.postHPF.frequency.setTargetAtTime(Math.max(30, hpf), now, 0.02);
        break;
      }

      case 'treble': {
        // ±8 dB high shelf
        const dB = ((value - 50) / 50) * 8;
        this.trebleEQ.gain.setTargetAtTime(dB, now, 0.02);
        // Adjust post LPF with treble
        const lpf = 6000 + (value / 100) * 4000;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
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
      this.inputHPF.disconnect();
      this.tsHPF.disconnect();
      this.midHump.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.bassEQ.disconnect();
      this.trebleEQ.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.presenceEQ.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default DigitechBadMonkeyEffect;
