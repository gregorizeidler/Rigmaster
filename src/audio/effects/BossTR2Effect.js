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
    this.carrierGain.gain.value = 0.5; // Base level (DC offset)
    
    // DC offset using ConstantSourceNode to bias the carrier gain
    // This keeps the modulated gain positive: gain = offset + LFO
    // When depth=0.5, offset=0.5: gain oscillates 0.0 to 1.0
    this.offsetSource = audioContext.createConstantSource();
    this.offsetSource.offset.value = 0.5;
    this.offsetSource.connect(this.carrierGain.gain);
    this.offsetSource.start();
    
    // Set carrier base to 0 (all modulation comes from offset + LFO)
    this.carrierGain.gain.value = 0;
    
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
        // LFO swing and offset are balanced so gain stays in [0, 1]
        const depth = (value / 100) * 0.5; // LFO amplitude: 0 to 0.5
        const offset = 1.0 - depth;         // DC offset: 1.0 to 0.5
        this.lfoGain.gain.setTargetAtTime(depth, now, 0.01);
        this.offsetSource.offset.setTargetAtTime(offset, now, 0.01);
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
        this.setMix(value / 100);
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
      this.offsetSource.stop();
      this.offsetSource.disconnect();
    } catch (e) {}
  }
}

export default BossTR2Effect;
