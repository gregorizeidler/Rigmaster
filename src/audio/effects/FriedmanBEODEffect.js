import BaseEffect from './BaseEffect';

/**
 * FriedmanBEODEffect
 *
 * Friedman BE-OD – a high-gain overdrive that captures the sound
 * of the legendary Friedman BE-100 amplifier's preamp stage.
 *
 * Key characteristics:
 *  - Massive gain range – from moderate crunch to high-gain saturation
 *  - Tight, focused low end (Tight control for bass response)
 *  - Aggressive upper-midrange presence
 *  - Treble and bass tone controls
 *  - Three gain stages cascaded for amp-like saturation
 *  - Retains note definition even at extreme gain settings
 *
 * Params: gain (0-100), volume (0-100), treble (0-100), bass (0-100), tight (0-100)
 */
class FriedmanBEODEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Friedman BE-OD', 'friedmanbeod');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Tight control – variable bass HPF before clipping =====
    this.tightHPF = audioContext.createBiquadFilter();
    this.tightHPF.type = 'highpass';
    this.tightHPF.frequency.value = 120; // default moderate tightness
    this.tightHPF.Q.value = 0.6;

    // ===== Pre-EQ (BE-100 preamp voicing) =====
    // Aggressive upper-mid presence
    this.preMidEQ = audioContext.createBiquadFilter();
    this.preMidEQ.type = 'peaking';
    this.preMidEQ.frequency.value = 1500;
    this.preMidEQ.Q.value = 0.7;
    this.preMidEQ.gain.value = 5;

    // Presence lift
    this.prePresence = audioContext.createBiquadFilter();
    this.prePresence.type = 'highshelf';
    this.prePresence.frequency.value = 3500;
    this.prePresence.gain.value = 2;

    // ===== First gain stage =====
    this.preGain1 = audioContext.createGain();
    this.preGain1.gain.value = 2.5;

    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    this.clip1 = audioContext.createWaveShaper();
    this.clip1.oversample = '4x';
    this.clip1.curve = this._makeBEODCurveStage1(50);

    this.dcBlocker1 = audioContext.createBiquadFilter();
    this.dcBlocker1.type = 'highpass';
    this.dcBlocker1.frequency.value = 10;
    this.dcBlocker1.Q.value = 0.707;

    // ===== Inter-stage EQ =====
    // Tames fizz between stages
    this.interStageLPF = audioContext.createBiquadFilter();
    this.interStageLPF.type = 'lowpass';
    this.interStageLPF.frequency.value = 5500;
    this.interStageLPF.Q.value = 0.5;

    // Inter-stage mid focus
    this.interStageMid = audioContext.createBiquadFilter();
    this.interStageMid.type = 'peaking';
    this.interStageMid.frequency.value = 1200;
    this.interStageMid.Q.value = 0.6;
    this.interStageMid.gain.value = 2;

    // ===== Second gain stage =====
    this.preGain2 = audioContext.createGain();
    this.preGain2.gain.value = 2.0;

    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    this.clip2 = audioContext.createWaveShaper();
    this.clip2.oversample = '4x';
    this.clip2.curve = this._makeBEODCurveStage2(50);

    this.dcBlocker2 = audioContext.createBiquadFilter();
    this.dcBlocker2.type = 'highpass';
    this.dcBlocker2.frequency.value = 10;
    this.dcBlocker2.Q.value = 0.707;

    // ===== Third gain stage (power amp simulation) =====
    this.preGain3 = audioContext.createGain();
    this.preGain3.gain.value = 1.3;

    this.antiAliasLPF3 = audioContext.createBiquadFilter();
    this.antiAliasLPF3.type = 'lowpass';
    this.antiAliasLPF3.frequency.value = 18000;
    this.antiAliasLPF3.Q.value = 0.707;

    this.clip3 = audioContext.createWaveShaper();
    this.clip3.oversample = '4x';
    this.clip3.curve = this._makeBEODCurveStage3();

    this.dcBlocker3 = audioContext.createBiquadFilter();
    this.dcBlocker3.type = 'highpass';
    this.dcBlocker3.frequency.value = 10;
    this.dcBlocker3.Q.value = 0.707;

    // ===== Post-clip tone stack =====
    // Treble control
    this.trebleShelf = audioContext.createBiquadFilter();
    this.trebleShelf.type = 'highshelf';
    this.trebleShelf.frequency.value = 2500;
    this.trebleShelf.gain.value = 0;

    // Bass control
    this.bassShelf = audioContext.createBiquadFilter();
    this.bassShelf.type = 'lowshelf';
    this.bassShelf.frequency.value = 300;
    this.bassShelf.gain.value = 0;

    // Post HPF for tightness
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 80;
    this.postHPF.Q.value = 0.5;

    // Speaker-sim roll-off
    this.speakerLPF = audioContext.createBiquadFilter();
    this.speakerLPF.type = 'lowpass';
    this.speakerLPF.frequency.value = 6500;
    this.speakerLPF.Q.value = 0.5;

    // ===== Output volume =====
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.4;

    // ===== Signal routing =====
    // Wet path (triple-stage):
    // input -> inHPF -> tightHPF -> preMidEQ -> prePresence
    //   -> preGain1 -> antiAliasLPF1 -> clip1 -> dcBlocker1
    //   -> interStageLPF -> interStageMid
    //   -> preGain2 -> antiAliasLPF2 -> clip2 -> dcBlocker2
    //   -> preGain3 -> antiAliasLPF3 -> clip3 -> dcBlocker3
    //   -> trebleShelf -> bassShelf -> postHPF -> speakerLPF
    //   -> volumeGain -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.tightHPF);
    this.tightHPF.connect(this.preMidEQ);
    this.preMidEQ.connect(this.prePresence);
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
    this.dcBlocker2.connect(this.preGain3);
    this.preGain3.connect(this.antiAliasLPF3);
    this.antiAliasLPF3.connect(this.clip3);
    this.clip3.connect(this.dcBlocker3);
    this.dcBlocker3.connect(this.trebleShelf);
    this.trebleShelf.connect(this.bassShelf);
    this.bassShelf.connect(this.postHPF);
    this.postHPF.connect(this.speakerLPF);
    this.speakerLPF.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      gain: 50,
      volume: 40,
      treble: 50,
      bass: 50,
      tight: 50
    };
  }

  /**
   * Stage 1: Preamp input stage – moderate, amp-like clipping.
   * Asymmetric for tube character.
   */
  _makeBEODCurveStage1(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const driveMul = 1 + (gain / 100) * 5.0; // 1..6
    const knee = 0.9;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;
      y = Math.tanh(y * knee);
      y *= x >= 0 ? 1.12 : 0.88; // strong asymmetry
      y *= 1 - 0.06 * Math.min(1, Math.abs(x));
      y += 0.02 * Math.tanh(x * driveMul * 1.5);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  /**
   * Stage 2: Secondary gain stage – harder, more compressed.
   */
  _makeBEODCurveStage2(gain) {
    const n = 65536;
    const curve = new Float32Array(n);
    const driveMul = 1 + (gain / 100) * 3.5; // cascaded – doesn't need as much
    const knee = 1.1;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;
      y = Math.tanh(y * knee);
      y *= x >= 0 ? 1.08 : 0.92;
      y *= 1 - 0.08 * Math.min(1, Math.abs(x));
      // Third harmonic for aggressive mids
      y += 0.015 * Math.tanh(x * driveMul * 0.7) * Math.tanh(x * 3);
      curve[i] = y * 0.88;
    }
    return curve;
  }

  /**
   * Stage 3: Power amp simulation – gentle, spongy compression.
   */
  _makeBEODCurveStage3() {
    const n = 65536;
    const curve = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * 1.5;
      // Very soft power-amp saturation
      y = Math.tanh(y * 0.6);
      y *= x >= 0 ? 1.05 : 0.95;
      y *= 1 - 0.03 * Math.min(1, Math.abs(x));
      curve[i] = y * 0.95;
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
      case 'gain': {
        // Stage 1 gain
        const g1 = 1 + (value / 100) * 5.0;
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.clip1.curve = this._makeBEODCurveStage1(value);

        // Stage 2 gain (tracks, lower ratio)
        const g2 = 1 + (value / 100) * 3.5;
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);
        this.clip2.curve = this._makeBEODCurveStage2(value);

        // Stage 3 stays relatively constant (power amp)
        const g3 = 1 + (value / 100) * 0.6;
        this.preGain3.gain.setTargetAtTime(g3, now, 0.01);

        // Pre-mid intensity tracks gain
        const midGain = 3 + (value / 100) * 5; // 3..8 dB
        this.preMidEQ.gain.setTargetAtTime(midGain, now, 0.02);

        // Inter-stage LPF opens with more gain
        const interFreq = this._map(value, 4000, 7000);
        this.interStageLPF.frequency.setTargetAtTime(interFreq, now, 0.02);
        break;
      }

      case 'volume': {
        const vol = this._map(value, 0, 0.8);
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'treble': {
        // Treble shelf: -4 to +6 dB
        const dB = this._map(value, -4, 6);
        this.trebleShelf.gain.setTargetAtTime(dB, now, 0.02);
        // Speaker LPF tracks treble
        const spkFreq = this._map(value, 4500, 9000);
        this.speakerLPF.frequency.setTargetAtTime(spkFreq, now, 0.02);
        break;
      }

      case 'bass': {
        // Bass shelf: -5 to +4 dB
        const dB = this._map(value, -5, 4);
        this.bassShelf.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'tight': {
        // Tight HPF: 50..350 Hz (more tight = higher cutoff)
        const hpfFreq = this._map(value, 50, 350);
        this.tightHPF.frequency.setTargetAtTime(hpfFreq, now, 0.02);
        // Post HPF also tracks tight
        const postFreq = this._map(value, 60, 200);
        this.postHPF.frequency.setTargetAtTime(postFreq, now, 0.02);
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
      this.tightHPF.disconnect();
      this.preMidEQ.disconnect();
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
      this.preGain3.disconnect();
      this.antiAliasLPF3.disconnect();
      this.clip3.disconnect();
      this.dcBlocker3.disconnect();
      this.trebleShelf.disconnect();
      this.bassShelf.disconnect();
      this.postHPF.disconnect();
      this.speakerLPF.disconnect();
      this.volumeGain.disconnect();
    } catch (e) {}
  }
}

export default FriedmanBEODEffect;
