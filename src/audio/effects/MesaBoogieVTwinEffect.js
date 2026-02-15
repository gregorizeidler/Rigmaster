import BaseEffect from './BaseEffect';

class MesaBoogieVTwinEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa V-Twin', 'mesavtwin');
    
    // MESA BOOGIE V-TWIN - Legendary rack preamp
    // Dual-channel tube preamp simulation
    
    // Curve cache: step=1, 16384 samples (~6.4 KB each, ~650 KB max for 101 curves)
    this._curveCache = {};
    
    // Input gain
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Pre-drive HPF (80Hz — fuller Mesa body)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 80;
    
    // =========================================
    // CABINET SIM (channel-responsive)
    // =========================================
    // HPF — 55Hz (lower than preHPF to preserve punch)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 55;
    
    // LPF cascade — freq follows channel (clean=open, lead=tight)
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8500;
    this.postLPF.Q.value = 0.8;
    
    this.postLPF2 = audioContext.createBiquadFilter();
    this.postLPF2.type = 'lowpass';
    this.postLPF2.frequency.value = 9500;
    this.postLPF2.Q.value = 0.707;
    
    // Speaker resonance ~100Hz
    this.speakerResonance = audioContext.createBiquadFilter();
    this.speakerResonance.type = 'peaking';
    this.speakerResonance.frequency.value = 100;
    this.speakerResonance.Q.value = 1.0;
    this.speakerResonance.gain.value = 1;
    
    // Speaker bark ~2.2kHz (BEFORE notch)
    this.speakerBark = audioContext.createBiquadFilter();
    this.speakerBark.type = 'peaking';
    this.speakerBark.frequency.value = 2200;
    this.speakerBark.Q.value = 1.5;
    this.speakerBark.gain.value = 0.5;
    
    // Speaker notch — freq follows channel (clean 4.6kHz → lead 4.1kHz)
    this.speakerNotch = audioContext.createBiquadFilter();
    this.speakerNotch.type = 'peaking';
    this.speakerNotch.frequency.value = 4600;
    this.speakerNotch.Q.value = 1.6;
    this.speakerNotch.gain.value = -2;
    
    // =========================================
    // DC BLOCKERS
    // =========================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    
    this.dcBlockPost = audioContext.createBiquadFilter();
    this.dcBlockPost.type = 'highpass';
    this.dcBlockPost.frequency.value = 10;
    this.dcBlockPost.Q.value = 0.707;
    
    // Clean channel bright cap
    this.cleanBright = audioContext.createBiquadFilter();
    this.cleanBright.type = 'highshelf';
    this.cleanBright.frequency.value = 2500;
    this.cleanBright.gain.value = 0;
    
    // Anti-aliasing LPF before stage1
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 18000;
    this.antiAlias.Q.value = 0.707;
    
    // =========================================
    // DRIVE STAGES
    // =========================================
    
    // Stage 1: Input stage (12AX7)
    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._getCachedCurve(30);
    
    // ---- ENVELOPE FOLLOWER (dynamic drive) ----
    // AnalyserNode reads RMS post-stage1
    // Must be connected to a live destination (sink) to process consistently
    this.envAnalyser = audioContext.createAnalyser();
    this.envAnalyser.fftSize = 256;
    this.envAnalyser.smoothingTimeConstant = 0.5; // faster response
    this._envBuffer = new Float32Array(this.envAnalyser.fftSize);
    
    // Silent sink keeps analyser alive in the audio graph
    this.envSink = audioContext.createGain();
    this.envSink.gain.value = 0;
    
    // Dynamic drive gain: modulated by envelope (+0 to +4.6 dB)
    this.envDriveGain = audioContext.createGain();
    this.envDriveGain.gain.value = 1.0;
    
    // Start envelope polling (setInterval at 125Hz — more consistent than rAF)
    this._envActive = true;
    this._envTimer = setInterval(() => this._envPoll(), 8);
    
    // Stage 2: Gain stage (12AX7)
    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._getCachedCurve(60);
    
    // Sag compressor before stage3 (power amp sag)
    this.sagCompressor = audioContext.createDynamicsCompressor();
    this.sagCompressor.threshold.value = -14;
    this.sagCompressor.knee.value = 12;
    this.sagCompressor.ratio.value = 2.5;
    this.sagCompressor.attack.value = 0.010;
    this.sagCompressor.release.value = 0.150;
    
    // Stage 3: Power amp stage (6L6)
    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._getCachedCurve(40);
    
    // =========================================
    // EQ SECTION (Mesa "Mark" voicing)
    // =========================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 650;
    this.mid.Q.value = 1.3;
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // Presence — power amp NFB (routed before cab sim)
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // Contour (V-scoop)
    this.contour = audioContext.createBiquadFilter();
    this.contour.type = 'peaking';
    this.contour.frequency.value = 650;
    this.contour.Q.value = 1.5;
    this.contour.gain.value = 0;
    
    this.contourLow = audioContext.createBiquadFilter();
    this.contourLow.type = 'lowshelf';
    this.contourLow.frequency.value = 120;
    this.contourLow.gain.value = 0;
    
    this.contourHigh = audioContext.createBiquadFilter();
    this.contourHigh.type = 'highshelf';
    this.contourHigh.frequency.value = 3500;
    this.contourHigh.gain.value = 0;
    
    // Master volume
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    
    // Channel selector
    this.channelGain = audioContext.createGain();
    this.channelGain.gain.value = 1.0;
    
    // Track ALL params
    this.params = {
      master: 60,
      gain: 50,
      channel: 0,
      contour: 0,
    };
    
    // =========================================
    // SIGNAL CHAIN:
    // input → inputGain → channelGain → cleanBright → preHPF(80Hz)
    // → antiAlias → stage1 ─┬→ envAnalyser → envSink(0) → output (silent tap)
    //                        └→ envDriveGain → stage2
    // → dcBlock → bass → mid → treble → contourLow → contour → contourHigh
    // → sagCompressor → stage3 → dcBlockPost
    // → presence → postHPF(55Hz) → postLPF → postLPF2
    // → speakerResonance → speakerBark → speakerNotch
    // → masterGain → wetGain → output
    // =========================================
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.channelGain);
    this.channelGain.connect(this.cleanBright);
    this.cleanBright.connect(this.preHPF);
    this.preHPF.connect(this.antiAlias);
    this.antiAlias.connect(this.stage1);
    // Envelope follower: analyser tap (silent) + drive gain (signal path)
    this.stage1.connect(this.envAnalyser);
    this.envAnalyser.connect(this.envSink);
    this.envSink.connect(this.output); // keeps analyser alive in graph (gain=0, no audio leak)
    this.stage1.connect(this.envDriveGain);
    this.envDriveGain.connect(this.stage2);
    this.stage2.connect(this.dcBlock);
    this.dcBlock.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.contourLow);
    this.contourLow.connect(this.contour);
    this.contour.connect(this.contourHigh);
    this.contourHigh.connect(this.sagCompressor);
    this.sagCompressor.connect(this.stage3);
    this.stage3.connect(this.dcBlockPost);
    this.dcBlockPost.connect(this.presence);
    this.presence.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.postLPF2);
    // Cab: resonance → bark → notch
    this.postLPF2.connect(this.speakerResonance);
    this.speakerResonance.connect(this.speakerBark);
    this.speakerBark.connect(this.speakerNotch);
    this.speakerNotch.connect(this.masterGain);
    this.masterGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  // =========================================
  // ENVELOPE FOLLOWER (setInterval 125Hz → RMS → dynamic gain)
  // =========================================
  _envPoll() {
    if (!this._envActive || !this._envBuffer) return;
    
    this.envAnalyser.getFloatTimeDomainData(this._envBuffer);
    
    // RMS
    let sum = 0;
    for (let i = 0; i < this._envBuffer.length; i++) {
      sum += this._envBuffer[i] * this._envBuffer[i];
    }
    const rms = Math.sqrt(sum / this._envBuffer.length);
    
    // Smooth exponential mapping with noise floor
    // Silence stays at 1.0, loud peaks reach ~1.7 (+4.6dB)
    // Won't pin at max with typical guitar RMS (0.15-0.25)
    const floor = 0.01;
    const x = Math.max(0, rms - floor) / 0.12;      // normalize (0.12 = "loud" reference)
    const shaped = 1 - Math.exp(-3 * x);              // 0..~1 smooth exponential
    const extraGain = 1.0 + shaped * 0.7;             // 1.0..1.7 (+0 to +4.6 dB)
    
    this.envDriveGain.gain.setTargetAtTime(
      extraGain,
      this.audioContext.currentTime,
      0.005 // 5ms — responsive attack without zipper
    );
  }
  
  // =========================================
  // CURVE CACHE (step=1, 16384 samples — ~6.4KB each, ~650KB max)
  // =========================================
  _getCachedCurve(drive) {
    const key = Math.round(drive);
    if (!this._curveCache[key]) {
      this._curveCache[key] = this._makeTubeCurve(key);
    }
    return this._curveCache[key];
  }
  
  _makeTubeCurve(drive) {
    const samples = 16384;
    const curve = new Float32Array(samples);
    const driveAmount = 1 + (drive / 25);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * driveAmount;
      
      y = Math.tanh(y * 1.5);
      y += 0.1 * Math.tanh(x * driveAmount * 2);
      
      if (x > 0) {
        y *= 1.1;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  // Public API (backward compat)
  makeTubeCurve(drive) {
    return this._getCachedCurve(drive);
  }
  
  // =========================================
  // MASTER GAIN (makeup-aware)
  // =========================================
  _recalcMasterGain() {
    const now = this.audioContext.currentTime;
    const drive = this.params.gain;
    const master = this.params.master;
    const makeup = 0.8 - (drive / 100) * 0.25;
    const finalGain = (master / 100) * makeup;
    this.masterGain.gain.setTargetAtTime(finalGain, now, 0.04);
  }
  
  // =========================================
  // CAB SIM (channel-responsive)
  // =========================================
  _updateCabForChannel(t) {
    const now = this.audioContext.currentTime;
    const TC = 0.04;
    
    // LPF: Clean 8.5k/9.5k → Lead 6.5k/7k
    this.postLPF.frequency.setTargetAtTime(8500 - t * 2000, now, TC);
    this.postLPF2.frequency.setTargetAtTime(9500 - t * 2500, now, TC);
    
    // Resonance: Clean +1dB → Lead +3dB
    this.speakerResonance.gain.setTargetAtTime(1 + t * 2, now, TC);
    
    // Bark: Clean +0.5dB → Lead +2dB
    this.speakerBark.gain.setTargetAtTime(0.5 + t * 1.5, now, TC);
    
    // Notch freq: Clean 4.6kHz → Lead 4.1kHz
    this.speakerNotch.frequency.setTargetAtTime(4600 - t * 500, now, TC);
    
    // Notch depth (considers contour interaction)
    this._updateNotch(t);
  }
  
  // Notch depth: channel + contour aware
  _updateNotch(channelT) {
    const now = this.audioContext.currentTime;
    const baseNotch = -2 - (channelT || 0) * 1.5;
    const contourRelief = (this.params.contour / 100) * 1.5;
    const finalNotch = Math.min(baseNotch + contourRelief, 0);
    this.speakerNotch.gain.setTargetAtTime(finalNotch, now, 0.04);
  }
  
  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain': {
        const drive = Math.max(0, Math.min(100, value));
        this.params.gain = drive;
        this.stage2.curve = this._getCachedCurve(drive);
        const inGain = 1 + (drive / 100) * 2;
        this.inputGain.gain.setTargetAtTime(inGain, now, 0.01);
        this._recalcMasterGain();
        break;
      }
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 8.33, now, 0.01);
        break;
      case 'contour': {
        this.params.contour = value;
        const midCut = -(value / 10);
        const shelfBoost = (value / 100) * 4;
        this.contour.gain.setTargetAtTime(midCut, now, 0.01);
        this.contourLow.gain.setTargetAtTime(shelfBoost, now, 0.01);
        this.contourHigh.gain.setTargetAtTime(shelfBoost, now, 0.01);
        const channelT = Math.min(Math.max((this.params.channel || 0) / 100, 0), 1);
        this._updateNotch(channelT);
        break;
      }
      case 'master':
        this.params.master = value;
        this._recalcMasterGain();
        break;
      case 'channel': {
        const t = Math.min(Math.max(value / 100, 0), 1);
        this.params.channel = value;
        
        this.channelGain.gain.setTargetAtTime(1.0 + t * 1.0, now, 0.01);
        this.cleanBright.gain.setTargetAtTime((1 - t) * 4, now, 0.01);
        this.stage1.curve = this._getCachedCurve(30 + t * 30);
        this.stage2.curve = this._getCachedCurve(60 + t * 6);
        
        this._updateCabForChannel(t);
        break;
      }
      default:
        break;
    }
  }
  
  disconnect() {
    // Stop envelope follower
    this._envActive = false;
    if (this._envTimer) {
      clearInterval(this._envTimer);
      this._envTimer = null;
    }
    
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.channelGain.disconnect();
      this.cleanBright.disconnect();
      this.preHPF.disconnect();
      this.antiAlias.disconnect();
      this.stage1.disconnect();
      this.envAnalyser.disconnect();
      this.envSink.disconnect();
      this.envDriveGain.disconnect();
      this.stage2.disconnect();
      this.dcBlock.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.contourLow.disconnect();
      this.contour.disconnect();
      this.contourHigh.disconnect();
      this.sagCompressor.disconnect();
      this.stage3.disconnect();
      this.dcBlockPost.disconnect();
      this.presence.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.postLPF2.disconnect();
      this.speakerResonance.disconnect();
      this.speakerBark.disconnect();
      this.speakerNotch.disconnect();
      this.masterGain.disconnect();
    } catch (e) {}
    
    // Free resources
    this._curveCache = {};
    this._envBuffer = null;
  }
}

export default MesaBoogieVTwinEffect;
