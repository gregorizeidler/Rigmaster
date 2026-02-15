import BaseEffect from './BaseEffect';

class EHXCathedralEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Cathedral', 'ehxcathedral');

    // ELECTRO-HARMONIX CATHEDRAL (2008)
    // Stereo reverb with infinite hold
    // Used by: ambient/experimental guitarists

    this.modePresets = {
      'hall': {
        combFeedback: 0.88, dampingFreq: 5000, preDelay: 0.03,
        allpassCoeff: 0.72, combScale: 1.2, lpfFreq: 7000
      },
      'room': {
        combFeedback: 0.75, dampingFreq: 6000, preDelay: 0.01,
        allpassCoeff: 0.65, combScale: 0.6, lpfFreq: 8000
      },
      'spring': {
        combFeedback: 0.76, dampingFreq: 3500, preDelay: 0.008,
        allpassCoeff: 0.68, combScale: 0.7, lpfFreq: 5500
      },
      'accu': {
        combFeedback: 0.92, dampingFreq: 4500, preDelay: 0.04,
        allpassCoeff: 0.75, combScale: 1.5, lpfFreq: 6500
      },
      'grail': {
        combFeedback: 0.85, dampingFreq: 7000, preDelay: 0.02,
        allpassCoeff: 0.7, combScale: 1.0, lpfFreq: 8000
      },
      'reverse': {
        combFeedback: 0.80, dampingFreq: 4000, preDelay: 0.05,
        allpassCoeff: 0.6, combScale: 0.8, lpfFreq: 5000
      },
      'echo': {
        combFeedback: 0.70, dampingFreq: 5500, preDelay: 0.06,
        allpassCoeff: 0.65, combScale: 1.8, lpfFreq: 7000
      }
    };
    this.currentMode = 'hall';
    this.infiniteHold = false;

    // Pre-delay (up to 250ms)
    this.preDelay = audioContext.createDelay(0.3);
    this.preDelay.delayTime.value = 0.03;

    // 6 parallel comb filters
    this.baseCombDelayTimes = [0.0253, 0.0297, 0.0347, 0.0371, 0.0421, 0.0467];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.88;
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 5000;
      damping.Q.value = 0.707;
      const combOut = audioContext.createGain();
      combOut.gain.value = 1 / 6;

      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combOut);
    }

    this.combMixer = audioContext.createGain();

    // 4 allpass filters for diffusion
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    this.allpassFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const apDelay = audioContext.createDelay(0.05);
      apDelay.delayTime.value = this.allpassDelayTimes[i];
      const fbGain = audioContext.createGain();
      fbGain.gain.value = 0.72;
      const ffGain = audioContext.createGain();
      ffGain.gain.value = -0.72;

      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      apInput.connect(apDelay);
      apDelay.connect(apOutput);
      apDelay.connect(fbGain);
      fbGain.connect(apInput);

      this.allpassFilters.push({ input: apInput, output: apOutput, delay: apDelay, fbGain, ffGain });
    }

    // Spring resonance (peaking EQ — active for spring mode)
    this.springResonance = audioContext.createBiquadFilter();
    this.springResonance.type = 'peaking';
    this.springResonance.frequency.value = 2500;
    this.springResonance.Q.value = 2;
    this.springResonance.gain.value = 0;

    // Damping control (feedback path)
    this.dampFilter = audioContext.createBiquadFilter();
    this.dampFilter.type = 'lowpass';
    this.dampFilter.frequency.value = 5000;
    this.dampFilter.Q.value = 0.707;

    // Output filters
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 7000;
    this.reverbLPF.Q.value = 0.707;

    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 120;
    this.reverbHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Reverse delay emulation (for reverse mode)
    this.reverseDelay = audioContext.createDelay(0.5);
    this.reverseDelay.delayTime.value = 0.2;
    this.reverseGain = audioContext.createGain();
    this.reverseGain.gain.value = 0.0;

    // Echo delay (for echo mode)
    this.echoDelay = audioContext.createDelay(1.0);
    this.echoDelay.delayTime.value = 0.35;
    this.echoFeedback = audioContext.createGain();
    this.echoFeedback.gain.value = 0.0;

    // Blend control
    this.blendGain = audioContext.createGain();
    this.blendGain.gain.value = 0.5;

    // Feedback control
    this.feedbackControl = audioContext.createGain();
    this.feedbackControl.gain.value = 0.3;

    // Reverb level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.5;

    // === ROUTING ===
    this.input.connect(this.preDelay);

    // Pre-delay -> parallel comb filters
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combOut = this.combGains[i];

      this.preDelay.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combOut);
      combOut.connect(this.combMixer);
    }

    // Comb mixer -> allpass chain
    this.combMixer.connect(this.allpassFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].output.connect(this.allpassFilters[i + 1].input);
    }

    // Allpass -> spring resonance -> dampFilter -> output filters
    this.allpassFilters[3].output.connect(this.springResonance);
    this.springResonance.connect(this.dampFilter);
    this.dampFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);

    // Reverse path
    this.allpassFilters[3].output.connect(this.reverseDelay);
    this.reverseDelay.connect(this.reverseGain);
    this.reverseGain.connect(this.reverbLPF);

    // Echo path
    this.input.connect(this.echoDelay);
    this.echoDelay.connect(this.echoFeedback);
    this.echoFeedback.connect(this.echoDelay);
    this.echoDelay.connect(this.reverbLPF);

    // Feedback: allpass output back to predelay (for infinite hold)
    this.allpassFilters[3].output.connect(this.feedbackControl);
    this.feedbackControl.connect(this.preDelay);

    // Output: reverbLPF -> reverbLevel -> blendGain -> wetGain -> output
    this.reverbLPF.connect(this.reverbLevel);
    this.reverbLevel.connect(this.blendGain);
    this.blendGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial mode
    this._applyMode(this.currentMode);
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['hall'];

    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.reverbLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);

    for (let i = 0; i < 6; i++) {
      const scaledTime = this.baseCombDelayTimes[i] * preset.combScale;
      this.combFilters[i].delay.delayTime.setTargetAtTime(scaledTime, now, 0.02);
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.allpassFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }

    // Mode-specific features
    if (mode === 'spring') {
      this.springResonance.gain.setTargetAtTime(8, now, 0.02);
    } else {
      this.springResonance.gain.setTargetAtTime(0, now, 0.02);
    }

    if (mode === 'reverse') {
      this.reverseGain.gain.setTargetAtTime(0.5, now, 0.02);
    } else {
      this.reverseGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    if (mode === 'echo') {
      this.echoFeedback.gain.setTargetAtTime(0.4, now, 0.02);
    } else {
      this.echoFeedback.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'blend':
        this.blendGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'feedback':
        this.feedbackControl.gain.setTargetAtTime((value / 100) * 0.5, now, 0.01);
        break;
      case 'damp':
        {
          const f = 1000 + (value / 100) * 13000;
          this.dampFilter.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'reverb_time':
        {
          const fb = 0.6 + (value / 100) * 0.37;
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
        }
        break;
      case 'predelay':
        this.preDelay.delayTime.setTargetAtTime((value / 100) * 0.25, now, 0.01);
        break;
      case 'mode':
        this.currentMode = value;
        this._applyMode(value);
        break;
      case 'infinite':
        // Toggle infinite hold
        this.infiniteHold = !!value;
        if (this.infiniteHold) {
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(0.997, now, 0.01);
          }
          this.feedbackControl.gain.setTargetAtTime(0.0, now, 0.01);
        } else {
          this._applyMode(this.currentMode);
        }
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.preDelay.disconnect();
      for (let i = 0; i < 6; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].damping.disconnect();
        this.combGains[i].disconnect();
      }
      this.combMixer.disconnect();
      for (let i = 0; i < 4; i++) {
        this.allpassFilters[i].input.disconnect();
        this.allpassFilters[i].output.disconnect();
        this.allpassFilters[i].delay.disconnect();
        this.allpassFilters[i].fbGain.disconnect();
        this.allpassFilters[i].ffGain.disconnect();
      }
      this.springResonance.disconnect();
      this.dampFilter.disconnect();
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.reverseDelay.disconnect();
      this.reverseGain.disconnect();
      this.echoDelay.disconnect();
      this.echoFeedback.disconnect();
      this.blendGain.disconnect();
      this.feedbackControl.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default EHXCathedralEffect;
