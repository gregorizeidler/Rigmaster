import BaseEffect from './BaseEffect';

/**
 * BossOD3Effect
 *
 * Boss OD-3 OverDrive – dual-stage overdrive with a wider frequency
 * response than typical TS-style pedals.
 *
 * Key characteristics:
 *  - Dual-stage clipping: first stage soft (low gain), second stage harder
 *  - More open/wider mids than Tube Screamer (less mid-hump)
 *  - Extended bass response – doesn't cut lows as aggressively
 *  - Smooth transition from clean boost to moderate overdrive
 *  - Slightly compressed, amp-like feel
 *
 * Params: drive (0-100), tone (0-100), level (0-100)
 */
class BossOD3Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss OD-3', 'bossod3');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Pre-EQ – gentler mid presence than TS =====
    // OD-3 has a subtle broad mid bump, not a sharp hump
    this.preMidEQ = audioContext.createBiquadFilter();
    this.preMidEQ.type = 'peaking';
    this.preMidEQ.frequency.value = 900;
    this.preMidEQ.Q.value = 0.5; // very broad
    this.preMidEQ.gain.value = 3; // subtle

    // Gentle pre-bass roll-off (wider than TS – keeps more lows)
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 160; // much lower than TS ~340
    this.preBassHPF.Q.value = 0.5;

    // ===== First clipping stage (soft, low gain) =====
    this.preGain1 = audioContext.createGain();
    this.preGain1.gain.value = 1.8;

    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    this.clip1 = audioContext.createWaveShaper();
    this.clip1.oversample = '4x';
    this.clip1.curve = this._makeSoftClipCurve(50);

    this.dcBlocker1 = audioContext.createBiquadFilter();
    this.dcBlocker1.type = 'highpass';
    this.dcBlocker1.frequency.value = 10;
    this.dcBlocker1.Q.value = 0.707;

    // ===== Inter-stage filter =====
    // Shapes the signal between stages – slight treble taming
    this.interStageLPF = audioContext.createBiquadFilter();
    this.interStageLPF.type = 'lowpass';
    this.interStageLPF.frequency.value = 6000;
    this.interStageLPF.Q.value = 0.5;

    // ===== Second clipping stage (harder) =====
    this.preGain2 = audioContext.createGain();
    this.preGain2.gain.value = 1.4;

    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    this.clip2 = audioContext.createWaveShaper();
    this.clip2.oversample = '4x';
    this.clip2.curve = this._makeHardClipCurve(50);

    this.dcBlocker2 = audioContext.createBiquadFilter();
    this.dcBlocker2.type = 'highpass';
    this.dcBlocker2.frequency.value = 10;
    this.dcBlocker2.Q.value = 0.707;

    // ===== Post-clip tone shaping =====
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 3500;
    this.toneLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 80;
    this.postHPF.Q.value = 0.5;

    // Presence shelf – gives the OD-3 its "open" top end
    this.presenceShelf = audioContext.createBiquadFilter();
    this.presenceShelf.type = 'highshelf';
    this.presenceShelf.frequency.value = 3000;
    this.presenceShelf.gain.value = 1.5;

    // ===== Output level =====
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.5;

    // ===== Signal routing =====
    // Wet path (dual-stage):
    // input -> inHPF -> preBassHPF -> preMidEQ -> preGain1
    //   -> antiAliasLPF1 -> clip1 -> dcBlocker1 -> interStageLPF
    //   -> preGain2 -> antiAliasLPF2 -> clip2 -> dcBlocker2
    //   -> toneLPF -> postHPF -> presenceShelf -> levelGain
    //   -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.preMidEQ);
    this.preMidEQ.connect(this.preGain1);
    this.preGain1.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.clip1);
    this.clip1.connect(this.dcBlocker1);
    this.dcBlocker1.connect(this.interStageLPF);
    this.interStageLPF.connect(this.preGain2);
    this.preGain2.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.clip2);
    this.clip2.connect(this.dcBlocker2);
    this.dcBlocker2.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.presenceShelf);
    this.presenceShelf.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (BaseEffect bypass):
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal parameter state =====
    this.params = {
      drive: 50,
      tone: 50,
      level: 70
    };
  }

  /**
   * First stage: soft clipping curve.
   * Lower gain, gentle tanh-based saturation with slight asymmetry.
   */
  _makeSoftClipCurve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);
    const driveMul = 1 + (drive / 100) * 2.5; // 1..3.5
    const knee = 0.7; // soft knee

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Soft tanh clipping
      y = Math.tanh(y * knee);

      // Gentle asymmetry (slight even harmonics)
      y *= x >= 0 ? 1.05 : 0.95;

      // Low-level smoothing
      y *= 1 - 0.04 * Math.min(1, Math.abs(x));

      curve[i] = y * 0.95;
    }
    return curve;
  }

  /**
   * Second stage: harder clipping curve.
   * More aggressive saturation, tighter compression.
   */
  _makeHardClipCurve(drive) {
    const n = 65536;
    const curve = new Float32Array(n);
    const driveMul = 1 + (drive / 100) * 4; // 1..5
    const knee = 1.2; // harder knee

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Harder clip with sharper knee
      y = Math.tanh(y * knee);

      // More pronounced asymmetry
      y *= x >= 0 ? 1.1 : 0.9;

      // Compression character
      y *= 1 - 0.07 * Math.min(1, Math.abs(x));

      // Slight hard-clip limit for dynamics
      y = Math.max(-0.95, Math.min(0.95, y));

      curve[i] = y * 0.9;
    }
    return curve;
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
        // Stage 1 pre-gain
        const g1 = 1 + (value / 100) * 2.5;
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.clip1.curve = this._makeSoftClipCurve(value);

        // Stage 2 pre-gain (tracks drive but lower ratio)
        const g2 = 1 + (value / 100) * 1.8;
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);
        this.clip2.curve = this._makeHardClipCurve(value);

        // Inter-stage LPF opens slightly with more drive
        const interFreq = this._map(value, 4000, 8000);
        this.interStageLPF.frequency.setTargetAtTime(interFreq, now, 0.02);
        break;
      }

      case 'tone': {
        // Tone sweeps from dark to bright
        const cutoff = this._map(value, 1200, 6000);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        // Presence shelf tracks tone
        const presGain = this._map(value, -1, 3);
        this.presenceShelf.gain.setTargetAtTime(presGain, now, 0.02);
        break;
      }

      case 'level': {
        const vol = this._map(value, 0, 0.9);
        this.levelGain.gain.setTargetAtTime(vol, now, 0.01);
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
      this.preMidEQ.disconnect();
      this.preBassHPF.disconnect();
      this.preGain1.disconnect();
      this.antiAliasLPF1.disconnect();
      this.clip1.disconnect();
      this.dcBlocker1.disconnect();
      this.interStageLPF.disconnect();
      this.preGain2.disconnect();
      this.antiAliasLPF2.disconnect();
      this.clip2.disconnect();
      this.dcBlocker2.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.presenceShelf.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default BossOD3Effect;
