import BaseAmp from './BaseAmp.js';

class MatchlessDC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Matchless DC-30', 'matchless_dc30');
    
    // MATCHLESS DC-30
    // Boutique British amp - indie/alt rock standard
    // The Edge (U2), radiohead, indie rock players
    
    // ============================================
    // DUAL CHANNELS
    // ============================================
    this.channel1Volume = audioContext.createGain();
    this.channel2Volume = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 1; // 1 or 2
    
    // ============================================
    // PREAMP (EF86 + ECC83 tubes)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.cut = audioContext.createBiquadFilter(); // Master cut control
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    this.cut.type = 'lowpass';
    this.cut.frequency.value = 10000; // High by default
    this.cut.Q.value = 0.707;
    
    // ============================================
    // BRITISH "CHIME" (Matchless signature)
    // ============================================
    this.chime = audioContext.createBiquadFilter();
    this.chime.type = 'peaking';
    this.chime.frequency.value = 2500; // 2.5kHz chime
    this.chime.Q.value = 2;
    this.chime.gain.value = 5;
    
    // ============================================
    // POWER AMP (4x EL84 - Class A)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Class A compression (always active)
    this.classAComp = audioContext.createDynamicsCompressor();
    this.classAComp.threshold.value = -18;
    this.classAComp.knee.value = 15;
    this.classAComp.ratio.value = 3;
    this.classAComp.attack.value = 0.005;
    this.classAComp.release.value = 0.12;
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 1 (DEFAULT)
    // ============================================
    this.setupChannel1();
    
    this.params = {
      channel: 1, // 1 or 2
      
      // Channel volumes
      ch1_volume: 55,
      ch2_volume: 55,
      
      // Tone stack
      bass: 50,
      treble: 65,
      cut: 50,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    this.disconnectAll();
    
    this.input.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.channel1Volume);
    this.channel1Volume.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.chime);
    this.chime.connect(this.cut);
    this.cut.connect(this.classAComp);
    this.classAComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    this.disconnectAll();
    
    this.input.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.channel2Volume);
    this.channel2Volume.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.chime);
    this.chime.connect(this.cut);
    this.cut.connect(this.classAComp);
    this.classAComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.channel1Volume.disconnect();
      this.channel2Volume.disconnect();
      this.bass.disconnect();
      this.treble.disconnect();
      this.chime.disconnect();
      this.cut.disconnect();
      this.classAComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 3;
    this.preamp2.gain.value = 1.5;
    this.channel1Volume.gain.value = 0.55;
    this.channel2Volume.gain.value = 0.55;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
  }
  
  makePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 2.2);
      
      // MATCHLESS CHIME @ 2.5kHz
      y += 0.15 * Math.tanh(x * 5);
      
      // Class A warmth
      if (Math.abs(y) > 0.5) {
        y *= 0.92;
      }
      
      if (x > 0) y *= 1.08;
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.4);
      
      // EL84 chime
      y += 0.12 * Math.sin(x * Math.PI * 5);
      
      // Class A compression
      y += 0.1 * Math.sin(x * Math.PI * 2);
      
      if (x > 0) y *= 1.1;
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 1) {
          this.setupChannel1();
        } else {
          this.setupChannel2();
        }
        break;
      case 'ch1_volume':
      case 'volume':
      case 'gain':
        this.channel1Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'ch2_volume':
        this.channel2Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'cut':
        const cutFreq = 3000 + (value / 100) * 12000;
        this.cut.frequency.setTargetAtTime(cutFreq, now, 0.01);
        break;
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.channel1Volume.disconnect();
    this.channel2Volume.disconnect();
    this.bass.disconnect();
    this.treble.disconnect();
    this.chime.disconnect();
    this.cut.disconnect();
    this.classAComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default MatchlessDC30Amp;

