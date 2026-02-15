import BaseEffect from './BaseEffect';

class ChaseBlissThermaeEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Chase Bliss Thermae', 'chaseblissthermae');

    // CHASE BLISS THERMAE (2018)
    // Analog delay with pitch shifting on repeats
    // Used by: experimental/ambient guitarists

    // Interval presets (pitch shift ratios)
    this.intervalPresets = {
      'up_octave': 2.0,
      'down_octave': 0.5,
      'up_fifth': 1.4983, // ~7 semitones
      'down_fifth': 0.6674,
      'up_fourth': 1.3348,
      'down_fourth': 0.7491
    };
    this.currentInterval = 'up_octave';

    // Primary delay line
    this.delay = audioContext.createDelay(2.0);
    this.delay.delayTime.value = 0.4;

    // Feedback gain (regen)
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;

    // Analog darkening — cascaded LPFs
    this.analogLPF1 = audioContext.createBiquadFilter();
    this.analogLPF1.type = 'lowpass';
    this.analogLPF1.frequency.value = 3200;
    this.analogLPF1.Q.value = 0.707;

    this.analogLPF2 = audioContext.createBiquadFilter();
    this.analogLPF2.type = 'lowpass';
    this.analogLPF2.frequency.value = 4500;
    this.analogLPF2.Q.value = 0.5;

    // HPF in feedback (60Hz)
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 60;
    this.hpFeedback.Q.value = 0.707;

    // DC blocker (10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Pitch shifting emulation via dual delay lines (granular-like)
    // Two pitch-shifted delay taps with crossfade for glide
    this.pitchDelay1 = audioContext.createDelay(0.2);
    this.pitchDelay1.delayTime.value = 0.01;
    this.pitchDelay2 = audioContext.createDelay(0.2);
    this.pitchDelay2.delayTime.value = 0.05;

    this.pitchGain1 = audioContext.createGain();
    this.pitchGain1.gain.value = 0.5;
    this.pitchGain2 = audioContext.createGain();
    this.pitchGain2.gain.value = 0.5;

    // Pitch modulation LFOs — create the pitch shift illusion
    this.pitchLFO1 = audioContext.createOscillator();
    this.pitchLFO1.type = 'sawtooth';
    this.pitchLFO1.frequency.value = 10;
    this.pitchDepth1 = audioContext.createGain();
    this.pitchDepth1.gain.value = 0.005;
    this.pitchLFO1.start();

    this.pitchLFO2 = audioContext.createOscillator();
    this.pitchLFO2.type = 'sawtooth';
    this.pitchLFO2.frequency.value = 10;
    this.pitchDepth2 = audioContext.createGain();
    this.pitchDepth2.gain.value = 0.005;
    this.pitchLFO2.start();

    // Glide control — smoothing for interval changes
    this.glideTime = 0.05; // 50ms default

    // Analog modulation (subtle drift)
    this.modLFO = audioContext.createOscillator();
    this.modDepthGain = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.3;
    this.modDepthGain.gain.value = 0.0015;
    this.modLFO.start();

    // Pitch mixer
    this.pitchMixer = audioContext.createGain();
    this.pitchMixer.gain.value = 0.7;

    // Non-pitched output (for blending)
    this.directDelayOut = audioContext.createGain();
    this.directDelayOut.gain.value = 0.3;

    // Wet level
    this.wetLevel = audioContext.createGain();
    this.wetLevel.gain.value = 0.5;

    // Anti-aliasing filter for pitch section
    this.pitchAAFilter = audioContext.createBiquadFilter();
    this.pitchAAFilter.type = 'lowpass';
    this.pitchAAFilter.frequency.value = 8000;
    this.pitchAAFilter.Q.value = 0.707;

    // === SIGNAL CHAIN ===
    // Input -> delay -> analogLPF1 -> analogLPF2
    this.input.connect(this.delay);
    this.delay.connect(this.analogLPF1);
    this.analogLPF1.connect(this.analogLPF2);

    // Pitch shift path: analogLPF2 -> pitchDelay1/2 -> pitchGain1/2 -> pitchAAFilter -> pitchMixer
    this.analogLPF2.connect(this.pitchDelay1);
    this.analogLPF2.connect(this.pitchDelay2);
    this.pitchDelay1.connect(this.pitchGain1);
    this.pitchDelay2.connect(this.pitchGain2);
    this.pitchGain1.connect(this.pitchAAFilter);
    this.pitchGain2.connect(this.pitchAAFilter);
    this.pitchAAFilter.connect(this.pitchMixer);

    // Direct delay path (non-pitched)
    this.analogLPF2.connect(this.directDelayOut);

    // Mix: pitchMixer + directDelayOut -> wetLevel -> dcBlocker -> wetGain -> output
    this.pitchMixer.connect(this.wetLevel);
    this.directDelayOut.connect(this.wetLevel);
    this.wetLevel.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback: pitchMixer + directDelayOut -> hpFeedback -> feedbackGain -> delay
    this.pitchMixer.connect(this.hpFeedback);
    this.directDelayOut.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Pitch LFOs
    this.pitchLFO1.connect(this.pitchDepth1);
    this.pitchDepth1.connect(this.pitchDelay1.delayTime);
    this.pitchLFO2.connect(this.pitchDepth2);
    this.pitchDepth2.connect(this.pitchDelay2.delayTime);

    // Analog modulation
    this.modLFO.connect(this.modDepthGain);
    this.modDepthGain.connect(this.delay.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial interval
    this._applyInterval(this.currentInterval);
  }

  _applyInterval(interval) {
    const now = this.audioContext.currentTime;
    const ratio = this.intervalPresets[interval] || 2.0;

    // Modulate pitch delay LFO rates based on ratio
    // Higher ratio = faster LFO modulation
    const baseLfoRate = Math.abs(Math.log2(ratio)) * 15;
    this.pitchLFO1.frequency.setTargetAtTime(baseLfoRate, now, this.glideTime);
    this.pitchLFO2.frequency.setTargetAtTime(baseLfoRate * 1.01, now, this.glideTime);

    // Adjust depth based on direction
    const depth = ratio > 1 ? 0.006 : 0.008;
    this.pitchDepth1.gain.setTargetAtTime(depth, now, this.glideTime);
    this.pitchDepth2.gain.setTargetAtTime(depth * 0.9, now, this.glideTime);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 1.78, now, 0.01);
        break;
      case 'regen':
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.93, now, 0.01);
        break;
      case 'mix':
        this.wetLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'glide':
        // 0-100 -> 5ms to 500ms glide time
        this.glideTime = 0.005 + (value / 100) * 0.495;
        break;
      case 'interval':
        this.currentInterval = value;
        this._applyInterval(value);
        break;
      case 'interval1':
        {
          // Interval 1 controls pitch delay 1 modulation rate
          const rate1 = 0.1 + (value / 100) * 4.9;
          this.pitchLFO1.frequency.setTargetAtTime(rate1, now, 0.01);
          const depth1 = (value / 100) * 0.002;
          this.pitchGain1.gain.setTargetAtTime(depth1, now, 0.01);
        }
        break;
      case 'interval2':
        {
          // Interval 2 controls pitch delay 2 modulation rate
          const rate2 = 0.1 + (value / 100) * 4.9;
          this.pitchLFO2.frequency.setTargetAtTime(rate2, now, 0.01);
          const depth2 = (value / 100) * 0.002;
          this.pitchGain2.gain.setTargetAtTime(depth2, now, 0.01);
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
      this.analogLPF1.disconnect();
      this.analogLPF2.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.pitchDelay1.disconnect();
      this.pitchDelay2.disconnect();
      this.pitchGain1.disconnect();
      this.pitchGain2.disconnect();
      this.pitchLFO1.stop();
      this.pitchLFO1.disconnect();
      this.pitchDepth1.disconnect();
      this.pitchLFO2.stop();
      this.pitchLFO2.disconnect();
      this.pitchDepth2.disconnect();
      this.pitchAAFilter.disconnect();
      this.pitchMixer.disconnect();
      this.directDelayOut.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.wetLevel.disconnect();
    } catch (e) {}
  }
}

export default ChaseBlissThermaeEffect;
