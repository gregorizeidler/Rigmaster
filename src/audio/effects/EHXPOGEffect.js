import BaseEffect from './BaseEffect';

class EHXPOGEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX POG', 'ehxpog');

    // ── Mixer bus ──────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ── Voice gain controls ────────────────────────────────────
    this.subOctaveGain = audioContext.createGain();
    this.dryVoiceGain = audioContext.createGain();
    this.octaveUpGain = audioContext.createGain();

    this.subOctaveGain.gain.value = 0.0;
    this.dryVoiceGain.gain.value = 1.0;
    this.octaveUpGain.gain.value = 0.0;

    // ── Sub-octave path ────────────────────────────────────────
    // Lowpass-filtered delay trick: modulated delay line for sub-octave
    // A long delay with feedback simulates octave-down when combined
    // with waveshaping that doubles the period.
    this.subDelay = audioContext.createDelay(0.05);
    this.subDelay.delayTime.value = 0.02; // 20ms ~ half period at ~50Hz

    this.subLPF = audioContext.createBiquadFilter();
    this.subLPF.type = 'lowpass';
    this.subLPF.frequency.value = 800;
    this.subLPF.Q.value = 1.0;

    // Sub-octave waveshaper: square-wave folding divides frequency by 2
    this.subShaper = audioContext.createWaveShaper();
    this.subShaper.curve = this._makeSubOctaveCurve(1024);
    this.subShaper.oversample = '4x';

    // Sub-octave smoothing filter removes harsh harmonics
    this.subSmooth = audioContext.createBiquadFilter();
    this.subSmooth.type = 'lowpass';
    this.subSmooth.frequency.value = 1200;
    this.subSmooth.Q.value = 0.707;

    // ── Octave-up path ─────────────────────────────────────────
    // Full-wave rectification via waveshaper doubles the frequency
    this.octUpShaper = audioContext.createWaveShaper();
    this.octUpShaper.curve = this._makeFullWaveRectifierCurve(2048);
    this.octUpShaper.oversample = '4x';

    // Bandpass to isolate the octave-up harmonic
    this.octUpBPF = audioContext.createBiquadFilter();
    this.octUpBPF.type = 'bandpass';
    this.octUpBPF.frequency.value = 2000;
    this.octUpBPF.Q.value = 0.5;

    // High-pass to remove any DC offset from rectification
    this.octUpHP = audioContext.createBiquadFilter();
    this.octUpHP.type = 'highpass';
    this.octUpHP.frequency.value = 80;
    this.octUpHP.Q.value = 0.707;

    // ── LPF (master tone control) ──────────────────────────────
    this.masterLPF = audioContext.createBiquadFilter();
    this.masterLPF.type = 'lowpass';
    this.masterLPF.frequency.value = 20000;
    this.masterLPF.Q.value = 0.707;

    // ── Routing ────────────────────────────────────────────────
    // Sub-octave chain: input → subShaper → subDelay → subLPF → subSmooth → subOctaveGain → mixer
    this.input.connect(this.subShaper);
    this.subShaper.connect(this.subDelay);
    this.subDelay.connect(this.subLPF);
    this.subLPF.connect(this.subSmooth);
    this.subSmooth.connect(this.subOctaveGain);
    this.subOctaveGain.connect(this.mixer);

    // Octave-up chain: input → octUpShaper → octUpHP → octUpBPF → octaveUpGain → mixer
    this.input.connect(this.octUpShaper);
    this.octUpShaper.connect(this.octUpHP);
    this.octUpHP.connect(this.octUpBPF);
    this.octUpBPF.connect(this.octaveUpGain);
    this.octaveUpGain.connect(this.mixer);

    // Direct chain: input → dryVoiceGain → mixer
    this.input.connect(this.dryVoiceGain);
    this.dryVoiceGain.connect(this.mixer);

    // Master output: mixer → masterLPF → wetGain → output
    this.mixer.connect(this.masterLPF);
    this.masterLPF.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { sub_octave: 0, dry: 100, octave_up: 0, lpf: 100 };
  }

  /** Generates a sub-octave (frequency-halving) waveshaper curve */
  _makeSubOctaveCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Square-wave-like transfer function that flips every half-cycle
      curve[i] = x >= 0 ? 0.8 : -0.8;
    }
    return curve;
  }

  /** Generates a full-wave rectifier curve (abs value → octave up) */
  _makeFullWaveRectifierCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.abs(x);
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'sub_octave': {
        // Sub octave level: 0-100 → 0.0-1.0
        this.subOctaveGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub_octave = value;
        break;
      }
      case 'dry': {
        // Dry voice level: 0-100 → 0.0-1.0
        this.dryVoiceGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.dry = value;
        break;
      }
      case 'octave_up': {
        // Octave up level: 0-100 → 0.0-1.0
        this.octaveUpGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.octave_up = value;
        break;
      }
      case 'lpf': {
        // Master LPF: 0-100 → 200Hz-20000Hz (logarithmic)
        const minFreq = 200;
        const maxFreq = 20000;
        const freq = minFreq * Math.pow(maxFreq / minFreq, value / 100);
        this.masterLPF.frequency.setTargetAtTime(freq, now, 0.02);
        this.params.lpf = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.subShaper.disconnect(); } catch (e) {}
    try { this.subDelay.disconnect(); } catch (e) {}
    try { this.subLPF.disconnect(); } catch (e) {}
    try { this.subSmooth.disconnect(); } catch (e) {}
    try { this.subOctaveGain.disconnect(); } catch (e) {}
    try { this.octUpShaper.disconnect(); } catch (e) {}
    try { this.octUpHP.disconnect(); } catch (e) {}
    try { this.octUpBPF.disconnect(); } catch (e) {}
    try { this.octaveUpGain.disconnect(); } catch (e) {}
    try { this.dryVoiceGain.disconnect(); } catch (e) {}
    try { this.masterLPF.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EHXPOGEffect;
