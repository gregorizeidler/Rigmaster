import BaseEffect from './BaseEffect';

/**
 * WayHugeSwollenPickleEffect
 *
 * Way Huge Swollen Pickle Jumbo Fuzz – massive low end, huge sustain,
 * with a scoop control for sculpting mids. Muff-inspired but with more
 * flexibility and a fatter bottom end.
 *
 * Signal chain:
 *   input → inputHPF → preGain1 → antiAliasLPF1 → clipper1
 *         → interStageFilter → preGain2 → antiAliasLPF2 → clipper2
 *         → dcBlocker → scoopFilter → toneLPF → crunchFilter
 *         → postGain → wetGain → output
 *
 * Params: sustain (0-100), filter (0-100), volume (0-100),
 *         scoop (0-100), crunch (0-100)
 */
class WayHugeSwollenPickleEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Swollen Pickle', 'wayhugeswollenpickle');

    // ===== Input HPF (sub-bass rumble cut) =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== First gain stage =====
    this.preGain1 = audioContext.createGain();
    this.preGain1.gain.value = 6.0;

    // Anti-alias LPF 1
    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    // First clipping stage
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper1.oversample = '4x';
    this.clipper1.curve = this._makePickleCurve(50, 1);

    // ===== Inter-stage filter (shapes tone between stages) =====
    this.interStageHPF = audioContext.createBiquadFilter();
    this.interStageHPF.type = 'highpass';
    this.interStageHPF.frequency.value = 60;
    this.interStageHPF.Q.value = 0.5;

    this.interStageLPF = audioContext.createBiquadFilter();
    this.interStageLPF.type = 'lowpass';
    this.interStageLPF.frequency.value = 6000;
    this.interStageLPF.Q.value = 0.5;

    // ===== Second gain stage =====
    this.preGain2 = audioContext.createGain();
    this.preGain2.gain.value = 5.0;

    // Anti-alias LPF 2
    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    // Second clipping stage (heavier)
    this.clipper2 = audioContext.createWaveShaper();
    this.clipper2.oversample = '4x';
    this.clipper2.curve = this._makePickleCurve(50, 2);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Scoop control (mid cut / boost) =====
    this.scoopFilter = audioContext.createBiquadFilter();
    this.scoopFilter.type = 'peaking';
    this.scoopFilter.frequency.value = 700;
    this.scoopFilter.Q.value = 1.2;
    this.scoopFilter.gain.value = 0;

    // Bass restoration (keep the massive low end)
    this.bassBoost = audioContext.createBiquadFilter();
    this.bassBoost.type = 'lowshelf';
    this.bassBoost.frequency.value = 200;
    this.bassBoost.gain.value = 3;

    // ===== Filter / tone control =====
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 4000;
    this.toneLPF.Q.value = 0.707;

    // ===== Crunch control (post-clip presence) =====
    this.crunchFilter = audioContext.createBiquadFilter();
    this.crunchFilter.type = 'peaking';
    this.crunchFilter.frequency.value = 2000;
    this.crunchFilter.Q.value = 0.8;
    this.crunchFilter.gain.value = 0;

    // ===== Output =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.3;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.preGain1);
    this.preGain1.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.clipper1);
    this.clipper1.connect(this.interStageHPF);
    this.interStageHPF.connect(this.interStageLPF);
    this.interStageLPF.connect(this.preGain2);
    this.preGain2.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.clipper2);
    this.clipper2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.scoopFilter);
    this.scoopFilter.connect(this.bassBoost);
    this.bassBoost.connect(this.toneLPF);
    this.toneLPF.connect(this.crunchFilter);
    this.crunchFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      sustain: 50,
      filter: 50,
      volume: 70,
      scoop: 50,
      crunch: 50
    };
  }

  /**
   * Swollen Pickle clipping: fat, heavy, sustained.
   * Stage 1: moderate drive, wider knee for body.
   * Stage 2: harder clip, narrower knee for sustain.
   */
  _makePickleCurve(sustain, stage) {
    const n = 65536;
    const curve = new Float32Array(n);

    const baseDrive = stage === 1 ? 1.8 : 2.5;
    const drive = baseDrive + (sustain / 100) * (stage === 1 ? 4 : 6);
    const knee = stage === 1 ? 0.28 : 0.18;
    const vt = stage === 1 ? 0.30 : 0.24;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Soft-clip with variable knee
      if (y > vt) {
        const over = y - vt;
        y = vt + Math.tanh(over / knee) * knee;
      } else if (y < -vt) {
        const under = y + vt;
        y = -vt + Math.tanh(under / knee) * knee;
      }

      // Heavy saturation
      y = Math.tanh(y * (stage === 1 ? 1.5 : 2.0));

      // Odd harmonics for fuzzy grind
      y += 0.05 * Math.tanh(x * drive * 2.0) * (stage === 1 ? 0.8 : 1.2);

      // Sustain compression
      y *= 1 - 0.04 * Math.min(1, Math.abs(x));

      curve[i] = y * 0.92;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'sustain': {
        // Both gain stages scale with sustain
        const g1 = 2 + (value / 100) * 14;
        const g2 = 1.5 + (value / 100) * 10;
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);
        // Regenerate curves
        this.clipper1.curve = this._makePickleCurve(value, 1);
        this.clipper2.curve = this._makePickleCurve(value, 2);
        // More sustain → tighter inter-stage LPF
        const isLPF = 7000 - (value / 100) * 3000;
        this.interStageLPF.frequency.setTargetAtTime(isLPF, now, 0.02);
        break;
      }

      case 'filter': {
        // 1500 Hz (dark/woolly) to 7000 Hz (bright/open)
        const freq = 1500 + (value / 100) * 5500;
        this.toneLPF.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      }

      case 'volume':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.7, now, 0.01);
        break;

      case 'scoop': {
        // 0 = flat; 50 = moderate mid scoop; 100 = deep scoop
        const dB = -(value / 100) * 12; // 0 to -12 dB
        this.scoopFilter.gain.setTargetAtTime(dB, now, 0.02);
        // Widen Q for deeper scoops
        const q = 0.8 + (value / 100) * 0.8;
        this.scoopFilter.Q.setTargetAtTime(q, now, 0.02);
        break;
      }

      case 'crunch': {
        // Adds upper-mid presence/bite
        const dB = ((value - 50) / 50) * 6; // ±6 dB
        this.crunchFilter.gain.setTargetAtTime(dB, now, 0.02);
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
      this.preGain1.disconnect();
      this.antiAliasLPF1.disconnect();
      this.clipper1.disconnect();
      this.interStageHPF.disconnect();
      this.interStageLPF.disconnect();
      this.preGain2.disconnect();
      this.antiAliasLPF2.disconnect();
      this.clipper2.disconnect();
      this.dcBlocker.disconnect();
      this.scoopFilter.disconnect();
      this.bassBoost.disconnect();
      this.toneLPF.disconnect();
      this.crunchFilter.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default WayHugeSwollenPickleEffect;
