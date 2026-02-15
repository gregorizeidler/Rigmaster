import BaseEffect from './BaseEffect';

class TCFlashbackEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Flashback', 'tcflashback');

    // TC ELECTRONIC FLASHBACK (2011)
    // Multi-mode delay: tape, analog, crystal, lofi, 2290
    // Used by: many worship/ambient guitarists

    // Mode presets define character per mode
    this.modePresets = {
      'tape': {
        maxDelay: 1.2, lpf: 3200, hpf: 120, saturation: 0.3,
        modRate: 0.6, modDepth: 0.003, feedbackLPF: 2800
      },
      'analog': {
        maxDelay: 0.8, lpf: 4000, hpf: 80, saturation: 0.15,
        modRate: 0.25, modDepth: 0.0015, feedbackLPF: 3500
      },
      'crystal': {
        maxDelay: 2.0, lpf: 14000, hpf: 40, saturation: 0.0,
        modRate: 0.1, modDepth: 0.0005, feedbackLPF: 12000
      },
      'lofi': {
        maxDelay: 1.0, lpf: 2200, hpf: 200, saturation: 0.5,
        modRate: 1.2, modDepth: 0.004, feedbackLPF: 1800
      },
      '2290': {
        maxDelay: 2.5, lpf: 8000, hpf: 60, saturation: 0.05,
        modRate: 0.15, modDepth: 0.001, feedbackLPF: 7000
      }
    };
    this.currentMode = 'tape';

    // Primary delay line
    this.delay = audioContext.createDelay(3.0);
    this.delay.delayTime.value = 0.375;

    // Feedback gain
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.45;

    // Feedback LPF — analog-style darkening in the loop
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 2800;
    this.feedbackLPF.Q.value = 0.707;

    // Secondary LPF for output tone shaping
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 3200;
    this.toneLPF.Q.value = 0.707;

    // HPF in feedback to prevent bass buildup (60Hz)
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker (10Hz HPF) after feedback path
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Tape saturation waveshaper
    this.saturation = audioContext.createWaveShaper();
    this.saturation.oversample = '4x';
    this._setSaturationAmount(0.3);

    // Modulation LFO for wow/flutter
    this.modLFO = audioContext.createOscillator();
    this.modDepth = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.6;
    this.modDepth.gain.value = 0.003;
    this.modLFO.start();

    // Secondary LFO for complex modulation
    this.modLFO2 = audioContext.createOscillator();
    this.modDepth2 = audioContext.createGain();
    this.modLFO2.type = 'triangle';
    this.modLFO2.frequency.value = 0.23;
    this.modDepth2.gain.value = 0.001;
    this.modLFO2.start();

    // Wet output level
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // === SIGNAL CHAIN ===
    // Input -> delay -> saturation -> toneLPF -> wetLevel -> dcBlocker -> wetGain
    this.input.connect(this.delay);
    this.delay.connect(this.saturation);
    this.saturation.connect(this.toneLPF);
    this.toneLPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: toneLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> delay
    this.toneLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Modulation -> delay time
    this.modLFO.connect(this.modDepth);
    this.modDepth.connect(this.delay.delayTime);
    this.modLFO2.connect(this.modDepth2);
    this.modDepth2.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial mode
    this._applyMode(this.currentMode);
  }

  _setSaturationAmount(amount) {
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (amount <= 0) {
        curve[i] = x;
      } else {
        curve[i] = Math.tanh(x * (1 + amount * 3)) / Math.tanh(1 + amount * 3);
      }
    }
    this.saturation.curve = curve;
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['tape'];

    this.toneLPF.frequency.setTargetAtTime(preset.lpf, now, 0.02);
    this.hpFeedback.frequency.setTargetAtTime(preset.hpf, now, 0.02);
    this.feedbackLPF.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
    this.modLFO.frequency.setTargetAtTime(preset.modRate, now, 0.02);
    this.modDepth.gain.setTargetAtTime(preset.modDepth, now, 0.02);
    this._setSaturationAmount(preset.saturation);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        // 0-100 -> 0.02s to mode max delay
        {
          const preset = this.modePresets[this.currentMode];
          const maxDel = preset ? preset.maxDelay : 1.2;
          const t = 0.02 + (value / 100) * (maxDel - 0.02);
          this.delay.delayTime.setTargetAtTime(t, now, 0.01);
        }
        break;
      case 'feedback':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mode':
        this.currentMode = value;
        this._applyMode(value);
        break;
      case 'tone':
        {
          const f = 800 + (value / 100) * 13200;
          this.toneLPF.frequency.setTargetAtTime(f, now, 0.01);
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
      this.feedbackLPF.disconnect();
      this.toneLPF.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.saturation.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepth.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepth2.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default TCFlashbackEffect;
