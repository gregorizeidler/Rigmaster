import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class FenderDeluxeReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Deluxe Reverb', 'fender_deluxe');
    
    // FENDER DELUXE REVERB (Blackface)
    // THE clean amp - Hendrix, SRV, John Mayer
    
    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume = audioContext.createGain();
    
    // ============================================
    // VIBRATO CHANNEL
    // ============================================
    this.vibratoVolume = audioContext.createGain();
    
    // Bright cap (dynamic, reacts to volume like real cap)
    this.vibratoBright = audioContext.createBiquadFilter();
    this.vibratoBright.type = 'highshelf';
    this.vibratoBright.frequency.value = 4000;
    this.vibratoBright.gain.value = 0;
    this._vBrightOn = false;
    
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
    
    // SPARKLE HIGHS (Fender characteristic - more subtle)
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 3500;
    this.sparkle.Q.value = 2;
    this.sparkle.gain.value = 1.5;
    
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
    
    // Reverb sum (dry + wet mixer BEFORE power amp)
    this.reverbSum = audioContext.createGain();
    
    // ============================================
    // VIBRATO/TREMOLO (optical AM tremolo, not pitch)
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine'; // Can use 'triangle' for more opto feel
    this.vibratoLFO.frequency.value = 5;
    
    this.vibratoDepthControl = audioContext.createGain();
    this.vibratoDepthControl.gain.value = 0;
    
    // Amplitude modulation only (tremolo)
    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 1;
    
    this.vibratoLFO.connect(this.vibratoDepthControl);
    this.vibratoDepthControl.connect(this.vibratoGain.gain);
    
    this.vibratoLFO.start();
    
    // ============================================
    // RECTIFIER SAG (5AR4)
    // ============================================
    this.rectifierSag = audioContext.createDynamicsCompressor();
    this.rectifierSag.threshold.value = -22;
    this.rectifierSag.ratio.value = 2.2;
    this.rectifierSag.attack.value = 0.005;
    this.rectifierSag.release.value = 0.12;
    
    // ============================================
    // POWER AMP (2x 6V6)
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // Deluxe Reverb uses 5AR4/GZ34 tube rectifier with 6V6 power tubes
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.13,      // 13% sag (6V6 vintage sag)
      att: 0.009,       // 9ms attack (gentle)
      relFast: 0.08,    // 80ms fast recovery
      relSlow: 0.26,    // 260ms slow recovery (vintage breathing)
      rmsMs: 24.0,      // 24ms RMS window (vintage)
      shape: 1.6,       // Progressive (vintage 6V6)
      floor: 0.26,      // 26% minimum headroom
      peakMix: 0.29     // More RMS-focused (vintage smooth)
    });
    
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.make6V6Curve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x12_open'; // Fender Deluxe standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // MASTER
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - VIBRATO CHANNEL (DEFAULT)
    // ============================================
    this.setupVibratoChannel();
    this.recreateCabinet();
    
    this.params = {
      channel: 1, // 0=normal, 1=vibrato
      
      // Normal channel
      normal_volume: 50,
      
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
      master: 70,
      
      // Cabinet
      cabinet_enabled: true
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
    
    // Shared tone stack
    this.normalVolume.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.sparkle);
    
    // REVERB BEFORE POWER AMP (like real DR)
    // Send to reverb
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    
    // Mix dry + wet BEFORE power amp
    this.sparkle.connect(this.reverbSum); // Dry
    this.reverbMix.connect(this.reverbSum); // Wet
    
    // Power section with sag
    this.reverbSum.connect(this.rectifierSag);
    if (this.powerSag) {
      this.rectifierSag.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.rectifierSag.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    
    // Cabinet routing with CabinetSimulator
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  setupVibratoChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // VIBRATO CHANNEL - With tremolo effect (AM, not pitch)
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.vibratoVolume);
    this.vibratoVolume.connect(this.vibratoBright); // Bright cap
    
    // Shared tone stack
    this.vibratoBright.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // TREMOLO (optical AM modulation)
    this.treble.connect(this.vibratoGain);
    
    // Sparkle
    this.vibratoGain.connect(this.sparkle);
    
    // REVERB BEFORE POWER AMP (like real DR)
    // Send to reverb
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    
    // Mix dry + wet BEFORE power amp
    this.sparkle.connect(this.reverbSum); // Dry
    this.reverbMix.connect(this.reverbSum); // Wet
    
    // Power section with sag
    this.reverbSum.connect(this.rectifierSag);
    if (this.powerSag) {
      this.rectifierSag.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.rectifierSag.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    
    // Cabinet routing with CabinetSimulator
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'vibrato';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.preampSaturation.disconnect();
      this.normalVolume.disconnect();
      this.vibratoVolume.disconnect();
      this.vibratoBright.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.vibratoGain.disconnect();
      this.sparkle.disconnect();
      this.reverbDwell.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.reverbSum.disconnect();
      this.rectifierSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
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
    // Blackface preamp - clean, subtle shimmer
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.1); // Very clean
      y += 0.04 * Math.tanh(x * 6); // Subtle sparkle
      if (Math.abs(y) > 0.55) y *= 0.96; // Gentle compression
      if (x > 0) y *= 1.03; // Soft asymmetry
      curve[i] = y * 0.98;
    }
    return curve;
  }
  
  make6V6Curve() {
    // Blackface power tubes - clean with sweet harmonics
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.35);
      if (Math.abs(y) > 0.62) {
        y = Math.sign(x) * (0.62 + (Math.abs(y) - 0.62) * 0.35);
      }
      y += 0.06 * Math.tanh(x * 3.5); // Subtle punch
      y += 0.04 * Math.sin(x * Math.PI * 5); // Sweet harmonics
      if (x > 0) y *= 1.06;
      curve[i] = y * 0.94;
    }
    return curve;
  }
  
  // ============================================
  // CABINET SIMULATOR
  // ============================================
  recreateCabinet() {
    // Cleanup old cabinet properly
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Disconnect preCabinet
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    if (this.cabinetEnabled) {
      // Create new cabinet with current settings
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        // Fallback if cabinet creation fails
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      // Bypass cabinet
      this.preCabinet.connect(this.postCabinet);
    }
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
      
      // ============================================
      // VIBRATO CHANNEL CONTROLS
      // ============================================
      case 'vibrato_volume':
      case 'volume':
      case 'gain': {
        const v = value / 100;
        this.vibratoVolume.gain.setTargetAtTime(v, now, 0.01);
        // Dynamic bright cap - more boost at lower volumes
        if (this._vBrightOn) {
          const brightDb = (1 - v) * 8; // Up to +8dB at low volume
          this.vibratoBright.gain.setTargetAtTime(brightDb, now, 0.03);
        }
        break;
      }
      
      case 'vibrato_bright':
      case 'bright': {
        this._vBrightOn = !!value;
        // Update bright cap based on current volume
        const v = (this.params.vibrato_volume || 50) / 100;
        const brightDb = this._vBrightOn ? ((1 - v) * 8) : 0;
        this.vibratoBright.gain.setTargetAtTime(brightDb, now, 0.03);
        break;
      }
      
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
      // TREMOLO (optical AM, not pitch vibrato)
      // ============================================
      case 'vibrato_speed':
        // 1.5 Hz to 10 Hz (typical optical tremolo range)
        this.vibratoLFO.frequency.setTargetAtTime(1.5 + (value / 100) * 8.5, now, 0.02);
        break;
      
      case 'vibrato_intensity':
      case 'vibrato_depth':
        // AM tremolo depth - optical vibra more in mids/lows, depth up to ~40-50%
        this.vibratoDepthControl.gain.setTargetAtTime((value / 100) * 0.5, now, 0.02);
        break;
      
      // ============================================
      // MASTER
      // ============================================
      case 'master': {
        // Logarithmic taper for better control at low volumes
        const linLog = (v) => 0.001 * Math.pow(1000, v);
        this.master.gain.setTargetAtTime(linLog(value / 100), now, 0.01);
        break;
      }
      
      // ============================================
      // CABINET
      // ============================================
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
        this.micPosition = value;
        this.recreateCabinet();
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
    this.vibratoVolume.disconnect();
    this.vibratoBright.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.vibratoLFO.disconnect();
    this.vibratoDepthControl.disconnect();
    this.vibratoGain.disconnect();
    this.sparkle.disconnect();
    this.reverbDwell.disconnect();
    this.spring1.disconnect();
    this.spring2.disconnect();
    this.spring3.disconnect();
    this.reverbFilter.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbMix.disconnect();
    this.reverbSum.disconnect();
    this.rectifierSag.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.postHPF.disconnect();
    this.postLPF.disconnect();
    this.master.disconnect();
  }
}

export default FenderDeluxeReverbAmp;

