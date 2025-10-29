/**
 * SagProcessor - Professional Power Supply Sag AudioWorklet
 * 
 * Simulates tube rectifier voltage sag (power supply compression)
 * that occurs when playing loud through a tube amp.
 * 
 * Features:
 * - Sample-accurate envelope tracking (no 16ms lag)
 * - RMS/peak hybrid detector
 * - Dynamic attack/release based on signal behavior
 * - Configurable sag depth (tube vs silicon rectifier)
 * - Headroom floor protection (prevents complete collapse)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('sag-processor.js');
 *   const sag = new AudioWorkletNode(audioContext, 'sag-env');
 *   sag.parameters.get('depth').value = 0.08;  // Silicon: 0.08, Tube: 0.15
 *   sag.parameters.get('att').value = 0.006;   // Fast droop
 *   sag.parameters.get('rel').value = 0.08;    // Slow recovery
 * 
 * Compatible with all tube amps: Mesa, Vox, Marshall, Fender, etc.
 */

class SagProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { 
        name: 'depth', 
        defaultValue: 0.08,
        minValue: 0.0,
        maxValue: 0.5,
        automationRate: 'k-rate'
      },
      { 
        name: 'att', 
        defaultValue: 0.006,
        minValue: 0.001,
        maxValue: 0.05,
        automationRate: 'k-rate'
      },
      { 
        name: 'rel', 
        defaultValue: 0.08,
        minValue: 0.01,
        maxValue: 0.5,
        automationRate: 'k-rate'
      },
      { 
        name: 'floor', 
        defaultValue: 0.25,
        minValue: 0.1,
        maxValue: 0.9,
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
    this._gain = 1;      // Current supply gain (headroom multiplier)
    this._rms = 0;
    this._peak = 0;
    this._rmsAlpha = Math.exp(-1 / (0.01 * sampleRate)); // 10ms RMS window
    this._lastSampleRate = 0;
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
    if (this._lastSampleRate !== sr) {
      this._rmsAlpha = Math.exp(-1 / (0.01 * sr));
      this._lastSampleRate = sr;
    }

    const depth = parameters.depth[0];
    const att = parameters.att[0];
    const rel = parameters.rel[0];
    const floor = parameters.floor[0];
    const peakMix = parameters.peakMix[0];

    const aAtk = Math.exp(-1 / (att * sr));
    const aRel = Math.exp(-1 / (rel * sr));

    for (let i = 0; i < chIn.length; i++) {
      const x = chIn[i] || 0;
      const absx = Math.abs(x);

      // Hybrid RMS/peak detector
      this._peak = Math.max(absx, this._peak * 0.99);
      this._rms = Math.sqrt(
        this._rmsAlpha * this._rms * this._rms + 
        (1 - this._rmsAlpha) * absx * absx
      );
      const det = peakMix * this._peak + (1 - peakMix) * this._rms;

      // Target headroom reduction (supply voltage sag)
      // More signal = more current draw = voltage droops = less headroom
      const target = Math.max(floor, 1 - depth * det);

      // Dynamic attack/release
      // Fast attack (supply droops quickly)
      // Slow release (supply recovers slowly)
      const a = target < this._gain ? aAtk : aRel;
      this._gain = target + (this._gain - target) * a;

      // Apply sag (reduced headroom)
      chOut[i] = x * this._gain;
    }

    // Slow peak decay
    this._peak *= 0.995;

    return true;
  }
}

registerProcessor('sag-env', SagProcessor);

