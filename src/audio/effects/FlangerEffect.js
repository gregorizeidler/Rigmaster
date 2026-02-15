import BaseEffect from './BaseEffect';

class FlangerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Flanger', 'flanger');

    const now = audioContext.currentTime;

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();

    // Delay line - max 20ms for flanging (not 1.0s which wastes memory)
    this.delay = audioContext.createDelay(0.02);

    // Feedback gain
    this.feedback = audioContext.createGain();

    // DC blocker in feedback loop: highpass at 10Hz prevents DC buildup
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.7;

    // Bass cut in feedback loop: highpass at 80Hz prevents bass buildup
    this.bassCut = audioContext.createBiquadFilter();
    this.bassCut.type = 'highpass';
    this.bassCut.frequency.value = 80;
    this.bassCut.Q.value = 0.7;

    // Setup with smooth parameter initialization
    this.lfo.type = 'triangle';
    this.lfo.frequency.setTargetAtTime(0.25, now, 0.02);
    this.lfoGain.gain.setTargetAtTime(0.002, now, 0.02);
    this.delay.delayTime.setTargetAtTime(0.003, now, 0.02);
    this.feedback.gain.setTargetAtTime(0.5, now, 0.02);

    // Connect LFO → delay modulation
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);

    // Audio chain: input → delay → wetGain → output
    this.input.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback loop with DC blocker and bass cut:
    // delay → feedback → dcBlocker → bassCut → delay
    this.delay.connect(this.feedback);
    this.feedback.connect(this.dcBlocker);
    this.dcBlocker.connect(this.bassCut);
    this.bassCut.connect(this.delay);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.lfo.start();
    this.setMix(0.5);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'rate':
        this.lfo.frequency.setTargetAtTime(value / 40, now, 0.02);
        break;
      case 'depth':
        this.lfoGain.gain.setTargetAtTime(value / 5000, now, 0.02);
        break;
      case 'feedback':
        // Clamp feedback to prevent runaway oscillation
        this.feedback.gain.setTargetAtTime(Math.min(value / 100, 0.95), now, 0.02);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    try { this.lfo.stop(); } catch (e) {}
    try { this.lfo.disconnect(); } catch (e) {}
    try { this.lfoGain.disconnect(); } catch (e) {}
    try { this.delay.disconnect(); } catch (e) {}
    try { this.feedback.disconnect(); } catch (e) {}
    try { this.dcBlocker.disconnect(); } catch (e) {}
    try { this.bassCut.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default FlangerEffect;
