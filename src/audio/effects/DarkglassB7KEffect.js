import BaseEffect from './BaseEffect';

/**
 * DarkglassB7KEffect
 *
 * Darkglass B7K Ultra – bass overdrive with parallel clean/dirty blend.
 * Designed for bass guitar: retains low-end clarity via clean blend.
 * Attack and Grunt switches for voicing: Attack boosts upper mids for pick
 * definition; Grunt boosts low mids for body.
 *
 * Signal chain (parallel):
 *   input → inputHPF → splitter
 *     CLEAN path: cleanGain → cleanEQ → mixer
 *     DIRTY path: dirtyPreGain → attackEQ → gruntEQ → antiAliasLPF
 *                 → clipper → dcBlocker → dirtyToneLPF → dirtyPostGain → mixer
 *   mixer → postGain → wetGain → output
 *
 * Params: drive (0-100), blend (0-100), level (0-100), tone (0-100),
 *         attack (0|1 toggle), grunt (0|1 toggle)
 */
class DarkglassB7KEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Darkglass B7K', 'darkglassb7k');

    // ===== Input HPF =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== CLEAN PATH =====
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.7;

    // Clean path EQ: slight low-shelf boost for clean bass body
    this.cleanEQ = audioContext.createBiquadFilter();
    this.cleanEQ.type = 'lowshelf';
    this.cleanEQ.frequency.value = 150;
    this.cleanEQ.gain.value = 2;

    // ===== DIRTY PATH =====
    this.dirtyPreGain = audioContext.createGain();
    this.dirtyPreGain.gain.value = 4.0;

    // Dirty pre-HPF (tighten bass before distortion)
    this.dirtyHPF = audioContext.createBiquadFilter();
    this.dirtyHPF.type = 'highpass';
    this.dirtyHPF.frequency.value = 100;
    this.dirtyHPF.Q.value = 0.5;

    // Attack switch: boosts 2-3kHz for pick attack clarity
    this.attackEQ = audioContext.createBiquadFilter();
    this.attackEQ.type = 'peaking';
    this.attackEQ.frequency.value = 2500;
    this.attackEQ.Q.value = 1.2;
    this.attackEQ.gain.value = 0;

    // Grunt switch: boosts 300-500Hz for low-mid body
    this.gruntEQ = audioContext.createBiquadFilter();
    this.gruntEQ.type = 'peaking';
    this.gruntEQ.frequency.value = 400;
    this.gruntEQ.Q.value = 0.8;
    this.gruntEQ.gain.value = 0;

    // Anti-alias LPF
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // Clipper – aggressive MOSFET-style clipping
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeB7KCurve(50);

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Dirty tone control (LPF)
    this.dirtyToneLPF = audioContext.createBiquadFilter();
    this.dirtyToneLPF.type = 'lowpass';
    this.dirtyToneLPF.frequency.value = 5000;
    this.dirtyToneLPF.Q.value = 0.5;

    // Dirty post-gain
    this.dirtyPostGain = audioContext.createGain();
    this.dirtyPostGain.gain.value = 0.6;

    // ===== Mixer (clean + dirty sum) =====
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ===== Post-EQ (subtle bass restoration after mix) =====
    this.postBassRestore = audioContext.createBiquadFilter();
    this.postBassRestore.type = 'lowshelf';
    this.postBassRestore.frequency.value = 100;
    this.postBassRestore.gain.value = 1.5;

    // ===== Output =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.5;

    // ===== Routing =====
    this.input.connect(this.inputHPF);

    // Clean path
    this.inputHPF.connect(this.cleanGain);
    this.cleanGain.connect(this.cleanEQ);
    this.cleanEQ.connect(this.mixer);

    // Dirty path
    this.inputHPF.connect(this.dirtyHPF);
    this.dirtyHPF.connect(this.dirtyPreGain);
    this.dirtyPreGain.connect(this.attackEQ);
    this.attackEQ.connect(this.gruntEQ);
    this.gruntEQ.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.dirtyToneLPF);
    this.dirtyToneLPF.connect(this.dirtyPostGain);
    this.dirtyPostGain.connect(this.mixer);

    // Mix → output
    this.mixer.connect(this.postBassRestore);
    this.postBassRestore.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      drive: 50,
      blend: 50,
      level: 70,
      tone: 50,
      attack: 0,
      grunt: 0
    };

    this._applyBlend(50);
  }

  /**
   * B7K-style MOSFET clipping: aggressive but defined.
   * Harder than tube, but with more saturation than standard diode clip.
   */
  _makeB7KCurve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);
    const d = 2 + (drive / 100) * 8;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * d;

      // MOSFET-style clipping: harder positive, slightly softer negative
      const vtPos = 0.25;
      const vtNeg = 0.32;
      const knee = 0.12;

      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // Hard saturation
      y = Math.tanh(y * 1.8);

      // Odd harmonics emphasis (aggressive grindy character)
      y += 0.06 * Math.tanh(x * d * 2.5);

      // Slight asymmetry
      y *= x >= 0 ? 1.06 : 0.95;

      curve[i] = y * 0.9;
    }
    return curve;
  }

  /**
   * Apply blend between clean and dirty paths.
   * blend=0: all clean; blend=100: all dirty; 50: equal mix
   */
  _applyBlend(blend) {
    const now = this.audioContext.currentTime;
    const t = Math.max(0, Math.min(100, blend)) / 100;
    // Clean fades out as blend increases (but never fully disappears)
    const cleanLvl = Math.max(0.05, 1 - t * 0.9);
    const dirtyLvl = 0.1 + t * 0.8;
    this.cleanGain.gain.setTargetAtTime(cleanLvl, now, 0.01);
    this.dirtyPostGain.gain.setTargetAtTime(dirtyLvl, now, 0.01);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        const g = 1.5 + (value / 100) * 10;
        this.dirtyPreGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._makeB7KCurve(value);
        // Tighten dirty HPF with more drive
        const hpf = 80 + (value / 100) * 60;
        this.dirtyHPF.frequency.setTargetAtTime(hpf, now, 0.02);
        break;
      }

      case 'blend':
        this._applyBlend(value);
        break;

      case 'level':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      case 'tone': {
        // 1500 Hz (dark) to 8000 Hz (bright)
        const freq = 1500 + (value / 100) * 6500;
        this.dirtyToneLPF.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      }

      case 'attack': {
        // Toggle: 0 = off, 1 = on (+5 dB at 2.5 kHz)
        const dB = value ? 5 : 0;
        this.attackEQ.gain.setTargetAtTime(dB, now, 0.015);
        break;
      }

      case 'grunt': {
        // Toggle: 0 = off, 1 = on (+5 dB at 400 Hz)
        const dB = value ? 5 : 0;
        this.gruntEQ.gain.setTargetAtTime(dB, now, 0.015);
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
      this.cleanGain.disconnect();
      this.cleanEQ.disconnect();
      this.dirtyHPF.disconnect();
      this.dirtyPreGain.disconnect();
      this.attackEQ.disconnect();
      this.gruntEQ.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.dirtyToneLPF.disconnect();
      this.dirtyPostGain.disconnect();
      this.mixer.disconnect();
      this.postBassRestore.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default DarkglassB7KEffect;
