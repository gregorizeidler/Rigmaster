import BaseEffect from './BaseEffect';

class PitchShifterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Pitch Shifter', 'pitchshifter');

    // Create harmonizer effect using multiple delays
    this.directGain = audioContext.createGain();
    this.harmonyMix = audioContext.createGain();
    
    // Multiple pitch-shifted voices
    this.voice1Gain = audioContext.createGain();
    this.voice2Gain = audioContext.createGain();
    
    this.delay1 = audioContext.createDelay();
    this.delay2 = audioContext.createDelay();
    
    this.filter1 = audioContext.createBiquadFilter();
    this.filter2 = audioContext.createBiquadFilter();
    
    this.filter1.type = 'bandpass';
    this.filter2.type = 'bandpass';
    this.filter1.frequency.value = 1000;
    this.filter2.frequency.value = 800;

    // Initial settings
    this.directGain.gain.value = 0.7;
    this.voice1Gain.gain.value = 0.5;
    this.voice2Gain.gain.value = 0.3;
    
    // Pitch intervals (semitones)
    this.interval1 = 5; // Perfect fifth
    this.interval2 = 7; // Perfect fifth + 2

    // Connect direct signal
    this.input.connect(this.directGain);
    this.directGain.connect(this.harmonyMix);

    // Connect voice 1
    this.input.connect(this.delay1);
    this.delay1.connect(this.filter1);
    this.filter1.connect(this.voice1Gain);
    this.voice1Gain.connect(this.harmonyMix);

    // Connect voice 2
    this.input.connect(this.delay2);
    this.delay2.connect(this.filter2);
    this.filter2.connect(this.voice2Gain);
    this.voice2Gain.connect(this.harmonyMix);

    // Output: harmonyMix -> wetGain -> output
    this.harmonyMix.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal from BaseEffect
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.updateDelays();
  }

  updateDelays() {
    // Approximate pitch shifting with delay
    const delay1Time = 0.001 * Math.pow(2, -this.interval1 / 12);
    const delay2Time = 0.001 * Math.pow(2, -this.interval2 / 12);
    
    this.delay1.delayTime.value = Math.max(0.001, Math.min(0.1, delay1Time));
    this.delay2.delayTime.value = Math.max(0.001, Math.min(0.1, delay2Time));
    
    // Adjust filters
    this.filter1.frequency.value = 1000 * Math.pow(2, this.interval1 / 12);
    this.filter2.frequency.value = 1000 * Math.pow(2, this.interval2 / 12);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'dry':
        this.directGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'voice1':
        this.voice1Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'voice2':
        this.voice2Gain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'interval':
        // -12 to +12 semitones
        this.interval1 = Math.floor(-12 + (value / 100) * 24);
        this.interval2 = this.interval1 + 7; // Add a fifth
        this.updateDelays();
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.directGain.disconnect();
    this.harmonyMix.disconnect();
    this.voice1Gain.disconnect();
    this.voice2Gain.disconnect();
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.filter1.disconnect();
    this.filter2.disconnect();
    super.disconnect();
  }
}

export default PitchShifterEffect;

