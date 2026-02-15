import BaseEffect from './BaseEffect';

class EHXMicroPOGEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Micro POG', 'ehxmicropog');

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
    // Waveshaper-based frequency divider for sub-octave generation
    this.subShaper = audioContext.createWaveShaper();
    this.subShaper.curve = this._makeSubOctaveCurve(1024);
    this.subShaper.oversample = '4x';

    // Delay node adds slight latency for sub tracking
    this.subDelay = audioContext.createDelay(0.05);
    this.subDelay.delayTime.value = 0.015;

    // Lowpass filter shapes the sub-octave tone
    this.subLPF = audioContext.createBiquadFilter();
    this.subLPF.type = 'lowpass';
    this.subLPF.frequency.value = 900;
    this.subLPF.Q.value = 0.8;

    // Additional smoothing filter
    this.subSmooth = audioContext.createBiquadFilter();
    this.subSmooth.type = 'lowpass';
    this.subSmooth.frequency.value = 1400;
    this.subSmooth.Q.value = 0.5;

    // ── Octave-up path ─────────────────────────────────────────
    // Full-wave rectification doubles the fundamental frequency
    this.octUpShaper = audioContext.createWaveShaper();
    this.octUpShaper.curve = this._makeFullWaveRectifierCurve(2048);
    this.octUpShaper.oversample = '4x';

    // DC blocker removes offset introduced by rectification
    this.octUpDCBlock = audioContext.createBiquadFilter();
    this.octUpDCBlock.type = 'highpass';
    this.octUpDCBlock.frequency.value = 60;
    this.octUpDCBlock.Q.value = 0.707;

    // Bandpass to focus the octave-up harmonic
    this.octUpBPF = audioContext.createBiquadFilter();
    this.octUpBPF.type = 'bandpass';
    this.octUpBPF.frequency.value = 2500;
    this.octUpBPF.Q.value = 0.4;

    // ── Routing ────────────────────────────────────────────────
    // Sub-octave: input → subShaper → subDelay → subLPF → subSmooth → subOctaveGain → mixer
    this.input.connect(this.subShaper);
    this.subShaper.connect(this.subDelay);
    this.subDelay.connect(this.subLPF);
    this.subLPF.connect(this.subSmooth);
    this.subSmooth.connect(this.subOctaveGain);
    this.subOctaveGain.connect(this.mixer);

    // Octave-up: input → octUpShaper → octUpDCBlock → octUpBPF → octaveUpGain → mixer
    this.input.connect(this.octUpShaper);
    this.octUpShaper.connect(this.octUpDCBlock);
    this.octUpDCBlock.connect(this.octUpBPF);
    this.octUpBPF.connect(this.octaveUpGain);
    this.octaveUpGain.connect(this.mixer);

    // Direct: input → dryVoiceGain → mixer
    this.input.connect(this.dryVoiceGain);
    this.dryVoiceGain.connect(this.mixer);

    // Master output: mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { sub_octave: 0, dry: 100, octave_up: 0 };
  }

  /** Sub-octave waveshaper: square-wave transfer for frequency division */
  _makeSubOctaveCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hard-clip square wave to divide fundamental by 2
      curve[i] = x >= 0 ? 0.75 : -0.75;
    }
    return curve;
  }

  /** Full-wave rectifier for octave-up doubling */
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
        this.subOctaveGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub_octave = value;
        break;
      }
      case 'dry': {
        this.dryVoiceGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.dry = value;
        break;
      }
      case 'octave_up': {
        this.octaveUpGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.octave_up = value;
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
    try { this.octUpDCBlock.disconnect(); } catch (e) {}
    try { this.octUpBPF.disconnect(); } catch (e) {}
    try { this.octaveUpGain.disconnect(); } catch (e) {}
    try { this.dryVoiceGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EHXMicroPOGEffect;
