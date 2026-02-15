import BaseEffect from './BaseEffect';

class StrymonElCapistanEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Strymon El Capistan', 'strymonelcapistan');

    // STRYMON EL CAPISTAN (2010)
    // dTape Echo, multiple head configurations
    // Used by: The Edge, ambient/worship guitarists worldwide

    // Head mode configurations
    this.headPresets = {
      'fixed': {
        heads: [1],
        spacing: [0],
        feedbackLPF: 2800,
        tapeAge: 0.5
      },
      'multi': {
        heads: [1, 2, 3],
        spacing: [0, 0.33, 0.66],
        feedbackLPF: 3200,
        tapeAge: 0.4
      },
      'single': {
        heads: [1],
        spacing: [0],
        feedbackLPF: 3000,
        tapeAge: 0.3
      }
    };
    this.currentHead = 'fixed';

    // Three tape heads (delay lines)
    this.head1 = audioContext.createDelay(3.0);
    this.head1.delayTime.value = 0.4;
    this.head2 = audioContext.createDelay(3.0);
    this.head2.delayTime.value = 0.533;
    this.head3 = audioContext.createDelay(3.0);
    this.head3.delayTime.value = 0.667;

    // Head gains (for mode switching)
    this.headGain1 = audioContext.createGain();
    this.headGain1.gain.value = 1.0;
    this.headGain2 = audioContext.createGain();
    this.headGain2.gain.value = 0.0;
    this.headGain3 = audioContext.createGain();
    this.headGain3.gain.value = 0.0;

    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.45;

    // Tape character — cascaded LPFs
    this.tapeLPF1 = audioContext.createBiquadFilter();
    this.tapeLPF1.type = 'lowpass';
    this.tapeLPF1.frequency.value = 2800;
    this.tapeLPF1.Q.value = 0.707;

    this.tapeLPF2 = audioContext.createBiquadFilter();
    this.tapeLPF2.type = 'lowpass';
    this.tapeLPF2.frequency.value = 4000;
    this.tapeLPF2.Q.value = 0.5;

    // Tape age — adjustable low-pass and saturation
    this.tapeAgeLPF = audioContext.createBiquadFilter();
    this.tapeAgeLPF.type = 'lowpass';
    this.tapeAgeLPF.frequency.value = 5000;
    this.tapeAgeLPF.Q.value = 0.707;

    // Tape saturation
    this.tapeSat = audioContext.createWaveShaper();
    this.tapeSat.oversample = '4x';
    this._setTapeAge(0.5);

    // Feedback LPF
    this.feedbackLPF = audioContext.createBiquadFilter();
    this.feedbackLPF.type = 'lowpass';
    this.feedbackLPF.frequency.value = 2800;
    this.feedbackLPF.Q.value = 0.707;

    // HPF in feedback (60Hz)
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Wow & flutter
    this.wowLFO = audioContext.createOscillator();
    this.wowDepth = audioContext.createGain();
    this.wowLFO.type = 'sine';
    this.wowLFO.frequency.value = 0.55;
    this.wowDepth.gain.value = 0.003;
    this.wowLFO.start();

    this.flutterLFO = audioContext.createOscillator();
    this.flutterDepth = audioContext.createGain();
    this.flutterLFO.type = 'triangle';
    this.flutterLFO.frequency.value = 6.0;
    this.flutterDepth.gain.value = 0.0004;
    this.flutterLFO.start();

    // Random tape crinkle
    this.crinkleLFO = audioContext.createOscillator();
    this.crinkleDepth = audioContext.createGain();
    this.crinkleLFO.type = 'sine';
    this.crinkleLFO.frequency.value = 0.12;
    this.crinkleDepth.gain.value = 0.0002;
    this.crinkleLFO.start();

    // Head mixer
    this.headMixer = audioContext.createGain();

    // Wet output
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // === SIGNAL CHAIN ===
    // Input -> three heads in parallel -> headMixer -> tapeSat -> tapeLPF1 -> tapeLPF2 -> tapeAgeLPF
    this.input.connect(this.head1);
    this.input.connect(this.head2);
    this.input.connect(this.head3);

    this.head1.connect(this.headGain1);
    this.head2.connect(this.headGain2);
    this.head3.connect(this.headGain3);

    this.headGain1.connect(this.headMixer);
    this.headGain2.connect(this.headMixer);
    this.headGain3.connect(this.headMixer);

    this.headMixer.connect(this.tapeSat);
    this.tapeSat.connect(this.tapeLPF1);
    this.tapeLPF1.connect(this.tapeLPF2);
    this.tapeLPF2.connect(this.tapeAgeLPF);

    // Wet output: tapeAgeLPF -> wetLevel -> dcBlocker -> wetGain -> output
    this.tapeAgeLPF.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: tapeAgeLPF -> feedbackLPF -> hpFeedback -> feedbackGain -> heads
    this.tapeAgeLPF.connect(this.feedbackLPF);
    this.feedbackLPF.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.head1);

    // Wow & flutter modulation on all heads
    this.wowLFO.connect(this.wowDepth);
    this.wowDepth.connect(this.head1.delayTime);
    this.wowDepth.connect(this.head2.delayTime);
    this.wowDepth.connect(this.head3.delayTime);

    this.flutterLFO.connect(this.flutterDepth);
    this.flutterDepth.connect(this.head1.delayTime);
    this.flutterDepth.connect(this.head2.delayTime);
    this.flutterDepth.connect(this.head3.delayTime);

    this.crinkleLFO.connect(this.crinkleDepth);
    this.crinkleDepth.connect(this.head1.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial head mode
    this._applyHeadMode(this.currentHead);
  }

  _setTapeAge(age) {
    // age: 0 (new tape) to 1 (worn tape)
    const samples = 4096;
    const curve = new Float32Array(samples);
    const drive = 1.2 + age * 2.5;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (x >= 0) {
        curve[i] = Math.tanh(x * drive);
      } else {
        curve[i] = Math.tanh(x * (drive + age * 0.5));
      }
    }
    this.tapeSat.curve = curve;
  }

  _applyHeadMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.headPresets[mode] || this.headPresets['fixed'];

    // Enable/disable heads based on mode
    if (mode === 'multi') {
      this.headGain1.gain.setTargetAtTime(1.0, now, 0.02);
      this.headGain2.gain.setTargetAtTime(0.7, now, 0.02);
      this.headGain3.gain.setTargetAtTime(0.5, now, 0.02);
    } else {
      this.headGain1.gain.setTargetAtTime(1.0, now, 0.02);
      this.headGain2.gain.setTargetAtTime(0.0, now, 0.02);
      this.headGain3.gain.setTargetAtTime(0.0, now, 0.02);
    }

    this.feedbackLPF.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        {
          const t = 0.04 + (value / 100) * 2.46;
          this.head1.delayTime.setTargetAtTime(t, now, 0.01);
          this.head2.delayTime.setTargetAtTime(t * 1.333, now, 0.01);
          this.head3.delayTime.setTargetAtTime(t * 1.667, now, 0.01);
        }
        break;
      case 'repeats':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tape_age':
        {
          const age = value / 100;
          this._setTapeAge(age);
          const lpfFreq = 8000 - age * 5000;
          this.tapeAgeLPF.frequency.setTargetAtTime(lpfFreq, now, 0.01);
        }
        break;
      case 'wow_flutter':
        {
          const wf = value / 100;
          this.wowDepth.gain.setTargetAtTime(wf * 0.006, now, 0.01);
          this.flutterDepth.gain.setTargetAtTime(wf * 0.001, now, 0.01);
          this.crinkleDepth.gain.setTargetAtTime(wf * 0.0005, now, 0.01);
        }
        break;
      case 'head':
        this.currentHead = value;
        this._applyHeadMode(value);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.head1.disconnect();
      this.head2.disconnect();
      this.head3.disconnect();
      this.headGain1.disconnect();
      this.headGain2.disconnect();
      this.headGain3.disconnect();
      this.headMixer.disconnect();
      this.feedbackGain.disconnect();
      this.tapeLPF1.disconnect();
      this.tapeLPF2.disconnect();
      this.tapeAgeLPF.disconnect();
      this.tapeSat.disconnect();
      this.feedbackLPF.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.wowLFO.stop();
      this.wowLFO.disconnect();
      this.wowDepth.disconnect();
      this.flutterLFO.stop();
      this.flutterLFO.disconnect();
      this.flutterDepth.disconnect();
      this.crinkleLFO.stop();
      this.crinkleLFO.disconnect();
      this.crinkleDepth.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default StrymonElCapistanEffect;
