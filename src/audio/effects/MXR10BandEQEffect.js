import BaseEffect from './BaseEffect';

/**
 * MXR10BandEQEffect - MXR 10-Band Graphic EQ
 * 
 * Professional 10-band graphic equalizer
 * Used by: Metal players, studio work
 * 
 * Features:
 * - 10 bands (31.25Hz - 16kHz)
 * - ±12dB per band
 * - Ultra-low noise
 * - Transparent boost/cut
 */

class MXR10BandEQEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'MXR 10-Band EQ', 'mxr10bandeq');
    
    // 10 frequency bands (ISO standard)
    const frequencies = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    this.bands = frequencies.map(freq => {
      const filter = audioContext.createBiquadFilter();
      
      // Use appropriate filter types
      if (freq === 31.25) {
        filter.type = 'lowshelf';
      } else if (freq === 16000) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.0; // Standard graphic EQ Q
      }
      
      filter.frequency.value = freq;
      filter.gain.value = 0;
      
      return { freq, filter };
    });
    
    // Output gain
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // Connect filters in series
    this.input.connect(this.bands[0].filter);
    
    for (let i = 0; i < this.bands.length - 1; i++) {
      this.bands[i].filter.connect(this.bands[i + 1].filter);
    }
    
    this.bands[this.bands.length - 1].filter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    // Parameters: band1 to band10 (0-100, where 50 = 0dB)
    const bandMatch = param.match(/^band(\d+)$/);
    if (bandMatch) {
      const bandIndex = parseInt(bandMatch[1]) - 1;
      if (bandIndex >= 0 && bandIndex < this.bands.length) {
        // Convert 0-100 to -12dB to +12dB
        const gain = ((value - 50) / 50) * 12;
        this.bands[bandIndex].filter.gain.setTargetAtTime(gain, now, 0.01);
      }
    }
    
    if (param === 'level') {
      this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
    }
  }
  
  // Preset V-shapes for metal/scooped sounds
  setVShape() {
    const now = this.audioContext.currentTime;
    const vCurve = [6, 3, 0, -3, -6, -6, -3, 0, 3, 6]; // dB values
    
    vCurve.forEach((gain, i) => {
      this.bands[i].filter.gain.setTargetAtTime(gain, now, 0.01);
    });
  }
  
  // Reset all bands to flat
  setFlat() {
    const now = this.audioContext.currentTime;
    this.bands.forEach(band => {
      band.filter.gain.setTargetAtTime(0, now, 0.01);
    });
  }
}

export default MXR10BandEQEffect;

