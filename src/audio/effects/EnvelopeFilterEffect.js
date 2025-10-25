import BaseEffect from './BaseEffect';

class EnvelopeFilterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Envelope Filter', 'envfilter');
    
    // Envelope follower
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Filter
    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 200;
    this.filter.Q.value = 10;
    
    // Parameters
    this.sensitivity = 80;
    this.minFreq = 200;
    this.maxFreq = 4000;
    this.attack = 0.05;
    this.release = 0.15;
    
    // Connect
    this.input.connect(this.analyser);
    this.input.connect(this.filter);
    this.filter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.startEnvelopeFollower();
    this.setMix(0.8);
  }

  startEnvelopeFollower() {
    let currentFreq = this.filter.frequency.value;
    let envelope = 0;
    
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
      const input = sum / this.dataArray.length;
      
      // Attack/Release
      if (input > envelope) {
        envelope += (input - envelope) * this.attack;
      } else {
        envelope += (input - envelope) * this.release;
      }
      
      // Map envelope to frequency
      const targetFreq = this.minFreq + envelope * this.sensitivity * (this.maxFreq - this.minFreq);
      
      // Smooth transition
      currentFreq += (targetFreq - currentFreq) * 0.3;
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
        this.filter.Q.value = 1 + (value / 100) * 19;
        break;
      case 'range':
        this.maxFreq = 500 + (value / 100) * 4500;
        break;
      case 'attack':
        this.attack = 0.01 + (value / 100) * 0.19;
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.analyser.disconnect();
    this.filter.disconnect();
    super.disconnect();
  }
}

export default EnvelopeFilterEffect;

