import BaseEffect from './BaseEffect';

class BossDD3Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss DD-3', 'bossdd3');

    // BOSS DD-3 (1986)
    // Classic digital delay, 12-bit warmth, max 800ms
    // Used by: The Edge, Johnny Marr, Andy Summers

    // Mode defines max delay time
    this.modeDelays = {
      '50ms': 0.05,
      '200ms': 0.2,
      '800ms': 0.8,
      'hold': 0.8
    };
    this.currentMode = '800ms';
    this.holdActive = false;

    // Primary delay line
    this.delay = audioContext.createDelay(1.0);
    this.delay.delayTime.value = 0.375;

    // Feedback gain
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.45;

    // 12-bit quantization emulation — LPF to remove aliasing artifacts
    this.quantLPF = audioContext.createBiquadFilter();
    this.quantLPF.type = 'lowpass';
    this.quantLPF.frequency.value = 6000;
    this.quantLPF.Q.value = 0.707;

    // Slight roll-off for that vintage digital character
    this.digitalLPF = audioContext.createBiquadFilter();
    this.digitalLPF.type = 'lowpass';
    this.digitalLPF.frequency.value = 8000;
    this.digitalLPF.Q.value = 0.5;

    // 12-bit character — subtle waveshaper for quantization noise
    this.bitReducer = audioContext.createWaveShaper();
    this.bitReducer.oversample = '2x';
    const steps = 4096; // 12-bit = 4096 levels
    const curve = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) {
      const x = (i / 65536) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    this.bitReducer.curve = curve;

    // HPF in feedback (60Hz) — prevent bass buildup
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // Feedback darkening LPF
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 7000;
    this.feedbackLPF.Q.value = 0.707;

    // DC blocker (10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Output level control (E.LEVEL knob)
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.6;

    // Output HPF to keep clarity
    this.outputHPF = audioContext.createBiquadFilter();
    this.outputHPF.type = 'highpass';
    this.outputHPF.frequency.value = 80;
    this.outputHPF.Q.value = 0.707;

    // === SIGNAL CHAIN ===
    // Input -> delay -> bitReducer -> quantLPF -> digitalLPF -> outputHPF
    this.input.connect(this.delay);
    this.delay.connect(this.bitReducer);
    this.bitReducer.connect(this.quantLPF);
    this.quantLPF.connect(this.digitalLPF);
    this.digitalLPF.connect(this.outputHPF);

    // Wet output: outputHPF -> levelGain -> dcBlocker -> wetGain -> output
    this.outputHPF.connect(this.levelGain);
    this.levelGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: digitalLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> delay
    this.digitalLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        {
          const maxDel = this.modeDelays[this.currentMode] || 0.8;
          const t = 0.01 + (value / 100) * (maxDel - 0.01);
          this.delay.delayTime.setTargetAtTime(t, now, 0.01);
        }
        break;
      case 'feedback':
        if (this.currentMode === 'hold') {
          // In hold mode, feedback is max
          this.feedbackGain.gain.setTargetAtTime(0.99, now, 0.01);
        } else {
          this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        }
        break;
      case 'level':
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mode':
        {
          this.currentMode = value;
          if (value === 'hold') {
            // Hold mode: max feedback, essentially infinite repeat
            this.feedbackGain.gain.setTargetAtTime(0.99, now, 0.01);
          }
          // Clamp delay time to new mode max
          const maxDel = this.modeDelays[value] || 0.8;
          if (this.delay.delayTime.value > maxDel) {
            this.delay.delayTime.setTargetAtTime(maxDel, now, 0.01);
          }
        }
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
      this.quantLPF.disconnect();
      this.digitalLPF.disconnect();
      this.bitReducer.disconnect();
      this.hpFeedback.disconnect();
      this.feedbackLPF.disconnect();
      this.dcBlocker.disconnect();
      this.levelGain.disconnect();
      this.outputHPF.disconnect();
    } catch (e) {}
  }
}

export default BossDD3Effect;
