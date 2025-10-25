import BaseEffect from './BaseEffect';

class MXRCarbonCopyEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR Carbon Copy', 'mxrcarboncopy');
    
    // MXR CARBON COPY (2006)
    // Modern analog delay - warm, dark repeats
    // Used by John Mayer, The Edge
    
    // Delay line
    this.delay = audioContext.createDelay(0.6); // Max 600ms (analog range)
    this.delay.delayTime.value = 0.375;
    
    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.5;
    
    // Analog darkening filters (multiple stages)
    this.lpf1 = audioContext.createBiquadFilter();
    this.lpf2 = audioContext.createBiquadFilter();
    this.lpf1.type = 'lowpass';
    this.lpf2.type = 'lowpass';
    this.lpf1.frequency.value = 3500;
    this.lpf2.frequency.value = 5000;
    this.lpf1.Q.value = 0.707;
    this.lpf2.Q.value = 0.5;
    
    // Modulation (subtle chorus on repeats)
    this.modLFO = audioContext.createOscillator();
    this.modDepth = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.3;
    this.modDepth.gain.value = 0.002; // Very subtle
    this.modLFO.start();
    
    // Wet mix
    this.wetGainNode = audioContext.createGain();
    this.wetGainNode.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.delay);
    this.delay.connect(this.lpf1);
    this.lpf1.connect(this.lpf2);
    this.lpf2.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay); // Feedback loop
    
    this.lpf2.connect(this.wetGainNode);
    this.wetGainNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Modulation
    this.modLFO.connect(this.modDepth);
    this.modDepth.connect(this.delay.delayTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'delay':
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 0.58, now, 0.01);
        break;
      case 'regen':
        this.feedbackGain.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetGainNode.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mod':
        // Modulation toggle/depth
        this.modDepth.gain.setTargetAtTime(value / 100 * 0.005, now, 0.01);
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
      this.lpf1.disconnect();
      this.lpf2.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepth.disconnect();
      this.wetGainNode.disconnect();
    } catch (e) {}
  }
}

export default MXRCarbonCopyEffect;

