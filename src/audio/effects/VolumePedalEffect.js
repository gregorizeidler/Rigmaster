import BaseEffect from './BaseEffect.js';

class VolumePedalEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Volume Pedal', 'volume');
    
    // VOLUME PEDAL (Expression pedal)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.volumeControl = audioContext.createGain();
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.volumeControl);
    this.volumeControl.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.volumeControl.gain.value = 1.0;
    
    this.params = { volume: 100, curve: 0, min: 0, max: 100 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'volume':
        // Apply curve (linear, log, or exp)
        let adjustedValue = value / 100;
        
        if (this.params.curve === 1) {
          // Logarithmic (audio taper)
          adjustedValue = Math.pow(adjustedValue, 2);
        } else if (this.params.curve === 2) {
          // Exponential
          adjustedValue = Math.sqrt(adjustedValue);
        }
        
        this.volumeControl.gain.setTargetAtTime(adjustedValue, now, 0.01);
        break;
      case 'curve':
        // 0=linear, 1=log, 2=exp
        break;
      case 'min':
        // Minimum volume
        break;
      case 'max':
        // Maximum volume
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.volumeControl.disconnect();
    this.outputGain.disconnect();
  }
}

export default VolumePedalEffect;

