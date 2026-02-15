import BaseEffect from './BaseEffect';

/**
 * EHXHolyGrailEffect - Electro-Harmonix Holy Grail Neo
 * 
 * Best-selling reverb pedal of all time
 * Used by: Everyone
 * 
 * Features:
 * - Spring, Hall, Plate modes (algorithmic, no random noise IRs)
 * - Simple 1-2 knob operation
 * - Classic EHX character
 */

class EHXHolyGrailEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Holy Grail', 'ehxholygrail');
    
    // Mode presets: delay scaling, feedback, damping, allpass coefficient, spring resonance
    this.modePresets = {
      'spring': {
        delayScale: 0.6,
        feedback: 0.76,
        damping: 3000,
        allpassCoeff: 0.65,
        springResonanceGain: 8,
        springResonanceQ: 3,
        lpfFreq: 6000
      },
      'hall': {
        delayScale: 1.2,
        feedback: 0.88,
        damping: 7000,
        allpassCoeff: 0.7,
        springResonanceGain: 0,
        springResonanceQ: 1,
        lpfFreq: 8000
      },
      'plate': {
        delayScale: 0.85,
        feedback: 0.85,
        damping: 9000,
        allpassCoeff: 0.75,
        springResonanceGain: 0,
        springResonanceQ: 1,
        lpfFreq: 10000
      }
    };
    
    // Base comb delay times
    this.baseCombDelayTimes = [
      0.0253, 0.0297, 0.0347, 0.0371, 0.0219, 0.0269
    ];
    
    // Allpass delay times
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    
    // Pre-delay
    this.preDelay = audioContext.createDelay(0.1);
    this.preDelay.delayTime.value = 0.02; // 20ms
    
    // Create 6 comb filters with per-comb damping
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.15);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 7000;
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.baseCombDelayTimes[i];
      feedback.gain.value = 0.85;
      combGain.gain.value = 1 / 6;
      
      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combGain);
    }
    
    // Comb mixer
    this.combMixer = audioContext.createGain();
    
    // Create 4 allpass filters (correct Schroeder structure)
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
      
      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      apInput.connect(delay);
      delay.connect(apOutput);
      delay.connect(fbGain);
      fbGain.connect(apInput);
      
      this.allpassFilters.push({ input: apInput, output: apOutput, delay, fbGain, ffGain });
    }
    
    // Spring resonance filter (peaking EQ - active in spring mode, flat in others)
    this.springResonance = audioContext.createBiquadFilter();
    this.springResonance.type = 'peaking';
    this.springResonance.frequency.value = 2500;
    this.springResonance.Q.value = 1;
    this.springResonance.gain.value = 0; // Off by default
    
    // Output tone control
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 8000;
    this.reverbLPF.Q.value = 0.707;
    
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 200;
    this.reverbHPF.Q.value = 0.707;
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Reverb level
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.4;
    
    // Current mode
    this.mode = 'hall';
    
    // === ROUTING ===
    
    // Input → pre-delay → comb filters in parallel
    this.input.connect(this.preDelay);
    
    for (let i = 0; i < 6; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.preDelay.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Allpass in series
    this.combMixer.connect(this.allpassFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].output.connect(this.allpassFilters[i + 1].input);
    }
    
    // Output: allpass → DC blocker → spring resonance → HPF → LPF → gain → wet → output
    this.allpassFilters[3].output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.springResonance);
    this.springResonance.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Apply initial mode preset
    this.applyModePreset(this.mode);
  }
  
  applyModePreset(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.modePresets[mode] || this.modePresets['hall'];
    
    // Update comb filter parameters
    for (let i = 0; i < 6; i++) {
      this.combFilters[i].delay.delayTime.setTargetAtTime(
        this.baseCombDelayTimes[i] * preset.delayScale, now, 0.02
      );
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.feedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.damping, now, 0.02);
    }
    
    // Update allpass coefficients
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].fbGain.gain.setTargetAtTime(preset.allpassCoeff, now, 0.02);
      this.allpassFilters[i].ffGain.gain.setTargetAtTime(-preset.allpassCoeff, now, 0.02);
    }
    
    // Update spring resonance
    this.springResonance.gain.setTargetAtTime(preset.springResonanceGain, now, 0.02);
    this.springResonance.Q.setTargetAtTime(preset.springResonanceQ, now, 0.02);
    
    // Update output filter
    this.reverbLPF.frequency.setTargetAtTime(preset.lpfFreq, now, 0.02);
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'reverb':
        // Reverb level/mix
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'mode':
        // 'spring', 'hall', 'plate'
        this.mode = value;
        this.applyModePreset(value);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    this.preDelay.disconnect();
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
    this.springResonance.disconnect();
    this.reverbHPF.disconnect();
    this.reverbLPF.disconnect();
    this.dcBlocker.disconnect();
    this.reverbGain.disconnect();
  }
}

export default EHXHolyGrailEffect;
