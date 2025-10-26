import BaseAmp from './BaseAmp.js';

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
    // POWER AMP (4x EL34 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -15;
    this.powerComp.knee.value = 10;
    this.powerComp.ratio.value = 5;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.08;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // EFFECTS LOOP (Series, switchable)
    // ============================================
    this.fxSend = audioContext.createGain();
    this.fxReturn = audioContext.createGain();
    this.fxBypass = audioContext.createGain();
    this.fxLoop = false;
    
    // ============================================
    // ROUTING - CHANNEL 3 (DEFAULT)
    // ============================================
    this.setupChannel3();
    
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
      
      // FX Loop
      fx_loop: 0
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN/CRUNCH (2 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel1);
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
    this.presence.connect(this.deep);
    this.deep.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // CHANNEL 2 - CRUNCH/LEAD (3 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel2);
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
    this.presence.connect(this.deep);
    this.deep.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  setupChannel3() {
    // CHANNEL 3 - MEGA (4 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel3);
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
    this.presence.connect(this.deep);
    this.deep.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 3;
  }
  
  setupChannel4() {
    // CHANNEL 4 - ULTRA (5 gain stages - EXTREME)
    this.disconnectAll();
    
    this.input.connect(this.channel4);
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
    this.presence.connect(this.deep);
    this.deep.connect(this.channelVolume);
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 4;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
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
      this.deep.disconnect();
      this.channelVolume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
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
  }
  
  makeDiezelPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // DIEZEL "GERMAN" PRECISION
      let y = Math.tanh(x * 6);
      
      // TIGHT, FOCUSED COMPRESSION
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.35;
        y *= compression;
      }
      
      // CLARITY (no mud)
      y += 0.1 * Math.tanh(x * 9);
      
      // Upper-mid aggression
      y += 0.12 * Math.tanh(x * 7);
      
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
        this.preamp1.gain.setTargetAtTime(1 + (value / 7), now, 0.01);
        break;
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(value / 100, now, 0.01);
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
      
      case 'deep':
        this.deep.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'fx_loop':
        this.fxLoop = value > 0;
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
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
    this.deep.disconnect();
    this.channelVolume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
    this.fxSend.disconnect();
    this.fxReturn.disconnect();
    this.fxBypass.disconnect();
  }
}

export default DiezelVH4Amp;
