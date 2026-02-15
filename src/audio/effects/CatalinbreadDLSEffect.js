import BaseEffect from './BaseEffect';

/**
 * CatalinbreadDLSEffect
 *
 * Catalinbread Dirty Little Secret – Marshall-in-a-box distortion.
 * Emulates a cranked Marshall Superlead / Super Bass / Hot Rod.
 *
 * Signal chain:
 *   input → inputHPF → preGain → antiAliasLPF → clipper → dcBlocker
 *         → toneStack (bass/mid/treble) → presence → postGain → wetGain → output
 *
 * Three-way EQ voicing switch:
 *   - 'super_bass'  : deeper lows, scooped mids
 *   - 'super_lead'  : classic mid-forward, tight bass
 *   - 'hot_rod'     : boosted mids, more gain, brighter
 *
 * Params: gain (0-100), volume (0-100), bass (0-100), mids (0-100),
 *         treble (0-100), voicing ('super_bass'|'super_lead'|'hot_rod')
 */
class CatalinbreadDLSEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Catalinbread DLS', 'catalinbreaddls');

    // ===== Input buffer / sub-bass cut =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== Pre-gain stage (Marshall preamp push) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 4.0;

    // ===== Mid-hump pre-emphasis (Marshall character) =====
    this.midPush = audioContext.createBiquadFilter();
    this.midPush.type = 'peaking';
    this.midPush.frequency.value = 800;
    this.midPush.Q.value = 0.8;
    this.midPush.gain.value = 3.0;

    // ===== Anti-alias LPF before clipping =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== WaveShaper – cranked Marshall clipping =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this._makeMarshallCurve(50);

    // ===== DC blocker post-clip =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip fizz control =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8000;
    this.postLPF.Q.value = 0.5;

    // ===== Tone stack (Marshall 3-band) =====
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 250;
    this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking';
    this.midEQ.frequency.value = 800;
    this.midEQ.Q.value = 1.2;
    this.midEQ.gain.value = 0;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 3200;
    this.trebleEQ.gain.value = 0;

    // ===== Presence (upper-mid air) =====
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 4500;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = 2.0;

    // ===== Output level =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.4;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.midPush);
    this.midPush.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postLPF);
    this.postLPF.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.presence);
    this.presence.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      gain: 50,
      volume: 70,
      bass: 50,
      mids: 50,
      treble: 50,
      voicing: 'super_lead'
    };

    this._applyVoicing('super_lead');
  }

  /**
   * Marshall-style clipping curve: asymmetric soft-clip with tube-like
   * even harmonics and compression that increases with gain.
   */
  _makeMarshallCurve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const drive = 1.5 + (gain / 100) * 6.0;
    const knee = 0.35;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Asymmetric soft clipping (positive side clips harder – tube push-pull)
      const vtPos = 0.32;
      const vtNeg = 0.38;
      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // Tube saturation compression
      y = Math.tanh(y * 1.4);

      // Even harmonics (tube warmth)
      y += 0.06 * Math.tanh(x * drive * 2.0);

      // Slight sag at peaks (power-amp feel)
      y *= 1 - 0.05 * Math.min(1, Math.abs(x));

      curve[i] = y * 0.92;
    }
    return curve;
  }

  /**
   * Apply voicing preset for the three EQ modes:
   * super_bass, super_lead, hot_rod
   */
  _applyVoicing(mode) {
    const now = this.audioContext.currentTime;
    const presets = {
      super_bass: {
        bassFreq: 200, bassGain: 4, midFreq: 600, midGain: -2, midQ: 0.9,
        trebleFreq: 3000, trebleGain: -1, presGain: 1, postLPF: 7000, midPushGain: 1
      },
      super_lead: {
        bassFreq: 250, bassGain: 0, midFreq: 800, midGain: 3, midQ: 1.2,
        trebleFreq: 3200, trebleGain: 1, presGain: 2.5, postLPF: 8500, midPushGain: 3
      },
      hot_rod: {
        bassFreq: 280, bassGain: 1, midFreq: 1000, midGain: 5, midQ: 1.0,
        trebleFreq: 3500, trebleGain: 3, presGain: 3.5, postLPF: 9500, midPushGain: 5
      }
    };
    const p = presets[mode] || presets.super_lead;

    this.bassEQ.frequency.setTargetAtTime(p.bassFreq, now, 0.02);
    this.bassEQ.gain.setTargetAtTime(p.bassGain, now, 0.02);
    this.midEQ.frequency.setTargetAtTime(p.midFreq, now, 0.02);
    this.midEQ.Q.setTargetAtTime(p.midQ, now, 0.02);
    this.midEQ.gain.setTargetAtTime(p.midGain, now, 0.02);
    this.trebleEQ.frequency.setTargetAtTime(p.trebleFreq, now, 0.02);
    this.trebleEQ.gain.setTargetAtTime(p.trebleGain, now, 0.02);
    this.presence.gain.setTargetAtTime(p.presGain, now, 0.02);
    this.postLPF.frequency.setTargetAtTime(p.postLPF, now, 0.02);
    this.midPush.gain.setTargetAtTime(p.midPushGain, now, 0.02);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        const g = 1.5 + (value / 100) * 10;
        this.preGain.gain.setTargetAtTime(g, now, 0.01);
        this.clipper.curve = this._makeMarshallCurve(value);
        // Higher gain → tighter post-LPF to control fizz
        const lpf = 9500 - (value / 100) * 3000;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
        break;
      }

      case 'volume':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.85, now, 0.01);
        break;

      case 'bass': {
        const dB = ((value - 50) / 50) * 8; // ±8 dB
        this.bassEQ.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'mids': {
        const dB = ((value - 50) / 50) * 8;
        this.midEQ.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'treble': {
        const dB = ((value - 50) / 50) * 8;
        this.trebleEQ.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'voicing':
        this._applyVoicing(value);
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
      this.midPush.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.postLPF.disconnect();
      this.bassEQ.disconnect();
      this.midEQ.disconnect();
      this.trebleEQ.disconnect();
      this.presence.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default CatalinbreadDLSEffect;
