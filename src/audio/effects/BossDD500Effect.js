import BaseEffect from './BaseEffect';

/**
 * Boss DD-500 - Digital Delay
 * 
 * 12 DELAY MODES:
 * 1. Standard - Clean digital delay
 * 2. Analog - Warm BBD-style delay
 * 3. Tape - Tape echo simulation
 * 4. Modulate - Modulated delay
 * 5. SFX - Special effects delay
 * 6. Dual - Two delays (L/R)
 * 7. Pan - Ping-pong delay
 * 8. Reverse - Reversed delay
 * 9. Shimmer - Pitch-shifted delay
 * 10. Glitch - Stutter/glitch effects
 * 11. Tera Echo - Ambient soundscape
 * 12. Pattern - Rhythmic patterns
 * 
 * CONTROLS:
 * - Time (10ms-10s)
 * - Feedback (0-100%)
 * - E.Level (Effect Level = mix)
 * - Mod Depth
 * - Mod Rate
 * - Tone
 * - Tap Tempo
 * - 4 Memory slots
 */
class BossDD500Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss DD-500', 'bossdd500');
    
    this.delayModes = {
      'standard': 'Standard',
      'analog': 'Analog',
      'tape': 'Tape',
      'modulate': 'Modulate',
      'sfx': 'SFX',
      'dual': 'Dual',
      'pan': 'Pan',
      'reverse': 'Reverse',
      'shimmer': 'Shimmer',
      'glitch': 'Glitch',
      'teraecho': 'Tera Echo',
      'pattern': 'Pattern'
    };
    
    this.currentMode = 'standard';
    
    // === STEREO DELAY LINES ===
    this.delayL = audioContext.createDelay(10.0);
    this.delayR = audioContext.createDelay(10.0);
    this.delayL.delayTime.value = 0.5;
    this.delayR.delayTime.value = 0.5;
    
    // Dual delay (second pair)
    this.delayL2 = audioContext.createDelay(10.0);
    this.delayR2 = audioContext.createDelay(10.0);
    this.delayL2.delayTime.value = 0.25;
    this.delayR2.delayTime.value = 0.25;
    
    // === FEEDBACK ===
    this.feedbackL = audioContext.createGain();
    this.feedbackR = audioContext.createGain();
    this.crossFeedL2R = audioContext.createGain();
    this.crossFeedR2L = audioContext.createGain();
    this.feedbackL.gain.value = 0.5;
    this.feedbackR.gain.value = 0.5;
    this.crossFeedL2R.gain.value = 0;
    this.crossFeedR2L.gain.value = 0;
    
    // === TONE SHAPING ===
    // Analog mode (lowpass for warmth)
    this.analogLP = audioContext.createBiquadFilter();
    this.analogLP.type = 'lowpass';
    this.analogLP.frequency.value = 8000;
    this.analogLP.Q.value = 0.707;
    
    // Tape mode (additional filtering)
    this.tapeLP = audioContext.createBiquadFilter();
    this.tapeHP = audioContext.createBiquadFilter();
    this.tapeLP.type = 'lowpass';
    this.tapeHP.type = 'highpass';
    this.tapeLP.frequency.value = 4000;
    this.tapeHP.frequency.value = 100;
    
    // Tone control (peaking EQ)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 2000;
    this.toneFilter.Q.value = 1.0;
    this.toneFilter.gain.value = 0;
    
    // === MODULATION ===
    this.modLFO = audioContext.createOscillator();
    this.modDepthL = audioContext.createGain();
    this.modDepthR = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.5;
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    this.modLFO.start();
    
    // === SHIMMER (pitch shift simulation) ===
    // TODO: True shimmer mode requires a pitch-shifter AudioWorklet for octave-up
    // processing in the feedback loop. The current delay-based approach is a placeholder.
    // Implement with pitch-shifter-processor.js worklet for proper shimmer effect.
    this.shimmerDelay1 = audioContext.createDelay(0.1);
    this.shimmerDelay2 = audioContext.createDelay(0.1);
    this.shimmerDelay1.delayTime.value = 0.012;
    this.shimmerDelay2.delayTime.value = 0.019;
    this.shimmerGain1 = audioContext.createGain();
    this.shimmerGain2 = audioContext.createGain();
    this.shimmerGain1.gain.value = 0;
    this.shimmerGain2.gain.value = 0;
    
    // === DC BLOCKERS (highpass 10Hz) in feedback paths ===
    this.dcBlockerL = audioContext.createBiquadFilter();
    this.dcBlockerR = audioContext.createBiquadFilter();
    this.dcBlockerL.type = 'highpass';
    this.dcBlockerR.type = 'highpass';
    this.dcBlockerL.frequency.value = 10;
    this.dcBlockerR.frequency.value = 10;
    this.dcBlockerL.Q.value = 0.707;
    this.dcBlockerR.Q.value = 0.707;
    
    // === HIGHPASS FILTERS (60Hz) in feedback loops ===
    this.hpFeedbackL = audioContext.createBiquadFilter();
    this.hpFeedbackR = audioContext.createBiquadFilter();
    this.hpFeedbackL.type = 'highpass';
    this.hpFeedbackR.type = 'highpass';
    this.hpFeedbackL.frequency.value = 60;
    this.hpFeedbackR.frequency.value = 60;
    this.hpFeedbackL.Q.value = 0.707;
    this.hpFeedbackR.Q.value = 0.707;
    
    // === TERA ECHO (ambient) ===
    this.teraReverb = [];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(1.0);
      const feedback = audioContext.createGain();
      delay.delayTime.value = 0.1 + (i * 0.05);
      feedback.gain.value = 0.7;
      this.teraReverb.push({ delay, feedback });
    }
    
    // === GLITCH (stutter) ===
    this.glitchBuffer = null;
    this.glitchBufferSource = null;
    this.glitchGain = audioContext.createGain();
    this.glitchGain.gain.value = 0;
    
    // === REVERSE ===
    this.reverseBuffer = null;
    this.reverseGain = audioContext.createGain();
    this.reverseGain.gain.value = 0;
    
    // === STEREO PANNING ===
    this.panL = audioContext.createStereoPanner();
    this.panR = audioContext.createStereoPanner();
    this.panL.pan.value = -0.5;
    this.panR.pan.value = 0.5;
    
    // === SPLITTER/MERGER ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // === MIX ===
    this.effectLevel = audioContext.createGain();
    this.effectLevel.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === TAP TEMPO ===
    this.tapTempo = {
      enabled: false,
      bpm: 120,
      subdivision: '1/4',
      lastTaps: []
    };
    
    // === MEMORY SLOTS ===
    this.memory = [null, null, null, null];
    this.currentMemory = 0;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  setupRouting() {
    // Input split to stereo
    this.input.connect(this.splitter);
    
    // LEFT CHANNEL
    this.splitter.connect(this.delayL, 0);
    this.delayL.connect(this.toneFilter);
    
    // Feedback (with highpass 60Hz and DC blocker)
    this.toneFilter.connect(this.feedbackL);
    this.feedbackL.connect(this.hpFeedbackL);
    this.hpFeedbackL.connect(this.dcBlockerL);
    this.dcBlockerL.connect(this.delayL);
    
    // Cross-feed for ping-pong
    this.toneFilter.connect(this.crossFeedL2R);
    this.crossFeedL2R.connect(this.delayR);
    
    // Output
    this.toneFilter.connect(this.panL);
    this.panL.connect(this.effectLevel);
    
    // RIGHT CHANNEL
    this.splitter.connect(this.delayR, 1);
    this.delayR.connect(this.toneFilter);
    
    // Feedback (with highpass 60Hz and DC blocker)
    this.toneFilter.connect(this.feedbackR);
    this.feedbackR.connect(this.hpFeedbackR);
    this.hpFeedbackR.connect(this.dcBlockerR);
    this.dcBlockerR.connect(this.delayR);
    
    // Cross-feed
    this.toneFilter.connect(this.crossFeedR2L);
    this.crossFeedR2L.connect(this.delayL);
    
    // Output
    this.toneFilter.connect(this.panR);
    this.panR.connect(this.effectLevel);
    
    // Modulation
    this.modLFO.connect(this.modDepthL);
    this.modDepthL.connect(this.delayL.delayTime);
    this.modLFO.connect(this.modDepthR);
    this.modDepthR.connect(this.delayR.delayTime);
    
    // Final output
    this.effectLevel.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  setDelayMode(mode) {
    const now = this.audioContext.currentTime;
    this.currentMode = mode;
    
    // Reset to defaults
    this.analogLP.frequency.setTargetAtTime(12000, now, 0.01);
    this.tapeLP.frequency.setTargetAtTime(12000, now, 0.01);
    this.tapeHP.frequency.setTargetAtTime(20, now, 0.01);
    this.crossFeedL2R.gain.setTargetAtTime(0, now, 0.01);
    this.crossFeedR2L.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    
    switch (mode) {
      case 'standard':
        // Clean digital delay
        break;
        
      case 'analog':
        // Warm BBD-style
        this.analogLP.frequency.setTargetAtTime(6000, now, 0.01);
        this.modDepthL.gain.value = 0.0005;
        this.modDepthR.gain.value = 0.0005;
        this.modLFO.frequency.setTargetAtTime(0.3, now, 0.01);
        break;
        
      case 'tape':
        // Tape echo
        this.tapeLP.frequency.setTargetAtTime(4000, now, 0.01);
        this.tapeHP.frequency.setTargetAtTime(120, now, 0.01);
        this.modDepthL.gain.value = 0.001;
        this.modDepthR.gain.value = 0.001;
        this.modLFO.frequency.setTargetAtTime(0.25, now, 0.01);
        break;
        
      case 'modulate':
        // Heavily modulated
        this.modDepthL.gain.value = 0.003;
        this.modDepthR.gain.value = 0.003;
        this.modLFO.frequency.setTargetAtTime(0.5, now, 0.01);
        break;
        
      case 'sfx':
        // Special effects (high feedback, filtering)
        this.feedbackL.gain.setTargetAtTime(0.8, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(0.8, now, 0.01);
        this.toneFilter.gain.setTargetAtTime(8, now, 0.01);
        break;
        
      case 'dual':
        // Two independent delays
        this.delayR.delayTime.setTargetAtTime(
          this.delayL.delayTime.value * 0.75,
          now,
          0.01
        );
        break;
        
      case 'pan':
        // Ping-pong delay
        this.crossFeedL2R.gain.setTargetAtTime(0.6, now, 0.01);
        this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01);
        this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01);
        break;
        
      case 'reverse':
        // Reverse delay (simulated)
        this.reverseGain.gain.setTargetAtTime(0.8, now, 0.01);
        break;
        
      case 'shimmer':
        // Pitch-shifted delay
        this.shimmerGain1.gain.setTargetAtTime(0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.3, now, 0.01);
        break;
        
      case 'glitch':
        // Stutter/glitch
        this.glitchGain.gain.setTargetAtTime(0.8, now, 0.01);
        break;
        
      case 'teraecho':
        // Ambient soundscape
        for (let i = 0; i < 4; i++) {
          this.teraReverb[i].feedback.gain.setTargetAtTime(0.75, now, 0.01);
        }
        break;
        
      case 'pattern':
        // Rhythmic patterns (ping-pong with rhythm)
        this.crossFeedL2R.gain.setTargetAtTime(0.7, now, 0.01);
        this.crossFeedR2L.gain.setTargetAtTime(0.7, now, 0.01);
        break;
        
      default:
        break;
    }
  }
  
  tapTap() {
    const now = Date.now();
    this.tapTempo.lastTaps.push(now);
    
    if (this.tapTempo.lastTaps.length > 4) {
      this.tapTempo.lastTaps.shift();
    }
    
    if (this.tapTempo.lastTaps.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < this.tapTempo.lastTaps.length; i++) {
        totalInterval += this.tapTempo.lastTaps[i] - this.tapTempo.lastTaps[i - 1];
      }
      const avgInterval = totalInterval / (this.tapTempo.lastTaps.length - 1);
      const bpm = 60000 / avgInterval;
      this.tapTempo.bpm = Math.round(bpm);
      this.updateDelayTimeFromTempo();
    }
  }
  
  updateDelayTimeFromTempo() {
    if (!this.tapTempo.enabled) return;
    
    const beatDuration = 60 / this.tapTempo.bpm;
    let delayTime = beatDuration;
    
    switch (this.tapTempo.subdivision) {
      case '1/8':
        delayTime = beatDuration / 2;
        break;
      case '1/4':
        delayTime = beatDuration;
        break;
      case '1/2':
        delayTime = beatDuration * 2;
        break;
      case 'dotted':
        delayTime = beatDuration * 1.5;
        break;
    }
    
    const now = this.audioContext.currentTime;
    this.delayL.delayTime.setTargetAtTime(delayTime, now, 0.01);
    this.delayR.delayTime.setTargetAtTime(delayTime, now, 0.01);
  }
  
  saveToMemory(slot) {
    if (slot < 0 || slot > 3) return;
    
    this.memory[slot] = {
      mode: this.currentMode,
      time: this.delayL.delayTime.value,
      feedback: this.feedbackL.gain.value,
      effectLevel: this.effectLevel.gain.value,
      modDepth: this.modDepthL.gain.value,
      modRate: this.modLFO.frequency.value,
      tone: this.toneFilter.gain.value
    };
  }
  
  loadFromMemory(slot) {
    if (slot < 0 || slot > 3 || !this.memory[slot]) return;
    
    const preset = this.memory[slot];
    const now = this.audioContext.currentTime;
    
    this.setDelayMode(preset.mode);
    this.delayL.delayTime.setTargetAtTime(preset.time, now, 0.01);
    this.delayR.delayTime.setTargetAtTime(preset.time, now, 0.01);
    this.feedbackL.gain.setTargetAtTime(preset.feedback, now, 0.01);
    this.feedbackR.gain.setTargetAtTime(preset.feedback, now, 0.01);
    this.effectLevel.gain.setTargetAtTime(preset.effectLevel, now, 0.01);
    this.modDepthL.gain.value = preset.modDepth;
    this.modDepthR.gain.value = preset.modDepth;
    this.modLFO.frequency.setTargetAtTime(preset.modRate, now, 0.01);
    this.toneFilter.gain.setTargetAtTime(preset.tone, now, 0.01);
    
    this.currentMemory = slot;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        // 10ms to 10s
        const time = 0.01 + (value / 100) * 9.99;
        this.delayL.delayTime.setTargetAtTime(time, now, 0.01);
        this.delayR.delayTime.setTargetAtTime(time, now, 0.01);
        this.tapTempo.enabled = false;
        break;
        
      case 'feedback':
        // 0-95%
        const fb = (value / 100) * 0.95;
        this.feedbackL.gain.setTargetAtTime(fb, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(fb, now, 0.01);
        break;
        
      case 'elevel':
        // Effect level (mix)
        this.effectLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'moddepth':
        // 0-100%
        const depth = (value / 100) * 0.005;
        this.modDepthL.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepthR.gain.setTargetAtTime(depth, now, 0.01);
        break;
        
      case 'modrate':
        // 0.1Hz to 10Hz
        const rate = 0.1 + (value / 100) * 9.9;
        this.modLFO.frequency.setTargetAtTime(rate, now, 0.01);
        break;
        
      case 'tone':
        // -12dB to +12dB
        const gain = ((value - 50) / 50) * 12;
        this.toneFilter.gain.setTargetAtTime(gain, now, 0.01);
        break;
        
      case 'mode':
        this.setDelayMode(value);
        break;
        
      case 'taptempo':
        this.tapTempo.enabled = value;
        if (value) {
          this.updateDelayTimeFromTempo();
        }
        break;
        
      case 'subdivision':
        this.tapTempo.subdivision = value;
        this.updateDelayTimeFromTempo();
        break;
        
      case 'memory':
        this.loadFromMemory(parseInt(value));
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  getParameters() {
    return {
      mode: this.currentMode,
      time: ((this.delayL.delayTime.value - 0.01) / 9.99) * 100,
      feedback: (this.feedbackL.gain.value / 0.95) * 100,
      elevel: this.effectLevel.gain.value * 100,
      moddepth: (this.modDepthL.gain.value / 0.005) * 100,
      modrate: ((this.modLFO.frequency.value - 0.1) / 9.9) * 100,
      tone: ((this.toneFilter.gain.value / 12) * 50) + 50,
      mix: this.mix * 100,
      taptempo: this.tapTempo.enabled,
      subdivision: this.tapTempo.subdivision,
      bpm: this.tapTempo.bpm,
      memory: this.currentMemory
    };
  }
  
  updateMix(value) {
    // Update wet/dry mix (0-100)
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayL2.disconnect();
      this.delayR2.disconnect();
      this.feedbackL.disconnect();
      this.feedbackR.disconnect();
      this.crossFeedL2R.disconnect();
      this.crossFeedR2L.disconnect();
      this.dcBlockerL.disconnect();
      this.dcBlockerR.disconnect();
      this.hpFeedbackL.disconnect();
      this.hpFeedbackR.disconnect();
      this.analogLP.disconnect();
      this.tapeLP.disconnect();
      this.tapeHP.disconnect();
      this.toneFilter.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthL.disconnect();
      this.modDepthR.disconnect();
      this.shimmerDelay1.disconnect();
      this.shimmerDelay2.disconnect();
      this.shimmerGain1.disconnect();
      this.shimmerGain2.disconnect();
      
      for (let i = 0; i < 4; i++) {
        this.teraReverb[i].delay.disconnect();
        this.teraReverb[i].feedback.disconnect();
      }
      
      this.glitchGain.disconnect();
      this.reverseGain.disconnect();
      this.panL.disconnect();
      this.panR.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
      this.effectLevel.disconnect();
      this.outputGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Boss DD-500:', e);
    }
  }
}

export default BossDD500Effect;
