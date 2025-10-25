import BaseEffect from './BaseEffect';

class BigMuffEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Big Muff', 'bigmuff');
    
    // Two gain stages
    this.preGain1 = audioContext.createGain();
    this.preGain2 = audioContext.createGain();
    
    // Two clipping stages
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper2 = audioContext.createWaveShaper();
    
    // Tone control (Big Muff style)
    this.toneStack = audioContext.createBiquadFilter();
    this.toneStack.type = 'peaking';
    this.toneStack.frequency.value = 1000;
    this.toneStack.Q.value = 0.707;
    this.toneStack.gain.value = 0;
    
    this.postGain = audioContext.createGain();
    
    this.preGain1.gain.value = 8;
    this.preGain2.gain.value = 6;
    this.postGain.gain.value = 0.25;
    
    this.createBigMuffCurve();
    
    // Connect chain - two stages of clipping
    this.input.connect(this.preGain1);
    this.preGain1.connect(this.clipper1);
    this.clipper1.connect(this.preGain2);
    this.preGain2.connect(this.clipper2);
    this.clipper2.connect(this.toneStack);
    this.toneStack.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  createBigMuffCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Hard symmetrical clipping (fuzz)
      curve[i] = Math.max(-0.9, Math.min(0.9, x * 10));
    }
    
    this.clipper1.curve = curve;
    this.clipper2.curve = curve;
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'sustain':
        this.preGain1.gain.value = 2 + (value / 100) * 18;
        this.preGain2.gain.value = 1 + (value / 100) * 12;
        break;
      case 'tone':
        // Big Muff tone control (sweep from bass to treble)
        const toneValue = (value / 100) * 2 - 1; // -1 to 1
        if (toneValue < 0) {
          this.toneStack.type = 'lowshelf';
          this.toneStack.gain.value = -toneValue * 10;
        } else {
          this.toneStack.type = 'highshelf';
          this.toneStack.gain.value = toneValue * 10;
        }
        break;
      case 'volume':
        this.postGain.gain.value = (value / 100) * 0.8;
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    this.preGain1.disconnect();
    this.preGain2.disconnect();
    this.clipper1.disconnect();
    this.clipper2.disconnect();
    this.toneStack.disconnect();
    this.postGain.disconnect();
  }
}

export default BigMuffEffect;

