import BaseEffect from './BaseEffect';

class HarmonizerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Harmonizer', 'harmonizer');

    // Mixer combines all voices before wet output
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // Individual voice level controls
    this.voice1Gain = audioContext.createGain();
    this.voice2Gain = audioContext.createGain();
    this.directGain = audioContext.createGain();

    this.voice1Gain.gain.value = 0.7;
    this.voice2Gain.gain.value = 0.5;
    this.directGain.gain.value = 1.0;

    // Pitch shifter AudioWorklet nodes for two harmony voices
    this.pitch1Node = null;
    this.pitch2Node = null;

    try {
      this.pitch1Node = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitch1Node.parameters.get('pitch').value = 4;   // Major third (default)
      this.pitch1Node.parameters.get('mix').value = 1.0;
      this.pitch1Node.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('HarmonizerEffect: pitch-shifter AudioWorklet not available for voice 1.', e);
    }

    try {
      this.pitch2Node = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitch2Node.parameters.get('pitch').value = 7;   // Perfect fifth (default)
      this.pitch2Node.parameters.get('mix').value = 1.0;
      this.pitch2Node.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('HarmonizerEffect: pitch-shifter AudioWorklet not available for voice 2.', e);
    }

    // Voice 1 chain: input → pitch1Node → voice1Gain → mixer
    if (this.pitch1Node) {
      this.input.connect(this.pitch1Node);
      this.pitch1Node.connect(this.voice1Gain);
    }
    this.voice1Gain.connect(this.mixer);

    // Voice 2 chain: input → pitch2Node → voice2Gain → mixer
    if (this.pitch2Node) {
      this.input.connect(this.pitch2Node);
      this.pitch2Node.connect(this.voice2Gain);
    }
    this.voice2Gain.connect(this.mixer);

    // Direct chain: input → directGain → mixer
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // Mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal (bypass): input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Track parameters for reference
    this.params = {
      voice1: 4,
      voice2: 7,
      voice1Level: 70,
      voice2Level: 50,
      direct: 100,
      key: 0
    };
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'voice1':
      case 'interval1': {
        // Voice 1 pitch in semitones: -24 to +24
        const semitones = Math.max(-24, Math.min(24, value));
        if (this.pitch1Node) {
          this.pitch1Node.parameters.get('pitch').setTargetAtTime(semitones, now, 0.02);
        }
        this.params.voice1 = semitones;
        break;
      }
      case 'voice2':
      case 'interval2': {
        // Voice 2 pitch in semitones: -24 to +24
        const semitones = Math.max(-24, Math.min(24, value));
        if (this.pitch2Node) {
          this.pitch2Node.parameters.get('pitch').setTargetAtTime(semitones, now, 0.02);
        }
        this.params.voice2 = semitones;
        break;
      }
      case 'voice1Level': {
        // Voice 1 level: 0-100 → 0.0-1.0
        this.voice1Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.voice1Level = value;
        break;
      }
      case 'voice2Level': {
        // Voice 2 level: 0-100 → 0.0-1.0
        this.voice2Gain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.voice2Level = value;
        break;
      }
      case 'direct': {
        // Direct (dry) level: 0-100 → 0.0-1.0
        this.directGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.params.direct = value;
        break;
      }
      case 'mix': {
        // Overall wet/dry mix: 0-100 → 0.0-1.0
        this.setMix(value / 100);
        this.params.mix = value;
        break;
      }
      case 'key': {
        // Key selection (for display/reference only)
        this.params.key = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { if (this.pitch1Node) this.pitch1Node.disconnect(); } catch (e) {}
    try { if (this.pitch2Node) this.pitch2Node.disconnect(); } catch (e) {}
    try { this.voice1Gain.disconnect(); } catch (e) {}
    try { this.voice2Gain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default HarmonizerEffect;
