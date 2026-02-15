import BaseEffect from './BaseEffect';

/**
 * StrymonOlaEffect - Strymon Ola Chorus/Vibrato
 * 
 * High-end digital chorus with multiple LFO waveforms.
 * Known for pristine, studio-quality modulation.
 * 
 * Features:
 * - Multiple waveform shapes: sine, triangle, square, random (S&H)
 * - Dual delay lines for rich stereo chorus
 * - Adjustable rate, depth, and mix
 * - Vibrato mode (wet only) vs chorus mode (dry+wet)
 */

class StrymonOlaEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Strymon Ola', 'strymonola');

    // Dual delay lines for stereo richness
    this.delayA = audioContext.createDelay(0.1);
    this.delayB = audioContext.createDelay(0.1);
    this.delayA.delayTime.value = 0.006;
    this.delayB.delayTime.value = 0.009;

    // Primary LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.6;

    // LFO depth controls
    this.lfoDepthA = audioContext.createGain();
    this.lfoDepthB = audioContext.createGain();
    this.lfoDepthA.gain.value = 0.0025;
    this.lfoDepthB.gain.value = 0.003;

    // Secondary LFO for random/sample-and-hold simulation
    this.lfoRandom = audioContext.createOscillator();
    this.lfoRandom.type = 'sawtooth';
    this.lfoRandom.frequency.value = 0.6;
    this.lfoRandomDepth = audioContext.createGain();
    this.lfoRandomDepth.gain.value = 0.0;

    // Waveshaper for square-ish LFO from sine
    this.squareShaper = audioContext.createWaveShaper();
    this.squareShaper.curve = this._makeSquareCurve();
    this.squareShaperGain = audioContext.createGain();
    this.squareShaperGain.gain.value = 0.0;

    // Voice gain nodes
    this.voiceA = audioContext.createGain();
    this.voiceB = audioContext.createGain();
    this.voiceA.gain.value = 0.5;
    this.voiceB.gain.value = 0.5;

    // Tone shaping — gentle high-cut for warmth
    this.toneLP = audioContext.createBiquadFilter();
    this.toneLP.type = 'lowpass';
    this.toneLP.frequency.value = 12000;
    this.toneLP.Q.value = 0.5;

    // Anti-aliasing filter on wet path
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 15000;
    this.antiAlias.Q.value = 0.707;

    // LFO routing
    this.lfo.connect(this.lfoDepthA);
    this.lfo.connect(this.lfoDepthB);
    this.lfoDepthA.connect(this.delayA.delayTime);
    this.lfoDepthB.connect(this.delayB.delayTime);

    // Square shaper path (adds when square mode active)
    this.lfo.connect(this.squareShaper);
    this.squareShaper.connect(this.squareShaperGain);
    this.squareShaperGain.connect(this.delayA.delayTime);
    this.squareShaperGain.connect(this.delayB.delayTime);

    // Random LFO path
    this.lfoRandom.connect(this.lfoRandomDepth);
    this.lfoRandomDepth.connect(this.delayA.delayTime);
    this.lfoRandomDepth.connect(this.delayB.delayTime);

    // Start oscillators
    this.lfo.start();
    this.lfoRandom.start();

    // Signal chain: input -> delays -> voices -> tone -> antiAlias -> wetGain
    this.input.connect(this.delayA);
    this.input.connect(this.delayB);

    this.delayA.connect(this.voiceA);
    this.delayB.connect(this.voiceB);

    this.voiceA.connect(this.toneLP);
    this.voiceB.connect(this.toneLP);

    this.toneLP.connect(this.antiAlias);
    this.antiAlias.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.waveform = 'sine';
  }

  _makeSquareCurve() {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      curve[i] = i < samples / 2 ? -1 : 1;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.05 to 8 Hz
        const rate = 0.05 + (value / 100) * 7.95;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        this.lfoRandom.frequency.setTargetAtTime(rate * 1.37, now, 0.01);
        break;

      case 'depth':
        // 0 to 6ms
        const depth = (value / 100) * 0.006;
        this.lfoDepthA.gain.setTargetAtTime(depth, now, 0.01);
        this.lfoDepthB.gain.setTargetAtTime(depth * 1.2, now, 0.01);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'waveform':
        this.waveform = value;
        this._applyWaveform(now);
        break;

      default:
        break;
    }
  }

  _applyWaveform(now) {
    // Reset all modulation paths
    this.lfoDepthA.gain.setTargetAtTime(0, now, 0.005);
    this.lfoDepthB.gain.setTargetAtTime(0, now, 0.005);
    this.squareShaperGain.gain.setTargetAtTime(0, now, 0.005);
    this.lfoRandomDepth.gain.setTargetAtTime(0, now, 0.005);

    const baseDepth = 0.0025;
    switch (this.waveform) {
      case 'sine':
        this.lfo.type = 'sine';
        this.lfoDepthA.gain.setTargetAtTime(baseDepth, now + 0.01, 0.01);
        this.lfoDepthB.gain.setTargetAtTime(baseDepth * 1.2, now + 0.01, 0.01);
        break;

      case 'tri':
        this.lfo.type = 'triangle';
        this.lfoDepthA.gain.setTargetAtTime(baseDepth, now + 0.01, 0.01);
        this.lfoDepthB.gain.setTargetAtTime(baseDepth * 1.2, now + 0.01, 0.01);
        break;

      case 'square':
        this.lfo.type = 'sine';
        this.squareShaperGain.gain.setTargetAtTime(baseDepth * 0.8, now + 0.01, 0.01);
        break;

      case 'random':
        this.lfoRandomDepth.gain.setTargetAtTime(baseDepth * 1.5, now + 0.01, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delayA.disconnect();
      this.delayB.disconnect();
      this.lfo.stop();
      this.lfoRandom.stop();
      this.lfo.disconnect();
      this.lfoRandom.disconnect();
      this.lfoDepthA.disconnect();
      this.lfoDepthB.disconnect();
      this.lfoRandomDepth.disconnect();
      this.squareShaper.disconnect();
      this.squareShaperGain.disconnect();
      this.voiceA.disconnect();
      this.voiceB.disconnect();
      this.toneLP.disconnect();
      this.antiAlias.disconnect();
    } catch (e) {}
  }
}

export default StrymonOlaEffect;
