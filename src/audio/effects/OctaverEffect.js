import BaseEffect from './BaseEffect';

class OctaverEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Octaver', 'octaver');

    // Mixer combines all three voices before wet output
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // Individual voice level controls
    this.directGain = audioContext.createGain();
    this.octaveUpGain = audioContext.createGain();
    this.octaveDownGain = audioContext.createGain();

    this.directGain.gain.value = 1.0;
    this.octaveUpGain.gain.value = 0.0;
    this.octaveDownGain.gain.value = 0.0;

    // Pitch shifter AudioWorklet nodes: one for octave up, one for octave down
    this.pitchUpNode = null;
    this.pitchDownNode = null;

    try {
      this.pitchUpNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchUpNode.parameters.get('pitch').value = 12;   // +1 octave
      this.pitchUpNode.parameters.get('mix').value = 1.0;
      this.pitchUpNode.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('OctaverEffect: pitch-shifter AudioWorklet not available for octave up.', e);
    }

    try {
      this.pitchDownNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchDownNode.parameters.get('pitch').value = -12; // -1 octave
      this.pitchDownNode.parameters.get('mix').value = 1.0;
      this.pitchDownNode.parameters.get('grain').value = 60;  // Larger grain for lower pitch stability
    } catch (e) {
      console.warn('OctaverEffect: pitch-shifter AudioWorklet not available for octave down.', e);
    }

    // Octave up chain: input → pitchUpNode → octaveUpGain → mixer
    if (this.pitchUpNode) {
      this.input.connect(this.pitchUpNode);
      this.pitchUpNode.connect(this.octaveUpGain);
    }
    this.octaveUpGain.connect(this.mixer);

    // Octave down chain: input → pitchDownNode → octaveDownGain → mixer
    if (this.pitchDownNode) {
      this.input.connect(this.pitchDownNode);
      this.pitchDownNode.connect(this.octaveDownGain);
    }
    this.octaveDownGain.connect(this.mixer);

    // Direct chain: input → directGain → mixer
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // Mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal (bypass): input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'octaveUp':
      case 'up': {
        // Octave up level: 0-100 → 0.0-1.0
        this.octaveUpGain.gain.setTargetAtTime(value / 100, now, 0.02);
        break;
      }
      case 'octaveDown':
      case 'down': {
        // Octave down level: 0-100 → 0.0-1.0
        this.octaveDownGain.gain.setTargetAtTime(value / 100, now, 0.02);
        break;
      }
      case 'direct':
      case 'dry': {
        // Direct (dry) level: 0-100 → 0.0-1.0
        this.directGain.gain.setTargetAtTime(value / 100, now, 0.02);
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { if (this.pitchUpNode) this.pitchUpNode.disconnect(); } catch (e) {}
    try { if (this.pitchDownNode) this.pitchDownNode.disconnect(); } catch (e) {}
    try { this.octaveUpGain.disconnect(); } catch (e) {}
    try { this.octaveDownGain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default OctaverEffect;
