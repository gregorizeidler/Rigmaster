import BaseAmp from './BaseAmp.js';

class VoxAC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox AC30', 'vox_ac30');
    
    // VOX AC30 (Top Boost)
    // THE British chime - The Beatles, Brian May, The Edge
    
    // ============================================
    // FRONT PANEL - NORMAL CHANNEL
    // ============================================
    this.normalVolume = audioContext.createGain();
    this.normalBrilliance = audioContext.createBiquadFilter();
    this.normalBrilliance.type = 'highshelf';
    this.normalBrilliance.frequency.value = 3000;
    this.normalBrilliance.gain.value = 0; // Off by default
    
    // ============================================
    // FRONT PANEL - TOP BOOST CHANNEL
    // ============================================
    this.topBoostVolume = audioContext.createGain();
    this.topBoostTreble = audioContext.createBiquadFilter();
    this.topBoostBass = audioContext.createBiquadFilter();
    
    // Active channel
    this.activeChannel = 'topboost'; // 'normal' or 'topboost'
    
    // ============================================
    // BACK PANEL - PENTODE/TRIODE SWITCH
    // ============================================
    this.pentodeMode = true; // true = 30W pentode, false = 15W triode
    
    // ============================================
    // PREAMP (EF86 Pentode)
    // ============================================
    this.preamp = audioContext.createGain();
    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.curve = this.makeEF86Curve();
    this.preampSaturation.oversample = '4x';
    
    // ============================================
    // CLASS A COMPRESSION
    // ============================================
    this.classACompressor = audioContext.createDynamicsCompressor();
    this.classACompressor.threshold.value = -20;
    this.classACompressor.knee.value = 20; // Soft knee
    this.classACompressor.ratio.value = 3;
    this.classACompressor.attack.value = 0.003;
    this.classACompressor.release.value = 0.15;
    
    // ============================================
    // TONE STACK (Cathode follower)
    // ============================================
    this.midHonk = audioContext.createBiquadFilter();
    this.midHonk.type = 'peaking';
    this.midHonk.frequency.value = 1000; // 1kHz honk
    this.midHonk.Q.value = 3;
    this.midHonk.gain.value = 6;
    
    // ============================================
    // CUT CONTROL (high-frequency cut)
    // ============================================
    this.cutControl = audioContext.createBiquadFilter();
    this.cutControl.type = 'lowpass';
    this.cutControl.frequency.value = 8000;
    this.cutControl.Q.value = 0.707;
    
    // ============================================
    // POWER AMP (4x EL84 Class A)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeEL84Curve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // CHIME (2-4kHz peak - THE Vox sound)
    // ============================================
    this.chime = audioContext.createBiquadFilter();
    this.chime.type = 'peaking';
    this.chime.frequency.value = 3000;
    this.chime.Q.value = 2;
    this.chime.gain.value = 4;
    
    // ============================================
    // TREMOLO (built-in)
    // ============================================
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloLFO.frequency.value = 4;
    
    this.tremoloDepth = audioContext.createGain();
    this.tremoloDepth.gain.value = 0;
    
    this.tremoloGain = audioContext.createGain();
    
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    this.tremoloLFO.start();
    
    // ============================================
    // VIBRATO (pitch modulation via delay)
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 6;
    
    this.vibratoDelay = audioContext.createDelay(0.02);
    this.vibratoDelay.delayTime.value = 0.005; // 5ms base delay
    
    this.vibratoDepth = audioContext.createGain();
    this.vibratoDepth.gain.value = 0;
    
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoDelay.delayTime);
    this.vibratoLFO.start();
    
    // ============================================
    // SPRING REVERB (built-in)
    // ============================================
    this.reverbDelay1 = audioContext.createDelay(0.5);
    this.reverbDelay2 = audioContext.createDelay(0.5);
    this.reverbDelay3 = audioContext.createDelay(0.5);
    
    this.reverbDelay1.delayTime.value = 0.027;
    this.reverbDelay2.delayTime.value = 0.031;
    this.reverbDelay3.delayTime.value = 0.037;
    
    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 4000;
    
    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0;
    
    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 0;
    
    // Spring reverb routing (parallel delays)
    this.reverbDelay1.connect(this.reverbFilter);
    this.reverbDelay2.connect(this.reverbFilter);
    this.reverbDelay3.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbDelay1);
    this.reverbFeedback.connect(this.reverbDelay2);
    this.reverbFeedback.connect(this.reverbDelay3);
    this.reverbFilter.connect(this.reverbMix);
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume = audioContext.createGain();
    
    // ============================================
    // ROUTING - TOP BOOST CHANNEL (DEFAULT)
    // ============================================
    this.setupTopBoostChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=topboost
      
      // Normal channel
      normal_volume: 50,
      brilliance: false,
      
      // Top Boost channel
      topboost_volume: 60,
      treble: 60,
      bass: 50,
      
      // Global controls
      cut: 50,
      master: 70,
      
      // Effects
      tremolo_speed: 40,
      tremolo_depth: 0,
      vibrato_speed: 50,
      vibrato_depth: 0,
      reverb: 0,
      
      // Back panel
      pentode_triode: true // true=30W pentode, false=15W triode
    };
    
    this.applyInitialSettings();
  }
  
  setupTopBoostChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // TOP BOOST CHANNEL - Full tone stack control
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.classACompressor);
    
    // Top Boost controls
    this.classACompressor.connect(this.topBoostVolume);
    this.topBoostVolume.connect(this.topBoostBass);
    this.topBoostBass.connect(this.topBoostTreble);
    this.topBoostTreble.connect(this.midHonk);
    
    // Global tone
    this.midHonk.connect(this.cutControl);
    this.cutControl.connect(this.vibratoDelay); // Vibrato before power amp
    
    // Reverb send
    this.vibratoDelay.connect(this.reverbDelay1);
    this.vibratoDelay.connect(this.reverbDelay2);
    this.vibratoDelay.connect(this.reverbDelay3);
    
    // Power amp
    this.vibratoDelay.connect(this.powerAmp); // Dry signal
    this.reverbMix.connect(this.powerAmp); // Wet signal
    
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.chime);
    this.chime.connect(this.tremoloGain);
    this.tremoloGain.connect(this.masterVolume);
    this.masterVolume.connect(this.output);
    
    this.activeChannel = 'topboost';
  }
  
  setupNormalChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // NORMAL CHANNEL - Simple gain + brilliance switch
    this.input.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.classACompressor);
    
    // Normal channel controls
    this.classACompressor.connect(this.normalVolume);
    this.normalVolume.connect(this.normalBrilliance); // Brilliance switch
    this.normalBrilliance.connect(this.midHonk);
    
    // Global tone
    this.midHonk.connect(this.cutControl);
    this.cutControl.connect(this.vibratoDelay); // Vibrato before power amp
    
    // Reverb send
    this.vibratoDelay.connect(this.reverbDelay1);
    this.vibratoDelay.connect(this.reverbDelay2);
    this.vibratoDelay.connect(this.reverbDelay3);
    
    // Power amp
    this.vibratoDelay.connect(this.powerAmp); // Dry signal
    this.reverbMix.connect(this.powerAmp); // Wet signal
    
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.chime);
    this.chime.connect(this.tremoloGain);
    this.tremoloGain.connect(this.masterVolume);
    this.masterVolume.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp.disconnect();
      this.preampSaturation.disconnect();
      this.classACompressor.disconnect();
      this.normalVolume.disconnect();
      this.normalBrilliance.disconnect();
      this.topBoostVolume.disconnect();
      this.topBoostBass.disconnect();
      this.topBoostTreble.disconnect();
      this.midHonk.disconnect();
      this.cutControl.disconnect();
      this.vibratoDelay.disconnect();
      this.reverbDelay1.disconnect();
      this.reverbDelay2.disconnect();
      this.reverbDelay3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.chime.disconnect();
      this.tremoloGain.disconnect();
      this.masterVolume.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (EF86 Pentode)
    // ============================================
    this.preamp.gain.value = 2.5;
    
    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume.gain.value = 0.5;
    
    // ============================================
    // TOP BOOST CHANNEL
    // ============================================
    this.topBoostVolume.gain.value = 1.2;
    
    this.topBoostTreble.type = 'highshelf';
    this.topBoostTreble.frequency.value = 2000;
    this.topBoostTreble.gain.value = 3;
    
    this.topBoostBass.type = 'lowshelf';
    this.topBoostBass.frequency.value = 200;
    this.topBoostBass.gain.value = 2;
    
    // ============================================
    // POWER AMP (4x EL84 Class A)
    // ============================================
    // Pentode mode = 30W, Triode mode = 15W
    this.setPentodeTriode(true);
    
    // ============================================
    // REVERB
    // ============================================
    this.reverbFeedback.gain.value = 0.4; // Moderate spring reverb tail
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume.gain.value = 0.7;
  }
  
  setPentodeTriode(isPentode) {
    // PENTODE MODE (30W): Full power, more headroom, tighter
    // TRIODE MODE (15W): Less power, more compression, warmer
    
    this.pentodeMode = isPentode;
    
    if (isPentode) {
      // 30W Pentode
      this.powerAmp.gain.value = 1.2;
      this.classACompressor.threshold.value = -20;
      this.classACompressor.ratio.value = 3;
    } else {
      // 15W Triode
      this.powerAmp.gain.value = 0.8;
      this.classACompressor.threshold.value = -25; // More compression
      this.classACompressor.ratio.value = 4;
    }
  }
  
  makeEF86Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EF86 pentode (gritty, high gain)
      let y = Math.tanh(x * 1.8);
      
      // Class A compression
      if (Math.abs(y) > 0.4) {
        const compression = 1 - (Math.abs(y) - 0.4) * 0.3;
        y *= compression;
      }
      
      // Mid honk
      y += 0.2 * Math.tanh(x * 3);
      
      curve[i] = y;
    }
    return curve;
  }
  
  makeEL84Curve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL84 tubes (chime)
      let y = Math.tanh(x * 1.5);
      
      // EL84 "chime" (2-4kHz peak)
      y += 0.12 * Math.sin(x * Math.PI * 5);
      
      // Harmonic richness (Class A)
      y += 0.15 * Math.sin(x * Math.PI * 2);
      
      // EL84 asymmetry
      if (x > 0) {
        y *= 1.12;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
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
          this.setupTopBoostChannel();
        }
        break;
      
      // ============================================
      // NORMAL CHANNEL CONTROLS
      // ============================================
      case 'normal_volume':
        this.normalVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'brilliance':
        // Brilliance switch adds high-end sparkle
        this.normalBrilliance.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      // ============================================
      // TOP BOOST CHANNEL CONTROLS
      // ============================================
      case 'topboost_volume':
      case 'volume':
      case 'gain':
        this.topBoostVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'treble':
        this.topBoostTreble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'bass':
        this.topBoostBass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'cut':
        // Cut control reduces high frequencies in power amp
        const cutFreq = 2000 + (value / 100) * 10000; // 2kHz to 12kHz
        this.cutControl.frequency.setTargetAtTime(cutFreq, now, 0.01);
        break;
      
      case 'master':
        this.masterVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // TREMOLO
      // ============================================
      case 'tremolo_speed':
        // 0.5 Hz to 10 Hz
        this.tremoloLFO.frequency.setTargetAtTime(0.5 + (value / 100) * 9.5, now, 0.01);
        break;
      
      case 'tremolo_depth':
        // 0 to 50% amplitude modulation
        this.tremoloDepth.gain.setTargetAtTime(value / 200, now, 0.01);
        break;
      
      // ============================================
      // VIBRATO
      // ============================================
      case 'vibrato_speed':
        // 1 Hz to 12 Hz
        this.vibratoLFO.frequency.setTargetAtTime(1 + (value / 100) * 11, now, 0.01);
        break;
      
      case 'vibrato_depth':
        // 0 to 10ms delay modulation (pitch modulation)
        this.vibratoDepth.gain.setTargetAtTime((value / 100) * 0.01, now, 0.01);
        break;
      
      // ============================================
      // REVERB
      // ============================================
      case 'reverb':
        // Spring reverb mix
        this.reverbMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // BACK PANEL
      // ============================================
      case 'pentode_triode':
        this.setPentodeTriode(value);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Stop oscillators
    try {
      this.tremoloLFO.stop();
      this.vibratoLFO.stop();
    } catch (e) {
      // Already stopped
    }
    
    // Disconnect all nodes
    this.preamp.disconnect();
    this.preampSaturation.disconnect();
    this.classACompressor.disconnect();
    this.normalVolume.disconnect();
    this.normalBrilliance.disconnect();
    this.topBoostVolume.disconnect();
    this.topBoostTreble.disconnect();
    this.topBoostBass.disconnect();
    this.midHonk.disconnect();
    this.cutControl.disconnect();
    this.vibratoDelay.disconnect();
    this.vibratoDepth.disconnect();
    this.vibratoLFO.disconnect();
    this.reverbDelay1.disconnect();
    this.reverbDelay2.disconnect();
    this.reverbDelay3.disconnect();
    this.reverbFilter.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbMix.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.chime.disconnect();
    this.tremoloLFO.disconnect();
    this.tremoloDepth.disconnect();
    this.tremoloGain.disconnect();
    this.masterVolume.disconnect();
  }
}

export default VoxAC30Amp;

