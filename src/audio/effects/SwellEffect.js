import BaseEffect from './BaseEffect.js';

class SwellEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Swell', 'swell');
    
    // SWELL (Volume swell/reverse effect)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.envelope = audioContext.createGain();
    
    // Envelope follower
    this.attackTime = 0.3; // 300ms attack
    this.releaseTime = 0.1; // 100ms release
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.envelope);
    this.envelope.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Start with volume at 0
    this.envelope.gain.value = 0;
    
    // Analyser for detecting input
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.inputGain.connect(this.analyser);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.startEnvelope();
    
    this.params = { attack: 30, sensitivity: 50, mode: 0 };
  }
  
  startEnvelope() {
    const update = () => {
      this.analyser.getByteTimeDomainData(this.dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      
      const now = this.audioContext.currentTime;
      
      if (rms > 0.01) {
        // Attack - fade in
        this.envelope.gain.linearRampToValueAtTime(1, now + this.attackTime);
      } else {
        // Release - fade out
        this.envelope.gain.linearRampToValueAtTime(0, now + this.releaseTime);
      }
      
      this.animationFrame = requestAnimationFrame(update);
    };
    
    update();
  }
  
  updateParameter(parameter, value) {
    switch (parameter) {
      case 'attack':
        this.attackTime = 0.01 + (value / 100) * 2; // 10ms to 2s
        break;
      case 'sensitivity':
        // Threshold sensitivity
        break;
      case 'mode':
        // 0=swell, 1=reverse
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.inputGain.disconnect();
    this.envelope.disconnect();
    this.analyser.disconnect();
    this.outputGain.disconnect();
  }
}

export default SwellEffect;

