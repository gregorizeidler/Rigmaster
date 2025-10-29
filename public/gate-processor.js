/**
 * HardGateProcessor - Professional Noise Gate AudioWorklet
 * 
 * Features:
 * - RMS/peak hybrid detector with adjustable mix
 * - True hysteresis (separate open/close thresholds)
 * - Sample-accurate envelope tracking
 * - Ultra-fast attack preserves pick transients
 * - Smooth release prevents chattering
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('gate-processor.js');
 *   const gate = new AudioWorkletNode(audioContext, 'hard-gate');
 *   gate.parameters.get('thOpen').value = -48;
 *   gate.parameters.get('thClose').value = -56;
 * 
 * Compatible with all high-gain amps: Mesa, Peavey, Soldano, Friedman, etc.
 */

class HardGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { 
        name: 'thOpen', 
        defaultValue: -48,
        minValue: -96,
        maxValue: 0,
        automationRate: 'k-rate'
      },
      { 
        name: 'thClose', 
        defaultValue: -56,
        minValue: -96,
        maxValue: 0,
        automationRate: 'k-rate'
      },
      { 
        name: 'attack', 
        defaultValue: 0.001,
        minValue: 0.0001,
        maxValue: 0.1,
        automationRate: 'k-rate'
      },
      { 
        name: 'release', 
        defaultValue: 0.08,
        minValue: 0.01,
        maxValue: 1.0,
        automationRate: 'k-rate'
      },
      { 
        name: 'rms', 
        defaultValue: 0.015,
        minValue: 0.001,
        maxValue: 0.1,
        automationRate: 'k-rate'
      },
      { 
        name: 'peakMix', 
        defaultValue: 0.3,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate'
      },
    ];
  }

  constructor() {
    super();
    this._gain = 0;        // Current gate gain (0..1)
    this._open = false;    // Hysteresis state
    this._rmsAlpha = 0;
    this._peak = 0;
    this._rms = 0;
    this._lastSampleRate = 0;
  }

  _dbToLin(db) { 
    return Math.pow(10, db / 20); 
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length || !output || !output.length) {
      return true;
    }

    const chIn = input[0];
    const chOut = output[0];
    const sr = sampleRate;

    // Recalculate RMS alpha if sample rate changed
    const rmsSec = parameters.rms[0];
    if (this._lastSampleRate !== sr) {
      this._rmsAlpha = Math.exp(-1 / (rmsSec * sr));
      this._lastSampleRate = sr;
    }

    const thOpen = this._dbToLin(parameters.thOpen[0]);
    const thClose = this._dbToLin(parameters.thClose[0]);
    const aAtk = Math.exp(-1 / (parameters.attack[0] * sr));
    const aRel = Math.exp(-1 / (parameters.release[0] * sr));
    const peakMix = parameters.peakMix[0];

    for (let i = 0; i < chIn.length; i++) {
      const x = chIn[i] || 0;

      // Hybrid RMS/peak detector
      const absx = Math.abs(x);
      this._peak = Math.max(absx, this._peak * 0.99);
      this._rms = Math.sqrt(
        this._rmsAlpha * this._rms * this._rms + 
        (1 - this._rmsAlpha) * absx * absx
      );
      const det = peakMix * this._peak + (1 - peakMix) * this._rms;

      // True hysteresis (prevents chattering)
      if (this._open) {
        if (det < thClose) this._open = false;
      } else {
        if (det > thOpen) this._open = true;
      }

      // AR envelope (0 or 1 as target)
      const target = this._open ? 1 : 0;
      const a = target > this._gain ? aAtk : aRel;
      this._gain = target + (this._gain - target) * a;

      chOut[i] = x * this._gain;
    }

    // Slow peak decay
    this._peak *= 0.995;

    return true;
  }
}

registerProcessor('hard-gate', HardGateProcessor);

