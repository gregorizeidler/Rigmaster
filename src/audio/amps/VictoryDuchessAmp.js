import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Victory Duchess Amp — WebAudio boutique amp sim V2
 *
 * Upgrades vs. v1:
 * - True channel crossfade (smooth) + better bias matching
 * - Bright cap emulation tied to channel volume (RC shelf that fades with gain)
 * - Power-supply SAG envelope (attack/release) hitting pre/power stages
 * - Tight input HPF + anti-DC + soft limiter safety
 * - Presence/Resonance refined (post-IR) + real headroom-feel with master
 * - Cabinet IR: default synthetic mono IR + async loadIR(ir)
 * - Gate (per-channel) + output limiter
 * - Presets (Vintage Crunch / Modern Rhythm / Glass Clean)
 * - getParameters() for UI sync
 */
class VictoryDuchessAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Victory Duchess', 'victory_duchess');

    // ==========================
    // INPUT / SAFETY FRONT-END
    // ==========================
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 45; // remove sub-bass rumble
    this.inputHPF.Q.value = 0.707;

    this.inTrim = audioContext.createGain();
    this.inTrim.gain.value = 1.0;

    // ==========================
    // CHANNELS (Low/High gain)
    // ==========================
    this.channel1 = audioContext.createGain(); // Low Gain
    this.channel2 = audioContext.createGain(); // High Gain

    // Crossfade (no pops)
    this.ch1Xfade = audioContext.createGain();
    this.ch2Xfade = audioContext.createGain();
    this.ch1Xfade.gain.value = 0; // start on ch2 by default
    this.ch2Xfade.gain.value = 1;
    this.activeChannel = 2;

    // --- Channel 1 (2 stages)
    this.ch1_pre1 = audioContext.createGain();
    this.ch1_sat1 = audioContext.createWaveShaper();
    this.ch1_pre2 = audioContext.createGain();
    this.ch1_sat2 = audioContext.createWaveShaper();
    this._configPreShape(this.ch1_sat1, { drive: 4.6, asym: 1.03 });
    this._configPreShape(this.ch1_sat2, { drive: 5.2, asym: 1.06 });

    // --- Channel 2 (3 stages + gate)
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -52;
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20;
    this.noiseGate.attack.value = 0.001;
    this.noiseGate.release.value = 0.08;

    this.ch2_pre1 = audioContext.createGain();
    this.ch2_sat1 = audioContext.createWaveShaper();
    this.ch2_pre2 = audioContext.createGain();
    this.ch2_sat2 = audioContext.createWaveShaper();
    this.ch2_pre3 = audioContext.createGain();
    this.ch2_sat3 = audioContext.createWaveShaper();
    this._configPreShape(this.ch2_sat1, { drive: 4.6, asym: 1.03 });
    this._configPreShape(this.ch2_sat2, { drive: 5.2, asym: 1.06 });
    this._configPreShape(this.ch2_sat3, { drive: 5.8, asym: 1.09 });

    // ==========================
    // BRIGHT CAP (per-channel vol dependent)
    // ==========================
    // RC highshelf that fades out as Channel Volume increases
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2500;
    this.brightCap.gain.value = 0; // dynamic in updateParameter('channel_volume')

    // ==========================
    // TONE STACK + VOICING
    // ==========================
    this.voicingFilter = audioContext.createBiquadFilter();
    this.voicingFilter.type = 'peaking';
    this.voicingFilter.frequency.value = 650; // modern default
    this.voicingFilter.Q.value = 1.8;
    this.voicingFilter.gain.value = -3;
    this.voicing = 'modern';

    this.bass = audioContext.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 110;
    this.bass.gain.value = 0;

    this.middle = audioContext.createBiquadFilter();
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.4;
    this.middle.gain.value = 0;

    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2700;
    this.treble.gain.value = 0;

    // ==========================
    // POWER (KT77 style) + SAG + COMP
    // ==========================
    this.sagEnv = audioContext.createGain();
    this.sagEnv.gain.value = 1.0; // multiplies signal pre-power

    // POWER SUPPLY SAG - AUDIOWORKLET (tube rectifier)
    // Victory Duchess uses EL34 tubes with tube rectifier
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.12,      // 12% sag (Victory character)
      att: 0.007,       // 7ms attack
      relFast: 0.07,    // 70ms fast recovery
      relSlow: 0.24,    // 240ms slow recovery
      rmsMs: 21.0,      // 21ms RMS window
      shape: 1.5,       // Progressive (modern EL34)
      floor: 0.27,      // 27% minimum headroom
      peakMix: 0.30     // Balanced peak/RMS
    });
    
    // Power compression (fallback/additional dynamics)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -20;
    this.powerComp.knee.value = 6;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.007;
    this.powerComp.release.value = 0.11;

    this.powerGain = audioContext.createGain();
    this.powerGain.gain.value = 1.08;

    this.powerSat = audioContext.createWaveShaper();
    this.powerSat.oversample = '4x';
    this.powerSat.curve = this._makePowerCurve();

    // ==========================
    // CAB IR + POST EQ + LIMITER
    // ==========================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

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

    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4800;

    this.resonance = audioContext.createBiquadFilter();
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 85;

    // Soft limiter safety
    this.outLimiter = audioContext.createDynamicsCompressor();
    this.outLimiter.threshold.value = -1.5;
    this.outLimiter.knee.value = 0;
    this.outLimiter.ratio.value = 20;
    this.outLimiter.attack.value = 0.001;
    this.outLimiter.release.value = 0.08;

    // Volumes
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();

    // ==========================
    // ROUTING
    // ==========================
    this._setupGraph();

    // ==========================
    // DEFAULT PARAMS
    // ==========================
    this.params = {
      channel: 2,
      gain: 65,
      channel_volume: 70,
      bass: 55,
      middle: 60,
      treble: 65,
      presence: 60,
      resonance: 50,
      voicing: 'modern',
      master: 70,
      cabinet_enabled: true,
      gate: 15, // 0..100
    };

    this._applyInitials();
    this.recreateCabinet();
  }

  // ==========================================
  // GRAPH SETUP
  // ==========================================
  _setupGraph() {
    const ac = this.audioContext;

    // Input
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.inTrim);

    // Channel 1
    this.inTrim.connect(this.channel1);
    this.channel1.connect(this.ch1_pre1);
    this.ch1_pre1.connect(this.ch1_sat1);
    this.ch1_sat1.connect(this.ch1_pre2);
    this.ch1_pre2.connect(this.ch1_sat2);
    this.ch1_sat2.connect(this.ch1Xfade);

    // Channel 2
    this.inTrim.connect(this.channel2);
    this.channel2.connect(this.noiseGate);
    this.noiseGate.connect(this.ch2_pre1);
    this.ch2_pre1.connect(this.ch2_sat1);
    this.ch2_sat1.connect(this.ch2_pre2);
    this.ch2_pre2.connect(this.ch2_sat2);
    this.ch2_sat2.connect(this.ch2_pre3);
    this.ch2_pre3.connect(this.ch2_sat3);
    this.ch2_sat3.connect(this.ch2Xfade);

    // Mix crossfades
    this.mixer = ac.createGain();
    this.ch1Xfade.connect(this.mixer);
    this.ch2Xfade.connect(this.mixer);

    // Bright cap (before tone stack, reacts to channel volume)
    this.mixer.connect(this.brightCap);

    // Tone + voicing
    this.brightCap.connect(this.voicingFilter);
    this.voicingFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.channelVolume);

    // SAG (pre-power) & power comp/sat
    this.channelVolume.connect(this.sagEnv);
    if (this.powerSag) {
      this.sagEnv.connect(this.powerSag);
      this.powerSag.connect(this.powerComp);
    } else {
      this.sagEnv.connect(this.powerComp);
    }
    this.powerComp.connect(this.powerGain);
    this.powerGain.connect(this.powerSat);

    // DC block → cabinet → post-EQ → limiter → master
    this.powerSat.connect(this.dcBlock);
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.outLimiter);
    this.outLimiter.connect(this.master);

    // Output
    this.master.connect(this.output);
  }

  // ==========================================
  // CURVES / IR
  // ==========================================
  _configPreShape(node, { drive, asym }) {
    node.oversample = '4x';
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = Math.tanh(x * drive);
      if (Math.abs(y) > 0.55) {
        const comp = 1 - (Math.abs(y) - 0.55) * 0.28;
        y *= comp;
      }
      y += 0.09 * Math.sin(x * Math.PI * 3);
      y += 0.1 * Math.tanh(x * 9);
      y += 0.08 * Math.tanh(x * 6);
      y *= x > 0 ? asym : 1 / asym;
      curve[i] = y * 0.88;
    }
    node.curve = curve;
  }

  _makePowerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = Math.tanh(x * 1.58);
      if (Math.abs(y) > 0.62) {
        const excess = Math.abs(y) - 0.62;
        y = Math.sign(y) * (0.62 + excess * 0.53);
      }
      y += 0.07 * Math.sin(x * Math.PI * 3);
      y += 0.05 * Math.sin(x * Math.PI * 5);
      y += 0.09 * Math.tanh(x * 3.5);
      y += 0.08 * Math.tanh(x * 7);
      if (x > 0) y *= 1.11;
      curve[i] = y * 0.89;
    }
    return curve;
  }

  // ==========================================
  // CONTROLS
  // ==========================================
  switchToChannel(n) {
    const now = this.audioContext.currentTime;
    const tau = 0.02;
    if (n === 1) {
      this.ch1Xfade.gain.setTargetAtTime(1, now, tau);
      this.ch2Xfade.gain.setTargetAtTime(0, now, tau);
      this.activeChannel = 1;
    } else {
      this.ch1Xfade.gain.setTargetAtTime(0, now, tau);
      this.ch2Xfade.gain.setTargetAtTime(1, now, tau);
      this.activeChannel = 2;
    }
  }

  _applyInitials() {
    const lin2log = v => 0.001 * Math.pow(1000, v);
    // Stage gains
    this.ch1_pre1.gain.value = 4.5;
    this.ch1_pre2.gain.value = 1.8;
    this.ch2_pre1.gain.value = 7.0;
    this.ch2_pre2.gain.value = 2.1;
    this.ch2_pre3.gain.value = 1.6;
    this.channel1.gain.value = 0.7;
    this.channel2.gain.value = 1.0;

    this.channelVolume.gain.value = lin2log(0.70);
    this.master.gain.value = lin2log(0.70);

    // Presence/Resonance base
    this.presence.gain.value = (this.params.presence - 50) / 10;
    this.resonance.gain.value = (this.params.resonance - 50) / 10;
  }

  // SAG envelope driver (called from updateParameter when master/gain changes)
  _updateSag(target) {
    const now = this.audioContext.currentTime;
    const a = 0.02; // attack
    const r = 0.12; // release
    this.sagEnv.gain.cancelScheduledValues(now);
    this.sagEnv.gain.setTargetAtTime(target, now, a);
    this.sagEnv.gain.setTargetAtTime(1.0, now + 0.05, r);
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
    const lin2log = v => 0.001 * Math.pow(1000, v);

    switch (parameter) {
      case 'channel':
        this.switchToChannel(value === 1 ? 1 : 2);
        break;

      case 'gain': {
        // unified gain knob adjusts pre stages for both channels
        const g = lin2log(value / 100) * 20;
        // ch1
        this.ch1_pre1.gain.setTargetAtTime(g * 0.6, now, 0.01);
        this.ch1_pre2.gain.setTargetAtTime(Math.max(1, g * 0.3), now, 0.01);
        // ch2
        this.ch2_pre1.gain.setTargetAtTime(g, now, 0.01);
        this.ch2_pre2.gain.setTargetAtTime(Math.max(1, g * 0.35), now, 0.01);
        this.ch2_pre3.gain.setTargetAtTime(Math.max(1, g * 0.25), now, 0.01);
        // more gain → more sag feel
        const sagAmt = 1.0 - Math.min(0.18, (value / 100) * 0.18);
        this._updateSag(sagAmt);
        break;
      }

      case 'channel_volume':
      case 'volume': {
        const cv = lin2log(value / 100);
        this.channelVolume.gain.setTargetAtTime(cv, now, 0.01);
        // bright cap fades with volume (more bright at low vol)
        const bright = (1 - value / 100) * 6; // up to +6 dB at low CV
        this.brightCap.gain.setTargetAtTime(bright, now, 0.02);
        break;
      }

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
      case 'resonance':
        this.resonance.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;

      case 'voicing':
        this.voicing = value;
        if (value === 'vintage') {
          this.voicingFilter.frequency.setTargetAtTime(850, now, 0.01);
          this.voicingFilter.Q.setTargetAtTime(1.2, now, 0.01);
          this.voicingFilter.gain.setTargetAtTime(+2.0, now, 0.01);
          this.presence.gain.setTargetAtTime(-1.0, now, 0.01);
        } else {
          this.voicingFilter.frequency.setTargetAtTime(650, now, 0.01);
          this.voicingFilter.Q.setTargetAtTime(1.8, now, 0.01);
          this.voicingFilter.gain.setTargetAtTime(-3.0, now, 0.01);
          this.presence.gain.setTargetAtTime(+1.0, now, 0.01);
        }
        break;

      case 'master': {
        const mg = lin2log(value / 100);
        this.master.gain.setTargetAtTime(mg, now, 0.01);
        const thr = -20 + (value / 100) * 4; // -20..-16dB
        this.powerComp.threshold.setTargetAtTime(thr, now, 0.05);
        // master pushes sag a bit too
        const sagAmt = 1.0 - Math.min(0.12, (value / 100) * 0.12);
        this._updateSag(sagAmt);
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

      case 'gate': {
        // 0..100 maps to threshold -65..-35dB
        const thr = -65 + (value / 100) * 30;
        this.noiseGate.threshold.setTargetAtTime(thr, now, 0.05);
        break;
      }

      case 'mix':
        // BaseAmp mixer
        this.updateMix(value);
        break;

      default:
        super.updateParameter(parameter, value);
        break;
    }

    this.params[parameter] = value;
  }

  getParameters() {
    return {
      channel: this.activeChannel,
      gain: this.params.gain ?? 65,
      channel_volume: (this.channelVolume.gain.value),
      bass: (this.bass.gain.value * 10) + 50,
      middle: (this.middle.gain.value * 10) + 50,
      treble: (this.treble.gain.value * 10) + 50,
      presence: (this.presence.gain.value * 10) + 50,
      resonance: (this.resonance.gain.value * 10) + 50,
      voicing: this.voicing,
      master: this.params.master ?? 70,
      cabinet_enabled: this.cabEnabled,
      gate: this.params.gate ?? 15,
      mix: (this.mix ?? 0.5) * 100,
    };
  }

  // ==========================
  // PRESETS
  // ==========================
  setPreset(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('vintage')) {
      this.updateParameter('channel', 1);
      this.updateParameter('gain', 55);
      this.updateParameter('channel_volume', 60);
      this.updateParameter('voicing', 'vintage');
      this.updateParameter('bass', 55);
      this.updateParameter('middle', 65);
      this.updateParameter('treble', 58);
      this.updateParameter('presence', 55);
      this.updateParameter('resonance', 55);
      this.updateParameter('master', 72);
    } else if (n.includes('modern') || n.includes('rhythm')) {
      this.updateParameter('channel', 2);
      this.updateParameter('gain', 70);
      this.updateParameter('channel_volume', 65);
      this.updateParameter('voicing', 'modern');
      this.updateParameter('bass', 60);
      this.updateParameter('middle', 50);
      this.updateParameter('treble', 62);
      this.updateParameter('presence', 62);
      this.updateParameter('resonance', 60);
      this.updateParameter('master', 68);
      this.updateParameter('gate', 25);
    } else if (n.includes('clean') || n.includes('glass')) {
      this.updateParameter('channel', 1);
      this.updateParameter('gain', 35);
      this.updateParameter('channel_volume', 55);
      this.updateParameter('voicing', 'modern');
      this.updateParameter('bass', 50);
      this.updateParameter('middle', 55);
      this.updateParameter('treble', 65);
      this.updateParameter('presence', 58);
      this.updateParameter('resonance', 52);
      this.updateParameter('master', 75);
      this.updateParameter('gate', 0);
    }
  }

  // ==========================
  // CLEANUP
  // ==========================
  disconnect() {
    super.disconnect();
    try {
      [
        this.inputHPF, this.inTrim,
        this.channel1, this.channel2, this.ch1Xfade, this.ch2Xfade,
        this.ch1_pre1, this.ch1_sat1, this.ch1_pre2, this.ch1_sat2,
        this.noiseGate, this.ch2_pre1, this.ch2_sat1, this.ch2_pre2,
        this.ch2_sat2, this.ch2_pre3, this.ch2_sat3,
        this.mixer, this.brightCap, this.voicingFilter,
        this.bass, this.middle, this.treble, this.channelVolume,
        this.sagEnv, this.powerGain, this.powerSat,
        this.dcBlock, this.preCabinet, this.postCabinet, this.presence,
        this.resonance, this.outLimiter, this.master
      ].forEach(n => { try { n.disconnect(); } catch(e){} });
      if (this.powerSag) this.powerSag.disconnect();
      if (this.powerComp) this.powerComp.disconnect();
      if (this.cabinet && this.cabinet.input) {
        this.cabinet.input.disconnect();
      }
      if (this.cabinet && this.cabinet.output) {
        this.cabinet.output.disconnect();
      }
    } catch(e) {
      console.warn('Victory Duchess disconnect err:', e);
    }
  }
}

export default VictoryDuchessAmp;
