import BaseEffect from './BaseEffect';

class WalrusARP87Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Walrus ARP-87', 'walrusarp87');

    // WALRUS AUDIO ARP-87 (2018)
    // Multi-mode delay: analog, digital, lofi, slapback
    // Used by: ambient/worship guitarists

    this.modePresets = {
      'analog': {
        lpf: 3200, hpf: 100, modRate: 0.35, modDepth: 0.002,
        satAmount: 0.2, feedbackLPF: 3000, maxDelay: 0.8
      },
      'digital': {
        lpf: 12000, hpf: 40, modRate: 0.0, modDepth: 0.0,
        satAmount: 0.0, feedbackLPF: 10000, maxDelay: 1.2
      },
      'lofi': {
        lpf: 2000, hpf: 250, modRate: 1.5, modDepth: 0.005,
        satAmount: 0.45, feedbackLPF: 1600, maxDelay: 0.8
      },
      'slapback': {
        lpf: 5000, hpf: 80, modRate: 0.1, modDepth: 0.0005,
        satAmount: 0.1, feedbackLPF: 4500, maxDelay: 0.12
      }
    };
    this.currentMode = 'analog';

    // Primary delay line
    this.delay = audioContext.createDelay(1.5);
    this.delay.delayTime.value = 0.35;

    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.45;

    // Feedback LPF — darkening on repeats
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 3000;
    this.feedbackLPF.Q.value = 0.707;

    // Output tone (dampen control)
    this.dampenLPF = audioContext.createBiquadFilter();
    this.dampenLPF.type = 'lowpass';
    this.dampenLPF.frequency.value = 3200;
    this.dampenLPF.Q.value = 0.707;

    // HPF in feedback — prevent bass buildup (60Hz)
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker (10Hz HPF)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // LoFi bitcrusher effect — waveshaper for grit
    this.lofiShaper = audioContext.createWaveShaper();
    this.lofiShaper.oversample = '2x';
    this._setSaturation(0.2);

    // Modulation LFO
    this.modLFO = audioContext.createOscillator();
    this.modDepthGain = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.35;
    this.modDepthGain.gain.value = 0.002;
    this.modLFO.start();

    // Secondary subtle drift
    this.driftLFO = audioContext.createOscillator();
    this.driftGain = audioContext.createGain();
    this.driftLFO.type = 'triangle';
    this.driftLFO.frequency.value = 0.07;
    this.driftGain.gain.value = 0.0004;
    this.driftLFO.start();

    // Output HPF to tame mud
    this.outputHPF = audioContext.createBiquadFilter();
    this.outputHPF.type = 'highpass';
    this.outputHPF.frequency.value = 100;
    this.outputHPF.Q.value = 0.707;

    // Wet output
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // === SIGNAL CHAIN ===
    this.input.connect(this.delay);
    this.delay.connect(this.lofiShaper);
    this.lofiShaper.connect(this.dampenLPF);
    this.dampenLPF.connect(this.outputHPF);
    this.outputHPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback loop: dampenLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> delay
    this.dampenLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Modulation
    this.modLFO.connect(this.modDepthGain);
    this.modDepthGain.connect(this.delay.delayTime);
    this.driftLFO.connect(this.driftGain);
    this.driftGain.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this._applyMode(this.currentMode);
  }

  _setSaturation(amount) {
    const samples = 4096;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (amount <= 0) {
        curve[i] = x;
      } else {
        curve[i] = Math.tanh(x * (1 + amount * 4)) / Math.tanh(1 + amount * 4);
      }
    }
    this.lofiShaper.curve = curve;
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['analog'];

    this.dampenLPF.frequency.setTargetAtTime(preset.lpf, now, 0.02);
    this.outputHPF.frequency.setTargetAtTime(preset.hpf, now, 0.02);
    this.feedbackLPF.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
    this.modLFO.frequency.setTargetAtTime(preset.modRate, now, 0.02);
    this.modDepthGain.gain.setTargetAtTime(preset.modDepth, now, 0.02);
    this._setSaturation(preset.satAmount);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        {
          const preset = this.modePresets[this.currentMode];
          const maxDel = preset ? preset.maxDelay : 0.8;
          const t = 0.02 + (value / 100) * (maxDel - 0.02);
          this.delay.delayTime.setTargetAtTime(t, now, 0.01);
        }
        break;
      case 'repeats':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'dampen':
        {
          const f = 800 + (value / 100) * 13200;
          this.dampenLPF.frequency.setTargetAtTime(f, now, 0.01);
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
      this.feedbackGain.disconnect();
      this.feedbackLPF.disconnect();
      this.dampenLPF.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.lofiShaper.disconnect();
      this.outputHPF.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.driftLFO.stop();
      this.driftLFO.disconnect();
      this.driftGain.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default WalrusARP87Effect;
