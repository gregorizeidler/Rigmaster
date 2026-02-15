import BaseEffect from './BaseEffect';

class SlicerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Slicer', 'slicer');

    // Gate gain node controlled by LFO
    this.gateGain = audioContext.createGain();
    this.gateGain.gain.value = 1;

    // LFO parameters
    this.rate = 8; // Hz
    this.depth = 1;
    this.bpm = 120;
    this.bpmSync = false;

    // Native OscillatorNode LFO for audio-rate slicing
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'square'; // Default pattern
    this.lfo.frequency.value = this.rate;

    // LFO output is -1..1, we need 0..1 for gating
    // Use a gain node for depth control and a constant offset
    this.lfoDepth = audioContext.createGain();
    this.lfoDepth.gain.value = this.depth * 0.5; // Scale -1..1 to -0.5..0.5

    // DC offset to shift LFO from bipolar to unipolar
    // ConstantSourceNode provides the 0.5 offset so final range is 0..1
    this.dcOffset = audioContext.createConstantSource();
    this.dcOffset.offset.value = 1.0 - (this.depth * 0.5); // Base level

    // Connect LFO → depth scaler → gate gain AudioParam
    this.lfo.connect(this.lfoDepth);
    this.lfoDepth.connect(this.gateGain.gain);
    this.dcOffset.connect(this.gateGain.gain);

    // Override the default gain value since LFO will control it
    this.gateGain.gain.value = 0;

    // Start oscillators
    this.lfo.start();
    this.dcOffset.start();

    // Audio signal chain: input → gateGain → wetGain → output
    this.input.connect(this.gateGain);
    this.gateGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  _updateLfoRate() {
    const now = this.audioContext.currentTime;
    let freq;
    if (this.bpmSync) {
      // BPM sync: rate in Hz from BPM (16th notes)
      freq = this.bpm / 60 * 4; // 16th note frequency
    } else {
      freq = this.rate;
    }
    this.lfo.frequency.setTargetAtTime(freq, now, 0.02);
  }

  _updateDepth() {
    const now = this.audioContext.currentTime;
    // LFO output is -1..1, depth scales it:
    // depth=1: gate goes 0..1 (full slicing)
    // depth=0: gate stays at 1 (no slicing)
    this.lfoDepth.gain.setTargetAtTime(this.depth * 0.5, now, 0.02);
    this.dcOffset.offset.setTargetAtTime(1.0 - (this.depth * 0.5), now, 0.02);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'rate':
        this.rate = 1 + (value / 100) * 31; // 1Hz to 32Hz
        this._updateLfoRate();
        break;
      case 'depth':
        this.depth = value / 100;
        this._updateDepth();
        break;
      case 'pattern': {
        // Change LFO waveform for different slice patterns
        const patterns = ['square', 'triangle', 'sawtooth'];
        const idx = Math.floor((value / 100) * patterns.length);
        this.lfo.type = patterns[Math.min(idx, patterns.length - 1)];
        break;
      }
      case 'bpm':
        this.bpm = value; // Direct BPM value
        if (this.bpmSync) this._updateLfoRate();
        break;
      case 'bpmSync':
        this.bpmSync = !!value;
        this._updateLfoRate();
        break;
      default:
        break;
    }
  }

  disconnect() {
    try { this.lfo.stop(); } catch (e) {}
    try { this.dcOffset.stop(); } catch (e) {}
    try { this.lfo.disconnect(); } catch (e) {}
    try { this.lfoDepth.disconnect(); } catch (e) {}
    try { this.dcOffset.disconnect(); } catch (e) {}
    try { this.gateGain.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default SlicerEffect;
