import BaseEffect from './BaseEffect';

class DelayEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Delay', 'delay');
    
    // PROFESSIONAL STEREO PING-PONG DELAY
    // Left and Right channels with cross-feedback
    
    // Splitter/Merger for stereo
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Left channel delay
    this.delayLeft = audioContext.createDelay(5.0);
    this.delayLeft.delayTime.value = 0.5;
    
    // Right channel delay
    this.delayRight = audioContext.createDelay(5.0);
    this.delayRight.delayTime.value = 0.5;
    
    // Feedback gains
    this.feedbackLeft = audioContext.createGain();
    this.feedbackRight = audioContext.createGain();
    this.feedbackLeft.gain.value = 0.4;
    this.feedbackRight.gain.value = 0.4;
    
    // Cross-feedback gains (for ping-pong effect)
    this.crossFeedbackL2R = audioContext.createGain();
    this.crossFeedbackR2L = audioContext.createGain();
    this.crossFeedbackL2R.gain.value = 0.3; // Ping-pong amount
    this.crossFeedbackR2L.gain.value = 0.3;
    
    // Lowpass filters (emulate tape echo degradation)
    this.filterLeft = audioContext.createBiquadFilter();
    this.filterRight = audioContext.createBiquadFilter();
    this.filterLeft.type = 'lowpass';
    this.filterRight.type = 'lowpass';
    this.filterLeft.frequency.value = 4000;
    this.filterRight.frequency.value = 4000;
    
    // Highpass filters (prevent bass buildup in feedback)
    this.hpFilterLeft = audioContext.createBiquadFilter();
    this.hpFilterRight = audioContext.createBiquadFilter();
    this.hpFilterLeft.type = 'highpass';
    this.hpFilterRight.type = 'highpass';
    this.hpFilterLeft.frequency.value = 80;
    this.hpFilterRight.frequency.value = 80;
    this.hpFilterLeft.Q.value = 0.707;
    this.hpFilterRight.Q.value = 0.707;
    
    // LFO for tape-style modulation (subtle pitch variation)
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5; // 0.5 Hz wobble
    this.lfoGain.gain.value = 0.001; // Very subtle (1ms modulation)
    this.lfo.connect(this.lfoGain);
    this.lfo.start();
    
    // Output gains
    this.leftGain = audioContext.createGain();
    this.rightGain = audioContext.createGain();
    this.leftGain.gain.value = 0.7;
    this.rightGain.gain.value = 0.7;
    
    // ROUTING:
    // Input -> Split to L/R
    this.input.connect(this.splitter);
    
    // LEFT CHANNEL:
    // splitter[0] -> delayLeft -> filterLeft -> hpFilterLeft -> [feedback + cross-feedback]
    this.splitter.connect(this.delayLeft, 0);
    this.delayLeft.connect(this.filterLeft);
    this.filterLeft.connect(this.hpFilterLeft);
    
    // Left feedback loop (stays in left)
    this.hpFilterLeft.connect(this.feedbackLeft);
    this.feedbackLeft.connect(this.delayLeft);
    
    // Left -> Right cross-feedback (ping-pong)
    this.hpFilterLeft.connect(this.crossFeedbackL2R);
    this.crossFeedbackL2R.connect(this.delayRight);
    
    // Left output
    this.hpFilterLeft.connect(this.leftGain);
    this.leftGain.connect(this.merger, 0, 0);
    
    // RIGHT CHANNEL:
    // splitter[1] -> delayRight -> filterRight -> hpFilterRight -> [feedback + cross-feedback]
    this.splitter.connect(this.delayRight, 1);
    this.delayRight.connect(this.filterRight);
    this.filterRight.connect(this.hpFilterRight);
    
    // Right feedback loop (stays in right)
    this.hpFilterRight.connect(this.feedbackRight);
    this.feedbackRight.connect(this.delayRight);
    
    // Right -> Left cross-feedback (ping-pong)
    this.hpFilterRight.connect(this.crossFeedbackR2L);
    this.crossFeedbackR2L.connect(this.delayLeft);
    
    // Right output
    this.hpFilterRight.connect(this.rightGain);
    this.rightGain.connect(this.merger, 0, 1);
    
    // LFO modulation (connects to both delay times for tape wobble)
    this.lfoGain.connect(this.delayLeft.delayTime);
    this.lfoGain.connect(this.delayRight.delayTime);
    
    // Final wet output
    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'time':
        // Set both L/R delays (sync or offset for ping-pong)
        const delayTime = value / 1000; // ms to seconds
        this.delayLeft.delayTime.setTargetAtTime(delayTime, now, 0.01);
        this.delayRight.delayTime.setTargetAtTime(delayTime, now, 0.01);
        break;
      case 'feedback':
        // Control feedback amount (both channels)
        const fb = value / 100;
        this.feedbackLeft.gain.setTargetAtTime(fb, now, 0.01);
        this.feedbackRight.gain.setTargetAtTime(fb, now, 0.01);
        // Adjust cross-feedback for ping-pong intensity
        const crossFb = fb * 0.7; // Cross-feedback is 70% of main feedback
        this.crossFeedbackL2R.gain.setTargetAtTime(crossFb, now, 0.01);
        this.crossFeedbackR2L.gain.setTargetAtTime(crossFb, now, 0.01);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      case 'tone':
        // Control lowpass filter (tape echo darkness)
        const cutoff = 1000 + (value * 50); // 1kHz to 6kHz
        this.filterLeft.frequency.setTargetAtTime(cutoff, now, 0.01);
        this.filterRight.frequency.setTargetAtTime(cutoff, now, 0.01);
        break;
      case 'modulation':
        // Control LFO depth (tape wobble amount)
        const modDepth = (value / 100) * 0.003; // 0 to 3ms
        this.lfoGain.gain.setTargetAtTime(modDepth, now, 0.01);
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
    this.splitter.disconnect();
    this.merger.disconnect();
    this.delayLeft.disconnect();
    this.delayRight.disconnect();
    this.feedbackLeft.disconnect();
    this.feedbackRight.disconnect();
    this.crossFeedbackL2R.disconnect();
    this.crossFeedbackR2L.disconnect();
    this.filterLeft.disconnect();
    this.filterRight.disconnect();
    this.hpFilterLeft.disconnect();
    this.hpFilterRight.disconnect();
    this.leftGain.disconnect();
    this.rightGain.disconnect();
  }
}

export default DelayEffect;

