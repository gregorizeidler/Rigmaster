import BaseEffect from './BaseEffect';

class TapeSaturationEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tape Saturation', 'tapesaturation');
    
    // PROFESSIONAL TAPE SATURATION
    // Simulates analog tape machine warmth and compression
    
    // Input trim (headroom)
    this.inputTrim = audioContext.createGain();
    this.inputTrim.gain.value = 0.9;
    
    // Pre-emphasis (boost highs before saturation, like real tape)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 3000;
    this.preEmphasis.gain.value = 3;
    this.preEmphasis.Q.value = 0.707;
    
    // Tape saturation (soft-knee compression + harmonics)
    this.tapeSat = audioContext.createWaveShaper();
    this.tapeSat.oversample = '4x'; // Critical for tape sound
    this.tapeSat.curve = this.makeTapeCurve(50);
    
    // De-emphasis (reduce highs after saturation, balances pre-emphasis)
    this.deEmphasis = audioContext.createBiquadFilter();
    this.deEmphasis.type = 'highshelf';
    this.deEmphasis.frequency.value = 3000;
    this.deEmphasis.gain.value = -3;
    this.deEmphasis.Q.value = 0.707;
    
    // Tape hiss (subtle noise for realism)
    this.hissBuffer = this.createHissBuffer();
    this.hissSource = audioContext.createBufferSource();
    this.hissSource.buffer = this.hissBuffer;
    this.hissSource.loop = true;
    this.hissGain = audioContext.createGain();
    this.hissGain.gain.value = 0; // Off by default
    this.hissSource.start(0);
    
    // Wow & Flutter (pitch variation)
    this.wowLFO = audioContext.createOscillator();
    this.wowDepth = audioContext.createGain();
    this.wowDelay = audioContext.createDelay(0.01);
    this.wowLFO.type = 'sine';
    this.wowLFO.frequency.value = 0.5; // 0.5Hz wow
    this.wowDepth.gain.value = 0;
    this.wowLFO.start();
    
    this.flutterLFO = audioContext.createOscillator();
    this.flutterDepth = audioContext.createGain();
    this.flutterLFO.type = 'sine';
    this.flutterLFO.frequency.value = 6; // 6Hz flutter
    this.flutterDepth.gain.value = 0;
    this.flutterLFO.start();
    
    // Tape head bump (bass resonance around 60Hz)
    this.headBump = audioContext.createBiquadFilter();
    this.headBump.type = 'peaking';
    this.headBump.frequency.value = 60;
    this.headBump.Q.value = 2.0;
    this.headBump.gain.value = 3;
    
    // High frequency rolloff (tape limitation)
    this.tapeRolloff = audioContext.createBiquadFilter();
    this.tapeRolloff.type = 'lowpass';
    this.tapeRolloff.frequency.value = 15000;
    this.tapeRolloff.Q.value = 0.8;
    
    // Output gain
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // ROUTING:
    // Main signal path
    this.input.connect(this.inputTrim);
    this.inputTrim.connect(this.preEmphasis);
    this.preEmphasis.connect(this.tapeSat);
    this.tapeSat.connect(this.deEmphasis);
    this.deEmphasis.connect(this.wowDelay);
    this.wowDelay.connect(this.headBump);
    this.headBump.connect(this.tapeRolloff);
    this.tapeRolloff.connect(this.outputGain);
    
    // Wow & Flutter modulation
    this.wowLFO.connect(this.wowDepth);
    this.wowDepth.connect(this.wowDelay.delayTime);
    this.flutterLFO.connect(this.flutterDepth);
    this.flutterDepth.connect(this.wowDelay.delayTime);
    
    // Hiss
    this.hissSource.connect(this.hissGain);
    this.hissGain.connect(this.outputGain);
    
    // Output
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Parameters
    this.driveAmount = 50;
  }
  
  makeTapeCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 25); // 1-5 range
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Tape saturation formula (soft compression + harmonic distortion)
      let y = Math.tanh(x * drive);
      
      // Add tape compression (more compression at higher levels)
      const compression = 1 / (1 + Math.abs(x) * 0.3);
      y *= compression;
      
      // Add even harmonics (tape characteristic)
      y += 0.08 * Math.tanh(x * drive * 2);
      
      // Add subtle 3rd harmonic
      y += 0.03 * Math.tanh(x * drive * 3);
      
      // Asymmetry (tape is not perfectly linear)
      if (x > 0) {
        y *= 1.05;
      } else {
        y *= 0.98;
      }
      
      curve[i] = y * 0.85; // Normalize
    }
    
    return curve;
  }
  
  createHissBuffer() {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        // Pink noise (filtered white noise for more natural tape hiss)
        channelData[i] = (Math.random() * 2 - 1) * 0.002;
      }
    }
    
    return buffer;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'drive':
        this.driveAmount = value;
        this.tapeSat.curve = this.makeTapeCurve(value);
        this.inputTrim.gain.setTargetAtTime(0.8 + (value / 500), now, 0.01);
        break;
        
      case 'tone':
        // Adjust tape rolloff frequency
        this.tapeRolloff.frequency.setTargetAtTime(8000 + (value * 120), now, 0.01);
        break;
        
      case 'bias':
        // Tape bias affects high frequency response
        this.preEmphasis.gain.setTargetAtTime(1 + (value / 33), now, 0.01);
        this.deEmphasis.gain.setTargetAtTime(-1 - (value / 33), now, 0.01);
        break;
        
      case 'wow':
        // Wow depth (0.5Hz pitch variation)
        this.wowDepth.gain.setTargetAtTime(value / 50000, now, 0.01);
        break;
        
      case 'flutter':
        // Flutter depth (6Hz pitch variation)
        this.flutterDepth.gain.setTargetAtTime(value / 100000, now, 0.01);
        break;
        
      case 'hiss':
        // Tape hiss amount
        this.hissGain.gain.setTargetAtTime(value / 500, now, 0.01);
        break;
        
      case 'headbump':
        // Low frequency resonance
        this.headBump.gain.setTargetAtTime(value / 20, now, 0.01);
        break;
        
      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.inputTrim.disconnect();
      this.preEmphasis.disconnect();
      this.tapeSat.disconnect();
      this.deEmphasis.disconnect();
      this.wowLFO.stop();
      this.wowLFO.disconnect();
      this.wowDepth.disconnect();
      this.wowDelay.disconnect();
      this.flutterLFO.stop();
      this.flutterLFO.disconnect();
      this.flutterDepth.disconnect();
      this.headBump.disconnect();
      this.tapeRolloff.disconnect();
      this.hissSource.stop();
      this.hissSource.disconnect();
      this.hissGain.disconnect();
      this.outputGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Tape Saturation:', e);
    }
  }
}

export default TapeSaturationEffect;

