import BaseEffect from './BaseEffect.js';

class TunerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tuner', 'tuner');
    
    // TUNER (Chromatic tuner with pitch detection)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Analyser for pitch detection
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Float32Array(this.bufferLength);
    
    // Mute when tuning
    this.muteGain = audioContext.createGain();
    this.muteGain.gain.value = 1.0; // Bypass by default
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.analyser);
    this.inputGain.connect(this.muteGain);
    this.muteGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Note names
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    this.detectedNote = null;
    this.detectedFreq = 0;
    this.cents = 0;
    
    this.params = { mute: false, reference: 440, display: 0 };
  }
  
  detectPitch() {
    this.analyser.getFloatTimeDomainData(this.dataArray);
    
    // Autocorrelation method for pitch detection
    const sampleRate = this.audioContext.sampleRate;
    let maxCorrelation = 0;
    let bestOffset = -1;
    
    // Search for fundamental frequency
    for (let offset = 1; offset < this.bufferLength / 2; offset++) {
      let correlation = 0;
      for (let i = 0; i < this.bufferLength / 2; i++) {
        correlation += Math.abs(this.dataArray[i] - this.dataArray[i + offset]);
      }
      correlation = 1 - (correlation / (this.bufferLength / 2));
      
      if (correlation > 0.9 && correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestOffset = offset;
      }
    }
    
    if (bestOffset > 0) {
      const fundamentalFreq = sampleRate / bestOffset;
      this.detectedFreq = fundamentalFreq;
      
      // Calculate note and cents
      const referenceA4 = this.params.reference || 440;
      const halfSteps = 12 * Math.log2(fundamentalFreq / referenceA4);
      const noteIndex = Math.round(halfSteps) + 57; // A4 is index 57
      const noteName = this.noteNames[noteIndex % 12];
      const octave = Math.floor(noteIndex / 12) - 1;
      
      this.detectedNote = `${noteName}${octave}`;
      this.cents = Math.round((halfSteps - Math.round(halfSteps)) * 100);
    }
    
    return {
      note: this.detectedNote,
      frequency: this.detectedFreq,
      cents: this.cents
    };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'mute':
        this.muteGain.gain.setTargetAtTime(value ? 0 : 1, now, 0.001);
        break;
      case 'reference':
        // A4 reference frequency (typically 440Hz)
        this.params.reference = value;
        break;
      case 'display':
        // Display mode
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.muteGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default TunerEffect;

