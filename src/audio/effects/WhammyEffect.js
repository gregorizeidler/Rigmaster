import BaseEffect from './BaseEffect';

class WhammyEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Whammy', 'whammy');
    
    // Pitch shifter using granular synthesis simulation
    this.delay1 = audioContext.createDelay();
    this.delay2 = audioContext.createDelay();
    this.pitchGain = audioContext.createGain();
    this.directGain = audioContext.createGain();
    
    // Filters to help with pitch quality
    this.filter1 = audioContext.createBiquadFilter();
    this.filter2 = audioContext.createBiquadFilter();
    this.filter1.type = 'bandpass';
    this.filter2.type = 'bandpass';
    this.filter1.frequency.value = 1000;
    this.filter2.frequency.value = 1000;
    
    this.pitchGain.gain.value = 0.7;
    this.directGain.gain.value = 0.5;
    
    // Pitch shift amount (semitones)
    this.pitchShift = 12; // One octave up by default
    
    // Connect paths
    this.input.connect(this.directGain);
    this.input.connect(this.delay1);
    this.input.connect(this.delay2);
    
    this.delay1.connect(this.filter1);
    this.delay2.connect(this.filter2);
    this.filter1.connect(this.pitchGain);
    this.filter2.connect(this.pitchGain);
    
    const mixer = audioContext.createGain();
    this.directGain.connect(mixer);
    this.pitchGain.connect(mixer);
    
    mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.updatePitchShift();
    this.setMix(0.8);
  }

  updatePitchShift() {
    // Approximate pitch shifting with delay modulation
    const ratio = Math.pow(2, this.pitchShift / 12);
    const delayTime = 0.001 / ratio;
    
    this.delay1.delayTime.value = Math.max(0.0001, Math.min(0.1, delayTime));
    this.delay2.delayTime.value = Math.max(0.0001, Math.min(0.1, delayTime * 1.1));
    
    // Adjust filters
    const filterFreq = 1000 * ratio;
    this.filter1.frequency.value = filterFreq;
    this.filter2.frequency.value = filterFreq * 1.1;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'pitch':
        // -24 to +24 semitones (2 octaves range)
        this.pitchShift = -24 + (value / 100) * 48;
        this.updatePitchShift();
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      case 'dry':
        this.directGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.pitchGain.disconnect();
    this.directGain.disconnect();
    this.filter1.disconnect();
    this.filter2.disconnect();
    super.disconnect();
  }
}

export default WhammyEffect;

