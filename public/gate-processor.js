/**
 * HardGateProcessor - PRODUCTION-GRADE Noise Gate AudioWorklet
 * 
 * Features:
 * - RMS/peak hybrid detector with adjustable mix
 * - True hysteresis (separate open/close thresholds with validation)
 * - Sample-accurate envelope tracking
 * - Stereo/multi-channel support (linked detector)
 * - Gate floor (musical silence, not digital silence)
 * - Hold time (minimum open/close duration prevents chattering)
 * - Parameterized peak decay
 * - Denormal/NaN protection
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('gate-processor.js');
 *   const gate = new AudioWorkletNode(audioContext, 'hard-gate');
 *   gate.parameters.get('thOpen').value = -50;
 *   gate.parameters.get('thClose').value = -58;
 *   gate.parameters.get('floorDb').value = -70;
 *   gate.parameters.get('holdMs').value = 8;
 * 
 * Recommended preset (high-gain):
 *   thOpen=-50, thClose=-58, attack=0.0007, release=0.16,
 *   rms=0.015, peakMix=0.35, floorDb=-70, holdMs=8
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
        minValue: 0.005,
        maxValue: 2.0,
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
      { 
        name: 'floorDb', 
        defaultValue: -80,
        minValue: -120,
        maxValue: -10,
        automationRate: 'k-rate'
      },
      { 
        name: 'holdMs', 
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 200.0,
        automationRate: 'k-rate'
      },
      { 
        name: 'peakDecay', 
        defaultValue: 0.995,
        minValue: 0.90,
        maxValue: 0.9999,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    this._gain = 0; 
    this._open = false;
    this._rmsAlpha = 0;
    this._peak = 0;
    this._rms = 0;
    this._lastSampleRate = 0;
    this._lastRmsSec = 0;

    // Hold counters (in samples)
    this._holdOpenSamples = 0;
    this._holdCloseSamples = 0;
    this._holdCounter = 0; // Remaining time in current state
  }

  _dbToLin(db) { 
    return Math.pow(10, db / 20); 
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const sr = sampleRate;
    const rmsSec = Math.max(1e-4, parameters.rms[0] || 0.015);

    // Recalculate RMS alpha when SR OR RMS parameter changes
    if (this._lastSampleRate !== sr || this._lastRmsSec !== rmsSec) {
      this._rmsAlpha = Math.exp(-1 / (rmsSec * sr));
      this._lastSampleRate = sr;
      this._lastRmsSec = rmsSec;
    }

    // Read k-rate parameters (one value per block)
    let thOpen  = this._dbToLin(parameters.thOpen[0]);
    let thClose = this._dbToLin(parameters.thClose[0]);
    
    // Ensure consistent hysteresis (thOpen must be >= thClose)
    if (thOpen < thClose) { 
      const t = thOpen; 
      thOpen = thClose; 
      thClose = t; 
    }

    const atk = Math.max(1e-5, parameters.attack[0]  || 0.001);
    const rel = Math.max(1e-3, parameters.release[0] || 0.08);
    const aAtk = Math.exp(-1 / (atk * sr));
    const aRel = Math.exp(-1 / (rel * sr));
    const peakMix = parameters.peakMix[0] ?? 0.3;

    const floorLin = this._dbToLin(parameters.floorDb[0] ?? -80);
    const peakDecay = parameters.peakDecay[0] ?? 0.995;

    // Hold time in samples
    const holdMs = parameters.holdMs[0] ?? 0.0;
    const holdSamples = Math.max(0, Math.floor((holdMs / 1000) * sr));
    if (this._holdOpenSamples !== holdSamples || this._holdCloseSamples !== holdSamples) {
      this._holdOpenSamples = holdSamples;
      this._holdCloseSamples = holdSamples;
    }

    const numChannels = Math.min(input.length, output.length);
    const frames = output[0].length;

    for (let i = 0; i < frames; i++) {
      // Linked detector (uses peak across all channels for consistent behavior)
      let detIn = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const x = input[ch][i] || 0;
        const ax = Math.abs(x);
        detIn = Math.max(detIn, ax); // Cross-channel peak
      }

      // Peak & RMS with denormal protection
      this._peak = Math.max(detIn, this._peak * peakDecay);
      
      // Prevent denormal/NaN
      const eps = 1e-12;
      const prev = this._rms;
      this._rms = Math.sqrt(
        this._rmsAlpha * prev * prev + 
        (1 - this._rmsAlpha) * detIn * detIn + 
        eps
      );
      const det = peakMix * this._peak + (1 - peakMix) * this._rms;

      // Hysteresis + hold
      let targetOpen = this._open;
      if (this._open) {
        // Can only close when hold time expires
        if (this._holdCounter <= 0 && det < thClose) {
          targetOpen = false;
          this._holdCounter = this._holdCloseSamples;
        }
      } else {
        // Can only open when hold time expires
        if (this._holdCounter <= 0 && det > thOpen) {
          targetOpen = true;
          this._holdCounter = this._holdOpenSamples;
        }
      }
      this._open = targetOpen;
      if (this._holdCounter > 0) this._holdCounter--;

      // AR envelope (target = 1.0 when open, floorLin when closed)
      const targetGain = this._open ? 1.0 : floorLin;
      const a = (targetGain > this._gain) ? aAtk : aRel;
      this._gain = targetGain + (this._gain - targetGain) * a;

      // Apply same gain to all channels (linked)
      for (let ch = 0; ch < numChannels; ch++) {
        const x = input[ch][i] || 0;
        output[ch][i] = x * this._gain;
      }
    }

    // Additional peak decay per block
    this._peak *= peakDecay;

    return true;
  }
}

registerProcessor('hard-gate', HardGateProcessor);

