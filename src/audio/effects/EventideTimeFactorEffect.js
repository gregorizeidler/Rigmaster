import BaseEffect from './BaseEffect';

class EventideTimeFactorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Eventide TimeFactor', 'eventidetimefactor');
    
    // EVENTIDE TIMEFACTOR - Professional rack delay
    // 10 delay types, extensive modulation, filtering
    
    // Dual delay lines (stereo)
    this.delayL = audioContext.createDelay(10.0); // Max 10 seconds
    this.delayR = audioContext.createDelay(10.0);
    this.delayL.delayTime.value = 0.5;
    this.delayR.delayTime.value = 0.6; // Slightly offset for width
    
    // Feedback paths
    this.feedbackL = audioContext.createGain();
    this.feedbackR = audioContext.createGain();
    this.feedbackL.gain.value = 0.5;
    this.feedbackR.gain.value = 0.5;
    
    // Cross-feedback (L->R, R->L)
    this.crossFeedback = audioContext.createGain();
    this.crossFeedback.gain.value = 0;
    
    // Tone/Filter controls
    this.lpFilter = audioContext.createBiquadFilter();
    this.hpFilter = audioContext.createBiquadFilter();
    this.lpFilter.type = 'lowpass';
    this.hpFilter.type = 'highpass';
    this.lpFilter.frequency.value = 8000;
    this.hpFilter.frequency.value = 100;
    
    // Modulation (tape-style flutter)
    this.modLFO = audioContext.createOscillator();
    this.modDepth = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.5;
    this.modDepth.gain.value = 0.003;
    this.modLFO.start();
    
    // Diffusion (for ambient/shimmer modes)
    this.diffusion = audioContext.createConvolver();
    this.diffusionGain = audioContext.createGain();
    this.diffusionGain.gain.value = 0;
    
    // Mix controls
    this.wetL = audioContext.createGain();
    this.wetR = audioContext.createGain();
    this.wetL.gain.value = 0.5;
    this.wetR.gain.value = 0.5;
    
    // Splitter/Merger
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Chain
    this.input.connect(this.splitter);
    
    // Left channel
    this.splitter.connect(this.delayL, 0);
    this.delayL.connect(this.hpFilter);
    this.hpFilter.connect(this.lpFilter);
    this.lpFilter.connect(this.feedbackL);
    this.feedbackL.connect(this.delayL); // Feedback loop
    this.lpFilter.connect(this.wetL);
    this.wetL.connect(this.merger, 0, 0);
    
    // Right channel
    this.splitter.connect(this.delayR, 1);
    this.delayR.connect(this.feedbackR);
    this.feedbackR.connect(this.delayR); // Feedback loop
    this.delayR.connect(this.wetR);
    this.wetR.connect(this.merger, 0, 1);
    
    // Cross-feedback (optional)
    this.feedbackL.connect(this.crossFeedback);
    this.crossFeedback.connect(this.delayR);
    
    // Modulation
    this.modLFO.connect(this.modDepth);
    this.modDepth.connect(this.delayL.delayTime);
    this.modDepth.connect(this.delayR.delayTime);
    
    // Output
    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        this.delayL.delayTime.setTargetAtTime(0.01 + (value / 100) * 9.99, now, 0.01);
        this.delayR.delayTime.setTargetAtTime(0.015 + (value / 100) * 9.99, now, 0.01);
        break;
      case 'feedback':
        this.feedbackL.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(value / 100 * 0.95, now, 0.01);
        break;
      case 'mix':
        this.wetL.gain.setTargetAtTime(value / 100, now, 0.01);
        this.wetR.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'filter':
        this.lpFilter.frequency.setTargetAtTime(1000 + (value / 100) * 14000, now, 0.01);
        break;
      case 'modrate':
        this.modLFO.frequency.setTargetAtTime(0.1 + (value / 100) * 5, now, 0.01);
        break;
      case 'moddepth':
        this.modDepth.gain.setTargetAtTime(value / 100 * 0.02, now, 0.01);
        break;
      case 'xfeed':
        this.crossFeedback.gain.setTargetAtTime(value / 100 * 0.7, now, 0.01);
        break;
      case 'spread':
        const offset = (value / 100) * 0.1;
        this.delayR.delayTime.setTargetAtTime(
          this.delayL.delayTime.value + offset, now, 0.01
        );
        break;
      case 'flex':
        // Flex parameter (tape flutter intensity)
        this.modDepth.gain.setTargetAtTime(value / 100 * 0.01, now, 0.01);
        break;
      case 'depth':
        // Depth (diffusion amount for ambient modes)
        this.diffusionGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.feedbackL.disconnect();
      this.feedbackR.disconnect();
      this.crossFeedback.disconnect();
      this.lpFilter.disconnect();
      this.hpFilter.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepth.disconnect();
      this.wetL.disconnect();
      this.wetR.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
      this.diffusionGain.disconnect();
    } catch (e) {}
  }
}

export default EventideTimeFactorEffect;

