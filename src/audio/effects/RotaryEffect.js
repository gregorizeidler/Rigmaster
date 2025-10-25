import BaseEffect from './BaseEffect';

class RotaryEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Rotary Speaker', 'rotary');
    
    // Create delays for doppler effect
    this.hornDelay = audioContext.createDelay();
    this.bassDelay = audioContext.createDelay();
    
    // Filters to split frequency
    this.hornFilter = audioContext.createBiquadFilter();
    this.bassFilter = audioContext.createBiquadFilter();
    
    this.hornFilter.type = 'highpass';
    this.hornFilter.frequency.value = 800;
    
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 800;
    
    // Gains
    this.hornGain = audioContext.createGain();
    this.bassGain = audioContext.createGain();
    this.hornGain.gain.value = 0.7;
    this.bassGain.gain.value = 0.7;
    
    // LFOs for rotation
    this.hornLfo = audioContext.createOscillator();
    this.bassLfo = audioContext.createOscillator();
    this.hornLfoGain = audioContext.createGain();
    this.bassLfoGain = audioContext.createGain();
    
    this.hornLfo.type = 'triangle';
    this.bassLfo.type = 'triangle';
    this.hornLfo.frequency.value = 6.5;
    this.bassLfo.frequency.value = 0.8;
    this.hornLfoGain.gain.value = 0.002;
    this.bassLfoGain.gain.value = 0.004;
    
    // Connect LFOs
    this.hornLfo.connect(this.hornLfoGain);
    this.bassLfo.connect(this.bassLfoGain);
    this.hornLfoGain.connect(this.hornDelay.delayTime);
    this.bassLfoGain.connect(this.bassDelay.delayTime);
    
    // Connect audio - Horn (high frequencies)
    this.input.connect(this.hornFilter);
    this.hornFilter.connect(this.hornDelay);
    this.hornDelay.connect(this.hornGain);
    this.hornGain.connect(this.wetGain);
    
    // Connect audio - Bass (low frequencies)
    this.input.connect(this.bassFilter);
    this.bassFilter.connect(this.bassDelay);
    this.bassDelay.connect(this.bassGain);
    this.bassGain.connect(this.wetGain);
    
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.hornLfo.start();
    this.bassLfo.start();
    this.setMix(0.7);
  }

  updateParameter(parameter, value) {
    const speed = value / 100;
    
    switch (parameter) {
      case 'speed':
        this.hornLfo.frequency.value = 1 + speed * 10;
        this.bassLfo.frequency.value = 0.3 + speed * 1.5;
        break;
      case 'balance':
        this.hornGain.gain.value = value / 100;
        this.bassGain.gain.value = 1 - (value / 100);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.hornLfo.stop();
    this.bassLfo.stop();
    this.hornLfo.disconnect();
    this.bassLfo.disconnect();
    this.hornLfoGain.disconnect();
    this.bassLfoGain.disconnect();
    this.hornDelay.disconnect();
    this.bassDelay.disconnect();
    this.hornFilter.disconnect();
    this.bassFilter.disconnect();
    this.hornGain.disconnect();
    this.bassGain.disconnect();
    super.disconnect();
  }
}

export default RotaryEffect;

