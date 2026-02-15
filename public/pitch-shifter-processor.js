/**
 * PitchShifterProcessor - Granular pitch shifting AudioWorklet
 * 
 * Uses overlap-add granular synthesis for real-time pitch shifting.
 * Two grains cross-faded with Hann windows for smooth output.
 * 
 * Parameters:
 *   pitch: semitones (-24 to +24, default 0)
 *   mix:   dry/wet mix (0.0 to 1.0, default 1.0)
 *   grain: grain size in ms (20 to 100, default 50)
 * 
 * Usage:
 *   await audioContext.audioWorklet.addModule('pitch-shifter-processor.js');
 *   const ps = new AudioWorkletNode(audioContext, 'pitch-shifter');
 *   ps.parameters.get('pitch').value = 12; // one octave up
 */
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitch', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' },
      { name: 'mix',   defaultValue: 1.0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'grain', defaultValue: 50, minValue: 20, maxValue: 100, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this._maxGrainSamples = Math.ceil(0.1 * 96000); // 100ms at 96kHz max
    this._bufferSize = this._maxGrainSamples * 4;     // circular buffer
    
    // Circular input buffer (mono - will process first channel)
    this._buffer = new Float32Array(this._bufferSize);
    this._writePos = 0;
    
    // Two grain read heads
    this._readPos0 = 0;
    this._readPos1 = 0;
    this._grainPhase = 0;       // 0..1 progress through current grain
    this._grainSamples = 2400;  // default grain size in samples (50ms @ 48kHz)
    this._initialized = false;
  }

  _hannWindow(phase) {
    // Hann window: 0.5 * (1 - cos(2π * phase))
    return 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const sr = sampleRate;
    const pitchSemitones = parameters.pitch[0] || 0;
    const mix = Math.max(0, Math.min(1, parameters.mix[0] ?? 1));
    const grainMs = parameters.grain[0] || 50;
    
    // Calculate grain size in samples
    this._grainSamples = Math.max(128, Math.min(this._maxGrainSamples, Math.floor(grainMs * sr / 1000)));
    
    // Pitch ratio: 2^(semitones/12)
    const pitchRatio = Math.pow(2, pitchSemitones / 12);
    
    // Read speed: how fast we read from buffer relative to write
    // ratio > 1 = pitch up = read faster
    // ratio < 1 = pitch down = read slower
    const readSpeed = pitchRatio;
    
    const numChannels = Math.min(input.length, output.length);
    const frames = output[0].length;
    
    // Initialize read positions
    if (!this._initialized) {
      this._readPos0 = 0;
      this._readPos1 = this._grainSamples * 0.5; // offset by half grain
      this._grainPhase = 0;
      this._initialized = true;
    }
    
    for (let i = 0; i < frames; i++) {
      // Write input to circular buffer (use channel 0 for analysis)
      const inputSample = input[0] ? (input[0][i] || 0) : 0;
      this._buffer[this._writePos] = inputSample;
      this._writePos = (this._writePos + 1) % this._bufferSize;
      
      // Calculate grain phases for both read heads
      const phase0 = this._grainPhase;
      const phase1 = (this._grainPhase + 0.5) % 1.0;
      
      // Hann windows for crossfade
      const win0 = this._hannWindow(phase0);
      const win1 = this._hannWindow(phase1);
      
      // Read from buffer with linear interpolation
      const readIdx0 = this._readPos0;
      const readIdx1 = this._readPos1;
      
      const idx0Floor = Math.floor(readIdx0) % this._bufferSize;
      const idx0Ceil  = (idx0Floor + 1) % this._bufferSize;
      const frac0 = readIdx0 - Math.floor(readIdx0);
      
      const idx1Floor = Math.floor(readIdx1) % this._bufferSize;
      const idx1Ceil  = (idx1Floor + 1) % this._bufferSize;
      const frac1 = readIdx1 - Math.floor(readIdx1);
      
      // Handle negative indices
      const safeIdx = (idx) => ((idx % this._bufferSize) + this._bufferSize) % this._bufferSize;
      
      const sample0 = this._buffer[safeIdx(idx0Floor)] * (1 - frac0) + 
                       this._buffer[safeIdx(idx0Ceil)] * frac0;
      const sample1 = this._buffer[safeIdx(idx1Floor)] * (1 - frac1) + 
                       this._buffer[safeIdx(idx1Ceil)] * frac1;
      
      // Overlap-add with Hann windows
      const pitched = sample0 * win0 + sample1 * win1;
      
      // Advance read positions
      this._readPos0 += readSpeed;
      this._readPos1 += readSpeed;
      
      // Advance grain phase
      this._grainPhase += 1.0 / this._grainSamples;
      
      // Reset grain when phase completes
      if (this._grainPhase >= 1.0) {
        this._grainPhase -= 1.0;
        // Re-sync read head 0 to near write position
        this._readPos0 = this._writePos - this._grainSamples;
        if (this._readPos0 < 0) this._readPos0 += this._bufferSize;
        // Read head 1 stays offset
        this._readPos1 = this._readPos0 + this._grainSamples * 0.5;
      }
      
      // Output: mix dry and wet
      const dry = 1 - mix;
      for (let ch = 0; ch < numChannels; ch++) {
        const inp = (input[ch] ? input[ch][i] : 0) || 0;
        output[ch][i] = inp * dry + pitched * mix;
      }
    }

    return true;
  }
}

registerProcessor('pitch-shifter', PitchShifterProcessor);
