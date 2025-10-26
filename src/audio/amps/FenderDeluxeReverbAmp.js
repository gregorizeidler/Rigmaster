import BaseAmp from './BaseAmp.js';

class FenderDeluxeReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Deluxe Reverb', 'fender_deluxe');
    
    // FENDER DELUXE REVERB (Blackface)
    // THE clean amp - Hendrix, SRV, John Mayer
    
    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume = audioContext.createGain();
    this.normalBright = audioContext.createBiquadFilter();
    this.normalBright.type = 'highshelf';
    this.normalBright.frequency.value = 4000;
    this.normalBright.gain.value = 0; // Off by default
    
    // ============================================
    // VIBRATO CHANNEL
    // ============================================
    this.vibratoVolume = audioContext.createGain();
    this.vibratoBright = audioContext.createBiquadFilter();
    this.vibratoBright.type = 'highshelf';
    this.vibratoBright.frequency.value = 4000;
    this.vibratoBright.gain.value = 0; // Off by default
    
    // Active channel
    this.activeChannel = 'vibrato'; // 'normal' or 'vibrato'
    
    // PREAMP (12AX7)
    this.preamp = audioContext.createGain();
    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.curve = this.make12AX7Curve();
    this.preampSaturation.oversample = '4x';
    
    // BLACKFACE TONE STACK
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 1;
    this.mid.gain.value = -2; // Slight mid scoop
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2000;
    
    // BRIGHT SWITCH
    this.brightSwitch = audioContext.createBiquadFilter();
    this.brightSwitch.type = 'highshelf';
    this.brightSwitch.frequency.value = 4000;
    this.brightSwitch.gain.value = 0;
    
    // VOLUME
    this.volume = audioContext.createGain();
    
    // POWER AMP (2x 6V6)
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.make6V6Curve();
    this.powerSaturation.oversample = '4x';
    
    // SPARKLE HIGHS (Fender characteristic)
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 5000;
    this.sparkle.Q.value = 2;
    this.sparkle.gain.value = 3;
    
    // ============================================
    // SPRING REVERB (3-spring tank)
    // ============================================
    this.reverbDwell = audioContext.createGain(); // Send amount
    this.reverbMix = audioContext.createGain(); // Return amount
    
    // Three parallel spring delays
    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    
    this.spring1.delayTime.value = 0.029;
    this.spring2.delayTime.value = 0.037;
    this.spring3.delayTime.value = 0.041;
    
    // Spring reverb filter (darkens the reverb)
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3000;
    this.reverbFilter.Q.value = 0.707;
    
    // Reverb feedback
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.5;
    
    // Spring reverb routing
    this.spring1.connect(this.reverbFilter);
    this.spring2.connect(this.reverbFilter);
    this.spring3.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.spring1);
    this.reverbFeedback.connect(this.spring2);
    this.reverbFeedback.connect(this.spring3);
    this.reverbFilter.connect(this.reverbMix);
    
    // ============================================
    // VIBRATO (amplitude + pitch modulation)
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5;
    
    // Pitch modulation via delay
    this.vibratoDelay = audioContext.createDelay(0.02);
    this.vibratoDelay.delayTime.value = 0.005; // 5ms base
    
    this.vibratoDepthControl = audioContext.createGain();
    this.vibratoDepthControl.gain.value = 0;
    
    // Amplitude modulation
    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 1;
    
    this.vibratoLFO.connect(this.vibratoDepthControl);
    this.vibratoDepthControl.connect(this.vibratoDelay.delayTime);
    this.vibratoDepthControl.connect(this.vibratoGain.gain);
    
    this.vibratoLFO.start();
    
    // MASTER
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - VIBRATO CHANNEL (DEFAULT)
    // ============================================
    this.setupVibratoChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=vibrato
      
      // Normal channel
      normal_volume: 50,
      normal_bright: false,
      
      // Vibrato channel
      vibrato_volume: 50,
      vibrato_bright: false,
      
      // Shared tone stack
      treble: 60,
      bass: 55,
      mid: 50, // Mid control
      
      // Effects
      reverb: 30,
      reverb_dwell: 50, // Send amount
      vibrato_speed: 50,
      vibrato_intensity: 0,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupNormalChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // NORMAL CHANNEL - Simple, clean
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.normalVolume);
    this.normalVolume.connect(this.normalBright); // Bright switch
    
    // Shared tone stack
    this.normalBright.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Power amp
    this.treble.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.sparkle);
    
    // Reverb send
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    
    // Dry + Wet mix
    this.sparkle.connect(this.master); // Dry
    this.reverbMix.connect(this.master); // Wet
    
    this.master.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  setupVibratoChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // VIBRATO CHANNEL - With vibrato effect
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.vibratoVolume);
    this.vibratoVolume.connect(this.vibratoBright); // Bright switch
    
    // Shared tone stack
    this.vibratoBright.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Vibrato effect (before power amp)
    this.treble.connect(this.vibratoDelay);
    this.vibratoDelay.connect(this.vibratoGain);
    
    // Power amp
    this.vibratoGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.sparkle);
    
    // Reverb send
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    
    // Dry + Wet mix
    this.sparkle.connect(this.master); // Dry
    this.reverbMix.connect(this.master); // Wet
    
    this.master.connect(this.output);
    
    this.activeChannel = 'vibrato';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.preampSaturation.disconnect();
      this.normalVolume.disconnect();
      this.normalBright.disconnect();
      this.vibratoVolume.disconnect();
      this.vibratoBright.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.vibratoDelay.disconnect();
      this.vibratoGain.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.sparkle.disconnect();
      this.reverbDwell.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.master.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (12AX7)
    // ============================================
    this.preamp.gain.value = 1.2;
    
    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume.gain.value = 0.5;
    
    // ============================================
    // VIBRATO CHANNEL
    // ============================================
    this.vibratoVolume.gain.value = 0.5;
    
    // ============================================
    // POWER AMP (2x 6V6)
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // REVERB
    // ============================================
    this.reverbDwell.gain.value = 0.3; // Send amount
    this.reverbMix.gain.value = 0.5; // Return amount
    
    // ============================================
    // MASTER
    // ============================================
    this.master.gain.value = 0.7;
  }
  
  make12AX7Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 0.8);
      if (Math.abs(x) > 0.3) y *= 0.92;
      curve[i] = y;
    }
    return curve;
  }
  
  make6V6Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.2);
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.3);
      }
      y += 0.05 * Math.sin(x * Math.PI * 4);
      y += 0.08 * Math.tanh(x * 1.6);
      if (x > 0) y *= 1.05;
      curve[i] = y * 0.95;
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
        if (value === 0) {
          this.setupNormalChannel();
        } else {
          this.setupVibratoChannel();
        }
        break;
      
      // ============================================
      // NORMAL CHANNEL CONTROLS
      // ============================================
      case 'normal_volume':
        this.normalVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'normal_bright':
        this.normalBright.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      // ============================================
      // VIBRATO CHANNEL CONTROLS
      // ============================================
      case 'vibrato_volume':
      case 'volume':
      case 'gain':
        this.vibratoVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'vibrato_bright':
      case 'bright':
        this.vibratoBright.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      // ============================================
      // SHARED TONE STACK
      // ============================================
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // REVERB
      // ============================================
      case 'reverb':
        this.reverbMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'reverb_dwell':
        // Dwell controls how much signal is sent to reverb
        this.reverbDwell.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // VIBRATO EFFECT
      // ============================================
      case 'vibrato_speed':
        // 0.5 Hz to 12 Hz
        this.vibratoLFO.frequency.setTargetAtTime(0.5 + (value / 100) * 11.5, now, 0.01);
        break;
      
      case 'vibrato_intensity':
      case 'vibrato_depth':
        // Controls both pitch and amplitude modulation depth
        this.vibratoDepthControl.gain.setTargetAtTime((value / 100) * 0.008, now, 0.01);
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
      this.vibratoLFO.stop();
    } catch (e) {
      // Already stopped
    }
    
    // Disconnect all nodes
    this.preamp.disconnect();
    this.preampSaturation.disconnect();
    this.normalVolume.disconnect();
    this.normalBright.disconnect();
    this.vibratoVolume.disconnect();
    this.vibratoBright.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.vibratoLFO.disconnect();
    this.vibratoDelay.disconnect();
    this.vibratoDepthControl.disconnect();
    this.vibratoGain.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.sparkle.disconnect();
    this.reverbDwell.disconnect();
    this.spring1.disconnect();
    this.spring2.disconnect();
    this.spring3.disconnect();
    this.reverbFilter.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbMix.disconnect();
    this.master.disconnect();
  }
}

export default FenderDeluxeReverbAmp;

