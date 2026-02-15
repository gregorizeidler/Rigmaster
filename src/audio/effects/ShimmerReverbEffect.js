import BaseEffect from './BaseEffect';

class ShimmerReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Shimmer Reverb', 'shimmerreverb');
    
    // SHIMMER REVERB - Reverb tail with pitch-shifted feedback (+12 semitones)
    // 6 comb filters → 4 allpass diffusers → pitch-shifted feedback loop
    
    // Pre-delay
    this.preDelay = audioContext.createDelay(0.5);
    this.preDelay.delayTime.value = 0.03;
    
    // Summing node for comb input (receives preDelay + shimmer feedback)
    this.combInput = audioContext.createGain();
    
    // Comb filter delay times
    this.combDelayTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0253, 0.0307];
    
    // Create 6 comb filters with per-comb damping
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 6000;
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.85;
      combGain.gain.value = 1 / 6;
      
      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combGain);
    }
    
    // Comb mixer
    this.combMixer = audioContext.createGain();
    
    // Allpass diffusers (4 series, correct Schroeder structure)
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    this.allpassFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const delay = audioContext.createDelay(0.1);
      const fbGain = audioContext.createGain();
      const ffGain = audioContext.createGain();
      
      delay.delayTime.value = this.allpassDelayTimes[i];
      fbGain.gain.value = 0.7;
      ffGain.gain.value = -0.7;
      
      // Feed-forward path: input → ffGain → output
      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      // Delay path: input → delay → output
      apInput.connect(delay);
      delay.connect(apOutput);
      // Feedback: delay → fbGain → input
      delay.connect(fbGain);
      fbGain.connect(apInput);
      
      this.allpassFilters.push({ input: apInput, output: apOutput, delay, fbGain, ffGain });
    }
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Reverb gain
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.6;
    
    // Shimmer feedback path nodes
    this.shimmerSend = audioContext.createGain();
    this.shimmerSend.gain.value = 0.4; // Shimmer amount
    
    this.shimmerDamping = audioContext.createBiquadFilter();
    this.shimmerDamping.type = 'lowpass';
    this.shimmerDamping.frequency.value = 8000;
    this.shimmerDamping.Q.value = 0.707;
    
    this.shimmerFeedback = audioContext.createGain();
    this.shimmerFeedback.gain.value = 0.5;
    
    // Pitch shifter worklet (+12 semitones = octave up)
    try {
      this.pitchShifter = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchShifter.parameters.get('pitch').value = 2.0; // +12 semitones (octave up)
      this.pitchShifter.parameters.get('mix').value = 1.0;   // Fully wet
      this.pitchShifter.parameters.get('grain').value = 0.1;  // Grain size
      this.hasPitchShifter = true;
    } catch (e) {
      // Fallback: passthrough if worklet not available
      this.pitchShifter = audioContext.createGain();
      this.hasPitchShifter = false;
      console.warn('Pitch shifter worklet not available, shimmer effect reduced');
    }
    
    // === ROUTING ===
    
    // Input → preDelay → combInput
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.combInput);
    
    // Comb filters in parallel from combInput (each with isolated feedback loop)
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.combInput.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Allpass diffusers in series
    this.combMixer.connect(this.allpassFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].output.connect(this.allpassFilters[i + 1].input);
    }
    
    // Allpass output → DC blocker → split to reverb output and shimmer feedback
    this.allpassFilters[3].output.connect(this.dcBlocker);
    
    // Main output path
    this.dcBlocker.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Shimmer feedback: dcBlocker → shimmerSend → pitchShifter → shimmerDamping → shimmerFeedback → combInput
    this.dcBlocker.connect(this.shimmerSend);
    this.shimmerSend.connect(this.pitchShifter);
    this.pitchShifter.connect(this.shimmerDamping);
    this.shimmerDamping.connect(this.shimmerFeedback);
    this.shimmerFeedback.connect(this.combInput);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.setMix(0.4);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'decay':
        // Control comb filter feedback (decay time)
        const feedback = 0.7 + (value / 100) * 0.25; // 0.7 to 0.95
        for (let i = 0; i < 6; i++) {
          this.combFilters[i].feedback.gain.setTargetAtTime(feedback, now, 0.01);
        }
        break;
      case 'shimmer':
        // Control shimmer amount (pitch-shifted feedback level)
        this.shimmerSend.gain.setTargetAtTime((value / 100) * 0.6, now, 0.01);
        this.shimmerFeedback.gain.setTargetAtTime((value / 100) * 0.6, now, 0.01);
        break;
      case 'tone':
        // Control brightness of shimmer and reverb damping
        const freq = 2000 + (value / 100) * 8000; // 2kHz to 10kHz
        this.shimmerDamping.frequency.setTargetAtTime(freq, now, 0.01);
        for (let i = 0; i < 6; i++) {
          this.combFilters[i].damping.frequency.setTargetAtTime(freq, now, 0.01);
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
    this.preDelay.disconnect();
    this.combInput.disconnect();
    for (let i = 0; i < 6; i++) {
      this.combFilters[i].delay.disconnect();
      this.combFilters[i].feedback.disconnect();
      this.combFilters[i].damping.disconnect();
      this.combGains[i].disconnect();
    }
    this.combMixer.disconnect();
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].input.disconnect();
      this.allpassFilters[i].output.disconnect();
      this.allpassFilters[i].delay.disconnect();
      this.allpassFilters[i].fbGain.disconnect();
      this.allpassFilters[i].ffGain.disconnect();
    }
    this.dcBlocker.disconnect();
    this.reverbGain.disconnect();
    this.shimmerSend.disconnect();
    this.pitchShifter.disconnect();
    this.shimmerDamping.disconnect();
    this.shimmerFeedback.disconnect();
  }
}

export default ShimmerReverbEffect;
