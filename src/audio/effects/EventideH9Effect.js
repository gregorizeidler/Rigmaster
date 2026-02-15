import BaseEffect from './BaseEffect';

/**
 * Eventide H9 - Multi-Effects Processor
 * 
 * 52 ALGORITHMS (agrupados por categoria):
 * 
 * REVERB (9):
 * - Hall, Plate, Spring, Room, Shimmer, ModEchoVerb, BlackHole, MangledVerb, UltraTap
 * 
 * DELAY (7):
 * - Vintage Delay, Tape Echo, Mod Delay, Ducking Delay, MultiTap, Reverse, Crystals
 * 
 * MODULATION (10):
 * - Chorus, Flanger, Phaser, Rotary, Undulator, TremoloPan, Vibrato, RingMod, ModFilter, Q-Wah
 * 
 * PITCH (8):
 * - H910/H949, Octaver, Diatonic, Quadravox, HarModulator, MicroPitch, PitchFlex, Crystals
 * 
 * DISTORTION (6):
 * - Bit Crusher, Hot Saw, Sculpt, Resonator, Ring Mod, Freq Echo
 * 
 * SPECIAL FX (12):
 * - Space, Freeze, Swell, Band Delay, Filter Pong, Looper, EQ Compressor, etc.
 * 
 * CONTROLES (físicos no H9):
 * - X, Y, Z knobs (assignable)
 * - HOTKNOB (expression pedal input)
 * - Preset system (99 presets)
 * - Tap tempo
 * - True bypass
 */
