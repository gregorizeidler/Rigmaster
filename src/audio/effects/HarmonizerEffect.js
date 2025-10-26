import BaseEffect from './BaseEffect.js';

class HarmonizerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Harmonizer', 'harmonizer');
    
    // HARMONIZER (Intelligent pitch harmony)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Pitch shifters for harmony voices
    this.delay1 = audioContext.createDelay(0.1);
    this.delay2 = audioContext.createDelay(0.1);
    
    this.voice1Gain = audioContext.createGain();
    this.voice2Gain = audioContext.createGain();
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Voice 1 (third)
    this.inputGain.connect(this.delay1);
    this.delay1.connect(this.voice1Gain);
    this.voice1Gain.connect(this.wetGain);
    
    // Voice 2 (fifth)
    this.inputGain.connect(this.delay2);
    this.delay2.connect(this.voice2Gain);
    this.voice2Gain.connect(this.wetGain);
    
    this.wetGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 1.0;
    this.voice1Gain.gain.value = 0.7;
    this.voice2Gain.gain.value = 0.5;
    
    this.params = { interval1: 4, interval2: 7, mix: 50, key: 0 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'interval1':
        // Semitones (-12 to +12)
        const semitones1 = -12 + (value / 100) * 24;
        // Simplified pitch shift simulation with delay
        const ratio1 = Math.pow(2, semitones1 / 12);
        this.delay1.delayTime.setTargetAtTime(0.01 / ratio1, now, 0.01);
        break;
      case 'interval2':
        const semitones2 = -12 + (value / 100) * 24;
        const ratio2 = Math.pow(2, semitones2 / 12);
        this.delay2.delayTime.setTargetAtTime(0.01 / ratio2, now, 0.01);
        break;
      case 'mix':
        this.wetGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'key':
        // Key selection (C, C#, D, etc.)
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.voice1Gain.disconnect();
    this.voice2Gain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default HarmonizerEffect;

