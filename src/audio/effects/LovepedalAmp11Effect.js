import BaseEffect from './BaseEffect';

/**
 * LovepedalAmp11Effect
 *
 * Lovepedal Amp Eleven – Fender-style clean boost / overdrive.
 * Sparkly clean tones that break up gradually at high gain settings.
 * Transparent, touch-sensitive, amp-like dynamic response.
 *
 * Signal chain:
 *   input → inputHPF → fenderVoicing (brightCap + lowShelf)
 *         → preGain → antiAliasLPF → clipper → dcBlocker
 *         → toneEQ → presenceBoost → postLPF → outputGain
 *         → wetGain → output
 *
 * Params: drive (0-100), tone (0-100), volume (0-100)
 */
class LovepedalAmp11Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Lovepedal Amp 11', 'lovepedalamp11');

    // ===== Input HPF =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== Fender-style voicing =====
    // Bright cap effect (high-frequency boost at lower volumes, like Fender amps)
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2200;
    this.brightCap.gain.value = 3;

    // Low shelf to shape the Fender scooped-mid character
    this.fenderScoop = audioContext.createBiquadFilter();
    this.fenderScoop.type = 'peaking';
    this.fenderScoop.frequency.value = 400;
    this.fenderScoop.Q.value = 0.6;
    this.fenderScoop.gain.value = -2;

    // Clean warmth
    this.warmth = audioContext.createBiquadFilter();
    this.warmth.type = 'lowshelf';
    this.warmth.frequency.value = 200;
    this.warmth.gain.value = 1.5;

    // ===== Pre-gain (drive control) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 1.5;

    // ===== Anti-alias LPF =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper – very soft, Fender-like breakup =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeAmp11Curve(50);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Tone control =====
    this.toneEQ = audioContext.createBiquadFilter();
    this.toneEQ.type = 'highshelf';
    this.toneEQ.frequency.value = 2500;
    this.toneEQ.gain.value = 0;

    // ===== Presence boost (Fender sparkle) =====
    this.presenceBoost = audioContext.createBiquadFilter();
    this.presenceBoost.type = 'peaking';
    this.presenceBoost.frequency.value = 5000;
    this.presenceBoost.Q.value = 1.0;
    this.presenceBoost.gain.value = 2;

    // ===== Post LPF (smooth top end) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 10000;
    this.postLPF.Q.value = 0.5;

    // ===== Post HPF =====
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 50;
    this.postHPF.Q.value = 0.5;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.55;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.brightCap);
    this.brightCap.connect(this.fenderScoop);
    this.fenderScoop.connect(this.warmth);
    this.warmth.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneEQ);
    this.toneEQ.connect(this.presenceBoost);
    this.presenceBoost.connect(this.postLPF);
    this.postLPF.connect(this.postHPF);
    this.postHPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      drive: 50,
      tone: 50,
      volume: 70
    };
  }

  /**
   * Amp Eleven clipping: extremely soft, Fender-style.
   * At low drive: nearly clean with subtle compression.
   * At high drive: warm tube breakup with touch sensitivity.
   */
  _makeAmp11Curve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);
    // Very gentle drive multiplier (clean boost territory)
    const d = 0.8 + (drive / 100) * 3.5;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * d;

      // Very soft, gradual saturation (Fender tube character)
      // Uses a combination of soft-clip and polynomial for smoothness
      const soft = Math.tanh(y * 0.7);
      const poly = y / (1 + Math.abs(y) * 0.5);
      // Blend between polynomial (cleaner) and tanh (driven)
      const blend = Math.min(1, drive / 100);
      y = poly * (1 - blend * 0.6) + soft * blend * 0.6;

      // Subtle asymmetry (single-ended tube character)
      y *= x >= 0 ? 1.06 : 0.95;

      // Even harmonics (Fender warmth)
      y += 0.035 * Math.tanh(x * d * 1.2);

      // Touch sensitivity: dynamic response preserved at low levels
      const dynBoost = 1 + 0.1 * (1 - Math.abs(x));
      y *= dynBoost;

      // Gentle peak limiting
      y *= 1 - 0.03 * Math.min(1, Math.abs(x));

      curve[i] = y * 0.9;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        const g = 0.8 + (value / 100) * 5;
        this.preGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._makeAmp11Curve(value);
        // Bright cap effect: less bright at higher gain (like a real amp)
        const brightGain = 3 - (value / 100) * 2;
        this.brightCap.gain.setTargetAtTime(brightGain, now, 0.02);
        // Warm up the bottom end as drive increases
        const warmthGain = 1.5 + (value / 100) * 1.5;
        this.warmth.gain.setTargetAtTime(warmthGain, now, 0.02);
        // Slightly lower post LPF at high drive to avoid fizz
        const lpf = 11000 - (value / 100) * 3000;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
        break;
      }

      case 'tone': {
        // ±6 dB high shelf
        const dB = ((value - 50) / 50) * 6;
        this.toneEQ.gain.setTargetAtTime(dB, now, 0.02);
        // Adjust presence sparkle
        const pres = 1 + (value / 100) * 3;
        this.presenceBoost.gain.setTargetAtTime(pres, now, 0.02);
        break;
      }

      case 'volume':
        this.outputGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
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
      this.brightCap.disconnect();
      this.fenderScoop.disconnect();
      this.warmth.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.toneEQ.disconnect();
      this.presenceBoost.disconnect();
      this.postLPF.disconnect();
      this.postHPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default LovepedalAmp11Effect;
