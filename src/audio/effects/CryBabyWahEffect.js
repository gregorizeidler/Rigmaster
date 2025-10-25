import BaseEffect from './BaseEffect';

class CryBabyWahEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Cry Baby Wah', 'crybabywah');
    
    // DUNLOP CRY BABY WAH (1966)
    // THE wah pedal - Hendrix, Clapton, Slash
    // Sweepable resonant bandpass filter
    
    // Input boost (wah has gain)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;
    
    // Wah filter (high-Q bandpass)
    this.wahFilter = audioContext.createBiquadFilter();
    this.wahFilter.type = 'bandpass';
    this.wahFilter.frequency.value = 500; // Start frequency
    this.wahFilter.Q.value = 10; // Very resonant
    
    // Output
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.wahFilter);
    this.wahFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Auto-wah LFO (optional)
    this.autoWahLFO = audioContext.createOscillator();
    this.autoWahGain = audioContext.createGain();
    this.autoWahLFO.type = 'sine';
    this.autoWahLFO.frequency.value = 0.5;
    this.autoWahGain.gain.value = 0; // Off by default
    this.autoWahLFO.start();
    
    this.autoWahLFO.connect(this.autoWahGain);
    this.autoWahGain.connect(this.wahFilter.frequency);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'position':
        // Classic Cry Baby sweep: 350Hz to 2200Hz
        const freq = 350 + (value / 100) * 1850;
        this.wahFilter.frequency.setTargetAtTime(freq, now, 0.001); // Very fast response
        break;
      case 'resonance':
        // Q factor (resonance)
        this.wahFilter.Q.setTargetAtTime(5 + (value / 10), now, 0.01);
        break;
      case 'autowah':
        // Auto-wah mode (LFO modulation)
        this.autoWahGain.gain.setTargetAtTime(value * 15, now, 0.01);
        break;
      case 'speed':
        // Auto-wah speed
        this.autoWahLFO.frequency.setTargetAtTime(0.1 + (value / 100) * 5, now, 0.01);
        break;
      case 'mix':
        this.updateMix(value);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.wahFilter.disconnect();
      this.outputGain.disconnect();
      this.autoWahLFO.stop();
      this.autoWahLFO.disconnect();
      this.autoWahGain.disconnect();
    } catch (e) {}
  }
}

export default CryBabyWahEffect;

