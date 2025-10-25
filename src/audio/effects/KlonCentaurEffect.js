import BaseEffect from './BaseEffect';

class KlonCentaurEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Klon Centaur', 'kloncentaur');
    
    // KLON CENTAUR (Legendary transparent overdrive, 1994)
    // Most sought-after overdrive pedal, $3000+ vintage
    // Used by John Mayer, Jeff Beck
    
    // Input buffer
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.2;
    
    // Frequency splitter (Klon's secret: separate clean/dirty blend)
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Clean path (always present - "transparency")
    this.cleanGain = audioContext.createGain();
    this.cleanGain.gain.value = 0.6;
    
    // Dirty path
    this.dirtyGain = audioContext.createGain();
    this.dirtyGain.gain.value = 1.8;
    
    // Soft clipping (germanium diodes simulation)
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeKlonCurve(50);
    
    // Tone stack (treble control)
    this.trebleFilter = audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 1600;
    this.trebleFilter.gain.value = 0;
    
    // Output buffer
    this.outputBuffer = audioContext.createGain();
    this.outputBuffer.gain.value = 0.7;
    
    // Chain
    // Clean path
    this.input.connect(this.inputBuffer);
    this.inputBuffer.connect(this.cleanGain);
    
    // Dirty path
    this.inputBuffer.connect(this.dirtyGain);
    this.dirtyGain.connect(this.clipper);
    
    // Mix
    this.cleanGain.connect(this.outputBuffer);
    this.clipper.connect(this.outputBuffer);
    
    this.outputBuffer.connect(this.trebleFilter);
    this.trebleFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeKlonCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 33); // Subtle 1-4x
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Soft clipping (germanium diodes - very smooth)
      let y = x * drive;
      
      // Extremely soft knee (Klon's magic)
      if (Math.abs(y) > 0.3) {
        y = Math.sign(y) * (0.3 + (Math.abs(y) - 0.3) * 0.4);
      }
      
      // Add subtle even harmonics (warmth)
      y += 0.03 * Math.tanh(x * drive * 2);
      
      // Very gentle compression
      y = Math.tanh(y * 1.2);
      
      curve[i] = y * 0.95;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain':
        // Klon gain adjusts clean/dirty blend
        const cleanMix = 0.8 - (value / 150);
        const dirtyMix = 1.0 + (value / 50);
        this.cleanGain.gain.setTargetAtTime(cleanMix, now, 0.01);
        this.dirtyGain.gain.setTargetAtTime(dirtyMix, now, 0.01);
        this.clipper.curve = this.makeKlonCurve(value);
        break;
      case 'treble':
        this.trebleFilter.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'level':
        this.outputBuffer.gain.setTargetAtTime(value / 100, now, 0.01);
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
      this.inputBuffer.disconnect();
      this.cleanGain.disconnect();
      this.dirtyGain.disconnect();
      this.clipper.disconnect();
      this.trebleFilter.disconnect();
      this.outputBuffer.disconnect();
    } catch (e) {}
  }
}

export default KlonCentaurEffect;

