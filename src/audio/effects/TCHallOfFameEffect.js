import BaseEffect from './BaseEffect';

/**
 * TCHallOfFameEffect - TC Electronic Hall of Fame Reverb
 * 
 * Top-selling affordable reverb
 * TonePrint technology
 * 
 * Features:
 * - 10 reverb types
 * - Simple 3-knob control
 * - Pristine sound quality
 */

class TCHallOfFameEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Hall of Fame', 'tchalloffame');
    
    // Convolver
    this.convolver = audioContext.createConvolver();
    
    // Pre-delay
    this.preDelay = audioContext.createDelay(0.5);
    this.preDelay.delayTime.value = 0;
    
    // Tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 10000;
    this.toneFilter.Q.value = 0.707;
    
    // Decay (via feedback)
    this.decayGain = audioContext.createGain();
    this.decayGain.gain.value = 0.5;
    
    // Mix
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.3;
    
    // Current type
    this.reverbType = 'hall';
    
    // Generate IR
    this.generateIR(this.reverbType);
    
    // Connect
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.convolver);
    this.convolver.connect(this.toneFilter);
    this.toneFilter.connect(this.decayGain);
    this.decayGain.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  generateIR(type) {
    const sampleRate = this.audioContext.sampleRate;
    let duration, decay, character;
    
    const types = {
      'spring': { duration: 0.8, decay: 0.4, metallic: true },
      'hall': { duration: 3.0, decay: 2.5, smooth: true },
      'plate': { duration: 2.5, decay: 2.0, dense: true },
      'room': { duration: 1.0, decay: 0.8, tight: true },
      'church': { duration: 5.0, decay: 4.0, smooth: true },
      'mod': { duration: 2.0, decay: 1.5, modulated: true },
      'tile': { duration: 1.5, decay: 1.0, bright: true },
      'ambient': { duration: 4.0, decay: 3.5, spacious: true },
      'lo-fi': { duration: 1.5, decay: 1.0, degraded: true },
      'gate': { duration: 0.5, decay: 0.3, gated: true }
    };
    
    const settings = types[type] || types['hall'];
    duration = settings.duration;
    decay = settings.decay;
    
    const length = Math.floor(duration * sampleRate);
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        let envelope = Math.exp(-i / (sampleRate * decay));
        
        if (settings.gated && i > length * 0.5) {
          envelope *= Math.exp(-((i - length * 0.5) / (sampleRate * 0.1)));
        }
        
        let sample = (Math.random() * 2 - 1) * envelope;
        
        if (settings.metallic) {
          sample += Math.sin(i * 0.05) * 0.3 * envelope;
        }
        
        if (settings.dense) {
          sample *= Math.random() * 0.9;
        }
        
        if (settings.modulated) {
          sample *= 1 + Math.sin(i * 0.001) * 0.2;
        }
        
        if (settings.degraded) {
          if (i % 10 === 0) sample *= 0.5;
        }
        
        data[i] = sample;
      }
    }
    
    this.convolver.buffer = buffer;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'decay':
        this.decayGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(2000 + (value / 100) * 18000, now, 0.01);
        break;
        
      case 'level':
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'predelay':
        this.preDelay.delayTime.setTargetAtTime((value / 100) * 0.5, now, 0.01);
        break;
        
      case 'type':
        this.reverbType = value;
        this.generateIR(value);
        break;
    }
  }
}

export default TCHallOfFameEffect;

