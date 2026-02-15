import BaseEffect from './BaseEffect';

/**
 * Dunlop105QEffect - Dunlop 105Q Bass Wah
 *
 * Wah pedal designed specifically for bass guitar.
 * Retains low-end while sweeping the wah filter through the mids.
 *
 * Features:
 * - Bandpass sweep filter for wah effect
 * - Low-end retention via parallel lowshelf path
 * - Variable Q for narrow quack to wide sweep
 * - Volume control compensates for level changes during sweep
 * - Range control sets the sweep bandwidth
 *
 * Params: position (0-100 = toe-to-heel), volume (0-100),
 *         range (0-100), q (0-100)
 */
class Dunlop105QEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Dunlop 105Q Bass Wah', 'dunlop105q');

    // ===== Input conditioning =====
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;

    // ===== Sub-bass preservation path =====
    // This is the key to the 105Q — bass frequencies pass through untouched
    this.lowRetain = audioContext.createBiquadFilter();
    this.lowRetain.type = 'lowpass';
    this.lowRetain.frequency.value = 180;
    this.lowRetain.Q.value = 0.5;

    this.lowRetainGain = audioContext.createGain();
    this.lowRetainGain.gain.value = 0.8;

    // ===== Main wah sweep filter =====
    this.wahFilter = audioContext.createBiquadFilter();
    this.wahFilter.type = 'bandpass';
    this.wahFilter.frequency.value = 500;
    this.wahFilter.Q.value = 4.0;

    // ===== Resonance emphasis filter =====
    this.resonancePeak = audioContext.createBiquadFilter();
    this.resonancePeak.type = 'peaking';
    this.resonancePeak.frequency.value = 500;
    this.resonancePeak.Q.value = 3.0;
    this.resonancePeak.gain.value = 8;

    // ===== Wah path gain =====
    this.wahGain = audioContext.createGain();
    this.wahGain.gain.value = 1.2;

    // ===== Mix bus (low retain + wah) =====
    this.mixBus = audioContext.createGain();
    this.mixBus.gain.value = 1.0;

    // ===== Output volume =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.8;

    // ===== Post-EQ: gentle high roll-off to avoid harshness =====
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 8000;
    this.outputLPF.Q.value = 0.5;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 15;
    this.dcBlocker.Q.value = 0.707;

    // ===== Wet signal routing =====
    this.input.connect(this.inputBuffer);

    // Wah path
    this.inputBuffer.connect(this.wahFilter);
    this.wahFilter.connect(this.resonancePeak);
    this.resonancePeak.connect(this.wahGain);
    this.wahGain.connect(this.mixBus);

    // Low-end retention path (parallel)
    this.inputBuffer.connect(this.lowRetain);
    this.lowRetain.connect(this.lowRetainGain);
    this.lowRetainGain.connect(this.mixBus);

    // Output
    this.mixBus.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputLPF);
    this.outputLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Range state =====
    this._rangeMin = 200;
    this._rangeMax = 2500;

    this.params = { position: 50, volume: 70, range: 50, q: 50 };
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'position': {
        // 0 (heel/low) to 100 (toe/high)
        // Logarithmic frequency sweep
        const minLog = Math.log10(this._rangeMin);
        const maxLog = Math.log10(this._rangeMax);
        const freq = Math.pow(10, minLog + (value / 100) * (maxLog - minLog));
        this.wahFilter.frequency.setTargetAtTime(freq, now, 0.005);
        this.resonancePeak.frequency.setTargetAtTime(freq, now, 0.007);
        break;
      }

      case 'volume': {
        // 0-100 → 0.0 to 1.6 (slight boost available)
        const vol = (value / 100) * 1.6;
        this.outputGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'range': {
        // 0-100 adjusts the sweep range
        // Low range = narrow sweep around low-mids, high range = wide sweep into treble
        this._rangeMin = 150 + (value / 100) * 150;  // 150–300Hz
        this._rangeMax = 1500 + (value / 100) * 3500; // 1.5–5kHz
        // Re-apply current position with new range
        this.updateParameter('position', this.params.position);
        break;
      }

      case 'q': {
        // 0-100 → Q from 1.5 (wide, subtle) to 12 (narrow, quacky)
        const q = 1.5 + (value / 100) * 10.5;
        this.wahFilter.Q.setTargetAtTime(q, now, 0.01);
        // Resonance peak tracks
        const resQ = 1 + (value / 100) * 6;
        this.resonancePeak.Q.setTargetAtTime(resQ, now, 0.01);
        const resGain = 4 + (value / 100) * 10;
        this.resonancePeak.gain.setTargetAtTime(resGain, now, 0.01);
        break;
      }

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputBuffer.disconnect();
      this.wahFilter.disconnect();
      this.resonancePeak.disconnect();
      this.wahGain.disconnect();
      this.lowRetain.disconnect();
      this.lowRetainGain.disconnect();
      this.mixBus.disconnect();
      this.dcBlocker.disconnect();
      this.outputLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default Dunlop105QEffect;
