import BaseEffect from './BaseEffect';

class CompressorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Compressor', 'compressor');
    
    this.compressor = audioContext.createDynamicsCompressor();
    this.makeup = audioContext.createGain();
    
    // Default settings
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    this.makeup.gain.value = 1.5;
    
    // Connect chain
    this.input.connect(this.compressor);
    this.compressor.connect(this.makeup);
    this.makeup.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.dryGain.gain.value = 0; // Compressor is usually 100% wet
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'threshold':
        this.compressor.threshold.value = -50 + value;
        break;
      case 'ratio':
        this.compressor.ratio.value = 1 + (value / 5);
        break;
      case 'attack':
        this.compressor.attack.value = value / 1000;
        break;
      case 'release':
        this.compressor.release.value = value / 100;
        break;
      case 'makeup':
        this.makeup.gain.value = value / 50;
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.compressor.disconnect();
    this.makeup.disconnect();
  }
}

export default CompressorEffect;

