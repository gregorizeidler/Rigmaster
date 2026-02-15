import BaseEffect from './BaseEffect';

class RedPandaContextEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Red Panda Context', 'redpandacontext');

    // RED PANDA CONTEXT V2 (2018)
    // Multi-mode reverb: room/hall/cathedral/plate/delay/gated
    // Used by: experimental/ambient guitarists

    this.modePresets = {
      'room': {
        combFeedback: 0.72, dampingFreq: 6000, preDelay: 0.008,
        allpassCoeff: 0.65, combScale: 0.6, lpfFreq: 8000,
        gateActive: false, delayActive: false
      },
      'hall': {
        combFeedback: 0.87, dampingFreq: 5000, preDelay: 0.03,
        allpassCoeff: 0.72, combScale: 1.0, lpfFreq: 7000,
        gateActive: false, delayActive: false
      },
      'cathedral': {
        combFeedback: 0.93, dampingFreq: 4000, preDelay: 0.05,
        allpassCoeff: 0.78, combScale: 1.5, lpfFreq: 6000,
        gateActive: false, delayActive: false
      },
      'plate': {
        combFeedback: 0.84, dampingFreq: 9000, preDelay: 0.005,
        allpassCoeff: 0.76, combScale: 0.85, lpfFreq: 10000,
        gateActive: false, delayActive: false
      },
      'delay': {
        combFeedback: 0.78, dampingFreq: 5500, preDelay: 0.02,
        allpassCoeff: 0.68, combScale: 0.9, lpfFreq: 7500,
        gateActive: false, delayActive: true
      },
      'gated': {
        combFeedback: 0.80, dampingFreq: 7000, preDelay: 0.005,
        allpassCoeff: 0.6, combScale: 0.7, lpfFreq: 9000,
        gateActive: true, delayActive: false
      }
    };
    this.currentMode = 'hall';

    // Pre-delay (up to 200ms)
    this.preDelay = audioContext.createDelay(0.25);
    this.preDelay.delayTime.value = 0.03;

    // Input diffusion — 4 allpass filters
    this.diffusionDelayTimes = [0.0047, 0.0063, 0.0079, 0.0097];
    this.diffusionFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const apDelay = audioContext.createDelay(0.05);
      apDelay.delayTime.value = this.diffusionDelayTimes[i];
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

      this.diffusionFilters.push({ input: apInput, output: apOutput, delay: apDelay, fbGain, ffGain });
    }

    // 6 parallel comb filters
    this.baseCombDelayTimes = [0.0257, 0.0297, 0.0337, 0.0379, 0.0419, 0.0463];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.87;
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

    // Output allpass
    this.outAllpass = this._makeAllpass(audioContext, 0.0041, 0.6);

    // Dampen control (tone shaping)
    this.dampenFilter = audioContext.createBiquadFilter();
    this.dampenFilter.type = 'lowpass';
    this.dampenFilter.frequency.value = 7000;
    this.dampenFilter.Q.value = 0.707;

    // Output HPF
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 100;
    this.reverbHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Gate mode: envelope follower for gated reverb
    this.gateVCA = audioContext.createGain();
    this.gateVCA.gain.value = 1.0;

    // Detector for gating
    this.gateDetector = audioContext.createWaveShaper();
    const gateCurve = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) {
      const x = (i - 32768) / 32768;
      gateCurve[i] = Math.abs(x);
    }
    this.gateDetector.curve = gateCurve;
    this.gateDetector.oversample = '4x';

    this.gateFollowerLPF = audioContext.createBiquadFilter();
    this.gateFollowerLPF.type = 'lowpass';
    this.gateFollowerLPF.frequency.value = 10;
    this.gateFollowerLPF.Q.value = 0.707;

    this.gateFollowerGain = audioContext.createGain();
    this.gateFollowerGain.gain.value = 0.0; // disabled by default

    // Delay mode: extra delay before reverb
    this.modeDelay = audioContext.createDelay(2.0);
    this.modeDelay.delayTime.value = 0.4;
    this.modeDelayGain = audioContext.createGain();
    this.modeDelayGain.gain.value = 0.0;
    this.modeDelayFB = audioContext.createGain();
    this.modeDelayFB.gain.value = 0.3;
    this.modeDelayLPF = audioContext.createBiquadFilter();
    this.modeDelayLPF.type = 'lowpass';
    this.modeDelayLPF.frequency.value = 4000;
    this.modeDelayLPF.Q.value = 0.707;
    this.modeDelayHPF = audioContext.createBiquadFilter();
    this.modeDelayHPF.type = 'highpass';
    this.modeDelayHPF.frequency.value = 60;
    this.modeDelayHPF.Q.value = 0.707;

    // Tails switch (trail or cut)
    this.tailsGain = audioContext.createGain();
    this.tailsGain.gain.value = 1.0;

    // Reverb level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.5;

    // === ROUTING ===
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.diffusionFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.diffusionFilters[i].output.connect(this.diffusionFilters[i + 1].input);
    }

    // Diffusion -> parallel comb filters
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combOut = this.combGains[i];

      this.diffusionFilters[3].output.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combOut);
      combOut.connect(this.combMixer);
    }

    // Comb mixer -> output allpass -> filters
    this.combMixer.connect(this.outAllpass.input);
    this.outAllpass.output.connect(this.gateVCA);
    this.gateVCA.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbHPF);
    this.reverbHPF.connect(this.dampenFilter);
    this.dampenFilter.connect(this.tailsGain);
    this.tailsGain.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Gate detector: input -> detector -> follower -> gateVCA.gain
    this.input.connect(this.gateDetector);
    this.gateDetector.connect(this.gateFollowerLPF);
    this.gateFollowerLPF.connect(this.gateFollowerGain);
    this.gateFollowerGain.connect(this.gateVCA.gain);

    // Delay mode: input -> modeDelay -> modeDelayLPF -> modeDelayGain -> diffusion
    this.input.connect(this.modeDelay);
    this.modeDelay.connect(this.modeDelayLPF);
    this.modeDelayLPF.connect(this.modeDelayHPF);
    this.modeDelayHPF.connect(this.modeDelayGain);
    this.modeDelayGain.connect(this.diffusionFilters[0].input);
    this.modeDelay.connect(this.modeDelayFB);
    this.modeDelayFB.connect(this.modeDelay);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this._applyMode(this.currentMode);
  }

  _makeAllpass(ctx, time, g) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = time;
    const fbGain = ctx.createGain();
    fbGain.gain.value = g;
    const ffGain = ctx.createGain();
    ffGain.gain.value = -g;

    input.connect(ffGain);
    ffGain.connect(output);
    input.connect(delay);
    delay.connect(output);
    delay.connect(fbGain);
    fbGain.connect(input);

    return { input, output, delay, fbGain, ffGain };
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['hall'];

    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.dampenFilter.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);

    for (let i = 0; i < 6; i++) {
      const scaledTime = this.baseCombDelayTimes[i] * preset.combScale;
      this.combFilters[i].delay.delayTime.setTargetAtTime(scaledTime, now, 0.02);
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 4; i++) {
      this.diffusionFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.diffusionFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }

    // Gate mode
    if (preset.gateActive) {
      this.gateFollowerGain.gain.setTargetAtTime(3.0, now, 0.02);
      this.gateVCA.gain.setTargetAtTime(0.0, now, 0.02); // driven by detector
    } else {
      this.gateFollowerGain.gain.setTargetAtTime(0.0, now, 0.02);
      this.gateVCA.gain.setTargetAtTime(1.0, now, 0.02);
    }

    // Delay mode
    if (preset.delayActive) {
      this.modeDelayGain.gain.setTargetAtTime(0.5, now, 0.02);
    } else {
      this.modeDelayGain.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'decay':
        {
          const fb = 0.6 + (value / 100) * 0.37;
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
        }
        break;
      case 'blend':
        this.reverbLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'pre_delay':
        this.preDelay.delayTime.setTargetAtTime((value / 100) * 0.2, now, 0.01);
        break;
      case 'dampen':
        {
          const f = 1000 + (value / 100) * 13000;
          this.dampenFilter.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'tails':
        this.tailsGain.gain.setTargetAtTime(value ? 1.0 : 0.0, now, 0.01);
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
      this.preDelay.disconnect();
      for (let i = 0; i < 4; i++) {
        this.diffusionFilters[i].input.disconnect();
        this.diffusionFilters[i].output.disconnect();
        this.diffusionFilters[i].delay.disconnect();
        this.diffusionFilters[i].fbGain.disconnect();
        this.diffusionFilters[i].ffGain.disconnect();
      }
      for (let i = 0; i < 6; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].damping.disconnect();
        this.combGains[i].disconnect();
      }
      this.combMixer.disconnect();
      this.outAllpass.input.disconnect();
      this.outAllpass.output.disconnect();
      this.dampenFilter.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.gateVCA.disconnect();
      this.gateDetector.disconnect();
      this.gateFollowerLPF.disconnect();
      this.gateFollowerGain.disconnect();
      this.modeDelay.disconnect();
      this.modeDelayGain.disconnect();
      this.modeDelayFB.disconnect();
      this.modeDelayLPF.disconnect();
      this.modeDelayHPF.disconnect();
      this.tailsGain.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default RedPandaContextEffect;
