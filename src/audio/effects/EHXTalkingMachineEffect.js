import BaseEffect from './BaseEffect';

/**
 * EHXTalkingMachineEffect - EHX Talking Machine
 *
 * Vocal formant filter that creates vowel sounds (A/E/I/O/U).
 * Sweeping the "voice" knob morphs between formant sets,
 * producing talk-box-like effects without a tube.
 *
 * Features:
 * - 5 vowel formant targets (A, E, I, O, U) with smooth morphing
 * - Each vowel defined by 3 bandpass formant filters (F1, F2, F3)
 * - Sensitivity control for envelope-following intensity
 * - Blend between formant and original signal
 *
 * Params: voice (0-100 sweeps A→E→I→O→U), sensitivity, mix, blend (all 0-100)
 */
class EHXTalkingMachineEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Talking Machine', 'ehxtalkingmachine');

    // Vowel formant frequency tables (Hz) — F1, F2, F3
    this.vowelFormants = {
      A: [800, 1200, 2800],
      E: [400, 2200, 2800],
      I: [280, 2300, 3200],
      O: [500, 900, 2400],
      U: [320, 800, 2200]
    };
    this.vowelOrder = ['A', 'E', 'I', 'O', 'U'];

    // ===== Three formant bandpass filters =====
    this.formants = [];
    for (let i = 0; i < 3; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = this.vowelFormants.A[i];
      filter.Q.value = 8 + i * 4; // Tighter Q on higher formants
      this.formants.push(filter);
    }

    // Formant gain mixer — each formant feeds into a gain node
    this.formantGains = [];
    for (let i = 0; i < 3; i++) {
      const gain = audioContext.createGain();
      // F1 loudest, F2/F3 progressively softer (natural speech)
      gain.gain.value = 1.0 - i * 0.2;
      this.formantGains.push(gain);
    }

    // Formant mix bus
    this.formantBus = audioContext.createGain();
    this.formantBus.gain.value = 1.0;

    // ===== Envelope follower (gain-based detection) =====
    this.envelopeInput = audioContext.createGain();
    this.envelopeInput.gain.value = 1.0;

    // ===== Sensitivity / resonance control =====
    this.sensitivityGain = audioContext.createGain();
    this.sensitivityGain.gain.value = 1.5;

    // ===== Blend control: formant vs original =====
    this.blendWet = audioContext.createGain();
    this.blendWet.gain.value = 1.0;
    this.blendDry = audioContext.createGain();
    this.blendDry.gain.value = 0.0;

    // ===== Output stage =====
    this.outputMix = audioContext.createGain();
    this.outputMix.gain.value = 0.9;

    // Input pre-emphasis — cut sub-bass for cleaner formant tracking
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 80;
    this.inputHPF.Q.value = 0.707;

    // Presence peak to help formants cut through
    this.presenceBoost = audioContext.createBiquadFilter();
    this.presenceBoost.type = 'peaking';
    this.presenceBoost.frequency.value = 3000;
    this.presenceBoost.Q.value = 0.8;
    this.presenceBoost.gain.value = 3;

    // ===== Wet signal routing =====
    this.input.connect(this.inputHPF);

    // Parallel formant filters
    for (let i = 0; i < 3; i++) {
      this.inputHPF.connect(this.formants[i]);
      this.formants[i].connect(this.formantGains[i]);
      this.formantGains[i].connect(this.formantBus);
    }

    this.formantBus.connect(this.sensitivityGain);
    this.sensitivityGain.connect(this.presenceBoost);
    this.presenceBoost.connect(this.blendWet);

    // Blend: dry path through formant section
    this.inputHPF.connect(this.blendDry);

    // Combine blend
    this.blendWet.connect(this.outputMix);
    this.blendDry.connect(this.outputMix);

    this.outputMix.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { voice: 0, sensitivity: 50, mix: 100, blend: 80 };
  }

  /**
   * Interpolate formant frequencies between two vowels.
   */
  _interpolateFormants(vowelA, vowelB, t) {
    const fA = this.vowelFormants[vowelA];
    const fB = this.vowelFormants[vowelB];
    return fA.map((freq, i) => freq + (fB[i] - freq) * t);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'voice': {
        // 0-100 maps across 5 vowels (A=0, E=25, I=50, O=75, U=100)
        const pos = (value / 100) * 4; // 0.0 – 4.0
        const idx = Math.min(Math.floor(pos), 3);
        const t = pos - idx;
        const vowelA = this.vowelOrder[idx];
        const vowelB = this.vowelOrder[idx + 1];

        const freqs = this._interpolateFormants(vowelA, vowelB, t);
        for (let i = 0; i < 3; i++) {
          this.formants[i].frequency.setTargetAtTime(freqs[i], now, 0.02);
        }
        break;
      }

      case 'sensitivity': {
        // 0-100 → 0.5 to 4.0 resonance / gain
        const sens = 0.5 + (value / 100) * 3.5;
        this.sensitivityGain.gain.setTargetAtTime(sens, now, 0.01);
        // Higher sensitivity → tighter Q on formants
        const baseQ = 5 + (value / 100) * 15;
        for (let i = 0; i < 3; i++) {
          this.formants[i].Q.setTargetAtTime(baseQ + i * 3, now, 0.02);
        }
        break;
      }

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'blend': {
        // 0 = all dry (through formant section), 100 = all formant
        const wet = value / 100;
        this.blendWet.gain.setTargetAtTime(wet, now, 0.01);
        this.blendDry.gain.setTargetAtTime(1 - wet, now, 0.01);
        break;
      }

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputHPF.disconnect();
      this.formants.forEach(f => f.disconnect());
      this.formantGains.forEach(g => g.disconnect());
      this.formantBus.disconnect();
      this.sensitivityGain.disconnect();
      this.presenceBoost.disconnect();
      this.blendWet.disconnect();
      this.blendDry.disconnect();
      this.outputMix.disconnect();
    } catch (e) {}
  }
}

export default EHXTalkingMachineEffect;
