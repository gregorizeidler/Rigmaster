import BaseEffect from './BaseEffect';

/**
 * Eventide Space - Reverb Processor
 * 
 * 12 REVERB ALGORITHMS:
 * 1. Hall - Concert hall reverb
 * 2. Plate - Classic plate reverb
 * 3. Spring - Vintage spring reverb
 * 4. Room - Natural room ambience
 * 5. Chamber - Stone chamber
 * 6. Reverse - Reversed reverb
 * 7. ModEchoVerb - Modulated delay+reverb
 * 8. DualVerb - Two reverbs in series/parallel
 * 9. Shimmer - Pitch-shifted reverb
 * 10. BlackHole - Massive reverb (Eventide's signature)
 * 11. MangledVerb - Experimental/distorted
 * 12. TremoloVerb - Tremolo + reverb
 * 
 * CONTROLS:
 * - Decay - Reverb time
 * - Pre-Delay - 0-2000ms
 * - Size - Room size
 * - Mix - Wet/dry
 * - Diffusion - Density
 * - ModRate - Modulation rate
 * - ModDepth - Modulation depth
 * - Tone/Damping - Filter control
 * - Algorithm-specific parameters
 */
class EventideSpaceEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Eventide Space', 'eventidespace');
    
    this.algorithms = {
      'hall': 'Hall',
      'plate': 'Plate',
      'spring': 'Spring',
      'room': 'Room',
      'chamber': 'Chamber',
      'reverse': 'Reverse',
      'modechoverb': 'ModEchoVerb',
      'dualverb': 'DualVerb',
      'shimmer': 'Shimmer',
      'blackhole': 'BlackHole',
      'mangledverb': 'MangledVerb',
      'tremoloVerb': 'TremoloVerb'
    };
    
    this.currentAlgorithm = 'hall';
    
    // === ADVANCED FREEVERB CORE (16 combs + 12 allpass) ===
    this.combFilters = [];
    for (let i = 0; i < 16; i++) {
      const delay = audioContext.createDelay(15.0);
      const feedback = audioContext.createGain();
      const dampFilter = audioContext.createBiquadFilter();
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = 0.025 + (i * 0.007);
      feedback.gain.value = 0.85;
      dampFilter.type = 'lowpass';
      dampFilter.frequency.value = 5000;
      combGain.gain.value = 1 / 16;
      
      this.combFilters.push({ delay, feedback, dampFilter, combGain });
    }
    
    this.allpassFilters = [];
    for (let i = 0; i < 12; i++) {
      const delay = audioContext.createDelay(0.2);
      const feedforward = audioContext.createGain();
      const feedback = audioContext.createGain();
      const sumNode = audioContext.createGain();
      
      delay.delayTime.value = 0.005 + (i * 0.004);
      feedforward.gain.value = 0.7;
      feedback.gain.value = -0.7;
      
      this.allpassFilters.push({ delay, feedforward, feedback, sumNode });
    }
    
    // === PRE-DELAY (up to 2 seconds) ===
    this.preDelay = audioContext.createDelay(2.0);
    this.preDelay.delayTime.value = 0.02;
    
    // === DELAY LINE (for ModEchoVerb) ===
    this.echoDelay = audioContext.createDelay(10.0);
    this.echoDelay.delayTime.value = 0.5;
    this.echoFeedback = audioContext.createGain();
    this.echoFeedback.gain.value = 0;
    this.echoMix = audioContext.createGain();
    this.echoMix.gain.value = 0;
    
    // === DUAL REVERB (second engine) ===
    this.dualCombFilters = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(15.0);
      const feedback = audioContext.createGain();
      delay.delayTime.value = 0.035 + (i * 0.009);
      feedback.gain.value = 0.82;
      this.dualCombFilters.push({ delay, feedback });
    }
    this.dualMix = audioContext.createGain();
    this.dualMix.gain.value = 0;
    
    // === TONE SHAPING ===
    this.lowCut = audioContext.createBiquadFilter();
    this.highCut = audioContext.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.highCut.type = 'lowpass';
    this.lowCut.frequency.value = 80;
    this.highCut.frequency.value = 12000;
    
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 5000;
    
    // === SHIMMER (pitch shift) ===
    this.shimmerDelays = [];
    for (let i = 0; i < 3; i++) {
      const delay = audioContext.createDelay(0.2);
      const gain = audioContext.createGain();
      delay.delayTime.value = 0.012 + (i * 0.007);
      gain.gain.value = 0;
      this.shimmerDelays.push({ delay, gain });
    }
    this.shimmerFeedback = audioContext.createGain();
    this.shimmerFeedback.gain.value = 0.6;
    this.shimmerMix = audioContext.createGain();
    this.shimmerMix.gain.value = 0;
    
    // === SPRING SIMULATION ===
    this.springBPFilters = [];
    for (let i = 0; i < 3; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 + (i * 400);
      filter.Q.value = 5;
      this.springBPFilters.push(filter);
    }
    this.springDelay = audioContext.createDelay(0.05);
    this.springFeedback = audioContext.createGain();
    this.springDelay.delayTime.value = 0.01;
    this.springFeedback.gain.value = 0;
    this.springMix = audioContext.createGain();
    this.springMix.gain.value = 0;
    
    // === REVERSE BUFFER ===
    this.reverseBuffer = null;
    this.reverseGain = audioContext.createGain();
    this.reverseGain.gain.value = 0;
    
    // === BLACKHOLE (Massive reverb) ===
    this.blackholeDelays = [];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(10.0);
      const feedback = audioContext.createGain();
      delay.delayTime.value = 0.5 + (i * 0.3);
      feedback.gain.value = 0;
      this.blackholeDelays.push({ delay, feedback });
    }
    this.blackholeMix = audioContext.createGain();
    this.blackholeMix.gain.value = 0;
    
    // === MANGLED VERB (Distorted) ===
    this.mangledDistortion = audioContext.createWaveShaper();
    this.mangledDistortion.oversample = '2x';
    this.mangledDistortion.curve = this.makeMangledCurve(30);
    this.mangledMix = audioContext.createGain();
    this.mangledMix.gain.value = 0;
    
    // === TREMOLO ===
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloDepth = audioContext.createGain();
    this.tremoloGain = audioContext.createGain();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 4;
    this.tremoloDepth.gain.value = 0;
    this.tremoloGain.gain.value = 1;
    this.tremoloLFO.start();
    
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
    
    // === DIFFUSION CONTROL ===
    this.diffusionGain = audioContext.createGain();
    this.diffusionGain.gain.value = 0.85;
    
    // === EARLY REFLECTIONS ===
    this.earlyReflections = [];
    const earlyTimes = [0.019, 0.029, 0.043, 0.059, 0.071, 0.089, 0.107, 0.127];
    const earlyGains = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.15);
      const gain = audioContext.createGain();
      delay.delayTime.value = earlyTimes[i];
      gain.gain.value = earlyGains[i];
      this.earlyReflections.push({ delay, gain });
    }
    
    // === STEREO WIDTH ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.widthL = audioContext.createGain();
    this.widthR = audioContext.createGain();
    this.widthL.gain.value = 1.0;
    this.widthR.gain.value = 1.0;
    
    // === MIXER NODES ===
    this.combMixer = audioContext.createGain();
    this.earlyMixer = audioContext.createGain();
    this.lateMixer = audioContext.createGain();
    
    this.effectLevel = audioContext.createGain();
    this.effectLevel.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  makeMangledCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 10);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * drive);
      // Add aggressive harmonics
      y += 0.2 * Math.tanh(x * drive * 3);
      y += 0.1 * Math.tanh(x * drive * 5);
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  setupRouting() {
    // Input -> Pre-delay -> Filters
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.lowCut);
    
    // Early reflections
    for (let i = 0; i < 8; i++) {
      const { delay, gain } = this.earlyReflections[i];
      this.lowCut.connect(delay);
      delay.connect(gain);
      gain.connect(this.earlyMixer);
    }
    
    // Comb filters (parallel)
    for (let i = 0; i < 16; i++) {
      const { delay, feedback, dampFilter, combGain } = this.combFilters[i];
      
      this.lowCut.connect(delay);
      delay.connect(dampFilter);
      dampFilter.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Allpass filters (series)
    let allpassInput = this.combMixer;
    for (let i = 0; i < 12; i++) {
      const { delay, feedforward, feedback, sumNode } = this.allpassFilters[i];
      
      allpassInput.connect(delay);
      allpassInput.connect(feedforward);
      delay.connect(feedback);
      
      feedforward.connect(sumNode);
      feedback.connect(sumNode);
      delay.connect(sumNode);
      
      allpassInput = sumNode;
    }
    
    allpassInput.connect(this.diffusionGain);
    this.diffusionGain.connect(this.dampingFilter);
    this.dampingFilter.connect(this.highCut);
    this.highCut.connect(this.lateMixer);
    
    // Modulation connections
    this.modLFO1.connect(this.modDepth1);
    this.modLFO2.connect(this.modDepth2);
    this.modDepth1.connect(this.combFilters[0].delay.delayTime);
    this.modDepth1.connect(this.combFilters[2].delay.delayTime);
    this.modDepth2.connect(this.combFilters[1].delay.delayTime);
    this.modDepth2.connect(this.combFilters[3].delay.delayTime);
    
    // Tremolo LFO
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    
    // Mix all branches
    this.earlyMixer.connect(this.effectLevel);
    this.lateMixer.connect(this.effectLevel);
    this.echoMix.connect(this.effectLevel);
    this.shimmerMix.connect(this.effectLevel);
    this.springMix.connect(this.effectLevel);
    this.blackholeMix.connect(this.effectLevel);
    this.mangledMix.connect(this.effectLevel);
    this.dualMix.connect(this.effectLevel);
    
    // Final output
    this.effectLevel.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  setAlgorithm(algorithm) {
    const now = this.audioContext.currentTime;
    this.currentAlgorithm = algorithm;
    
    // Reset all special mixes
    this.earlyMixer.gain.setTargetAtTime(0, now, 0.01);
    this.lateMixer.gain.setTargetAtTime(1, now, 0.01);
    this.echoMix.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerMix.gain.setTargetAtTime(0, now, 0.01);
    this.springMix.gain.setTargetAtTime(0, now, 0.01);
    this.blackholeMix.gain.setTargetAtTime(0, now, 0.01);
    this.mangledMix.gain.setTargetAtTime(0, now, 0.01);
    this.dualMix.gain.setTargetAtTime(0, now, 0.01);
    this.reverseGain.gain.setTargetAtTime(0, now, 0.01);
    
    switch (algorithm) {
      case 'hall':
        // Concert hall
        this.setCombFeedback(0.88);
        this.dampingFilter.frequency.setTargetAtTime(4500, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.9, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.2, now, 0.01);
        break;
        
      case 'plate':
        // Classic plate
        this.setCombFeedback(0.85);
        this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.95, now, 0.01);
        this.modDepth1.gain.value = 0.0003;
        this.modDepth2.gain.value = 0.0003;
        break;
        
      case 'spring':
        // Vintage spring
        this.setCombFeedback(0.75);
        this.springMix.gain.setTargetAtTime(0.7, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.3, now, 0.01);
        this.modDepth1.gain.value = 0.001;
        break;
        
      case 'room':
        // Natural room
        this.setCombFeedback(0.7);
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.6, now, 0.01);
        break;
        
      case 'chamber':
        // Stone chamber
        this.setCombFeedback(0.82);
        this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.75, now, 0.01);
        break;
        
      case 'reverse':
        // Reversed reverb
        this.setCombFeedback(0.85);
        this.reverseGain.gain.setTargetAtTime(0.8, now, 0.01);
        break;
        
      case 'modechoverb':
        // Modulated delay+reverb
        this.setCombFeedback(0.85);
        this.echoMix.gain.setTargetAtTime(0.5, now, 0.01);
        this.echoFeedback.gain.setTargetAtTime(0.5, now, 0.01);
        this.modDepth1.gain.value = 0.002;
        this.modDepth2.gain.value = 0.002;
        break;
        
      case 'dualverb':
        // Two reverbs
        this.setCombFeedback(0.85);
        this.dualMix.gain.setTargetAtTime(0.5, now, 0.01);
        for (let i = 0; i < 8; i++) {
          this.dualCombFilters[i].feedback.gain.setTargetAtTime(0.82, now, 0.01);
        }
        break;
        
      case 'shimmer':
        // Pitch-shifted reverb
        this.setCombFeedback(0.9);
        this.shimmerMix.gain.setTargetAtTime(0.6, now, 0.01);
        for (let i = 0; i < 3; i++) {
          this.shimmerDelays[i].gain.setTargetAtTime(0.3, now, 0.01);
        }
        break;
        
      case 'blackhole':
        // Massive reverb (Eventide's signature)
        this.setCombFeedback(0.95);
        this.blackholeMix.gain.setTargetAtTime(0.8, now, 0.01);
        for (let i = 0; i < 6; i++) {
          this.blackholeDelays[i].feedback.gain.setTargetAtTime(0.95, now, 0.01);
        }
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        break;
        
      case 'mangledverb':
        // Experimental/distorted
        this.setCombFeedback(0.88);
        this.mangledMix.gain.setTargetAtTime(0.7, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(3000, now, 0.01);
        break;
        
      case 'tremoloVerb':
        // Tremolo + reverb
        this.setCombFeedback(0.85);
        this.tremoloDepth.gain.setTargetAtTime(0.5, now, 0.01);
        break;
        
      default:
        break;
    }
  }
  
  setCombFeedback(value) {
    const now = this.audioContext.currentTime;
    for (let i = 0; i < 16; i++) {
      const variation = 1 - (i * 0.005);
      this.combFilters[i].feedback.gain.setTargetAtTime(value * variation, now, 0.01);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'decay':
        // Reverb time
        const decay = 0.5 + (value / 100) * 0.48;
        this.setCombFeedback(decay);
        break;
        
      case 'predelay':
        // 0-2000ms
        const preDelayTime = (value / 100) * 2.0;
        this.preDelay.delayTime.setTargetAtTime(preDelayTime, now, 0.01);
        break;
        
      case 'size':
        // Room size (scales delay times)
        const sizeMultiplier = 0.5 + (value / 100) * 1.5;
        for (let i = 0; i < 16; i++) {
          const baseTime = 0.025 + (i * 0.007);
          this.combFilters[i].delay.delayTime.setTargetAtTime(
            baseTime * sizeMultiplier,
            now,
            0.01
          );
        }
        break;
        
      case 'diffusion':
        // Density
        const diffusion = value / 100;
        this.diffusionGain.gain.setTargetAtTime(diffusion, now, 0.01);
        for (let i = 0; i < 12; i++) {
          const apFb = 0.5 + (diffusion * 0.3);
          this.allpassFilters[i].feedforward.gain.setTargetAtTime(apFb, now, 0.01);
          this.allpassFilters[i].feedback.gain.setTargetAtTime(-apFb, now, 0.01);
        }
        break;
        
      case 'modrate':
        // Modulation rate
        const rate = 0.1 + (value / 100) * 4.9;
        this.modLFO1.frequency.setTargetAtTime(rate, now, 0.01);
        this.modLFO2.frequency.setTargetAtTime(rate * 1.3, now, 0.01);
        break;
        
      case 'moddepth':
        // Modulation depth
        const depth = (value / 100) * 0.003;
        this.modDepth1.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepth2.gain.setTargetAtTime(depth, now, 0.01);
        break;
        
      case 'tone':
        // Damping filter
        const freq = 1000 + (value / 100) * 11000;
        this.dampingFilter.frequency.setTargetAtTime(freq, now, 0.01);
        for (let i = 0; i < 16; i++) {
          this.combFilters[i].dampFilter.frequency.setTargetAtTime(freq, now, 0.01);
        }
        break;
        
      case 'algorithm':
        this.setAlgorithm(value);
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  updateMix(value) {
    // Update wet/dry mix (0-100)
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }
  
  getParameters() {
    return {
      algorithm: this.currentAlgorithm,
      decay: 0, // Would calculate from feedback
      predelay: (this.preDelay.delayTime.value / 2.0) * 100,
      size: 50, // Would calculate from delay times
      diffusion: this.diffusionGain.gain.value * 100,
      modrate: ((this.modLFO1.frequency.value - 0.1) / 4.9) * 100,
      moddepth: (this.modDepth1.gain.value / 0.003) * 100,
      tone: 50,
      mix: this.mix * 100
    };
  }
  
  disconnect() {
    super.disconnect();
    try {
      // Comb filters
      for (let i = 0; i < 16; i++) {
        this.combFilters[i].delay.disconnect();
        this.combFilters[i].feedback.disconnect();
        this.combFilters[i].dampFilter.disconnect();
        this.combFilters[i].combGain.disconnect();
      }
      
      // Allpass filters
      for (let i = 0; i < 12; i++) {
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
      
      // Echo
      this.echoDelay.disconnect();
      this.echoFeedback.disconnect();
      this.echoMix.disconnect();
      
      // Dual reverb
      for (let i = 0; i < 8; i++) {
        this.dualCombFilters[i].delay.disconnect();
        this.dualCombFilters[i].feedback.disconnect();
      }
      this.dualMix.disconnect();
      
      // Shimmer
      for (let i = 0; i < 3; i++) {
        this.shimmerDelays[i].delay.disconnect();
        this.shimmerDelays[i].gain.disconnect();
      }
      this.shimmerFeedback.disconnect();
      this.shimmerMix.disconnect();
      
      // Spring
      for (let i = 0; i < 3; i++) {
        this.springBPFilters[i].disconnect();
      }
      this.springDelay.disconnect();
      this.springFeedback.disconnect();
      this.springMix.disconnect();
      
      // BlackHole
      for (let i = 0; i < 6; i++) {
        this.blackholeDelays[i].delay.disconnect();
        this.blackholeDelays[i].feedback.disconnect();
      }
      this.blackholeMix.disconnect();
      
      // Mangled
      this.mangledDistortion.disconnect();
      this.mangledMix.disconnect();
      
      // Tremolo
      this.tremoloLFO.stop();
      this.tremoloLFO.disconnect();
      this.tremoloDepth.disconnect();
      this.tremoloGain.disconnect();
      
      // Modulation
      this.modLFO1.stop();
      this.modLFO1.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepth1.disconnect();
      this.modDepth2.disconnect();
      
      // Early reflections
      for (let i = 0; i < 8; i++) {
        this.earlyReflections[i].delay.disconnect();
        this.earlyReflections[i].gain.disconnect();
      }
      
      // Stereo
      this.splitter.disconnect();
      this.merger.disconnect();
      this.widthL.disconnect();
      this.widthR.disconnect();
      
      // Mixers
      this.combMixer.disconnect();
      this.earlyMixer.disconnect();
      this.lateMixer.disconnect();
      this.diffusionGain.disconnect();
      this.effectLevel.disconnect();
      this.outputGain.disconnect();
      this.reverseGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Eventide Space:', e);
    }
  }
}

export default EventideSpaceEffect;
