import BaseEffect from './BaseEffect';

/**
 * SuhrRiotEffect
 *
 * Suhr Riot – a versatile distortion pedal with three voicing modes
 * covering everything from clean boost to high-gain saturation.
 *
 * Key characteristics:
 *  - Three voicing modes: Classic (Marshall-like), Riot (modern high-gain),
 *    Hot (extra gain, scooped mids)
 *  - Wide gain range in each mode
 *  - Tight, focused low end
 *  - Responsive tone control
 *  - Retains clarity even at high gain
 *
 * Params: drive (0-100), tone (0-100), level (0-100),
 *         voicing ('classic'|'riot'|'hot')
 */
class SuhrRiotEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Suhr Riot', 'suhrriot');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Voicing-dependent pre-EQ =====
    // Mid scoop/boost EQ (changes with voicing mode)
    this.voiceMidEQ = audioContext.createBiquadFilter();
    this.voiceMidEQ.type = 'peaking';
    this.voiceMidEQ.frequency.value = 800;
    this.voiceMidEQ.Q.value = 0.6;
    this.voiceMidEQ.gain.value = 3; // default: Classic mode

    // Pre-bass shaping
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 180;
    this.preBassHPF.Q.value = 0.5;

    // Presence pre-lift
    this.prePresence = audioContext.createBiquadFilter();
    this.prePresence.type = 'highshelf';
    this.prePresence.frequency.value = 3000;
    this.prePresence.gain.value = 1.5;

    // ===== First gain stage =====
    this.preGain1 = audioContext.createGain();
    this.preGain1.gain.value = 2.5;

    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    this.clip1 = audioContext.createWaveShaper();
    this.clip1.oversample = '4x';
    this.clip1.curve = this._makeRiotCurveStage1(50, 'classic');

    this.dcBlocker1 = audioContext.createBiquadFilter();
    this.dcBlocker1.type = 'highpass';
    this.dcBlocker1.frequency.value = 10;
    this.dcBlocker1.Q.value = 0.707;

    // ===== Inter-stage filtering =====
    this.interStageLPF = audioContext.createBiquadFilter();
    this.interStageLPF.type = 'lowpass';
    this.interStageLPF.frequency.value = 6000;
    this.interStageLPF.Q.value = 0.5;

    this.interStageMid = audioContext.createBiquadFilter();
    this.interStageMid.type = 'peaking';
    this.interStageMid.frequency.value = 1000;
    this.interStageMid.Q.value = 0.5;
    this.interStageMid.gain.value = 1.5;

    // ===== Second gain stage =====
    this.preGain2 = audioContext.createGain();
    this.preGain2.gain.value = 1.8;

    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    this.clip2 = audioContext.createWaveShaper();
    this.clip2.oversample = '4x';
    this.clip2.curve = this._makeRiotCurveStage2(50, 'classic');

    this.dcBlocker2 = audioContext.createBiquadFilter();
    this.dcBlocker2.type = 'highpass';
    this.dcBlocker2.frequency.value = 10;
    this.dcBlocker2.Q.value = 0.707;

    // ===== Post-clip tone stack =====
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 4000;
    this.toneLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 90;
    this.postHPF.Q.value = 0.5;

    // Post-presence (voicing-dependent)
    this.postPresence = audioContext.createBiquadFilter();
    this.postPresence.type = 'peaking';
    this.postPresence.frequency.value = 3500;
    this.postPresence.Q.value = 0.7;
    this.postPresence.gain.value = 2;

    // Speaker-sim roll-off
    this.speakerLPF = audioContext.createBiquadFilter();
    this.speakerLPF.type = 'lowpass';
    this.speakerLPF.frequency.value = 7000;
    this.speakerLPF.Q.value = 0.5;

    // Low-end tightness
    this.postBassHPF = audioContext.createBiquadFilter();
    this.postBassHPF.type = 'highpass';
    this.postBassHPF.frequency.value = 100;
    this.postBassHPF.Q.value = 0.5;

    // ===== Output level =====
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.45;

    // ===== Signal routing =====
    // Wet path (dual-stage):
    // input -> inHPF -> preBassHPF -> voiceMidEQ -> prePresence
    //   -> preGain1 -> antiAliasLPF1 -> clip1 -> dcBlocker1
    //   -> interStageLPF -> interStageMid
    //   -> preGain2 -> antiAliasLPF2 -> clip2 -> dcBlocker2
    //   -> toneLPF -> postHPF -> postBassHPF -> postPresence
    //   -> speakerLPF -> levelGain -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.voiceMidEQ);
    this.voiceMidEQ.connect(this.prePresence);
    this.prePresence.connect(this.preGain1);
    this.preGain1.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.clip1);
    this.clip1.connect(this.dcBlocker1);
    this.dcBlocker1.connect(this.interStageLPF);
    this.interStageLPF.connect(this.interStageMid);
    this.interStageMid.connect(this.preGain2);
    this.preGain2.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.clip2);
    this.clip2.connect(this.dcBlocker2);
    this.dcBlocker2.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.postBassHPF);
    this.postBassHPF.connect(this.postPresence);
    this.postPresence.connect(this.speakerLPF);
    this.speakerLPF.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      drive: 50,
      tone: 50,
      level: 45,
      voicing: 'classic' // 'classic' | 'riot' | 'hot'
    };
  }

  /**
   * Voicing presets – shapes pre-EQ and clipping character.
   */
  _getVoicingParams(voicing) {
    switch (voicing) {
      case 'classic':
        return {
          midFreq: 800, midGain: 3, midQ: 0.6,
          bassHPF: 180, presGain: 1.5,
          gainMul1: 1.0, gainMul2: 1.0,
          knee1: 0.85, knee2: 1.0,
          postPresGain: 2
        };
      case 'riot':
        return {
          midFreq: 1000, midGain: 4, midQ: 0.7,
          bassHPF: 200, presGain: 2.5,
          gainMul1: 1.4, gainMul2: 1.3,
          knee1: 1.0, knee2: 1.2,
          postPresGain: 3
        };
      case 'hot':
        return {
          midFreq: 600, midGain: -2, midQ: 0.5, // scooped mids
          bassHPF: 220, presGain: 3,
          gainMul1: 1.8, gainMul2: 1.6,
          knee1: 1.1, knee2: 1.4,
          postPresGain: 4
        };
      default:
        return this._getVoicingParams('classic');
    }
  }

  /**
   * Stage 1 clipping curve – voicing-dependent.
   */
  _makeRiotCurveStage1(drive, voicing) {
    const n = 65536;
    const curve = new Float32Array(n);
    const vp = this._getVoicingParams(voicing);
    const driveMul = (1 + (drive / 100) * 4.0) * vp.gainMul1;
    const knee = vp.knee1;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;
      y = Math.tanh(y * knee);
      // Asymmetry increases with voicing aggression
      const asym = voicing === 'hot' ? 1.15 : voicing === 'riot' ? 1.1 : 1.08;
      y *= x >= 0 ? asym : (2 - asym);
      y *= 1 - 0.06 * Math.min(1, Math.abs(x));
      y += 0.02 * Math.tanh(x * driveMul * 1.2);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  /**
   * Stage 2 clipping curve – harder, voicing-dependent.
   */
  _makeRiotCurveStage2(drive, voicing) {
    const n = 65536;
    const curve = new Float32Array(n);
    const vp = this._getVoicingParams(voicing);
    const driveMul = (1 + (drive / 100) * 3.0) * vp.gainMul2;
    const knee = vp.knee2;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;
      y = Math.tanh(y * knee);
      const asym = voicing === 'hot' ? 1.12 : voicing === 'riot' ? 1.08 : 1.05;
      y *= x >= 0 ? asym : (2 - asym);
      y *= 1 - 0.07 * Math.min(1, Math.abs(x));
      // Power-tube third harmonic
      y += 0.012 * Math.tanh(x * driveMul * 0.6) * Math.tanh(x * 3);
      y = Math.max(-0.96, Math.min(0.96, y));
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _map(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  /**
   * Apply voicing preset to all affected nodes.
   */
  _applyVoicing(voicing) {
    const now = this.audioContext.currentTime;
    const vp = this._getVoicingParams(voicing);

    this.voiceMidEQ.frequency.setTargetAtTime(vp.midFreq, now, 0.02);
    this.voiceMidEQ.gain.setTargetAtTime(vp.midGain, now, 0.02);
    this.voiceMidEQ.Q.setTargetAtTime(vp.midQ, now, 0.02);
    this.preBassHPF.frequency.setTargetAtTime(vp.bassHPF, now, 0.02);
    this.prePresence.gain.setTargetAtTime(vp.presGain, now, 0.02);
    this.postPresence.gain.setTargetAtTime(vp.postPresGain, now, 0.02);

    // Regenerate clipping curves
    this.clip1.curve = this._makeRiotCurveStage1(this.params.drive, voicing);
    this.clip2.curve = this._makeRiotCurveStage2(this.params.drive, voicing);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        const vp = this._getVoicingParams(this.params.voicing);
        // Stage 1
        const g1 = (1 + (value / 100) * 4.0) * vp.gainMul1;
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.clip1.curve = this._makeRiotCurveStage1(value, this.params.voicing);
        // Stage 2
        const g2 = (1 + (value / 100) * 3.0) * vp.gainMul2;
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);
        this.clip2.curve = this._makeRiotCurveStage2(value, this.params.voicing);
        // Inter-stage opens with drive
        const interFreq = this._map(value, 4500, 8000);
        this.interStageLPF.frequency.setTargetAtTime(interFreq, now, 0.02);
        break;
      }

      case 'tone': {
        const cutoff = this._map(value, 1500, 7000);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        const spkFreq = this._map(value, 5000, 10000);
        this.speakerLPF.frequency.setTargetAtTime(spkFreq, now, 0.02);
        break;
      }

      case 'level': {
        const vol = this._map(value, 0, 0.9);
        this.levelGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'voicing': {
        this._applyVoicing(value);
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
      this.voiceMidEQ.disconnect();
      this.preBassHPF.disconnect();
      this.prePresence.disconnect();
      this.preGain1.disconnect();
      this.antiAliasLPF1.disconnect();
      this.clip1.disconnect();
      this.dcBlocker1.disconnect();
      this.interStageLPF.disconnect();
      this.interStageMid.disconnect();
      this.preGain2.disconnect();
      this.antiAliasLPF2.disconnect();
      this.clip2.disconnect();
      this.dcBlocker2.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.postBassHPF.disconnect();
      this.postPresence.disconnect();
      this.speakerLPF.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default SuhrRiotEffect;
