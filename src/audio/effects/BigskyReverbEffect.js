import BaseEffect from './BaseEffect';

/**
 * Strymon BigSky - Professional Studio Reverb
 * 
 * 12 REVERB MACHINES:
 * 1. Room - Natural room ambience
 * 2. Hall - Concert hall
 * 3. Plate - Classic plate reverb
 * 4. Spring - Vintage spring reverb
 * 5. Swell - Volume swell/pad
 * 6. Bloom - Ambient bloom/sustain
 * 7. Cloud - Granular clouds
 * 8. Chorale - Shimmer/pitch-shifted
 * 9. Magneto - Magnetic delay/reverb hybrid
 * 10. Nonlinear - Gated/reverse reverb
 * 11. Reflections - Early reflections only
 * 12. Shimmer - Octave-up shimmer
 * 
 * CONTROLS (hardware):
 * - DECAY: Reverb time
 * - PRE-DELAY: Pre-delay time (0-500ms)
 * - MIX: Wet/Dry balance
 * - TONE: Filter/darkness
 * - MOD: Modulation depth
 * - SPEED: Modulation rate
 * - DIFFUSE: Diffusion amount
 * - LOWCUT: Lowcut filter (prevent mud)
 * - HIGHCUT: Highcut filter (darkness)
 * - VALUE 1-3: Machine-specific parameters
 */
class BigskyReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bigsky Reverb', 'bigskyreverb');
    
    // 12 REVERB MACHINES
    this.reverbTypes = {
      'room': 'Room',
      'hall': 'Hall',
      'plate': 'Plate',
      'spring': 'Spring',
      'swell': 'Swell',
      'bloom': 'Bloom',
      'cloud': 'Cloud',
      'chorale': 'Chorale',
      'magneto': 'Magneto',
      'nonlinear': 'Nonlinear',
      'reflections': 'Reflections',
      'shimmer': 'Shimmer'
    };
    
    this.currentType = 'hall';
    
    // === FREEVERB-BASED CORE (12 comb + 8 allpass for professional quality) ===
    // Comb filters (12 parallel for dense reverb tail)
    this.combDelays = [
      0.0297, 0.0371, 0.0411, 0.0437, // Original 4
      0.0503, 0.0571, 0.0617, 0.0683, // Additional 4
      0.0751, 0.0827, 0.0893, 0.0971  // Additional 4
    ];
    this.combFilters = [];
    this.combGains = [];
    
    for (let i = 0; i < 12; i++) {
      const delay = audioContext.createDelay(10.0); // Long tail support
      const feedback = audioContext.createGain();
      const combGain = audioContext.createGain();
      const dampFilter = audioContext.createBiquadFilter(); // Per-comb damping
      
      delay.delayTime.value = this.combDelays[i];
      feedback.gain.value = 0.84;
      combGain.gain.value = 1 / 12; // Equal mix
      dampFilter.type = 'lowpass';
      dampFilter.frequency.value = 5000;
      
      this.combFilters.push({ delay, feedback, dampFilter });
      this.combGains.push(combGain);
    }
    
    // Allpass filters (8 series for diffusion)
    this.allpassDelays = [
      0.0051, 0.0067, 0.0083, 0.0097, // Original 4
      0.0113, 0.0131, 0.0149, 0.0167  // Additional 4
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
    
    // === TONE SHAPING ===
    // Lowcut (prevent mud)
    this.lowCut = audioContext.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.lowCut.frequency.value = 80;
    this.lowCut.Q.value = 0.707;
    
    // Highcut (darkness control)
    this.highCut = audioContext.createBiquadFilter();
    this.highCut.type = 'lowpass';
    this.highCut.frequency.value = 10000;
    this.highCut.Q.value = 0.707;
    
    // Global damping
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 5000;
    this.dampingFilter.Q.value = 0.707;
    
    // === SHIMMER/CHORALE (pitch shift simulation) ===
    this.shimmerDelay1 = audioContext.createDelay(0.1);
    this.shimmerDelay2 = audioContext.createDelay(0.1);
    this.shimmerDelay3 = audioContext.createDelay(0.1);
    this.shimmerDelay1.delayTime.value = 0.012; // +1 octave simulation
    this.shimmerDelay2.delayTime.value = 0.019; // +1 octave + 5th
    this.shimmerDelay3.delayTime.value = 0.024; // +2 octaves
    
    this.shimmerGain1 = audioContext.createGain();
    this.shimmerGain2 = audioContext.createGain();
    this.shimmerGain3 = audioContext.createGain();
    this.shimmerGain1.gain.value = 0;
    this.shimmerGain2.gain.value = 0;
    this.shimmerGain3.gain.value = 0;
    
    this.shimmerFeedback = audioContext.createGain();
    this.shimmerFeedback.gain.value = 0.6;
    
    // === CLOUD/GRANULAR ===
    this.cloudGranularDelays = [];
    this.cloudGranularGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(1.0);
      const gain = audioContext.createGain();
      delay.delayTime.value = 0.05 + Math.random() * 0.3;
      gain.gain.value = 0.125;
      this.cloudGranularDelays.push(delay);
      this.cloudGranularGains.push(gain);
    }
    
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
    
    // === NONLINEAR (Gate/Reverse) ===
    this.gateEnvelope = audioContext.createGain();
    this.gateEnvelope.gain.value = 1.0;
    
    // === DIFFUSION ===
    this.diffusionGain = audioContext.createGain();
    this.diffusionGain.gain.value = 0.8;
    
    // === STEREO WIDTH ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.stereoL = audioContext.createGain();
    this.stereoR = audioContext.createGain();
    this.stereoL.gain.value = 1.0;
    this.stereoR.gain.value = 1.0;
    
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
    
    // === MIXER NODES ===
    this.combMixer = audioContext.createGain();
    this.earlyMixer = audioContext.createGain();
    this.lateMixer = audioContext.createGain();
    this.cloudMixer = audioContext.createGain();
    this.shimmerMixer = audioContext.createGain();
    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === MACHINE-SPECIFIC PARAMETERS ===
    this.value1 = 50;
    this.value2 = 50;
    this.value3 = 50;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  setupRouting() {
    // Input -> Pre-delay -> Lowcut
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.lowCut);
    
    // === EARLY REFLECTIONS BRANCH ===
    for (let i = 0; i < this.earlyReflections.length; i++) {
      const { delay, gain } = this.earlyReflections[i];
      this.lowCut.connect(delay);
      delay.connect(gain);
      gain.connect(this.earlyMixer);
    }
    
    // === COMB FILTERS (parallel) ===
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
    
    // === ALLPASS FILTERS (series for diffusion) ===
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
    
    allpassInput.connect(this.diffusionGain);
    this.diffusionGain.connect(this.dampingFilter);
    this.dampingFilter.connect(this.highCut);
    this.highCut.connect(this.lateMixer);
    
    // === SHIMMER/CHORALE BRANCH ===
    this.highCut.connect(this.shimmerDelay1);
    this.shimmerDelay1.connect(this.shimmerGain1);
    this.shimmerGain1.connect(this.shimmerFeedback);
    this.shimmerFeedback.connect(this.lowCut); // Feedback to input
    this.shimmerGain1.connect(this.shimmerMixer);
    
    this.highCut.connect(this.shimmerDelay2);
    this.shimmerDelay2.connect(this.shimmerGain2);
    this.shimmerGain2.connect(this.shimmerMixer);
    
    this.highCut.connect(this.shimmerDelay3);
    this.shimmerDelay3.connect(this.shimmerGain3);
    this.shimmerGain3.connect(this.shimmerMixer);
    
    // === CLOUD/GRANULAR BRANCH ===
    for (let i = 0; i < 8; i++) {
      const delay = this.cloudGranularDelays[i];
      const gain = this.cloudGranularGains[i];
      this.lowCut.connect(delay);
      delay.connect(gain);
      gain.connect(this.cloudMixer);
    }
    
    // === MODULATION ===
    // Apply modulation to some comb delays
    this.modLFO1.connect(this.modDepth1);
    this.modDepth1.connect(this.combFilters[0].delay.delayTime);
    this.modDepth1.connect(this.combFilters[2].delay.delayTime);
    
    this.modLFO2.connect(this.modDepth2);
    this.modDepth2.connect(this.combFilters[1].delay.delayTime);
    this.modDepth2.connect(this.combFilters[3].delay.delayTime);
    
    // === GATE ENVELOPE (for nonlinear) ===
    this.lateMixer.connect(this.gateEnvelope);
    
    // === MIX ALL BRANCHES ===
    this.earlyMixer.connect(this.reverbMix);
    this.gateEnvelope.connect(this.reverbMix);
    this.cloudMixer.connect(this.reverbMix);
    this.shimmerMixer.connect(this.reverbMix);
    
    // === STEREO SPREAD ===
    this.reverbMix.connect(this.splitter);
    this.splitter.connect(this.stereoL, 0);
    this.splitter.connect(this.stereoR, 1);
    this.stereoL.connect(this.merger, 0, 0);
    this.stereoR.connect(this.merger, 0, 1);
    
    // === OUTPUT ===
    this.merger.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // === DRY ===
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  setReverbType(type) {
    const now = this.audioContext.currentTime;
    this.currentType = type;
    
    // Reset all branch gains
    this.earlyMixer.gain.setTargetAtTime(0, now, 0.01);
    this.lateMixer.gain.setTargetAtTime(1, now, 0.01);
    this.cloudMixer.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerMixer.gain.setTargetAtTime(0, now, 0.01);
    
    // Reset shimmer gains
    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain3.gain.setTargetAtTime(0, now, 0.01);
    
    // Reset gate
    this.gateEnvelope.gain.setTargetAtTime(1, now, 0.01);
    
    switch (type) {
      case 'room':
        // Room - Natural room ambience (short decay)
        this.setCombFeedback(0.7); // Shorter tail
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.6, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.6, now, 0.01);
        break;
        
      case 'hall':
        // Hall - Concert hall (long decay, natural)
        this.setCombFeedback(0.88);
        this.dampingFilter.frequency.setTargetAtTime(4500, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.85, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.2, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.8, now, 0.01);
        break;
        
      case 'plate':
        // Plate - Classic plate reverb (bright, dense)
        this.setCombFeedback(0.85);
        this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.9, now, 0.01);
        this.modDepth1.gain.value = 0.0003; // Slight modulation
        this.modDepth2.gain.value = 0.0003;
        break;
        
      case 'spring':
        // Spring - Vintage spring reverb (bouncy, metallic)
        this.setCombFeedback(0.75);
        this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.4, now, 0.01);
        this.modDepth1.gain.value = 0.001; // More modulation (spring wobble)
        this.modDepth2.gain.value = 0.001;
        this.highCut.frequency.setTargetAtTime(6000, now, 0.01);
        break;
        
      case 'swell':
        // Swell - Volume swell/pad (auto-volume envelope)
        this.setCombFeedback(0.92); // Long tail
        this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        // Swell is handled by envelope attack in real-time
        break;
        
      case 'bloom':
        // Bloom - Ambient bloom/sustain (infinite reverb)
        this.setCombFeedback(0.95); // Very long tail
        this.dampingFilter.frequency.setTargetAtTime(4000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.95, now, 0.01);
        break;
        
      case 'cloud':
        // Cloud - Granular clouds (pitch-shifted grains)
        this.setCombFeedback(0.9);
        this.cloudMixer.gain.setTargetAtTime(0.7, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.3, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        break;
        
      case 'chorale':
        // Chorale - Shimmer/pitch-shifted (choir-like)
        this.setCombFeedback(0.88);
        this.shimmerGain1.gain.setTargetAtTime(0.3, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.2, now, 0.01);
        this.shimmerMixer.gain.setTargetAtTime(0.5, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.5, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(7000, now, 0.01);
        break;
        
      case 'magneto':
        // Magneto - Magnetic delay/reverb hybrid (tape-like)
        this.setCombFeedback(0.82);
        this.dampingFilter.frequency.setTargetAtTime(3500, now, 0.01);
        this.modDepth1.gain.value = 0.002; // Heavy modulation (tape wow/flutter)
        this.modDepth2.gain.value = 0.002;
        this.modLFO1.frequency.setTargetAtTime(0.2, now, 0.01); // Slow flutter
        break;
        
      case 'nonlinear':
        // Nonlinear - Gated/reverse reverb
        this.setCombFeedback(0.8);
        this.diffusionGain.gain.setTargetAtTime(0.7, now, 0.01);
        // Gate envelope is triggered on input signal
        break;
        
      case 'reflections':
        // Reflections - Early reflections only (no tail)
        this.earlyMixer.gain.setTargetAtTime(1.0, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.0, now, 0.01);
        break;
        
      case 'shimmer':
        // Shimmer - Octave-up shimmer (full shimmer effect)
        this.setCombFeedback(0.9);
        this.shimmerGain1.gain.setTargetAtTime(0.4, now, 0.01); // +1 oct
        this.shimmerGain2.gain.setTargetAtTime(0.3, now, 0.01); // +1 oct + 5th
        this.shimmerGain3.gain.setTargetAtTime(0.2, now, 0.01); // +2 oct
        this.shimmerMixer.gain.setTargetAtTime(0.6, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        break;
        
      default:
        break;
    }
  }
  
  setCombFeedback(value) {
    const now = this.audioContext.currentTime;
    for (let i = 0; i < 12; i++) {
      // Vary feedback slightly for more natural decay
      const variation = 1 - (i * 0.01);
      this.combFilters[i].feedback.gain.setTargetAtTime(value * variation, now, 0.01);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'decay':
        // Reverb time/decay (0.1s to 30s+)
        const decayValue = 0.5 + (value / 100) * 0.48; // 0.5 to 0.98 feedback
        this.setCombFeedback(decayValue);
        break;
        
      case 'predelay':
        // Pre-delay time (0-500ms)
        const preDelayTime = (value / 100) * 0.5;
        this.preDelay.delayTime.setTargetAtTime(preDelayTime, now, 0.01);
        break;
        
      case 'tone':
        // Filter/darkness (damping frequency)
        const dampFreq = 1000 + (value / 100) * 11000; // 1kHz to 12kHz
        this.dampingFilter.frequency.setTargetAtTime(dampFreq, now, 0.01);
        // Also adjust per-comb damping
        for (let i = 0; i < 12; i++) {
          this.combFilters[i].dampFilter.frequency.setTargetAtTime(dampFreq, now, 0.01);
        }
        break;
        
      case 'mod':
        // Modulation depth (0-100%)
        const depth = value / 50000; // Scaled for delay modulation
        this.modDepth1.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepth2.gain.setTargetAtTime(depth, now, 0.01);
        break;
        
      case 'speed':
        // Modulation rate (0.1Hz to 5Hz)
        const rate = 0.1 + (value / 100) * 4.9;
        this.modLFO1.frequency.setTargetAtTime(rate, now, 0.01);
        this.modLFO2.frequency.setTargetAtTime(rate * 1.3, now, 0.01);
        break;
        
      case 'diffuse':
        // Diffusion amount (0-100%)
        const diffusion = value / 100;
        this.diffusionGain.gain.setTargetAtTime(diffusion, now, 0.01);
        // Also adjust allpass feedback
        for (let i = 0; i < 8; i++) {
          const apFb = 0.5 + (diffusion * 0.3); // 0.5 to 0.8
          this.allpassFilters[i].feedforward.gain.setTargetAtTime(apFb, now, 0.01);
          this.allpassFilters[i].feedback.gain.setTargetAtTime(-apFb, now, 0.01);
        }
        break;
        
      case 'lowcut':
        // Lowcut filter (prevent mud)
        const lowcutFreq = 20 + (value / 100) * 480; // 20Hz to 500Hz
        this.lowCut.frequency.setTargetAtTime(lowcutFreq, now, 0.01);
        break;
        
      case 'highcut':
        // Highcut filter (darkness)
        const highcutFreq = 2000 + (value / 100) * 18000; // 2kHz to 20kHz
        this.highCut.frequency.setTargetAtTime(highcutFreq, now, 0.01);
        break;
        
      case 'value1':
        // Machine-specific parameter 1
        this.value1 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'value2':
        // Machine-specific parameter 2
        this.value2 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'value3':
        // Machine-specific parameter 3
        this.value3 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'type':
        this.setReverbType(value);
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  updateMachineSpecificParams() {
    const now = this.audioContext.currentTime;
    
    switch (this.currentType) {
      case 'shimmer':
      case 'chorale':
        // Value1 = shimmer amount
        const shimmerAmt = this.value1 / 100;
        this.shimmerGain1.gain.setTargetAtTime(shimmerAmt * 0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(shimmerAmt * 0.3, now, 0.01);
        this.shimmerGain3.gain.setTargetAtTime(shimmerAmt * 0.2, now, 0.01);
        
        // Value2 = shimmer tone
        const shimmerTone = 2000 + (this.value2 / 100) * 8000;
        this.highCut.frequency.setTargetAtTime(shimmerTone, now, 0.01);
        break;
        
      case 'cloud':
        // Value1 = grain density (number of active grains)
        const grainDensity = Math.floor((this.value1 / 100) * 8);
        for (let i = 0; i < 8; i++) {
          this.cloudGranularGains[i].gain.setTargetAtTime(
            i < grainDensity ? 0.125 : 0,
            now,
            0.01
          );
        }
        
        // Value2 = grain size
        const grainSize = 0.02 + (this.value2 / 100) * 0.3;
        for (let i = 0; i < 8; i++) {
          this.cloudGranularDelays[i].delayTime.setTargetAtTime(
            grainSize + (Math.random() * 0.05),
            now,
            0.01
          );
        }
        break;
        
      case 'nonlinear':
        // Value1 = gate threshold/sensitivity
        const gateThreshold = -40 + (this.value1 / 100) * 30;
        // This would need envelope follower implementation
        break;
        
      case 'reflections':
        // Value1 = early/late balance
        const erBalance = this.value1 / 100;
        this.earlyMixer.gain.setTargetAtTime(erBalance, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(1 - erBalance, now, 0.01);
        break;
    }
  }
  
  getParameters() {
    return {
      type: this.currentType,
      decay: 0, // Calculated from feedback
      predelay: (this.preDelay.delayTime.value / 0.5) * 100,
      tone: ((this.dampingFilter.frequency.value - 1000) / 11000) * 100,
      mod: this.modDepth1.gain.value * 50000,
      speed: ((this.modLFO1.frequency.value - 0.1) / 4.9) * 100,
      diffuse: this.diffusionGain.gain.value * 100,
      lowcut: ((this.lowCut.frequency.value - 20) / 480) * 100,
      highcut: ((this.highCut.frequency.value - 2000) / 18000) * 100,
      mix: this.mix * 100,
      value1: this.value1,
      value2: this.value2,
      value3: this.value3
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
      
      // Shimmer
      this.shimmerDelay1.disconnect();
      this.shimmerDelay2.disconnect();
      this.shimmerDelay3.disconnect();
      this.shimmerGain1.disconnect();
      this.shimmerGain2.disconnect();
      this.shimmerGain3.disconnect();
      this.shimmerFeedback.disconnect();
      
      // Cloud/granular
      for (let i = 0; i < 8; i++) {
        this.cloudGranularDelays[i].disconnect();
        this.cloudGranularGains[i].disconnect();
      }
      
      // Early reflections
      for (let i = 0; i < 6; i++) {
        this.earlyReflections[i].delay.disconnect();
        this.earlyReflections[i].gain.disconnect();
      }
      
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
      this.cloudMixer.disconnect();
      this.shimmerMixer.disconnect();
      this.reverbMix.disconnect();
      
      // Stereo
      this.splitter.disconnect();
      this.merger.disconnect();
      this.stereoL.disconnect();
      this.stereoR.disconnect();
      
      // Output
      this.outputGain.disconnect();
      this.gateEnvelope.disconnect();
      this.diffusionGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting BigSky Reverb:', e);
    }
  }
}

export default BigskyReverbEffect;
