import BaseEffect from './BaseEffect';

class ShimmerReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Shimmer Reverb', 'shimmerreverb');
    
    // Create reverb using convolver
    this.convolver = audioContext.createConvolver();
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.6;
    
    // Pitch shifter for shimmer (octave up)
    this.pitchShift = audioContext.createDelay();
    this.pitchShift.delayTime.value = 0.001;
    this.pitchFilter = audioContext.createBiquadFilter();
    this.pitchFilter.type = 'highpass';
    this.pitchFilter.frequency.value = 2000;
    this.pitchGain = audioContext.createGain();
    this.pitchGain.gain.value = 0.4;
    
    // Feedback for shimmer tail
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = 0.5;
    
    // Create impulse response
    this.createImpulseResponse();
    
    // Connect reverb path
    this.input.connect(this.convolver);
    this.convolver.connect(this.reverbGain);
    
    // Connect shimmer path
    this.convolver.connect(this.pitchShift);
    this.pitchShift.connect(this.pitchFilter);
    this.pitchFilter.connect(this.pitchGain);
    this.pitchGain.connect(this.feedback);
    this.feedback.connect(this.convolver); // Feedback loop
    this.pitchGain.connect(this.reverbGain);
    
    // Output
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.setMix(0.4);
  }

  createImpulseResponse() {
    const length = this.audioContext.sampleRate * 3;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (this.audioContext.sampleRate * 1.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    this.convolver.buffer = impulse;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'decay':
        this.feedback.gain.setTargetAtTime((value / 100) * 0.7, now, 0.01);
        break;
      case 'shimmer':
        this.pitchGain.gain.setTargetAtTime((value / 100) * 0.6, now, 0.01);
        break;
      case 'tone':
        this.pitchFilter.frequency.value = 1000 + (value / 100) * 4000;
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.convolver.disconnect();
    this.reverbGain.disconnect();
    this.pitchShift.disconnect();
    this.pitchFilter.disconnect();
    this.pitchGain.disconnect();
    this.feedback.disconnect();
    super.disconnect();
  }
}

export default ShimmerReverbEffect;

