import BaseEffect from './BaseEffect';

class RingModulatorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Ring Modulator', 'ringmod');
    
    // Create carrier oscillator
    this.carrier = audioContext.createOscillator();
    this.carrierGain = audioContext.createGain();
    
    // Create modulator (multiply input by carrier)
    this.modulator = audioContext.createGain();
    
    this.carrier.type = 'sine';
    this.carrier.frequency.value = 440;
    this.carrierGain.gain.value = 1;
    this.modulator.gain.value = 0;
    
    // Connect carrier to modulator gain
    this.carrier.connect(this.carrierGain);
    this.carrierGain.connect(this.modulator.gain);
    
    // Connect audio through modulator
    this.input.connect(this.modulator);
    this.modulator.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.carrier.start();
    this.setMix(0.5);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'frequency':
        this.carrier.frequency.value = 20 + (value / 100) * 2000;
        break;
      case 'waveform':
        const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
        this.carrier.type = waveforms[Math.floor((value / 100) * (waveforms.length - 0.01))];
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.carrier.stop();
    this.carrier.disconnect();
    this.carrierGain.disconnect();
    this.modulator.disconnect();
    super.disconnect();
  }
}

export default RingModulatorEffect;

