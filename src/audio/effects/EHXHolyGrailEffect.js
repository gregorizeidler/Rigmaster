import BaseEffect from './BaseEffect';

/**
 * EHXHolyGrailEffect - Electro-Harmonix Holy Grail Neo
 * 
 * Best-selling reverb pedal of all time
 * Used by: Everyone
 * 
 * Features:
 * - Spring, Hall, Plate modes
 * - Simple 1-2 knob operation
 * - Classic EHX character
 */

class EHXHolyGrailEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Holy Grail', 'ehxholygrail');
    
    // Convolver for reverb
    this.convolver = audioContext.createConvolver();
    
    // Pre-delay
    this.preDelay = audioContext.createDelay(0.1);
    this.preDelay.delayTime.value = 0.02; // 20ms
    
    // Reverb tone
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 8000;
    this.reverbLPF.Q.value = 0.707;
    
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 200;
    this.reverbHPF.Q.value = 0.707;
    
    // Reverb level
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.4;
    
    // Current mode
    this.mode = 'hall';
    
    // Generate initial IR
    this.generateIR(this.mode);
    
    // Connect chain
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.convolver);
    this.convolver.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  generateIR(mode) {
    const sampleRate = this.audioContext.sampleRate;
    let duration, decay;
    
    switch (mode) {
      case 'spring':
        duration = 1.0;
        decay = 0.5;
        break;
      case 'hall':
        duration = 2.5;
        decay = 2.0;
        break;
      case 'plate':
        duration = 2.0;
        decay = 1.5;
        break;
      default:
        duration = 2.0;
        decay = 1.5;
    }
    
    const length = Math.floor(duration * sampleRate);
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const envelope = Math.exp(-i / (sampleRate * decay));
        
        if (mode === 'spring') {
          // Metallic spring character
          const spring = Math.sin(i * 0.05) * 0.3;
          data[i] = (Math.random() * 2 - 1) * envelope + spring * envelope;
        } else if (mode === 'hall') {
          // Smooth hall reverb
          data[i] = (Math.random() * 2 - 1) * envelope;
        } else if (mode === 'plate') {
          // Dense plate reverb
          const density = Math.random() * 0.8;
          data[i] = (Math.random() * 2 - 1) * envelope * density;
        }
      }
    }
    
    this.convolver.buffer = buffer;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'reverb':
        // Reverb mix
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'mode':
        // 'spring', 'hall', 'plate'
        this.mode = value;
        this.generateIR(value);
        
        // Adjust tone per mode
        if (value === 'spring') {
          this.reverbLPF.frequency.setTargetAtTime(6000, now, 0.01);
        } else if (value === 'hall') {
          this.reverbLPF.frequency.setTargetAtTime(8000, now, 0.01);
        } else if (value === 'plate') {
          this.reverbLPF.frequency.setTargetAtTime(10000, now, 0.01);
        }
        break;
    }
  }
}

export default EHXHolyGrailEffect;

