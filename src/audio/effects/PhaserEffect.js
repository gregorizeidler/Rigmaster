import BaseEffect from './BaseEffect';

class PhaserEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Phaser', 'phaser');
    
    // PROFESSIONAL PHASER - 8 allpass stages with feedback and stereo
    
    // Splitter/Merger for stereo
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Input gain
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;
    
    // Left channel filters (8 stages)
    this.filtersLeft = [];
    for (let i = 0; i < 8; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 200 + (i * 200); // Spread frequencies
      filter.Q.value = 5; // Moderate Q
      this.filtersLeft.push(filter);
    }
    
    // Right channel filters (8 stages, slightly detuned for stereo width)
    this.filtersRight = [];
    for (let i = 0; i < 8; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 220 + (i * 200); // Slightly detuned
      filter.Q.value = 5;
      this.filtersRight.push(filter);
    }
    
    // LFO for modulation
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5; // 0.5 Hz
    
    // LFO gain (controls depth)
    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 800; // 800 Hz modulation depth
    
    // Connect LFO to all filters
    this.lfo.connect(this.lfoGain);
    this.filtersLeft.forEach(filter => {
      this.lfoGain.connect(filter.frequency);
    });
    this.filtersRight.forEach(filter => {
      this.lfoGain.connect(filter.frequency);
    });
    
    // Feedback loop (regeneration)
    this.feedbackLeft = audioContext.createGain();
    this.feedbackRight = audioContext.createGain();
    this.feedbackLeft.gain.value = 0.5;
    this.feedbackRight.gain.value = 0.5;
    
    // Output gains
    this.leftGain = audioContext.createGain();
    this.rightGain = audioContext.createGain();
    this.leftGain.gain.value = 1.0;
    this.rightGain.gain.value = 1.0;
    
    // ROUTING:
    // Split input to L/R
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.splitter);
    
    // LEFT CHANNEL:
    // splitter[0] -> filters (8 stages) -> feedback -> back to first filter
    this.splitter.connect(this.filtersLeft[0], 0);
    for (let i = 0; i < this.filtersLeft.length - 1; i++) {
      this.filtersLeft[i].connect(this.filtersLeft[i + 1]);
    }
    // Feedback loop
    this.filtersLeft[this.filtersLeft.length - 1].connect(this.feedbackLeft);
    this.feedbackLeft.connect(this.filtersLeft[0]);
    // Output
    this.filtersLeft[this.filtersLeft.length - 1].connect(this.leftGain);
    this.leftGain.connect(this.merger, 0, 0);
    
    // RIGHT CHANNEL:
    // splitter[1] -> filters (8 stages) -> feedback -> back to first filter
    this.splitter.connect(this.filtersRight[0], 1);
    for (let i = 0; i < this.filtersRight.length - 1; i++) {
      this.filtersRight[i].connect(this.filtersRight[i + 1]);
    }
    // Feedback loop
    this.filtersRight[this.filtersRight.length - 1].connect(this.feedbackRight);
    this.feedbackRight.connect(this.filtersRight[0]);
    // Output
    this.filtersRight[this.filtersRight.length - 1].connect(this.rightGain);
    this.rightGain.connect(this.merger, 0, 1);
    
    // Final wet output
    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Start LFO
    this.lfo.start();
    this.setMix(0.5);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'rate':
        // 0.1 Hz to 5 Hz
        const rate = 0.1 + (value / 100) * 4.9;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        break;
      case 'depth':
        // 100 Hz to 2000 Hz modulation depth
        const depth = 100 + (value / 100) * 1900;
        this.lfoGain.gain.setTargetAtTime(depth, now, 0.01);
        break;
      case 'feedback':
        // 0% to 95% feedback (regeneration)
        const fb = (value / 100) * 0.95;
        this.feedbackLeft.gain.setTargetAtTime(fb, now, 0.01);
        this.feedbackRight.gain.setTargetAtTime(fb, now, 0.01);
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
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.inputGain.disconnect();
    this.splitter.disconnect();
    this.merger.disconnect();
    this.feedbackLeft.disconnect();
    this.feedbackRight.disconnect();
    this.leftGain.disconnect();
    this.rightGain.disconnect();
    this.filtersLeft.forEach(filter => filter.disconnect());
    this.filtersRight.forEach(filter => filter.disconnect());
  }
}

export default PhaserEffect;

