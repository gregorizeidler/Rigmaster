import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class HiwattDR103Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Hiwatt DR103', 'hiwatt_dr103');
    
    // HIWATT DR103 (Custom 100)
    // THE Who amp - Pete Townshend's legendary clean headroom
    // Known for massive clean power, "glassy" highs, and tight bass
    
    // ============================================
    // 4 INPUT JACKS (Brilliant/Normal x2)
    // ============================================
    this.brilliantChannel = audioContext.createGain();
    this.normalChannel = audioContext.createGain();
    
    // Brilliant channel bright cap (dynamic - reacts to volume)
    this.brilliantFilter = audioContext.createBiquadFilter();
    this.brilliantFilter.type = 'highshelf';
    this.brilliantFilter.frequency.value = 3500;
    this.brilliantFilter.gain.value = 0; // Dynamic, controlled by volume
    
    // Channel blend for jumpering (classic Hiwatt trick)
    this.channelBlend = audioContext.createGain();
    this.channelBlend.gain.value = 0; // 0 = only Brilliant, 1 = full Normal blend
    this.normalTap = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'brilliant'; // 'brilliant' or 'normal'
    
    // ============================================
    // PREAMP (ECC83 tubes - 4 stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation3.curve = this.makePreampCurve();
    this.saturation4.curve = this.makePreampCurve(true); // Last stage with asymmetry
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // TONE STACK (Bass/Treble/Middle/Presence)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 650;
    this.middle.Q.value = 1.0;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 5000;
    this.presence.gain.value = 0;
    
    // ============================================
    // HIWATT "GLASS" CHARACTERISTIC
    // ============================================
    // Hiwatt is known for ultra-clean highs and tight bass
    this.glassyHighs = audioContext.createBiquadFilter();
    this.glassyHighs.type = 'peaking';
    this.glassyHighs.frequency.value = 4500;
    this.glassyHighs.Q.value = 2;
    this.glassyHighs.gain.value = 2; // Reduced to avoid double EQ with presence
    
    this.tightBass = audioContext.createBiquadFilter();
    this.tightBass.type = 'highpass';
    this.tightBass.frequency.value = 55; // Lower for authentic DR103 punch
    this.tightBass.Q.value = 0.707;
    
    // ============================================
    // POWER AMP (4x KT88 tubes - 100W)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // POWER SUPPLY SAG - AUDIOWORKLET (silicon rectifier)
    // Hiwatt DR103 uses KT88 tubes with solid-state rectifier (massive headroom!)
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.05,      // 5% sag (minimal - Hiwatt clean power!)
      att: 0.001,       // 1ms attack (very fast, tight)
      relFast: 0.03,    // 30ms fast recovery
      relSlow: 0.12,    // 120ms slow recovery
      rmsMs: 8.0,       // 8ms RMS window (very responsive)
      shape: 0.8,       // Almost linear (Hiwatt transparency)
      floor: 0.40,      // 40% minimum headroom (massive!)
      peakMix: 0.35     // Balanced peak/RMS
    });
    
    // Power compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -20;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 2.5;
    this.powerComp.attack.value = 0.001;
    this.powerComp.release.value = 0.12;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_fane';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume = audioContext.createGain();
    
    this.params = {
      // Volume controls (both always active, like original)
      volume_normal: 0,        // Start with Normal off
      volume_brilliant: 50,    // Start with Bright on
      
      // Tone stack
      bass: 55,
      middle: 50,
      treble: 65,
      presence: 60,
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_greenback',
      mic_position: 'center'
    };
    
    this.applyInitialSettings();
    this.setupChannels();
    this.recreateCabinet();
  }
  
  setupChannels() {
    this.disconnectAll();
    
    // BOTH CHANNELS ALWAYS ACTIVE - Mixed together (like original with jumpering)
    // User controls which channel via volume knobs
    this.input.connect(this.brilliantChannel);
    this.input.connect(this.normalChannel);
    
    // Brilliant path with dynamic bright cap
    this.brilliantChannel.connect(this.brilliantFilter);
    this.brilliantFilter.connect(this.tightBass);
    
    // Normal path (no bright cap)
    this.normalChannel.connect(this.normalTap);
    this.normalTap.connect(this.channelBlend);
    this.channelBlend.connect(this.tightBass);
    
    // Preamp stages
    this.tightBass.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    
    // Tone stack
    this.saturation4.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.glassyHighs);
    this.glassyHighs.connect(this.masterVolume);
    
    // Power amp with presence in NFB position
    if (this.powerSag) {
      this.masterVolume.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.masterVolume.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.presence); // Presence acts as NFB
    this.presence.connect(this.powerSaturation);
    
    // Cabinet simulation
    this.powerSaturation.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.brilliantChannel.disconnect();
      this.normalChannel.disconnect();
      this.normalTap.disconnect();
      this.channelBlend.disconnect();
      this.brilliantFilter.disconnect();
      this.tightBass.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.glassyHighs.disconnect();
      this.presence.disconnect();
      this.masterVolume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (4 stages)
    // ============================================
    this.preamp1.gain.value = 2; // Clean preamp
    this.preamp2.gain.value = 1.3;
    this.preamp3.gain.value = 1.2;
    this.preamp4.gain.value = 1.1;
    
    // ============================================
    // CHANNELS (Both always active, controlled by volume knobs)
    // ============================================
    this.brilliantChannel.gain.value = 1.0;
    this.normalChannel.gain.value = 1.0;
    this.normalTap.gain.value = 1.0;
    this.channelBlend.gain.value = 0; // Start with Normal at 0 (controlled by volume_normal)
    
    // ============================================
    // MASTER VOLUME (Logarithmic)
    // ============================================
    this.masterVolume.gain.value = this.linLog01(0.7);
    
    // ============================================
    // POWER AMP (4x KT88 - 100W)
    // ============================================
    this.powerAmp.gain.value = 1.3; // Massive clean headroom
  }
  
  // Logarithmic mapping for musical volume response
  linLog01(v01) {
    return 0.001 * Math.pow(1000, v01);
  }
  
  makePreampCurve(isLast = false) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // HIWATT PREAMP - very clean, nearly linear
      if (Math.abs(x) < 0.7) {
        curve[i] = x * 1.05; // Nearly linear (ultra-clean)
      } else {
        // Very soft clipping at extreme levels
        let y = Math.tanh(x * 1.5);
        
        // "GLASSY" HIGHS (Hiwatt signature)
        y += 0.05 * Math.sin(x * Math.PI * 6);
        
        // Subtle asymmetry on last stage for Hiwatt "snap"
        if (isLast) {
          if (x > 0) y *= 1.02;
          else y *= 0.985;
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
      
      // 4x KT88 POWER TUBES - massive clean headroom
      if (Math.abs(x) < 0.85) {
        curve[i] = x * 1.02; // Nearly linear (massive headroom)
      } else {
        // Very soft, musical compression at extreme levels
        let y = Math.tanh(x * 1.3);
        
        // KT88 characteristic (tight, clean, powerful)
        y += 0.03 * Math.tanh(x * 2);
        
        // TIGHT BASS (no flub)
        if (x < 0) y *= 1.02;
        
        curve[i] = y * 0.92;
      }
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
      // ============================================
      // VOLUME CONTROLS (Both always active)
      // ============================================
      case 'volume_brilliant': {
        const v = value / 100; // 0..1
        
        // Control Brilliant channel gain
        this.brilliantChannel.gain.setTargetAtTime(v * 1.2, now, 0.01);
        
        // Dynamic bright cap: STRONGER with volume LOW (inverse relationship)
        // Up to +6 dB at low volume, fades to 0 dB at high volume
        const brightDb = (1 - v) * 6;
        this.brilliantFilter.gain.setTargetAtTime(brightDb, now, 0.02);
        break;
      }
      
      case 'volume_normal': {
        const v = value / 100; // 0..1
        
        // Control Normal channel blend amount
        this.channelBlend.gain.setTargetAtTime(v * 1.2, now, 0.01);
        break;
      }
      
      // Legacy support
      case 'gain':
      case 'volume': {
        // Map to brilliant volume for backwards compatibility
        const v = value / 100;
        this.brilliantChannel.gain.setTargetAtTime(v * 1.2, now, 0.01);
        const brightDb = (1 - v) * 6;
        this.brilliantFilter.gain.setTargetAtTime(brightDb, now, 0.02);
        break;
      }
      
      // ============================================
      // TONE STACK
      // ============================================
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
        // Presence now acts as NFB in power stage
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // MASTER (Logarithmic for musical response)
      // ============================================
      case 'master':
        this.masterVolume.gain.setTargetAtTime(this.linLog01(value / 100), now, 0.01);
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
      
      case 'cabinet':
      case 'mic_position':
        // These are handled by the IR loader in AudioEngine
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.brilliantChannel.disconnect();
    this.normalChannel.disconnect();
    this.normalTap.disconnect();
    this.channelBlend.disconnect();
    this.brilliantFilter.disconnect();
    this.tightBass.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.glassyHighs.disconnect();
    this.presence.disconnect();
    this.masterVolume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.postHPF.disconnect();
    this.postLPF.disconnect();
  }
}

export default HiwattDR103Amp;

