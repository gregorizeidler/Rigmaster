/**
 * BitCrusherProcessor - Sample rate / bit depth reduction AudioWorklet
 * 
 * Replaces deprecated ScriptProcessorNode with proper AudioWorklet.
 * 
 * Parameters:
 *   bits:       bit depth (1 to 24, default 16)
 *   downsample: sample rate reduction factor (1 to 64, default 1)
 *   mix:        dry/wet mix (0 to 1, default 1)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('bitcrusher-processor.js');
 *   const bc = new AudioWorkletNode(audioContext, 'bitcrusher');
 *   bc.parameters.get('bits').value = 8;
 *   bc.parameters.get('downsample').value = 4;
 */
class BitCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 16, minValue: 1, maxValue: 24, automationRate: 'k-rate' },
      { name: 'downsample', defaultValue: 1, minValue: 1, maxValue: 64, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._lastSamples = [0, 0, 0, 0]; // per-channel hold values
    this._counter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const bits = Math.max(1, Math.min(24, Math.round(parameters.bits[0] || 16)));
    const downsample = Math.max(1, Math.round(parameters.downsample[0] || 1));
    const mix = Math.max(0, Math.min(1, parameters.mix[0] ?? 1));

    const step = Math.pow(0.5, bits);   // quantization step
    const invStep = 1.0 / step;

    const numChannels = Math.min(input.length, output.length);
    const frames = output[0].length;

    for (let i = 0; i < frames; i++) {
      this._counter++;

      for (let ch = 0; ch < numChannels; ch++) {
        const dry = (input[ch] ? input[ch][i] : 0) || 0;

        // Sample-and-hold: only update at reduced rate
        if (this._counter >= downsample) {
          // Bit reduction: quantize
          this._lastSamples[ch] = Math.round(dry * invStep) * step;
        }

        // Mix
        output[ch][i] = dry * (1 - mix) + this._lastSamples[ch] * mix;
      }

      if (this._counter >= downsample) {
        this._counter = 0;
      }
    }

    return true;
  }
}

registerProcessor('bitcrusher', BitCrusherProcessor);
