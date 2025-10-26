import BaseAmp from './BaseAmp.js';

class MesaMarkVAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Boogie Mark V', 'mesa_mark_v');
    
    // MESA BOOGIE MARK V
    // THE most versatile high-gain amp ever made
    // Used by Dream Theater, Metallica, Megadeth
    // 3 CHANNELS × 3 MODES = 9 distinct voices
    
    // ============================================
    // 3 CHANNELS (each with 3 modes)
    // ============================================
    this.channel1 = audioContext.createGain(); // Clean/Fat/Tweed
    this.channel2 = audioContext.createGain(); // Edge/Crunch/Mark I
    this.channel3 = audioContext.createGain(); // Mark IIC+/Mark IV/Extreme
    
    // Active channel & mode
    this.activeChannel = 3; // 1, 2, 3
    this.channel1Mode = 'clean'; // 'clean', 'fat', 'tweed'
    this.channel2Mode = 'crunch'; // 'edge', 'crunch', 'mark_i'
    this.channel3Mode = 'iic+'; // 'iic+', 'mark_iv', 'extreme'
    
    // ============================================
    // PREAMP (5 cascading 12AX7 stages)
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
    
    this.saturation1.curve = this.makeMesaPreampCurve();
    this.saturation2.curve = this.makeMesaPreampCurve();
    this.saturation3.curve = this.makeMesaPreampCurve();
    this.saturation4.curve = this.makeMesaPreampCurve();
    this.saturation5.curve = this.makeMesaPreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    this.saturation5.oversample = '4x';
    
    // ============================================
    // MARK SERIES TONE STACK (Active EQ)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // ============================================
    // MARK SERIES GRAPHIC EQ (5-band)
    // ============================================
    this.graphicEQ = [
      audioContext.createBiquadFilter(), // 80Hz
      audioContext.createBiquadFilter(), // 240Hz
      audioContext.createBiquadFilter(), // 750Hz
      audioContext.createBiquadFilter(), // 2200Hz
      audioContext.createBiquadFilter()  // 6600Hz
    ];
    
    this.graphicEQ[0].type = 'peaking';
    this.graphicEQ[0].frequency.value = 80;
    this.graphicEQ[0].Q.value = 1.0;
    this.graphicEQ[0].gain.value = 0;
    
    this.graphicEQ[1].type = 'peaking';
    this.graphicEQ[1].frequency.value = 240;
    this.graphicEQ[1].Q.value = 1.0;
    this.graphicEQ[1].gain.value = 0;
    
    this.graphicEQ[2].type = 'peaking';
    this.graphicEQ[2].frequency.value = 750;
    this.graphicEQ[2].Q.value = 1.0;
    this.graphicEQ[2].gain.value = 0;
    
    this.graphicEQ[3].type = 'peaking';
    this.graphicEQ[3].frequency.value = 2200;
    this.graphicEQ[3].Q.value = 1.0;
    this.graphicEQ[3].gain.value = 0;
    
    this.graphicEQ[4].type = 'peaking';
    this.graphicEQ[4].frequency.value = 6600;
    this.graphicEQ[4].Q.value = 1.0;
    this.graphicEQ[4].gain.value = 0;
    
    // ============================================
    // MARK SERIES "V-CURVE" (Signature scoop)
    // ============================================
    this.vCurve = audioContext.createBiquadFilter();
    this.vCurve.type = 'peaking';
    this.vCurve.frequency.value = 650;
    this.vCurve.Q.value = 2.0;
    this.vCurve.gain.value = -6; // Mid scoop
    
    // ============================================
    // POWER AMP (4x 6L6 or 2x EL34 - Simul-Class)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Simul-Class compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -12;
    this.powerComp.knee.value = 10;
    this.powerComp.ratio.value = 4;
    this.powerComp.attack.value = 0.005;
    this.powerComp.release.value = 0.08;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelMaster = audioContext.createGain();
    this.outputMaster = audioContext.createGain();
    
    // ============================================
    // VARIAC POWER (90W / 45W / 10W)
    // ============================================
    this.variacPower = 90; // 90, 45, 10
    
    // ============================================
    // ROUTING - CHANNEL 3, MODE IIC+ (DEFAULT)
    // ============================================
    this.setupChannel3();
    
    this.params = {
      channel: 3, // 1, 2, 3
      mode: 'iic+', // depends on channel
      
      // Gain/Volume
      gain: 70,
      channel_master: 70,
      
      // Tone stack
      bass: 60,
      middle: 50,
      treble: 70,
      presence: 65,
      
      // Graphic EQ
      eq_80: 50,
      eq_240: 50,
      eq_750: 50,
      eq_2200: 50,
      eq_6600: 50,
      
      // Power
      variac_power: 90,
      
      // Output Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupChannel1() {
    // CHANNEL 1 - CLEAN/FAT/TWEED (2 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel1);
    this.channel1.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Graphic EQ chain
    this.presence.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
    
    this.activeChannel = 1;
  }
  
  setupChannel2() {
    // CHANNEL 2 - EDGE/CRUNCH/MARK I (3 gain stages)
    this.disconnectAll();
    
    this.input.connect(this.channel2);
    this.channel2.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Graphic EQ chain
    this.presence.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
    
    this.activeChannel = 2;
  }
  
  setupChannel3() {
    // CHANNEL 3 - IIC+/MARK IV/EXTREME (5 gain stages)
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
    this.saturation4.connect(this.preamp5);
    this.preamp5.connect(this.saturation5);
    this.saturation5.connect(this.vCurve);
    this.vCurve.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.presence);
    
    // Graphic EQ chain
    this.presence.connect(this.graphicEQ[0]);
    this.graphicEQ[0].connect(this.graphicEQ[1]);
    this.graphicEQ[1].connect(this.graphicEQ[2]);
    this.graphicEQ[2].connect(this.graphicEQ[3]);
    this.graphicEQ[3].connect(this.graphicEQ[4]);
    
    this.graphicEQ[4].connect(this.channelMaster);
    this.channelMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.outputMaster);
    this.outputMaster.connect(this.output);
    
    this.activeChannel = 3;
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.channel3.disconnect();
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
      this.vCurve.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.graphicEQ.forEach(eq => eq.disconnect());
      this.channelMaster.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.outputMaster.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 12;
    this.preamp2.gain.value = 2.2;
    this.preamp3.gain.value = 1.7;
    this.preamp4.gain.value = 1.4;
    this.preamp5.gain.value = 1.2;
    this.channel1.gain.value = 0.6;
    this.channel2.gain.value = 0.8;
    this.channel3.gain.value = 1.0;
    this.channelMaster.gain.value = 0.7;
    this.powerAmp.gain.value = 1.1;
    this.outputMaster.gain.value = 0.7;
  }
  
  makeMesaPreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // MESA "TIGHT" COMPRESSION
      let y = Math.tanh(x * 6.5);
      
      // AGGRESSIVE CLIPPING
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.4;
        y *= compression;
      }
      
      // MARK SERIES CLARITY
      y += 0.12 * Math.tanh(x * 10);
      
      // Upper-mid aggression
      y += 0.15 * Math.tanh(x * 8);
      
      // Slight asymmetry
      if (x > 0) y *= 1.12;
      
      curve[i] = y * 0.84;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // SIMUL-CLASS (Class A + Class AB hybrid)
      let y = Math.tanh(x * 1.65);
      
      // 6L6 PUNCH
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.5);
      }
      
      // LOW-END TIGHTNESS
      y += 0.1 * Math.tanh(x * 3);
      
      // MESA AGGRESSION
      y += 0.1 * Math.tanh(x * 9);
      
      // Asymmetry
      if (x > 0) y *= 1.15;
      
      curve[i] = y * 0.87;
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
        }
        break;
      
      case 'mode':
        // Store mode for current channel
        if (this.activeChannel === 1) {
          this.channel1Mode = value;
        } else if (this.activeChannel === 2) {
          this.channel2Mode = value;
        } else if (this.activeChannel === 3) {
          this.channel3Mode = value;
        }
        break;
      
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 6), now, 0.01);
        break;
      
      case 'channel_master':
        this.channelMaster.gain.setTargetAtTime(value / 100, now, 0.01);
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
      
      case 'eq_80':
        this.graphicEQ[0].gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'eq_240':
        this.graphicEQ[1].gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'eq_750':
        this.graphicEQ[2].gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'eq_2200':
        this.graphicEQ[3].gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'eq_6600':
        this.graphicEQ[4].gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      
      case 'variac_power':
        this.variacPower = value;
        // Adjust power amp gain based on power setting
        if (value === 90) {
          this.powerAmp.gain.setTargetAtTime(1.1, now, 0.01);
        } else if (value === 45) {
          this.powerAmp.gain.setTargetAtTime(0.9, now, 0.01);
        } else if (value === 10) {
          this.powerAmp.gain.setTargetAtTime(0.6, now, 0.01);
        }
        break;
      
      case 'master':
        this.outputMaster.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.channel3.disconnect();
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
    this.vCurve.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.presence.disconnect();
    this.graphicEQ.forEach(eq => eq.disconnect());
    this.channelMaster.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.outputMaster.disconnect();
  }
}

export default MesaMarkVAmp;

