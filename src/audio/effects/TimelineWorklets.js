/**
 * Timeline Delay — AudioWorklet processors (reverse buffer + bitcrusher)
 * Used by TimelineDelayEffect for REVE (real reverse) and LOFI/DBUC (bit/sr reduce).
 */

export const ReverseBufferProcessorCode = `
class ReverseBufferProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'windowMs', defaultValue: 500, minValue: 50, maxValue: 4000, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.sr = sampleRate;
    this.maxSeconds = 5.0;
    this.maxSamples = Math.floor(this.sr * this.maxSeconds);

    this.bufL = new Float32Array(this.maxSamples);
    this.bufR = new Float32Array(this.maxSamples);

    this.writeIdx = 0;

    this.state = 0;
    this.playIdx = 0;
    this.winSamples = Math.floor(this.sr * 0.5);
    this.fadeSamples = Math.max(32, Math.floor(this.winSamples * 0.02));
    this.playCount = 0;
  }

  _setWindow(ms) {
    const ws = Math.max(50, Math.min(4000, ms));
    this.winSamples = Math.min(this.maxSamples - 1, Math.floor(this.sr * (ws / 1000)));
    this.fadeSamples = Math.max(32, Math.floor(this.winSamples * 0.02));
  }

  _env(n) {
    if (n < this.fadeSamples) {
      const x = n / this.fadeSamples;
      return 0.5 - 0.5 * Math.cos(Math.PI * x);
    }
    const tail = this.winSamples - n;
    if (tail < this.fadeSamples) {
      const x = tail / this.fadeSamples;
      return 0.5 - 0.5 * Math.cos(Math.PI * x);
    }
    return 1.0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;

    const inL = input[0];
    const inR = input[1] || input[0];
    const outL = output[0];
    const outR = output[1] || output[0];

    const mixArr = parameters.mix;
    const winArr = parameters.windowMs;

    const mix = mixArr.length ? mixArr[0] : 1.0;
    const winMs = winArr.length ? winArr[0] : 500;
    this._setWindow(winMs);

    for (let i = 0; i < inL.length; i++) {
      this.bufL[this.writeIdx] = inL[i];
      this.bufR[this.writeIdx] = inR[i];
      this.writeIdx++;
      if (this.writeIdx >= this.maxSamples) this.writeIdx = 0;

      let revL = 0, revR = 0;

      if (this.state === 0) {
        this.playCount++;
        if (this.playCount >= this.winSamples) {
          this.state = 1;
          this.playIdx = (this.writeIdx - 1 + this.maxSamples) % this.maxSamples;
          this.playCount = 0;
        }
      } else {
        const env = this._env(this.playCount);

        revL = this.bufL[this.playIdx] * env;
        revR = this.bufR[this.playIdx] * env;

        this.playIdx--;
        if (this.playIdx < 0) this.playIdx = this.maxSamples - 1;

        this.playCount++;
        if (this.playCount >= this.winSamples) {
          this.state = 0;
          this.playCount = 0;
        }
      }

      outL[i] = (1 - mix) * inL[i] + mix * revL;
      outR[i] = (1 - mix) * inR[i] + mix * revR;
    }

    return true;
  }
}

registerProcessor('reverse-buffer', ReverseBufferProcessor);
`;

export const BitcrusherProcessorCode = `
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 12, minValue: 4, maxValue: 16, automationRate: 'k-rate' },
      { name: 'downsample', defaultValue: 1, minValue: 1, maxValue: 32, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.hold = 0;
    this.lastL = 0;
    this.lastR = 0;
  }

  _quantize(x, bits) {
    const levels = (1 << Math.floor(bits)) - 1;
    const u = (x * 0.5 + 0.5);
    const q = Math.round(u * levels) / levels;
    return (q - 0.5) * 2.0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;

    const inL = input[0];
    const inR = input[1] || input[0];
    const outL = output[0];
    const outR = output[1] || output[0];

    const bits = (parameters.bitDepth.length ? parameters.bitDepth[0] : 12);
    const ds = Math.max(1, Math.floor(parameters.downsample.length ? parameters.downsample[0] : 1));
    const mix = (parameters.mix.length ? parameters.mix[0] : 1.0);

    for (let i = 0; i < inL.length; i++) {
      if (this.hold === 0) {
        this.lastL = this._quantize(inL[i], bits);
        this.lastR = this._quantize(inR[i], bits);
      }
      this.hold = (this.hold + 1) % ds;

      const crushedL = this.lastL;
      const crushedR = this.lastR;

      outL[i] = (1 - mix) * inL[i] + mix * crushedL;
      outR[i] = (1 - mix) * inR[i] + mix * crushedR;
    }

    return true;
  }
}

registerProcessor('bitcrusher-sr', BitcrusherProcessor);
`;
