import BaseEffect from './BaseEffect';

class TubeCompressorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tube Compressor', 'tubecompressor');
    
    // TUBE-STYLE COMPRESSOR WITH HARMONIC SATURATION
    // Warm, musical compression with tube coloration
    
    // Input gain
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.2;
    
    // Tube-style saturation (pre-compression)
    this.tubeSaturation = audioContext.createWaveShaper();
    this.tubeSaturation.oversample = '4x';
    this.tubeSaturation.curve = this.makeTubeCurve();
    
    // Main compressor (soft knee)
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30; // Soft knee for musical compression
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003; // Slow attack (3ms)
    this.compressor.release.value = 0.25; // 250ms release
    
    // Post-compression tube harmonics
    this.tubeHarmonics = audioContext.createWaveShaper();
    this.tubeHarmonics.oversample = '2x';
    this.tubeHarmonics.curve = this.makeHarmonicsCurve();
    
    // Lowpass filter (tube warmth)
    this.warmth = audioContext.createBiquadFilter();
    this.warmth.type = 'lowpass';
    this.warmth.frequency.value = 8000;
    this.warmth.Q.value = 0.707;
    
    // Makeup gain
    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 2.0; // Auto makeup
    
    // Output level
    this.outputLevel = audioContext.createGain();
    this.outputLevel.gain.value = 0.8;
    
    // ROUTING: input -> inputGain -> tubeSaturation -> compressor 
    // -> tubeHarmonics -> warmth -> makeupGain -> outputLevel -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.tubeSaturation);
    this.tubeSaturation.connect(this.compressor);
    this.compressor.connect(this.tubeHarmonics);
    this.tubeHarmonics.connect(this.warmth);
    this.warmth.connect(this.makeupGain);
    this.makeupGain.connect(this.outputLevel);
    this.outputLevel.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  makeTubeCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Soft tube saturation
      let y = Math.tanh(x * 1.5);
      
      // Add even harmonics (tube character)
      y += 0.1 * Math.tanh(x * 3);
      
      // Asymmetry (tube characteristic)
      if (x > 0) {
        y *= 1.1;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.8;
    }
    
    return curve;
  }

  makeHarmonicsCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Subtle harmonics
      let y = x + 0.05 * Math.sin(x * Math.PI * 2);
      
      curve[i] = Math.tanh(y * 1.2) * 0.9;
    }
    
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'drive':
        // Control tube saturation amount
        const drive = 0.5 + (value / 100) * 2.5; // 0.5x to 3x
        this.inputGain.gain.setTargetAtTime(drive, now, 0.01);
        break;
      case 'sustain':
        // Control compression ratio and threshold
        const ratio = 2 + (value / 100) * 8; // 2:1 to 10:1
        const threshold = -30 + (value / 100) * 20; // -30dB to -10dB
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        this.compressor.threshold.setTargetAtTime(threshold, now, 0.01);
        break;
      case 'level':
        // Output level
        const level = value / 100;
        this.outputLevel.gain.setTargetAtTime(level, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.tubeSaturation.disconnect();
    this.compressor.disconnect();
    this.tubeHarmonics.disconnect();
    this.warmth.disconnect();
    this.makeupGain.disconnect();
    this.outputLevel.disconnect();
  }
}

export default TubeCompressorEffect;

