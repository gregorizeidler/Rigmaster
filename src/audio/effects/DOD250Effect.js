import BaseEffect from './BaseEffect';

/**
 * DOD250Effect
 *
 * DOD 250 Overdrive/Preamp – classic hard-clipping overdrive.
 * Known for its aggressive, bright, cutting character.
 * Simple circuit: op-amp gain stage → hard-clip diodes → output.
 *
 * Signal chain:
 *   input → inputHPF → preEQ (bright character) → preGain
 *         → antiAliasLPF → clipper → dcBlocker → postEQ → postLPF
 *         → outputGain → wetGain → output
 *
 * Params: gain (0-100), level (0-100)
 */
class DOD250Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'DOD 250', 'dod250');

    // ===== Input HPF – sub-bass cut =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== Pre-EQ – the 250's characteristic bright/nasal voicing =====
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 200;
    this.preHPF.Q.value = 0.5;

    // Presence peak (the 250's signature nasal cut)
    this.prePeak = audioContext.createBiquadFilter();
    this.prePeak.type = 'peaking';
    this.prePeak.frequency.value = 1500;
    this.prePeak.Q.value = 1.0;
    this.prePeak.gain.value = 4;

    // Upper-mid emphasis
    this.upperMidBoost = audioContext.createBiquadFilter();
    this.upperMidBoost.type = 'peaking';
    this.upperMidBoost.frequency.value = 3000;
    this.upperMidBoost.Q.value = 0.8;
    this.upperMidBoost.gain.value = 2;

    // ===== Pre-gain (op-amp gain stage) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 3.5;

    // ===== Anti-alias LPF =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper – hard-clipping diodes =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._make250Curve(50);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip EQ – shape the harsh clip harmonics =====
    this.postMidScoop = audioContext.createBiquadFilter();
    this.postMidScoop.type = 'peaking';
    this.postMidScoop.frequency.value = 2200;
    this.postMidScoop.Q.value = 0.6;
    this.postMidScoop.gain.value = -1.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;
    this.postHPF.Q.value = 0.5;

    // ===== Post LPF (roll off extreme highs) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    this.postLPF.Q.value = 0.5;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.4;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.preHPF);
    this.preHPF.connect(this.prePeak);
    this.prePeak.connect(this.upperMidBoost);
    this.upperMidBoost.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postMidScoop);
    this.postMidScoop.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      gain: 50,
      level: 70
    };
  }

  /**
   * DOD 250 clipping curve: hard-clip diodes with minimal soft knee.
   * Much harder than a TS – the 250's aggressive character.
   * Slight asymmetry from real-world diode mismatch.
   */
  _make250Curve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 1.5 + (gain / 100) * 7;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Hard clipping with narrow knee (DOD 250 character)
      const vtPos = 0.28;
      const vtNeg = 0.30;
      const knee = 0.08; // very narrow knee = hard clip

      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // Hard saturation ceiling
      y = Math.tanh(y * 2.2);

      // Slight odd-harmonic emphasis (aggressive character)
      y += 0.04 * Math.tanh(x * drive * 3.0);

      // Very slight asymmetry from diode mismatch
      y *= x >= 0 ? 1.04 : 0.97;

      curve[i] = y * 0.88;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        const g = 1.5 + (value / 100) * 12;
        this.preGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._make250Curve(value);
        // More gain → tighter post LPF (tame harshness)
        const lpf = 8500 - (value / 100) * 2500;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
        // More gain → slightly more presence peak
        const peakGain = 3 + (value / 100) * 3;
        this.prePeak.gain.setTargetAtTime(peakGain, now, 0.02);
        break;
      }

      case 'level':
        this.outputGain.gain.setTargetAtTime((value / 100) * 0.85, now, 0.01);
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
      this.preHPF.disconnect();
      this.prePeak.disconnect();
      this.upperMidBoost.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.postMidScoop.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default DOD250Effect;
