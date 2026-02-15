import BaseEffect from './BaseEffect';

/**
 * TCVortexFlangerEffect - TC Electronic Vortex Flanger
 * 
 * Modern flanger with multiple modes: classic flanger, tape, and through-zero.
 * TonePrint-compatible digital flanger with analog warmth.
 * 
 * Features:
 * - Three distinct modes: flanger, tape, through-zero
 * - Variable feedback from subtle to self-oscillation
 * - Speed and depth controls
 * - Tape mode simulates tape-based flanging artifacts
 */

class TCVortexFlangerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Vortex Flanger', 'tcvortexflanger');

    // Primary delay line for flanging
    this.flangeDelay = audioContext.createDelay(0.02);
    this.flangeDelay.delayTime.value = 0.003;

    // Secondary delay for through-zero mode
    this.tzDelay = audioContext.createDelay(0.02);
    this.tzDelay.delayTime.value = 0.003;

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.3;

    // LFO depth controls
    this.lfoDepth = audioContext.createGain();
    this.lfoDepth.gain.value = 0.002;

    // Inverted LFO depth for through-zero
    this.lfoDepthInv = audioContext.createGain();
    this.lfoDepthInv.gain.value = 0.0;

    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;

    // Tape saturation waveshaper
    this.tapeShaper = audioContext.createWaveShaper();
    this.tapeShaper.curve = this._makeTapeCurve(400);
    this.tapeShaper.oversample = '2x';

    // Tape saturation gain (off by default)
    this.tapeSatGain = audioContext.createGain();
    this.tapeSatGain.gain.value = 0.0;

    // Clean feedback path gain
    this.cleanFBGain = audioContext.createGain();
    this.cleanFBGain.gain.value = 1.0;

    // Tone filter
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 7000;
    this.toneFilter.Q.value = 0.7;

    // Wow/flutter for tape mode
    this.wowLfo = audioContext.createOscillator();
    this.wowLfo.type = 'sine';
    this.wowLfo.frequency.value = 0.7;
    this.wowDepth = audioContext.createGain();
    this.wowDepth.gain.value = 0.0;

    // Through-zero mix node
    this.tzGain = audioContext.createGain();
    this.tzGain.gain.value = 0.0;

    // Flange output
    this.flangeOutGain = audioContext.createGain();
    this.flangeOutGain.gain.value = 0.7;

    // LFO routing
    this.lfo.connect(this.lfoDepth);
    this.lfo.connect(this.lfoDepthInv);
    this.lfoDepth.connect(this.flangeDelay.delayTime);
    this.lfoDepthInv.connect(this.tzDelay.delayTime);

    // Wow/flutter modulation
    this.wowLfo.connect(this.wowDepth);
    this.wowDepth.connect(this.flangeDelay.delayTime);

    // Start oscillators
    this.lfo.start();
    this.wowLfo.start();

    // Main flange path: input -> flangeDelay -> toneFilter -> flangeOutGain -> wetGain
    this.input.connect(this.flangeDelay);
    this.flangeDelay.connect(this.toneFilter);
    this.toneFilter.connect(this.flangeOutGain);
    this.flangeOutGain.connect(this.wetGain);

    // Through-zero path: input -> tzDelay -> tzGain -> wetGain
    this.input.connect(this.tzDelay);
    this.tzDelay.connect(this.tzGain);
    this.tzGain.connect(this.wetGain);

    // Feedback: flangeDelay -> clean/tape paths -> flangeDelay
    this.flangeDelay.connect(this.cleanFBGain);
    this.cleanFBGain.connect(this.feedbackGain);
    this.flangeDelay.connect(this.tapeShaper);
    this.tapeShaper.connect(this.tapeSatGain);
    this.tapeSatGain.connect(this.feedbackGain);
    this.feedbackGain.connect(this.flangeDelay);

    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.mode = 'flanger';
  }

  _makeTapeCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 0.02 to 8 Hz
        const speed = 0.02 + (value / 100) * 7.98;
        this.lfo.frequency.setTargetAtTime(speed, now, 0.01);
        break;

      case 'depth':
        // 0 to 5ms modulation
        const depth = (value / 100) * 0.005;
        this.lfoDepth.gain.setTargetAtTime(depth, now, 0.01);
        if (this.mode === 'through-zero') {
          this.lfoDepthInv.gain.setTargetAtTime(-depth * 0.8, now, 0.01);
        }
        break;

      case 'feedback':
        // 0 to 0.92
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.92, now, 0.01);
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
    switch (this.mode) {
      case 'flanger':
        this.flangeOutGain.gain.setTargetAtTime(0.7, now, 0.02);
        this.tzGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.tapeSatGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.cleanFBGain.gain.setTargetAtTime(1.0, now, 0.02);
        this.wowDepth.gain.setTargetAtTime(0.0, now, 0.02);
        this.lfoDepthInv.gain.setTargetAtTime(0.0, now, 0.02);
        this.lfo.type = 'sine';
        break;

      case 'tape':
        this.flangeOutGain.gain.setTargetAtTime(0.6, now, 0.02);
        this.tzGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.tapeSatGain.gain.setTargetAtTime(0.6, now, 0.02);
        this.cleanFBGain.gain.setTargetAtTime(0.4, now, 0.02);
        this.wowDepth.gain.setTargetAtTime(0.0004, now, 0.02);
        this.lfoDepthInv.gain.setTargetAtTime(0.0, now, 0.02);
        this.lfo.type = 'triangle';
        break;

      case 'through-zero':
        this.flangeOutGain.gain.setTargetAtTime(0.5, now, 0.02);
        this.tzGain.gain.setTargetAtTime(0.5, now, 0.02);
        this.tapeSatGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.cleanFBGain.gain.setTargetAtTime(1.0, now, 0.02);
        this.wowDepth.gain.setTargetAtTime(0.0, now, 0.02);
        this.lfoDepthInv.gain.setTargetAtTime(-0.0015, now, 0.02);
        this.lfo.type = 'sine';
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.flangeDelay.disconnect();
      this.tzDelay.disconnect();
      this.lfo.stop();
      this.wowLfo.stop();
      this.lfo.disconnect();
      this.wowLfo.disconnect();
      this.lfoDepth.disconnect();
      this.lfoDepthInv.disconnect();
      this.wowDepth.disconnect();
      this.feedbackGain.disconnect();
      this.tapeShaper.disconnect();
      this.tapeSatGain.disconnect();
      this.cleanFBGain.disconnect();
      this.toneFilter.disconnect();
      this.tzGain.disconnect();
      this.flangeOutGain.disconnect();
    } catch (e) {}
  }
}

export default TCVortexFlangerEffect;
