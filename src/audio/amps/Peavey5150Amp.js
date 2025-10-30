import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class Peavey5150Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Peavey 5150', 'peavey_5150');
    
    // PEAVEY 5150 (6505)
    // THE metal amp - Eddie Van Halen signature
    // Enhanced with realistic modeling improvements
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (before first gain stage)
    // ============================================
    // Production-grade gate for ultra-tight metal playing
    this.noiseGate = this.createNoiseGate({
      thOpen: -48,      // Open threshold
      thClose: -56,     // Close threshold (TRUE HYSTERESIS)
      attack: 0.0005,   // 0.5ms attack (ultra-fast for palm mutes)
      release: 0.10,    // 100ms release (fast for metal riffs)
      rms: 0.012,       // 12ms RMS window
      peakMix: 0.40,    // 40% peak, 60% RMS (responsive to transients)
      floorDb: -70,     // Musical floor
      holdMs: 6         // 6ms hold (prevents chattering on fast playing)
    });
    this.gateEnabled = true;
    
    // ============================================
    // FRONT PANEL - RHYTHM CHANNEL
    // ============================================
    this.rhythmPreGain = audioContext.createGain();
    this.rhythmPostGain = audioContext.createGain();
    
    // ============================================
    // FRONT PANEL - LEAD CHANNEL
    // ============================================
    this.leadPreGain = audioContext.createGain();
    this.leadPostGain = audioContext.createGain();
    
    // ============================================
    // SHARED TONE STACK (authentic 5150 behavior)
    // ============================================
    // In real 5150/6505, EQ is shared between channels
    this.sharedLow = audioContext.createBiquadFilter();
    this.sharedMid = audioContext.createBiquadFilter();
    this.sharedHigh = audioContext.createBiquadFilter();
    
    // ============================================
    // 5 GAIN STAGES with HPF between stages
    // ============================================
    this.gain1 = audioContext.createWaveShaper();
    this.gain2 = audioContext.createWaveShaper();
    this.gain3 = audioContext.createWaveShaper();
    this.gain4 = audioContext.createWaveShaper();
    this.gain5 = audioContext.createWaveShaper();
    
    // High-pass filters between stages for tight bass control
    this.hpf1 = audioContext.createBiquadFilter();
    this.hpf2 = audioContext.createBiquadFilter();
    this.hpf3 = audioContext.createBiquadFilter();
    this.hpf4 = audioContext.createBiquadFilter();
    
    this.hpf1.type = 'highpass';
    this.hpf2.type = 'highpass';
    this.hpf3.type = 'highpass';
    this.hpf4.type = 'highpass';
    
    this.hpf1.frequency.value = 30;
    this.hpf2.frequency.value = 40;
    this.hpf3.frequency.value = 50;
    this.hpf4.frequency.value = 60;
    
    // Each stage has unique asymmetry and saturation characteristics
    this.gain1.curve = this.makeGainStageCurve(1, 8.0, 0.02);   // Stage 1: moderate gain, slight asymmetry
    this.gain2.curve = this.makeGainStageCurve(2, 10.0, 0.05);  // Stage 2: more gain, more asymmetry
    this.gain3.curve = this.makeGainStageCurve(3, 12.0, 0.08);  // Stage 3: high gain, significant asymmetry
    this.gain4.curve = this.makeGainStageCurve(4, 14.0, 0.10);  // Stage 4: very high gain
    this.gain5.curve = this.makeGainStageCurve(5, 15.0, 0.12);  // Stage 5: maximum gain and asymmetry
    
    this.gain1.oversample = '4x';
    this.gain2.oversample = '4x';
    this.gain3.oversample = '4x';
    this.gain4.oversample = '4x';
    this.gain5.oversample = '4x';
    
    // ============================================
    // DC CLEANUP (removes DC offset from asymmetric clipping)
    // ============================================
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.7071; // Butterworth response
    
    // GLOBAL CONTROLS
    this.master = audioContext.createGain();
    
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET
    // ============================================
    // Silicon rectifier (5150 uses solid-state rectifier)
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.10,      // 10% sag (moderate for high-gain metal)
      att: 0.005,       // 5ms attack
      relFast: 0.05,    // 50ms fast recovery
      relSlow: 0.18,    // 180ms slow recovery
      rmsMs: 12.0,      // 12ms RMS window
      shape: 1.2,       // Slightly progressive
      floor: 0.28,      // 28% minimum headroom
      peakMix: 0.32     // Balanced peak/RMS
    });
    
    // Dynamic bass shelving (loosens under load)
    this.dynamicBassShelf = audioContext.createBiquadFilter();
    this.dynamicBassShelf.type = 'lowshelf';
    this.dynamicBassShelf.frequency.value = 120;
    this.dynamicBassShelf.gain.value = 0; // Adjusted dynamically
    
    // POWER AMP (6L6 x 4 tubes)
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_sheffield'; // Peavey 5150 standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // RESONANCE & PRESENCE (after power amp)
    // ============================================
    this.resonance = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    // ============================================
    // BACK PANEL CONTROLS
    // ============================================
    
    // CRUNCH SWITCH (Rhythm channel boost)
    this.crunchBoost = audioContext.createGain();
    this.crunchEnabled = false;
    
    // BRIGHT SWITCH (dynamic, volume-dependent)
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highpass';
    this.brightFilter.frequency.value = 1500;
    this.brightFilter.Q.value = 0.707;
    this.brightGain = audioContext.createGain();
    this.brightMix = audioContext.createGain();
    this.brightEnabled = false;
    
    // EFFECTS LOOP (Series)
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxBypass = audioContext.createGain();
    this.fxMix = audioContext.createGain();
    
    // SPEAKER IMPEDANCE (4/8/16 ohm) - now with realistic modeling
    this.speakerImpedance = 16; // ohms
    this.impedanceGain = audioContext.createGain();
    this.impedanceShelf = audioContext.createBiquadFilter();
    this.impedanceShelf.type = 'lowshelf';
    this.impedanceShelf.frequency.value = 150;
    this.impedanceCompressor = audioContext.createDynamicsCompressor();
    
    // Active channel
    this.activeChannel = 'lead'; // 'rhythm' or 'lead'
    
    // ============================================
    // RHYTHM CHANNEL SATURATION
    // ============================================
    this.rhythmSaturation = audioContext.createWaveShaper();
    this.rhythmSaturation.curve = this.makeRhythmCurve();
    this.rhythmSaturation.oversample = '4x';
    
    // ============================================
    // ROUTING - LEAD CHANNEL (DEFAULT)
    // ============================================
    this.setupLeadChannel();
    this.recreateCabinet();
    
    this.params = {
      channel: 1, // 0=rhythm, 1=lead
      
      // Lead channel
      lead_pre_gain: 80,
      lead_post_gain: 70,
      
      // Shared EQ (authentic 5150)
      low: 75,
      mid: 40, // Scooped
      high: 70,
      
      // Rhythm channel
      rhythm_pre_gain: 50,
      rhythm_post_gain: 50,
      
      // Global
      resonance: 60,
      presence: 65,
      master: 50,
      
      // Back panel
      crunch: false,
      bright: false,
      gate: true,
      fx_loop: false,
      speaker_impedance: 16 // 4, 8, or 16 ohms
    };
    
    this.applyInitialSettings();
  }
  
  setupLeadChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // SIGNAL FLOW - LEAD CHANNEL
    // ============================================
    // Input -> Noise Gate (optional)
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.leadPreGain);
    } else {
      this.input.connect(this.leadPreGain);
    }
    
    // Bright switch - parallel high-pass path (dynamic)
    if (this.brightEnabled) {
      // Main path
      this.leadPreGain.connect(this.brightMix);
      // Bright path
      this.leadPreGain.connect(this.brightFilter);
      this.brightFilter.connect(this.brightGain);
      this.brightGain.connect(this.brightMix);
      // Continue from brightMix
      this.brightMix.connect(this.gain1);
    } else {
      this.leadPreGain.connect(this.gain1);
    }
    
    // 5 cascading gain stages with HPF between stages
    this.gain1.connect(this.hpf1);
    this.hpf1.connect(this.gain2);
    this.gain2.connect(this.hpf2);
    this.hpf2.connect(this.gain3);
    this.gain3.connect(this.hpf3);
    this.hpf3.connect(this.gain4);
    this.gain4.connect(this.hpf4);
    this.hpf4.connect(this.gain5);
    
    // DC Blocker after last gain stage
    this.gain5.connect(this.dcBlocker);
    
    // SHARED EQ (authentic 5150 behavior)
    this.dcBlocker.connect(this.sharedLow);
    this.sharedLow.connect(this.sharedMid);
    this.sharedMid.connect(this.sharedHigh);
    
    // Post gain
    this.sharedHigh.connect(this.leadPostGain);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.leadPostGain.connect(this.fxSend);
      this.fxReturn.connect(this.master);
    } else {
      this.leadPostGain.connect(this.master);
    }
    
    // Power supply sag/compression
    this.master.connect(this.powerSag);
    
    // Dynamic bass shelf (loosens under load)
    this.powerSag.connect(this.dynamicBassShelf);
    
    // Power amp
    this.dynamicBassShelf.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // CABINET ROUTING
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.resonance);
    
    // RESONANCE & PRESENCE after cabinet
    this.resonance.connect(this.presence);
    
    // Speaker impedance modeling
    this.presence.connect(this.impedanceShelf);
    this.impedanceShelf.connect(this.impedanceCompressor);
    this.impedanceCompressor.connect(this.impedanceGain);
    this.impedanceGain.connect(this.output);
    
    this.activeChannel = 'lead';
  }
  
  setupRhythmChannel() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // SIGNAL FLOW - RHYTHM CHANNEL
    // ============================================
    // Input -> Noise Gate (optional)
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.rhythmPreGain);
    } else {
      this.input.connect(this.rhythmPreGain);
    }
    
    // Bright switch - parallel high-pass path (dynamic)
    let nextNode;
    if (this.brightEnabled) {
      // Main path
      this.rhythmPreGain.connect(this.brightMix);
      // Bright path
      this.rhythmPreGain.connect(this.brightFilter);
      this.brightFilter.connect(this.brightGain);
      this.brightGain.connect(this.brightMix);
      nextNode = this.brightMix;
    } else {
      nextNode = this.rhythmPreGain;
    }
    
    // Crunch switch adds extra gain stage
    if (this.crunchEnabled) {
      nextNode.connect(this.crunchBoost);
      this.crunchBoost.connect(this.gain1);
    } else {
      nextNode.connect(this.gain1);
    }
    
    // Rhythm: fewer gain stages for more clean headroom
    this.gain1.connect(this.hpf1);
    this.hpf1.connect(this.gain2);
    this.gain2.connect(this.rhythmSaturation);
    
    // DC Blocker
    this.rhythmSaturation.connect(this.dcBlocker);
    
    // SHARED EQ (authentic 5150 behavior)
    this.dcBlocker.connect(this.sharedLow);
    this.sharedLow.connect(this.sharedMid);
    this.sharedMid.connect(this.sharedHigh);
    
    // Post gain
    this.sharedHigh.connect(this.rhythmPostGain);
    
    // Effects Loop routing
    if (this.params.fx_loop) {
      this.rhythmPostGain.connect(this.fxSend);
      this.fxReturn.connect(this.master);
    } else {
      this.rhythmPostGain.connect(this.master);
    }
    
    // Power supply sag/compression
    this.master.connect(this.powerSag);
    
    // Dynamic bass shelf (loosens under load)
    this.powerSag.connect(this.dynamicBassShelf);
    
    // Power amp
    this.dynamicBassShelf.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // CABINET ROUTING
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.resonance);
    
    // RESONANCE & PRESENCE after cabinet
    this.resonance.connect(this.presence);
    
    // Speaker impedance modeling
    this.presence.connect(this.impedanceShelf);
    this.impedanceShelf.connect(this.impedanceCompressor);
    this.impedanceCompressor.connect(this.impedanceGain);
    this.impedanceGain.connect(this.output);
    
    this.activeChannel = 'rhythm';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.brightFilter.disconnect();
      this.brightGain.disconnect();
      this.brightMix.disconnect();
      this.leadPreGain.disconnect();
      this.rhythmPreGain.disconnect();
      this.crunchBoost.disconnect();
      this.gain1.disconnect();
      this.gain2.disconnect();
      this.gain3.disconnect();
      this.gain4.disconnect();
      this.gain5.disconnect();
      this.hpf1.disconnect();
      this.hpf2.disconnect();
      this.hpf3.disconnect();
      this.hpf4.disconnect();
      this.dcBlocker.disconnect();
      this.rhythmSaturation.disconnect();
      this.sharedLow.disconnect();
      this.sharedMid.disconnect();
      this.sharedHigh.disconnect();
      this.leadPostGain.disconnect();
      this.rhythmPostGain.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.master.disconnect();
      this.powerSag.disconnect();
      this.dynamicBassShelf.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.cabDCBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.resonance.disconnect();
      this.presence.disconnect();
      this.impedanceShelf.disconnect();
      this.impedanceCompressor.disconnect();
      this.impedanceGain.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // LEAD CHANNEL - EXTREME GAIN
    // ============================================
    this.leadPreGain.gain.value = 20;
    this.leadPostGain.gain.value = 1.5;
    
    // ============================================
    // RHYTHM CHANNEL - MORE CLEAN HEADROOM
    // ============================================
    this.rhythmPreGain.gain.value = 5;
    this.rhythmPostGain.gain.value = 1.0;
    
    // ============================================
    // SHARED TONE STACK (authentic 5150 behavior)
    // ============================================
    // V-SHAPE EQ (scooped mids, boosted bass and treble)
    this.sharedLow.type = 'lowshelf';
    this.sharedLow.frequency.value = 150;
    this.sharedLow.gain.value = 8;
    
    this.sharedMid.type = 'peaking';
    this.sharedMid.frequency.value = 750;
    this.sharedMid.Q.value = 2;
    this.sharedMid.gain.value = -5; // Mid scoop
    
    this.sharedHigh.type = 'highshelf';
    this.sharedHigh.frequency.value = 3000;
    this.sharedHigh.gain.value = 6;
    
    // ============================================
    // CRUNCH BOOST (Rhythm channel only)
    // ============================================
    this.crunchBoost.gain.value = 2.5;
    
    // ============================================
    // BRIGHT SWITCH (dynamic, volume-dependent)
    // ============================================
    this.brightGain.gain.value = 0; // Adjusted dynamically
    this.brightMix.gain.value = 1.0;
    
    // ============================================
    // RESONANCE & PRESENCE (after power amp)
    // ============================================
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 100;
    this.resonance.gain.value = 3;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4000;
    this.presence.gain.value = 4;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master.gain.value = 0.5;
    
    // ============================================
    // POWER AMP (4x 6L6 tubes)
    // ============================================
    this.powerAmp.gain.value = 1.0;
    
    // ============================================
    // SPEAKER IMPEDANCE
    // ============================================
    this.updateImpedance(16);
  }
  
  makeGainStageCurve(stage = 1, gainFactor = 12, asymmetry = 0.05) {
    // Each gain stage has unique saturation characteristics
    // stage: which preamp stage (1-5)
    // gainFactor: tanh multiplier for gain amount
    // asymmetry: offset for asymmetric clipping (cathode follower behavior)
    
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      let x = (i * 2) / samples - 1;
      
      // Add DC offset for asymmetric clipping (cathode follower)
      x += asymmetry;
      
      // Different knee characteristics per stage
      let knee = 1.0 + (stage * 0.05); // Progressively harder knee
      
      // Tanh saturation with varying gain per stage
      let y = Math.tanh(x * gainFactor * knee);
      
      // Remove DC offset to center output
      y -= Math.tanh(asymmetry * gainFactor * knee);
      
      curve[i] = y;
    }
    
    return curve;
  }
  
  makeRhythmCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // RHYTHM CHANNEL - cleaner, more open
      let y = Math.tanh(x * 6); // Less gain than lead
      
      // Flatter frequency response (less mid scoop)
      if (Math.abs(x) > 0.3 && Math.abs(x) < 0.6) {
        y *= 0.95; // Mild scoop
      }
      
      // Slight asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 6L6 power tubes - tight & aggressive
      let y = Math.tanh(x * 1.8);
      
      // Mid scoop
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.5) {
        y *= 0.85;
      }
      
      // Asymmetry
      if (x > 0) y *= 1.25;
      
      // High harmonics
      y += 0.1 * Math.tanh(x * 24);
      
      curve[i] = y * 0.7;
    }
    return curve;
  }
  
  updateImpedance(ohms) {
    // Speaker impedance affects damping and frequency response
    // Lower impedance = more damping, tighter bass, slight cut in sub/low frequencies
    // Higher impedance = less damping, looser bass, more overshoot
    
    this.speakerImpedance = ohms;
    
    switch (ohms) {
      case 4:
        // 4 ohm: tight, controlled, more damping
        this.impedanceGain.gain.value = 1.15; // Slightly louder
        this.impedanceShelf.gain.value = -1.5; // Cut low-end (more damping)
        this.impedanceShelf.Q.value = 0.5;
        this.impedanceCompressor.threshold.value = -25;
        this.impedanceCompressor.ratio.value = 2.5;
        this.impedanceCompressor.knee.value = 6;
        this.impedanceCompressor.attack.value = 0.003;
        this.impedanceCompressor.release.value = 0.050;
        break;
        
      case 8:
        // 8 ohm: neutral, balanced response
        this.impedanceGain.gain.value = 1.0;
        this.impedanceShelf.gain.value = 0; // Flat response
        this.impedanceShelf.Q.value = 0.707;
        this.impedanceCompressor.threshold.value = -30;
        this.impedanceCompressor.ratio.value = 2.0;
        this.impedanceCompressor.knee.value = 10;
        this.impedanceCompressor.attack.value = 0.005;
        this.impedanceCompressor.release.value = 0.100;
        break;
        
      case 16:
        // 16 ohm: looser, less damping, more overshoot/bloom
        this.impedanceGain.gain.value = 0.9; // Slightly quieter
        this.impedanceShelf.gain.value = 1.0; // Boost low-end (less damping)
        this.impedanceShelf.Q.value = 0.9;
        this.impedanceCompressor.threshold.value = -35;
        this.impedanceCompressor.ratio.value = 1.5;
        this.impedanceCompressor.knee.value = 15;
        this.impedanceCompressor.attack.value = 0.008;
        this.impedanceCompressor.release.value = 0.150;
        break;
    }
  }
  
  recreateCabinet() {
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
    try { this.preCabinet.disconnect(); } catch (e) {}
    
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
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
          this.setupRhythmChannel();
        } else {
          this.setupLeadChannel();
        }
        break;
      
      // ============================================
      // LEAD CHANNEL CONTROLS
      // ============================================
      case 'lead_pre_gain':
      case 'gain':
        {
          const gainValue = 1 + (value / 5);
          this.leadPreGain.gain.setTargetAtTime(gainValue, now, 0.01);
          
          // Dynamic bright switch: stronger at low gain, weaker at high gain
          if (this.brightEnabled) {
            // Bright effect decreases as gain increases (authentic amp behavior)
            const brightAmount = Math.max(0, 1.0 - (value / 150));
            this.brightGain.gain.setTargetAtTime(brightAmount * 0.3, now, 0.01);
          }
        }
        break;
        
      case 'lead_post_gain':
        this.leadPostGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // RHYTHM CHANNEL CONTROLS
      // ============================================
      case 'rhythm_pre_gain':
        {
          const gainValue = 1 + (value / 10);
          this.rhythmPreGain.gain.setTargetAtTime(gainValue, now, 0.01);
          
          // Dynamic bright switch for rhythm channel
          if (this.brightEnabled) {
            const brightAmount = Math.max(0, 1.0 - (value / 150));
            this.brightGain.gain.setTargetAtTime(brightAmount * 0.3, now, 0.01);
          }
        }
        break;
        
      case 'rhythm_post_gain':
        this.rhythmPostGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // ============================================
      // SHARED EQ (authentic 5150 behavior)
      // ============================================
      case 'low':
      case 'bass':
      case 'lead_low':
      case 'rhythm_low':
        this.sharedLow.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
        
      case 'mid':
      case 'lead_mid':
      case 'rhythm_mid':
        this.sharedMid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
        
      case 'high':
      case 'treble':
      case 'lead_high':
      case 'rhythm_high':
        this.sharedHigh.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      // ============================================
      // GLOBAL CONTROLS
      // ============================================
      case 'resonance':
        {
          // Resonance intensity tied to master volume (more realistic)
          const masterLevel = this.params.master || 50;
          const levelMultiplier = 0.5 + (masterLevel / 100);
          const resonanceAmount = ((value - 50) / 10) * levelMultiplier;
          this.resonance.gain.setTargetAtTime(resonanceAmount, now, 0.01);
        }
        break;
        
      case 'presence':
        {
          // Presence intensity tied to master volume (more realistic)
          const masterLevel = this.params.master || 50;
          const levelMultiplier = 0.5 + (masterLevel / 100);
          const presenceAmount = ((value - 50) / 10) * levelMultiplier;
          this.presence.gain.setTargetAtTime(presenceAmount, now, 0.01);
        }
        break;
        
      case 'master':
        {
          this.master.gain.setTargetAtTime(value / 100, now, 0.01);
          
          // Update dynamic bass shelf based on master level
          // Higher master = more "sag" = looser bass
          const sagAmount = -2 * (value / 100); // Up to -2dB cut at full master
          this.dynamicBassShelf.gain.setTargetAtTime(sagAmount, now, 0.01);
          
          // Re-trigger resonance/presence updates if they exist
          if (this.params.resonance !== undefined) {
            this.updateParameter('resonance', this.params.resonance);
          }
          if (this.params.presence !== undefined) {
            this.updateParameter('presence', this.params.presence);
          }
        }
        break;
      
      // ============================================
      // BACK PANEL CONTROLS
      // ============================================
      case 'gate':
        this.gateEnabled = value;
        // Re-route current channel to enable/disable gate
        if (this.activeChannel === 'lead') {
          this.setupLeadChannel();
        } else {
          this.setupRhythmChannel();
        }
        break;
        
      case 'crunch':
        this.crunchEnabled = value;
        if (this.activeChannel === 'rhythm') {
          this.setupRhythmChannel(); // Re-route
        }
        break;
      
      case 'bright':
        this.brightEnabled = value;
        // Re-route to enable/disable bright path
        if (this.activeChannel === 'lead') {
          this.setupLeadChannel();
          // Trigger pre_gain update to set correct bright amount
          if (this.params.lead_pre_gain !== undefined) {
            this.updateParameter('lead_pre_gain', this.params.lead_pre_gain);
          }
        } else {
          this.setupRhythmChannel();
          if (this.params.rhythm_pre_gain !== undefined) {
            this.updateParameter('rhythm_pre_gain', this.params.rhythm_pre_gain);
          }
        }
        break;
      
      case 'fx_loop':
        this.params.fx_loop = value;
        // Re-route current channel
        if (this.activeChannel === 'lead') {
          this.setupLeadChannel();
        } else {
          this.setupRhythmChannel();
        }
        break;
      
      case 'speaker_impedance':
        this.updateImpedance(value);
        break;
      
      // ============================================
      // CABINET CONTROL
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
    this.noiseGate.disconnect();
    this.leadPreGain.disconnect();
    this.rhythmPreGain.disconnect();
    this.leadPostGain.disconnect();
    this.rhythmPostGain.disconnect();
    this.brightFilter.disconnect();
    this.brightGain.disconnect();
    this.brightMix.disconnect();
    this.gain1.disconnect();
    this.gain2.disconnect();
    this.gain3.disconnect();
    this.gain4.disconnect();
    this.gain5.disconnect();
    this.hpf1.disconnect();
    this.hpf2.disconnect();
    this.hpf3.disconnect();
    this.hpf4.disconnect();
    this.dcBlocker.disconnect();
    this.rhythmSaturation.disconnect();
    this.sharedLow.disconnect();
    this.sharedMid.disconnect();
    this.sharedHigh.disconnect();
    this.resonance.disconnect();
    this.presence.disconnect();
    this.master.disconnect();
    this.powerSag.disconnect();
    this.dynamicBassShelf.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.cabDCBlock.disconnect();
    this.preCabinet.disconnect();
    this.postCabinet.disconnect();
    if (this.cabinet && this.cabinet.input) {
      this.cabinet.input.disconnect();
    }
    if (this.cabinet && this.cabinet.output) {
      this.cabinet.output.disconnect();
    }
    this.impedanceShelf.disconnect();
    this.impedanceCompressor.disconnect();
    this.impedanceGain.disconnect();
  }
}

export default Peavey5150Amp;

