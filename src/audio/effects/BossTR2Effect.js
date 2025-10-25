import BaseEffect from './BaseEffect';

class BossTR2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss TR-2', 'bosstr2');
    
    // BOSS TR-2 TREMOLO (1997)
    // Classic tremolo - smooth amplitude modulation
    // Used by John Fogerty, Jack White
    
    // LFO for tremolo
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.type = 'sine'; // Smooth sine wave
    this.lfo.frequency.value = 4; // Classic tremolo speed
    this.lfoGain.gain.value = 0.5; // Modulation depth
    this.lfo.start();
    
    // Carrier gain (for amplitude modulation)
    this.carrierGain = audioContext.createGain();
    this.carrierGain.gain.value = 0.5;
    
    // Offset (to keep signal positive)
    this.offsetGain = audioContext.createGain();
    this.offsetGain.gain.value = 0.5;
    
    // Chain
    this.input.connect(this.carrierGain);
    
    // LFO modulates carrier gain
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.carrierGain.gain);
    
    this.carrierGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        // Classic tremolo range: 0.5Hz to 10Hz
        this.lfo.frequency.setTargetAtTime(0.5 + (value / 100) * 9.5, now, 0.01);
        break;
      case 'depth':
        // Depth controls amplitude modulation
        this.lfoGain.gain.setTargetAtTime(value / 100 * 0.9, now, 0.01);
        break;
      case 'wave':
        // Waveform selector
        if (value < 25) {
          this.lfo.type = 'sine';
        } else if (value < 50) {
          this.lfo.type = 'triangle';
        } else if (value < 75) {
          this.lfo.type = 'square';
        } else {
          this.lfo.type = 'sawtooth';
        }
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
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoGain.disconnect();
      this.carrierGain.disconnect();
      this.offsetGain.disconnect();
    } catch (e) {}
  }
}

export default BossTR2Effect;

