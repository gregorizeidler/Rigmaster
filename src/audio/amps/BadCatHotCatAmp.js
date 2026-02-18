import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class BadCatHotCatAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bad Cat Hot Cat', 'badcat_hotcat');
    
    // BAD CAT HOT CAT 30R
    // Boutique British-voiced amp with vintage character
    // Rich harmonics, touch-sensitive dynamics, K-Master PPIMV
    
    // ============================================
    // DUAL CHANNELS
    // ============================================
    this.channel1 = audioContext.createGain();
    this.channel2 = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 1; // 1 or 2
    
    // ============================================
    // INPUT STAGE - FOCUS & BITE
    // ============================================
    // Focus - HPF anti-flub (before preamp)
    this.focus = 40; // 20..160 Hz
    this.focusHPF = audioContext.createBiquadFilter();
    this.focusHPF.type = 'highpass';
    this.focusHPF.frequency.value = 40;
    this.focusHPF.Q.value = 0.707;
    
    // Bite - bright cap 3-position (0=off, 1=+3dB, 2=+6dB)
    this.bite = 1;
    this.biteShelf = audioContext.createBiquadFilter();
    this.biteShelf.type = 'highshelf';
    this.biteShelf.frequency.value = 3500;
    this.biteShelf.gain.value = 3;
    
    // ============================================
    // PREAMP (ECC83 + EF86)
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
    // CHANNEL 2 - EF86 MODE
    // ============================================
    this.ch2Mode = 'EF86'; // 'EF86' | 'ECC83'
    this.saturation2_EF86 = audioContext.createWaveShaper();
    this.saturation2_EF86.curve = this.makeEF86Curve();
    this.saturation2_EF86.oversample = '4x';
    
    this.ch2Tilt = audioContext.createBiquadFilter();
    this.ch2Tilt.type = 'highshelf';
    this.ch2Tilt.frequency.value = 2200;
    this.ch2Tilt.gain.value = 1.5; // EF86 air
    
    // ============================================
    // VOLUME PER CHANNEL + K-MASTER (PPIMV)
    // ============================================
    this.ch1Volume = audioContext.createGain();
    this.ch2Volume = audioContext.createGain();
    this.kMaster = audioContext.createGain();   // PPIMV (feeds power)
    this.outputLevel = audioContext.createGain(); // post-power, final volume
    
    this.ch1Volume.gain.value = 0.6;
    this.ch2Volume.gain.value = 0.6;
    this.kMaster.gain.value = 0.7;
    this.outputLevel.gain.value = 1.0;
    
    // ============================================
    // TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.cut = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 700;
    this.middle.Q.value = 1.2;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    this.cut.type = 'lowpass';
    this.cut.frequency.value = 7000;
    this.cut.Q.value = 0.6; // wider for musical sweep
    
    // ============================================
    // BAD CAT "HARMONIC RICHNESS"
    // ============================================
    this.harmonics = audioContext.createBiquadFilter();
    this.harmonics.type = 'peaking';
    this.harmonics.frequency.value = 2000;
    this.harmonics.Q.value = 2;
    this.harmonics.gain.value = 4;
    
    // ============================================
    // CLASS A SAG (elastic cathode bias feel)
    // ============================================
    this.classASag = audioContext.createDynamicsCompressor();
    this.classASag.threshold.value = -24;
    this.classASag.knee.value = 10;
    this.classASag.ratio.value = 2.2;
    this.classASag.attack.value = 0.004;
    this.classASag.release.value = 0.16;
    
    // ============================================
    // REVERB (Hot Cat 30R)
    // ============================================
    this.rvSend = audioContext.createGain();
    this.rvReturn = audioContext.createGain();
    this.rvHPF = audioContext.createBiquadFilter();
    this.rvHPF.type = 'highpass';
    this.rvHPF.frequency.value = 200;
    
    this.rv1 = audioContext.createDelay(0.2);
    this.rv2 = audioContext.createDelay(0.2);
    this.rv3 = audioContext.createDelay(0.2);
    this.rv1.delayTime.value = 0.021;
    this.rv2.delayTime.value = 0.031;
    this.rv3.delayTime.value = 0.039;
    
    this.rvFB = audioContext.createGain();
    this.rvFB.gain.value = 0.38;
    
    this.rvTone = audioContext.createBiquadFilter();
    this.rvTone.type = 'lowpass';
    this.rvTone.frequency.value = 3200;
    
    this.rvMix = audioContext.createGain();
    this.rvMix.gain.value = 0.25;
    
    // Reverb fixed connections
    this.rvSend.connect(this.rv1);
    this.rvSend.connect(this.rv2);
    this.rvSend.connect(this.rv3);
    [this.rv1, this.rv2, this.rv3].forEach(d => d.connect(this.rvTone));
    this.rvTone.connect(this.rvFB);
    this.rvFB.connect(this.rv1);
    this.rvFB.connect(this.rv2);
    this.rvFB.connect(this.rv3);
    this.rvTone.connect(this.rvHPF);
    this.rvHPF.connect(this.rvReturn);
    this.rvReturn.connect(this.rvMix);
    
    // ============================================
    // POWER AMP (2x EL84 - Class A)
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // Bad Cat Hot Cat uses tube rectifier with EL84 power tubes (Class A)
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.14,      // 14% sag (Class A EL84 sag)
      att: 0.009,       // 9ms attack (Class A feel)
      relFast: 0.08,    // 80ms fast recovery
      relSlow: 0.27,    // 270ms slow recovery (Class A breathing)
      rmsMs: 26.0,      // 26ms RMS window (Class A)
      shape: 1.6,       // Progressive (Class A EL84)
      floor: 0.25,      // 25% minimum headroom
      peakMix: 0.28     // More RMS-focused (smooth)
    });
    
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
    this.cabinetType = '2x12_closed';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER VOLUME
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING - CHANNEL 1 (DEFAULT)
    // ============================================
    this.setupChannel1();
    this.recreateCabinet();
    
    this.params = {
      channel: 1, // 1 or 2
      
      // Gain/Volume
      gain: 55,
      ch1_volume: 60,
      ch2_volume: 60,
      k_master: 70,         // drive do power (PPIMV)
      output_level: 100,    // trim final
      
      // Tone stack
      bass: 50,
      middle: 55,
      treble: 60,
      cut: 50,
      
      // Switches/Voicings
      bite: 1,              // 0/1/2
      focus: 40,            // Hz (20-160)
      ch2_mode: 'EF86',     // 'EF86' | 'ECC83'
      
      // Reverb
      reverb: 30,
      reverb_tone: 60,
      reverb_mix: 25,
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    this.disconnectAll();
    
    // Input stage: Focus -> Bite -> Channel
    this.input.connect(this.focusHPF);
    this.focusHPF.connect(this.biteShelf);
    this.biteShelf.connect(this.channel1);
    
    // Channel 1 path
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.ch1Volume);
    
    // Tone stack
    this.ch1Volume.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.harmonics);
    
    // Class A Sag -> Reverb split
    this.harmonics.connect(this.cut);
    this.cut.connect(this.classASag);
    
    // Split: dry path and reverb send
    this.classASag.connect(this.rvSend);     // reverb send
    this.classASag.connect(this.kMaster);    // dry path
    this.rvMix.connect(this.kMaster);        // wet return
    
    // Power section with K-Master (PPIMV) and sag
    if (this.powerSag) {
      this.kMaster.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.kMaster.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputLevel);
    this.outputLevel.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    this.disconnectAll();
    
    // Input stage: Focus -> Bite -> Channel
    this.input.connect(this.focusHPF);
    this.focusHPF.connect(this.biteShelf);
    this.biteShelf.connect(this.channel2);
    
    // Channel 2 path
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    
    // EF86 mode switch
    if (this.ch2Mode === 'EF86') {
      this.preamp2.connect(this.saturation2_EF86);
      this.saturation2_EF86.connect(this.ch2Volume);
      this.ch2Volume.connect(this.ch2Tilt);
      this.ch2Tilt.connect(this.bass);
    } else {
      this.preamp2.connect(this.saturation2);
      this.saturation2.connect(this.ch2Volume);
      this.ch2Volume.connect(this.bass);
    }
    
    // Tone stack
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.harmonics);
    
    // Class A Sag -> Reverb split
    this.harmonics.connect(this.cut);
    this.cut.connect(this.classASag);
    
    // Split: dry path and reverb send
    this.classASag.connect(this.rvSend);     // reverb send
    this.classASag.connect(this.kMaster);    // dry path
    this.rvMix.connect(this.kMaster);        // wet return
    
    // Power section with K-Master (PPIMV) and sag
    if (this.powerSag) {
      this.kMaster.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.kMaster.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputLevel);
    this.outputLevel.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.focusHPF.disconnect();
      this.biteShelf.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.saturation2_EF86.disconnect();
      this.ch1Volume.disconnect();
      this.ch2Volume.disconnect();
      this.ch2Tilt.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.harmonics.disconnect();
      this.cut.disconnect();
      this.classASag.disconnect();
      this.kMaster.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.outputLevel.disconnect();
      this.master.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 3;
    this.preamp2.gain.value = 1.5;
    this.channel1.gain.value = 1.0;
    this.channel2.gain.value = 1.0;
    this.powerAmp.gain.value = 1.0;
    const p = this.params;
    ['gain', 'ch1_volume', 'ch2_volume', 'k_master', 'output_level', 'bass', 'middle', 'treble', 'cut', 'bite', 'focus', 'ch2_mode', 'reverb', 'reverb_tone', 'reverb_mix', 'master', 'cabinet_enabled'].forEach(k => {
      if (p[k] != null) this.updateParameter(k, p[k]);
    });
  }

  reconnect() {
    if (this.activeChannel === 1) this.setupChannel1();
    else this.setupChannel2();
    this.recreateCabinet();
  }

  getParameters() {
    return { ...this.params };
  }
  
  makePreampCurve() {
    const samples = 16384;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = Math.tanh(x * 2.5);
      y += 0.15 * Math.tanh(x * 5);
      if (Math.abs(y) > 0.5) y *= 0.9;
      if (x > 0) y *= 1.1;
      curve[i] = Math.max(-1, Math.min(1, y * 0.87));
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 16384;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.12 * Math.sin(x * Math.PI * 3);
      y += 0.08 * Math.sin(x * Math.PI * 2);
      if (x > 0) y *= 1.12;
      curve[i] = Math.max(-1, Math.min(1, y * 0.88));
    }
    return curve;
  }
  
  makeEF86Curve() {
    const samples = 16384;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = Math.tanh(x * 3.2);
      y += 0.14 * Math.tanh(x * 6);
      if (Math.abs(y) > 0.55) y *= 0.9;
      if (x > 0) y *= 1.08;
      curve[i] = Math.max(-1, Math.min(1, y * 0.9));
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
    try { this.postCabinet.disconnect(); } catch (e) {}
    
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
      case 'channel': {
        const prevMaster = this.master.gain.value;
        this.master.gain.setTargetAtTime(0, now, 0.003);
        const ctx = this.audioContext;
        setTimeout(() => {
          if (value === 1) this.setupChannel1();
          else this.setupChannel2();
          this.master.gain.setTargetAtTime(prevMaster, ctx.currentTime, 0.02);
        }, 15);
        break;
      }
      
      // GAIN & VOLUME
      case 'gain': {
        const g = 1 + (value / 30);
        this.preamp1.gain.setTargetAtTime(g, now, 0.01);
        
        // Bad Cat touch: adjust tone response based on gain
        if (this.activeChannel === 1) {
          this.treble.frequency.setTargetAtTime(value < 40 ? 3200 : 2800, now, 0.02);
          this.middle.gain.setTargetAtTime((value < 40 ? -1 : 0) + ((this.params.middle - 50) / 6), now, 0.02);
        } else {
          // Channel 2 lead: more harmonics at high gain
          this.harmonics.gain.setTargetAtTime(value > 70 ? 5 : 4, now, 0.02);
        }
        break;
      }
      
      case 'ch1_volume':
        this.ch1Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'ch2_volume':
        this.ch2Volume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'k_master':
        this.kMaster.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'output_level':
        this.outputLevel.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // TONE STACK (±10 dB bass/treble, ±8 dB middle)
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 6, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'cut': {
        // Vox/Bad Cat-like cut: 2.5k to 12k with musical Q
        const f = 2500 + (value / 100) * 9500;
        this.cut.Q.setTargetAtTime(0.6, now, 0.01);
        this.cut.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }
      
      // INPUT STAGE
      case 'bite':
        this.bite = value; // 0/1/2
        this.biteShelf.gain.setTargetAtTime(value === 0 ? 0 : (value === 1 ? 3 : 6), now, 0.01);
        break;
      
      case 'focus':
        this.focusHPF.frequency.setTargetAtTime(Math.max(20, value), now, 0.01);
        break;
      
      // CHANNEL 2 MODE
      case 'ch2_mode':
        this.ch2Mode = value;
        if (this.activeChannel === 2) {
          this.setupChannel2(); // re-route
        }
        break;
      
      // REVERB
      case 'reverb':
        this.rvFB.gain.setTargetAtTime((value / 100) * 0.6, now, 0.01);
        break;
      
      case 'reverb_tone':
        this.rvTone.frequency.setTargetAtTime(1500 + (value / 100) * 4500, now, 0.01);
        break;
      
      case 'reverb_mix':
        this.rvMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // MASTER
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      // CABINET
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
    try {
      this.focusHPF.disconnect();
      this.biteShelf.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.saturation2_EF86.disconnect();
      this.ch1Volume.disconnect();
      this.ch2Volume.disconnect();
      this.ch2Tilt.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.harmonics.disconnect();
      this.cut.disconnect();
      this.classASag.disconnect();
      this.rvSend.disconnect();
      this.rv1.disconnect();
      this.rv2.disconnect();
      this.rv3.disconnect();
      this.rvTone.disconnect();
      this.rvFB.disconnect();
      this.rvHPF.disconnect();
      this.rvReturn.disconnect();
      this.rvMix.disconnect();
      this.kMaster.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.outputLevel.disconnect();
      this.master.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
    } catch (e) {}
  }
}

export default BadCatHotCatAmp;

