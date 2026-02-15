import BaseEffect from './BaseEffect';

/**
 * MXRPhase100Effect - MXR Phase 100
 * 
 * 10-stage phaser with 4 intensity settings.
 * More versatile than the Phase 90, used by prog-rock and funk players.
 * 
 * Features:
 * - 10 allpass stages for deep sweeping
 * - 4 intensity settings controlling feedback and depth
 * - Wide frequency sweep range
 * - Triangle LFO for smooth modulation
 */

class MXRPhase100Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR Phase 100', 'mxrphase100');

    // 10-stage allpass filter chain
    this.allpass = [];
    for (let i = 0; i < 10; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      // Spread frequencies logarithmically across audio range
      filter.frequency.value = 200 + Math.pow(1.5, i) * 50;
      filter.Q.value = 0.5;
      this.allpass.push(filter);
    }

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.4;

    // LFO depth controls for each filter
    this.lfoDepths = [];
    for (let i = 0; i < 10; i++) {
      const gain = audioContext.createGain();
      gain.gain.value = 400 + i * 200;
      this.lfoDepths.push(gain);
    }

    // Feedback network
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.3;

    // Feedback limiter to prevent runaway oscillation
    this.feedbackLimiter = audioContext.createDynamicsCompressor();
    this.feedbackLimiter.threshold.value = -6;
    this.feedbackLimiter.ratio.value = 12;
    this.feedbackLimiter.attack.value = 0.001;
    this.feedbackLimiter.release.value = 0.05;

    // Phase output gain
    this.phaseOutGain = audioContext.createGain();
    this.phaseOutGain.gain.value = 0.65;

    // Chain allpass filters
    this.input.connect(this.allpass[0]);
    for (let i = 0; i < 9; i++) {
      this.allpass[i].connect(this.allpass[i + 1]);
    }

    // Feedback loop with limiter
    this.allpass[9].connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.allpass[0]);

    // Output
    this.allpass[9].connect(this.phaseOutGain);
    this.phaseOutGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // LFO modulation to all allpass frequencies
    for (let i = 0; i < 10; i++) {
      this.lfo.connect(this.lfoDepths[i]);
      this.lfoDepths[i].connect(this.allpass[i].frequency);
    }
    this.lfo.start();

    // Intensity setting: 1-4
    this.intensity = 1;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 0.05 to 10 Hz
        const speed = 0.05 + (value / 100) * 9.95;
        this.lfo.frequency.setTargetAtTime(speed, now, 0.01);
        break;

      case 'intensity':
        // 1, 2, 3, or 4
        this.intensity = Math.max(1, Math.min(4, Math.round(value)));
        this._applyIntensity(now);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  _applyIntensity(now) {
    // Each intensity level changes feedback amount and LFO depth range
    const settings = {
      1: { feedback: 0.15, depthScale: 0.5 },
      2: { feedback: 0.35, depthScale: 0.75 },
      3: { feedback: 0.55, depthScale: 1.0 },
      4: { feedback: 0.75, depthScale: 1.5 }
    };

    const s = settings[this.intensity];
    this.feedbackGain.gain.setTargetAtTime(s.feedback, now, 0.02);

    for (let i = 0; i < 10; i++) {
      const baseDepth = 400 + i * 200;
      this.lfoDepths[i].gain.setTargetAtTime(baseDepth * s.depthScale, now, 0.02);
    }

    // Adjust output gain to compensate for increased resonance
    const outGain = 0.65 - (this.intensity - 1) * 0.08;
    this.phaseOutGain.gain.setTargetAtTime(outGain, now, 0.02);
  }

  disconnect() {
    super.disconnect();
    try {
      this.allpass.forEach(f => f.disconnect());
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepths.forEach(g => g.disconnect());
      this.feedbackGain.disconnect();
      this.feedbackLimiter.disconnect();
      this.phaseOutGain.disconnect();
    } catch (e) {}
  }
}

export default MXRPhase100Effect;
