import BaseEffect from './BaseEffect';

class WalrusSloEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Walrus Audio Slo', 'walrusslo');

    // WALRUS AUDIO SLO (2018)
    // Multi-texture ambient reverb: dream/rise/sustain
    // Used by: ambient/shoegaze guitarists

    this.modePresets = {
      'dream': {
        combFeedback: 0.93, dampingFreq: 4500, preDelay: 0.04,
        allpassCoeff: 0.75, modRate: 0.25, modDepth: 0.0006,
        octaveUp: 0.15, lpfFreq: 6000
      },
      'rise': {
        combFeedback: 0.91, dampingFreq: 5500, preDelay: 0.02,
        allpassCoeff: 0.72, modRate: 0.08, modDepth: 0.0003,
        octaveUp: 0.0, lpfFreq: 7000
      },
      'sustain': {
        combFeedback: 0.96, dampingFreq: 5000, preDelay: 0.03,
        allpassCoeff: 0.7, modRate: 0.15, modDepth: 0.0004,
        octaveUp: 0.0, lpfFreq: 6500
      }
    };
    this.currentMode = 'dream';

    // Pre-delay
    this.preDelay = audioContext.createDelay(0.2);
    this.preDelay.delayTime.value = 0.04;

    // Input diffusion — 4 allpass filters
    this.diffusionDelayTimes = [0.0047, 0.0062, 0.0079, 0.0093];
    this.diffusionFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const apDelay = audioContext.createDelay(0.05);
      apDelay.delayTime.value = this.diffusionDelayTimes[i];
      const fbGain = audioContext.createGain();
      fbGain.gain.value = 0.75;
      const ffGain = audioContext.createGain();
      ffGain.gain.value = -0.75;

      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      apInput.connect(apDelay);
      apDelay.connect(apOutput);
      apDelay.connect(fbGain);
      fbGain.connect(apInput);

      this.diffusionFilters.push({ input: apInput, output: apOutput, delay: apDelay, fbGain, ffGain });
    }

    // 6 parallel comb filters
    this.baseCombDelayTimes = [0.0293, 0.0331, 0.0367, 0.0409, 0.0449, 0.0491];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.93;
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 4500;
      damping.Q.value = 0.707;
      const combOut = audioContext.createGain();
      combOut.gain.value = 1 / 6;

      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combOut);
    }

    this.combMixer = audioContext.createGain();

    // Output allpass
    this.outAllpass = this._makeAllpass(audioContext, 0.0041, 0.6);

    // Filter control (tone knob)
    this.filterLPF = audioContext.createBiquadFilter();
    this.filterLPF.type = 'lowpass';
    this.filterLPF.frequency.value = 6000;
    this.filterLPF.Q.value = 0.707;

    this.filterHPF = audioContext.createBiquadFilter();
    this.filterHPF.type = 'highpass';
    this.filterHPF.frequency.value = 120;
    this.filterHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Dream mode: octave-up shimmer effect
    this.shimmerDelay = audioContext.createDelay(0.08);
    this.shimmerDelay.delayTime.value = 0.015;
    this.shimmerGain = audioContext.createGain();
    this.shimmerGain.gain.value = 0.15;
    this.shimmerLPF = audioContext.createBiquadFilter();
    this.shimmerLPF.type = 'lowpass';
    this.shimmerLPF.frequency.value = 6000;
    this.shimmerLPF.Q.value = 0.707;

    this.shimmerLFO = audioContext.createOscillator();
    this.shimmerLFO.type = 'sawtooth';
    this.shimmerLFO.frequency.value = 15;
    this.shimmerModGain = audioContext.createGain();
    this.shimmerModGain.gain.value = 0.004;
    this.shimmerLFO.start();

    // Rise mode: slow swell via envelope
    this.riseDelay = audioContext.createDelay(2.0);
    this.riseDelay.delayTime.value = 0.8;
    this.riseGain = audioContext.createGain();
    this.riseGain.gain.value = 0.0;

    // Depth modulation (chorus on reverb tail)
    this.depthLFO = audioContext.createOscillator();
    this.depthLFO.type = 'sine';
    this.depthLFO.frequency.value = 0.25;
    this.depthModGain = audioContext.createGain();
    this.depthModGain.gain.value = 0.0006;
    this.depthLFO.start();

    // Secondary slow modulation
    this.depthLFO2 = audioContext.createOscillator();
    this.depthLFO2.type = 'triangle';
    this.depthLFO2.frequency.value = 0.12;
    this.depthModGain2 = audioContext.createGain();
    this.depthModGain2.gain.value = 0.0003;
    this.depthLFO2.start();

    // Reverb level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.5;

    // === ROUTING ===
    // Input -> preDelay -> diffusion chain
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
    this.outAllpass.output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.filterHPF);
    this.filterHPF.connect(this.filterLPF);
    this.filterLPF.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dream shimmer: combMixer -> shimmerDelay -> shimmerLPF -> shimmerGain -> diffusion input
    this.combMixer.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.shimmerLPF);
    this.shimmerLPF.connect(this.shimmerGain);
    this.shimmerGain.connect(this.diffusionFilters[0].input);

    this.shimmerLFO.connect(this.shimmerModGain);
    this.shimmerModGain.connect(this.shimmerDelay.delayTime);

    // Rise: input -> riseDelay -> riseGain -> diffusion
    this.input.connect(this.riseDelay);
    this.riseDelay.connect(this.riseGain);
    this.riseGain.connect(this.diffusionFilters[0].input);

    // Depth modulation on comb filters
    this.depthLFO.connect(this.depthModGain);
    this.depthLFO2.connect(this.depthModGain2);
    for (let i = 0; i < 6; i++) {
      this.depthModGain.connect(this.combFilters[i].delay.delayTime);
      this.depthModGain2.connect(this.combFilters[i].delay.delayTime);
    }

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial mode
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
    const preset = this.modePresets[mode] || this.modePresets['dream'];

    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.filterLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);
    this.depthLFO.frequency.setTargetAtTime(preset.modRate, now, 0.02);
    this.depthModGain.gain.setTargetAtTime(preset.modDepth, now, 0.02);

    for (let i = 0; i < 6; i++) {
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 4; i++) {
      this.diffusionFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.diffusionFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }

    // Shimmer (dream mode)
    this.shimmerGain.gain.setTargetAtTime(preset.octaveUp, now, 0.02);

    // Rise mode — enable rise path
    if (mode === 'rise') {
      this.riseGain.gain.setTargetAtTime(0.4, now, 0.02);
    } else {
      this.riseGain.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'decay':
        {
          const fb = 0.7 + (value / 100) * 0.28;
          for (let i = 0; i < 6; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
        }
        break;
      case 'mix':
        this.reverbLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'filter':
        {
          // Bipolar: low values = dark, high values = bright
          const lpf = 1500 + (value / 100) * 12500;
          const hpf = 200 - (value / 100) * 150;
          this.filterLPF.frequency.setTargetAtTime(lpf, now, 0.01);
          this.filterHPF.frequency.setTargetAtTime(Math.max(20, hpf), now, 0.01);
        }
        break;
      case 'depth':
        {
          const d = (value / 100) * 0.0015;
          this.depthModGain.gain.setTargetAtTime(d, now, 0.01);
          this.depthModGain2.gain.setTargetAtTime(d * 0.5, now, 0.01);
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
      this.filterLPF.disconnect();
      this.filterHPF.disconnect();
      this.dcBlocker.disconnect();
      this.shimmerDelay.disconnect();
      this.shimmerGain.disconnect();
      this.shimmerLPF.disconnect();
      this.shimmerLFO.stop();
      this.shimmerLFO.disconnect();
      this.shimmerModGain.disconnect();
      this.riseDelay.disconnect();
      this.riseGain.disconnect();
      this.depthLFO.stop();
      this.depthLFO.disconnect();
      this.depthModGain.disconnect();
      this.depthLFO2.stop();
      this.depthLFO2.disconnect();
      this.depthModGain2.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default WalrusSloEffect;
