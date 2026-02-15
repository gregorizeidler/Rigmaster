import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class SuhrBadgerAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Suhr Badger', 'suhr_badger');
    
    // SUHR BADGER (Marshall-inspired boutique)
    // Designed by John Suhr (ex-Fender Custom Shop)
    // Used by session players, Pete Thorn
    // Known for: British crunch with modern clarity, Power Scaling
    
    // ============================================
    // 2 CHANNELS
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.gainChannel = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'gain'; // 'clean' or 'gain'
    
    // Channel crossfade (for smooth switching without pops)
    this.cleanChannelGain = audioContext.createGain();
    this.gainChannelGain = audioContext.createGain();
    this.cleanChannelGain.gain.value = 0.0; // Start with gain channel
    this.gainChannelGain.gain.value = 1.0;
    
    // ============================================
    // NOISE GATE (Gain Channel only)
    // ============================================
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -50;
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20;
    this.noiseGate.attack.value = 0.001;
    this.noiseGate.release.value = 0.08;
    
    // ============================================
    // PREAMP (3 cascading 12AX7 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages - different curves per stage for more articulation
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeSuhrPreampCurve({drive: 4.6, asym: 1.03});
    this.saturation2.curve = this.makeSuhrPreampCurve({drive: 5.2, asym: 1.06});
    this.saturation3.curve = this.makeSuhrPreampCurve({drive: 5.8, asym: 1.09});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // SUHR "CLARITY" SWITCH (HPF, always in chain)
    // ============================================
    this.clarityFilter = audioContext.createBiquadFilter();
    this.clarityFilter.type = 'highpass';
    this.clarityFilter.frequency.value = 60;
    this.clarityFilter.Q.value = 0.7;
    this.claritySwitch = false;
    
    // ============================================
    // TONE STACK (Marshall-style)
    // ============================================
    // Stack HPF (prevents boom with humbuckers)
    this.stackHPF = audioContext.createBiquadFilter();
    this.stackHPF.type = 'highpass';
    this.stackHPF.frequency.value = 70;
    this.stackHPF.Q.value = 0.707;
    
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 800;
    this.middle.Q.value = 1.3;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    // ============================================
    // SUHR "VARIAC" POWER SCALING
    // ============================================
    this.variacPower = audioContext.createGain();
    this.variacPower.gain.value = 1.0; // Full power
    
    // Variac tone loss (lowpass when power is reduced)
    this.variacToneLPF = audioContext.createBiquadFilter();
    this.variacToneLPF.type = 'lowpass';
    this.variacToneLPF.frequency.value = 18000;
    this.variacToneLPF.Q.value = 0.707;
    
    // ============================================
    // POWER AMP (2x EL34 or 2x 6L6)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // Suhr Badger uses EL34/KT88 tubes with tube rectifier
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.11,      // 11% sag (British-style)
      att: 0.007,       // 7ms attack
      relFast: 0.07,    // 70ms fast recovery
      relSlow: 0.23,    // 230ms slow recovery
      rmsMs: 20.0,      // 20ms RMS window
      shape: 1.5,       // Progressive (British EL34)
      floor: 0.28,      // 28% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Power compression (fallback if sag unavailable)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.006;
    this.powerComp.release.value = 0.1;
    
    // DC blocker
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_greenback';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // Presence control (post-cabinet, more realistic)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMETERS (define before setup!)
    // ============================================
    this.params = {
      channel: 1, // 0=clean, 1=gain
      
      // Gain/Volume
      gain: 65,
      channel_volume: 70,
      
      // Tone stack
      bass: 55,
      middle: 60,
      treble: 65,
      presence: 60,
      
      // Switches
      clarity: 0, // 0=off, 1=on
      variac: 100, // 0=low power, 100=full power
      cabinet: 1, // 0=off, 1=on
      
      // Master
      master: 70
    };
    
    // ============================================
    // ROUTING - SETUP BOTH CHANNELS (for crossfade)
    // ============================================
    this.setupBothChannels();
    this.applyInitialSettings();
    this.recreateCabinet();
  }
  
  setupBothChannels() {
    // Setup both channels simultaneously for crossfade switching (no pops!)
    this.disconnectAll();
    
    // ============================================
    // CLEAN CHANNEL PATH (2 gain stages)
    // ============================================
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.cleanChannelGain);
    
    // Clean preamp stages
    const cleanPreamp1 = this.audioContext.createGain();
    const cleanSat1 = this.audioContext.createWaveShaper();
    const cleanPreamp2 = this.audioContext.createGain();
    const cleanSat2 = this.audioContext.createWaveShaper();
    
    cleanSat1.curve = this.saturation1.curve;
    cleanSat1.oversample = '4x';
    cleanSat2.curve = this.saturation2.curve;
    cleanSat2.oversample = '4x';
    
    cleanPreamp1.gain.value = this.preamp1.gain.value;
    cleanPreamp2.gain.value = this.preamp2.gain.value;
    
    this.cleanChannelGain.connect(cleanPreamp1);
    cleanPreamp1.connect(cleanSat1);
    cleanSat1.connect(cleanPreamp2);
    cleanPreamp2.connect(cleanSat2);
    
    // Store for later updates
    this.cleanPreamp1 = cleanPreamp1;
    this.cleanPreamp2 = cleanPreamp2;
    
    // ============================================
    // GAIN CHANNEL PATH (3 gain stages + noise gate)
    // ============================================
    this.input.connect(this.gainChannel);
    this.gainChannel.connect(this.gainChannelGain);
    this.gainChannelGain.connect(this.noiseGate);
    
    // Gain preamp stages
    this.noiseGate.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // ============================================
    // MERGE BOTH CHANNELS
    // ============================================
    const channelMerge = this.audioContext.createGain();
    cleanSat2.connect(channelMerge);
    this.saturation3.connect(channelMerge);
    
    // ============================================
    // SHARED SIGNAL PATH (after channels merge)
    // ============================================
    // Clarity filter (always in chain, adjusted dynamically)
    channelMerge.connect(this.clarityFilter);
    
    // Tone stack with HPF
    this.clarityFilter.connect(this.stackHPF);
    this.stackHPF.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.channelVolume);
    
    // Variac power scaling
    this.channelVolume.connect(this.variacPower);
    if (this.powerSag) {
      this.variacPower.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.variacPower.connect(this.powerAmp);
    }
    
    // Power amp
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    
    // DC block + Cabinet
    this.powerComp.connect(this.dcBlock);
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.variacToneLPF);
    this.variacToneLPF.connect(this.presence);
    this.presence.connect(this.master);
    this.master.connect(this.output);
  }
  
  switchChannel(channelIndex) {
    // Smooth crossfade between channels (15-30ms)
    const now = this.audioContext.currentTime;
    const fadeTime = 0.020; // 20ms crossfade
    
    if (channelIndex === 0) {
      // Switch to CLEAN
      this.cleanChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.gainChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.activeChannel = 'clean';
    } else {
      // Switch to GAIN
      this.cleanChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.gainChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.activeChannel = 'gain';
    }
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.gainChannel.disconnect();
      this.cleanChannelGain.disconnect();
      this.gainChannelGain.disconnect();
      this.noiseGate.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      if (this.cleanPreamp1) this.cleanPreamp1.disconnect();
      if (this.cleanPreamp2) this.cleanPreamp2.disconnect();
      this.clarityFilter.disconnect();
      this.stackHPF.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.channelVolume.disconnect();
      this.variacPower.disconnect();
      this.variacToneLPF.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.presence.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    // Use logarithmic scaling for natural response
    const lin2log = v01 => 0.001 * Math.pow(1000, v01);
    
    // Initial gain staging
    this.preamp1.gain.value = 6;
    this.preamp2.gain.value = 2.0;
    this.preamp3.gain.value = 1.5;
    this.cleanChannel.gain.value = 0.7;
    this.gainChannel.gain.value = 1.0;
    
    // Apply initial volumes with log curve
    this.channelVolume.gain.value = lin2log(0.70);
    this.powerAmp.gain.value = 1.05;
    this.master.gain.value = lin2log(0.70);
  }
  
  makeSuhrPreampCurve({drive = 5, asym = 1.06} = {}) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SUHR "MODERN BRITISH" VOICING with variable drive
      let y = Math.tanh(x * drive);
      
      // MUSICAL COMPRESSION (smooth clipping)
      if (Math.abs(y) > 0.55) {
        const compression = 1 - (Math.abs(y) - 0.55) * 0.25;
        y *= compression;
      }
      
      // CLARITY (not muddy, high-order harmonics)
      y += 0.10 * Math.tanh(x * 9);
      
      // BRITISH CRUNCH (mid-order harmonics)
      y += 0.08 * Math.tanh(x * 6);
      
      // Asymmetry (different + and - excursions)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // EL34 POWER TUBES (British)
      let y = Math.tanh(x * 1.55);
      
      // EL34 COMPRESSION
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.52);
      }
      
      // PUNCH
      y += 0.08 * Math.tanh(x * 3);
      
      // EL34 AGGRESSION
      y += 0.09 * Math.tanh(x * 7);
      
      // WARMTH
      y += 0.05 * Math.sin(x * Math.PI * 4);
      
      // Asymmetry
      if (x > 0) y *= 1.1;
      
      curve[i] = y * 0.89;
    }
    return curve;
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
    
    // Logarithmic scaling helper (for natural volume/gain response)
    const lin2log = v01 => 0.001 * Math.pow(1000, v01);
    
    switch (parameter) {
      case 'channel':
        this.switchChannel(value);
        break;
      
      case 'gain': {
        // Logarithmic gain scaling with cascading stages
        const g = lin2log(value / 100) * 16; // Musical gain range
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.55), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.30), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.22), now, 0.01);
        
        // Update clean channel preamps too
        if (this.cleanPreamp1) {
          this.cleanPreamp1.gain.setTargetAtTime(Math.max(1, g * 0.35), now, 0.01);
          this.cleanPreamp2.gain.setTargetAtTime(Math.max(1, g * 0.20), now, 0.01);
        }
        break;
      }
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'clarity': {
        // Dynamic clarity adjustment (no re-routing, no pops!)
        const on = !!value;
        this.claritySwitch = on;
        const f = on ? 110 : 60; // Higher cut when engaged
        this.clarityFilter.frequency.setTargetAtTime(f, now, 0.02);
        this.clarityFilter.Q.setTargetAtTime(on ? 0.9 : 0.7, now, 0.02);
        break;
      }
      
      case 'variac': {
        // SUHR POWER SCALING (reduces B+ voltage)
        // Effects: lower volume, more compression/sag, slight treble loss
        const v = value / 100; // 0 = low power, 1 = full power
        
        // Power reduction (0.3 to 1.0 range)
        this.variacPower.gain.setTargetAtTime(0.3 + 0.7 * v, now, 0.02);
        
        // Increased compression at low power
        const threshold = -22 + v * 7; // -22dB to -15dB
        this.powerComp.threshold.setTargetAtTime(threshold, now, 0.05);
        
        // Treble loss at low power (brown sound)
        const lpFreq = 7000 + v * 11000; // 7kHz to 18kHz
        this.variacToneLPF.frequency.setTargetAtTime(lpFreq, now, 0.05);
        break;
      }
      
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
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
      
      case 'master':
        this.master.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.cleanChannel.disconnect();
    this.gainChannel.disconnect();
    this.cleanChannelGain.disconnect();
    this.gainChannelGain.disconnect();
    this.noiseGate.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    if (this.cleanPreamp1) this.cleanPreamp1.disconnect();
    if (this.cleanPreamp2) this.cleanPreamp2.disconnect();
    this.clarityFilter.disconnect();
    this.stackHPF.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.channelVolume.disconnect();
    this.variacPower.disconnect();
    this.variacToneLPF.disconnect();
    if (this.powerSag) this.powerSag.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.preCabinet.disconnect();
    this.postCabinet.disconnect();
    if (this.cabinet && this.cabinet.input) {
      this.cabinet.input.disconnect();
    }
    if (this.cabinet && this.cabinet.output) {
      this.cabinet.output.disconnect();
    }
    this.presence.disconnect();
    this.master.disconnect();
  }
}

export default SuhrBadgerAmp;

