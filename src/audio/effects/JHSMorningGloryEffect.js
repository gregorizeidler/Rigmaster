import BaseEffect from './BaseEffect';

/**
 * JHSMorningGloryEffect
 *
 * JHS Morning Glory – a "Marshall-in-a-box" overdrive that emulates
 * the sound of a cranked vintage Marshall amp at breakup.
 *
 * Key characteristics:
 *  - Emulates Marshall JTM45/Plexi breakup character
 *  - Asymmetric clipping for amp-like even/odd harmonic blend
 *  - Hi/Lo gain toggle for two gain ranges
 *  - Presence-style filter for upper-mid clarity
 *  - Responsive to pick dynamics (touch-sensitive)
 *  - Open, non-scooped frequency response
 *
 * Params: drive (0-100), tone (0-100), volume (0-100), gain_toggle ('hi'|'lo')
 */
class JHSMorningGloryEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'JHS Morning Glory', 'jhsmorningglory');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Marshall-style pre-EQ =====
    // Marshall amps have a broad midrange character, not a narrow hump
    this.preMidEQ = audioContext.createBiquadFilter();
    this.preMidEQ.type = 'peaking';
    this.preMidEQ.frequency.value = 800;
    this.preMidEQ.Q.value = 0.4; // very broad – Marshall character
    this.preMidEQ.gain.value = 4;

    // Bass presence (Marshall coupling caps allow more bass than TS)
    this.preBassShelf = audioContext.createBiquadFilter();
    this.preBassShelf.type = 'lowshelf';
    this.preBassShelf.frequency.value = 250;
    this.preBassShelf.gain.value = -2; // slight cut to avoid mud

    // Treble pre-lift (Marshall brightness)
    this.preTreble = audioContext.createBiquadFilter();
    this.preTreble.type = 'highshelf';
    this.preTreble.frequency.value = 3000;
    this.preTreble.gain.value = 2;

    // ===== Gain stage =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 3.0;

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – Marshall-style asymmetric clipping
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeMorningGloryCurve(50, 'lo');

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip tone shaping =====
    // Tone control – broad LPF sweep
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 4000;
    this.toneLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 70;
    this.postHPF.Q.value = 0.5;

    // Presence filter – upper-mid clarity like a Marshall presence control
    this.presenceEQ = audioContext.createBiquadFilter();
    this.presenceEQ.type = 'peaking';
    this.presenceEQ.frequency.value = 3500;
    this.presenceEQ.Q.value = 0.8;
    this.presenceEQ.gain.value = 2.5;

    // Speaker-like roll-off
    this.speakerRolloff = audioContext.createBiquadFilter();
    this.speakerRolloff.type = 'lowpass';
    this.speakerRolloff.frequency.value = 7000;
    this.speakerRolloff.Q.value = 0.5;

    // Low-end tightness post clip
    this.postBassHPF = audioContext.createBiquadFilter();
    this.postBassHPF.type = 'highpass';
    this.postBassHPF.frequency.value = 100;
    this.postBassHPF.Q.value = 0.5;

    // ===== Output volume =====
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.55;

    // ===== Signal routing =====
    // Wet path:
    // input -> inHPF -> preBassShelf -> preMidEQ -> preTreble -> preGain
    //   -> antiAliasLPF -> clip -> dcBlocker
    //   -> toneLPF -> postHPF -> postBassHPF -> presenceEQ -> speakerRolloff
    //   -> volumeGain -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassShelf);
    this.preBassShelf.connect(this.preMidEQ);
    this.preMidEQ.connect(this.preTreble);
    this.preTreble.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.postBassHPF);
    this.postBassHPF.connect(this.presenceEQ);
    this.presenceEQ.connect(this.speakerRolloff);
    this.speakerRolloff.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      drive: 50,
      tone: 50,
      volume: 55,
      gain_toggle: 'lo' // 'hi' or 'lo'
    };
  }

  /**
   * Morning Glory clipping curve – Marshall-style breakup.
   * Pronounced asymmetry creates the amp-like even/odd harmonic blend.
   * 'hi' mode adds more gain and harder clipping.
   */
  _makeMorningGloryCurve(drive, mode = 'lo') {
    const n = 65536;
    const curve = new Float32Array(n);

    const isHi = mode === 'hi';
    const gainMultiplier = isHi ? 1.6 : 1.0;
    const driveMul = (1 + (drive / 100) * 4.5) * gainMultiplier; // lo: 1..5.5, hi: 1.6..8.8
    const knee = isHi ? 1.1 : 0.85; // harder knee in hi mode

    // Marshall amps have pronounced asymmetry
    const asymPos = 1.15;
    const asymNeg = 0.85;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Primary clipping
      y = Math.tanh(y * knee);

      // Strong asymmetry (Marshall character – lots of even harmonics)
      y *= x >= 0 ? asymPos : asymNeg;

      // Amp-like sag/compression
      y *= 1 - 0.07 * Math.min(1, Math.abs(x));

      // Third harmonic presence (power tube character)
      y += 0.025 * Math.tanh(x * driveMul * 0.8) * Math.tanh(x * 3);

      // Even harmonic warmth
      y += 0.02 * Math.tanh(x * driveMul * 1.2);

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
        const gainMul = this.params.gain_toggle === 'hi' ? 1.6 : 1.0;
        const gain = (1 + (value / 100) * 4.5) * gainMul;
        this.preGain.gain.setTargetAtTime(gain, now, 0.01);
        this.clip.curve = this._makeMorningGloryCurve(value, this.params.gain_toggle);
        // Pre-mid intensity tracks drive
        const midGain = 2 + (value / 100) * 4; // 2..6 dB
        this.preMidEQ.gain.setTargetAtTime(midGain, now, 0.02);
        break;
      }

      case 'tone': {
        // Tone sweeps LPF: 1500..7000 Hz
        const cutoff = this._map(value, 1500, 7000);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        // Presence tracks tone
        const presGain = this._map(value, 1, 4);
        this.presenceEQ.gain.setTargetAtTime(presGain, now, 0.02);
        // Speaker rolloff tracks tone
        const spkFreq = this._map(value, 5000, 10000);
        this.speakerRolloff.frequency.setTargetAtTime(spkFreq, now, 0.02);
        break;
      }

      case 'volume': {
        const vol = this._map(value, 0, 1.0);
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'gain_toggle': {
        // Regenerate curve with new gain mode
        this.clip.curve = this._makeMorningGloryCurve(this.params.drive, value);
        // Update pre-gain for new mode
        const gainMul = value === 'hi' ? 1.6 : 1.0;
        const gain = (1 + (this.params.drive / 100) * 4.5) * gainMul;
        this.preGain.gain.setTargetAtTime(gain, now, 0.01);
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
      this.preBassShelf.disconnect();
      this.preTreble.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.postBassHPF.disconnect();
      this.presenceEQ.disconnect();
      this.speakerRolloff.disconnect();
      this.volumeGain.disconnect();
    } catch (e) {}
  }
}

export default JHSMorningGloryEffect;
