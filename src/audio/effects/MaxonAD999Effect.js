import BaseEffect from './BaseEffect';

class MaxonAD999Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Maxon AD999', 'maxonad999');

    // MAXON AD999 (2004)
    // True analog delay, warm BBD character, up to 600ms
    // Used by: many blues/rock guitarists seeking true analog warmth

    // Primary delay line — max 600ms for analog BBD range
    this.delay = audioContext.createDelay(0.7);
    this.delay.delayTime.value = 0.35;

    // Feedback gain (repeat knob)
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;

    // BBD bucket-brigade emulation — cascaded lowpass stages
    this.bbdLPF1 = audioContext.createBiquadFilter();
    this.bbdLPF1.type = 'lowpass';
    this.bbdLPF1.frequency.value = 2800;
    this.bbdLPF1.Q.value = 0.707;

    this.bbdLPF2 = audioContext.createBiquadFilter();
    this.bbdLPF2.type = 'lowpass';
    this.bbdLPF2.frequency.value = 4200;
    this.bbdLPF2.Q.value = 0.5;

    this.bbdLPF3 = audioContext.createBiquadFilter();
    this.bbdLPF3.type = 'lowpass';
    this.bbdLPF3.frequency.value = 5500;
    this.bbdLPF3.Q.value = 0.5;

    // Mid-range warmth — peaking EQ
    this.midWarmth = audioContext.createBiquadFilter();
    this.midWarmth.type = 'peaking';
    this.midWarmth.frequency.value = 800;
    this.midWarmth.Q.value = 1.2;
    this.midWarmth.gain.value = 2.5;

    // Analog noise/character — subtle saturation
    this.analogSat = audioContext.createWaveShaper();
    this.analogSat.oversample = '4x';
    const samples = 4096;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
    }
    this.analogSat.curve = curve;

    // HPF in feedback (60Hz) — prevent bass buildup
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker (10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Clock noise (subtle) — BBD clock bleed
    this.clockNoiseLPF = audioContext.createBiquadFilter();
    this.clockNoiseLPF.type = 'lowpass';
    this.clockNoiseLPF.frequency.value = 12000;
    this.clockNoiseLPF.Q.value = 0.707;

    // Modulation — inherent BBD pitch wobble
    this.modLFO = audioContext.createOscillator();
    this.modDepthGain = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.4;
    this.modDepthGain.gain.value = 0.0015;
    this.modLFO.start();

    // Slow drift LFO
    this.driftLFO = audioContext.createOscillator();
    this.driftGain = audioContext.createGain();
    this.driftLFO.type = 'triangle';
    this.driftLFO.frequency.value = 0.06;
    this.driftGain.gain.value = 0.0005;
    this.driftLFO.start();

    // Blend (wet level)
    this.blendGain = audioContext.createGain();
    this.blendGain.gain.value = 0.5;

    // === SIGNAL CHAIN ===
    // Input -> delay -> analogSat -> bbdLPF1 -> bbdLPF2 -> bbdLPF3 -> midWarmth
    this.input.connect(this.delay);
    this.delay.connect(this.analogSat);
    this.analogSat.connect(this.bbdLPF1);
    this.bbdLPF1.connect(this.bbdLPF2);
    this.bbdLPF2.connect(this.bbdLPF3);
    this.bbdLPF3.connect(this.midWarmth);

    // Wet output: midWarmth -> blendGain -> dcBlocker -> wetGain -> output
    this.midWarmth.connect(this.blendGain);
    this.blendGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: midWarmth -> hpFeedback -> feedbackGain -> delay
    this.midWarmth.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Modulation -> delay time
    this.modLFO.connect(this.modDepthGain);
    this.modDepthGain.connect(this.delay.delayTime);
    this.driftLFO.connect(this.driftGain);
    this.driftGain.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'delay':
        // 0-100 -> 20ms to 600ms
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 0.58, now, 0.01);
        break;
      case 'repeat':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'blend':
        this.blendGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mod':
        // Modulation depth
        this.modDepthGain.gain.setTargetAtTime((value / 100) * 0.005, now, 0.01);
        this.driftGain.gain.setTargetAtTime((value / 100) * 0.002, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delay.disconnect();
      this.feedbackGain.disconnect();
      this.bbdLPF1.disconnect();
      this.bbdLPF2.disconnect();
      this.bbdLPF3.disconnect();
      this.midWarmth.disconnect();
      this.analogSat.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.clockNoiseLPF.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.driftLFO.stop();
      this.driftLFO.disconnect();
      this.driftGain.disconnect();
      this.blendGain.disconnect();
    } catch (e) {}
  }
}

export default MaxonAD999Effect;
