/**
 * EnvelopeFollowerProcessor - Audio-rate envelope detection AudioWorklet
 * 
 * Replaces requestAnimationFrame-based envelope followers with
 * sample-accurate processing for filters, auto-wah, swell, etc.
 * 
 * Outputs the envelope value as audio signal (0..1) that can be
 * used to modulate other parameters via AudioParam connections.
 * 
 * Parameters:
 *   attack:      attack time in seconds (0.001 to 0.5, default 0.01)
 *   release:     release time in seconds (0.01 to 2.0, default 0.1)
 *   sensitivity: input gain multiplier (0.1 to 10, default 1.0)
 *   mode:        0=RMS, 1=peak (default 0)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('envelope-follower-processor.js');
 *   const env = new AudioWorkletNode(audioContext, 'envelope-follower');
 *   // Output is 0..1 envelope signal
 *   env.connect(filterFreqParam); // modulate filter frequency
 */
class EnvelopeFollowerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'attack',      defaultValue: 0.01, minValue: 0.001, maxValue: 0.5,  automationRate: 'k-rate' },
      { name: 'release',     defaultValue: 0.1,  minValue: 0.01,  maxValue: 2.0,  automationRate: 'k-rate' },
      { name: 'sensitivity', defaultValue: 1.0,  minValue: 0.1,   maxValue: 10.0, automationRate: 'k-rate' },
      { name: 'mode',        defaultValue: 0,    minValue: 0,     maxValue: 1,    automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._envelope = 0;
    this._rms = 0;
    this._peak = 0;
    this._lastSR = 0;
    this._atkCoeff = 0;
    this._relCoeff = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const sr = sampleRate;
    const atk = Math.max(0.001, parameters.attack[0] || 0.01);
    const rel = Math.max(0.01, parameters.release[0] || 0.1);
    const sensitivity = parameters.sensitivity[0] || 1.0;
    const mode = Math.round(parameters.mode[0] || 0);

    // Recalculate coefficients
    this._atkCoeff = Math.exp(-1 / (atk * sr));
    this._relCoeff = Math.exp(-1 / (rel * sr));

    const numChannels = input.length;
    const frames = output[0].length;
    const eps = 1e-12;

    for (let i = 0; i < frames; i++) {
      // Detect across all input channels
      let detIn = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const x = (input[ch] ? input[ch][i] : 0) || 0;
        const ax = Math.abs(x * sensitivity);
        if (ax > detIn) detIn = ax;
      }

      let level;
      if (mode === 0) {
        // RMS mode
        const prevRms = this._rms;
        const alpha = 0.9995; // ~10ms RMS window at 48kHz
        this._rms = Math.sqrt(alpha * prevRms * prevRms + (1 - alpha) * detIn * detIn + eps);
        level = this._rms;
      } else {
        // Peak mode
        this._peak = Math.max(detIn, this._peak * 0.999);
        level = this._peak;
      }

      // Attack/release envelope
      const coeff = (level > this._envelope) ? this._atkCoeff : this._relCoeff;
      this._envelope = level + (this._envelope - level) * coeff;

      // Clamp to 0..1
      const envOut = Math.min(1.0, Math.max(0.0, this._envelope));

      // Output envelope to all channels
      for (let ch = 0; ch < output.length; ch++) {
        output[ch][i] = envOut;
      }
    }

    return true;
  }
}

registerProcessor('envelope-follower', EnvelopeFollowerProcessor);
