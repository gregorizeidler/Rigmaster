import BaseEffect from './BaseEffect.js';

class TalkBoxEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Talk Box', 'talkbox');

    // TALK BOX (Formant filter/vocoder-style)
    // Note: A real talk box requires a carrier signal (typically guitar through a speaker
    // tube into the mouth). This effect simulates it as a formant filter with an optional
    // internal carrier oscillator for a voice-like sound without external carrier.

    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();

    // Formant filters (vowel shaping) - parallel topology for cleaner formants
    this.formant1 = audioContext.createBiquadFilter();
    this.formant2 = audioContext.createBiquadFilter();
    this.formant3 = audioContext.createBiquadFilter();

    this.formant1.type = 'bandpass';
    this.formant2.type = 'bandpass';
    this.formant3.type = 'bandpass';

    this.formant1.Q.value = 10;
    this.formant2.Q.value = 10;
    this.formant3.Q.value = 10;

    // Formant mix gains (parallel routing)
    this.formantGain1 = audioContext.createGain();
    this.formantGain2 = audioContext.createGain();
    this.formantGain3 = audioContext.createGain();
    this.formantGain1.gain.value = 1.0;
    this.formantGain2.gain.value = 0.8;
    this.formantGain3.gain.value = 0.6;

    // Internal carrier oscillator (sawtooth for voice-like harmonics)
    this.carrierOsc = audioContext.createOscillator();
    this.carrierOsc.type = 'sawtooth';
    this.carrierOsc.frequency.value = 150; // Default pitch
    this.carrierGain = audioContext.createGain();
    this.carrierGain.gain.value = 0; // Off by default (use input signal)
    this.carrierOsc.start();

    // Input source selector gain (blends input vs carrier)
    this.inputSourceGain = audioContext.createGain();
    this.inputSourceGain.gain.value = 1.0; // Full input by default

    // Formant mix node
    this.formantMix = audioContext.createGain();

    // Default to "A" vowel
    this.setVowel('a');

    // Routing: input/carrier → formant filters (parallel) → mix → output
    this.input.connect(this.inputGain);

    // Input signal path
    this.inputGain.connect(this.inputSourceGain);

    // Carrier signal path
    this.carrierOsc.connect(this.carrierGain);

    // Both sources feed into formant filters in parallel
    this.inputSourceGain.connect(this.formant1);
    this.inputSourceGain.connect(this.formant2);
    this.inputSourceGain.connect(this.formant3);
    this.carrierGain.connect(this.formant1);
    this.carrierGain.connect(this.formant2);
    this.carrierGain.connect(this.formant3);

    // Formant outputs → individual gains → mix
    this.formant1.connect(this.formantGain1);
    this.formant2.connect(this.formantGain2);
    this.formant3.connect(this.formantGain3);
    this.formantGain1.connect(this.formantMix);
    this.formantGain2.connect(this.formantMix);
    this.formantGain3.connect(this.formantMix);

    this.formantMix.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { vowel: 0, resonance: 50, mix: 100, carrier: 0, carrierPitch: 50 };
  }

  setVowel(vowel) {
    // Formant frequencies for different vowels
    const formants = {
      'a': [700, 1220, 2600],   // "ah"
      'e': [530, 1840, 2480],   // "eh"
      'i': [270, 2290, 3010],   // "ee"
      'o': [570, 840, 2410],    // "oh"
      'u': [440, 1020, 2240]    // "oo"
    };

    const f = formants[vowel] || formants['a'];
    const now = this.audioContext.currentTime;

    // Smooth transitions between vowels to avoid clicks
    this.formant1.frequency.setTargetAtTime(f[0], now, 0.02);
    this.formant2.frequency.setTargetAtTime(f[1], now, 0.02);
    this.formant3.frequency.setTargetAtTime(f[2], now, 0.02);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'vowel': {
        // 0-20=a, 21-40=e, 41-60=i, 61-80=o, 81-100=u
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const idx = Math.floor(value / 20);
        this.setVowel(vowels[Math.min(idx, 4)]);
        break;
      }
      case 'resonance': {
        const q = 5 + (value / 100) * 20; // 5 to 25
        this.formant1.Q.setTargetAtTime(q, now, 0.02);
        this.formant2.Q.setTargetAtTime(q, now, 0.02);
        this.formant3.Q.setTargetAtTime(q, now, 0.02);
        break;
      }
      case 'mix':
        this.setMix(value / 100);
        break;
      case 'carrier': {
        // 0 = input only, 100 = carrier only
        const carrierLevel = value / 100;
        this.carrierGain.gain.setTargetAtTime(carrierLevel, now, 0.02);
        this.inputSourceGain.gain.setTargetAtTime(1.0 - carrierLevel, now, 0.02);
        break;
      }
      case 'carrierPitch': {
        // Map 0-100 to frequency range ~80Hz to ~400Hz (voice range)
        const freq = 80 + (value / 100) * 320;
        this.carrierOsc.frequency.setTargetAtTime(freq, now, 0.02);
        break;
      }
      case 'carrierWaveform': {
        // 0=sawtooth, 1=square, 2=triangle
        const waveforms = ['sawtooth', 'square', 'triangle'];
        const idx = Math.floor((value / 100) * 3);
        this.carrierOsc.type = waveforms[Math.min(idx, 2)];
        break;
      }
    }

    this.params[parameter] = value;
  }

  disconnect() {
    try { this.carrierOsc.stop(); } catch (e) {}
    try { this.carrierOsc.disconnect(); } catch (e) {}
    try { this.carrierGain.disconnect(); } catch (e) {}
    try { this.inputSourceGain.disconnect(); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.formant1.disconnect(); } catch (e) {}
    try { this.formant2.disconnect(); } catch (e) {}
    try { this.formant3.disconnect(); } catch (e) {}
    try { this.formantGain1.disconnect(); } catch (e) {}
    try { this.formantGain2.disconnect(); } catch (e) {}
    try { this.formantGain3.disconnect(); } catch (e) {}
    try { this.formantMix.disconnect(); } catch (e) {}
    try { this.outputGain.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default TalkBoxEffect;
