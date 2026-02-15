import BaseEffect from './BaseEffect';

class RedPandaTensorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Red Panda Tensor', 'redpandatensor');

    // RED PANDA TENSOR (2018)
    // Reverse delay / pitch / time-stretch
    // Used by: experimental/noise/glitch guitarists

    this.modePresets = {
      'reverse': {
        reverseActive: true, stretchActive: false, randomActive: false,
        lpf: 6000, modRate: 0.0, modDepth: 0.0
      },
      'stretch': {
        reverseActive: false, stretchActive: true, randomActive: false,
        lpf: 8000, modRate: 0.2, modDepth: 0.001
      },
      'random': {
        reverseActive: false, stretchActive: false, randomActive: true,
        lpf: 5000, modRate: 0.8, modDepth: 0.003
      }
    };
    this.currentMode = 'reverse';

    // =====================
    // TIME BUFFER (primary delay)
    // =====================
    this.timeBuffer = audioContext.createDelay(4.0);
    this.timeBuffer.delayTime.value = 0.5;

    // Secondary buffer for crossfade
    this.timeBuffer2 = audioContext.createDelay(4.0);
    this.timeBuffer2.delayTime.value = 0.25;

    // Buffer gains for crossfade
    this.bufferGain1 = audioContext.createGain();
    this.bufferGain1.gain.value = 1.0;
    this.bufferGain2 = audioContext.createGain();
    this.bufferGain2.gain.value = 0.0;

    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.3;

    // =====================
    // REVERSE EMULATION
    // =====================
    // Multiple delay taps with reverse-envelope gain for reverse-like effect
    this.reverseTaps = [];
    const numTaps = 8;
    for (let i = 0; i < numTaps; i++) {
      const tapDelay = audioContext.createDelay(2.0);
      const tapGain = audioContext.createGain();
      // Reverse envelope: later taps are louder (simulate reverse playback)
      tapDelay.delayTime.value = 0.5 * ((numTaps - i) / numTaps);
      tapGain.gain.value = (i / numTaps) * (1 / numTaps) * 2;
      this.reverseTaps.push({ delay: tapDelay, gain: tapGain });
    }
    this.reverseMixer = audioContext.createGain();
    this.reverseMixer.gain.value = 0.0;

    // =====================
    // TIME STRETCH
    // =====================
    this.stretchDelay1 = audioContext.createDelay(1.0);
    this.stretchDelay1.delayTime.value = 0.1;
    this.stretchDelay2 = audioContext.createDelay(1.0);
    this.stretchDelay2.delayTime.value = 0.15;

    this.stretchGain1 = audioContext.createGain();
    this.stretchGain1.gain.value = 0.5;
    this.stretchGain2 = audioContext.createGain();
    this.stretchGain2.gain.value = 0.5;

    this.stretchMixer = audioContext.createGain();
    this.stretchMixer.gain.value = 0.0;

    // Stretch modulation LFOs
    this.stretchLFO1 = audioContext.createOscillator();
    this.stretchLFO1.type = 'triangle';
    this.stretchLFO1.frequency.value = 0.5;
    this.stretchModDepth1 = audioContext.createGain();
    this.stretchModDepth1.gain.value = 0.02;
    this.stretchLFO1.start();

    this.stretchLFO2 = audioContext.createOscillator();
    this.stretchLFO2.type = 'triangle';
    this.stretchLFO2.frequency.value = 0.37;
    this.stretchModDepth2 = audioContext.createGain();
    this.stretchModDepth2.gain.value = 0.015;
    this.stretchLFO2.start();

    // =====================
    // RANDOM MODE
    // =====================
    this.randomDelay = audioContext.createDelay(2.0);
    this.randomDelay.delayTime.value = 0.3;
    this.randomGain = audioContext.createGain();
    this.randomGain.gain.value = 0.0;

    this.randomLFO = audioContext.createOscillator();
    this.randomLFO.type = 'sawtooth';
    this.randomLFO.frequency.value = 0.8;
    this.randomModDepth = audioContext.createGain();
    this.randomModDepth.gain.value = 0.05;
    this.randomLFO.start();

    // =====================
    // PITCH CONTROL
    // =====================
    this.pitchDelay1 = audioContext.createDelay(0.1);
    this.pitchDelay1.delayTime.value = 0.015;
    this.pitchDelay2 = audioContext.createDelay(0.1);
    this.pitchDelay2.delayTime.value = 0.04;
    this.pitchGain1 = audioContext.createGain();
    this.pitchGain1.gain.value = 0.5;
    this.pitchGain2 = audioContext.createGain();
    this.pitchGain2.gain.value = 0.5;
    this.pitchMixer = audioContext.createGain();

    this.pitchLFO1 = audioContext.createOscillator();
    this.pitchLFO1.type = 'sawtooth';
    this.pitchLFO1.frequency.value = 10;
    this.pitchModDepth1 = audioContext.createGain();
    this.pitchModDepth1.gain.value = 0.005;
    this.pitchLFO1.start();

    this.pitchLFO2 = audioContext.createOscillator();
    this.pitchLFO2.type = 'sawtooth';
    this.pitchLFO2.frequency.value = 10.1;
    this.pitchModDepth2 = audioContext.createGain();
    this.pitchModDepth2.gain.value = 0.005;
    this.pitchLFO2.start();

    // =====================
    // SHARED OUTPUT
    // =====================
    // Feedback HPF (60Hz)
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Output LPF
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 6000;
    this.outputLPF.Q.value = 0.707;

    // Speed control — affects playback rate emulation
    this.speedParam = 1.0;

    // Wet blend
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // Master wet mixer
    this.wetMixer = audioContext.createGain();

    // === ROUTING ===
    // Normal delay path
    this.input.connect(this.timeBuffer);
    this.input.connect(this.timeBuffer2);

    this.timeBuffer.connect(this.bufferGain1);
    this.timeBuffer2.connect(this.bufferGain2);

    // Pitch processing
    this.bufferGain1.connect(this.pitchDelay1);
    this.bufferGain1.connect(this.pitchDelay2);
    this.bufferGain2.connect(this.pitchDelay1);
    this.bufferGain2.connect(this.pitchDelay2);

    this.pitchDelay1.connect(this.pitchGain1);
    this.pitchDelay2.connect(this.pitchGain2);
    this.pitchGain1.connect(this.pitchMixer);
    this.pitchGain2.connect(this.pitchMixer);

    this.pitchLFO1.connect(this.pitchModDepth1);
    this.pitchModDepth1.connect(this.pitchDelay1.delayTime);
    this.pitchLFO2.connect(this.pitchModDepth2);
    this.pitchModDepth2.connect(this.pitchDelay2.delayTime);

    this.pitchMixer.connect(this.wetMixer);

    // Reverse taps
    for (let i = 0; i < numTaps; i++) {
      this.input.connect(this.reverseTaps[i].delay);
      this.reverseTaps[i].delay.connect(this.reverseTaps[i].gain);
      this.reverseTaps[i].gain.connect(this.reverseMixer);
    }
    this.reverseMixer.connect(this.wetMixer);

    // Stretch path
    this.input.connect(this.stretchDelay1);
    this.input.connect(this.stretchDelay2);
    this.stretchDelay1.connect(this.stretchGain1);
    this.stretchDelay2.connect(this.stretchGain2);
    this.stretchGain1.connect(this.stretchMixer);
    this.stretchGain2.connect(this.stretchMixer);
    this.stretchMixer.connect(this.wetMixer);

    this.stretchLFO1.connect(this.stretchModDepth1);
    this.stretchModDepth1.connect(this.stretchDelay1.delayTime);
    this.stretchLFO2.connect(this.stretchModDepth2);
    this.stretchModDepth2.connect(this.stretchDelay2.delayTime);

    // Random path
    this.input.connect(this.randomDelay);
    this.randomDelay.connect(this.randomGain);
    this.randomGain.connect(this.wetMixer);
    this.randomLFO.connect(this.randomModDepth);
    this.randomModDepth.connect(this.randomDelay.delayTime);

    // Wet output: wetMixer -> outputLPF -> wetLevel -> dcBlocker -> wetGain -> output
    this.wetMixer.connect(this.outputLPF);
    this.outputLPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: wetMixer -> hpFeedback -> feedbackGain -> timeBuffer
    this.wetMixer.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.timeBuffer);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this._applyMode(this.currentMode);
  }

  _applyMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['reverse'];

    this.outputLPF.frequency.setTargetAtTime(preset.lpf, now, 0.02);

    // Activate/deactivate paths
    this.reverseMixer.gain.setTargetAtTime(preset.reverseActive ? 0.8 : 0.0, now, 0.02);
    this.stretchMixer.gain.setTargetAtTime(preset.stretchActive ? 0.7 : 0.0, now, 0.02);
    this.randomGain.gain.setTargetAtTime(preset.randomActive ? 0.6 : 0.0, now, 0.02);

    // Normal pitch path is always active at reduced level
    this.pitchMixer.gain.setTargetAtTime(0.3, now, 0.02);
  }

  _updateReverseTapTimes(baseTime) {
    const now = this.audioContext.currentTime;
    const numTaps = this.reverseTaps.length;
    for (let i = 0; i < numTaps; i++) {
      const tapTime = baseTime * ((numTaps - i) / numTaps);
      this.reverseTaps[i].delay.delayTime.setTargetAtTime(
        Math.max(0.001, tapTime), now, 0.01
      );
      // Reverse envelope: later taps louder
      const tapLevel = (i / numTaps) * (1 / numTaps) * 2.5;
      this.reverseTaps[i].gain.gain.setTargetAtTime(tapLevel, now, 0.01);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        {
          const t = 0.05 + (value / 100) * 1.95;
          this.timeBuffer.delayTime.setTargetAtTime(t, now, 0.01);
          this.timeBuffer2.delayTime.setTargetAtTime(t * 0.5, now, 0.01);
          this._updateReverseTapTimes(t);
        }
        break;
      case 'pitch':
        {
          // Pitch: -100 to +100 mapped to value 0-100
          const semitones = ((value / 100) * 24) - 12; // -12 to +12
          const rate = Math.abs(semitones) * 1.5;
          const depth = Math.abs(semitones) * 0.0005;
          this.pitchLFO1.frequency.setTargetAtTime(Math.max(0.1, rate), now, 0.01);
          this.pitchLFO2.frequency.setTargetAtTime(Math.max(0.1, rate * 1.01), now, 0.01);
          this.pitchModDepth1.gain.setTargetAtTime(depth, now, 0.01);
          this.pitchModDepth2.gain.setTargetAtTime(depth * 0.9, now, 0.01);
        }
        break;
      case 'blend':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'speed':
        {
          this.speedParam = 0.25 + (value / 100) * 1.75;
          // Adjust stretch LFO rates based on speed
          this.stretchLFO1.frequency.setTargetAtTime(0.2 * this.speedParam, now, 0.01);
          this.stretchLFO2.frequency.setTargetAtTime(0.15 * this.speedParam, now, 0.01);
          this.randomLFO.frequency.setTargetAtTime(0.4 * this.speedParam, now, 0.01);
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
      this.timeBuffer.disconnect();
      this.timeBuffer2.disconnect();
      this.bufferGain1.disconnect();
      this.bufferGain2.disconnect();
      this.feedbackGain.disconnect();
      for (const tap of this.reverseTaps) {
        tap.delay.disconnect();
        tap.gain.disconnect();
      }
      this.reverseMixer.disconnect();
      this.stretchDelay1.disconnect();
      this.stretchDelay2.disconnect();
      this.stretchGain1.disconnect();
      this.stretchGain2.disconnect();
      this.stretchMixer.disconnect();
      this.stretchLFO1.stop();
      this.stretchLFO1.disconnect();
      this.stretchModDepth1.disconnect();
      this.stretchLFO2.stop();
      this.stretchLFO2.disconnect();
      this.stretchModDepth2.disconnect();
      this.randomDelay.disconnect();
      this.randomGain.disconnect();
      this.randomLFO.stop();
      this.randomLFO.disconnect();
      this.randomModDepth.disconnect();
      this.pitchDelay1.disconnect();
      this.pitchDelay2.disconnect();
      this.pitchGain1.disconnect();
      this.pitchGain2.disconnect();
      this.pitchMixer.disconnect();
      this.pitchLFO1.stop();
      this.pitchLFO1.disconnect();
      this.pitchModDepth1.disconnect();
      this.pitchLFO2.stop();
      this.pitchLFO2.disconnect();
      this.pitchModDepth2.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.outputLPF.disconnect();
      this.wetLevel.disconnect();
      this.wetMixer.disconnect();
    } catch (e) {}
  }
}

export default RedPandaTensorEffect;
