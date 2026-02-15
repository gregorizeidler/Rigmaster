import BaseEffect from './BaseEffect';

/**
 * WamplerTumnusEffect
 *
 * Wampler Tumnus – a modern Klon-style transparent overdrive
 * with more available gain and refined clean/drive blending.
 *
 * Key characteristics:
 *  - Transparent overdrive: preserves guitar's natural tone
 *  - Clean + dirty signal blending (like Klon architecture)
 *  - More gain on tap than original Klon Centaur
 *  - Slightly tighter bass than Klon
 *  - Treble control acts as a high-shelf like the Klon
 *  - Touch-sensitive dynamics
 *
 * Params: gain (0-100), level (0-100), treble (0-100)
 */
class WamplerTumnusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Wampler Tumnus', 'wamplertumnus');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Clean path (Klon-style architecture) =====
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.6;

    // Clean path tone shaping – slight presence lift
    this.cleanPresence = audioContext.createBiquadFilter();
    this.cleanPresence.type = 'highshelf';
    this.cleanPresence.frequency.value = 2000;
    this.cleanPresence.gain.value = 1.0;

    // ===== Dirty path =====
    // Pre-EQ: slight mid voicing before clip
    this.preEQ = audioContext.createBiquadFilter();
    this.preEQ.type = 'peaking';
    this.preEQ.frequency.value = 1000;
    this.preEQ.Q.value = 0.6;
    this.preEQ.gain.value = 2;

    // Pre-bass tightening
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 200;
    this.preBassHPF.Q.value = 0.5;

    this.dirtyGain = audioContext.createGain();
    this.dirtyGain.gain.value = 2.0;

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – Klon-style germanium but with more gain headroom
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeTumnusCurve(50);

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Post-clip filtering
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 80;
    this.postHPF.Q.value = 0.5;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 12000;
    this.postLPF.Q.value = 0.5;

    // ===== Treble control (high shelf) =====
    this.trebleShelf = audioContext.createBiquadFilter();
    this.trebleShelf.type = 'highshelf';
    this.trebleShelf.frequency.value = 1800;
    this.trebleShelf.gain.value = 0;

    // ===== Sum node (clean + dirty blend) =====
    this.sumGain = audioContext.createGain();
    this.sumGain.gain.value = 1.0;

    // ===== Output level =====
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.65;

    // ===== Signal routing =====
    // input -> inHPF
    this.input.connect(this.inHPF);

    // Clean path: inHPF -> cleanPresence -> cleanGain -> sumGain
    this.inHPF.connect(this.cleanPresence);
    this.cleanPresence.connect(this.cleanGain);
    this.cleanGain.connect(this.sumGain);

    // Dirty path: inHPF -> preBassHPF -> preEQ -> dirtyGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> postHPF -> postLPF -> trebleShelf -> sumGain
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.preEQ);
    this.preEQ.connect(this.dirtyGain);
    this.dirtyGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.trebleShelf);
    this.trebleShelf.connect(this.sumGain);

    // Sum -> level -> wetGain -> output
    this.sumGain.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (BaseEffect bypass):
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      gain: 50,
      level: 65,
      treble: 50
    };
  }

  /**
   * Tumnus clipping curve.
   * Klon-inspired germanium character but with extended gain range.
   * Softer knee at low gain, progressively firmer at high gain.
   */
  _makeTumnusCurve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);

    // More gain available than original Klon
    const driveMul = 1 + (gain / 100) * 5.0; // 1..6 (vs Klon ~1..2.5)
    // Knee softens at low gain, firms up at high gain
    const knee = 0.6 + (gain / 100) * 0.5; // 0.6..1.1
    // Slight asymmetry for warmth
    const asymPos = 1.06;
    const asymNeg = 0.94;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Soft germanium-style clipping with dynamic knee
      y = Math.tanh(y * knee);

      // Asymmetry
      y *= x >= 0 ? asymPos : asymNeg;

      // Touch-sensitive compression
      y *= 1 - 0.04 * Math.min(1, Math.abs(x));

      // Second-harmonic warmth
      y += 0.018 * Math.tanh(x * driveMul * 1.4);

      // Tumnus has a cleaner low-signal response
      const cleanBlend = 0.03 * x * Math.exp(-6 * x * x);
      y += cleanBlend;

      curve[i] = y * 0.93;
    }
    return curve;
  }

  /**
   * Klon-style clean/dirty blend.
   * More gain -> more dirty, less clean. Clean never fully disappears.
   */
  _applyBlend(gainVal) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, gainVal)) / 100;
    const dirty = 0.8 * (t ** 0.7) + 0.25; // ~0.25..1.05
    const clean = 0.75 * (1 - t ** 0.6) + 0.1; // ~0.1..0.85

    this.cleanGain.gain.setTargetAtTime(clean, now, 0.01);
    this.dirtyGain.gain.setTargetAtTime(dirty * 2, now, 0.01);
  }

  _map(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        this._applyBlend(value);
        this.clip.curve = this._makeTumnusCurve(value);
        break;
      }

      case 'level': {
        const vol = this._map(value, 0, 1.0);
        this.levelGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'treble': {
        // Treble: -4 dB to +4 dB high shelf
        const dB = this._map(value, -4, 4);
        this.trebleShelf.gain.setTargetAtTime(dB, now, 0.02);
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
      this.cleanPresence.disconnect();
      this.preEQ.disconnect();
      this.preBassHPF.disconnect();
      this.dirtyGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.trebleShelf.disconnect();
      this.sumGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default WamplerTumnusEffect;
