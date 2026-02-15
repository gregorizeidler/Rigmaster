import BaseEffect from './BaseEffect';

class MerisMercury7Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Meris Mercury7', 'merismercury7');

    // MERIS MERCURY7 (2017)
    // Algorithmic reverb + pitch shift, inspired by Blade Runner
    // Used by: ambient/cinematic guitarists

    this.pitchPresets = {
      'off': 0,
      'octave': 12,
      'fifth': 7
    };
    this.currentPitch = 'off';

    // Pre-delay
    this.preDelay = audioContext.createDelay(0.2);
    this.preDelay.delayTime.value = 0.025;

    // Input diffusion — 4 allpass filters (dense diffusion network)
    this.diffusionDelayTimes = [0.0039, 0.0057, 0.0074, 0.0091];
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

    // 8 parallel comb filters for lush algorithmic density
    this.baseCombDelayTimes = [
      0.0263, 0.0293, 0.0331, 0.0367,
      0.0401, 0.0439, 0.0479, 0.0521
    ];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.15);
      delay.delayTime.value = this.baseCombDelayTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.90;
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 6000;
      damping.Q.value = 0.707;
      const combOut = audioContext.createGain();
      combOut.gain.value = 1 / 8;

      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combOut);
    }

    this.combMixer = audioContext.createGain();

    // Output allpass for extra smoothness
    this.outAllpass1 = this._makeAllpass(audioContext, 0.0033, 0.6);
    this.outAllpass2 = this._makeAllpass(audioContext, 0.0049, 0.6);

    // Lo freq control (low-frequency damping)
    this.loFreqFilter = audioContext.createBiquadFilter();
    this.loFreqFilter.type = 'highshelf';
    this.loFreqFilter.frequency.value = 200;
    this.loFreqFilter.gain.value = 0;

    // Hi freq control (high-frequency damping)
    this.hiFreqFilter = audioContext.createBiquadFilter();
    this.hiFreqFilter.type = 'lowshelf';
    this.hiFreqFilter.frequency.value = 6000;
    this.hiFreqFilter.gain.value = 0;

    // Output LPF
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 10000;
    this.reverbLPF.Q.value = 0.707;

    // Output HPF
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 80;
    this.reverbHPF.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Pitch shift in feedback — dual modulated delays
    this.pitchDelay1 = audioContext.createDelay(0.1);
    this.pitchDelay1.delayTime.value = 0.012;
    this.pitchDelay2 = audioContext.createDelay(0.1);
    this.pitchDelay2.delayTime.value = 0.045;

    this.pitchGain1 = audioContext.createGain();
    this.pitchGain1.gain.value = 0.5;
    this.pitchGain2 = audioContext.createGain();
    this.pitchGain2.gain.value = 0.5;

    this.pitchFeedbackGain = audioContext.createGain();
    this.pitchFeedbackGain.gain.value = 0.0; // off by default

    this.pitchLPF = audioContext.createBiquadFilter();
    this.pitchLPF.type = 'lowpass';
    this.pitchLPF.frequency.value = 7000;
    this.pitchLPF.Q.value = 0.707;

    this.pitchLFO1 = audioContext.createOscillator();
    this.pitchLFO1.type = 'sawtooth';
    this.pitchLFO1.frequency.value = 15;
    this.pitchModDepth1 = audioContext.createGain();
    this.pitchModDepth1.gain.value = 0.005;
    this.pitchLFO1.start();

    this.pitchLFO2 = audioContext.createOscillator();
    this.pitchLFO2.type = 'sawtooth';
    this.pitchLFO2.frequency.value = 15.1;
    this.pitchModDepth2 = audioContext.createGain();
    this.pitchModDepth2.gain.value = 0.005;
    this.pitchLFO2.start();

    // Modulate control (chorus-like tail modulation)
    this.modLFO = audioContext.createOscillator();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.3;
    this.modDepthGain = audioContext.createGain();
    this.modDepthGain.gain.value = 0.0004;
    this.modLFO.start();

    // Space decay level
    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.5;

    // === ROUTING ===
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.diffusionFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.diffusionFilters[i].output.connect(this.diffusionFilters[i + 1].input);
    }

    // Diffusion -> parallel comb filters
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

    // Comb mixer -> output allpass -> filters -> output
    this.combMixer.connect(this.outAllpass1.input);
    this.outAllpass1.output.connect(this.outAllpass2.input);
    this.outAllpass2.output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.loFreqFilter);
    this.loFreqFilter.connect(this.hiFreqFilter);
    this.hiFreqFilter.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbLevel);
    this.reverbLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Pitch shift feedback: combMixer -> pitchDelay1/2 -> pitchLPF -> pitchFeedbackGain -> diffusion
    this.combMixer.connect(this.pitchDelay1);
    this.combMixer.connect(this.pitchDelay2);
    this.pitchDelay1.connect(this.pitchGain1);
    this.pitchDelay2.connect(this.pitchGain2);
    this.pitchGain1.connect(this.pitchLPF);
    this.pitchGain2.connect(this.pitchLPF);
    this.pitchLPF.connect(this.pitchFeedbackGain);
    this.pitchFeedbackGain.connect(this.diffusionFilters[0].input);

    // Pitch LFOs
    this.pitchLFO1.connect(this.pitchModDepth1);
    this.pitchModDepth1.connect(this.pitchDelay1.delayTime);
    this.pitchLFO2.connect(this.pitchModDepth2);
    this.pitchModDepth2.connect(this.pitchDelay2.delayTime);

    // Modulation on comb filters
    this.modLFO.connect(this.modDepthGain);
    for (let i = 0; i < 8; i++) {
      this.modDepthGain.connect(this.combFilters[i].delay.delayTime);
    }

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this._applyPitch(this.currentPitch);
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

  _applyPitch(pitchMode) {
    const now = this.audioContext.currentTime;

    if (pitchMode === 'off') {
      this.pitchFeedbackGain.gain.setTargetAtTime(0.0, now, 0.02);
    } else {
      this.pitchFeedbackGain.gain.setTargetAtTime(0.3, now, 0.02);
      const semitones = this.pitchPresets[pitchMode] || 12;
      const rate = Math.abs(semitones) * 1.5;
      this.pitchLFO1.frequency.setTargetAtTime(rate, now, 0.02);
      this.pitchLFO2.frequency.setTargetAtTime(rate * 1.01, now, 0.02);
      const depth = semitones > 7 ? 0.006 : 0.004;
      this.pitchModDepth1.gain.setTargetAtTime(depth, now, 0.02);
      this.pitchModDepth2.gain.setTargetAtTime(depth * 0.9, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'space_decay':
        {
          const fb = 0.65 + (value / 100) * 0.33;
          for (let i = 0; i < 8; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
        }
        break;
      case 'mix':
        this.reverbLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'lo_freq':
        {
          // Low frequency content control: boost/cut
          const gain = (value / 100) * 12 - 6; // -6 to +6 dB
          this.loFreqFilter.gain.setTargetAtTime(gain, now, 0.01);
        }
        break;
      case 'hi_freq':
        {
          // High frequency damping: cut higher frequencies
          const gain = (value / 100) * 12 - 6;
          this.hiFreqFilter.gain.setTargetAtTime(gain, now, 0.01);
          const dampFreq = 2000 + (value / 100) * 10000;
          for (let i = 0; i < 8; i++) {
            this.combFilters[i].damping.frequency.setTargetAtTime(dampFreq, now, 0.01);
          }
        }
        break;
      case 'modulate':
        {
          const d = (value / 100) * 0.001;
          this.modDepthGain.gain.setTargetAtTime(d, now, 0.01);
          this.modLFO.frequency.setTargetAtTime(0.1 + (value / 100) * 0.8, now, 0.01);
        }
        break;
      case 'density':
        {
          // Density controls diffusion allpass coefficients
          const coeff = 0.55 + (value / 100) * 0.35;
          for (let i = 0; i < 4; i++) {
            this.diffusionFilters[i].fbGain.gain.setTargetAtTime(coeff, now, 0.01);
            this.diffusionFilters[i].ffGain.gain.setTargetAtTime(-coeff, now, 0.01);
          }
        }
        break;
      case 'pitch':
        this.currentPitch = value;
        this._applyPitch(value);
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
      this.loFreqFilter.disconnect();
      this.hiFreqFilter.disconnect();
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.pitchDelay1.disconnect();
      this.pitchDelay2.disconnect();
      this.pitchGain1.disconnect();
      this.pitchGain2.disconnect();
      this.pitchFeedbackGain.disconnect();
      this.pitchLPF.disconnect();
      this.pitchLFO1.stop();
      this.pitchLFO1.disconnect();
      this.pitchModDepth1.disconnect();
      this.pitchLFO2.stop();
      this.pitchLFO2.disconnect();
      this.pitchModDepth2.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.reverbLevel.disconnect();
    } catch (e) {}
  }
}

export default MerisMercury7Effect;
