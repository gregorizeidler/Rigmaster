import BaseEffect from './BaseEffect.js';

class TunerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tuner', 'tuner');

    // TUNER (Chromatic tuner with pitch detection)

    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();

    // Analyser for pitch detection
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Float32Array(this.analyser.fftSize);

    // Precompute Hann window
    this._hannWindow = new Float32Array(this.analyser.fftSize);
    for (let i = 0; i < this.analyser.fftSize; i++) {
      this._hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this.analyser.fftSize - 1)));
    }

    // Windowed buffer for analysis
    this._windowedBuffer = new Float32Array(this.analyser.fftSize);

    // Pitch smoothing history
    this._pitchHistory = [];
    this._pitchHistorySize = 5;

    // Mute when tuning
    this.muteGain = audioContext.createGain();
    this.muteGain.gain.value = 1.0; // Bypass by default

    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.analyser);
    this.inputGain.connect(this.muteGain);
    this.muteGain.connect(this.outputGain);
    this.outputGain.connect(this.output);

    // Note names
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    this.detectedNote = null;
    this.detectedFreq = 0;
    this.cents = 0;

    this.params = { mute: false, reference: 440, display: 0 };
  }

  detectPitch() {
    const fftSize = this.analyser.fftSize;
    this.analyser.getFloatTimeDomainData(this.dataArray);

    // Check if there's enough signal
    let signalPower = 0;
    for (let i = 0; i < fftSize; i++) {
      signalPower += this.dataArray[i] * this.dataArray[i];
    }
    signalPower = Math.sqrt(signalPower / fftSize);

    if (signalPower < 0.01) {
      // Too quiet - no reliable detection
      return {
        note: this.detectedNote,
        frequency: this.detectedFreq,
        cents: this.cents
      };
    }

    // Apply Hann window before autocorrelation
    for (let i = 0; i < fftSize; i++) {
      this._windowedBuffer[i] = this.dataArray[i] * this._hannWindow[i];
    }

    // Proper autocorrelation: multiply (not subtract)
    const sampleRate = this.audioContext.sampleRate;
    const halfSize = Math.floor(fftSize / 2);
    let maxCorrelation = 0;
    let bestOffset = -1;

    // Compute autocorrelation at lag 0 for normalization
    let r0 = 0;
    for (let i = 0; i < halfSize; i++) {
      r0 += this._windowedBuffer[i] * this._windowedBuffer[i];
    }

    if (r0 < 1e-10) {
      return {
        note: this.detectedNote,
        frequency: this.detectedFreq,
        cents: this.cents
      };
    }

    // Min/max periods for guitar range (~60Hz to ~1500Hz)
    const minPeriod = Math.floor(sampleRate / 1500);
    const maxPeriod = Math.floor(sampleRate / 60);

    // Search for first peak in normalized autocorrelation above threshold
    let foundFirstDip = false;

    for (let offset = minPeriod; offset < Math.min(maxPeriod, halfSize); offset++) {
      let correlation = 0;
      for (let i = 0; i < halfSize; i++) {
        correlation += this._windowedBuffer[i] * this._windowedBuffer[i + offset];
      }

      // Normalize
      const normalizedCorrelation = correlation / r0;

      // Wait for the correlation to dip below threshold first
      // to avoid matching the peak at lag 0
      if (!foundFirstDip && normalizedCorrelation < 0.5) {
        foundFirstDip = true;
      }

      if (foundFirstDip && normalizedCorrelation > 0.8 && normalizedCorrelation > maxCorrelation) {
        maxCorrelation = normalizedCorrelation;
        bestOffset = offset;
      }
    }

    if (bestOffset > 0 && maxCorrelation > 0.8) {
      // Parabolic interpolation for sub-sample accuracy
      let interpolatedOffset = bestOffset;
      if (bestOffset > minPeriod && bestOffset < halfSize - 1) {
        let corrPrev = 0, corrNext = 0;
        for (let i = 0; i < halfSize; i++) {
          corrPrev += this._windowedBuffer[i] * this._windowedBuffer[i + bestOffset - 1];
          corrNext += this._windowedBuffer[i] * this._windowedBuffer[i + bestOffset + 1];
        }
        corrPrev /= r0;
        corrNext /= r0;

        const shift = 0.5 * (corrPrev - corrNext) /
          (corrPrev - 2 * maxCorrelation + corrNext);

        if (Math.abs(shift) < 1) {
          interpolatedOffset = bestOffset + shift;
        }
      }

      const fundamentalFreq = sampleRate / interpolatedOffset;

      // Smooth the detected frequency
      this._pitchHistory.push(fundamentalFreq);
      if (this._pitchHistory.length > this._pitchHistorySize) {
        this._pitchHistory.shift();
      }

      // Median filter (more robust than average against outliers)
      const sorted = [...this._pitchHistory].sort((a, b) => a - b);
      const medianFreq = sorted[Math.floor(sorted.length / 2)];

      this.detectedFreq = medianFreq;

      // Calculate note and cents from A4 reference
      const referenceA4 = this.params.reference || 440;
      const halfSteps = 12 * Math.log2(medianFreq / referenceA4);
      const roundedHalfSteps = Math.round(halfSteps);

      // A4 = MIDI note 69. noteIndex relative to C is (69 + roundedHalfSteps)
      const midiNote = 69 + roundedHalfSteps;
      const noteName = this.noteNames[((midiNote % 12) + 12) % 12];
      const octave = Math.floor(midiNote / 12) - 1;

      this.detectedNote = `${noteName}${octave}`;
      this.cents = Math.round((halfSteps - roundedHalfSteps) * 100);
    }

    return {
      note: this.detectedNote,
      frequency: this.detectedFreq,
      cents: this.cents
    };
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'mute':
        this.muteGain.gain.setTargetAtTime(value ? 0 : 1, now, 0.001);
        break;
      case 'reference':
        // A4 reference frequency (typically 440Hz)
        this.params.reference = value;
        break;
      case 'display':
        // Display mode
        break;
    }

    this.params[parameter] = value;
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.muteGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default TunerEffect;
