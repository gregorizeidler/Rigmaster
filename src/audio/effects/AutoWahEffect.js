import BaseEffect from './BaseEffect';

class AutoWahEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Auto Wah', 'autowah');

    // Envelope follower
    this.inputGain = audioContext.createGain();
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 10;
    this.filter.frequency.value = 500;

    // Parameters
    this.sensitivity = 50;
    this.minFreq = 200;
    this.maxFreq = 2000;
    this.speed = 0.1;

    // Connect: input -> inputGain -> filter -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.analyser);
    this.inputGain.connect(this.filter);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Start envelope follower
    this.startEnvelopeFollower();
  }

  startEnvelopeFollower() {
    let currentFreq = this.filter.frequency.value;

    const follow = () => {
      if (this.bypassed) {
        requestAnimationFrame(follow);
        return;
      }

      this.analyser.getByteTimeDomainData(this.dataArray);

      // Calculate envelope
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sum += Math.abs(normalized);
      }
      const envelope = sum / this.dataArray.length;

      // Map envelope to frequency
      const targetFreq = this.minFreq + envelope * this.sensitivity * (this.maxFreq - this.minFreq);
      
      // Smooth transition
      currentFreq += (targetFreq - currentFreq) * this.speed;
      this.filter.frequency.value = currentFreq;

      requestAnimationFrame(follow);
    };

    follow();
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'sensitivity':
        this.sensitivity = value / 100;
        break;
      case 'resonance':
        this.filter.Q.value = 5 + (value / 100) * 15;
        break;
      case 'speed':
        this.speed = 0.05 + (value / 100) * 0.45; // 0.05 to 0.5
        break;
      case 'range':
        this.maxFreq = 1000 + (value / 100) * 3000; // 1000Hz to 4000Hz
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.inputGain.disconnect();
    this.analyser.disconnect();
    this.filter.disconnect();
    super.disconnect();
  }
}

export default AutoWahEffect;

