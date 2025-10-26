import BaseAmp from './BaseAmp.js';

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
    
    // Brilliant channel bright cap
    this.brilliantFilter = audioContext.createBiquadFilter();
    this.brilliantFilter.type = 'highshelf';
    this.brilliantFilter.frequency.value = 3500;
    this.brilliantFilter.gain.value = 5; // Always active on brilliant
    
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
    this.saturation4.curve = this.makePreampCurve();
    
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
    this.glassyHighs.gain.value = 3;
    
    this.tightBass = audioContext.createBiquadFilter();
    this.tightBass.type = 'highpass';
    this.tightBass.frequency.value = 80;
    this.tightBass.Q.value = 0.707;
    
    // ============================================
    // POWER AMP (4x KT88 tubes - 100W)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // KT88 compression (very clean, massive headroom)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -5; // VERY high threshold (clean!)
    this.powerComp.knee.value = 5;
    this.powerComp.ratio.value = 2;
    this.powerComp.attack.value = 0.001; // Fast attack (tight)
    this.powerComp.release.value = 0.05;
    
    // ============================================
    // MASTER VOLUME & PRESENCE
    // ============================================
    this.masterVolume = audioContext.createGain();
    this.masterPresence = audioContext.createGain();
    
    // ============================================
    // ROUTING - BRILLIANT CHANNEL (DEFAULT)
    // ============================================
    this.setupBrilliantChannel();
    
    this.params = {
      channel: 1, // 0=normal, 1=brilliant
      
      // Gain
      gain: 50,
      
      // Tone stack
      bass: 55,
      middle: 50,
      treble: 65,
      presence: 60,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupBrilliantChannel() {
    this.disconnectAll();
    
    // BRILLIANT CHANNEL - High-end emphasis
    this.input.connect(this.brilliantChannel);
    this.brilliantChannel.connect(this.brilliantFilter);
    this.brilliantFilter.connect(this.tightBass); // Tight bass first
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
    this.glassyHighs.connect(this.presence);
    
    // Master volume
    this.presence.connect(this.masterVolume);
    
    // Power amp
    this.masterVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.masterPresence);
    this.masterPresence.connect(this.output);
    
    this.activeChannel = 'brilliant';
  }
  
  setupNormalChannel() {
    this.disconnectAll();
    
    // NORMAL CHANNEL - Flatter frequency response
    this.input.connect(this.normalChannel);
    this.normalChannel.connect(this.tightBass); // Tight bass first
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
    this.glassyHighs.connect(this.presence);
    
    // Master volume
    this.presence.connect(this.masterVolume);
    
    // Power amp
    this.masterVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.masterPresence);
    this.masterPresence.connect(this.output);
    
    this.activeChannel = 'normal';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.brilliantChannel.disconnect();
      this.normalChannel.disconnect();
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
      this.masterPresence.disconnect();
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
    // CHANNELS
    // ============================================
    this.brilliantChannel.gain.value = 1.0;
    this.normalChannel.gain.value = 1.0;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.masterVolume.gain.value = 0.7;
    this.masterPresence.gain.value = 1.0;
    
    // ============================================
    // POWER AMP (4x KT88 - 100W)
    // ============================================
    this.powerAmp.gain.value = 1.3; // Massive clean headroom
  }
  
  makePreampCurve() {
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
          this.setupBrilliantChannel();
        }
        break;
      
      // ============================================
      // GAIN
      // ============================================
      case 'gain':
      case 'volume':
        this.preamp1.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        break;
      
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
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // MASTER
      // ============================================
      case 'master':
        this.masterVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.brilliantChannel.disconnect();
    this.normalChannel.disconnect();
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
    this.masterPresence.disconnect();
  }
}

export default HiwattDR103Amp;

