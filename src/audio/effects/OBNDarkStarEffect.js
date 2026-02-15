import BaseEffect from './BaseEffect';

class OBNDarkStarEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'OBN Dark Star', 'obndarkstar');

    // OLD BLOOD NOISE DARK STAR (2019)
    // Pad reverb, washy, ambient with pitch/delay/bitcrush modes
    // Used by: experimental/noise/ambient guitarists

    this.modePresets = {
      'pitch': {
        combFeedback: 0.92, dampingFreq: 5000, preDelay: 0.03,
        allpassCoeff: 0.72, pitchShift: true, crushActive: false,
        delayActive: false, lpfFreq: 6500
      },
      'delay': {
        combFeedback: 0.88, dampingFreq: 5500, preDelay: 0.02,
        allpassCoeff: 0.7, pitchShift: false, crushActive: false,
        delayActive: true, lpfFreq: 7000
      },
      'bitcrush': {
        combFeedback: 0.90, dampingFreq: 4000, preDelay: 0.025,
        allpassCoeff: 0.68, pitchShift: false, crushActive: true,
        delayActive: false, lpfFreq: 5000
      }
    };
    this.currentMode = 'pitch';

    // Pre-delay
    this.preDelay = audioContext.createDelay(0.15);
    this.preDelay.delayTime.value = 0.03;

    // Input diffusion — 3 allpass filters
    this.diffusionDelayTimes = [0.0053, 0.0071, 0.0089];
    this.diffusionFilters = [];
    for (let i = 0; i < 3; i++) {
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
    this.baseCombDelayTimes = [0.0271, 0.0313, 0.0359, 0.0397, 0.0439, 0.0487];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.92;
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

    // Output filters
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 6500;
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

    // Pitch mode: pitch-shifted feedback via dual modulated delays
    this.pitchDelay1 = audioContext.createDelay(0.1);
    this.pitchDelay1.delayTime.value = 0.01;
    this.pitchDelay2 = audioContext.createDelay(0.1);
    this.pitchDelay2.delayTime.value = 0.04;
    this.pitchGain = audioContext.createGain();
    this.pitchGain.gain.value = 0.0;
    this.pitchLPF = audioContext.createBiquadFilter();
    this.pitchLPF.type = 'lowpass';
    this.pitchLPF.frequency.value = 5000;
    this.pitchLPF.Q.value = 0.707;

    this.pitchLFO = audioContext.createOscillator();
    this.pitchLFO.type = 'sawtooth';
    this.pitchLFO.frequency.value = 12;
    this.pitchModDepth = audioContext.createGain();
    this.pitchModDepth.gain.value = 0.005;
    this.pitchLFO.start();

    // Delay mode: extra delay tap in feedback
    this.modeDelay = audioContext.createDelay(2.0);
    this.modeDelay.delayTime.value = 0.5;
    this.modeDelayGain = audioContext.createGain();
    this.modeDelayGain.gain.value = 0.0;
    this.modeDelayFB = audioContext.createGain();
    this.modeDelayFB.gain.value = 0.3;

    // Bitcrush mode: waveshaper for bit reduction
    this.crushShaper = audioContext.createWaveShaper();
    this.crushShaper.oversample = 'none';
    this.crushGain = audioContext.createGain();
    this.crushGain.gain.value = 0.0;
    this._setCrushAmount(0.5);

    // Voice control (resonant filter sweep)
    this.voiceFilter = audioContext.createBiquadFilter();
    this.voiceFilter.type = 'bandpass';
    this.voiceFilter.frequency.value = 1500;
    this.voiceFilter.Q.value = 2.0;

    // Depth modulation
    this.depthLFO = audioContext.createOscillator();
    this.depthLFO.type = 'sine';
    this.depthLFO.frequency.value = 0.2;
    this.depthModGain = audioContext.createGain();
    this.depthModGain.gain.value = 0.0005;
    this.depthLFO.start();

    // Reverb level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.5;

    // === ROUTING ===
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.diffusionFilters[0].input);
    this.diffusionFilters[0].output.connect(this.diffusionFilters[1].input);
    this.diffusionFilters[1].output.connect(this.diffusionFilters[2].input);

    // Diffusion -> parallel comb filters
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combOut = this.combGains[i];

      this.diffusionFilters[2].output.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combOut);
      combOut.connect(this.combMixer);
    }

    // Comb mixer -> voice filter -> output filters
    this.combMixer.connect(this.voiceFilter);
    this.voiceFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Pitch feedback: combMixer -> pitchDelay1/2 -> pitchLPF -> pitchGain -> diffusion
    this.combMixer.connect(this.pitchDelay1);
    this.combMixer.connect(this.pitchDelay2);
    this.pitchDelay1.connect(this.pitchLPF);
    this.pitchDelay2.connect(this.pitchLPF);
    this.pitchLPF.connect(this.pitchGain);
    this.pitchGain.connect(this.diffusionFilters[0].input);

    this.pitchLFO.connect(this.pitchModDepth);
    this.pitchModDepth.connect(this.pitchDelay1.delayTime);

    // Delay mode: combMixer -> modeDelay -> modeDelayGain -> diffusion
    this.combMixer.connect(this.modeDelay);
    this.modeDelay.connect(this.modeDelayGain);
    this.modeDelayGain.connect(this.diffusionFilters[0].input);
    this.modeDelay.connect(this.modeDelayFB);
    this.modeDelayFB.connect(this.modeDelay);

    // Bitcrush mode: combMixer -> crushShaper -> crushGain -> diffusion
    this.combMixer.connect(this.crushShaper);
    this.crushShaper.connect(this.crushGain);
    this.crushGain.connect(this.diffusionFilters[0].input);

    // Depth modulation
    this.depthLFO.connect(this.depthModGain);
    for (let i = 0; i < 6; i++) {
      this.depthModGain.connect(this.combFilters[i].delay.delayTime);
    }

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this._applyMode(this.currentMode);
  }

  _setCrushAmount(amount) {
    const bits = Math.max(2, Math.floor(16 - amount * 12));
    const steps = Math.pow(2, bits);
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    this.crushShaper.curve = curve;
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['pitch'];

    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
    this.reverbLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);

    for (let i = 0; i < 6; i++) {
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.combFeedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.dampingFreq, now, 0.02);
    }

    for (let i = 0; i < 3; i++) {
      this.diffusionFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.diffusionFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }

    // Mode-specific activations
    this.pitchGain.gain.setTargetAtTime(preset.pitchShift ? 0.3 : 0.0, now, 0.02);
    this.modeDelayGain.gain.setTargetAtTime(preset.delayActive ? 0.4 : 0.0, now, 0.02);
    this.crushGain.gain.setTargetAtTime(preset.crushActive ? 0.35 : 0.0, now, 0.02);
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
      case 'voice':
        {
          // Voice: sweep the bandpass filter
          const f = 300 + (value / 100) * 4700;
          this.voiceFilter.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'crush':
        this._setCrushAmount(value / 100);
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
      for (let i = 0; i < 3; i++) {
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
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.pitchDelay1.disconnect();
      this.pitchDelay2.disconnect();
      this.pitchGain.disconnect();
      this.pitchLPF.disconnect();
      this.pitchLFO.stop();
      this.pitchLFO.disconnect();
      this.pitchModDepth.disconnect();
      this.modeDelay.disconnect();
      this.modeDelayGain.disconnect();
      this.modeDelayFB.disconnect();
      this.crushShaper.disconnect();
      this.crushGain.disconnect();
      this.voiceFilter.disconnect();
      this.depthLFO.stop();
      this.depthLFO.disconnect();
      this.depthModGain.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default OBNDarkStarEffect;
