/**
 * RingModProcessor - True ring modulation AudioWorklet
 * 
 * Performs actual multiplication of input signal with carrier oscillator.
 * (Web Audio API GainNode cannot multiply two audio signals.)
 * 
 * Parameters:
 *   frequency: carrier frequency in Hz (20 to 5000, default 440)
 *   waveform:  0=sine, 1=triangle, 2=square, 3=sawtooth (default 0)
 *   mix:       dry/wet (0 to 1, default 1)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('ring-mod-processor.js');
 *   const rm = new AudioWorkletNode(audioContext, 'ring-mod');
 *   rm.parameters.get('frequency').value = 220;
 */
class RingModProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 440, minValue: 20, maxValue: 5000, automationRate: 'k-rate' },
      { name: 'waveform', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._phase = 0;
  }

  _generateCarrier(phase, waveform) {
    const p = phase % 1.0;
    switch (Math.round(waveform)) {
      case 0: // Sine
        return Math.sin(2 * Math.PI * p);
      case 1: // Triangle
        return 4 * Math.abs(p - 0.5) - 1;
      case 2: // Square (band-limited via tanh for less aliasing)
        return Math.tanh(Math.sin(2 * Math.PI * p) * 10);
      case 3: // Sawtooth (band-limited via tanh)
        return Math.tanh((2 * p - 1) * 5) * 0.8;
      default:
        return Math.sin(2 * Math.PI * p);
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const freq = parameters.frequency[0] || 440;
    const waveform = parameters.waveform[0] || 0;
    const mix = Math.max(0, Math.min(1, parameters.mix[0] ?? 1));
    const sr = sampleRate;
    const phaseInc = freq / sr;

    const numChannels = Math.min(input.length, output.length);
    const frames = output[0].length;

    for (let i = 0; i < frames; i++) {
      const carrier = this._generateCarrier(this._phase, waveform);
      this._phase += phaseInc;
      if (this._phase >= 1.0) this._phase -= 1.0;

      for (let ch = 0; ch < numChannels; ch++) {
        const dry = (input[ch] ? input[ch][i] : 0) || 0;
        const wet = dry * carrier; // TRUE ring modulation: multiplication
        output[ch][i] = dry * (1 - mix) + wet * mix;
      }
    }

    return true;
  }
}

registerProcessor('ring-mod', RingModProcessor);
