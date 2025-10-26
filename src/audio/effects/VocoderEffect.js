import BaseEffect from './BaseEffect.js';

class VocoderEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vocoder', 'vocoder');
    
    // VOCODER (Vocal synthesis effect)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Number of bands
    this.numBands = 8;
    this.bands = [];
    
    // Create filter bands
    const minFreq = 200;
    const maxFreq = 8000;
    
    for (let i = 0; i < this.numBands; i++) {
      const freq = minFreq * Math.pow(maxFreq / minFreq, i / (this.numBands - 1));
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 5;
      
      const gain = audioContext.createGain();
      
      this.inputGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputGain);
      
      this.bands.push({ filter, gain });
    }
    
    // Carrier oscillator (synth sound)
    this.carrier = audioContext.createOscillator();
    this.carrier.type = 'sawtooth';
    this.carrier.frequency.value = 110; // A2
    
    this.carrierGain = audioContext.createGain();
    this.carrierGain.gain.value = 0.5;
    
    this.carrier.connect(this.carrierGain);
    
    // Connect carrier to all bands
    for (const band of this.bands) {
      this.carrierGain.connect(band.filter);
    }
    
    // Routing
    this.input.connect(this.inputGain);
    this.outputGain.connect(this.output);
    
    this.carrier.start();
    
    this.params = { pitch: 50, formant: 50, bands: 8, mix: 100 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'pitch':
        const freq = 55 + (value / 100) * 440; // A1 to A4
        this.carrier.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      case 'formant':
        // Shift formant frequencies
        const shift = 0.5 + (value / 100) * 1.5; // 0.5x to 2x
        for (const band of this.bands) {
          const baseFreq = band.filter.frequency.value;
          band.filter.frequency.setTargetAtTime(baseFreq * shift, now, 0.01);
        }
        break;
      case 'bands':
        // Number of bands (4-16)
        break;
      case 'mix':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.carrier.stop();
    this.inputGain.disconnect();
    this.carrier.disconnect();
    this.carrierGain.disconnect();
    for (const band of this.bands) {
      band.filter.disconnect();
      band.gain.disconnect();
    }
    this.outputGain.disconnect();
  }
}

export default VocoderEffect;

