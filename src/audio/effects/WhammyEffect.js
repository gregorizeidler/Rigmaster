import BaseEffect from './BaseEffect';

class WhammyEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Whammy', 'whammy');

    // Whammy mode determines how the expression pedal position maps to pitch
    this.mode = 'up';
    this.position = 0; // Expression pedal position: 0-100

    // Pitch shifter AudioWorklet node
    this.pitchShifterNode = null;

    try {
      this.pitchShifterNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      // Worklet mix = 1.0 (fully wet internally); external wet/dry handled by BaseEffect
      this.pitchShifterNode.parameters.get('mix').value = 1.0;
      this.pitchShifterNode.parameters.get('pitch').value = 0;
      this.pitchShifterNode.parameters.get('grain').value = 40; // Tighter grain for responsive whammy sweep
    } catch (e) {
      console.warn(
        'WhammyEffect: pitch-shifter AudioWorklet not available. Effect will pass audio through unprocessed.',
        e
      );
    }

    // Wet signal chain: input → pitchShifterNode → wetGain → output
    if (this.pitchShifterNode) {
      this.input.connect(this.pitchShifterNode);
      this.pitchShifterNode.connect(this.wetGain);
    } else {
      this.input.connect(this.wetGain);
    }
    this.wetGain.connect(this.output);

    // Dry signal chain: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default: mostly wet (like a real Whammy pedal)
    this.setMix(0.8);
  }

  /**
   * Maps expression pedal position (0-100) to pitch semitones based on current mode.
   * @returns {number} Pitch shift in semitones
   */
  _mapPitchByMode(position) {
    const t = position / 100; // Normalize to 0.0-1.0
    switch (this.mode) {
      case 'up':
        return t * 24;                  // 0 to +24 semitones (2 octaves up)
      case 'down':
        return -t * 24;                 // 0 to -24 semitones (2 octaves down)
      case 'detune':
        return (t - 0.5) * 1;           // -0.5 to +0.5 semitones (subtle detune)
      case 'harmony':
        return Math.round(t * 12);      // 0 to +12, snapped to nearest semitone
      default:
        return (t - 0.5) * 48;          // -24 to +24 (full range)
    }
  }

  /**
   * Recalculates and applies the pitch based on current position and mode.
   */
  _updatePitch() {
    if (!this.pitchShifterNode) return;
    const now = this.audioContext.currentTime;
    const semitones = this._mapPitchByMode(this.position);
    // Smooth ramp for expression pedal feel
    this.pitchShifterNode.parameters.get('pitch').setTargetAtTime(semitones, now, 0.02);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'pitch': {
        // Expression pedal position: 0-100
        this.position = Math.max(0, Math.min(100, value));
        this._updatePitch();
        break;
      }
      case 'mode': {
        // Accept string ('up','down','detune','harmony') or numeric (0-3)
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['up', 'down', 'detune', 'harmony'];
          this.mode = modes[Math.max(0, Math.min(3, Math.floor(value)))] || 'up';
        }
        this._updatePitch(); // Recalculate pitch for new mode
        break;
      }
      case 'mix': {
        // 0-100 → 0.0-1.0
        this.setMix(value / 100);
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { if (this.pitchShifterNode) this.pitchShifterNode.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default WhammyEffect;
