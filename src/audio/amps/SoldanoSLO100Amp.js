import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class SoldanoSLO100Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Soldano SLO-100', 'soldano_slo100');
    
    // SOLDANO SLO-100 (Super Lead Overdrive)
    // THE original modern high-gain - Michael Soldano's masterpiece
    // Used by Eric Clapton, Mark Tremonti, Gary Moore, Lou Reed
    // Influenced every high-gain amp that came after
    
    // ============================================
    // NOISE GATE (before preamp, hi-gain essential)
    // ============================================
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -52; // dB
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20; // High ratio for gating
    this.noiseGate.attack.value = 0.001; // Fast attack
    this.noiseGate.release.value = 0.08; // Discrete gate
    this.gateEnabled = true;
    
    // ============================================
    // 2 CHANNELS with CROSSFADE (pop-free switching)
    // ============================================
    this.normalChannel = audioContext.createGain();
    this.overdriveChannel = audioContext.createGain();
    this.normalChannelGain = audioContext.createGain();
    this.overdriveChannelGain = audioContext.createGain();
    this.channelMixer = audioContext.createGain();
    
    // ============================================
    // PREAMP (Cascading gain stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    this.preamp4 = audioContext.createGain();
    
    // Saturation stages with unique characteristics per stage
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    this.saturation4 = audioContext.createWaveShaper();
    
    // Stage-specific saturation curves
    this.saturation1.curve = this.makePreampCurve({drive: 5.5, asym: 1.05, mix: 0.9});
    this.saturation2.curve = this.makePreampCurve({drive: 6.5, asym: 1.08, mix: 0.88});
    this.saturation3.curve = this.makePreampCurve({drive: 8.2, asym: 1.15, cold: true, mix: 0.85}); // COLD CLIPPER
    this.saturation4.curve = this.makePreampCurve({drive: 6.8, asym: 1.10, mix: 0.86});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    this.saturation4.oversample = '4x';
    
    // ============================================
    // SLO "COLD CLIPPER" HPF (before 3rd stage)
    // ============================================
    this.hpfTight = audioContext.createBiquadFilter();
    this.hpfTight.type = 'highpass';
    this.hpfTight.frequency.value = 90; // Tight low-end before cold stage
    this.hpfTight.Q.value = 0.707;
    
    // ============================================
    // TONE STACK (Modified Marshall)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 700;
    this.middle.Q.value = 1.5;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // ============================================
    // SOLDANO CHARACTERISTIC "SMOOTH" HIGH GAIN
    // ============================================
    this.smoothFilter = audioContext.createBiquadFilter();
    this.smoothFilter.type = 'peaking';
    this.smoothFilter.frequency.value = 2000;
    this.smoothFilter.Q.value = 1.5;
    this.smoothFilter.gain.value = 3; // Adds upper-mid presence
    
    // ============================================
    // PRE-POWER LPF (tames fizz at high volumes)
    // ============================================
    this.prePowerLPF = audioContext.createBiquadFilter();
    this.prePowerLPF.type = 'lowpass';
    this.prePowerLPF.frequency.value = 8000;
    this.prePowerLPF.Q.value = 0.707;
    
    // ============================================
    // POWER AMP (4x 5881 or 6L6 tubes)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -12;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 4;
    this.powerComp.attack.value = 0.006;
    this.powerComp.release.value = 0.1;
    
    // ============================================
    // DC BLOCKER (before cabinet IR)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET IR (4×12 with V30 speakers)
    // ============================================
    this.cabIR = audioContext.createConvolver();
    this.cabBypass = audioContext.createGain();
    this.cabEnabled = true;
    this.loadDefaultCabinetIR();
    
    // ============================================
    // PRESENCE & DEPTH (POST-IR for realism)
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    this.depth = audioContext.createBiquadFilter();
    this.depth.type = 'lowshelf';
    this.depth.frequency.value = 100;
    this.depth.gain.value = 0;
    
    // ============================================
    // BRIGHT SWITCH (Normal channel, volume-dependent)
    // ============================================
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 2000;
    this.brightFilter.gain.value = 4;
    this.brightEnabled = false;
    
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
    // MASTER VOLUMES (Preamp & Master)
    // ============================================
    this.preampMaster = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMS (MUST BE BEFORE SETUP!)
    // ============================================
    this.params = {
      channel: 1, // 0=normal, 1=overdrive
      
      // Gain/Volume
      preamp_gain: 75,
      master_gain: 70,
      
      // Tone stack
      bass: 60,
      middle: 55,
      treble: 70,
      presence: 65,
      depth: 55,
      
      // Master
      master: 70,
      
      // Switches
      bright: false,
      gate: true,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '4x12_vintage',
      microphone: 'sm57',
      micPosition: 'edge'
    };
    
    // ============================================
    // ROUTING - Setup both channels, crossfade
    // ============================================
    this.setupChannels();
    this.setActiveChannel('overdrive');
    this.applyInitialSettings();
    this.recreateCabinet();
  }
  
  /**
   * Setup both channels in parallel for pop-free switching
   */
  setupChannels() {
    // NORMAL CHANNEL PATH (2 stages)
    if (this.gateEnabled) {
      this.input.connect(this.noiseGate);
      this.noiseGate.connect(this.normalChannel);
    } else {
      this.input.connect(this.normalChannel);
    }
    
    // Bright switch on normal channel
    if (this.brightEnabled) {
      this.normalChannel.connect(this.brightFilter);
      this.brightFilter.connect(this.preamp1);
    } else {
      this.normalChannel.connect(this.preamp1);
    }
    
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.normalChannelGain);
    
    // OVERDRIVE CHANNEL PATH (4 cascading stages)
    if (this.gateEnabled) {
      if (!this.input.isConnected) {
        this.input.connect(this.noiseGate);
      }
      this.noiseGate.connect(this.overdriveChannel);
    } else {
      this.input.connect(this.overdriveChannel);
    }
    
    this.overdriveChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    // COLD CLIPPER section (SLO signature)
    this.saturation2.connect(this.hpfTight);
    this.hpfTight.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.preamp4);
    this.preamp4.connect(this.saturation4);
    this.saturation4.connect(this.overdriveChannelGain);
    
    // Mix channels
    this.normalChannelGain.connect(this.channelMixer);
    this.overdriveChannelGain.connect(this.channelMixer);
    
    // Shared tone stack
    this.channelMixer.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.smoothFilter);
    this.smoothFilter.connect(this.prePowerLPF);
    this.prePowerLPF.connect(this.preampMaster);
    
    // Power section
    this.preampMaster.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet (can be bypassed)
    if (this.cabEnabled) {
      this.dcBlock.connect(this.cabIR);
      this.cabIR.connect(this.presence);
    } else {
      this.dcBlock.connect(this.cabBypass);
      this.cabBypass.connect(this.presence);
    }
    
    // Presence/Depth POST-IR (authentic SLO behavior)
    this.presence.connect(this.depth);
    this.depth.connect(this.master);
    this.master.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.output);
  }
  
  /**
   * Crossfade between channels (pop-free switching)
   */
  setActiveChannel(channel) {
    const now = this.audioContext.currentTime;
    const fadeTime = 0.020; // 20ms crossfade
    
    if (channel === 'normal') {
      this.normalChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.overdriveChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.activeChannel = 'normal';
    } else {
      this.normalChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.overdriveChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.activeChannel = 'overdrive';
    }
  }
  
  reconnectChannels() {
    this.disconnectAll();
    this.setupChannels();
    this.setActiveChannel(this.activeChannel);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.normalChannel.disconnect();
      this.overdriveChannel.disconnect();
      this.brightFilter.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.hpfTight.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.preamp4.disconnect();
      this.saturation4.disconnect();
      this.normalChannelGain.disconnect();
      this.overdriveChannelGain.disconnect();
      this.channelMixer.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.smoothFilter.disconnect();
      this.prePowerLPF.disconnect();
      this.preampMaster.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabIR.disconnect();
      this.cabBypass.disconnect();
      this.presence.disconnect();
      this.depth.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 10;
    this.preamp2.gain.value = 2;
    this.preamp3.gain.value = 1.6;
    this.preamp4.gain.value = 1.4;
    this.normalChannel.gain.value = 0.6;
    this.overdriveChannel.gain.value = 1.0;
    this.preampMaster.gain.value = 0.75;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
    this.cabBypass.gain.value = 1.0;
  }
  
  /**
   * Stage-specific preamp curve with SLO characteristics
   * @param {Object} options - drive, asym(metry), cold(clipper), mix
   */
  makePreampCurve({drive=7, asym=1.1, cold=false, mix=0.85} = {}) {
    const N = 44100;
    const c = new Float32Array(N);
    
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      const xOff = cold ? (x + 0.08) : x; // Offset for "cold" asymmetry
      
      // SOLDANO "SMOOTH" HIGH GAIN
      let y = Math.tanh(xOff * drive);
      
      // SMOOTH COMPRESSION (Soldano signature)
      if (Math.abs(y) > 0.5) {
        y *= 1 - (Math.abs(y) - 0.5) * 0.30;
      }
      
      // SINGING SUSTAIN
      y += 0.12 * Math.tanh(xOff * 10);
      y += 0.08 * Math.tanh(xOff * 6);
      
      // Asymmetry
      y *= xOff > 0 ? asym : 1 / asym;
      
      c[i] = y * mix;
    }
    return c;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x 5881 POWER TUBES (6L6 family)
      let y = Math.tanh(x * 1.6);
      
      // 5881 compression (tight but musical)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.5);
      }
      
      // SOLDANO DEPTH (low-end punch)
      y += 0.08 * Math.tanh(x * 3);
      
      // Smooth highs
      y += 0.06 * Math.sin(x * Math.PI * 6);
      
      if (x > 0) y *= 1.12;
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  /**
   * Logarithmic scaling for musical control response
   */
  lin2log(value01) {
    return 0.001 * Math.pow(1000, value01); // ~-60dB to 0dB
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
        this.setActiveChannel(value === 0 ? 'normal' : 'overdrive');
        break;
      
      case 'preamp_gain':
      case 'gain': {
        const g = this.lin2log(value / 100) * 18; // Musical gain scaling
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.55), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.28), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.22), now, 0.01);
        this.preamp4.gain.setTargetAtTime(Math.max(1, g * 0.18), now, 0.01);
        break;
      }
      
      case 'master_gain':
        this.preampMaster.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
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
      
      case 'depth':
        this.depth.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      case 'bright':
        this.brightEnabled = value;
        this.reconnectChannels();
        break;
      
      case 'gate':
        this.gateEnabled = value;
        this.reconnectChannels();
        break;
      
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
  
  /**
   * Load default 4×12 V30 cabinet IR
   */
  loadDefaultCabinetIR() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.045; // 45ms - SLO characteristic cabinet response
    const length = Math.floor(duration * sampleRate);
    
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // SLO-100 signature 4×12 V30 cabinet
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Medium decay for powerful low-end
      const decay = Math.exp(-t / 0.010); // 10ms decay
      
      // Early reflections (large closed-back cabinet)
      const early = i < sampleRate * 0.003 ? Math.random() * 0.35 : 0;
      
      // Main impulse
      let sample = (Math.random() * 2 - 1) * decay;
      sample += early * decay;
      
      // V30 speaker response (aggressive mids, controlled highs)
      if (i > 0) {
        const alpha = 0.72; // Smoother than typical metal cab
        sample = alpha * sample + (1 - alpha) * channelData[i - 1];
      }
      
      // Emphasize 2-4kHz region (V30 character) but not harsh
      if (i > sampleRate * 0.002 && i < sampleRate * 0.006) {
        sample *= 1.12;
      }
      
      // SLO "smooth" character - slight dip at 5-7kHz
      if (i > sampleRate * 0.005 && i < sampleRate * 0.012) {
        sample *= 0.92;
      }
      
      channelData[i] = sample * 0.88;
    }
    
    // Normalize
    let maxVal = 0;
    for (let i = 0; i < length; i++) {
      maxVal = Math.max(maxVal, Math.abs(channelData[i]));
    }
    if (maxVal > 0) {
      for (let i = 0; i < length; i++) {
        channelData[i] /= maxVal;
      }
    }
    
    this.cabIR.buffer = buffer;
    console.log('✅ Soldano SLO-100: Default 4×12 V30 cabinet IR loaded (45ms)');
  }
  
  /**
   * Load custom IR file
   */
  async loadIR(irData) {
    try {
      let audioData;
      
      if (typeof irData === 'string') {
        const response = await fetch(irData);
        audioData = await response.arrayBuffer();
      } else {
        audioData = irData;
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      this.cabIR.buffer = audioBuffer;
      
      console.log(`✅ Soldano SLO-100: Custom cabinet IR loaded (${audioBuffer.duration.toFixed(3)}s)`);
      return true;
    } catch (error) {
      console.error('Error loading cabinet IR:', error);
      return false;
    }
  }
  
  disconnect() {
    super.disconnect();
    this.noiseGate.disconnect();
    this.normalChannel.disconnect();
    this.overdriveChannel.disconnect();
    this.brightFilter.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.hpfTight.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.preamp4.disconnect();
    this.saturation4.disconnect();
    this.normalChannelGain.disconnect();
    this.overdriveChannelGain.disconnect();
    this.channelMixer.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.smoothFilter.disconnect();
    this.prePowerLPF.disconnect();
    this.preampMaster.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.cabIR.disconnect();
    this.cabBypass.disconnect();
    this.presence.disconnect();
    this.depth.disconnect();
    this.master.disconnect();
  }
}

export default SoldanoSLO100Amp;
