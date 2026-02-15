import BaseEffect from './BaseEffect';

class EHXHOGEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX HOG', 'ehxhog');

    // ── Mixer bus ──────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 0.7; // Headroom for multiple voices

    // ── Voice gain controls (6 harmonics) ──────────────────────
    this.sub2Gain = audioContext.createGain();  // -2 octaves
    this.sub1Gain = audioContext.createGain();  // -1 octave
    this.dryVoiceGain = audioContext.createGain(); // unison
    this.oct1Gain = audioContext.createGain();  // +1 octave
    this.fifthGain = audioContext.createGain(); // +1 oct + fifth
    this.oct2Gain = audioContext.createGain();  // +2 octaves

    this.sub2Gain.gain.value = 0.0;
    this.sub1Gain.gain.value = 0.0;
    this.dryVoiceGain.gain.value = 1.0;
    this.oct1Gain.gain.value = 0.0;
    this.fifthGain.gain.value = 0.0;
    this.oct2Gain.gain.value = 0.0;

    // ── Sub-2 octave path (waveshaper chain: divide by 4) ──────
    this.sub2Shaper1 = audioContext.createWaveShaper();
    this.sub2Shaper1.curve = this._makeSquareCurve(1024);
    this.sub2Shaper1.oversample = '4x';

    this.sub2Shaper2 = audioContext.createWaveShaper();
    this.sub2Shaper2.curve = this._makeSquareCurve(1024);
    this.sub2Shaper2.oversample = '4x';

    this.sub2LPF = audioContext.createBiquadFilter();
    this.sub2LPF.type = 'lowpass';
    this.sub2LPF.frequency.value = 500;
    this.sub2LPF.Q.value = 0.707;

    this.sub2Delay = audioContext.createDelay(0.05);
    this.sub2Delay.delayTime.value = 0.025;

    // ── Sub-1 octave path (waveshaper: divide by 2) ────────────
    this.sub1Shaper = audioContext.createWaveShaper();
    this.sub1Shaper.curve = this._makeSquareCurve(1024);
    this.sub1Shaper.oversample = '4x';

    this.sub1LPF = audioContext.createBiquadFilter();
    this.sub1LPF.type = 'lowpass';
    this.sub1LPF.frequency.value = 1000;
    this.sub1LPF.Q.value = 0.707;

    this.sub1Delay = audioContext.createDelay(0.05);
    this.sub1Delay.delayTime.value = 0.018;

    // ── Octave-up +1 path (full-wave rectification) ────────────
    this.oct1Shaper = audioContext.createWaveShaper();
    this.oct1Shaper.curve = this._makeFullWaveRectCurve(2048);
    this.oct1Shaper.oversample = '4x';

    this.oct1HP = audioContext.createBiquadFilter();
    this.oct1HP.type = 'highpass';
    this.oct1HP.frequency.value = 80;
    this.oct1HP.Q.value = 0.707;

    this.oct1BPF = audioContext.createBiquadFilter();
    this.oct1BPF.type = 'bandpass';
    this.oct1BPF.frequency.value = 2000;
    this.oct1BPF.Q.value = 0.5;

    // ── Fifth path (+1 oct + perfect fifth = *3 fundamental) ───
    // Ring-mod-style approach: oscillator at 3x blended with signal
    this.fifthShaper = audioContext.createWaveShaper();
    this.fifthShaper.curve = this._makeFullWaveRectCurve(2048);
    this.fifthShaper.oversample = '4x';

    this.fifthBPF = audioContext.createBiquadFilter();
    this.fifthBPF.type = 'bandpass';
    this.fifthBPF.frequency.value = 3000;
    this.fifthBPF.Q.value = 1.0;

    this.fifthHP = audioContext.createBiquadFilter();
    this.fifthHP.type = 'highpass';
    this.fifthHP.frequency.value = 150;
    this.fifthHP.Q.value = 0.707;

    // ── Octave-up +2 path (double rectification) ───────────────
    this.oct2Shaper1 = audioContext.createWaveShaper();
    this.oct2Shaper1.curve = this._makeFullWaveRectCurve(2048);
    this.oct2Shaper1.oversample = '4x';

    this.oct2Shaper2 = audioContext.createWaveShaper();
    this.oct2Shaper2.curve = this._makeFullWaveRectCurve(2048);
    this.oct2Shaper2.oversample = '4x';

    this.oct2HP = audioContext.createBiquadFilter();
    this.oct2HP.type = 'highpass';
    this.oct2HP.frequency.value = 200;
    this.oct2HP.Q.value = 0.707;

    this.oct2BPF = audioContext.createBiquadFilter();
    this.oct2BPF.type = 'bandpass';
    this.oct2BPF.frequency.value = 4000;
    this.oct2BPF.Q.value = 0.6;

    // ── Routing ────────────────────────────────────────────────
    // Sub-2: input → sub2Shaper1 → sub2Shaper2 → sub2Delay → sub2LPF → sub2Gain → mixer
    this.input.connect(this.sub2Shaper1);
    this.sub2Shaper1.connect(this.sub2Shaper2);
    this.sub2Shaper2.connect(this.sub2Delay);
    this.sub2Delay.connect(this.sub2LPF);
    this.sub2LPF.connect(this.sub2Gain);
    this.sub2Gain.connect(this.mixer);

    // Sub-1: input → sub1Shaper → sub1Delay → sub1LPF → sub1Gain → mixer
    this.input.connect(this.sub1Shaper);
    this.sub1Shaper.connect(this.sub1Delay);
    this.sub1Delay.connect(this.sub1LPF);
    this.sub1LPF.connect(this.sub1Gain);
    this.sub1Gain.connect(this.mixer);

    // Dry: input → dryVoiceGain → mixer
    this.input.connect(this.dryVoiceGain);
    this.dryVoiceGain.connect(this.mixer);

    // Oct+1: input → oct1Shaper → oct1HP → oct1BPF → oct1Gain → mixer
    this.input.connect(this.oct1Shaper);
    this.oct1Shaper.connect(this.oct1HP);
    this.oct1HP.connect(this.oct1BPF);
    this.oct1BPF.connect(this.oct1Gain);
    this.oct1Gain.connect(this.mixer);

    // Fifth: input → fifthShaper → fifthHP → fifthBPF → fifthGain → mixer
    this.input.connect(this.fifthShaper);
    this.fifthShaper.connect(this.fifthHP);
    this.fifthHP.connect(this.fifthBPF);
    this.fifthBPF.connect(this.fifthGain);
    this.fifthGain.connect(this.mixer);

    // Oct+2: input → oct2Shaper1 → oct2Shaper2 → oct2HP → oct2BPF → oct2Gain → mixer
    this.input.connect(this.oct2Shaper1);
    this.oct2Shaper1.connect(this.oct2Shaper2);
    this.oct2Shaper2.connect(this.oct2HP);
    this.oct2HP.connect(this.oct2BPF);
    this.oct2BPF.connect(this.oct2Gain);
    this.oct2Gain.connect(this.mixer);

    // Master: mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { sub2: 0, sub1: 0, dry: 100, oct1: 0, fifth: 0, oct2: 0 };
  }

  /** Square-wave transfer for sub-octave frequency division */
  _makeSquareCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = x >= 0 ? 0.8 : -0.8;
    }
    return curve;
  }

  /** Full-wave rectifier for octave-up doubling */
  _makeFullWaveRectCurve(samples) {
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
      case 'sub2': {
        this.sub2Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub2 = value;
        break;
      }
      case 'sub1': {
        this.sub1Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.sub1 = value;
        break;
      }
      case 'dry': {
        this.dryVoiceGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.dry = value;
        break;
      }
      case 'oct1': {
        this.oct1Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.oct1 = value;
        break;
      }
      case 'fifth': {
        this.fifthGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.fifth = value;
        break;
      }
      case 'oct2': {
        this.oct2Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.oct2 = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.sub2Shaper1.disconnect(); } catch (e) {}
    try { this.sub2Shaper2.disconnect(); } catch (e) {}
    try { this.sub2Delay.disconnect(); } catch (e) {}
    try { this.sub2LPF.disconnect(); } catch (e) {}
    try { this.sub2Gain.disconnect(); } catch (e) {}
    try { this.sub1Shaper.disconnect(); } catch (e) {}
    try { this.sub1Delay.disconnect(); } catch (e) {}
    try { this.sub1LPF.disconnect(); } catch (e) {}
    try { this.sub1Gain.disconnect(); } catch (e) {}
    try { this.oct1Shaper.disconnect(); } catch (e) {}
    try { this.oct1HP.disconnect(); } catch (e) {}
    try { this.oct1BPF.disconnect(); } catch (e) {}
    try { this.oct1Gain.disconnect(); } catch (e) {}
    try { this.fifthShaper.disconnect(); } catch (e) {}
    try { this.fifthHP.disconnect(); } catch (e) {}
    try { this.fifthBPF.disconnect(); } catch (e) {}
    try { this.fifthGain.disconnect(); } catch (e) {}
    try { this.oct2Shaper1.disconnect(); } catch (e) {}
    try { this.oct2Shaper2.disconnect(); } catch (e) {}
    try { this.oct2HP.disconnect(); } catch (e) {}
    try { this.oct2BPF.disconnect(); } catch (e) {}
    try { this.oct2Gain.disconnect(); } catch (e) {}
    try { this.dryVoiceGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EHXHOGEffect;
