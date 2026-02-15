import BaseEffect from './BaseEffect';

/**
 * WalrusMonumentEffect - Walrus Audio Monument V2 Tremolo
 * 
 * Harmonic tremolo with tap tempo feel and multiple modes.
 * Features standard, harmonic, and pattern tremolo modes.
 * 
 * Features:
 * - Standard amplitude tremolo
 * - Harmonic tremolo (bass/treble alternating modulation)
 * - Pattern mode with rhythmic subdivisions
 * - Tone control for brightness
 * - Smooth waveform with adjustable symmetry
 */

class WalrusMonumentEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Walrus Monument', 'walrusmonument');

    // Crossover filters for harmonic tremolo
    this.lowPass = audioContext.createBiquadFilter();
    this.lowPass.type = 'lowpass';
    this.lowPass.frequency.value = 900;
    this.lowPass.Q.value = 0.5;

    this.highPass = audioContext.createBiquadFilter();
    this.highPass.type = 'highpass';
    this.highPass.frequency.value = 900;
    this.highPass.Q.value = 0.5;

    // Amplitude modulation gains
    this.lowAmpGain = audioContext.createGain();
    this.lowAmpGain.gain.value = 1.0;
    this.highAmpGain = audioContext.createGain();
    this.highAmpGain.gain.value = 1.0;

    // Standard tremolo gain
    this.stdTremoloGain = audioContext.createGain();
    this.stdTremoloGain.gain.value = 1.0;

    // Main LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 4.0;

    // LFO depth for standard tremolo
    this.lfoDepthStd = audioContext.createGain();
    this.lfoDepthStd.gain.value = 0.4;

    // LFO depth for low band (harmonic mode)
    this.lfoDepthLow = audioContext.createGain();
    this.lfoDepthLow.gain.value = 0.0;

    // LFO depth for high band (inverted for alternating)
    this.lfoDepthHigh = audioContext.createGain();
    this.lfoDepthHigh.gain.value = 0.0;

    // Pattern LFO (doubled frequency for subdivision patterns)
    this.patternLfo = audioContext.createOscillator();
    this.patternLfo.type = 'sine';
    this.patternLfo.frequency.value = 8.0;
    this.patternDepth = audioContext.createGain();
    this.patternDepth.gain.value = 0.0;

    // Waveshaper for pattern mode (makes rhythmic patterns from sine)
    this.patternShaper = audioContext.createWaveShaper();
    this.patternShaper.curve = this._makePatternCurve();

    // Tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 10000;
    this.toneFilter.Q.value = 0.5;

    // High shelf for brightness
    this.brightShelf = audioContext.createBiquadFilter();
    this.brightShelf.type = 'highshelf';
    this.brightShelf.frequency.value = 4000;
    this.brightShelf.gain.value = 0;

    // Output mixer
    this.outMix = audioContext.createGain();
    this.outMix.gain.value = 1.0;

    // LFO routing
    this.lfo.connect(this.lfoDepthStd);
    this.lfo.connect(this.lfoDepthLow);
    this.lfo.connect(this.lfoDepthHigh);

    // Standard AM routing
    this.lfoDepthStd.connect(this.stdTremoloGain.gain);

    // Harmonic AM routing
    this.lfoDepthLow.connect(this.lowAmpGain.gain);
    this.lfoDepthHigh.connect(this.highAmpGain.gain);

    // Pattern routing
    this.patternLfo.connect(this.patternShaper);
    this.patternShaper.connect(this.patternDepth);
    this.patternDepth.connect(this.stdTremoloGain.gain);

    // Start LFOs
    this.lfo.start();
    this.patternLfo.start();

    // Standard path: input -> stdTremoloGain -> outMix
    this.input.connect(this.stdTremoloGain);
    this.stdTremoloGain.connect(this.outMix);

    // Harmonic path: input -> crossover -> AM gains -> outMix
    this.input.connect(this.lowPass);
    this.input.connect(this.highPass);
    this.lowPass.connect(this.lowAmpGain);
    this.highPass.connect(this.highAmpGain);
    this.lowAmpGain.connect(this.outMix);
    this.highAmpGain.connect(this.outMix);

    // Output: outMix -> tone -> bright -> wetGain
    this.outMix.connect(this.toneFilter);
    this.toneFilter.connect(this.brightShelf);
    this.brightShelf.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.mode = 'standard';
    this._applyMode(audioContext.currentTime);
  }

  _makePatternCurve() {
    const samples = 512;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      // Creates choppy pattern from smooth input
      curve[i] = Math.sign(Math.sin(x * Math.PI * 3)) * 0.5;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.5 to 15 Hz
        const rate = 0.5 + (value / 100) * 14.5;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        this.patternLfo.frequency.setTargetAtTime(rate * 2, now, 0.01);
        break;

      case 'depth':
        // 0 to 0.5 AM depth
        const depth = (value / 100) * 0.5;
        if (this.mode === 'standard') {
          this.lfoDepthStd.gain.setTargetAtTime(depth, now, 0.01);
        } else if (this.mode === 'harmonic') {
          this.lfoDepthLow.gain.setTargetAtTime(depth, now, 0.01);
          this.lfoDepthHigh.gain.setTargetAtTime(-depth, now, 0.01);
        } else if (this.mode === 'pattern') {
          this.patternDepth.gain.setTargetAtTime(depth, now, 0.01);
        }
        break;

      case 'tone':
        // 3000 to 14000 Hz
        const toneFreq = 3000 + (value / 100) * 11000;
        this.toneFilter.frequency.setTargetAtTime(toneFreq, now, 0.02);
        // Brightness shelf
        const bright = -4 + (value / 100) * 8;
        this.brightShelf.gain.setTargetAtTime(bright, now, 0.02);
        break;

      case 'mode':
        this.mode = value;
        this._applyMode(now);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  _applyMode(now) {
    // Reset all modulation
    this.lfoDepthStd.gain.setTargetAtTime(0, now, 0.01);
    this.lfoDepthLow.gain.setTargetAtTime(0, now, 0.01);
    this.lfoDepthHigh.gain.setTargetAtTime(0, now, 0.01);
    this.patternDepth.gain.setTargetAtTime(0, now, 0.01);
    this.stdTremoloGain.gain.setTargetAtTime(0, now, 0.01);
    this.lowAmpGain.gain.setTargetAtTime(0, now, 0.01);
    this.highAmpGain.gain.setTargetAtTime(0, now, 0.01);

    switch (this.mode) {
      case 'standard':
        this.stdTremoloGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.lfoDepthStd.gain.setTargetAtTime(0.4, now + 0.02, 0.01);
        break;

      case 'harmonic':
        this.lowAmpGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.highAmpGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.lfoDepthLow.gain.setTargetAtTime(0.35, now + 0.02, 0.01);
        this.lfoDepthHigh.gain.setTargetAtTime(-0.35, now + 0.02, 0.01);
        break;

      case 'pattern':
        this.stdTremoloGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.patternDepth.gain.setTargetAtTime(0.35, now + 0.02, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.lowPass.disconnect();
      this.highPass.disconnect();
      this.lowAmpGain.disconnect();
      this.highAmpGain.disconnect();
      this.stdTremoloGain.disconnect();
      this.lfo.stop();
      this.patternLfo.stop();
      this.lfo.disconnect();
      this.patternLfo.disconnect();
      this.lfoDepthStd.disconnect();
      this.lfoDepthLow.disconnect();
      this.lfoDepthHigh.disconnect();
      this.patternDepth.disconnect();
      this.patternShaper.disconnect();
      this.toneFilter.disconnect();
      this.brightShelf.disconnect();
      this.outMix.disconnect();
    } catch (e) {}
  }
}

export default WalrusMonumentEffect;
