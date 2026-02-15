import BaseEffect from './BaseEffect';

class TCSubNUpEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, "TC Sub 'N' Up", 'tcsubnup');

    // ── Mixer bus ──────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ── Voice gain controls ────────────────────────────────────
    this.sub1Gain = audioContext.createGain();  // -1 octave
    this.sub2Gain = audioContext.createGain();  // -2 octaves
    this.dryVoiceGain = audioContext.createGain();

    this.sub1Gain.gain.value = 0.0;
    this.sub2Gain.gain.value = 0.0;
    this.dryVoiceGain.gain.value = 1.0;

    // ── Sub-1 octave (waveshaper frequency divider) ────────────
    this.sub1Shaper = audioContext.createWaveShaper();
    this.sub1Shaper.curve = this._makeSquareTransfer(1024);
    this.sub1Shaper.oversample = '4x';

    this.sub1Delay = audioContext.createDelay(0.05);
    this.sub1Delay.delayTime.value = 0.016;

    this.sub1LPF = audioContext.createBiquadFilter();
    this.sub1LPF.type = 'lowpass';
    this.sub1LPF.frequency.value = 1000;
    this.sub1LPF.Q.value = 0.707;

    this.sub1Smooth = audioContext.createBiquadFilter();
    this.sub1Smooth.type = 'lowpass';
    this.sub1Smooth.frequency.value = 1500;
    this.sub1Smooth.Q.value = 0.5;

    // ── Sub-2 octave (cascaded waveshaper for /4 division) ─────
    this.sub2ShaperA = audioContext.createWaveShaper();
    this.sub2ShaperA.curve = this._makeSquareTransfer(1024);
    this.sub2ShaperA.oversample = '4x';

    this.sub2ShaperB = audioContext.createWaveShaper();
    this.sub2ShaperB.curve = this._makeSquareTransfer(1024);
    this.sub2ShaperB.oversample = '4x';

    this.sub2Delay = audioContext.createDelay(0.05);
    this.sub2Delay.delayTime.value = 0.022;

    this.sub2LPF = audioContext.createBiquadFilter();
    this.sub2LPF.type = 'lowpass';
    this.sub2LPF.frequency.value = 600;
    this.sub2LPF.Q.value = 0.707;

    this.sub2Smooth = audioContext.createBiquadFilter();
    this.sub2Smooth.type = 'lowpass';
    this.sub2Smooth.frequency.value = 800;
    this.sub2Smooth.Q.value = 0.5;

    // ── Tone control (master tone shaping) ─────────────────────
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 20000;
    this.toneFilter.Q.value = 0.707;

    // ── Routing ────────────────────────────────────────────────
    // Sub-1: input → sub1Shaper → sub1Delay → sub1LPF → sub1Smooth → sub1Gain → mixer
    this.input.connect(this.sub1Shaper);
    this.sub1Shaper.connect(this.sub1Delay);
    this.sub1Delay.connect(this.sub1LPF);
    this.sub1LPF.connect(this.sub1Smooth);
    this.sub1Smooth.connect(this.sub1Gain);
    this.sub1Gain.connect(this.mixer);

    // Sub-2: input → sub2ShaperA → sub2ShaperB → sub2Delay → sub2LPF → sub2Smooth → sub2Gain → mixer
    this.input.connect(this.sub2ShaperA);
    this.sub2ShaperA.connect(this.sub2ShaperB);
    this.sub2ShaperB.connect(this.sub2Delay);
    this.sub2Delay.connect(this.sub2LPF);
    this.sub2LPF.connect(this.sub2Smooth);
    this.sub2Smooth.connect(this.sub2Gain);
    this.sub2Gain.connect(this.mixer);

    // Direct: input → dryVoiceGain → mixer
    this.input.connect(this.dryVoiceGain);
    this.dryVoiceGain.connect(this.mixer);

    // Master: mixer → toneFilter → wetGain → output
    this.mixer.connect(this.toneFilter);
    this.toneFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { sub1: 0, sub2: 0, dry: 100, tone: 100 };
  }

  /** Square-wave transfer function for sub-octave generation */
  _makeSquareTransfer(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = x >= 0 ? 0.8 : -0.8;
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'sub1': {
        // Sub-1 octave level: 0-100 → 0.0-1.0
        this.sub1Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub1 = value;
        break;
      }
      case 'sub2': {
        // Sub-2 octave level: 0-100 → 0.0-1.0
        this.sub2Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub2 = value;
        break;
      }
      case 'dry': {
        // Dry voice level: 0-100 → 0.0-1.0
        this.dryVoiceGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.dry = value;
        break;
      }
      case 'tone': {
        // Tone: 0-100 → 200Hz-20000Hz (logarithmic)
        const minF = 200;
        const maxF = 20000;
        const freq = minF * Math.pow(maxF / minF, value / 100);
        this.toneFilter.frequency.setTargetAtTime(freq, now, 0.02);
        this.params.tone = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.sub1Shaper.disconnect(); } catch (e) {}
    try { this.sub1Delay.disconnect(); } catch (e) {}
    try { this.sub1LPF.disconnect(); } catch (e) {}
    try { this.sub1Smooth.disconnect(); } catch (e) {}
    try { this.sub1Gain.disconnect(); } catch (e) {}
    try { this.sub2ShaperA.disconnect(); } catch (e) {}
    try { this.sub2ShaperB.disconnect(); } catch (e) {}
    try { this.sub2Delay.disconnect(); } catch (e) {}
    try { this.sub2LPF.disconnect(); } catch (e) {}
    try { this.sub2Smooth.disconnect(); } catch (e) {}
    try { this.sub2Gain.disconnect(); } catch (e) {}
    try { this.dryVoiceGain.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default TCSubNUpEffect;
