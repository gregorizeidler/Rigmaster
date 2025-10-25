import BaseEffect from './BaseEffect';

class BossBF2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss BF-2', 'bossbf2');
    
    // BOSS BF-2 FLANGER (1980)
    // Classic flanger - jet-plane sound
    // Used by Andy Summers, The Cure
    
    // Delay line (short for flanging)
    this.delay = audioContext.createDelay(0.02); // Max 20ms
    this.delay.delayTime.value = 0.005; // 5ms base
    
    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.7; // High feedback for flanger
    
    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfoDepth = audioContext.createGain();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.3; // Slow sweep
    this.lfoDepth.gain.value = 0.003; // 3ms modulation
    this.lfo.start();
    
    // Wet/Dry
    this.wetGainNode = audioContext.createGain();
    this.wetGainNode.gain.value = 0.7;
    
    // Chain
    this.input.connect(this.delay);
    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay); // Feedback loop
    
    this.delay.connect(this.wetGainNode);
    this.wetGainNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // LFO modulation
    this.lfo.connect(this.lfoDepth);
    this.lfoDepth.connect(this.delay.delayTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'manual':
        // Manual delay time control
        this.delay.delayTime.setTargetAtTime(0.001 + (value / 100) * 0.015, now, 0.01);
        break;
      case 'depth':
        this.lfoDepth.gain.setTargetAtTime(value / 100 * 0.008, now, 0.01);
        break;
      case 'rate':
        this.lfo.frequency.setTargetAtTime(0.05 + (value / 100) * 5, now, 0.01);
        break;
      case 'res':
        // Resonance (feedback)
        this.feedbackGain.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        break;
      case 'mix':
        this.updateMix(value);
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
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepth.disconnect();
      this.wetGainNode.disconnect();
    } catch (e) {}
  }
}

export default BossBF2Effect;

