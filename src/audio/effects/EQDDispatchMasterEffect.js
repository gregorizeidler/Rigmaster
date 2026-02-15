import BaseEffect from './BaseEffect';

class EQDDispatchMasterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EQD Dispatch Master', 'eqddispatchmaster');

    // EARTHQUAKER DEVICES DISPATCH MASTER (2013)
    // Combined delay + reverb — simple but lush
    // Used by: many indie/ambient guitarists

    // =====================
    // DELAY SECTION
    // =====================
    this.delay = audioContext.createDelay(1.5);
    this.delay.delayTime.value = 0.4;

    this.delayFeedback = audioContext.createGain();
    this.delayFeedback.gain.value = 0.4;

    // Feedback LPF — darkening
    this.delayLPF = audioContext.createBiquadFilter();
    this.delayLPF.type = 'lowpass';
    this.delayLPF.frequency.value = 3500;
    this.delayLPF.Q.value = 0.707;

    // HPF in delay feedback (60Hz)
    this.delayHPF = audioContext.createBiquadFilter();
    this.delayHPF.type = 'highpass';
    this.delayHPF.frequency.value = 60;
    this.delayHPF.Q.value = 0.707;

    // Subtle delay modulation
    this.delayLFO = audioContext.createOscillator();
    this.delayModDepth = audioContext.createGain();
    this.delayLFO.type = 'sine';
    this.delayLFO.frequency.value = 0.25;
    this.delayModDepth.gain.value = 0.001;
    this.delayLFO.start();

    // =====================
    // REVERB SECTION (Schroeder-style)
    // =====================
    // Pre-delay for reverb
    this.reverbPreDelay = audioContext.createDelay(0.1);
    this.reverbPreDelay.delayTime.value = 0.025;

    // 4 parallel comb filters
    this.combDelayTimes = [0.0297, 0.0347, 0.0407, 0.0453];
    this.combFilters = [];
    this.combGains = [];

    for (let i = 0; i < 4; i++) {
      const combDelay = audioContext.createDelay(0.1);
      combDelay.delayTime.value = this.combDelayTimes[i];
      const combFB = audioContext.createGain();
      combFB.gain.value = 0.82;
      const combDamping = audioContext.createBiquadFilter();
      combDamping.type = 'lowpass';
      combDamping.frequency.value = 5000;
      combDamping.Q.value = 0.707;
      const combOut = audioContext.createGain();
      combOut.gain.value = 0.25;

      this.combFilters.push({ delay: combDelay, feedback: combFB, damping: combDamping });
      this.combGains.push(combOut);
    }

    // Comb output mixer
    this.combMixer = audioContext.createGain();

    // 2 allpass filters for diffusion
    this.allpassDelayTimes = [0.0051, 0.0071];
    this.allpassFilters = [];
    for (let i = 0; i < 2; i++) {
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

    // Level controls
    this.delayLevel = audioContext.createGain();
    this.delayLevel.gain.value = 0.5;

    this.reverbLevel = audioContext.createGain();
    this.reverbLevel.gain.value = 0.3;

    this.masterWet = audioContext.createGain();
    this.masterWet.gain.value = 0.5;

    // === DELAY ROUTING ===
    this.input.connect(this.delay);
    this.delay.connect(this.delayLPF);
    this.delayLPF.connect(this.delayLevel);

    // Delay feedback loop
    this.delayLPF.connect(this.delayHPF);
    this.delayHPF.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);

    // Delay modulation
    this.delayLFO.connect(this.delayModDepth);
    this.delayModDepth.connect(this.delay.delayTime);

    // === REVERB ROUTING ===
    // Feed reverb from both dry and delay output
    this.input.connect(this.reverbPreDelay);
    this.delayLevel.connect(this.reverbPreDelay);

    // Pre-delay -> parallel comb filters -> mixer
    for (let i = 0; i < 4; i++) {
      const { delay: cDelay, feedback: cFB, damping: cDamp } = this.combFilters[i];
      const cOut = this.combGains[i];

      this.reverbPreDelay.connect(cDelay);
      cDelay.connect(cDamp);
      cDamp.connect(cFB);
      cFB.connect(cDelay);
      cDelay.connect(cOut);
      cOut.connect(this.combMixer);
    }

    // Comb mixer -> allpass chain
    this.combMixer.connect(this.allpassFilters[0].input);
    this.allpassFilters[0].output.connect(this.allpassFilters[1].input);

    // Allpass -> reverb output
    this.allpassFilters[1].output.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbLevel);

    // === MIX ===
    this.delayLevel.connect(this.masterWet);
    this.reverbLevel.connect(this.masterWet);
    this.masterWet.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 1.28, now, 0.01);
        break;
      case 'repeats':
        this.delayFeedback.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;
      case 'reverb':
        {
          // Scale comb feedback for reverb decay
          const fb = 0.65 + (value / 100) * 0.30;
          for (let i = 0; i < 4; i++) {
            this.combFilters[i].feedback.gain.setTargetAtTime(fb, now, 0.01);
          }
          this.reverbLevel.gain.setTargetAtTime(0.1 + (value / 100) * 0.7, now, 0.01);
        }
        break;
      case 'mix':
        this.masterWet.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delay.disconnect();
      this.delayFeedback.disconnect();
      this.delayLPF.disconnect();
      this.delayHPF.disconnect();
      this.delayLFO.stop();
      this.delayLFO.disconnect();
      this.delayModDepth.disconnect();
      this.reverbPreDelay.disconnect();
      for (let i = 0; i < 4; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].damping.disconnect();
        this.combGains[i].disconnect();
      }
      this.combMixer.disconnect();
      for (let i = 0; i < 2; i++) {
        this.allpassFilters[i].input.disconnect();
        this.allpassFilters[i].output.disconnect();
        this.allpassFilters[i].delay.disconnect();
        this.allpassFilters[i].fbGain.disconnect();
        this.allpassFilters[i].ffGain.disconnect();
      }
      this.reverbLPF.disconnect();
      this.reverbHPF.disconnect();
      this.dcBlocker.disconnect();
      this.delayLevel.disconnect();
      this.reverbLevel.disconnect();
      this.masterWet.disconnect();
    } catch (e) {}
  }
}

export default EQDDispatchMasterEffect;
