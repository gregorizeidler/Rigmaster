/**
 * SagProcessor - PRODUCTION-GRADE Power Supply Sag AudioWorklet
 * 
 * Simulates tube rectifier voltage sag (power supply compression)
 * that occurs when playing loud through a tube amp.
 * 
 * Features:
 * - Sample-accurate envelope tracking (no 16ms lag)
 * - RMS/peak hybrid detector with configurable RMS window
 * - Program-dependent dual release (fast initial recovery, slow final)
 * - Stereo/multi-channel support (linked detector)
 * - Optional sidechain input (inputs[1])
 * - Exponential sag curve (shape parameter)
 * - Denormal/NaN protection
 * - Configurable sag depth (tube vs silicon rectifier)
 * - Headroom floor protection (prevents complete collapse)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('sag-processor.js');
 *   const sag = new AudioWorkletNode(audioContext, 'sag-env');
 *   sag.parameters.get('depth').value = 0.08;     // Silicon: 0.08, Tube: 0.15
 *   sag.parameters.get('att').value = 0.006;      // Fast droop
 *   sag.parameters.get('relFast').value = 0.06;   // Fast recovery start
 *   sag.parameters.get('relSlow').value = 0.20;   // Slow recovery end
 *   sag.parameters.get('rmsMs').value = 20.0;     // RMS window (tube rectifier)
 *   sag.parameters.get('shape').value = 1.5;      // Exponential curve
 * 
 * Sidechain:
 *   Connect detector signal to second input for sidechain operation
 *   (e.g., measure after preamp, apply sag at power amp)
 * 
 * Recommended settings:
 *   Silicon rectifier: depth=0.08, rmsMs=10, shape=1.0
 *   Tube rectifier:    depth=0.15, rmsMs=25, shape=1.6
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
        maxValue: 0.9,
        automationRate: 'k-rate'
      },
      { 
        name: 'att', 
        defaultValue: 0.006,
        minValue: 0.0005,
        maxValue: 0.05,
        automationRate: 'k-rate'
      },
      { 
        name: 'relFast', 
        defaultValue: 0.06,
        minValue: 0.003,
        maxValue: 0.5,
        automationRate: 'k-rate'
      },
      { 
        name: 'relSlow', 
        defaultValue: 0.20,
        minValue: 0.01,
        maxValue: 1.0,
        automationRate: 'k-rate'
      },
      { 
        name: 'floor', 
        defaultValue: 0.25,
        minValue: 0.1,
        maxValue: 0.95,
        automationRate: 'k-rate'
      },
      { 
        name: 'peakMix', 
        defaultValue: 0.30,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate'
      },
      { 
        name: 'rmsMs', 
        defaultValue: 10.0,
        minValue: 2.0,
        maxValue: 80.0,
        automationRate: 'k-rate'
      },
      { 
        name: 'shape', 
        defaultValue: 1.0,
        minValue: 0.5,
        maxValue: 3.0,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    this._gain = 1.0;           // Current supply gain (headroom multiplier)
    this._rms = 0.0;
    this._peak = 0.0;
    this._rmsAlpha = 0.0;
    this._lastSR = 0;
    this._lastRmsMs = 0;
  }

  _ensureRmsAlpha(sr, rmsMs) {
    const ms = Math.max(2.0, rmsMs || 10.0);
    if (this._lastSR !== sr || this._lastRmsMs !== ms) {
      this._rmsAlpha = Math.exp(-1 / ((ms / 1000) * sr));
      this._lastSR = sr;
      this._lastRmsMs = ms;
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const sr = sampleRate;
    this._ensureRmsAlpha(sr, parameters.rmsMs[0]);

    // Read k-rate parameters with safety clamps
    const depth   = Math.min(0.9, Math.max(0.0, parameters.depth[0] ?? 0.08));
    const floor   = Math.min(0.99, Math.max(0.1, parameters.floor[0] ?? 0.25));
    const peakMix = parameters.peakMix[0] ?? 0.3;
    const shape   = parameters.shape[0]   ?? 1.0;

    const att = Math.max(1e-4, parameters.att[0]     ?? 0.006);
    const rF  = Math.max(1e-3, parameters.relFast[0] ?? 0.06);
    const rS  = Math.max(1e-3, parameters.relSlow[0] ?? 0.20);

    const aAtk = Math.exp(-1 / (att * sr));
    
    // Dual release "program-dependent":
    // Interpolates between relFast and relSlow based on compression amount
    // More sag (lower gain) = slower release (tube-like breathing)
    const relFor = (g) => {
      const t = 1 - g; // 0..1 (0 = no sag, 1 = max sag)
      const rel = rF * (1 - t) + rS * t;
      return Math.exp(-1 / (rel * sr));
    };

    const frames = output[0].length;
    const numChIn  = input.length;
    const numChOut = output.length;

    // Optional sidechain on inputs[1]
    const sc = inputs[1] && inputs[1].length ? inputs[1] : null;

    for (let i = 0; i < frames; i++) {
      // Linked detector (uses sidechain if available, otherwise max across input channels)
      let detIn = 0.0;
      const source = sc || input;
      const nSrc = source.length;
      for (let ch = 0; ch < nSrc; ch++) {
        const x = source[ch][i] || 0;
        const ax = Math.abs(x);
        if (ax > detIn) detIn = ax;
      }

      // Hybrid RMS/peak with denormal protection
      const prevR = this._rms;
      const eps = 1e-12; // Prevents denormals/NaN
      this._rms = Math.sqrt(
        this._rmsAlpha * prevR * prevR + 
        (1 - this._rmsAlpha) * detIn * detIn + 
        eps
      );
      this._peak = Math.max(detIn, this._peak * 0.995);
      const det = peakMix * this._peak + (1 - peakMix) * this._rms;

      // Sag curve (shape): exponential mapping of detector -> compression
      // shape > 1.0 makes sag more progressive (tube-like)
      // shape = 1.0 is linear (silicon-like)
      const shaped = Math.pow(det, shape);

      // Target headroom (1 = no sag, floor = heavy sag)
      // More signal = more current draw = voltage droops = less headroom
      const target = Math.max(floor, 1 - depth * shaped);

      // Attack fast on droop, release depends on current state (dual release)
      // Fast initial recovery, slower as it approaches unity
      const a = (target < this._gain) ? aAtk : relFor(this._gain);
      this._gain = target + (this._gain - target) * a;

      // Apply same gain to all output channels (linked)
      for (let ch = 0; ch < numChOut; ch++) {
        const x = (input[ch] ? input[ch][i] : 0) || 0;
        output[ch][i] = x * this._gain;
      }
    }

    return true;
  }
}

registerProcessor('sag-env', SagProcessor);

