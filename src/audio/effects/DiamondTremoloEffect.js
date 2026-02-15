import BaseEffect from './BaseEffect';

/**
 * DiamondTremoloEffect - Diamond Tremolo
 * 
 * Harmonic tremolo that splits signal into bass and treble bands
 * and modulates each alternately for a unique pulsing effect.
 * 
 * Features:
 * - Standard tremolo (amplitude modulation)
 * - Harmonic tremolo (bass/treble split with alternating modulation)
 * - Swell mode (volume swell with envelope)
 * - Chop mode (hard square-wave tremolo)
 * - Shape control transitions between modes
 */

class DiamondTremoloEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Diamond Tremolo', 'diamondtremolo');

    // Crossover filters for harmonic tremolo
    this.lowCross = audioContext.createBiquadFilter();
    this.lowCross.type = 'lowpass';
    this.lowCross.frequency.value = 800;
    this.lowCross.Q.value = 0.5;

    this.highCross = audioContext.createBiquadFilter();
    this.highCross.type = 'highpass';
    this.highCross.frequency.value = 800;
    this.highCross.Q.value = 0.5;

    // Gain nodes for amplitude modulation
    this.lowAmpGain = audioContext.createGain();
    this.lowAmpGain.gain.value = 1.0;
    this.highAmpGain = audioContext.createGain();
    this.highAmpGain.gain.value = 1.0;

    // Standard tremolo gain (for non-harmonic mode)
    this.standardGain = audioContext.createGain();
    this.standardGain.gain.value = 1.0;

    // LFO for tremolo
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 4.0;

    // LFO depth for low band
    this.lfoDepthLow = audioContext.createGain();
    this.lfoDepthLow.gain.value = 0.0;

    // LFO depth for high band (inverted for alternating effect)
    this.lfoDepthHigh = audioContext.createGain();
    this.lfoDepthHigh.gain.value = 0.0;

    // LFO depth for standard tremolo
    this.lfoDepthStd = audioContext.createGain();
    this.lfoDepthStd.gain.value = 0.4;

    // Waveshaper for chop mode (turns sine into square)
    this.chopShaper = audioContext.createWaveShaper();
    this.chopShaper.curve = this._makeChopCurve();

    // Chop gain (mixed in for chop mode)
    this.chopGain = audioContext.createGain();
    this.chopGain.gain.value = 0.0;

    // Swell envelope follower (simulated with compressor)
    this.swellCompressor = audioContext.createDynamicsCompressor();
    this.swellCompressor.threshold.value = -30;
    this.swellCompressor.ratio.value = 4;
    this.swellCompressor.attack.value = 0.3;
    this.swellCompressor.release.value = 0.1;

    this.swellGain = audioContext.createGain();
    this.swellGain.gain.value = 0.0;

    // Tone shaping
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 12000;
    this.toneFilter.Q.value = 0.5;

    // Output mix
    this.outMix = audioContext.createGain();
    this.outMix.gain.value = 1.0;

    // LFO routing
    this.lfo.connect(this.lfoDepthLow);
    this.lfo.connect(this.lfoDepthHigh);
    this.lfo.connect(this.lfoDepthStd);
    this.lfo.connect(this.chopShaper);
    this.chopShaper.connect(this.chopGain);

    // AM modulation: LFO -> gain of amplitude nodes
    this.lfoDepthLow.connect(this.lowAmpGain.gain);
    this.lfoDepthHigh.connect(this.highAmpGain.gain);
    this.lfoDepthStd.connect(this.standardGain.gain);
    this.chopGain.connect(this.standardGain.gain);

    this.lfo.start();

    // Harmonic tremolo path: input -> crossover -> amp mod -> outMix
    this.input.connect(this.lowCross);
    this.input.connect(this.highCross);
    this.lowCross.connect(this.lowAmpGain);
    this.highCross.connect(this.highAmpGain);
    this.lowAmpGain.connect(this.outMix);
    this.highAmpGain.connect(this.outMix);

    // Standard tremolo path
    this.input.connect(this.standardGain);
    this.standardGain.connect(this.outMix);

    // Swell path
    this.input.connect(this.swellCompressor);
    this.swellCompressor.connect(this.swellGain);
    this.swellGain.connect(this.outMix);

    this.outMix.connect(this.toneFilter);
    this.toneFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default to chop mode
    this.shape = 'chop';
    this._applyShape(audioContext.currentTime);
  }

  _makeChopCurve() {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      curve[i] = i < samples / 2 ? -1.0 : 1.0;
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
        break;

      case 'depth':
        // 0 to 0.5 (modulation depth)
        const depth = (value / 100) * 0.5;
        if (this.shape === 'harmonic') {
          this.lfoDepthLow.gain.setTargetAtTime(depth, now, 0.01);
          this.lfoDepthHigh.gain.setTargetAtTime(-depth, now, 0.01);
        } else if (this.shape === 'chop') {
          this.chopGain.gain.setTargetAtTime(depth, now, 0.01);
        } else {
          this.lfoDepthStd.gain.setTargetAtTime(depth, now, 0.01);
        }
        break;

      case 'shape':
        this.shape = value;
        this._applyShape(now);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  _applyShape(now) {
    // Mute all paths first
    this.lfoDepthLow.gain.setTargetAtTime(0, now, 0.01);
    this.lfoDepthHigh.gain.setTargetAtTime(0, now, 0.01);
    this.lfoDepthStd.gain.setTargetAtTime(0, now, 0.01);
    this.chopGain.gain.setTargetAtTime(0, now, 0.01);
    this.swellGain.gain.setTargetAtTime(0, now, 0.01);
    this.standardGain.gain.setTargetAtTime(0, now, 0.01);
    this.lowAmpGain.gain.setTargetAtTime(0, now, 0.01);
    this.highAmpGain.gain.setTargetAtTime(0, now, 0.01);

    switch (this.shape) {
      case 'chop':
        this.standardGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.chopGain.gain.setTargetAtTime(0.4, now + 0.02, 0.01);
        break;

      case 'harmonic':
        this.lowAmpGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.highAmpGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.lfoDepthLow.gain.setTargetAtTime(0.4, now + 0.02, 0.01);
        this.lfoDepthHigh.gain.setTargetAtTime(-0.4, now + 0.02, 0.01);
        break;

      case 'swell':
        this.swellGain.gain.setTargetAtTime(1.0, now + 0.02, 0.01);
        this.standardGain.gain.setTargetAtTime(0.6, now + 0.02, 0.01);
        this.lfoDepthStd.gain.setTargetAtTime(0.3, now + 0.02, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.lowCross.disconnect();
      this.highCross.disconnect();
      this.lowAmpGain.disconnect();
      this.highAmpGain.disconnect();
      this.standardGain.disconnect();
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepthLow.disconnect();
      this.lfoDepthHigh.disconnect();
      this.lfoDepthStd.disconnect();
      this.chopShaper.disconnect();
      this.chopGain.disconnect();
      this.swellCompressor.disconnect();
      this.swellGain.disconnect();
      this.toneFilter.disconnect();
      this.outMix.disconnect();
    } catch (e) {}
  }
}

export default DiamondTremoloEffect;
