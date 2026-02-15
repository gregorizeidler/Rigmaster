import BaseEffect from './BaseEffect';

class WayHugeSupaPussEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Way Huge Supa-Puss', 'wayhugesupapuss');

    // WAY HUGE SUPA-PUSS (2009)
    // Analog delay with tap tempo feel, modulated repeats
    // Used by: Joe Bonamassa, Billy Gibbons

    // Primary delay line — up to 900ms for tap-tempo range
    this.delay = audioContext.createDelay(1.0);
    this.delay.delayTime.value = 0.4;

    // Feedback gain
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;

    // Analog bucket-brigade emulation — cascaded LPFs
    this.bbdLPF1 = audioContext.createBiquadFilter();
    this.bbdLPF1.type = 'lowpass';
    this.bbdLPF1.frequency.value = 3000;
    this.bbdLPF1.Q.value = 0.707;

    this.bbdLPF2 = audioContext.createBiquadFilter();
    this.bbdLPF2.type = 'lowpass';
    this.bbdLPF2.frequency.value = 4500;
    this.bbdLPF2.Q.value = 0.5;

    // Tone control — output LPF
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 5000;
    this.toneLPF.Q.value = 0.707;

    // Mid-bump for analog character
    this.midPeak = audioContext.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1200;
    this.midPeak.Q.value = 1.5;
    this.midPeak.gain.value = 3;

    // HPF in feedback (60Hz) — prevent bass buildup
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker (10Hz) after feedback path
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Modulation LFO — primary (chorus on repeats)
    this.modLFO = audioContext.createOscillator();
    this.modDepthGain = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 1.2;
    this.modDepthGain.gain.value = 0.002;
    this.modLFO.start();

    // Secondary modulation — slower drift
    this.modLFO2 = audioContext.createOscillator();
    this.modDepthGain2 = audioContext.createGain();
    this.modLFO2.type = 'triangle';
    this.modLFO2.frequency.value = 0.18;
    this.modDepthGain2.gain.value = 0.0008;
    this.modLFO2.start();

    // Subtle saturation on repeats
    this.saturation = audioContext.createWaveShaper();
    this.saturation.oversample = '2x';
    const samples = 4096;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8);
    }
    this.saturation.curve = curve;

    // Wet output
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // === SIGNAL CHAIN ===
    // Input -> delay -> bbdLPF1 -> bbdLPF2 -> midPeak -> saturation -> toneLPF
    this.input.connect(this.delay);
    this.delay.connect(this.bbdLPF1);
    this.bbdLPF1.connect(this.bbdLPF2);
    this.bbdLPF2.connect(this.midPeak);
    this.midPeak.connect(this.saturation);
    this.saturation.connect(this.toneLPF);

    // Wet output path
    this.toneLPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: toneLPF -> hpFeedback -> feedbackGain -> delay
    this.toneLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Modulation
    this.modLFO.connect(this.modDepthGain);
    this.modDepthGain.connect(this.delay.delayTime);
    this.modLFO2.connect(this.modDepthGain2);
    this.modDepthGain2.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'delay':
        // 0-100 -> 20ms to 900ms
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 0.88, now, 0.01);
        break;
      case 'repeats':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tone':
        {
          const f = 1000 + (value / 100) * 9000;
          this.toneLPF.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'mod_speed':
        this.modLFO.frequency.setTargetAtTime(0.1 + (value / 100) * 5.9, now, 0.01);
        break;
      case 'mod_depth':
        this.modDepthGain.gain.setTargetAtTime((value / 100) * 0.008, now, 0.01);
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
      this.toneLPF.disconnect();
      this.midPeak.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.saturation.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepthGain2.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default WayHugeSupaPussEffect;
