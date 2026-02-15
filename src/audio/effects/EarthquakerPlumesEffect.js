import BaseEffect from './BaseEffect';

/**
 * EarthquakerPlumesEffect
 *
 * EQD Plumes – a TS-style overdrive with three clipping modes:
 *   Mode 1: Op-amp symmetrical (LED-like, open, compressed)
 *   Mode 2: LED asymmetrical (classic TS diode feel, warm)
 *   Mode 3: No clipping (clean boost with TS-style EQ)
 *
 * Signal chain:
 *   input → inputHPF → midHump → preGain → antiAliasLPF → clipper
 *         → dcBlocker → toneLPF → postHPF → postGain → wetGain → output
 *
 * Params: gain (0-100), tone (0-100), level (0-100), mode (1|2|3)
 */
class EarthquakerPlumesEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EQD Plumes', 'earthquakerplumes');

    // ===== Input HPF (sub-bass cut) =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== TS-style mid hump =====
    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 720;
    this.midHump.Q.value = 0.9;
    this.midHump.gain.value = 5;

    // ===== TS input HPF (characteristic bass roll-off) =====
    this.tsHPF = audioContext.createBiquadFilter();
    this.tsHPF.type = 'highpass';
    this.tsHPF.frequency.value = 340;
    this.tsHPF.Q.value = 0.5;

    // ===== Pre-gain =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 3.0;

    // ===== Anti-alias LPF =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeCurve(50, 2); // default mode 2

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Tone control (LPF) =====
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 3000;
    this.toneLPF.Q.value = 0.707;

    // ===== Post HPF (tightens low end after clipping) =====
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 80;
    this.postHPF.Q.value = 0.5;

    // ===== Post LPF (fizz control) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8000;
    this.postLPF.Q.value = 0.5;

    // ===== Output gain =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.5;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.tsHPF);
    this.tsHPF.connect(this.midHump);
    this.midHump.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      gain: 50,
      tone: 50,
      level: 70,
      mode: 2
    };
  }

  /**
   * Creates clipping curves for the three modes:
   * Mode 1: Symmetrical op-amp hard clip – compressed, open
   * Mode 2: Asymmetric LED clip – classic warm TS feel
   * Mode 3: No clipping – linear transfer (clean boost)
   */
  _makeCurve(gain, mode) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 1 + (gain / 100) * 5;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;

      if (mode === 3) {
        // Mode 3: Clean boost – linear with very gentle soft limiting
        let y = x * drive * 0.6;
        y = y / (1 + Math.abs(y) * 0.3); // gentle soft limit
        curve[i] = y * 0.95;
      } else if (mode === 1) {
        // Mode 1: Symmetrical op-amp clip – harder, more compressed
        let y = x * drive;
        const thresh = 0.45;
        const knee = 0.15;
        if (y > thresh) {
          const over = y - thresh;
          y = thresh + Math.tanh(over / knee) * knee;
        } else if (y < -thresh) {
          const under = y + thresh;
          y = -thresh + Math.tanh(under / knee) * knee;
        }
        y = Math.tanh(y * 1.6);
        // Even harmonics for warmth
        y += 0.03 * Math.tanh(x * drive * 2);
        y *= 1 - 0.06 * Math.min(1, Math.abs(x));
        curve[i] = y * 0.9;
      } else {
        // Mode 2: Asymmetric LED clip – classic TS warmth
        let y = x * drive;
        const vtPos = 0.35;
        const vtNeg = 0.42;
        const knee = 0.25;
        if (y > vtPos) {
          const over = y - vtPos;
          y = vtPos + Math.tanh(over / knee) * knee;
        } else if (y < -vtNeg) {
          const under = y + vtNeg;
          y = -vtNeg + Math.tanh(under / knee) * knee;
        }
        y = Math.tanh(y * 1.2);
        // Asymmetry: positive side slightly louder
        y *= x >= 0 ? 1.1 : 0.92;
        // Op-amp compression feel
        y *= 1 - 0.07 * Math.min(1, Math.abs(x));
        curve[i] = y * 0.9;
      }
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        const g = 1 + (value / 100) * 9;
        this.preGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._makeCurve(value, this.params.mode);
        // Adjust mid hump intensity with gain
        const hump = 3 + (value / 100) * 5;
        this.midHump.gain.setTargetAtTime(hump, now, 0.02);
        break;
      }

      case 'tone': {
        // 800 Hz (dark) to 5000 Hz (bright)
        const freq = 800 + (value / 100) * 4200;
        this.toneLPF.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      }

      case 'level':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      case 'mode': {
        const m = Math.round(Math.max(1, Math.min(3, value)));
        this.params.mode = m;
        this.clipper.curve = this._makeCurve(this.params.gain, m);

        // Mode 3 (clean boost) needs less pre-HPF to keep body
        if (m === 3) {
          this.tsHPF.frequency.setTargetAtTime(160, now, 0.02);
          this.midHump.gain.setTargetAtTime(2, now, 0.02);
        } else {
          this.tsHPF.frequency.setTargetAtTime(340, now, 0.02);
          this.midHump.gain.setTargetAtTime(5, now, 0.02);
        }
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
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default EarthquakerPlumesEffect;
