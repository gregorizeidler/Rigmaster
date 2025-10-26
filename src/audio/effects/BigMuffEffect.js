import BaseEffect from './BaseEffect';

class BigMuffEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Big Muff', 'bigmuff');
    
    // EHX BIG MUFF PI (1969)
    // Iconic sustain/fuzz pedal
    // 4 transistor stages: 2 gain + 2 clipping
    
    // Two gain stages
    this.preGain1 = audioContext.createGain();
    this.preGain2 = audioContext.createGain();
    
    // Two clipping stages
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper2 = audioContext.createWaveShaper();
    
    // BIG MUFF TONE STACK (REAL IMPLEMENTATION)
    // The Big Muff uses PARALLEL LP + HP filters (not shelf!)
    // This creates the famous "mid scoop"
    
    // Bass path (lowpass)
    this.bassPath = audioContext.createBiquadFilter();
    this.bassPath.type = 'lowpass';
    this.bassPath.frequency.value = 500;
    this.bassPath.Q.value = 0.707;
    
    // Treble path (highpass)
    this.treblePath = audioContext.createBiquadFilter();
    this.treblePath.type = 'highpass';
    this.treblePath.frequency.value = 2000;
    this.treblePath.Q.value = 0.707;
    
    // Crossfade gains
    this.bassGain = audioContext.createGain();
    this.trebleGain = audioContext.createGain();
    this.bassGain.gain.value = 0.5;
    this.trebleGain.gain.value = 0.5;
    
    // Tone mixer
    this.toneMixer = audioContext.createGain();
    this.toneMixer.gain.value = 1.0;
    
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
    
    // REAL BIG MUFF TONE STACK (parallel paths)
    this.clipper2.connect(this.bassPath);
    this.clipper2.connect(this.treblePath);
    this.bassPath.connect(this.bassGain);
    this.treblePath.connect(this.trebleGain);
    this.bassGain.connect(this.toneMixer);
    this.trebleGain.connect(this.toneMixer);
    
    this.toneMixer.connect(this.postGain);
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
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'sustain':
        this.preGain1.gain.setTargetAtTime(2 + (value / 100) * 18, now, 0.01);
        this.preGain2.gain.setTargetAtTime(1 + (value / 100) * 12, now, 0.01);
        break;
      case 'tone':
        // REAL BIG MUFF TONE CONTROL
        // Crossfade between bass (LP) and treble (HP) paths
        const toneValue = value / 100; // 0 to 1
        
        if (toneValue < 0.5) {
          // Bass emphasis (0-50%)
          this.bassGain.gain.setTargetAtTime(1.0, now, 0.01);
          this.trebleGain.gain.setTargetAtTime(toneValue * 2, now, 0.01);
        } else {
          // Treble emphasis (50-100%)
          this.bassGain.gain.setTargetAtTime(2 - (toneValue * 2), now, 0.01);
          this.trebleGain.gain.setTargetAtTime(1.0, now, 0.01);
        }
        break;
      case 'volume':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
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
    this.bassPath.disconnect();
    this.treblePath.disconnect();
    this.bassGain.disconnect();
    this.trebleGain.disconnect();
    this.toneMixer.disconnect();
    this.postGain.disconnect();
  }
}

export default BigMuffEffect;

