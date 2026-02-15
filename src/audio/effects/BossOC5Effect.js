import BaseEffect from './BaseEffect';

class BossOC5Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss OC-5', 'bossoc5');

    // ── Mode: 'vintage' (monophonic analog-style) or 'poly' (polyphonic) ──
    this.mode = 'poly';

    // ── Mixer bus ──────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ── Voice gain controls ────────────────────────────────────
    this.oct1Gain = audioContext.createGain();  // -1 octave
    this.oct2Gain = audioContext.createGain();  // -2 octaves
    this.dryVoiceGain = audioContext.createGain();

    this.oct1Gain.gain.value = 0.0;
    this.oct2Gain.gain.value = 0.0;
    this.dryVoiceGain.gain.value = 1.0;

    // ── Range filter (input conditioning) ──────────────────────
    // Controls the frequency range the octave tracking responds to
    this.rangeLPF = audioContext.createBiquadFilter();
    this.rangeLPF.type = 'lowpass';
    this.rangeLPF.frequency.value = 4000;
    this.rangeLPF.Q.value = 0.707;

    this.rangeHPF = audioContext.createBiquadFilter();
    this.rangeHPF.type = 'highpass';
    this.rangeHPF.frequency.value = 60;
    this.rangeHPF.Q.value = 0.707;

    // ── Octave-1 path (waveshaper frequency divider) ───────────
    this.oct1Shaper = audioContext.createWaveShaper();
    this.oct1Shaper.curve = this._makeSquareCurve(1024);
    this.oct1Shaper.oversample = '4x';

    this.oct1Delay = audioContext.createDelay(0.05);
    this.oct1Delay.delayTime.value = 0.015;

    this.oct1LPF = audioContext.createBiquadFilter();
    this.oct1LPF.type = 'lowpass';
    this.oct1LPF.frequency.value = 1000;
    this.oct1LPF.Q.value = 0.707;

    // Vintage-style resonant filter for oct1
    this.oct1Resonance = audioContext.createBiquadFilter();
    this.oct1Resonance.type = 'lowpass';
    this.oct1Resonance.frequency.value = 1400;
    this.oct1Resonance.Q.value = 0.5;

    // ── Octave-2 path (cascaded waveshapers) ───────────────────
    this.oct2ShaperA = audioContext.createWaveShaper();
    this.oct2ShaperA.curve = this._makeSquareCurve(1024);
    this.oct2ShaperA.oversample = '4x';

    this.oct2ShaperB = audioContext.createWaveShaper();
    this.oct2ShaperB.curve = this._makeSquareCurve(1024);
    this.oct2ShaperB.oversample = '4x';

    this.oct2Delay = audioContext.createDelay(0.05);
    this.oct2Delay.delayTime.value = 0.022;

    this.oct2LPF = audioContext.createBiquadFilter();
    this.oct2LPF.type = 'lowpass';
    this.oct2LPF.frequency.value = 600;
    this.oct2LPF.Q.value = 0.707;

    this.oct2Smooth = audioContext.createBiquadFilter();
    this.oct2Smooth.type = 'lowpass';
    this.oct2Smooth.frequency.value = 800;
    this.oct2Smooth.Q.value = 0.5;

    // ── Vintage character: slight saturation ───────────────────
    this.vintageSat = audioContext.createWaveShaper();
    this.vintageSat.curve = this._makeSoftClipCurve(1024);
    this.vintageSat.oversample = '2x';

    // ── Routing ────────────────────────────────────────────────
    // Input conditioning: input → rangeLPF → rangeHPF
    this.input.connect(this.rangeLPF);
    this.rangeLPF.connect(this.rangeHPF);

    // Oct-1: rangeHPF → oct1Shaper → oct1Delay → oct1LPF → oct1Resonance → oct1Gain → mixer
    this.rangeHPF.connect(this.oct1Shaper);
    this.oct1Shaper.connect(this.oct1Delay);
    this.oct1Delay.connect(this.oct1LPF);
    this.oct1LPF.connect(this.oct1Resonance);
    this.oct1Resonance.connect(this.oct1Gain);
    this.oct1Gain.connect(this.mixer);

    // Oct-2: rangeHPF → oct2ShaperA → oct2ShaperB → oct2Delay → oct2LPF → oct2Smooth → oct2Gain → mixer
    this.rangeHPF.connect(this.oct2ShaperA);
    this.oct2ShaperA.connect(this.oct2ShaperB);
    this.oct2ShaperB.connect(this.oct2Delay);
    this.oct2Delay.connect(this.oct2LPF);
    this.oct2LPF.connect(this.oct2Smooth);
    this.oct2Smooth.connect(this.oct2Gain);
    this.oct2Gain.connect(this.mixer);

    // Direct: input → dryVoiceGain → mixer
    this.input.connect(this.dryVoiceGain);
    this.dryVoiceGain.connect(this.mixer);

    // Master: mixer → vintageSat → wetGain → output
    this.mixer.connect(this.vintageSat);
    this.vintageSat.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { oct1: 0, oct2: 0, dry: 100, range: 50, mode: 'poly' };
  }

  /** Square-wave transfer for analog-style sub-octave generation */
  _makeSquareCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = x >= 0 ? 0.8 : -0.8;
    }
    return curve;
  }

  /** Soft-clip saturation for vintage warmth */
  _makeSoftClipCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = (Math.PI / 4) * Math.tanh(x * 1.5);
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'oct1': {
        this.oct1Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.oct1 = value;
        break;
      }
      case 'oct2': {
        this.oct2Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.oct2 = value;
        break;
      }
      case 'dry': {
        this.dryVoiceGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.dry = value;
        break;
      }
      case 'range': {
        // Range: 0-100 → adjusts HP freq (40-200Hz) and LP freq (2000-8000Hz)
        const hpFreq = 40 + (value / 100) * 160;
        const lpFreq = 8000 - (value / 100) * 6000;
        this.rangeHPF.frequency.setTargetAtTime(hpFreq, now, 0.02);
        this.rangeLPF.frequency.setTargetAtTime(lpFreq, now, 0.02);
        this.params.range = value;
        break;
      }
      case 'mode': {
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          this.mode = value > 0.5 ? 'poly' : 'vintage';
        }
        // Vintage mode: tighter filtering, more resonance
        if (this.mode === 'vintage') {
          this.oct1Resonance.Q.setTargetAtTime(2.0, now, 0.02);
          this.oct1LPF.frequency.setTargetAtTime(800, now, 0.02);
          this.oct2LPF.frequency.setTargetAtTime(400, now, 0.02);
        } else {
          this.oct1Resonance.Q.setTargetAtTime(0.5, now, 0.02);
          this.oct1LPF.frequency.setTargetAtTime(1000, now, 0.02);
          this.oct2LPF.frequency.setTargetAtTime(600, now, 0.02);
        }
        this.params.mode = this.mode;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.rangeLPF.disconnect(); } catch (e) {}
    try { this.rangeHPF.disconnect(); } catch (e) {}
    try { this.oct1Shaper.disconnect(); } catch (e) {}
    try { this.oct1Delay.disconnect(); } catch (e) {}
    try { this.oct1LPF.disconnect(); } catch (e) {}
    try { this.oct1Resonance.disconnect(); } catch (e) {}
    try { this.oct1Gain.disconnect(); } catch (e) {}
    try { this.oct2ShaperA.disconnect(); } catch (e) {}
    try { this.oct2ShaperB.disconnect(); } catch (e) {}
    try { this.oct2Delay.disconnect(); } catch (e) {}
    try { this.oct2LPF.disconnect(); } catch (e) {}
    try { this.oct2Smooth.disconnect(); } catch (e) {}
    try { this.oct2Gain.disconnect(); } catch (e) {}
    try { this.dryVoiceGain.disconnect(); } catch (e) {}
    try { this.vintageSat.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default BossOC5Effect;
