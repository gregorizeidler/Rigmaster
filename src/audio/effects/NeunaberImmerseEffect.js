import BaseEffect from './BaseEffect';

class NeunaberImmerseEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Neunaber Immerse', 'neunaberimmerse');

    // NEUNABER IMMERSE (2016)
    // Ultra-clean stereo reverb, long tails
    // Used by: studio guitarists, ambient players

    this.modePresets = {
      'wet': {
        combFeedback: 0.88, dampingFreq: 8000, preDelay: 0.01,
        allpassCoeff: 0.75, shimmerLevel: 0.0, lpfFreq: 12000
      },
      'plate': {
        combFeedback: 0.85, dampingFreq: 9000, preDelay: 0.005,
        allpassCoeff: 0.78, shimmerLevel: 0.0, lpfFreq: 10000
      },
      'hall': {
        combFeedback: 0.90, dampingFreq: 6000, preDelay: 0.035,
        allpassCoeff: 0.72, shimmerLevel: 0.0, lpfFreq: 8000
      },
      'shimmer': {
        combFeedback: 0.92, dampingFreq: 7000, preDelay: 0.02,
        allpassCoeff: 0.7, shimmerLevel: 0.4, lpfFreq: 9000
      }
    };
    this.currentMode = 'hall';

    // Pre-delay
    this.preDelay = audioContext.createDelay(0.2);
    this.preDelay.delayTime.value = 0.035;

    // Input diffusion — 4 allpass filters
    this.diffusionDelayTimes = [0.0042, 0.0058, 0.0073, 0.0091];
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

    // 8 parallel comb filters for dense tail
    this.baseCombDelayTimes = [
      0.0257, 0.0289, 0.0323, 0.0353,
      0.0389, 0.0421, 0.0461, 0.0503
    ];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.88;
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 8000;
      damping.Q.value = 0.707;
      const combOut = audioContext.createGain();
      combOut.gain.value = 1 / 8;

      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combOut);
    }

    this.combMixer = audioContext.createGain();

    // Output allpass for extra diffusion
    this.outAllpass1 = this._makeAllpass(audioContext, 0.0037, 0.6);
    this.outAllpass2 = this._makeAllpass(audioContext, 0.0053, 0.6);

    // Output tone shaping
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 8000;
    this.reverbLPF.Q.value = 0.707;

    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 100;
    this.reverbHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Shimmer — pitch-shifted feedback via delay modulation
    this.shimmerDelay = audioContext.createDelay(0.1);
    this.shimmerDelay.delayTime.value = 0.02;
    this.shimmerGain = audioContext.createGain();
    this.shimmerGain.gain.value = 0.0;
    this.shimmerLPF = audioContext.createBiquadFilter();
    this.shimmerLPF.type = 'lowpass';
    this.shimmerLPF.frequency.value = 8000;
    this.shimmerLPF.Q.value = 0.707;

    this.shimmerLFO = audioContext.createOscillator();
    this.shimmerLFO.type = 'sawtooth';
    this.shimmerLFO.frequency.value = 12;
    this.shimmerModDepth = audioContext.createGain();
    this.shimmerModDepth.gain.value = 0.005;
    this.shimmerLFO.start();

    // Trail control (decay tail continuation when bypassed)
    this.trailGain = audioContext.createGain();
    this.trailGain.gain.value = 1.0;

    // Reverb level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.4;

    // Depth control — modulates comb delay times
    this.depthLFO = audioContext.createOscillator();
    this.depthLFO.type = 'sine';
    this.depthLFO.frequency.value = 0.15;
    this.depthModGain = audioContext.createGain();
    this.depthModGain.gain.value = 0.0003;
    this.depthLFO.start();

    // === ROUTING ===
    // Input -> preDelay -> diffusion allpass chain
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.diffusionFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.diffusionFilters[i].output.connect(this.diffusionFilters[i + 1].input);
    }

    // Diffusion output -> parallel comb filters
    for (let i = 0; i < 8; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combOut = this.combGains[i];

      this.diffusionFilters[3].output.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combOut);
      combOut.connect(this.combMixer);
    }

    // Comb mixer -> output allpass chain
    this.combMixer.connect(this.outAllpass1.input);
    this.outAllpass1.output.connect(this.outAllpass2.input);

    // Output: outAllpass2 -> dcBlocker -> HPF -> LPF -> trailGain -> reverbLevel -> wetGain
    this.outAllpass2.output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.trailGain);
    this.trailGain.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Shimmer feedback: combMixer -> shimmerDelay -> shimmerLPF -> shimmerGain -> diffusion input
    this.combMixer.connect(this.shimmerDelay);
    this.shimmerDelay.connect(this.shimmerLPF);
    this.shimmerLPF.connect(this.shimmerGain);
    this.shimmerGain.connect(this.diffusionFilters[0].input);

    this.shimmerLFO.connect(this.shimmerModDepth);
    this.shimmerModDepth.connect(this.shimmerDelay.delayTime);

    // Depth modulation on comb filters
    this.depthLFO.connect(this.depthModGain);
    for (let i = 0; i < 8; i++) {
      this.depthModGain.connect(this.combFilters[i].delay.delayTime);
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
    const preset = this.modePresets[mode] || this.modePresets['hall'];

    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.reverbLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);

    for (let i = 0; i < 8; i++) {
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 4; i++) {
      this.diffusionFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.diffusionFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }

    this.shimmerGain.gain.setTargetAtTime(preset.shimmerLevel, now, 0.02);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'mix':
        this.reverbLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'depth':
        {
          // Modulation depth on reverb tail
          const d = (value / 100) * 0.001;
          this.depthModGain.gain.setTargetAtTime(d, now, 0.01);
        }
        break;
      case 'tone':
        {
          const f = 2000 + (value / 100) * 12000;
          this.reverbLPF.frequency.setTargetAtTime(f, now, 0.01);
          for (let i = 0; i < 8; i++) {
            this.combFilters[i].damping.frequency.setTargetAtTime(f * 0.9, now, 0.01);
          }
        }
        break;
      case 'trail':
        this.trailGain.gain.setTargetAtTime(value / 100, now, 0.01);
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
      for (let i = 0; i < 8; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].damping.disconnect();
        this.combGains[i].disconnect();
      }
      this.combMixer.disconnect();
      this.outAllpass1.input.disconnect();
      this.outAllpass1.output.disconnect();
      this.outAllpass2.input.disconnect();
      this.outAllpass2.output.disconnect();
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.shimmerDelay.disconnect();
      this.shimmerGain.disconnect();
      this.shimmerLPF.disconnect();
      this.shimmerLFO.stop();
      this.shimmerLFO.disconnect();
      this.shimmerModDepth.disconnect();
      this.trailGain.disconnect();
      this.reverbLevel.disconnect();
      this.depthLFO.stop();
      this.depthLFO.disconnect();
      this.depthModGain.disconnect();
    } catch (e) {}
  }
}

export default NeunaberImmerseEffect;
