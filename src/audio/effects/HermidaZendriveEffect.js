import BaseEffect from './BaseEffect';

/**
 * HermidaZendriveEffect
 *
 * Hermida Zendrive – a Dumble-style overdrive renowned for its
 * smooth, vocal midrange and rich harmonic overtones.
 *
 * Key characteristics:
 *  - Dumble Overdrive Special emulation
 *  - Smooth, compressed saturation (FET-like clipping)
 *  - Vocal midrange character with adjustable "voice" control
 *  - Rich even-order harmonics
 *  - Dynamic response – cleans up beautifully with volume roll-off
 *  - Warm but never muddy
 *
 * Params: gain (0-100), tone (0-100), voice (0-100), volume (0-100)
 */
class HermidaZendriveEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Hermida Zendrive', 'hermidazendrive');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;
    this.inHPF.Q.value = 0.707;

    // ===== Dumble-style pre-EQ =====
    // The Dumble ODS has a complex pre-EQ that shapes the signal
    // before the gain stage with a focus on upper-mids
    this.preVoiceEQ = audioContext.createBiquadFilter();
    this.preVoiceEQ.type = 'peaking';
    this.preVoiceEQ.frequency.value = 1200; // vocal mid focus
    this.preVoiceEQ.Q.value = 1.0;
    this.preVoiceEQ.gain.value = 5;

    // Bass shaping – Dumble has controlled bass
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 200;
    this.preBassHPF.Q.value = 0.5;

    // Low-shelf to add body without mud
    this.preBassShelf = audioContext.createBiquadFilter();
    this.preBassShelf.type = 'lowshelf';
    this.preBassShelf.frequency.value = 300;
    this.preBassShelf.gain.value = -1;

    // Pre-presence lift (Dumble air)
    this.prePresence = audioContext.createBiquadFilter();
    this.prePresence.type = 'highshelf';
    this.prePresence.frequency.value = 3500;
    this.prePresence.gain.value = 1.5;

    // ===== Gain stage =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.5;

    // Anti-alias LPF before WaveShaper
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // WaveShaper – Dumble FET-style smooth saturation
    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this._makeZendriveCurve(50);

    // DC Blocker HPF after WaveShaper
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip tone shaping =====
    // Tone control LPF
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 4500;
    this.toneLPF.Q.value = 0.5;

    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 90;
    this.postHPF.Q.value = 0.5;

    // Voice control – sweepable mid-focus EQ (the Zendrive's secret)
    this.voiceEQ = audioContext.createBiquadFilter();
    this.voiceEQ.type = 'peaking';
    this.voiceEQ.frequency.value = 800;
    this.voiceEQ.Q.value = 1.2;
    this.voiceEQ.gain.value = 3;

    // Smooth post-presence (Dumble warmth)
    this.postPresence = audioContext.createBiquadFilter();
    this.postPresence.type = 'peaking';
    this.postPresence.frequency.value = 3000;
    this.postPresence.Q.value = 0.6;
    this.postPresence.gain.value = 1;

    // Top-end smoothing (no fizz)
    this.smoothLPF = audioContext.createBiquadFilter();
    this.smoothLPF.type = 'lowpass';
    this.smoothLPF.frequency.value = 8000;
    this.smoothLPF.Q.value = 0.5;

    // ===== Output volume =====
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.55;

    // ===== Signal routing =====
    // Wet path:
    // input -> inHPF -> preBassHPF -> preBassShelf -> preVoiceEQ
    //   -> prePresence -> preGain -> antiAliasLPF -> clip -> dcBlocker
    //   -> toneLPF -> postHPF -> voiceEQ -> postPresence -> smoothLPF
    //   -> volumeGain -> wetGain -> output
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preBassHPF);
    this.preBassHPF.connect(this.preBassShelf);
    this.preBassShelf.connect(this.preVoiceEQ);
    this.preVoiceEQ.connect(this.prePresence);
    this.prePresence.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.voiceEQ);
    this.voiceEQ.connect(this.postPresence);
    this.postPresence.connect(this.smoothLPF);
    this.smoothLPF.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path:
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal state =====
    this.params = {
      gain: 50,
      tone: 50,
      voice: 50,
      volume: 55
    };
  }

  /**
   * Zendrive clipping curve – Dumble FET-style saturation.
   * Very smooth, compressed feel with rich even harmonics.
   * The curve uses a combination of tanh and algebraic soft clipping
   * to achieve the Dumble's legendary smoothness.
   */
  _makeZendriveCurve(gain) {
    const n = 65536;
    const curve = new Float32Array(n);

    const driveMul = 1 + (gain / 100) * 4.5; // 1..5.5
    const smoothKnee = 0.75;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // Primary: smooth tanh saturation
      const tanhPart = Math.tanh(y * smoothKnee);

      // Secondary: algebraic soft clip for extra smoothness
      // f(x) = x / (1 + |x|) – even smoother than tanh at onset
      const algPart = y / (1 + Math.abs(y * 0.8));

      // Blend: 60% tanh, 40% algebraic for Dumble smoothness
      y = tanhPart * 0.6 + algPart * 0.4;

      // Even-order harmonic richness (slight asymmetry)
      y *= x >= 0 ? 1.08 : 0.92;

      // FET-like compression – smooth, consistent
      y *= 1 - 0.05 * Math.min(1, Math.abs(x));

      // Second harmonic warmth
      y += 0.02 * (x * x) * Math.sign(x) * Math.exp(-2 * Math.abs(x));

      // Subtle tube-like sag
      y += 0.015 * Math.tanh(x * driveMul * 0.6);

      curve[i] = y * 0.92;
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
        const gain = 1 + (value / 100) * 4.5;
        this.preGain.gain.setTargetAtTime(gain, now, 0.01);
        this.clip.curve = this._makeZendriveCurve(value);
        // Pre-voice intensity tracks gain
        const voiceGain = 3 + (value / 100) * 4; // 3..7 dB
        this.preVoiceEQ.gain.setTargetAtTime(voiceGain, now, 0.02);
        break;
      }

      case 'tone': {
        // Tone sweeps LPF: 2000..7000 Hz
        const cutoff = this._map(value, 2000, 7000);
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        // Smooth LPF tracks tone
        const smoothFreq = this._map(value, 5000, 12000);
        this.smoothLPF.frequency.setTargetAtTime(smoothFreq, now, 0.02);
        break;
      }

      case 'voice': {
        // Voice control: sweeps the mid-focus frequency 400..1600 Hz
        const voiceFreq = this._map(value, 400, 1600);
        this.voiceEQ.frequency.setTargetAtTime(voiceFreq, now, 0.02);
        // Voice gain: more voice = more mid focus
        const vGain = this._map(value, 1, 6);
        this.voiceEQ.gain.setTargetAtTime(vGain, now, 0.02);
        // Q narrows slightly at higher voice
        const vQ = this._map(value, 0.8, 1.8);
        this.voiceEQ.Q.setTargetAtTime(vQ, now, 0.02);
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
      this.preBassHPF.disconnect();
      this.preBassShelf.disconnect();
      this.preVoiceEQ.disconnect();
      this.prePresence.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.voiceEQ.disconnect();
      this.postPresence.disconnect();
      this.smoothLPF.disconnect();
      this.volumeGain.disconnect();
    } catch (e) {}
  }
}

export default HermidaZendriveEffect;
