import BaseEffect from './BaseEffect';

class PitchShifterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Pitch Shifter', 'pitchshifter');

    // Anti-alias lowpass filter before pitch shifting (prevents aliasing artifacts)
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 16000;
    this.antiAlias.Q.value = 0.707;

    // DC blocker highpass filter after pitch shifting (removes DC offset)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // Pitch shifter AudioWorklet node
    this.pitchShifterNode = null;

    try {
      this.pitchShifterNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      // Worklet mix set to 1.0 (fully wet internally); external wet/dry handled by BaseEffect
      this.pitchShifterNode.parameters.get('mix').value = 1.0;
      this.pitchShifterNode.parameters.get('pitch').value = 0;
      this.pitchShifterNode.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn(
        'PitchShifterEffect: pitch-shifter AudioWorklet not available. Effect will pass audio through unprocessed.',
        e
      );
    }

    // Wet signal chain: input → antiAlias → pitchShifterNode → dcBlocker → wetGain → output
    if (this.pitchShifterNode) {
      this.input.connect(this.antiAlias);
      this.antiAlias.connect(this.pitchShifterNode);
      this.pitchShifterNode.connect(this.dcBlocker);
      this.dcBlocker.connect(this.wetGain);
    } else {
      // Fallback: pass-through when worklet unavailable
      this.input.connect(this.wetGain);
    }
    this.wetGain.connect(this.output);

    // Dry signal chain: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default: fully wet
    this.setMix(1.0);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'shift':
      case 'interval': {
        // Semitones: -24 to +24
        if (!this.pitchShifterNode) break;
        const semitones = Math.max(-24, Math.min(24, value));
        this.pitchShifterNode.parameters.get('pitch').setTargetAtTime(semitones, now, 0.02);
        break;
      }
      case 'mix': {
        // 0-100 → 0.0-1.0
        this.setMix(value / 100);
        break;
      }
      case 'grain': {
        // Grain size in ms: 20-100
        if (!this.pitchShifterNode) break;
        const grainMs = Math.max(20, Math.min(100, value));
        this.pitchShifterNode.parameters.get('grain').setTargetAtTime(grainMs, now, 0.02);
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.antiAlias.disconnect(); } catch (e) {}
    try { if (this.pitchShifterNode) this.pitchShifterNode.disconnect(); } catch (e) {}
    try { this.dcBlocker.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default PitchShifterEffect;
