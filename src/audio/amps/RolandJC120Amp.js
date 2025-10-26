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
    // DISTORTION FOOTSWITCH (parallel blend)
    // ============================================
    this.distortionEnabled = false;
    this.distortion = audioContext.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve();
    this.distortion.oversample = '4x';
    
    // Parallel paths for clean/distorted blend
    this.distortionWet = audioContext.createGain();
    this.distortionDry = audioContext.createGain();
    this.distortionWet.gain.value = 0; // Off by default
    this.distortionDry.gain.value = 1; // Clean by default
    
    // ============================================
    // TONE STACK (Bass/Mid/Treble)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter(); // Controllable mid
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 0.8;
    this.mid.gain.value = -2; // Default slight scoop
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // ============================================
    // BUILT-IN STEREO CHORUS (phase-opposed modulation)
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
    
    // Chorus depth control - PHASE OPPOSED for L/R
    this.chorusDepthL = audioContext.createGain();
    this.chorusDepthR = audioContext.createGain();
    this.chorusDepthL.gain.value = 0;
    this.chorusDepthR.gain.value = 0;
    
    // Chorus mix (wet)
    this.chorusMixL = audioContext.createGain();
    this.chorusMixR = audioContext.createGain();
    this.chorusMixL.gain.value = 0;
    this.chorusMixR.gain.value = 0;
    
    // Dry gains for chorus bypass
    this.chorusDryL = audioContext.createGain();
    this.chorusDryR = audioContext.createGain();
    this.chorusDryL.gain.value = 1.0;
    this.chorusDryR.gain.value = 1.0;
    
    // Connect LFO to delays (PHASE OPPOSED)
    this.chorusLFO.connect(this.chorusDepthL);
    this.chorusLFO.connect(this.chorusDepthR);
    this.chorusDepthL.connect(this.chorusDelayL.delayTime);
    this.chorusDepthR.connect(this.chorusDelayR.delayTime);
    this.chorusLFO.start();
    
    // Vibrato mode (100% wet, no dry)
    this.vibratoEnabled = false;
    
    // ============================================
    // STEREO OUTPUTS (L/R speakers - pre power amp)
    // ============================================
    this.outputL = audioContext.createGain();
    this.outputR = audioContext.createGain();
    
    // ============================================
    // DUAL POWER AMPS (Solid-state, 2x60W = 120W total)
    // ============================================
    this.powerAmpL = audioContext.createGain();
    this.powerAmpR = audioContext.createGain();
    
    // Solid-state power amp saturation (very clean, no sag)
    this.powerSatL = audioContext.createWaveShaper();
    this.powerSatR = audioContext.createWaveShaper();
    this.powerSatL.curve = this.makePowerAmpCurve();
    this.powerSatR.curve = this.makePowerAmpCurve();
    this.powerSatL.oversample = '4x';
    this.powerSatR.oversample = '4x';
    
    // ============================================
    // DUAL MASTER VOLUMES (L/R)
    // ============================================
    this.masterL = audioContext.createGain();
    this.masterR = audioContext.createGain();
    
    // ============================================
    // SOLID-STATE LIMITERS (anti-clip)
    // ============================================
    this.ssLimiterL = audioContext.createDynamicsCompressor();
    this.ssLimiterR = audioContext.createDynamicsCompressor();
    this.ssLimiterL.threshold.value = -1;
    this.ssLimiterR.threshold.value = -1;
    this.ssLimiterL.ratio.value = 20;
    this.ssLimiterR.ratio.value = 20;
    this.ssLimiterL.attack.value = 0.001;
    this.ssLimiterR.attack.value = 0.001;
    this.ssLimiterL.release.value = 0.05;
    this.ssLimiterR.release.value = 0.05;
    
    // ============================================
    // CABINET SIMULATION (2x12 open-back)
    // ============================================
    this.cabIRL = audioContext.createConvolver();
    this.cabIRR = audioContext.createConvolver();
    this.cabEnabled = true;
    
    // Load default JC-120 cabinet (2x12 open-back with JC speakers)
    this.loadDefaultCabinetIR();
    
    // ============================================
    // STEREO MERGER (for output routing)
    // ============================================
    this.stereoMerger = audioContext.createChannelMerger(2);
    
    // ============================================
    // PARAMETERS (DEFINE BEFORE SETUP!)
    // ============================================
    this.params = {
      channel: 1, // 1 or 2
      
      // Channel volumes
      ch1_volume: 50,
      ch2_volume: 50,
      
      // Tone stack
      bass: 50,
      mid: 45, // Slight scoop default
      treble: 60,
      
      // Chorus
      chorus_rate: 40,
      chorus_depth: 50,
      chorus_enabled: true,
      vibrato_enabled: false,
      
      // Distortion
      distortion: false,
      
      // Cabinet
      cabinet_enabled: true,
      
      // Master
      master: 70
    };
    
    // ============================================
    // ROUTING - CHANNEL 1 (DEFAULT)
    // ============================================
    this.setupChannel1();
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // Disconnect all first
    this.disconnectAll();
    
    // CHANNEL 1 - Stereo signal path from input to output
    this.input.connect(this.preamp);
    this.preamp.connect(this.saturation);
    this.saturation.connect(this.channel1Volume);
    
    // Distortion footswitch (parallel mix)
    this.channel1Volume.connect(this.distortionDry);      // Clean path
    this.channel1Volume.connect(this.distortion);         // Distortion path
    this.distortion.connect(this.distortionWet);
    
    // Mix distortion and clean
    const distMixer = this.audioContext.createGain();
    this.distortionDry.connect(distMixer);
    this.distortionWet.connect(distMixer);
    
    // Tone stack
    distMixer.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Stereo split after tone stack
    // DRY paths (L/R)
    this.treble.connect(this.chorusDryL);
    this.treble.connect(this.chorusDryR);
    
    // Chorus WET paths (L/R with delays)
    this.treble.connect(this.chorusDelayL);
    this.treble.connect(this.chorusDelayR);
    this.chorusDelayL.connect(this.chorusMixL);
    this.chorusDelayR.connect(this.chorusMixR);
    
    // Sum dry + wet for each channel
    this.chorusDryL.connect(this.outputL);
    this.chorusMixL.connect(this.outputL);
    this.chorusDryR.connect(this.outputR);
    this.chorusMixR.connect(this.outputR);
    
    // DUAL POWER AMPS (L/R)
    this.outputL.connect(this.powerAmpL);
    this.outputR.connect(this.powerAmpR);
    this.powerAmpL.connect(this.powerSatL);
    this.powerAmpR.connect(this.powerSatR);
    this.powerSatL.connect(this.masterL);
    this.powerSatR.connect(this.masterR);
    
    // DUAL LIMITERS (anti-clip)
    this.masterL.connect(this.ssLimiterL);
    this.masterR.connect(this.ssLimiterR);
    
    // CABINET (if enabled)
    if (this.cabEnabled) {
      this.ssLimiterL.connect(this.cabIRL);
      this.ssLimiterR.connect(this.cabIRR);
      this.cabIRL.connect(this.stereoMerger, 0, 0);
      this.cabIRR.connect(this.stereoMerger, 0, 1);
    } else {
      // Direct to output (no cabinet)
      this.ssLimiterL.connect(this.stereoMerger, 0, 0);
      this.ssLimiterR.connect(this.stereoMerger, 0, 1);
    }
    
    // Final stereo output
    this.stereoMerger.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // Disconnect all first
    this.disconnectAll();
    
    // CHANNEL 2 - Stereo signal path from input to output
    this.input.connect(this.preamp);
    this.preamp.connect(this.saturation);
    this.saturation.connect(this.channel2Volume);
    
    // Distortion footswitch (parallel mix)
    this.channel2Volume.connect(this.distortionDry);      // Clean path
    this.channel2Volume.connect(this.distortion);         // Distortion path
    this.distortion.connect(this.distortionWet);
    
    // Mix distortion and clean
    const distMixer = this.audioContext.createGain();
    this.distortionDry.connect(distMixer);
    this.distortionWet.connect(distMixer);
    
    // Tone stack
    distMixer.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Stereo split after tone stack
    // DRY paths (L/R)
    this.treble.connect(this.chorusDryL);
    this.treble.connect(this.chorusDryR);
    
    // Chorus WET paths (L/R with delays)
    this.treble.connect(this.chorusDelayL);
    this.treble.connect(this.chorusDelayR);
    this.chorusDelayL.connect(this.chorusMixL);
    this.chorusDelayR.connect(this.chorusMixR);
    
    // Sum dry + wet for each channel
    this.chorusDryL.connect(this.outputL);
    this.chorusMixL.connect(this.outputL);
    this.chorusDryR.connect(this.outputR);
    this.chorusMixR.connect(this.outputR);
    
    // DUAL POWER AMPS (L/R)
    this.outputL.connect(this.powerAmpL);
    this.outputR.connect(this.powerAmpR);
    this.powerAmpL.connect(this.powerSatL);
    this.powerAmpR.connect(this.powerSatR);
    this.powerSatL.connect(this.masterL);
    this.powerSatR.connect(this.masterR);
    
    // DUAL LIMITERS (anti-clip)
    this.masterL.connect(this.ssLimiterL);
    this.masterR.connect(this.ssLimiterR);
    
    // CABINET (if enabled)
    if (this.cabEnabled) {
      this.ssLimiterL.connect(this.cabIRL);
      this.ssLimiterR.connect(this.cabIRR);
      this.cabIRL.connect(this.stereoMerger, 0, 0);
      this.cabIRR.connect(this.stereoMerger, 0, 1);
    } else {
      // Direct to output (no cabinet)
      this.ssLimiterL.connect(this.stereoMerger, 0, 0);
      this.ssLimiterR.connect(this.stereoMerger, 0, 1);
    }
    
    // Final stereo output
    this.stereoMerger.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.saturation.disconnect();
      this.channel1Volume.disconnect();
      this.channel2Volume.disconnect();
      this.distortion.disconnect();
      this.distortionWet.disconnect();
      this.distortionDry.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.chorusDryL.disconnect();
      this.chorusDryR.disconnect();
      this.chorusDelayL.disconnect();
      this.chorusDelayR.disconnect();
      this.chorusMixL.disconnect();
      this.chorusMixR.disconnect();
      this.outputL.disconnect();
      this.outputR.disconnect();
      this.powerAmpL.disconnect();
      this.powerAmpR.disconnect();
      this.powerSatL.disconnect();
      this.powerSatR.disconnect();
      this.masterL.disconnect();
      this.masterR.disconnect();
      this.ssLimiterL.disconnect();
      this.ssLimiterR.disconnect();
      this.cabIRL.disconnect();
      this.cabIRR.disconnect();
      this.stereoMerger.disconnect();
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
    this.channel1Volume.gain.value = this.lin2log(0.5);
    this.channel2Volume.gain.value = this.lin2log(0.5);
    
    // ============================================
    // CHORUS - Phase opposed modulation
    // ============================================
    this.chorusDepthL.gain.value = 0.003;   // 3ms modulation depth (positive)
    this.chorusDepthR.gain.value = -0.003;  // 3ms modulation depth (INVERTED)
    this.chorusMixL.gain.value = 0.5;       // 50% chorus mix
    this.chorusMixR.gain.value = 0.5;
    
    // ============================================
    // POWER AMPS (2x60W solid-state)
    // ============================================
    this.powerAmpL.gain.value = 1.0;
    this.powerAmpR.gain.value = 1.0;
    
    // ============================================
    // DUAL MASTERS (L/R)
    // ============================================
    this.masterL.gain.value = this.lin2log(0.7);
    this.masterR.gain.value = this.lin2log(0.7);
  }
  
  // Logarithmic volume curve for musical feel
  lin2log(value01) {
    return 0.001 * Math.pow(1000, value01);
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
        this.channel1Volume.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      case 'ch2_volume':
        this.channel2Volume.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'mid':
        // ±10 dB range for mid control
        this.mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // CHORUS (Phase-opposed stereo modulation)
      // ============================================
      case 'chorus_rate':
        // 0.2 Hz to 3 Hz
        this.chorusLFO.frequency.setTargetAtTime(0.2 + (value / 100) * 2.8, now, 0.01);
        break;
      
      case 'chorus_depth': {
        // 0 to 8ms modulation (PHASE OPPOSED for L/R)
        const depth = (value / 100) * 0.008;
        this.chorusDepthL.gain.setTargetAtTime(+depth, now, 0.01);  // Positive
        this.chorusDepthR.gain.setTargetAtTime(-depth, now, 0.01);  // INVERTED
        break;
      }
      
      case 'chorus_enabled':
        if (value) {
          this.chorusMixL.gain.setTargetAtTime(0.5, now, 0.01);
          this.chorusMixR.gain.setTargetAtTime(0.5, now, 0.01);
          // If chorus is on, ensure dry is present (unless vibrato mode)
          if (!this.vibratoEnabled) {
            this.chorusDryL.gain.setTargetAtTime(1.0, now, 0.01);
            this.chorusDryR.gain.setTargetAtTime(1.0, now, 0.01);
          }
        } else {
          this.chorusMixL.gain.setTargetAtTime(0, now, 0.01);
          this.chorusMixR.gain.setTargetAtTime(0, now, 0.01);
          // Ensure dry path is active
          this.chorusDryL.gain.setTargetAtTime(1.0, now, 0.01);
          this.chorusDryR.gain.setTargetAtTime(1.0, now, 0.01);
        }
        break;
      
      case 'vibrato_enabled': {
        // Vibrato mode = 100% wet, no dry (authentic JC-120)
        this.vibratoEnabled = value;
        const wet = value ? 1.0 : 0.5;
        const dry = value ? 0.0 : 1.0;
        this.chorusMixL.gain.setTargetAtTime(wet, now, 0.01);
        this.chorusMixR.gain.setTargetAtTime(wet, now, 0.01);
        this.chorusDryL.gain.setTargetAtTime(dry, now, 0.01);
        this.chorusDryR.gain.setTargetAtTime(dry, now, 0.01);
        break;
      }
      
      // ============================================
      // DISTORTION (Parallel blend)
      // ============================================
      case 'distortion':
        this.distortionEnabled = value;
        if (value) {
          this.distortionWet.gain.setTargetAtTime(0.8, now, 0.01);
          this.distortionDry.gain.setTargetAtTime(0.4, now, 0.01);
        } else {
          this.distortionWet.gain.setTargetAtTime(0.0, now, 0.01);
          this.distortionDry.gain.setTargetAtTime(1.0, now, 0.01);
        }
        break;
      
      // ============================================
      // CABINET CONTROL
      // ============================================
      case 'cabinet_enabled':
        this.cabEnabled = value;
        // Re-route to enable/disable cabinet
        if (this.activeChannel === 1) {
          this.setupChannel1();
        } else {
          this.setupChannel2();
        }
        break;
      
      // ============================================
      // MASTER (Dual L/R)
      // ============================================
      case 'master': {
        const v = this.lin2log(value / 100);
        this.masterL.gain.setTargetAtTime(v, now, 0.01);
        this.masterR.gain.setTargetAtTime(v, now, 0.01);
        break;
      }
    }
    
    this.params[parameter] = value;
  }
  
  /**
   * Load a default synthetic cabinet IR (2x12 open-back with JC speakers)
   * This ensures the cabinet simulation works out of the box
   */
  loadDefaultCabinetIR() {
    // Create a synthetic JC-120 cabinet IR
    // 2x12" open-back with custom Roland speakers
    // Characteristics: bright, clear, extended highs, loose lows
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(0.15 * sampleRate); // 150ms IR
    const bufferL = this.audioContext.createBuffer(1, length, sampleRate);
    const bufferR = this.audioContext.createBuffer(1, length, sampleRate);
    const dataL = bufferL.getChannelData(0);
    const dataR = bufferR.getChannelData(0);
    
    // Initial impulse (transient)
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Bright attack with extended highs
      const attack = Math.exp(-30 * t) * (Math.random() * 0.5 + 0.5);
      
      // Open-back cabinet reflections (less resonance than closed-back)
      const earlyReflections = 
        Math.exp(-8 * t) * Math.sin(2 * Math.PI * 180 * t) * 0.3 +
        Math.exp(-12 * t) * Math.sin(2 * Math.PI * 420 * t) * 0.25 +
        Math.exp(-15 * t) * Math.sin(2 * Math.PI * 850 * t) * 0.2;
      
      // Late reflections (room ambience)
      const late = Math.exp(-5 * t) * (Math.random() - 0.5) * 0.15;
      
      // Combine
      let sample = attack * 0.6 + earlyReflections + late;
      
      // Slight stereo difference (open-back has natural stereo width)
      dataL[i] = sample;
      dataR[i] = sample * 0.95 + (Math.random() - 0.5) * 0.05;
    }
    
    // High-pass to remove DC offset and mud
    this.applyHighPass(dataL, sampleRate, 80);
    this.applyHighPass(dataR, sampleRate, 80);
    
    // Apply cabinet curves
    this.cabIRL.buffer = bufferL;
    this.cabIRR.buffer = bufferR;
  }
  
  applyHighPass(data, sampleRate, frequency) {
    const RC = 1.0 / (2 * Math.PI * frequency);
    const dt = 1.0 / sampleRate;
    const alpha = RC / (RC + dt);
    
    let y = 0;
    let x_prev = 0;
    
    for (let i = 0; i < data.length; i++) {
      const x = data[i];
      y = alpha * (y + x - x_prev);
      x_prev = x;
      data[i] = y;
    }
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
    this.distortion.disconnect();
    this.distortionWet.disconnect();
    this.distortionDry.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.chorusLFO.disconnect();
    this.chorusDepthL.disconnect();
    this.chorusDepthR.disconnect();
    this.chorusDryL.disconnect();
    this.chorusDryR.disconnect();
    this.chorusDelayL.disconnect();
    this.chorusDelayR.disconnect();
    this.chorusMixL.disconnect();
    this.chorusMixR.disconnect();
    this.outputL.disconnect();
    this.outputR.disconnect();
    this.powerAmpL.disconnect();
    this.powerAmpR.disconnect();
    this.powerSatL.disconnect();
    this.powerSatR.disconnect();
    this.masterL.disconnect();
    this.masterR.disconnect();
    this.ssLimiterL.disconnect();
    this.ssLimiterR.disconnect();
    this.cabIRL.disconnect();
    this.cabIRR.disconnect();
    this.stereoMerger.disconnect();
  }
}

export default RolandJC120Amp;

