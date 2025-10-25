import BaseEffect from './BaseEffect';

class SlicerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Slicer', 'slicer');

    // Create gate controlled by LFO
    this.gateGain = audioContext.createGain();
    this.gateGain.gain.value = 1;

    // LFO parameters
    this.rate = 8; // Hz
    this.depth = 1;
    this.pattern = 'square'; // square, triangle, random

    // Connect: input -> gateGain -> wetGain -> output
    this.input.connect(this.gateGain);
    this.gateGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.startSlicing();
  }

  startSlicing() {
    let phase = 0;
    let lastTime = this.audioContext.currentTime;

    const slice = () => {
      if (this.bypassed) {
        requestAnimationFrame(slice);
        return;
      }

      const currentTime = this.audioContext.currentTime;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      phase += this.rate * deltaTime;
      if (phase > 1) phase -= 1;

      let gateValue = 1;

      switch (this.pattern) {
        case 'square':
          gateValue = phase < 0.5 ? 1 : 0;
          break;
        case 'triangle':
          gateValue = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          break;
        case 'random':
          if (Math.floor(phase * 16) !== Math.floor((phase - deltaTime * this.rate) * 16)) {
            gateValue = Math.random();
          }
          break;
        default:
          break;
      }

      // Apply depth
      gateValue = 1 - this.depth + gateValue * this.depth;
      
      this.gateGain.gain.setTargetAtTime(gateValue, currentTime, 0.001);

      requestAnimationFrame(slice);
    };

    slice();
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'rate':
        this.rate = 1 + (value / 100) * 31; // 1Hz to 32Hz
        break;
      case 'depth':
        this.depth = value / 100;
        break;
      case 'pattern':
        const patterns = ['square', 'triangle', 'random'];
        this.pattern = patterns[Math.floor((value / 100) * patterns.length)];
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.gateGain.disconnect();
    super.disconnect();
  }
}

export default SlicerEffect;

