import BaseEffect from './BaseEffect.js';

class TapDelayEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tap Delay', 'tapdelay');
    
    // TAP DELAY (Tap tempo synchronized delay)
    // Used for rhythmic delays synced to tempo
    
    // Input/Output
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Delay lines (4 taps)
    this.delay1 = audioContext.createDelay(5.0);
    this.delay2 = audioContext.createDelay(5.0);
    this.delay3 = audioContext.createDelay(5.0);
    this.delay4 = audioContext.createDelay(5.0);
    
    // Feedback
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.3;
    
    // Filters
    this.lowpass = audioContext.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 6000;
    
    this.highpass = audioContext.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 200;
    
    // Tap gains (individual tap volumes)
    this.tap1Gain = audioContext.createGain();
    this.tap2Gain = audioContext.createGain();
    this.tap3Gain = audioContext.createGain();
    this.tap4Gain = audioContext.createGain();
    
    // Default tap pattern (1/4, 1/8, dotted 1/8, 1/16)
    this.tap1Gain.gain.value = 1.0;
    this.tap2Gain.gain.value = 0.8;
    this.tap3Gain.gain.value = 0.6;
    this.tap4Gain.gain.value = 0.4;
    
    // BPM and timing
    this.bpm = 120;
    this.lastTapTime = 0;
    this.tapHistory = [];
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet signal
    this.inputGain.connect(this.delay1);
    this.delay1.connect(this.tap1Gain);
    this.tap1Gain.connect(this.wetGain);
    
    this.inputGain.connect(this.delay2);
    this.delay2.connect(this.tap2Gain);
    this.tap2Gain.connect(this.wetGain);
    
    this.inputGain.connect(this.delay3);
    this.delay3.connect(this.tap3Gain);
    this.tap3Gain.connect(this.wetGain);
    
    this.inputGain.connect(this.delay4);
    this.delay4.connect(this.tap4Gain);
    this.tap4Gain.connect(this.wetGain);
    
    // Feedback loop
    this.wetGain.connect(this.feedback);
    this.feedback.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.delay1);
    
    this.wetGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Initialize
    this.setBPM(120);
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 1.0;
    
    this.params = {
      mix: 50,
      time: 500,
      feedback: 30,
      bpm: 120,
      subdivision: 4, // 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth
      dotted: false,
      triplet: false,
      tap1: 100,
      tap2: 80,
      tap3: 60,
      tap4: 40
    };
  }
  
  setBPM(bpm) {
    this.bpm = Math.max(20, Math.min(300, bpm));
    this.updateDelayTimes();
  }
  
  tap() {
    const now = Date.now();
    
    if (this.lastTapTime > 0) {
      const interval = now - this.lastTapTime;
      this.tapHistory.push(interval);
      
      // Keep last 4 taps
      if (this.tapHistory.length > 4) {
        this.tapHistory.shift();
      }
      
      // Calculate average
      if (this.tapHistory.length >= 2) {
        const avgInterval = this.tapHistory.reduce((a, b) => a + b, 0) / this.tapHistory.length;
        const calculatedBPM = 60000 / avgInterval;
        this.setBPM(calculatedBPM);
        this.params.bpm = Math.round(calculatedBPM);
      }
    }
    
    this.lastTapTime = now;
  }
  
  updateDelayTimes() {
    const beatTime = 60 / this.bpm; // Time per beat in seconds
    let subdivision = this.params.subdivision || 4;
    
    // Base time for subdivision
    let baseTime = beatTime * (4 / subdivision);
    
    // Apply dotted or triplet
    if (this.params.dotted) {
      baseTime *= 1.5;
    } else if (this.params.triplet) {
      baseTime *= (2/3);
    }
    
    // Set tap times (rhythmic pattern)
    this.delay1.delayTime.value = baseTime;
    this.delay2.delayTime.value = baseTime * 2;
    this.delay3.delayTime.value = baseTime * 3;
    this.delay4.delayTime.value = baseTime * 4;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'mix':
        this.wetGain.gain.setTargetAtTime(value / 100, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - (value / 100), now, 0.01);
        break;
      case 'time':
        // Manual time override (ms)
        const timeInSeconds = value / 1000;
        this.delay1.delayTime.setTargetAtTime(timeInSeconds, now, 0.01);
        break;
      case 'feedback':
        this.feedback.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'bpm':
        this.setBPM(value);
        break;
      case 'subdivision':
        this.params.subdivision = value;
        this.updateDelayTimes();
        break;
      case 'dotted':
        this.params.dotted = value;
        this.updateDelayTimes();
        break;
      case 'triplet':
        this.params.triplet = value;
        this.updateDelayTimes();
        break;
      case 'tap1':
        this.tap1Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tap2':
        this.tap2Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tap3':
        this.tap3Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tap4':
        this.tap4Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.delay3.disconnect();
    this.delay4.disconnect();
    this.feedback.disconnect();
    this.lowpass.disconnect();
    this.highpass.disconnect();
    this.tap1Gain.disconnect();
    this.tap2Gain.disconnect();
    this.tap3Gain.disconnect();
    this.tap4Gain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default TapDelayEffect;

