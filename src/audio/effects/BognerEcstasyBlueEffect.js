import BaseEffect from './BaseEffect';

/**
 * BognerEcstasyBlueEffect
 *
 * Bogner Ecstasy Blue Channel pedal – smooth, amp-like overdrive
 * with plexi voicing. Transparent at low gain, rich and dynamic at high gain.
 *
 * Signal chain:
 *   input → inputHPF → boostStage → preEQ → preGain → antiAliasLPF
 *         → clipper → dcBlocker → toneStack → presenceLPF → postGain
 *         → wetGain → output
 *
 * Params: gain (0-100), volume (0-100), treble (0-100), bass (0-100),
 *         boost (0|1 toggle)
 */
class BognerEcstasyBlueEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bogner Ecstasy Blue', 'bognerecstasyblue');

    // ===== Input HPF – remove sub-bass rumble =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== Boost stage (like the pedal's boost switch) =====
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.0; // 1.0 = off, ~1.6 = on

    this.boostMidPush = audioContext.createBiquadFilter();
    this.boostMidPush.type = 'peaking';
    this.boostMidPush.frequency.value = 1200;
    this.boostMidPush.Q.value = 0.6;
    this.boostMidPush.gain.value = 0; // 0 dB off, +4 dB on

    // ===== Pre-EQ (plexi voicing) =====
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 120;
    this.preHPF.Q.value = 0.5;

    this.preMidHump = audioContext.createBiquadFilter();
    this.preMidHump.type = 'peaking';
    this.preMidHump.frequency.value = 700;
    this.preMidHump.Q.value = 0.7;
    this.preMidHump.gain.value = 2.5;

    // ===== Pre-gain (drive amount) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.5;

    // ===== Anti-alias LPF =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper – smooth amp-like saturation =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeBognerCurve(50);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip filtering =====
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 70;
    this.postHPF.Q.value = 0.5;

    // ===== Tone stack =====
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 200;
    this.bassEQ.gain.value = 0;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 2800;
    this.trebleEQ.gain.value = 0;

    // ===== Presence / air control =====
    this.presenceLPF = audioContext.createBiquadFilter();
    this.presenceLPF.type = 'lowpass';
    this.presenceLPF.frequency.value = 9000;
    this.presenceLPF.Q.value = 0.5;

    // ===== Plexi "sag" compression feel =====
    this.sagComp = audioContext.createBiquadFilter();
    this.sagComp.type = 'peaking';
    this.sagComp.frequency.value = 350;
    this.sagComp.Q.value = 0.4;
    this.sagComp.gain.value = 1.5;

    // ===== Output =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.45;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.boostGain);
    this.boostGain.connect(this.boostMidPush);
    this.boostMidPush.connect(this.preHPF);
    this.preHPF.connect(this.preMidHump);
    this.preMidHump.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postHPF);
    this.postHPF.connect(this.bassEQ);
    this.bassEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.sagComp);
    this.sagComp.connect(this.presenceLPF);
    this.presenceLPF.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      gain: 50,
      volume: 70,
      treble: 50,
      bass: 50,
      boost: 0
    };
  }

  /**
   * Bogner-style clipping: very smooth, amp-like with gradual compression.
   * Less hard clipping, more tube-sag feel with asymmetric soft-clip.
   */
  _makeBognerCurve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 1.2 + (gain / 100) * 4.5;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Very soft, gradual saturation (Bogner's smooth character)
      const k = 0.8 + (gain / 100) * 0.6;
      y = (Math.tanh(y * k) + Math.tanh(y * k * 0.5) * 0.3) / 1.3;

      // Mild asymmetry (tube push-pull imbalance)
      const asymFactor = x >= 0 ? 1.08 : 0.94;
      y *= asymFactor;

      // Even harmonics for warmth
      y += 0.04 * Math.tanh(x * drive * 1.8);

      // Gentle compression at peaks
      y *= 1 - 0.04 * Math.min(1, Math.abs(x));

      // Dynamic feel: slight expansion at low levels
      const dynBoost = 1 + 0.08 * (1 - Math.abs(x));
      y *= dynBoost;

      curve[i] = y * 0.88;
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
        this.clipper.curve = this._makeBognerCurve(value);
        // More gain → slightly tighter bass to prevent mud
        const hpf = 70 + (value / 100) * 60;
        this.postHPF.frequency.setTargetAtTime(hpf, now, 0.02);
        break;
      }

      case 'volume':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      case 'treble': {
        const dB = ((value - 50) / 50) * 7; // ±7 dB
        this.trebleEQ.gain.setTargetAtTime(dB, now, 0.02);
        // Also adjusts presence LPF
        const pres = 6000 + (value / 100) * 6000;
        this.presenceLPF.frequency.setTargetAtTime(pres, now, 0.02);
        break;
      }

      case 'bass': {
        const dB = ((value - 50) / 50) * 7;
        this.bassEQ.gain.setTargetAtTime(dB, now, 0.02);
        // Adjust pre-HPF to let more/less bass into clipping
        const hpf = 160 - (value / 100) * 80;
        this.preHPF.frequency.setTargetAtTime(hpf, now, 0.02);
        break;
      }

      case 'boost': {
        const on = value ? 1 : 0;
        this.boostGain.gain.setTargetAtTime(on ? 1.6 : 1.0, now, 0.015);
        this.boostMidPush.gain.setTargetAtTime(on ? 4 : 0, now, 0.015);
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
      this.boostGain.disconnect();
      this.boostMidPush.disconnect();
      this.preHPF.disconnect();
      this.preMidHump.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.postHPF.disconnect();
      this.bassEQ.disconnect();
      this.trebleEQ.disconnect();
      this.sagComp.disconnect();
      this.presenceLPF.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default BognerEcstasyBlueEffect;
