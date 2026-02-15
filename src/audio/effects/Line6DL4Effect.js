import BaseEffect from './BaseEffect';

class Line6DL4Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Line 6 DL4', 'line6dl4');
    
    // LINE 6 DL4 - Legendary delay modeler
    // 16 delay models, looper function
    
    // Main delay
    this.delay = audioContext.createDelay(2.5); // Max 2.5 seconds
    this.delay.delayTime.value = 0.5;
    
    // Feedback
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.5;
    
    // Tape-style filter (darkening)
    this.tapeFilter = audioContext.createBiquadFilter();
    this.tapeFilter.type = 'lowpass';
    this.tapeFilter.frequency.value = 5000;
    this.tapeFilter.Q.value = 0.7;
    
    // Modulation (tape flutter/wow)
    this.modLFO = audioContext.createOscillator();
    this.modDepth = audioContext.createGain();
    this.modLFO.type = 'triangle';
    this.modLFO.frequency.value = 0.3;
    this.modDepth.gain.value = 0.003;
    this.modLFO.start();
    
    // Tweez (tweakable parameter - varies by mode)
    this.tweezGain = audioContext.createGain();
    this.tweezGain.gain.value = 1.0;
    
    // Highpass filter (80Hz) in feedback loop to prevent bass buildup
    this.hpFeedback = audioContext.createBiquadFilter();
    this.hpFeedback.type = 'highpass';
    this.hpFeedback.frequency.value = 80;
    this.hpFeedback.Q.value = 0.707;
    
    // DC blocker (highpass 10Hz) after feedback path
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Mix
    this.wetGainNode = audioContext.createGain();
    this.wetGainNode.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.delay);
    this.delay.connect(this.tapeFilter);
    this.tapeFilter.connect(this.tweezGain);
    this.tweezGain.connect(this.hpFeedback);
    this.hpFeedback.connect(this.feedback);
    this.feedback.connect(this.delay); // Feedback loop
    
    this.tweezGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGainNode);
    this.wetGainNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Modulation
    this.modLFO.connect(this.modDepth);
    this.modDepth.connect(this.delay.delayTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        this.delay.delayTime.setTargetAtTime(0.02 + (value / 100) * 2.48, now, 0.01);
        break;
      case 'repeats':
        this.feedback.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetGainNode.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tweez':
        // Tweez parameter (varies by mode: tone, mod depth, etc)
        this.tweezGain.gain.setTargetAtTime(0.5 + (value / 100) * 1.5, now, 0.01);
        this.modDepth.gain.setTargetAtTime(value / 100 * 0.008, now, 0.01);
        break;
      case 'mode':
        // Mode selector: Tube Echo, Tape Echo, Multi-head, etc
        if (value < 25) {
          // Tube Echo mode
          this.tapeFilter.frequency.setTargetAtTime(4000, now, 0.01);
          this.modDepth.gain.setTargetAtTime(0.002, now, 0.01);
        } else if (value < 50) {
          // Tape Echo mode
          this.tapeFilter.frequency.setTargetAtTime(5000, now, 0.01);
          this.modDepth.gain.setTargetAtTime(0.005, now, 0.01);
        } else if (value < 75) {
          // Multi-head mode
          this.tapeFilter.frequency.setTargetAtTime(6000, now, 0.01);
        } else {
          // Sweep Echo mode
          this.tapeFilter.frequency.setTargetAtTime(8000, now, 0.01);
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
      this.feedback.disconnect();
      this.tapeFilter.disconnect();
      this.hpFeedback.disconnect();
      this.dcBlocker.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepth.disconnect();
      this.tweezGain.disconnect();
      this.wetGainNode.disconnect();
    } catch (e) {}
  }
}

export default Line6DL4Effect;