class EventideH9Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Eventide H9', 'eventideh9');
    
    // 52 algoritmos do H9 (principais)
    this.algorithms = {
      // REVERB
      'hall': 'Hall',
      'plate': 'Plate',
      'spring': 'Spring',
      'room': 'Room',
      'shimmer': 'Shimmer',
      'modechoverb': 'ModEchoVerb',
      'blackhole': 'BlackHole',
      'mangledverb': 'MangledVerb',
      'ultratap': 'UltraTap',
      
      // DELAY
      'vintagedelay': 'Vintage Delay',
      'tapeecho': 'Tape Echo',
      'moddelay': 'Mod Delay',
      'duckingdelay': 'Ducking Delay',
      'multitap': 'MultiTap',
      'reversedelay': 'Reverse',
      'crystals': 'Crystals',
      
      // MODULATION
      'chorus': 'Chorus',
      'flanger': 'Flanger',
      'phaser': 'Phaser',
      'rotary': 'Rotary',
      'undulator': 'Undulator',
      'tremolopan': 'TremoloPan',
      'vibrato': 'Vibrato',
      'ringmod': 'Ring Mod',
      'modfilter': 'Mod Filter',
      'qwah': 'Q-Wah',
      
      // PITCH
      'h910': 'H910 Harmonizer',
      'h949': 'H949 Harmonizer',
      'octaver': 'Octaver',
      'diatonic': 'Diatonic',
      'quadravox': 'Quadravox',
      'harmodulator': 'HarModulator',
      'micropitch': 'MicroPitch',
      'pitchflex': 'PitchFlex',
      
      // DISTORTION
      'bitcrusher': 'Bit Crusher',
      'hotsaw': 'Hot Saw',
      'sculpt': 'Sculpt',
      'resonator': 'Resonator',
      
      // SPECIAL FX
      'space': 'Space',
      'freeze': 'Freeze',
      'swell': 'Swell',
      'banddelay': 'Band Delay',
      'filterpong': 'Filter Pong'
    };
    
    this.currentAlgorithm = 'hall';
    
    // === REVERB ENGINE ===
    this.reverbCombFilters = [];
    for (let i = 0; i < 12; i++) {
      const delay = audioContext.createDelay(10.0);
      const feedback = audioContext.createGain();
      const dampFilter = audioContext.createBiquadFilter();
      delay.delayTime.value = 0.025 + (i * 0.005);
      feedback.gain.value = 0.85;
      dampFilter.type = 'lowpass';
      dampFilter.frequency.value = 5000;
      this.reverbCombFilters.push({ delay, feedback, dampFilter });
    }
    
    this.reverbAllpass = [];
    for (let i = 0; i < 6; i++) {
      const delay = audioContext.createDelay(0.1);
      const feedback = audioContext.createGain();
      delay.delayTime.value = 0.005 + (i * 0.003);
      feedback.gain.value = 0.7;
      this.reverbAllpass.push({ delay, feedback });
    }
    
    // === DELAY ENGINE ===
    this.delayL = audioContext.createDelay(10.0);
    this.delayR = audioContext.createDelay(10.0);
    this.delayL.delayTime.value = 0.5;
    this.delayR.delayTime.value = 0.5;
    
    this.delayFeedbackL = audioContext.createGain();
    this.delayFeedbackR = audioContext.createGain();
    this.delayFeedbackL.gain.value = 0.5;
    this.delayFeedbackR.gain.value = 0.5;
    
    // MultiTap delays
    this.multiTapDelays = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(5.0);
      const gain = audioContext.createGain();
      delay.delayTime.value = 0.1 * (i + 1);
      gain.gain.value = 1 / (i + 1); // Decay
      this.multiTapDelays.push({ delay, gain });
    }
    
    // === MODULATION ENGINE ===
    this.lfo1 = audioContext.createOscillator();
    this.lfo2 = audioContext.createOscillator();
    this.lfo3 = audioContext.createOscillator();
    this.lfoDepth1 = audioContext.createGain();
    this.lfoDepth2 = audioContext.createGain();
    this.lfoDepth3 = audioContext.createGain();
    this.lfo1.type = 'sine';
    this.lfo2.type = 'triangle';
    this.lfo3.type = 'square';
    this.lfo1.frequency.value = 0.5;
    this.lfo2.frequency.value = 1.0;
    this.lfo3.frequency.value = 2.0;
    this.lfoDepth1.gain.value = 0;
    this.lfoDepth2.gain.value = 0;
    this.lfoDepth3.gain.value = 0;
    this.lfo1.start();
    this.lfo2.start();
    this.lfo3.start();
    
    // Chorus/Flanger delays
    this.chorusDelayL = audioContext.createDelay(0.05);
    this.chorusDelayR = audioContext.createDelay(0.05);
    this.chorusDelayL.delayTime.value = 0.008;
    this.chorusDelayR.delayTime.value = 0.010;
    
    // Phaser allpass (8-stage)
    this.phaserAllpass = [];
    for (let i = 0; i < 8; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 200 + (i * 300);
      filter.Q.value = 1.0;
      this.phaserAllpass.push(filter);
    }
    
    // Rotary speaker simulation
    this.rotaryHornDelay = audioContext.createDelay(0.05);
    this.rotaryDrumDelay = audioContext.createDelay(0.05);
    this.rotaryHornAM = audioContext.createGain();
    this.rotaryDrumAM = audioContext.createGain();
    
    // === PITCH SHIFT ENGINE (H910/H949) ===
    this.pitchDelays = [];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(0.2);
      const gain = audioContext.createGain();
      delay.delayTime.value = 0.01 + (i * 0.005);
      gain.gain.value = 0;
      this.pitchDelays.push({ delay, gain });
    }
    
    // Quadravox (4-voice harmony)
    this.quadravoxVoices = [];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(0.1);
      const gain = audioContext.createGain();
      const pan = audioContext.createStereoPanner();
      delay.delayTime.value = 0.012 * (i + 1);
      gain.gain.value = 0;
      pan.pan.value = (i % 2 === 0) ? -0.5 : 0.5;
      this.quadravoxVoices.push({ delay, gain, pan });
    }
    
    // === DISTORTION ENGINE ===
    this.distortion = audioContext.createWaveShaper();
    this.distortion.oversample = '4x';
    this.distortion.curve = this.makeDistortionCurve(0);
    
    // Bit crusher
    this.bitcrusher = audioContext.createWaveShaper();
    this.bitcrusher.oversample = '4x';
    this.bitcrusher.curve = this.makeBitCrushCurve(16);
    
    // Resonator
    this.resonatorFilters = [];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200 * Math.pow(2, i);
      filter.Q.value = 10;
      this.resonatorFilters.push(filter);
    }
    
    // === FILTERS ===
    this.filterLP = audioContext.createBiquadFilter();
    this.filterHP = audioContext.createBiquadFilter();
    this.filterBP = audioContext.createBiquadFilter();
    this.filterLP.type = 'lowpass';
    this.filterHP.type = 'highpass';
    this.filterBP.type = 'bandpass';
    this.filterLP.frequency.value = 10000;
    this.filterHP.frequency.value = 20;
    this.filterBP.frequency.value = 1000;
    this.filterBP.Q.value = 5;
    
    // === BLACKHOLE (Infinite reverb) ===
    this.blackholeDelay = audioContext.createDelay(5.0);
    this.blackholeFeedback = audioContext.createGain();
    this.blackholeDelay.delayTime.value = 1.0;
    this.blackholeFeedback.gain.value = 0;
    
    // === FREEZE ===
    this.freezeBuffer = null;
    this.freezeGain = audioContext.createGain();
    this.freezeGain.gain.value = 0;
    
    // === DUCKING COMPRESSOR ===
    this.duckingComp = audioContext.createDynamicsCompressor();
    this.duckingComp.threshold.value = -20;
    this.duckingComp.ratio.value = 8;
    this.duckingComp.attack.value = 0.001;
    this.duckingComp.release.value = 0.2;
    
    // === STEREO PROCESSING ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.stereoWidth = audioContext.createGain();
    this.stereoWidth.gain.value = 1.0;
    
    // === X, Y, Z KNOBS (assignable) ===
    this.xKnob = 50; // 0-100
    this.yKnob = 50;
    this.zKnob = 50;
    this.hotKnob = 0; // Expression pedal input
    
    // === OUTPUT ===
    this.effectMix = audioContext.createGain();
    this.effectMix.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === PRESETS ===
    this.presets = new Array(99).fill(null);
    this.currentPreset = 0;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  makeDistortionCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 10);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * drive);
    }
    
    return curve;
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
    // Basic routing - will be reconfigured per algorithm
    this.input.connect(this.filterHP);
    this.filterHP.connect(this.filterLP);
    this.filterLP.connect(this.effectMix);
    
    // LFO connections
    this.lfo1.connect(this.lfoDepth1);
    this.lfo2.connect(this.lfoDepth2);
    this.lfo3.connect(this.lfoDepth3);
    
    // Output
    this.effectMix.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  setAlgorithm(algorithm) {
    this.currentAlgorithm = algorithm;
    const now = this.audioContext.currentTime;
    
    // Reset all gains
    this.effectMix.gain.setTargetAtTime(0.5, now, 0.01);
    
    // This would contain specific routing for each of the 52 algorithms
    // For brevity, showing key examples:
    
    switch (algorithm) {
      case 'hall':
        // Hall reverb
        for (let i = 0; i < 12; i++) {
          this.reverbCombFilters[i].feedback.gain.setTargetAtTime(0.88, now, 0.01);
        }
        break;
        
      case 'blackhole':
        // Infinite reverb
        this.blackholeFeedback.gain.setTargetAtTime(0.98, now, 0.01);
        break;
        
      case 'vintagedelay':
        // Analog-style delay
        this.delayFeedbackL.gain.setTargetAtTime(0.6, now, 0.01);
        this.lfoDepth1.gain.value = 0.001;
        this.lfo1.frequency.setTargetAtTime(0.3, now, 0.01);
        break;
        
      case 'h910':
        // Classic Eventide pitch shifter
        for (let i = 0; i < 4; i++) {
          this.pitchDelays[i].gain.setTargetAtTime(0.25, now, 0.01);
        }
        break;
        
      case 'quadravox':
        // 4-voice harmony
        for (let i = 0; i < 4; i++) {
          this.quadravoxVoices[i].gain.setTargetAtTime(0.25, now, 0.01);
        }
        break;
        
      case 'rotary':
        // Rotary speaker
        this.lfo1.frequency.setTargetAtTime(0.8, now, 0.01); // Slow
        this.lfo2.frequency.setTargetAtTime(6.0, now, 0.01); // Fast
        break;
        
      case 'bitcrusher':
        // Lo-fi crusher
        this.bitcrusher.curve = this.makeBitCrushCurve(8);
        break;
        
      // Add more algorithm-specific settings...
      default:
        break;
    }
    
    this.updateKnobAssignments();
  }
  
  updateKnobAssignments() {
    // X, Y, Z knobs are assigned to different parameters per algorithm
    // This is a simplified version - real H9 has complex routing
    
    const now = this.audioContext.currentTime;
    
    switch (this.currentAlgorithm) {
      case 'hall':
        // X=Size, Y=Decay, Z=ModDepth
        // Implementation would map xKnob value to reverb parameters
        break;
        
      case 'vintagedelay':
        // X=Time, Y=Feedback, Z=Flutter
        const time = 0.01 + (this.xKnob / 100) * 4.99;
        this.delayL.delayTime.setTargetAtTime(time, now, 0.01);
        this.delayFeedbackL.gain.setTargetAtTime(this.yKnob / 100, now, 0.01);
        this.lfoDepth1.gain.value = (this.zKnob / 100) * 0.003;
        break;
        
      // More algorithm-specific knob assignments...
    }
  }
  
  savePreset(slot) {
    if (slot < 0 || slot >= 99) return;
    
    this.presets[slot] = {
      algorithm: this.currentAlgorithm,
      xKnob: this.xKnob,
      yKnob: this.yKnob,
      zKnob: this.zKnob,
      mix: this.mix
      // More parameters...
    };
  }
  
  loadPreset(slot) {
    if (slot < 0 || slot >= 99 || !this.presets[slot]) return;
    
    const preset = this.presets[slot];
    this.setAlgorithm(preset.algorithm);
    this.xKnob = preset.xKnob;
    this.yKnob = preset.yKnob;
    this.zKnob = preset.zKnob;
    this.updateMix(preset.mix * 100);
    this.updateKnobAssignments();
    
    this.currentPreset = slot;
  }
  
  updateMix(value) {
    // Update wet/dry mix (0-100)
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'algorithm':
        this.setAlgorithm(value);
        break;
        
      case 'x':
        this.xKnob = value;
        this.updateKnobAssignments();
        break;
        
      case 'y':
        this.yKnob = value;
        this.updateKnobAssignments();
        break;
        
      case 'z':
        this.zKnob = value;
        this.updateKnobAssignments();
        break;
        
      case 'hotknob':
        // Expression pedal
        this.hotKnob = value;
        // Map to assignable parameter
        break;
        
      case 'preset':
        this.loadPreset(parseInt(value));
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
      algorithm: this.currentAlgorithm,
      x: this.xKnob,
      y: this.yKnob,
      z: this.zKnob,
      hotknob: this.hotKnob,
      mix: this.mix * 100,
      preset: this.currentPreset
    };
  }
  
  disconnect() {
    super.disconnect();
    try {
      // Reverb
      for (let i = 0; i < 12; i++) {
        this.reverbCombFilters[i].delay.disconnect();
        this.reverbCombFilters[i].feedback.disconnect();
        this.reverbCombFilters[i].dampFilter.disconnect();
      }
      for (let i = 0; i < 6; i++) {
        this.reverbAllpass[i].delay.disconnect();
        this.reverbAllpass[i].feedback.disconnect();
      }
      
      // Delay
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayFeedbackL.disconnect();
      this.delayFeedbackR.disconnect();
      
      for (let i = 0; i < 8; i++) {
        this.multiTapDelays[i].delay.disconnect();
        this.multiTapDelays[i].gain.disconnect();
      }
      
      // Modulation
      this.lfo1.stop();
      this.lfo1.disconnect();
      this.lfo2.stop();
      this.lfo2.disconnect();
      this.lfo3.stop();
      this.lfo3.disconnect();
      this.lfoDepth1.disconnect();
      this.lfoDepth2.disconnect();
      this.lfoDepth3.disconnect();
      
      this.chorusDelayL.disconnect();
      this.chorusDelayR.disconnect();
      
      for (let i = 0; i < 8; i++) {
        this.phaserAllpass[i].disconnect();
      }
      
      this.rotaryHornDelay.disconnect();
      this.rotaryDrumDelay.disconnect();
      this.rotaryHornAM.disconnect();
      this.rotaryDrumAM.disconnect();
      
      // Pitch
      for (let i = 0; i < 4; i++) {
        this.pitchDelays[i].delay.disconnect();
        this.pitchDelays[i].gain.disconnect();
        this.quadravoxVoices[i].delay.disconnect();
        this.quadravoxVoices[i].gain.disconnect();
        this.quadravoxVoices[i].pan.disconnect();
      }
      
      // Distortion
      this.distortion.disconnect();
      this.bitcrusher.disconnect();
      
      for (let i = 0; i < 4; i++) {
        this.resonatorFilters[i].disconnect();
      }
      
      // Filters
      this.filterLP.disconnect();
      this.filterHP.disconnect();
      this.filterBP.disconnect();
      
      // Special
      this.blackholeDelay.disconnect();
      this.blackholeFeedback.disconnect();
      this.freezeGain.disconnect();
      this.duckingComp.disconnect();
      
      // Stereo
      this.splitter.disconnect();
      this.merger.disconnect();
      this.stereoWidth.disconnect();
      
      // Output
      this.effectMix.disconnect();
      this.outputGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Eventide H9:', e);
    }
  }
}

export default EventideH9Effect;
