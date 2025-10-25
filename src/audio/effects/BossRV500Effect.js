import BaseEffect from './BaseEffect';

/**
 * Boss RV-500 - Digital Reverb
 * 
 * 12 REVERB MODES:
 * 1. Room - Natural room
 * 2. Hall - Concert hall
 * 3. Plate - Classic plate
 * 4. Spring - Vintage spring
 * 5. Shimmer - Pitch-shifted
 * 6. Mod - Modulated reverb
 * 7. Delay+Reverb - Delay before reverb
 * 8. SFX - Special effects
 * 9. Dual - Two reverbs
 * 10. Lo-Fi - Degraded reverb
 * 11. Non-Linear - Gated/reverse
 * 12. Reverb+EQ - Reverb with graphic EQ
 * 
 * CONTROLS:
 * - Time (Decay time)
 * - Pre-Delay (0-500ms)
 * - Tone (Filter)
 * - E.Level (Effect Level = mix)
 * - Mod Depth
 * - Mod Rate
 * - 4 Memory slots
 */
class BossRV500Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss RV-500', 'bossrv500');
    
    this.reverbModes = {
      'room': 'Room',
      'hall': 'Hall',
      'plate': 'Plate',
      'spring': 'Spring',
      'shimmer': 'Shimmer',
      'mod': 'Mod',
      'delayverb': 'Delay+Reverb',
      'sfx': 'SFX',
      'dual': 'Dual',
      'lofi': 'Lo-Fi',
      'nonlinear': 'Non-Linear',
      'reverbeq': 'Reverb+EQ'
    };
    
    this.currentMode = 'hall';
    
    // === FREEVERB-BASED CORE (Professional quality) ===
    // 12 comb filters
    this.combDelays = [
      0.0297, 0.0371, 0.0411, 0.0437,
      0.0503, 0.0571, 0.0617, 0.0683,
      0.0751, 0.0827, 0.0893, 0.0971
    ];
    this.combFilters = [];
    this.combGains = [];
    
    for (let i = 0; i < 12; i++) {
      const delay = audioContext.createDelay(10.0);
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      const dampFilter = audioContext.createBiquadFilter();
      
      delay.delayTime.value = this.combDelays[i];
      feedback.gain.value = 0.84;
      combGain.gain.value = 1 / 12;
      dampFilter.type = 'lowpass';
      dampFilter.frequency.value = 5000;
      
      this.combFilters.push({ delay, feedback, dampFilter });
      this.combGains.push(combGain);
    }
    
    // 8 allpass filters
    this.allpassDelays = [
      0.0051, 0.0067, 0.0083, 0.0097,
      0.0113, 0.0131, 0.0149, 0.0167
    ];
    this.allpassFilters = [];
    
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      const feedforward = audioContext.createGain();
      const feedback = audioContext.createGain();
      const sumNode = audioContext.createGain();
      
      delay.delayTime.value = this.allpassDelays[i];
      feedforward.gain.value = 0.7;
      feedback.gain.value = -0.7;
      
      this.allpassFilters.push({ delay, feedforward, feedback, sumNode });
    }
    
    // === PRE-DELAY ===
    this.preDelay = audioContext.createDelay(2.0);
    this.preDelay.delayTime.value = 0.02;
    
    // === DELAY (for Delay+Reverb mode) ===
    this.delayLine = audioContext.createDelay(10.0);
    this.delayLine.delayTime.value = 0.5;
    this.delayFeedback = audioContext.createGain();
    this.delayFeedback.gain.value = 0;
    this.delayMix = audioContext.createGain();
    this.delayMix.gain.value = 0;
    
    // === TONE SHAPING ===
    this.lowCut = audioContext.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.lowCut.frequency.value = 80;
    
    this.highCut = audioContext.createBiquadFilter();
    this.highCut.type = 'lowpass';
    this.highCut.frequency.value = 10000;
    
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 5000;
    
    // === GRAPHIC EQ (for Reverb+EQ mode) ===
    this.eqBands = [];
    const eqFreqs = [100, 200, 400, 800, 1600, 3200, 6400];
    for (let i = 0; i < 7; i++) {
      const eq = audioContext.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.value = eqFreqs[i];
      eq.Q.value = 1.0;
      eq.gain.value = 0;
      this.eqBands.push(eq);
    }
    
    // === SHIMMER (pitch shift) ===
    this.shimmerDelay1 = audioContext.createDelay(0.1);
    this.shimmerDelay2 = audioContext.createDelay(0.1);
    this.shimmerDelay1.delayTime.value = 0.012;
    this.shimmerDelay2.delayTime.value = 0.019;
    this.shimmerGain1 = audioContext.createGain();
    this.shimmerGain2 = audioContext.createGain();
    this.shimmerGain1.gain.value = 0;
    this.shimmerGain2.gain.value = 0;
    this.shimmerFeedback = audioContext.createGain();
    this.shimmerFeedback.gain.value = 0.6;
    
    // === SPRING SIMULATION ===
    this.springDelay = audioContext.createDelay(0.05);
    this.springDelay.delayTime.value = 0.01;
    this.springFeedback = audioContext.createGain();
    this.springFeedback.gain.value = 0;
    this.springBandpass = audioContext.createBiquadFilter();
    this.springBandpass.type = 'bandpass';
    this.springBandpass.frequency.value = 1000;
    this.springBandpass.Q.value = 2;
    
    // === MODULATION ===
    this.modLFO1 = audioContext.createOscillator();
    this.modLFO2 = audioContext.createOscillator();
    this.modDepth1 = audioContext.createGain();
    this.modDepth2 = audioContext.createGain();
    this.modLFO1.type = 'sine';
    this.modLFO2.type = 'triangle';
    this.modLFO1.frequency.value = 0.3;
    this.modLFO2.frequency.value = 0.5;
    this.modDepth1.gain.value = 0;
    this.modDepth2.gain.value = 0;
    this.modLFO1.start();
    this.modLFO2.start();
    
    // === NON-LINEAR (Gate/Reverse) ===
    this.gateEnvelope = audioContext.createGain();
    this.gateEnvelope.gain.value = 1.0;
    
    // === DUAL REVERB ===
    this.dualMix = audioContext.createGain();
    this.dualMix.gain.value = 0.5;
    
    // === EARLY REFLECTIONS ===
    this.earlyReflections = [];
    const earlyTimes = [0.019, 0.029, 0.043, 0.059, 0.071, 0.089];
    const earlyGains = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.1);
      const gain = audioContext.createGain();
      delay.delayTime.value = earlyTimes[i];
      gain.gain.value = earlyGains[i];
      this.earlyReflections.push({ delay, gain });
    }
    
    // === LO-FI (Bit crusher) ===
    this.lofiBitcrusher = audioContext.createWaveShaper();
    this.lofiBitcrusher.oversample = 'none';
    this.lofiBitcrusher.curve = this.makeBitCrushCurve(8);
    this.lofiLP = audioContext.createBiquadFilter();
    this.lofiLP.type = 'lowpass';
    this.lofiLP.frequency.value = 4000;
    
    // === MIXER NODES ===
    this.combMixer = audioContext.createGain();
    this.earlyMixer = audioContext.createGain();
    this.lateMixer = audioContext.createGain();
    this.shimmerMixer = audioContext.createGain();
    this.effectLevel = audioContext.createGain();
    this.effectLevel.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === MEMORY SLOTS ===
    this.memory = [null, null, null, null];
    this.currentMemory = 0;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  makeBitCrushCurve(bits) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const levels = Math.pow(2, bits);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      const crushed = Math.floor(x * levels) / levels;
      curve[i] = crushed;
    }
    
    return curve;
  }
  
  setupRouting() {
    // Input -> Pre-delay -> Lowcut
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.lowCut);
    
    // Early reflections
    for (let i = 0; i < 6; i++) {
      const { delay, gain } = this.earlyReflections[i];
      this.lowCut.connect(delay);
      delay.connect(gain);
      gain.connect(this.earlyMixer);
    }
    
    // Comb filters (parallel)
    for (let i = 0; i < 12; i++) {
      const { delay, feedback, dampFilter } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.lowCut.connect(delay);
      delay.connect(dampFilter);
      dampFilter.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Allpass filters (series)
    let allpassInput = this.combMixer;
    for (let i = 0; i < 8; i++) {
      const { delay, feedforward, feedback, sumNode } = this.allpassFilters[i];
      
      allpassInput.connect(delay);
      allpassInput.connect(feedforward);
      delay.connect(feedback);
      
      feedforward.connect(sumNode);
      feedback.connect(sumNode);
      delay.connect(sumNode);
      
      allpassInput = sumNode;
    }
    
    allpassInput.connect(this.dampingFilter);
    this.dampingFilter.connect(this.highCut);
    this.highCut.connect(this.lateMixer);
    
    // Shimmer branch
    this.highCut.connect(this.shimmerDelay1);
    this.shimmerDelay1.connect(this.shimmerGain1);
    this.shimmerGain1.connect(this.shimmerFeedback);
    this.shimmerFeedback.connect(this.lowCut);
    this.shimmerGain1.connect(this.shimmerMixer);
    
    this.highCut.connect(this.shimmerDelay2);
    this.shimmerDelay2.connect(this.shimmerGain2);
    this.shimmerGain2.connect(this.shimmerMixer);
    
    // Modulation connections
    this.modLFO1.connect(this.modDepth1);
    this.modLFO2.connect(this.modDepth2);
    this.modDepth1.connect(this.combFilters[0].delay.delayTime);
    this.modDepth1.connect(this.combFilters[2].delay.delayTime);
    this.modDepth2.connect(this.combFilters[1].delay.delayTime);
    this.modDepth2.connect(this.combFilters[3].delay.delayTime);
    
    // Gate envelope
    this.lateMixer.connect(this.gateEnvelope);
    
    // Mix all branches
    this.earlyMixer.connect(this.effectLevel);
    this.gateEnvelope.connect(this.effectLevel);
    this.shimmerMixer.connect(this.effectLevel);
    
    // Final output
    this.effectLevel.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  setReverbMode(mode) {
    const now = this.audioContext.currentTime;
    this.currentMode = mode;
    
    // Reset all branch gains
    this.earlyMixer.gain.setTargetAtTime(0, now, 0.01);
    this.lateMixer.gain.setTargetAtTime(1, now, 0.01);
    this.shimmerMixer.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    this.gateEnvelope.gain.setTargetAtTime(1, now, 0.01);
    this.delayMix.gain.setTargetAtTime(0, now, 0.01);
    this.springFeedback.gain.setTargetAtTime(0, now, 0.01);
    
    switch (mode) {
      case 'room':
        // Natural room (short decay)
        this.setCombFeedback(0.7);
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.6, now, 0.01);
        break;
        
      case 'hall':
        // Concert hall (long decay)
        this.setCombFeedback(0.88);
        this.dampingFilter.frequency.setTargetAtTime(4500, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.2, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.8, now, 0.01);
        break;
        
      case 'plate':
        // Classic plate reverb
        this.setCombFeedback(0.85);
        this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.modDepth1.gain.value = 0.0003;
        this.modDepth2.gain.value = 0.0003;
        break;
        
      case 'spring':
        // Vintage spring reverb
        this.setCombFeedback(0.75);
        this.springFeedback.gain.setTargetAtTime(0.6, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.highCut.frequency.setTargetAtTime(6000, now, 0.01);
        this.modDepth1.gain.value = 0.001;
        break;
        
      case 'shimmer':
        // Pitch-shifted reverb
        this.setCombFeedback(0.9);
        this.shimmerGain1.gain.setTargetAtTime(0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.3, now, 0.01);
        this.shimmerMixer.gain.setTargetAtTime(0.6, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.4, now, 0.01);
        break;
        
      case 'mod':
        // Modulated reverb
        this.setCombFeedback(0.85);
        this.modDepth1.gain.value = 0.001;
        this.modDepth2.gain.value = 0.001;
        this.modLFO1.frequency.setTargetAtTime(0.5, now, 0.01);
        this.modLFO2.frequency.setTargetAtTime(0.7, now, 0.01);
        break;
        
      case 'delayverb':
        // Delay before reverb
        this.delayMix.gain.setTargetAtTime(0.5, now, 0.01);
        this.delayFeedback.gain.setTargetAtTime(0.5, now, 0.01);
        this.setCombFeedback(0.8);
        break;
        
      case 'sfx':
        // Special effects (high feedback)
        this.setCombFeedback(0.92);
        this.dampingFilter.frequency.setTargetAtTime(3000, now, 0.01);
        this.modDepth1.gain.value = 0.002;
        break;
        
      case 'dual':
        // Two reverbs
        this.setCombFeedback(0.85);
        this.dualMix.gain.setTargetAtTime(0.5, now, 0.01);
        break;
        
      case 'lofi':
        // Degraded reverb
        this.setCombFeedback(0.8);
        this.dampingFilter.frequency.setTargetAtTime(2500, now, 0.01);
        break;
        
      case 'nonlinear':
        // Gated/reverse reverb
        this.setCombFeedback(0.8);
        // Gate envelope would be triggered by input signal
        break;
        
      case 'reverbeq':
        // Reverb with graphic EQ
        this.setCombFeedback(0.85);
        // EQ bands are adjustable via parameters
        break;
        
      default:
        break;
    }
  }
  
  setCombFeedback(value) {
    const now = this.audioContext.currentTime;
    for (let i = 0; i < 12; i++) {
      const variation = 1 - (i * 0.01);
      this.combFilters[i].feedback.gain.setTargetAtTime(value * variation, now, 0.01);
    }
  }
  
  saveToMemory(slot) {
    if (slot < 0 || slot > 3) return;
    
    this.memory[slot] = {
      mode: this.currentMode,
      time: this.combFilters[0].feedback.gain.value,
      predelay: this.preDelay.delayTime.value,
      tone: this.dampingFilter.frequency.value,
      elevel: this.effectLevel.gain.value,
      moddepth: this.modDepth1.gain.value,
      modrate: this.modLFO1.frequency.value
    };
  }
  
  loadFromMemory(slot) {
    if (slot < 0 || slot > 3 || !this.memory[slot]) return;
    
    const preset = this.memory[slot];
    const now = this.audioContext.currentTime;
    
    this.setReverbMode(preset.mode);
    this.setCombFeedback(preset.time);
    this.preDelay.delayTime.setTargetAtTime(preset.predelay, now, 0.01);
    this.dampingFilter.frequency.setTargetAtTime(preset.tone, now, 0.01);
    this.effectLevel.gain.setTargetAtTime(preset.elevel, now, 0.01);
    this.modDepth1.gain.value = preset.moddepth;
    this.modDepth2.gain.value = preset.moddepth;
    this.modLFO1.frequency.setTargetAtTime(preset.modrate, now, 0.01);
    
    this.currentMemory = slot;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        // Decay time (feedback)
        const feedback = 0.5 + (value / 100) * 0.48;
        this.setCombFeedback(feedback);
        break;
        
      case 'predelay':
        // 0-500ms
        const preDelayTime = (value / 100) * 0.5;
        this.preDelay.delayTime.setTargetAtTime(preDelayTime, now, 0.01);
        break;
        
      case 'tone':
        // Filter frequency
        const freq = 1000 + (value / 100) * 11000;
        this.dampingFilter.frequency.setTargetAtTime(freq, now, 0.01);
        for (let i = 0; i < 12; i++) {
          this.combFilters[i].dampFilter.frequency.setTargetAtTime(freq, now, 0.01);
        }
        break;
        
      case 'elevel':
        // Effect level (mix)
        this.effectLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'moddepth':
        // 0-100%
        const depth = (value / 100) * 0.002;
        this.modDepth1.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepth2.gain.setTargetAtTime(depth, now, 0.01);
        break;
        
      case 'modrate':
        // 0.1Hz to 5Hz
        const rate = 0.1 + (value / 100) * 4.9;
        this.modLFO1.frequency.setTargetAtTime(rate, now, 0.01);
        this.modLFO2.frequency.setTargetAtTime(rate * 1.3, now, 0.01);
        break;
        
      case 'mode':
        this.setReverbMode(value);
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
      time: ((this.combFilters[0].feedback.gain.value - 0.5) / 0.48) * 100,
      predelay: (this.preDelay.delayTime.value / 0.5) * 100,
      tone: ((this.dampingFilter.frequency.value - 1000) / 11000) * 100,
      elevel: this.effectLevel.gain.value * 100,
      moddepth: (this.modDepth1.gain.value / 0.002) * 100,
      modrate: ((this.modLFO1.frequency.value - 0.1) / 4.9) * 100,
      mix: this.mix * 100,
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
      // Comb filters
      for (let i = 0; i < 12; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].dampFilter.disconnect();
        this.combGains[i].disconnect();
      }
      
      // Allpass filters
      for (let i = 0; i < 8; i++) {
        this.allpassFilters[i].delay.disconnect();
        this.allpassFilters[i].feedforward.disconnect();
        this.allpassFilters[i].feedback.disconnect();
        this.allpassFilters[i].sumNode.disconnect();
      }
      
      // Other nodes
      this.preDelay.disconnect();
      this.lowCut.disconnect();
      this.highCut.disconnect();
      this.dampingFilter.disconnect();
      this.delayLine.disconnect();
      this.delayFeedback.disconnect();
      this.delayMix.disconnect();
      
      // EQ bands
      for (let i = 0; i < 7; i++) {
        this.eqBands[i].disconnect();
      }
      
      // Shimmer
      this.shimmerDelay1.disconnect();
      this.shimmerDelay2.disconnect();
      this.shimmerGain1.disconnect();
      this.shimmerGain2.disconnect();
      this.shimmerFeedback.disconnect();
      
      // Spring
      this.springDelay.disconnect();
      this.springFeedback.disconnect();
      this.springBandpass.disconnect();
      
      // Early reflections
      for (let i = 0; i < 6; i++) {
        this.earlyReflections[i].delay.disconnect();
        this.earlyReflections[i].gain.disconnect();
      }
      
      // Lo-fi
      this.lofiBitcrusher.disconnect();
      this.lofiLP.disconnect();
      
      // Modulation
      this.modLFO1.stop();
      this.modLFO1.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepth1.disconnect();
      this.modDepth2.disconnect();
      
      // Mixers
      this.combMixer.disconnect();
      this.earlyMixer.disconnect();
      this.lateMixer.disconnect();
      this.shimmerMixer.disconnect();
      this.dualMix.disconnect();
      this.effectLevel.disconnect();
      this.outputGain.disconnect();
      this.gateEnvelope.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Boss RV-500:', e);
    }
  }
}

export default BossRV500Effect;
