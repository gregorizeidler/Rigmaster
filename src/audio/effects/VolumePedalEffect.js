import BaseEffect from './BaseEffect.js';

class VolumePedalEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Volume Pedal', 'volume');

    // VOLUME PEDAL (Expression pedal)

    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.volumeControl = audioContext.createGain();

    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.volumeControl);
    this.volumeControl.connect(this.outputGain);
    this.outputGain.connect(this.output);

    this.volumeControl.gain.value = 1.0;

    this.params = { volume: 100, curve: 0, min: 0, max: 100 };
  }

  _applyVolume(rawValue) {
    // rawValue is 0..100
    let normalized = rawValue / 100;

    // Apply min/max range
    const minVol = (this.params.min || 0) / 100;
    const maxVol = (this.params.max || 100) / 100;

    // Apply curve
    let curved;
    switch (this.params.curve) {
      case 1:
        // Audio taper (logarithmic) - perceived linear volume
        // Math.pow(x, 0.4) approximates human hearing perception
        curved = Math.pow(normalized, 0.4);
        break;
      case 2:
        // Reverse audio taper (exponential feel)
        curved = Math.pow(normalized, 2.5);
        break;
      default:
        // Linear
        curved = normalized;
        break;
    }

    // Scale to min/max range
    const finalValue = minVol + curved * (maxVol - minVol);

    const now = this.audioContext.currentTime;
    this.volumeControl.gain.setTargetAtTime(finalValue, now, 0.01);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'volume':
        this.params.volume = value;
        this._applyVolume(value);
        break;
      case 'curve':
        // 0=linear, 1=audio taper (log), 2=reverse taper (exp)
        this.params.curve = value;
        // Re-apply current volume with new curve
        this._applyVolume(this.params.volume);
        break;
      case 'min':
        this.params.min = value;
        this._applyVolume(this.params.volume);
        break;
      case 'max':
        this.params.max = value;
        this._applyVolume(this.params.volume);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.volumeControl.disconnect();
    this.outputGain.disconnect();
  }
}

export default VolumePedalEffect;
