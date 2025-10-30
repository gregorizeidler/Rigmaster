import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class DiezelVH4Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Diezel VH4', 'diezel_vh4');
    
    // DIEZEL VH4 (Peter Diezel's masterpiece)
    // THE studio standard for modern high-gain
    // Used by Dream Theater, Tool, Opeth, Gojira
    // 4 INDEPENDENT CHANNELS with unique voicing
    
    // ============================================
    // 4 CHANNELS (all independent)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean/Crunch
    this.channel2 = audioContext.createGain(); // Crunch/Lead
    this.channel3 = audioContext.createGain(); // Mega/Ultra
    this.channel4 = audioContext.createGain(); // Mega/Ultra
    
    // Active channel
    this.activeChannel = 3; // 1, 2, 3, 4
    
    // ============================================
    // CHANNEL STATE MEMORY (Recall per channel)
    // ============================================
    this.channelState = {
      1: { gain: 55, bass: 55, middle: 55, treble: 60, presence: 55, deep: 45, volume: 60 },
      2: { gain: 65, bass: 60, middle: 55, treble: 65, presence: 60, deep: 50, volume: 65 },
      3: { gain: 70, bass: 60, middle: 55, treble: 65, presence: 60, deep: 55, volume: 70 },
      4: { gain: 75, bass: 60, middle: 55, treble: 65, presence: 62, deep: 58, volume: 72 }
    };
    
    // ============================================
    // PREAMP (Cascading gain stages per channel)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    this.preamp5 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    this.saturation5 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeDiezelPreampCurve();
    this.saturation2.curve = this.makeDiezelPreampCurve();
    this.saturation3.curve = this.makeDiezelPreampCurve();
    this.saturation4.curve = this.makeDiezelPreampCurve();
    this.saturation5.curve = this.makeDiezelPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    this.saturation5.oversample = '4x';
    
    // ============================================
    // TONE STACK (Per-channel)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    this.deep = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 800;
    this.middle.Q.value = 1.4;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 5000;
    this.presence.gain.value = 0;
    
    this.deep.type = 'lowshelf';
    this.deep.frequency.value = 80;
    this.deep.gain.value = 0;
    
    // ============================================
    // DIEZEL "TIGHT" BASS (HPF)
    // ============================================
    this.tightFilter = audioContext.createBiquadFilter();
    this.tightFilter.type = 'highpass';
    this.tightFilter.frequency.value = 70;
    this.tightFilter.Q.value = 0.7;
    
    // ============================================
    // DIEZEL "GERMAN" MIDRANGE
    // ============================================
    this.germanMid = audioContext.createBiquadFilter();
    this.germanMid.type = 'peaking';
    this.germanMid.frequency.value = 1200;
    this.germanMid.Q.value = 2.0;
    this.germanMid.gain.value = 4; // Diezel signature mid scoop/peak
    
    // ============================================
    // MID-CUT GLOBAL (VH4 secret weapon)
    // ============================================
    this.midCutOn = false;
    this.midCut = audioContext.createBiquadFilter();
    this.midCut.type = 'notch';
    this.midCut.frequency.value = 400; // 200-1000 Hz
    this.midCut.Q.value = 0.85; // Musical width
    
    this.midCutDepth = audioContext.createBiquadFilter();
    this.midCutDepth.type = 'peaking';
    this.midCutDepth.frequency.value = 400;
    this.midCutDepth.Q.value = 0.85;
    this.midCutDepth.gain.value = 0; // Negative = cut depth
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (Transparent, high-gain)
    // ============================================
    this.gate = this.createNoiseGate({
      thOpen: -52,      // Transparent but effective
      thClose: -60,     // TRUE HYSTERESIS
      attack: 0.0008,   // 0.8ms attack
      release: 0.12,    // 120ms release
      rms: 0.015,       // 15ms RMS window
      peakMix: 0.35,    // Balanced peak/RMS
      floorDb: -72,     // Musical floor
      holdMs: 10        // 10ms hold
    });
    this.gate.ratio.value = 20;
    this.gate.attack.value = 0.002;
    this.gate.release.value = 0.08;
    
    this.gateMix = audioContext.createGain();
    this.gateMix.gain.value = 1.0;
    
    // ============================================
    // POWER AMP (4x EL34 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power supply sag (Diezel uses tube rectifier)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.14,      // 14% sag (heavy tube rectifier)
      att: 0.005,       // 5ms attack
      relFast: 0.06,    // 60ms fast recovery
      relSlow: 0.24,    // 240ms slow recovery
      rmsMs: 23.0,      // 23ms RMS window
      shape: 1.6,       // Progressive/tube-like
      floor: 0.26,      // 26% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Power compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -16;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.10;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // EFFECTS LOOP (Parallel with mix - VH4 style)
    // ============================================
    this.fxLoop = false;
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxSendLevel = audioContext.createGain();
    this.fxReturnLevel = audioContext.createGain();
    this.fxMix = audioContext.createGain(); // 0..1 (wet)
    this.fxDryTap = audioContext.createGain();
    
    this.fxSendLevel.gain.value = 0.8; // -2dB
    this.fxReturnLevel.gain.value = 1.0;
    this.fxMix.gain.value = 0.0; // Start dry
    this.fxDryTap.gain.value = 1.0;
    
    // ============================================
    // ROUTING - CHANNEL 3 (DEFAULT)
    // ============================================
    this.setupChannel3();
    this.recreateCabinet();
    
    this.params = {
      channel: 3, // 1=clean, 2=crunch, 3=mega, 4=ultra
      
      // Gain/Volume
      gain: 70,
      channel_volume: 70,
      
      // Tone stack
      bass: 60,
      middle: 55,
      treble: 65,
      presence: 60,
      deep: 50,
      
      // Master
      master: 70,
      
      // FX Loop (Parallel)
      fx_loop: 0,
      fx_mix: 0,
      fx_send: 80,
      fx_return: 100,
      
      // Mid-Cut
      midcut: 0,
      midcut_level: 0,
      midcut_freq: 40,
      
      // Noise Gate
      gate: 0,
      gate_thresh: 60,
      
      // Cabinet
      cabinet_enabled: true
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN/CRUNCH (2 gain stages)
    this.disconnectAll();
    
    // Input with noise gate
    this.input.connect(this.gate);
    this.gate.connect(this.gateMix);
    this.gateMix.connect(this.channel1);
    
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.tightFilter);
    this.tightFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanMid);
    this.germanMid.connect(this.presence);
    
    // Mid-cut (optional)
    if (this.midCutOn) {
      this.presence.connect(this.midCut);
      this.midCut.connect(this.midCutDepth);
      this.midCutDepth.connect(this.deep);
    } else {
      this.presence.connect(this.deep);
    }
    
    this.deep.connect(this.channelVolume);
    
    // FX loop (parallel)
    if (this.fxLoop) {
      // Split dry/wet
      this.channelVolume.connect(this.fxDryTap);     // DRY
      this.channelVolume.connect(this.fxSendLevel);  // SEND
      this.fxSendLevel.connect(this.fxSend);         // → external effects
      this.fxReturn.connect(this.fxReturnLevel);     // ← return from effects
      
      // Mix dry + wet
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerSag || this.powerAmp);
    }
    
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    } else {
      // Fallback connection if sag unavailable
      this.powerAmp.gain.value = 1.0;
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    // Channel-specific voicing: Bright cap (lighter treble shelf, +2dB if gain<40)
    this.treble.frequency.value = 3200;
    if (this.params.gain < 40) {
      this.treble.gain.value += 0.2;
    }
    
    this.activeChannel = 1;
    this.applyChState(1);
  }
  
  setupChannel2() {
    // CHANNEL 2 - CRUNCH/LEAD (3 gain stages)
    this.disconnectAll();
    
    // Input with noise gate
    this.input.connect(this.gate);
    this.gate.connect(this.gateMix);
    this.gateMix.connect(this.channel2);
    
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.tightFilter);
    this.tightFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanMid);
    this.germanMid.connect(this.presence);
    
    // Mid-cut (optional)
    if (this.midCutOn) {
      this.presence.connect(this.midCut);
      this.midCut.connect(this.midCutDepth);
      this.midCutDepth.connect(this.deep);
    } else {
      this.presence.connect(this.deep);
    }
    
    this.deep.connect(this.channelVolume);
    
    // FX loop (parallel)
    if (this.fxLoop) {
      // Split dry/wet
      this.channelVolume.connect(this.fxDryTap);     // DRY
      this.channelVolume.connect(this.fxSendLevel);  // SEND
      this.fxSendLevel.connect(this.fxSend);         // → external effects
      this.fxReturn.connect(this.fxReturnLevel);     // ← return from effects
      
      // Mix dry + wet
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerSag || this.powerAmp);
    }
    
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    } else {
      // Fallback connection if sag unavailable
      this.powerAmp.gain.value = 1.0;
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    // Channel-specific voicing: Upper-mid push
    this.treble.frequency.value = 3000;
    this.germanMid.gain.value = 3.5; // Slight upper-mid push
    
    this.activeChannel = 2;
    this.applyChState(2);
  }
  
  setupChannel3() {
    // CHANNEL 3 - MEGA (4 gain stages)
    this.disconnectAll();
    
    // Input with noise gate
    this.input.connect(this.gate);
    this.gate.connect(this.gateMix);
    this.gateMix.connect(this.channel3);
    
    this.channel3.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.tightFilter);
    this.tightFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanMid);
    this.germanMid.connect(this.presence);
    
    // Mid-cut (optional)
    if (this.midCutOn) {
      this.presence.connect(this.midCut);
      this.midCut.connect(this.midCutDepth);
      this.midCutDepth.connect(this.deep);
    } else {
      this.presence.connect(this.deep);
    }
    
    this.deep.connect(this.channelVolume);
    
    // FX loop (parallel)
    if (this.fxLoop) {
      // Split dry/wet
      this.channelVolume.connect(this.fxDryTap);     // DRY
      this.channelVolume.connect(this.fxSendLevel);  // SEND
      this.fxSendLevel.connect(this.fxSend);         // → external effects
      this.fxReturn.connect(this.fxReturnLevel);     // ← return from effects
      
      // Mix dry + wet
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerSag || this.powerAmp);
    }
    
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    } else {
      // Fallback connection if sag unavailable
      this.powerAmp.gain.value = 1.0;
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    // Channel-specific voicing: Tight HPF (90Hz)
    this.treble.frequency.value = 3000;
    this.tightFilter.frequency.value = 90;
    this.germanMid.gain.value = 4.0;
    
    this.activeChannel = 3;
    this.applyChState(3);
  }
  
  setupChannel4() {
    // CHANNEL 4 - ULTRA (5 gain stages - EXTREME)
    this.disconnectAll();
    
    // Input with noise gate
    this.input.connect(this.gate);
    this.gate.connect(this.gateMix);
    this.gateMix.connect(this.channel4);
    
    this.channel4.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.preamp5);
    this.preamp5.connect(this.saturation5);
    this.saturation5.connect(this.tightFilter);
    this.tightFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.germanMid);
    this.germanMid.connect(this.presence);
    
    // Mid-cut (optional)
    if (this.midCutOn) {
      this.presence.connect(this.midCut);
      this.midCut.connect(this.midCutDepth);
      this.midCutDepth.connect(this.deep);
    } else {
      this.presence.connect(this.deep);
    }
    
    this.deep.connect(this.channelVolume);
    
    // FX loop (parallel)
    if (this.fxLoop) {
      // Split dry/wet
      this.channelVolume.connect(this.fxDryTap);     // DRY
      this.channelVolume.connect(this.fxSendLevel);  // SEND
      this.fxSendLevel.connect(this.fxSend);         // → external effects
      this.fxReturn.connect(this.fxReturnLevel);     // ← return from effects
      
      // Mix dry + wet
      this.fxDryTap.connect(this.powerSag || this.powerAmp);
      this.fxReturnLevel.connect(this.fxMix);
      this.fxMix.connect(this.powerSag || this.powerAmp);
    } else {
      this.channelVolume.connect(this.powerSag || this.powerAmp);
    }
    
    if (this.powerSag) {
      this.powerSag.connect(this.powerAmp);
    } else {
      // Fallback connection if sag unavailable
      this.powerAmp.gain.value = 1.0;
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    // Channel-specific voicing: Extra tight HPF (110Hz), reduced deep
    this.treble.frequency.value = 3000;
    this.tightFilter.frequency.value = 110;
    this.germanMid.gain.value = 4.2;
    
    this.activeChannel = 4;
    this.applyChState(4);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.gate.disconnect();
      this.gateMix.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
      this.channel4.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.preamp5.disconnect();
      this.saturation5.disconnect();
      this.tightFilter.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.germanMid.disconnect();
      this.presence.disconnect();
      this.midCut.disconnect();
      this.midCutDepth.disconnect();
      this.deep.disconnect();
      this.channelVolume.disconnect();
      this.fxDryTap.disconnect();
      this.fxSendLevel.disconnect();
      this.fxSend.disconnect();
      this.fxReturn.disconnect();
      this.fxReturnLevel.disconnect();
      this.fxMix.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyChState(ch) {
    const s = this.channelState[ch];
    const t = this.audioContext.currentTime;
    this.preamp1.gain.setTargetAtTime(1 + (s.gain / 7), t, 0.01);
    this.bass.gain.setTargetAtTime((s.bass - 50) / 10, t, 0.01);
    this.middle.gain.setTargetAtTime((s.middle - 50) / 10, t, 0.01);
    this.treble.gain.setTargetAtTime((s.treble - 50) / 10, t, 0.01);
    this.presence.gain.setTargetAtTime((s.presence - 50) / 10, t, 0.01);
    this.deep.gain.setTargetAtTime((s.deep - 50) / 10, t, 0.01);
    this.channelVolume.gain.setTargetAtTime(s.volume / 100, t, 0.01);
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 12;
    this.preamp2.gain.value = 2.5;
    this.preamp3.gain.value = 1.8;
    this.preamp4.gain.value = 1.5;
    this.preamp5.gain.value = 1.3;
    this.channel1.gain.value = 0.5;
    this.channel2.gain.value = 0.7;
    this.channel3.gain.value = 1.0;
    this.channel4.gain.value = 1.2;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.1;
    this.master.gain.value = 0.7;
    
    // NFB-style dynamic presence/deep (optional - ScriptProcessor)
    // This creates a subtle dynamic response to signal level
    try {
      this._nfbLfo = this.audioContext.createScriptProcessor(256, 1, 1);
      this._nfbLfo.onaudioprocess = (e) => {
        const inp = e.inputBuffer.getChannelData(0);
        let rms = 0;
        for (let i = 0; i < inp.length; i++) {
          const v = inp[i];
          rms += v * v;
        }
        rms = Math.sqrt(rms / inp.length); // 0..~1
        
        // Dynamic boost: +0..+1 dB presence and +1.5 dB deep on peaks
        const p = (rms > 0.02) ? ((rms - 0.02) * 50) : 0;
        const now = this.audioContext.currentTime;
        this.presence.gain.setTargetAtTime(((this.params.presence - 50) / 10) + (p * 0.1), now, 0.05);
        this.deep.gain.setTargetAtTime(((this.params.deep - 50) / 10) + (p * 0.15), now, 0.05);
      };
      
      // Monitor before powerComp
      this.channelVolume.connect(this._nfbLfo);
      this._nfbLfo.connect(this.audioContext.createGain()); // Dummy output
    } catch (e) {
      console.warn('NFB LFO not available:', e);
    }
  }
  
  makeDiezelPreampCurve() {
    const n = 44100;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      
      // DIEZEL "GERMAN" PRECISION with improved focus
      let y = Math.tanh(x * 6.5);
      
      // TIGHT, FOCUSED COMPRESSION
      if (Math.abs(y) > 0.5) {
        const comp = 1 - (Math.abs(y) - 0.5) * 0.38;
        y *= comp;
      }
      
      // CLARITY (no mud)
      y += 0.11 * Math.tanh(x * 9);
      
      // Upper-mid aggression
      y += 0.13 * Math.tanh(x * 7.5);
      
      // Micro tilt for tightness
      if (x < 0) y *= 1.02;
      if (x > 0) y *= 1.10;
      
      c[i] = y * 0.83;
    }
    return c;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL34 POWER TUBES (British voicing)
      let y = Math.tanh(x * 1.7);
      
      // EL34 compression (tight, aggressive)
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.45);
      }
      
      // DIEZEL DEEP (sub-bass punch)
      y += 0.1 * Math.tanh(x * 2.5);
      
      // EL34 aggression
      y += 0.08 * Math.tanh(x * 8);
      
      // Slight asymmetry
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.88;
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
    
    switch (parameter) {
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else if (value === 2) {
          this.setupChannel2();
        } else if (value === 3) {
          this.setupChannel3();
        } else if (value === 4) {
          this.setupChannel4();
        }
        break;
      
      case 'gain':
        // Main gain
        this.preamp1.gain.setTargetAtTime(1 + (value / 7), now, 0.01);
        // Add cascading gain to other stages (for more natural response)
        const cascadeBoost = value / 200; // 0..0.5
        this.preamp2.gain.setTargetAtTime(2.5 + cascadeBoost * 0.3, now, 0.01);
        this.preamp3.gain.setTargetAtTime(1.8 + cascadeBoost * 0.25, now, 0.01);
        this.preamp4.gain.setTargetAtTime(1.5 + cascadeBoost * 0.2, now, 0.01);
        this.preamp5.gain.setTargetAtTime(1.3 + cascadeBoost * 0.15, now, 0.01);
        // Update channel state
        this.channelState[this.activeChannel].gain = value;
        break;
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        this.channelState[this.activeChannel].volume = value;
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.channelState[this.activeChannel].bass = value;
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.channelState[this.activeChannel].middle = value;
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.channelState[this.activeChannel].treble = value;
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.channelState[this.activeChannel].presence = value;
        break;
      
      case 'deep':
        this.deep.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        this.channelState[this.activeChannel].deep = value;
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // FX Loop controls
      case 'fx_loop':
        this.fxLoop = !!value;
        // Re-route the active channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else if (this.activeChannel === 3) this.setupChannel3();
        else this.setupChannel4();
        break;
      
      case 'fx_mix':
        this.fxMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_send':
        this.fxSendLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_return':
        this.fxReturnLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // Mid-Cut controls
      case 'midcut':
        this.midCutOn = !!value;
        // Re-route the active channel
        if (this.activeChannel === 1) this.setupChannel1();
        else if (this.activeChannel === 2) this.setupChannel2();
        else if (this.activeChannel === 3) this.setupChannel3();
        else this.setupChannel4();
        break;
      
      case 'midcut_level': {
        // -0 to -12 dB
        const dB = -(value / 100) * 12;
        this.midCutDepth.gain.setTargetAtTime(dB, now, 0.01);
        break;
      }
      
      case 'midcut_freq': {
        const f = 200 + (value / 100) * 800; // 200..1000 Hz
        this.midCut.frequency.setTargetAtTime(f, now, 0.01);
        this.midCutDepth.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }
      
      // Noise Gate controls
      case 'gate':
        this.gate.threshold.setTargetAtTime(value ? -60 : 0, now, 0.01);
        break;
      
      case 'gate_thresh': {
        const th = -80 + (value / 100) * 50; // -80..-30 dB
        this.gate.threshold.setTargetAtTime(th, now, 0.01);
        break;
      }
      
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
    this.gate.disconnect();
    this.gateMix.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.channel3.disconnect();
    this.channel4.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.preamp5.disconnect();
    this.saturation5.disconnect();
    this.tightFilter.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.germanMid.disconnect();
    this.presence.disconnect();
    this.midCut.disconnect();
    this.midCutDepth.disconnect();
    this.deep.disconnect();
    this.channelVolume.disconnect();
    this.fxDryTap.disconnect();
    this.fxSendLevel.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.fxReturnLevel.disconnect();
    this.fxMix.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
    
    // Disconnect NFB LFO if exists
    if (this._nfbLfo) {
      this._nfbLfo.disconnect();
    }
  }
}

export default DiezelVH4Amp;
