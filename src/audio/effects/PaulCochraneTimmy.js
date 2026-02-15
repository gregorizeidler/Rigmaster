import BaseEffect from './BaseEffect';

/**
 * PaulCochraneTimmy
 *
 * Paul Cochrane Timmy – the benchmark for transparent overdrive.
 * Minimal coloration with separate bass and treble CUT controls
 * (not boost) that let you sculpt tone without imposing character.
 *
 * Key characteristics:
 *  - Ultra-transparent: doesn't impose its own EQ curve
 *  - Separate bass and treble CUT controls (subtractive, not additive)
 *  - Low to medium gain range – excels at light to moderate overdrive
 *  - Extremely dynamic and touch-sensitive
 *  - Clean blend preserves pick attack and note definition
 *  - Flat frequency response when bass/treble cuts are at zero
 *
 * Params: drive (0-100), volume (0-100), bass (0-100), treble (0-100)
 *   bass = 0 means no cut (full bass), 100 means maximum bass cut
 *   treble = 0 means no cut (full treble), 100 means maximum treble cut
 */
class PaulCochraneTimmy extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Paul Cochrane Timmy', 'paulcochranetimmy');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Clean path (Timmy blends clean signal for transparency) =====
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.5;

    // ===== Dirty path =====
    // Minimal pre-EQ – Timmy is intentionally flat
    // Just a gentle input buffer emulation
    this.inputBuffer = audioContext.createBiquadFilter();
    this.inputBuffer.type = 'peaking';
    this.inputBuffer.frequency.value = 1000;
    this.inputBuffer.Q.value = 0.3; // extremely broad
    this.inputBuffer.gain.value = 0.5; // nearly flat

    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 1.8; // lower gain – transparent

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – symmetric, clean-sounding clipping
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeTimmyCurve(50);

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Bass CUT control (post-clip) =====
    // Acts as a variable high-pass filter – higher values cut more bass
    this.bassCutHPF = audioContext.createBiquadFilter();
    this.bassCutHPF.type = 'highpass';
    this.bassCutHPF.frequency.value = 40; // no cut at default
    this.bassCutHPF.Q.value = 0.5;

    // ===== Treble CUT control (post-clip) =====
    // Acts as a variable low-pass filter – higher values cut more treble
    this.trebleCutLPF = audioContext.createBiquadFilter();
    this.trebleCutLPF.type = 'lowpass';
    this.trebleCutLPF.frequency.value = 12000; // no cut at default
    this.trebleCutLPF.Q.value = 0.5;

    // Gentle post-shaping for natural feel
    this.postShaping = audioContext.createBiquadFilter();
    this.postShaping.type = 'peaking';
    this.postShaping.frequency.value = 2000;
    this.postShaping.Q.value = 0.3;
    this.postShaping.gain.value = 0; // transparent by default

    // ===== Sum node =====
    this.sumGain = audioContext.createGain();
    this.sumGain.gain.value = 1.0;

    // ===== Output volume =====
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.6;

    // ===== Signal routing =====
    // input -> inHPF
    this.input.connect(this.inHPF);

    // Clean path: inHPF -> cleanGain -> sumGain
    this.inHPF.connect(this.cleanGain);
    this.cleanGain.connect(this.sumGain);

    // Dirty path: inHPF -> inputBuffer -> preGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> bassCutHPF -> trebleCutLPF -> postShaping -> sumGain
    this.inHPF.connect(this.inputBuffer);
    this.inputBuffer.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.bassCutHPF);
    this.bassCutHPF.connect(this.trebleCutLPF);
    this.trebleCutLPF.connect(this.postShaping);
    this.postShaping.connect(this.sumGain);

    // Sum -> volume -> wetGain -> output
    this.sumGain.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      drive: 50,
      volume: 60,
      bass: 20,   // 0 = no cut, 100 = max cut
      treble: 20  // 0 = no cut, 100 = max cut
    };
  }

  /**
   * Timmy clipping curve – ultra-transparent, nearly symmetric.
   * Very little imposed character. The curve is designed to preserve
   * the guitar's natural tone as much as possible.
   */
  _makeTimmyCurve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);

    // Low gain range – Timmy is subtle
    const driveMul = 1 + (drive / 100) * 3.0; // 1..4
    const knee = 0.8;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Nearly symmetric soft clip (transparency)
      // Blend of tanh and algebraic for ultra-smooth transition
      const tanhPart = Math.tanh(y * knee);
      const algPart = y / (1 + Math.abs(y));
      y = tanhPart * 0.5 + algPart * 0.5;

      // Very slight asymmetry (barely noticeable – true transparency)
      y *= x >= 0 ? 1.02 : 0.98;

      // Minimal compression – preserves dynamics
      y *= 1 - 0.02 * Math.min(1, Math.abs(x));

      // Clean pass-through at low levels (excellent touch sensitivity)
      const cleanBlend = 0.05 * x * Math.exp(-10 * x * x);
      y += cleanBlend;

      curve[i] = y * 0.95;
    }
    return curve;
  }

  /**
   * Timmy clean/dirty blend.
   * Clean path stays very present – Timmy is about adding texture,
   * not replacing the signal.
   */
  _applyBlend(driveVal) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, driveVal)) / 100;

    // Clean stays strong – Timmy is transparent
    const clean = 0.6 * (1 - t * 0.5) + 0.15; // ~0.15..0.75
    const dirty = 0.5 * (t ** 0.6) + 0.3;      // ~0.3..0.8

    this.cleanGain.gain.setTargetAtTime(clean, now, 0.01);
    this.preGain.gain.setTargetAtTime(dirty * 2.5, now, 0.01);
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
        this._applyBlend(value);
        this.clip.curve = this._makeTimmyCurve(value);
        break;
      }

      case 'volume': {
        const vol = this._map(value, 0, 1.0);
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'bass': {
        // Bass CUT: 0 = no cut (HPF at 40 Hz), 100 = max cut (HPF at 500 Hz)
        const hpfFreq = this._map(value, 40, 500);
        this.bassCutHPF.frequency.setTargetAtTime(hpfFreq, now, 0.02);
        break;
      }

      case 'treble': {
        // Treble CUT: 0 = no cut (LPF at 12 kHz), 100 = max cut (LPF at 1.5 kHz)
        const lpfFreq = this._map(100 - value, 1500, 12000); // reversed
        this.trebleCutLPF.frequency.setTargetAtTime(lpfFreq, now, 0.02);
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
      this.cleanGain.disconnect();
      this.inputBuffer.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.bassCutHPF.disconnect();
      this.trebleCutLPF.disconnect();
      this.postShaping.disconnect();
      this.sumGain.disconnect();
      this.volumeGain.disconnect();
    } catch (e) {}
  }
}

export default PaulCochraneTimmy;
