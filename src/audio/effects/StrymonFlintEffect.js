import BaseEffect from './BaseEffect';

class StrymonFlintEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Strymon Flint', 'strymonflint');

    // STRYMON FLINT (2013)
    // Tremolo + Reverb in one unit
    // Used by: classic/vintage tone seekers

    // Tremolo types
    this.tremTypePresets = {
      'photo': { waveform: 'sine', bias: 0.5 },
      'harmonic': { waveform: 'triangle', bias: 0.4 },
      '61': { waveform: 'square', bias: 0.6 }
    };
    this.currentTremType = 'photo';

    // Reverb types
    this.reverbTypePresets = {
      '60s': {
        combFeedback: 0.78, dampingFreq: 3500, preDelay: 0.015,
        allpassCoeff: 0.65, erLevel: 0.3, lpfFreq: 5000
      },
      '70s': {
        combFeedback: 0.83, dampingFreq: 5000, preDelay: 0.025,
        allpassCoeff: 0.7, erLevel: 0.25, lpfFreq: 7000
      },
      '80s': {
        combFeedback: 0.88, dampingFreq: 8000, preDelay: 0.035,
        allpassCoeff: 0.75, erLevel: 0.15, lpfFreq: 10000
      }
    };
    this.currentReverbType = '70s';

    // =====================
    // TREMOLO SECTION
    // =====================
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 4.0;
    this.tremoloGain = audioContext.createGain();
    this.tremoloGain.gain.value = 1.0;
    this.tremoloDepthGain = audioContext.createGain();
    this.tremoloDepthGain.gain.value = 0.5;

    // Tremolo applies to the signal via VCA
    this.tremoloVCA = audioContext.createGain();
    this.tremoloVCA.gain.value = 1.0;

    // Bias for tremolo (center point)
    this.tremoloBias = audioContext.createConstantSource();
    this.tremoloBias.offset.value = 0.5;
    this.tremoloBias.start();

    this.tremoloLFO.connect(this.tremoloDepthGain);
    this.tremoloDepthGain.connect(this.tremoloVCA.gain);
    this.tremoloBias.connect(this.tremoloVCA.gain);
    this.tremoloLFO.start();

    // =====================
    // REVERB SECTION (Schroeder)
    // =====================
    // Pre-delay
    this.reverbPreDelay = audioContext.createDelay(0.1);
    this.reverbPreDelay.delayTime.value = 0.025;

    // 6 parallel comb filters
    this.baseCombDelayTimes = [0.0253, 0.0297, 0.0347, 0.0371, 0.0421, 0.0467];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.1);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.83;
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

    // 3 allpass filters for diffusion
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083];
    this.allpassFilters = [];
    for (let i = 0; i < 3; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const apDelay = audioContext.createDelay(0.05);
      apDelay.delayTime.value = this.allpassDelayTimes[i];
      const fbGain = audioContext.createGain();
      fbGain.gain.value = 0.7;
      const ffGain = audioContext.createGain();
      ffGain.gain.value = -0.7;

      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      apInput.connect(apDelay);
      apDelay.connect(apOutput);
      apDelay.connect(fbGain);
      fbGain.connect(apInput);

      this.allpassFilters.push({ input: apInput, output: apOutput, delay: apDelay, fbGain, ffGain });
    }

    // Reverb output filters
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 7000;
    this.reverbLPF.Q.value = 0.707;

    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 150;
    this.reverbHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Reverb mix level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.35;

    // === ROUTING ===
    // Input -> tremolo VCA -> (dry path + reverb path)
    this.input.connect(this.tremoloVCA);

    // Reverb: tremoloVCA -> preDelay -> combs -> allpass -> filters -> reverbLevel
    this.tremoloVCA.connect(this.reverbPreDelay);

    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combOut = this.combGains[i];

      this.reverbPreDelay.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combOut);
      combOut.connect(this.combMixer);
    }

    // Allpass chain
    this.combMixer.connect(this.allpassFilters[0].input);
    this.allpassFilters[0].output.connect(this.allpassFilters[1].input);
    this.allpassFilters[1].output.connect(this.allpassFilters[2].input);

    // Reverb output: allpass -> dcBlocker -> HPF -> LPF -> reverbLevel -> wetGain
    this.allpassFilters[2].output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path: tremoloVCA -> dryGain -> output
    this.tremoloVCA.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial presets
    this._applyReverbType(this.currentReverbType);
  }

  _applyReverbType(type) {
    const now = this.audioContext.currentTime;
    const preset = this.reverbTypePresets[type] || this.reverbTypePresets['70s'];

    this.reverbPreDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.reverbLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);

    for (let i = 0; i < 6; i++) {
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.allpassFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'trem_speed':
        this.tremoloLFO.frequency.setTargetAtTime(0.5 + (value / 100) * 14.5, now, 0.01);
        break;
      case 'trem_depth':
        this.tremoloDepthGain.gain.setTargetAtTime((value / 100) * 0.5, now, 0.01);
        this.tremoloBias.offset.setTargetAtTime(1.0 - (value / 100) * 0.5, now, 0.01);
        break;
      case 'trem_type':
        {
          this.currentTremType = value;
          const preset = this.tremTypePresets[value] || this.tremTypePresets['photo'];
          this.tremoloLFO.type = preset.waveform;
        }
        break;
      case 'reverb_decay':
        {
          const fb = 0.6 + (value / 100) * 0.35;
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
        }
        break;
      case 'reverb_mix':
        this.reverbLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'color':
        {
          // Color controls reverb damping: low values = dark, high values = bright
          const dampFreq = 2000 + (value / 100) * 8000;
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].damping.frequency.setTargetAtTime(dampFreq, now, 0.01);
          }
        }
        break;
      case 'reverb_type':
        this.currentReverbType = value;
        this._applyReverbType(value);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.tremoloLFO.stop();
      this.tremoloLFO.disconnect();
      this.tremoloDepthGain.disconnect();
      this.tremoloVCA.disconnect();
      this.tremoloBias.stop();
      this.tremoloBias.disconnect();
      this.reverbPreDelay.disconnect();
      for (let i = 0; i < 6; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].damping.disconnect();
        this.combGains[i].disconnect();
      }
      this.combMixer.disconnect();
      for (let i = 0; i < 3; i++) {
        this.allpassFilters[i].input.disconnect();
        this.allpassFilters[i].output.disconnect();
        this.allpassFilters[i].delay.disconnect();
        this.allpassFilters[i].fbGain.disconnect();
        this.allpassFilters[i].ffGain.disconnect();
      }
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default StrymonFlintEffect;
