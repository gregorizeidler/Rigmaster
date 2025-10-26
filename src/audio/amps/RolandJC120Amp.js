import BaseAmp from './BaseAmp.js';

class RolandJC120Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Roland JC-120', 'roland_jc120');
    
    // ROLAND JC-120 (Jazz Chorus)
    // THE clean amp - Andy Summers (The Police), Robert Smith (The Cure)
    // Famous for pristine clean tone and built-in stereo chorus
    
    // ============================================
    // SOLID-STATE PREAMP (FET-based, not tube)
    // ============================================
    this.preamp = audioContext.createGain();
    
    // Solid-state clipping (hard, asymmetric)
    this.saturation = audioContext.createWaveShaper();
    this.saturation.curve = this.makeSolidStateCurve();
    this.saturation.oversample = '4x';
    
    // ============================================
    // DUAL INPUT CHANNELS
    // ============================================
    this.channel1Volume = audioContext.createGain();
    this.channel2Volume = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 1; // 1 or 2
    
    // ============================================
    // TONE STACK (Simple bass/treble)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.midScoop = audioContext.createBiquadFilter(); // Fixed mid scoop
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.midScoop.type = 'peaking';
    this.midScoop.frequency.value = 500;
    this.midScoop.Q.value = 0.7;
    this.midScoop.gain.value = -2; // Slight scoop
    
    // ============================================
    // BUILT-IN STEREO CHORUS
    // ============================================
    // LFO for chorus
    this.chorusLFO = audioContext.createOscillator();
    this.chorusLFO.type = 'sine';
    this.chorusLFO.frequency.value = 0.8; // Slow modulation
    
    // Chorus delay (left and right)
    this.chorusDelayL = audioContext.createDelay(0.05);
    this.chorusDelayR = audioContext.createDelay(0.05);
    this.chorusDelayL.delayTime.value = 0.015; // 15ms base
    this.chorusDelayR.delayTime.value = 0.020; // 20ms base (stereo offset)
    
    // Chorus depth control
    this.chorusDepth = audioContext.createGain();
    this.chorusDepth.gain.value = 0;
    
    // Chorus mix
    this.chorusMixL = audioContext.createGain();
    this.chorusMixR = audioContext.createGain();
    this.chorusMixL.gain.value = 0;
    this.chorusMixR.gain.value = 0;
    
    // Connect LFO to delays
    this.chorusLFO.connect(this.chorusDepth);
    this.chorusDepth.connect(this.chorusDelayL.delayTime);
    this.chorusDepth.connect(this.chorusDelayR.delayTime);
    this.chorusLFO.start();
    
    // ============================================
    // STEREO OUTPUTS (L/R speakers)
    // ============================================
    this.outputL = audioContext.createGain();
    this.outputR = audioContext.createGain();
    this.stereoMerger = audioContext.createChannelMerger(2);
    
    // ============================================
    // POWER AMP (Solid-state, 120W)
    // ============================================
    this.powerAmp = audioContext.createGain();
    
    // Solid-state power amp (very clean, no sag)
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // DISTORTION FOOTSWITCH (optional)
    // ============================================
    this.distortionEnabled = false;
    this.distortion = audioContext.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve();
    this.distortion.oversample = '4x';
    this.distortionMix = audioContext.createGain();
    this.distortionMix.gain.value = 0;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 1 (DEFAULT)
    // ============================================
    this.setupChannel1();
    
    this.params = {
      channel: 1, // 1 or 2
      
      // Channel volumes
      ch1_volume: 50,
      ch2_volume: 50,
      
      // Tone stack
      bass: 50,
      treble: 60,
      
      // Chorus
      chorus_rate: 40,
      chorus_depth: 50,
      chorus_enabled: true,
      
      // Distortion
      distortion: false,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // Disconnect all first
    this.disconnectAll();
    
    // CHANNEL 1
    this.input.connect(this.preamp);
    this.preamp.connect(this.saturation);
    this.saturation.connect(this.channel1Volume);
    
    // Tone stack
    this.channel1Volume.connect(this.bass);
    this.bass.connect(this.midScoop);
    this.midScoop.connect(this.treble);
    
    // Stereo chorus routing
    this.treble.connect(this.outputL); // Dry left
    this.treble.connect(this.outputR); // Dry right
    
    // Chorus (wet signals)
    this.treble.connect(this.chorusDelayL);
    this.treble.connect(this.chorusDelayR);
    this.chorusDelayL.connect(this.chorusMixL);
    this.chorusDelayR.connect(this.chorusMixR);
    this.chorusMixL.connect(this.outputL);
    this.chorusMixR.connect(this.outputR);
    
    // Power amp
    this.outputL.connect(this.powerAmp);
    this.outputR.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // Disconnect all first
    this.disconnectAll();
    
    // CHANNEL 2
    this.input.connect(this.preamp);
    this.preamp.connect(this.saturation);
    this.saturation.connect(this.channel2Volume);
    
    // Tone stack
    this.channel2Volume.connect(this.bass);
    this.bass.connect(this.midScoop);
    this.midScoop.connect(this.treble);
    
    // Stereo chorus routing
    this.treble.connect(this.outputL); // Dry left
    this.treble.connect(this.outputR); // Dry right
    
    // Chorus (wet signals)
    this.treble.connect(this.chorusDelayL);
    this.treble.connect(this.chorusDelayR);
    this.chorusDelayL.connect(this.chorusMixL);
    this.chorusDelayR.connect(this.chorusMixR);
    this.chorusMixL.connect(this.outputL);
    this.chorusMixR.connect(this.outputR);
    
    // Power amp
    this.outputL.connect(this.powerAmp);
    this.outputR.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.saturation.disconnect();
      this.channel1Volume.disconnect();
      this.channel2Volume.disconnect();
      this.bass.disconnect();
      this.midScoop.disconnect();
      this.treble.disconnect();
      this.chorusDelayL.disconnect();
      this.chorusDelayR.disconnect();
      this.chorusMixL.disconnect();
      this.chorusMixR.disconnect();
      this.outputL.disconnect();
      this.outputR.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (Solid-state, very clean)
    // ============================================
    this.preamp.gain.value = 1.5;
    
    // ============================================
    // CHANNELS
    // ============================================
    this.channel1Volume.gain.value = 0.5;
    this.channel2Volume.gain.value = 0.5;
    
    // ============================================
    // CHORUS
    // ============================================
    this.chorusDepth.gain.value = 0.003; // 3ms modulation depth
    this.chorusMixL.gain.value = 0.5; // 50% chorus mix
    this.chorusMixR.gain.value = 0.5;
    
    // ============================================
    // POWER AMP (120W solid-state)
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // MASTER
    // ============================================
    this.master.gain.value = 0.7;
  }
  
  makeSolidStateCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SOLID-STATE PREAMP - very clean until hard clipping
      if (Math.abs(x) < 0.8) {
        curve[i] = x * 1.02; // Nearly linear (very clean)
      } else {
        // Hard clipping (solid-state characteristic)
        let y = Math.tanh(x * 8);
        
        // Asymmetric clipping (transistor characteristic)
        if (x > 0) {
          y *= 1.15;
        } else {
          y *= 0.92;
        }
        
        curve[i] = y * 0.95;
      }
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SOLID-STATE POWER AMP - extremely clean, no sag
      if (Math.abs(x) < 0.9) {
        curve[i] = x; // Completely linear
      } else {
        // Very hard clipping at extreme levels
        curve[i] = Math.sign(x) * 0.9;
      }
    }
    return curve;
  }
  
  makeDistortionCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Optional distortion (footswitch)
      let y = Math.tanh(x * 6);
      
      // Solid-state distortion (harsh, asymmetric)
      if (x > 0) y *= 1.2;
      
      curve[i] = y * 0.8;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL SELECTION
      // ============================================
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else {
          this.setupChannel2();
        }
        break;
      
      // ============================================
      // CHANNEL VOLUMES
      // ============================================
      case 'ch1_volume':
      case 'volume':
      case 'gain':
        this.channel1Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'ch2_volume':
        this.channel2Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // CHORUS
      // ============================================
      case 'chorus_rate':
        // 0.2 Hz to 3 Hz
        this.chorusLFO.frequency.setTargetAtTime(0.2 + (value / 100) * 2.8, now, 0.01);
        break;
      
      case 'chorus_depth':
        // 0 to 8ms modulation
        this.chorusDepth.gain.setTargetAtTime((value / 100) * 0.008, now, 0.01);
        break;
      
      case 'chorus_enabled':
        if (value) {
          this.chorusMixL.gain.setTargetAtTime(0.5, now, 0.01);
          this.chorusMixR.gain.setTargetAtTime(0.5, now, 0.01);
        } else {
          this.chorusMixL.gain.setTargetAtTime(0, now, 0.01);
          this.chorusMixR.gain.setTargetAtTime(0, now, 0.01);
        }
        break;
      
      // ============================================
      // DISTORTION
      // ============================================
      case 'distortion':
        this.distortionEnabled = value;
        // Not implemented in routing yet, but ready for footswitch
        break;
      
      // ============================================
      // MASTER
      // ============================================
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Stop oscillator
    try {
      this.chorusLFO.stop();
    } catch (e) {
      // Already stopped
    }
    
    // Disconnect all nodes
    this.preamp.disconnect();
    this.saturation.disconnect();
    this.channel1Volume.disconnect();
    this.channel2Volume.disconnect();
    this.bass.disconnect();
    this.midScoop.disconnect();
    this.treble.disconnect();
    this.chorusLFO.disconnect();
    this.chorusDepth.disconnect();
    this.chorusDelayL.disconnect();
    this.chorusDelayR.disconnect();
    this.chorusMixL.disconnect();
    this.chorusMixR.disconnect();
    this.outputL.disconnect();
    this.outputR.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.distortion.disconnect();
    this.distortionMix.disconnect();
    this.master.disconnect();
  }
}

export default RolandJC120Amp;

