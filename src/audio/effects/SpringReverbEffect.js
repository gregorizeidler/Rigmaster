import BaseEffect from './BaseEffect';

class SpringReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Spring Reverb', 'springreverb');
    
    // SPRING REVERB - Characteristic "sproing" with feedback comb filters
    // Shorter delay times, heavy damping, resonant character
    
    // Short delay times for spring character
    this.combDelayTimes = [
      0.0131, 0.0149, 0.0167, 0.0181, 0.0199, 0.0213
    ];
    
    // Create 6 comb filters with per-comb damping (heavy damping for spring)
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 3000; // Heavy damping for spring character
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.combDelayTimes[i];
      feedback.gain.value = 0.78; // Moderate feedback
      combGain.gain.value = 1 / 6;
      
      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combGain);
    }
    
    // Comb mixer
    this.combMixer = audioContext.createGain();
    
    // Spring character: resonant bandpass around 2-3kHz
    this.springBandpass = audioContext.createBiquadFilter();
    this.springBandpass.type = 'peaking';
    this.springBandpass.frequency.value = 2500;
    this.springBandpass.Q.value = 3;
    this.springBandpass.gain.value = 8;
    
    // "Drip" filter: resonant peak around 3-5kHz with high Q
    this.dripFilter = audioContext.createBiquadFilter();
    this.dripFilter.type = 'peaking';
    this.dripFilter.frequency.value = 4000;
    this.dripFilter.Q.value = 12;
    this.dripFilter.gain.value = 6;
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // LFO for metallic modulation of delay times
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5; // Slow modulation
    this.lfoGain.gain.value = 0.0003; // Very subtle time modulation
    this.lfo.connect(this.lfoGain);
    
    // Connect LFO to each comb delay time for metallic character
    for (let i = 0; i < 6; i++) {
      this.lfoGain.connect(this.combFilters[i].delay.delayTime);
    }
    this.lfo.start();
    
    // Reverb output gain
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.5;
    
    // === ROUTING ===
    
    // Connect comb filters in parallel (each with isolated feedback loop)
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      // Input → delay
      this.input.connect(delay);
      // Feedback loop: delay → damping → feedback gain → delay
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      // Output: delay → combGain → mixer
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Comb mixer → spring character filters → DC blocker → output
    this.combMixer.connect(this.springBandpass);
    this.springBandpass.connect(this.dripFilter);
    this.dripFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.setMix(0.3);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'decay':
        // Control feedback amount (decay time)
        const feedback = 0.6 + (value / 100) * 0.3; // 0.6 to 0.9
        for (let i = 0; i < 6; i++) {
          this.combFilters[i].feedback.gain.setTargetAtTime(feedback, now, 0.01);
        }
        break;
      case 'tone':
        // Control spring brightness
        const freq = 1500 + (value / 100) * 3000; // 1.5kHz to 4.5kHz
        this.springBandpass.frequency.setTargetAtTime(freq, now, 0.01);
        const dampFreq = 2000 + (value / 100) * 4000; // 2kHz to 6kHz
        for (let i = 0; i < 6; i++) {
          this.combFilters[i].damping.frequency.setTargetAtTime(dampFreq, now, 0.01);
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
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    for (let i = 0; i < 6; i++) {
      this.combFilters[i].delay.disconnect();
      this.combFilters[i].feedback.disconnect();
      this.combFilters[i].damping.disconnect();
      this.combGains[i].disconnect();
    }
    this.combMixer.disconnect();
    this.springBandpass.disconnect();
    this.dripFilter.disconnect();
    this.dcBlocker.disconnect();
    this.reverbGain.disconnect();
  }
}

export default SpringReverbEffect;
