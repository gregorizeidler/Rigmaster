import BaseEffect from './BaseEffect';

class CatalinbreadBelleEpochEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Catalinbread Belle Epoch', 'catalinbreadbelleepoch');

    // CATALINBREAD BELLE EPOCH (2014)
    // Echoplex EP-3 tape echo simulation
    // Used by: Led Zeppelin fans, classic rock, ambient players

    // Primary delay line — Echoplex range ~40ms to 800ms
    this.delay = audioContext.createDelay(1.0);
    this.delay.delayTime.value = 0.35;

    // Feedback gain (sustain/echo control)
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;

    // EP-3 preamp coloration — peaking EQ for that characteristic midrange bump
    this.preampEQ1 = audioContext.createBiquadFilter();
    this.preampEQ1.type = 'peaking';
    this.preampEQ1.frequency.value = 1500;
    this.preampEQ1.Q.value = 0.8;
    this.preampEQ1.gain.value = 4;

    this.preampEQ2 = audioContext.createBiquadFilter();
    this.preampEQ2.type = 'peaking';
    this.preampEQ2.frequency.value = 700;
    this.preampEQ2.Q.value = 1.0;
    this.preampEQ2.gain.value = 2;

    // Tape head simulation — cascaded lowpass for roll-off
    this.tapeHeadLPF1 = audioContext.createBiquadFilter();
    this.tapeHeadLPF1.type = 'lowpass';
    this.tapeHeadLPF1.frequency.value = 3000;
    this.tapeHeadLPF1.Q.value = 0.707;

    this.tapeHeadLPF2 = audioContext.createBiquadFilter();
    this.tapeHeadLPF2.type = 'lowpass';
    this.tapeHeadLPF2.frequency.value = 4500;
    this.tapeHeadLPF2.Q.value = 0.5;

    // Tape saturation
    this.tapeSat = audioContext.createWaveShaper();
    this.tapeSat.oversample = '4x';
    const samples = 8192;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Asymmetric soft clipping for tape character
      if (x >= 0) {
        curve[i] = Math.tanh(x * 1.8);
      } else {
        curve[i] = Math.tanh(x * 2.2);
      }
    }
    this.tapeSat.curve = curve;

    // Tone control LPF
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 4000;
    this.toneLPF.Q.value = 0.707;

    // HPF in feedback (60Hz) — prevent bass buildup
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // Feedback LPF — progressive darkening
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 2800;
    this.feedbackLPF.Q.value = 0.707;

    // DC blocker (10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Tape wow & flutter — dual LFO modulation
    this.wowLFO = audioContext.createOscillator();
    this.wowDepth = audioContext.createGain();
    this.wowLFO.type = 'sine';
    this.wowLFO.frequency.value = 0.5; // Wow: slow pitch wobble
    this.wowDepth.gain.value = 0.003;
    this.wowLFO.start();

    this.flutterLFO = audioContext.createOscillator();
    this.flutterDepth = audioContext.createGain();
    this.flutterLFO.type = 'triangle';
    this.flutterLFO.frequency.value = 5.5; // Flutter: faster pitch variation
    this.flutterDepth.gain.value = 0.0005;
    this.flutterLFO.start();

    // Random drift for tape imperfection
    this.driftLFO = audioContext.createOscillator();
    this.driftGain = audioContext.createGain();
    this.driftLFO.type = 'sine';
    this.driftLFO.frequency.value = 0.08;
    this.driftGain.gain.value = 0.0003;
    this.driftLFO.start();

    // Wet level
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // Output HPF
    this.outputHPF = audioContext.createBiquadFilter();
    this.outputHPF.type = 'highpass';
    this.outputHPF.frequency.value = 90;
    this.outputHPF.Q.value = 0.707;

    // === SIGNAL CHAIN ===
    // Input -> preampEQ1 -> preampEQ2 -> delay -> tapeSat -> tapeHeadLPF1 -> tapeHeadLPF2 -> toneLPF
    this.input.connect(this.preampEQ1);
    this.preampEQ1.connect(this.preampEQ2);
    this.preampEQ2.connect(this.delay);
    this.delay.connect(this.tapeSat);
    this.tapeSat.connect(this.tapeHeadLPF1);
    this.tapeHeadLPF1.connect(this.tapeHeadLPF2);
    this.tapeHeadLPF2.connect(this.toneLPF);

    // Wet output: toneLPF -> outputHPF -> wetLevel -> dcBlocker -> wetGain -> output
    this.toneLPF.connect(this.outputHPF);
    this.outputHPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: toneLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> delay
    this.toneLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Wow & flutter modulation -> delay time
    this.wowLFO.connect(this.wowDepth);
    this.wowDepth.connect(this.delay.delayTime);
    this.flutterLFO.connect(this.flutterDepth);
    this.flutterDepth.connect(this.delay.delayTime);
    this.driftLFO.connect(this.driftGain);
    this.driftGain.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'echo':
        // Delay time: 40ms to 800ms
        this.delay.delayTime.setTargetAtTime(0.04 + (value / 100) * 0.76, now, 0.01);
        break;
      case 'sustain':
        // Feedback/repeats
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.94, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tone':
        {
          const f = 1500 + (value / 100) * 8500;
          this.toneLPF.frequency.setTargetAtTime(f, now, 0.01);
        }
        break;
      case 'mod':
        // Wow & flutter intensity
        {
          const wowD = (value / 100) * 0.006;
          const flutterD = (value / 100) * 0.001;
          this.wowDepth.gain.setTargetAtTime(wowD, now, 0.01);
          this.flutterDepth.gain.setTargetAtTime(flutterD, now, 0.01);
          this.driftGain.gain.setTargetAtTime((value / 100) * 0.0006, now, 0.01);
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
      this.preampEQ1.disconnect();
      this.preampEQ2.disconnect();
      this.tapeHeadLPF1.disconnect();
      this.tapeHeadLPF2.disconnect();
      this.tapeSat.disconnect();
      this.toneLPF.disconnect();
      this.feedbackLPF.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.outputHPF.disconnect();
      this.wowLFO.stop();
      this.wowLFO.disconnect();
      this.wowDepth.disconnect();
      this.flutterLFO.stop();
      this.flutterLFO.disconnect();
      this.flutterDepth.disconnect();
      this.driftLFO.stop();
      this.driftLFO.disconnect();
      this.driftGain.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default CatalinbreadBelleEpochEffect;
