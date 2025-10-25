import BaseEffect from './BaseEffect';

class TapeEchoEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tape Echo', 'tapeecho');
    
    this.delay = audioContext.createDelay(2.0);
    this.feedback = audioContext.createGain();
    
    // Tape characteristics
    this.preFilter = audioContext.createBiquadFilter();
    this.postFilter = audioContext.createBiquadFilter();
    this.saturation = audioContext.createWaveShaper();
    this.flutter = audioContext.createDelay();
    
    // LFO for tape flutter/wow
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    
    // Setup
    this.delay.delayTime.value = 0.375;
    this.feedback.gain.value = 0.4;
    
    // Tape darkening (lowpass)
    this.preFilter.type = 'lowpass';
    this.preFilter.frequency.value = 3000;
    this.postFilter.type = 'lowpass';
    this.postFilter.frequency.value = 4000;
    
    // Flutter
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 5;
    this.lfoGain.gain.value = 0.0005;
    this.flutter.delayTime.value = 0.001;
    
    // Tape saturation
    this.createTapeCurve();
    
    // Connect LFO
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.flutter.delayTime);
    
    // Connect audio chain
    this.input.connect(this.preFilter);
    this.preFilter.connect(this.delay);
    this.delay.connect(this.flutter);
    this.flutter.connect(this.saturation);
    this.saturation.connect(this.postFilter);
    this.postFilter.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.postFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.lfo.start();
    this.setMix(0.5);
  }

  createTapeCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft tape saturation
      curve[i] = Math.tanh(x * 1.5);
    }
    
    this.saturation.curve = curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        this.delay.delayTime.setTargetAtTime(0.05 + (value / 100) * 1.95, now, 0.01);
        break;
      case 'feedback':
        this.feedback.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'flutter':
        this.lfoGain.gain.value = (value / 100) * 0.002;
        break;
      case 'tone':
        this.postFilter.frequency.value = 500 + (value / 100) * 4500;
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.delay.disconnect();
    this.feedback.disconnect();
    this.preFilter.disconnect();
    this.postFilter.disconnect();
    this.saturation.disconnect();
    this.flutter.disconnect();
    super.disconnect();
  }
}

export default TapeEchoEffect;

