import BaseEffect from './BaseEffect';

/**
 * EHXSmallStoneEffect - Electro-Harmonix Small Stone Phaser
 * 
 * Classic 4-stage phaser with distinctive color switch.
 * Known for warm, lush phasing since 1974.
 * 
 * Features:
 * - 4-stage allpass filter network
 * - Color switch adds feedback for more intense phasing
 * - Single rate knob for simplicity
 * - Warm analog-style tone
 */

class EHXSmallStoneEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Small Stone', 'ehxsmallstone');

    // 4-stage allpass filter chain
    this.allpass = [];
    const baseFreqs = [200, 500, 1200, 3500];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = baseFreqs[i];
      filter.Q.value = 0.6;
      this.allpass.push(filter);
    }

    // LFO — triangle wave for smooth sweep
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.4;

    // LFO depth per stage (slightly different for organic sweep)
    this.lfoDepths = [];
    const depthValues = [600, 800, 1500, 3000];
    for (let i = 0; i < 4; i++) {
      const gain = audioContext.createGain();
      gain.gain.value = depthValues[i];
      this.lfoDepths.push(gain);
    }

    // Feedback gain for color switch
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.0; // Color OFF by default

    // Output mixing gain
    this.phaseOutGain = audioContext.createGain();
    this.phaseOutGain.gain.value = 0.7;

    // Warmth filter (subtle high-cut to emulate analog)
    this.warmthFilter = audioContext.createBiquadFilter();
    this.warmthFilter.type = 'lowpass';
    this.warmthFilter.frequency.value = 9000;
    this.warmthFilter.Q.value = 0.5;

    // Chain allpass filters in series
    this.input.connect(this.allpass[0]);
    for (let i = 0; i < 3; i++) {
      this.allpass[i].connect(this.allpass[i + 1]);
    }

    // Feedback from last stage back to first
    this.allpass[3].connect(this.feedbackGain);
    this.feedbackGain.connect(this.allpass[0]);

    // Output path: last allpass -> warmth -> phaseOut -> wetGain
    this.allpass[3].connect(this.warmthFilter);
    this.warmthFilter.connect(this.phaseOutGain);
    this.phaseOutGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // LFO modulation
    this.lfo.connect(this.lfoDepths[0]);
    this.lfo.connect(this.lfoDepths[1]);
    this.lfo.connect(this.lfoDepths[2]);
    this.lfo.connect(this.lfoDepths[3]);
    for (let i = 0; i < 4; i++) {
      this.lfoDepths[i].connect(this.allpass[i].frequency);
    }
    this.lfo.start();

    // Color state
    this.colorOn = false;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.05 to 6 Hz
        const rate = 0.05 + (value / 100) * 5.95;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        break;

      case 'color':
        // Toggle on/off — value is boolean or truthy
        this.colorOn = !!value;
        if (this.colorOn) {
          // High feedback for intense phasing with resonance
          this.feedbackGain.gain.setTargetAtTime(0.65, now, 0.02);
          // Boost sweep range slightly
          this.lfoDepths[0].gain.setTargetAtTime(900, now, 0.02);
          this.lfoDepths[1].gain.setTargetAtTime(1200, now, 0.02);
          this.lfoDepths[2].gain.setTargetAtTime(2200, now, 0.02);
          this.lfoDepths[3].gain.setTargetAtTime(4000, now, 0.02);
        } else {
          this.feedbackGain.gain.setTargetAtTime(0.0, now, 0.02);
          this.lfoDepths[0].gain.setTargetAtTime(600, now, 0.02);
          this.lfoDepths[1].gain.setTargetAtTime(800, now, 0.02);
          this.lfoDepths[2].gain.setTargetAtTime(1500, now, 0.02);
          this.lfoDepths[3].gain.setTargetAtTime(3000, now, 0.02);
        }
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.allpass.forEach(f => f.disconnect());
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepths.forEach(g => g.disconnect());
      this.feedbackGain.disconnect();
      this.phaseOutGain.disconnect();
      this.warmthFilter.disconnect();
    } catch (e) {}
  }
}

export default EHXSmallStoneEffect;
