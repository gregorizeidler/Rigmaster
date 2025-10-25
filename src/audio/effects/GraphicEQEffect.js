import BaseEffect from './BaseEffect';

class GraphicEQEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Graphic EQ', 'graphiceq');
    
    // PROFESSIONAL 10-BAND GRAPHIC EQ
    // Standard ISO frequencies
    
    const frequencies = [
      32,   // Sub bass
      64,   // Bass
      125,  // Bass
      250,  // Low mids
      500,  // Mids
      1000, // Mids
      2000, // Upper mids
      4000, // Presence
      8000, // Brilliance
      16000 // Air
    ];
    
    this.bands = [];
    
    // Create 10 peaking filters
    for (let i = 0; i < frequencies.length; i++) {
      const filter = audioContext.createBiquadFilter();
      
      // First and last are shelves, rest are peaks
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === frequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4; // Narrow Q for graphic EQ
      }
      
      filter.frequency.value = frequencies[i];
      filter.gain.value = 0; // Start flat
      
      this.bands.push(filter);
    }
    
    // Input/Output
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // Connect bands in series
    this.input.connect(this.inputGain);
    let prev = this.inputGain;
    for (let band of this.bands) {
      prev.connect(band);
      prev = band;
    }
    prev.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    // Convert 0-100 to -12dB to +12dB
    const gain = -12 + (value / 100) * 24;
    
    switch (parameter) {
      case 'low':
        // Bands 0, 1, 2 (32Hz, 64Hz, 125Hz)
        this.bands[0].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[1].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[2].gain.setTargetAtTime(gain, now, 0.01);
        break;
      case 'mid':
        // Bands 3, 4, 5, 6 (250Hz, 500Hz, 1kHz, 2kHz)
        this.bands[3].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[4].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[5].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[6].gain.setTargetAtTime(gain, now, 0.01);
        break;
      case 'high':
        // Bands 7, 8, 9 (4kHz, 8kHz, 16kHz)
        this.bands[7].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[8].gain.setTargetAtTime(gain, now, 0.01);
        this.bands[9].gain.setTargetAtTime(gain, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    for (let band of this.bands) {
      band.disconnect();
    }
    this.outputGain.disconnect();
  }
}

export default GraphicEQEffect;

