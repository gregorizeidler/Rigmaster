import BaseEffect from './BaseEffect';

class BossDD7Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss DD-7', 'bossdd7');

    // BOSS DD-7 (2008)
    // Modern digital delay, up to 6.4s, multiple modes
    // Used by: many touring guitarists

    this.modePresets = {
      'analog': {
        maxDelay: 1.2, lpf: 3500, modRate: 0.3, modDepth: 0.002,
        feedbackLPF: 3000, reverse: false
      },
      'mod': {
        maxDelay: 2.0, lpf: 8000, modRate: 1.5, modDepth: 0.004,
        feedbackLPF: 7000, reverse: false
      },
      'reverse': {
        maxDelay: 1.0, lpf: 6000, modRate: 0.0, modDepth: 0.0,
        feedbackLPF: 5500, reverse: true
      },
      'hold': {
        maxDelay: 6.4, lpf: 10000, modRate: 0.0, modDepth: 0.0,
        feedbackLPF: 9000, reverse: false
      }
    };
    this.currentMode = 'analog';

    // Primary delay line — up to 6.4s
    this.delay = audioContext.createDelay(7.0);
    this.delay.delayTime.value = 0.5;

    // Second delay line for reverse emulation
    this.reverseDelay = audioContext.createDelay(2.0);
    this.reverseDelay.delayTime.value = 0.5;

    // Feedback gain
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.45;

    // Feedback LPF
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 3000;
    this.feedbackLPF.Q.value = 0.707;

    // Tone control (output)
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 3500;
    this.toneLPF.Q.value = 0.707;

    // Analog warmth filter
    this.warmthLPF = audioContext.createBiquadFilter();
    this.warmthLPF.type = 'lowpass';
    this.warmthLPF.frequency.value = 5000;
    this.warmthLPF.Q.value = 0.5;

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

    // Modulation
    this.modLFO = audioContext.createOscillator();
    this.modDepthGain = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.3;
    this.modDepthGain.gain.value = 0.002;
    this.modLFO.start();

    // Tri LFO for mod mode (chorus-like)
    this.modLFO2 = audioContext.createOscillator();
    this.modDepthGain2 = audioContext.createGain();
    this.modLFO2.type = 'triangle';
    this.modLFO2.frequency.value = 0.8;
    this.modDepthGain2.gain.value = 0.0;
    this.modLFO2.start();

    // Reverse effect: phase-inverted crossfade
    this.reverseGain = audioContext.createGain();
    this.reverseGain.gain.value = 0.0;
    this.normalGain = audioContext.createGain();
    this.normalGain.gain.value = 1.0;

    // Level
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.6;

    // === SIGNAL CHAIN ===
    // Normal path: input -> delay -> toneLPF -> warmthLPF -> normalGain
    this.input.connect(this.delay);
    this.delay.connect(this.toneLPF);
    this.toneLPF.connect(this.warmthLPF);
    this.warmthLPF.connect(this.normalGain);

    // Reverse emulation path: input -> reverseDelay -> reverseGain
    this.input.connect(this.reverseDelay);
    this.reverseDelay.connect(this.reverseGain);

    // Mix normal and reverse
    this.normalGain.connect(this.levelGain);
    this.reverseGain.connect(this.levelGain);

    // Output: levelGain -> dcBlocker -> wetGain -> output
    this.levelGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: warmthLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> delay
    this.warmthLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
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

    this._applyMode(this.currentMode);
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['analog'];

    this.toneLPF.frequency.setTargetAtTime(preset.lpf, now, 0.02);
    this.feedbackLPF.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
    this.modLFO.frequency.setTargetAtTime(preset.modRate, now, 0.02);
    this.modDepthGain.gain.setTargetAtTime(preset.modDepth, now, 0.02);

    // Mod mode gets extra chorus LFO
    if (mode === 'mod') {
      this.modDepthGain2.gain.setTargetAtTime(0.003, now, 0.02);
    } else {
      this.modDepthGain2.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // Reverse mode crossfade
    if (preset.reverse) {
      this.normalGain.gain.setTargetAtTime(0.3, now, 0.02);
      this.reverseGain.gain.setTargetAtTime(0.8, now, 0.02);
    } else {
      this.normalGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.reverseGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // Hold mode
    if (mode === 'hold') {
      this.feedbackGain.gain.setTargetAtTime(0.99, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        {
          const preset = this.modePresets[this.currentMode];
          const maxDel = preset ? preset.maxDelay : 1.2;
          const t = 0.02 + (value / 100) * (maxDel - 0.02);
          this.delay.delayTime.setTargetAtTime(t, now, 0.01);
          if (this.currentMode === 'reverse') {
            this.reverseDelay.delayTime.setTargetAtTime(t, now, 0.01);
          }
        }
        break;
      case 'feedback':
        if (this.currentMode !== 'hold') {
          this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        }
        break;
      case 'level':
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tone':
        {
          const f = 1000 + (value / 100) * 13000;
          this.toneLPF.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'mode':
        this.currentMode = value;
        this._applyMode(value);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delay.disconnect();
      this.reverseDelay.disconnect();
      this.feedbackGain.disconnect();
      this.feedbackLPF.disconnect();
      this.toneLPF.disconnect();
      this.warmthLPF.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepthGain2.disconnect();
      this.normalGain.disconnect();
      this.reverseGain.disconnect();
      this.levelGain.disconnect();
    } catch (e) {}
  }
}

export default BossDD7Effect;
