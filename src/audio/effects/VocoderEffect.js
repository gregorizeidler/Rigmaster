import BaseEffect from './BaseEffect';

class VocoderEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vocoder', 'vocoder');

    this.numBands = 8;
    this.bands = [];
    this._workletAvailable = false;

    // Carrier oscillator (sawtooth = rich harmonics, ideal for vocoder)
    this.carrier = audioContext.createOscillator();
    this.carrier.type = 'sawtooth';
    this.carrier.frequency.value = 110; // A2

    // Mixer combines all band VCA outputs
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // Frequency band parameters
    const minFreq = 200;
    const maxFreq = 8000;

    try {
      for (let i = 0; i < this.numBands; i++) {
        // Logarithmically spaced band center frequencies
        const freq = minFreq * Math.pow(maxFreq / minFreq, i / (this.numBands - 1));
        const bandQ = 5;

        // ---- Analysis path: input → bandpassAnalysis → envelopeFollower ----
        const analysisBP = audioContext.createBiquadFilter();
        analysisBP.type = 'bandpass';
        analysisBP.frequency.value = freq;
        analysisBP.Q.value = bandQ;

        const envFollower = new AudioWorkletNode(audioContext, 'envelope-follower');
        envFollower.parameters.get('attack').value = 0.01;
        envFollower.parameters.get('release').value = 0.1;
        envFollower.parameters.get('sensitivity').value = 2.0;

        // ---- Carrier path: carrier → bandpassCarrier → VCA → mixer ----
        const carrierBP = audioContext.createBiquadFilter();
        carrierBP.type = 'bandpass';
        carrierBP.frequency.value = freq;
        carrierBP.Q.value = bandQ;

        // VCA: gain is modulated by envelope follower output (audio-rate)
        const vca = audioContext.createGain();
        vca.gain.value = 0; // Driven entirely by the envelope follower signal

        // Wire analysis path
        this.input.connect(analysisBP);
        analysisBP.connect(envFollower);
        envFollower.connect(vca.gain); // Audio-rate modulation of VCA gain

        // Wire carrier path
        this.carrier.connect(carrierBP);
        carrierBP.connect(vca);
        vca.connect(this.mixer);

        this.bands.push({ freq, analysisBP, envFollower, carrierBP, vca });
      }

      this._workletAvailable = true;
    } catch (e) {
      console.warn(
        'VocoderEffect: envelope-follower AudioWorklet not available. Effect will pass audio through unprocessed.',
        e
      );
      // Fallback: pass input directly to mixer
      this.input.connect(this.mixer);
    }

    // Mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal (bypass): input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Start carrier oscillator
    this.carrier.start();

    // Default: fully wet
    this.setMix(1.0);

    // Track parameters
    this.params = { pitch: 50, formant: 50, attack: 10, release: 100, bands: 8, mix: 100 };
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'pitch': {
        // Carrier frequency: 0-100 maps to 55Hz (A1) to 440Hz (A4)
        const freq = 55 + (value / 100) * 385;
        this.carrier.frequency.setTargetAtTime(freq, now, 0.02);
        this.params.pitch = value;
        break;
      }
      case 'formant': {
        // Shift all band center frequencies: 0-100 → 0.5x to 2.0x multiplier
        const shift = 0.5 + (value / 100) * 1.5;
        for (const band of this.bands) {
          const shiftedFreq = band.freq * shift;
          band.analysisBP.frequency.setTargetAtTime(shiftedFreq, now, 0.02);
          band.carrierBP.frequency.setTargetAtTime(shiftedFreq, now, 0.02);
        }
        this.params.formant = value;
        break;
      }
      case 'attack': {
        // Envelope attack time: 0-100 → 0.001s to 0.1s
        const attackTime = 0.001 + (value / 100) * 0.099;
        for (const band of this.bands) {
          if (band.envFollower) {
            band.envFollower.parameters.get('attack').setTargetAtTime(attackTime, now, 0.02);
          }
        }
        this.params.attack = value;
        break;
      }
      case 'release': {
        // Envelope release time: 0-100 → 0.01s to 0.5s
        const releaseTime = 0.01 + (value / 100) * 0.49;
        for (const band of this.bands) {
          if (band.envFollower) {
            band.envFollower.parameters.get('release').setTargetAtTime(releaseTime, now, 0.02);
          }
        }
        this.params.release = value;
        break;
      }
      case 'mix': {
        // Overall wet/dry: 0-100 → 0.0-1.0
        this.setMix(value / 100);
        this.params.mix = value;
        break;
      }
      case 'bands': {
        // Number of active bands (stored for reference/display)
        this.params.bands = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.carrier.stop(); } catch (e) {}
    try { this.carrier.disconnect(); } catch (e) {}
    for (const band of this.bands) {
      try { band.analysisBP.disconnect(); } catch (e) {}
      try { if (band.envFollower) band.envFollower.disconnect(); } catch (e) {}
      try { band.carrierBP.disconnect(); } catch (e) {}
      try { band.vca.disconnect(); } catch (e) {}
    }
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default VocoderEffect;
