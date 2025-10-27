import BaseAmp from './BaseAmp.js';

class FenderBassmanAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Bassman', 'fender_bassman');
    
    // FENDER BASSMAN 5F6-A (Tweed era - 1958)
    // THE blueprint for Marshall - used by countless blues and rock players
    // Originally designed for bass, but adopted by guitarists for its incredible breakup
    
    // ============================================
    // 4 INPUT JACKS (2 Bright, 2 Normal) with JUMPER capability
    // ============================================
    this.brightChannel = audioContext.createGain();
    this.normalChannel = audioContext.createGain();
    
    // Channel blend mixer (for "jumpered" sound)
    this.channelBlend = audioContext.createGain();
    this.brightToBlend = audioContext.createGain();
    this.normalToBlend = audioContext.createGain();
    this.brightToBlend.gain.value = 1;
    this.normalToBlend.gain.value = 0; // 0 = bright only by default
    
    // Bright cap (volume-dependent, like the real 5F6-A)
    this._brightOn = true;
    this._currentVolume = 60;
    this.brightFilter = audioContext.createBiquadFilter();
    this.brightFilter.type = 'highshelf';
    this.brightFilter.frequency.value = 3500;
    this.brightFilter.gain.value = 0; // Will be set dynamically based on volume
    
    // ============================================
    // PREAMP (12AY7 tubes - lower gain than 12AX7)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    
    // Saturation stages (tweed characteristic - gritty, compressed)
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation1.curve = this.makePreampCurve();
    this.saturation2.curve = this.makePreampCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // Cathode Follower (buffer before tone stack, like real 5F6-A)
    this.cathodeFollower = audioContext.createWaveShaper();
    this.cathodeFollower.curve = this.makeCathodeFollowerCurve();
    this.cathodeFollower.oversample = '2x';
    
    // ============================================
    // TONE STACK (Bassman tone stack - THE most copied in history)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 0.7;
    this.mid.gain.value = -3; // Slight mid scoop (Bassman signature)
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // ============================================
    // VOLUME CONTROLS
    // ============================================
    this.volume = audioContext.createGain();
    
    // ============================================
    // RECTIFIER SAG (GZ34 - musical compression)
    // ============================================
    this.rectifierSag = audioContext.createDynamicsCompressor();
    this.rectifierSag.threshold.value = -22;
    this.rectifierSag.ratio.value = 2.2;
    this.rectifierSag.attack.value = 0.004;
    this.rectifierSag.release.value = 0.12;
    
    // ============================================
    // POWER AMP (4x 6L6 tubes - Class AB push-pull)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression (6L6 sag)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 2.8;
    this.powerComp.attack.value = 0.008;
    this.powerComp.release.value = 0.12;
    
    // Presence control (NFB loop - post power amp)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 3800;
    this.presence.gain.value = 0;
    
    // ============================================
    // TWEED CHARACTER
    // ============================================
    // Tweed amps have a characteristic mid-range "honk" and gritty breakup
    this.tweedHonk = audioContext.createBiquadFilter();
    this.tweedHonk.type = 'peaking';
    this.tweedHonk.frequency.value = 750; // 750Hz honk
    this.tweedHonk.Q.value = 2;
    this.tweedHonk.gain.value = 4;
    
    // ============================================
    // CABINET SIMULATION (4x10" Jensen P10R)
    // ============================================
    this._cabinetEnabled = true;
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 65;
    this.postHPF.Q.value = 0.7;
    
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    this.postLPF.Q.value = 0.7;
    
    // Cabinet character (mid bump from 10" speakers)
    this.cabinetMid = audioContext.createBiquadFilter();
    this.cabinetMid.type = 'peaking';
    this.cabinetMid.frequency.value = 1200;
    this.cabinetMid.Q.value = 1.2;
    this.cabinetMid.gain.value = 3;
    
    // Master volume
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    this.setupRouting();
    
    this.params = {
      // Channel controls
      blend: 0, // 0=bright only, 100=normal only
      bright: 1, // Bright cap on/off
      
      // Volume
      volume: 60,
      
      // Tone stack
      bass: 55,
      treble: 65,
      presence: 50,
      
      // Cabinet
      cabinet_enabled: 1,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupRouting() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // CHANNEL JUMPER ROUTING (Classic Bassman trick)
    // ============================================
    // Both channels are always connected to input
    this.input.connect(this.brightChannel);
    this.input.connect(this.normalChannel);
    
    // Bright channel goes through bright filter
    this.brightChannel.connect(this.brightFilter);
    this.brightFilter.connect(this.brightToBlend);
    
    // Normal channel goes straight to blend
    this.normalChannel.connect(this.normalToBlend);
    
    // Both channels sum at the blend
    this.brightToBlend.connect(this.channelBlend);
    this.normalToBlend.connect(this.channelBlend);
    
    // ============================================
    // PREAMP SECTION
    // ============================================
    this.channelBlend.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // ============================================
    // CATHODE FOLLOWER -> TONE STACK
    // ============================================
    this.saturation2.connect(this.cathodeFollower);
    this.cathodeFollower.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.tweedHonk);
    
    // ============================================
    // VOLUME -> RECTIFIER SAG -> POWER AMP
    // ============================================
    this.tweedHonk.connect(this.volume);
    this.volume.connect(this.rectifierSag);
    this.rectifierSag.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // ============================================
    // PRESENCE (post power amp - NFB loop)
    // ============================================
    this.powerSaturation.connect(this.presence);
    
    // ============================================
    // CABINET SIMULATION (can be toggled)
    // ============================================
    this.presence.connect(this.master);
    
    if (this._cabinetEnabled) {
      this.master.connect(this.postHPF);
      this.postHPF.connect(this.cabinetMid);
      this.cabinetMid.connect(this.postLPF);
      this.postLPF.connect(this.output);
    } else {
      this.master.connect(this.output);
    }
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.brightChannel.disconnect();
      this.normalChannel.disconnect();
      this.brightFilter.disconnect();
      this.brightToBlend.disconnect();
      this.normalToBlend.disconnect();
      this.channelBlend.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.cathodeFollower.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.tweedHonk.disconnect();
      this.volume.disconnect();
      this.rectifierSag.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.presence.disconnect();
      this.master.disconnect();
      this.postHPF.disconnect();
      this.cabinetMid.disconnect();
      this.postLPF.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (12AY7 - lower gain than 12AX7)
    // ============================================
    this.preamp1.gain.value = 3.8; // Lower gain than 12AX7
    this.preamp2.gain.value = 1.4;
    
    // ============================================
    // CHANNELS
    // ============================================
    this.brightChannel.gain.value = 1.0;
    this.normalChannel.gain.value = 1.0;
    
    // ============================================
    // VOLUME
    // ============================================
    this.volume.gain.value = 0.6;
    this.updateBrightCapGain(); // Set initial bright cap gain based on volume
    
    // ============================================
    // POWER AMP (4x 6L6)
    // ============================================
    this.powerAmp.gain.value = 1.3;
    
    // ============================================
    // MASTER (logarithmic curve for better control)
    // ============================================
    const log01 = v => 0.001 * Math.pow(1000, v);
    this.master.gain.value = log01(0.7);
  }
  
  // Helper function: Bright cap gain depends on volume (more at low volume)
  brightDbFor(volumePercent) {
    return (1 - volumePercent / 100) * 8; // Up to +8dB at low volume, 0 at max
  }
  
  updateBrightCapGain() {
    const now = this.audioContext.currentTime;
    const brightGain = this._brightOn ? this.brightDbFor(this._currentVolume) : 0;
    this.brightFilter.gain.setTargetAtTime(brightGain, now, 0.02);
  }
  
  makeCathodeFollowerCurve() {
    // Cathode follower: almost linear buffer, very subtle compression
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * 2 - 1;
      curve[i] = Math.tanh(x * 1.2) * 0.98; // Very gentle, almost unity gain
    }
    return curve;
  }
  
  makePreampCurve() {
    // 12AY7 tubes - lower gain than 12AX7, with tweed "bark"
    const n = 44100;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // 12AY7: lower gain factor
      let y = Math.tanh(x * 2.1);
      
      // Tweed "bark" - midrange emphasis
      y += 0.10 * Math.tanh(x * 4.5);
      
      // Earlier compression (tweed characteristic)
      if (Math.abs(y) > 0.35) {
        y *= 0.94;
      }
      
      // Slight asymmetry (Class A single-ended)
      if (x > 0) y *= 1.06;
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    // 4x 6L6 tubes in Class AB push-pull, with light NFB
    const n = 44100;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // 6L6 Class AB characteristic
      let y = Math.tanh(x * 1.45);
      
      // Soft clipping when pushed (NFB reduces distortion)
      if (Math.abs(y) > 0.55) {
        const excess = Math.abs(y) - 0.55;
        y = Math.sign(y) * (0.55 + excess * 0.55);
      }
      
      // 6L6 "punch" - tight low end
      y += 0.07 * Math.tanh(x * 3);
      
      // Slight asymmetry (less than preamp due to push-pull + NFB)
      if (x > 0) y *= 1.04;
      
      curve[i] = y * 0.9;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // CHANNEL BLEND (Jumper)
      // ============================================
      case 'blend': {
        // 0 = bright only, 100 = normal only, 50 = equal mix
        const t = value / 100;
        this.brightToBlend.gain.setTargetAtTime(1 - t, now, 0.01);
        this.normalToBlend.gain.setTargetAtTime(t, now, 0.01);
        break;
      }
      
      // ============================================
      // BRIGHT CAP TOGGLE
      // ============================================
      case 'bright':
        this._brightOn = !!value;
        this.updateBrightCapGain();
        break;
      
      // ============================================
      // VOLUME (also affects bright cap gain)
      // ============================================
      case 'volume':
      case 'gain': {
        this._currentVolume = value;
        this.volume.gain.setTargetAtTime(value / 100, now, 0.01);
        // Update bright cap gain based on new volume
        this.updateBrightCapGain();
        break;
      }
      
      // ============================================
      // TONE STACK
      // ============================================
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ============================================
      // CABINET TOGGLE
      // ============================================
      case 'cabinet_enabled':
        this._cabinetEnabled = !!value;
        this.setupRouting(); // Re-route to enable/disable cabinet
        break;
      
      // ============================================
      // MASTER (logarithmic curve)
      // ============================================
      case 'master': {
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.master.gain.setTargetAtTime(log01(value / 100), now, 0.01);
        break;
      }
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    // Disconnect all nodes
    this.brightChannel.disconnect();
    this.normalChannel.disconnect();
    this.brightFilter.disconnect();
    this.brightToBlend.disconnect();
    this.normalToBlend.disconnect();
    this.channelBlend.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.cathodeFollower.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.tweedHonk.disconnect();
    this.volume.disconnect();
    this.rectifierSag.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.presence.disconnect();
    this.postHPF.disconnect();
    this.cabinetMid.disconnect();
    this.postLPF.disconnect();
    this.master.disconnect();
  }
}

export default FenderBassmanAmp;

