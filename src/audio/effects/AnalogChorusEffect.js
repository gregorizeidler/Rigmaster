import BaseEffect from './BaseEffect.js';

class AnalogChorusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Analog Chorus', 'analogchorus');
    
    // ANALOG CHORUS (BBD-style bucket brigade chorus)
    // Warm, lush analog chorus with BBD characteristics
    
    // Input/Output
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // BBD delay lines (simulate bucket brigade)
    this.delay1 = audioContext.createDelay(0.1);
    this.delay2 = audioContext.createDelay(0.1);
    
    // LFOs for modulation
    this.lfo1 = audioContext.createOscillator();
    this.lfo2 = audioContext.createOscillator();
    this.lfo1.type = 'sine';
    this.lfo2.type = 'sine';
    this.lfo1.frequency.value = 0.5;
    this.lfo2.frequency.value = 0.52; // Slightly detuned
    
    // LFO gain (modulation depth)
    this.lfoGain1 = audioContext.createGain();
    this.lfoGain2 = audioContext.createGain();
    this.lfoGain1.gain.value = 0.003; // 3ms modulation
    this.lfoGain2.gain.value = 0.003;
    
    // BBD noise floor simulation - very subtle white noise mixed in
    this.bbdNoiseSource = audioContext.createBufferSource();
    const noiseLength = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    this.bbdNoiseSource.buffer = noiseBuffer;
    this.bbdNoiseSource.loop = true;
    
    this.bbdNoiseGain = audioContext.createGain();
    this.bbdNoiseGain.gain.value = 0.001; // ~-60dB noise floor
    
    this.bbdNoiseSource.connect(this.bbdNoiseGain);
    this.bbdNoiseSource.start();
    
    // BBD lowpass (typical BBD rolloff)
    this.bbdFilter = audioContext.createBiquadFilter();
    this.bbdFilter.type = 'lowpass';
    this.bbdFilter.frequency.value = 8000;
    this.bbdFilter.Q.value = 0.5;
    
    // Warm saturation (BBD characteristic) with 4x oversampling
    this.saturation = audioContext.createWaveShaper();
    this.saturation.oversample = '4x';
    this.saturation.curve = this._makeBBDCurve(1.2);
    
    // DC blocker (high-pass at ~10Hz)
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.7071;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet signal path 1 (through BBD filter + saturation)
    this.inputGain.connect(this.delay1);
    this.lfo1.connect(this.lfoGain1);
    this.lfoGain1.connect(this.delay1.delayTime);
    this.delay1.connect(this.bbdFilter);
    this.bbdFilter.connect(this.saturation);
    this.saturation.connect(this.wetGain);
    
    // Wet signal path 2 (stereo)
    this.inputGain.connect(this.delay2);
    this.lfo2.connect(this.lfoGain2);
    this.lfoGain2.connect(this.delay2.delayTime);
    this.delay2.connect(this.wetGain);
    
    // Mix BBD noise into wet signal
    this.bbdNoiseGain.connect(this.wetGain);
    
    // Wet → DC blocker → output
    this.wetGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    // Start LFOs
    this.lfo1.start();
    this.lfo2.start();
    
    // Initialize
    this.delay1.delayTime.value = 0.015; // 15ms base delay
    this.delay2.delayTime.value = 0.020; // 20ms base delay
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 1.0;
    
    this.params = {
      rate: 50,
      depth: 50,
      mix: 50,
      tone: 50,
      warmth: 50
    };
  }
  
  _makeBBDCurve(drive = 1.2) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft saturation (BBD warmth)
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        const rate = 0.1 + (value / 100) * 4.9; // 0.1 to 5 Hz
        this.lfo1.frequency.setTargetAtTime(rate, now, 0.01);
        this.lfo2.frequency.setTargetAtTime(rate * 1.04, now, 0.01);
        break;
      case 'depth':
        const depth = (value / 100) * 0.008; // 0 to 8ms
        this.lfoGain1.gain.setTargetAtTime(depth, now, 0.01);
        this.lfoGain2.gain.setTargetAtTime(depth, now, 0.01);
        break;
      case 'mix':
        this.wetGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'tone':
        const freq = 3000 + (value / 100) * 12000; // 3kHz to 15kHz
        this.bbdFilter.frequency.setTargetAtTime(freq, now, 0.01);
        break;
      case 'warmth':
        // Adjust saturation amount (regenerate curve with new drive)
        const warmth = 1 + (value / 100) * 0.5;
        this.saturation.curve = this._makeBBDCurve(warmth);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.lfo1.stop();
    this.lfo2.stop();
    try { this.bbdNoiseSource.stop(); } catch (e) {}
    this.inputGain.disconnect();
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.lfo1.disconnect();
    this.lfo2.disconnect();
    this.lfoGain1.disconnect();
    this.lfoGain2.disconnect();
    this.bbdFilter.disconnect();
    this.saturation.disconnect();
    this.bbdNoiseSource.disconnect();
    this.bbdNoiseGain.disconnect();
    this.dcBlocker.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default AnalogChorusEffect;
