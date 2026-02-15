import BaseEffect from './BaseEffect';

/**
 * EHXSoulFoodEffect
 *
 * Electro-Harmonix Soul Food – an affordable take on the Klon Centaur
 * circuit with its own unique character.
 *
 * Key characteristics:
 *  - Clean boost to medium overdrive range
 *  - Transparent tone – doesn't color the signal heavily
 *  - Slight treble lift compared to the Klon
 *  - Clean/dirty signal blending (Klon architecture)
 *  - Less gain than the Klon but more headroom for clean boost use
 *  - Great as an "always-on" tone enhancer
 *
 * Params: drive (0-100), treble (0-100), volume (0-100)
 */
class EHXSoulFoodEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Soul Food', 'ehxsoulfood');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Clean path (Klon-style dual path) =====
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.7;

    // ===== Dirty path =====
    // Pre-EQ: minimal coloration (Soul Food is flatter than Klon)
    this.preEQ = audioContext.createBiquadFilter();
    this.preEQ.type = 'peaking';
    this.preEQ.frequency.value = 900;
    this.preEQ.Q.value = 0.5;
    this.preEQ.gain.value = 1.5; // subtle mid bump

    // Bass tightening before clip
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 180;
    this.preBassHPF.Q.value = 0.5;

    this.dirtyGain = audioContext.createGain();
    this.dirtyGain.gain.value = 1.5;

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – Soul Food has its own take on the Klon clipping
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeSoulFoodCurve(50);

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Post-clip shaping
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 65;
    this.postHPF.Q.value = 0.5;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 14000;
    this.postLPF.Q.value = 0.5;

    // ===== Treble control =====
    // Soul Food treble – high shelf with a slight inherent brightness
    this.trebleShelf = audioContext.createBiquadFilter();
    this.trebleShelf.type = 'highshelf';
    this.trebleShelf.frequency.value = 2000;
    this.trebleShelf.gain.value = 1.0; // slight inherent brightness

    // Presence boost (Soul Food has a brighter character than Klon)
    this.presenceBoost = audioContext.createBiquadFilter();
    this.presenceBoost.type = 'peaking';
    this.presenceBoost.frequency.value = 4000;
    this.presenceBoost.Q.value = 0.7;
    this.presenceBoost.gain.value = 1.5;

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

    // Dirty path: inHPF -> preBassHPF -> preEQ -> dirtyGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> postHPF -> postLPF -> sumGain
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.preEQ);
    this.preEQ.connect(this.dirtyGain);
    this.dirtyGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.sumGain);

    // Sum -> treble -> presence -> volume -> wetGain -> output
    this.sumGain.connect(this.trebleShelf);
    this.trebleShelf.connect(this.presenceBoost);
    this.presenceBoost.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      drive: 50,
      treble: 50,
      volume: 60
    };
  }

  /**
   * Soul Food clipping curve.
   * Similar to Klon but with less gain range and slightly brighter
   * harmonic content. Clean-sounding even at moderate drive.
   */
  _makeSoulFoodCurve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);

    // Less gain than Klon – more headroom for clean boost
    const driveMul = 1 + (drive / 100) * 3.0; // 1..4 (vs Klon 1..6)
    const knee = 0.7;
    const asymPos = 1.07;
    const asymNeg = 0.93;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Germanium-style soft clipping
      y = Math.tanh(y * knee);

      // Mild asymmetry (even harmonics)
      y *= x >= 0 ? asymPos : asymNeg;

      // Light compression
      y *= 1 - 0.035 * Math.min(1, Math.abs(x));

      // Clean headroom – signal passes through cleaner at low levels
      const cleanThrough = 0.04 * x * Math.exp(-8 * x * x);
      y += cleanThrough;

      // Subtle harmonic enhancement
      y += 0.01 * Math.tanh(x * driveMul * 1.3);

      curve[i] = y * 0.94;
    }
    return curve;
  }

  /**
   * Clean/dirty blend – Soul Food: clean path is stronger,
   * dirty path adds texture without dominating.
   */
  _applyBlend(driveVal) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, driveVal)) / 100;

    // Clean stays strong even at high drive
    const clean = 0.7 * (1 - t * 0.6) + 0.15; // ~0.15..0.85
    const dirty = 0.6 * (t ** 0.7) + 0.2;     // ~0.2..0.8

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
      case 'drive': {
        this._applyBlend(value);
        this.clip.curve = this._makeSoulFoodCurve(value);
        break;
      }

      case 'treble': {
        // Treble shelf: -3 dB to +5 dB (Soul Food is naturally brighter)
        const dB = this._map(value, -3, 5);
        this.trebleShelf.gain.setTargetAtTime(dB, now, 0.02);
        // Presence tracks treble
        const presGain = this._map(value, 0, 3);
        this.presenceBoost.gain.setTargetAtTime(presGain, now, 0.02);
        break;
      }

      case 'volume': {
        const vol = this._map(value, 0, 1.0);
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
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
      this.preEQ.disconnect();
      this.preBassHPF.disconnect();
      this.dirtyGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.trebleShelf.disconnect();
      this.presenceBoost.disconnect();
      this.sumGain.disconnect();
      this.volumeGain.disconnect();
    } catch (e) {}
  }
}

export default EHXSoulFoodEffect;
