import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Vox AC15 - 15W Class A Tube Amplifier
 * 
 * The smaller sibling of the AC30, the AC15 shares the same EL84
 * "chime" but breaks up earlier due to lower wattage. A favorite
 * for studio work and smaller gigs. Brian May's early sound, and
 * many modern indie/alternative guitarists use AC15s.
 * 
 * Tubes: 3x 12AX7 (preamp), 2x EL84 (power), EZ81 rectifier
 * Speaker: 1x12" Celestion Greenback or Blue
 * Cabinet: '1x12_open'
 */
class VoxAC15Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox AC15', 'vox_ac15');

    this.activeChannel = 'top_boost';

    // ============================================
    // NORMAL CHANNEL
    // ============================================
    this.normalVolume = audioContext.createGain();
    this.normalVolume.gain.value = 0.5;

    // ============================================
    // TOP BOOST CHANNEL
    // ============================================
    this.topBoostVolume = audioContext.createGain();
    this.topBoostVolume.gain.value = 0.5;

    // ============================================
    // PREAMP (EF86 or 12AX7 depending on channel)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 1.8;

    this.preampStage1 = audioContext.createWaveShaper();
    this.preampStage1.oversample = '4x';
    this.preampStage1.curve = this._makeEL84PreampCurve(2.0);

    this.couplingHP = audioContext.createBiquadFilter();
    this.couplingHP.type = 'highpass';
    this.couplingHP.frequency.value = 45;
    this.couplingHP.Q.value = 0.707;

    this.preampStage2 = audioContext.createWaveShaper();
    this.preampStage2.oversample = '4x';
    this.preampStage2.curve = this._makeEL84PreampCurve(3.5);

    // ============================================
    // TOP BOOST TONE STACK (Vox Cut/Bass)
    // ============================================
    this.cutControl = audioContext.createBiquadFilter();
    this.cutControl.type = 'lowpass';
    this.cutControl.frequency.value = 6000;
    this.cutControl.Q.value = 0.707;

    this.bassControl = audioContext.createBiquadFilter();
    this.bassControl.type = 'lowshelf';
    this.bassControl.frequency.value = 120;
    this.bassControl.gain.value = 0;

    // Vox mid character (mid-range chime)
    this.voxMidPeak = audioContext.createBiquadFilter();
    this.voxMidPeak.type = 'peaking';
    this.voxMidPeak.frequency.value = 1200;
    this.voxMidPeak.Q.value = 1.5;
    this.voxMidPeak.gain.value = 3;

    // Top Boost treble control
    this.trebleControl = audioContext.createBiquadFilter();
    this.trebleControl.type = 'highshelf';
    this.trebleControl.frequency.value = 2500;
    this.trebleControl.gain.value = 2;

    // Vox chime (characteristic high-frequency sparkle)
    this.chimePeak = audioContext.createBiquadFilter();
    this.chimePeak.type = 'peaking';
    this.chimePeak.frequency.value = 3800;
    this.chimePeak.Q.value = 2.5;
    this.chimePeak.gain.value = 2.5;

    // ============================================
    // TREMOLO (bias-vary tremolo)
    // ============================================
    this.tremoloLFO = audioContext.createOscillator();
    this.tremoloLFO.type = 'triangle';
    this.tremoloLFO.frequency.value = 5;
    this.tremoloDepth = audioContext.createGain();
    this.tremoloDepth.gain.value = 0;
    this.tremoloGain = audioContext.createGain();
    this.tremoloGain.gain.value = 1;
    this.tremoloLFO.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    this.tremoloLFO.start();

    // ============================================
    // POWER AMP (2x EL84 Class A)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.16,
      att: 0.009,
      relFast: 0.08,
      relSlow: 0.28,
      rmsMs: 26.0,
      shape: 1.7,
      floor: 0.24,
      peakMix: 0.27
    });

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL84PowerCurve();

    this.master = audioContext.createGain();
    this.master.gain.value = 0.7;

    // ============================================
    // CABINET (1x12 open back Celestion)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x12_open';
    this.micType = 'sm57';
    this.micPosition = 'edge';

    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

    this._setupTopBoostChannel();
    this.recreateCabinet();

    this.params = {
      channel: 1,
      volume: 50,
      bass: 55,
      treble: 60,
      cut: 50,
      tremolo_speed: 50,
      tremolo_depth: 0,
      master: 70,
      cabinet_enabled: true
    };
  }

  _makeEL84PreampCurve(gain) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * gain);
      // EL84 character: chimey, harmonic-rich
      y += 0.06 * Math.tanh(x * gain * 2.5);
      y += 0.03 * Math.sin(x * Math.PI * 4);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.65) y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.35);
      curve[i] = y * 0.93;
    }
    return curve;
  }

  _makeEL84PowerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // EL84 Class A: rich harmonics, singing sustain
      let y = Math.tanh(x * 1.4);
      y += 0.08 * Math.tanh(x * 3);
      y += 0.05 * Math.sin(x * Math.PI * 5);
      if (x > 0) y *= 1.1;
      if (Math.abs(y) > 0.6) y = Math.sign(y) * (0.6 + (Math.abs(y) - 0.6) * 0.35);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); this.preampGain.disconnect(); this.preampStage1.disconnect();
      this.couplingHP.disconnect(); this.preampStage2.disconnect();
      this.normalVolume.disconnect(); this.topBoostVolume.disconnect();
      this.cutControl.disconnect(); this.bassControl.disconnect();
      this.voxMidPeak.disconnect(); this.trebleControl.disconnect(); this.chimePeak.disconnect();
      this.tremoloGain.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect(); this.master.disconnect();
    } catch (e) {}
  }

  _setupTopBoostChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.couplingHP);
    this.couplingHP.connect(this.preampStage2);
    this.preampStage2.connect(this.topBoostVolume);
    this.topBoostVolume.connect(this.bassControl);
    this.bassControl.connect(this.voxMidPeak);
    this.voxMidPeak.connect(this.trebleControl);
    this.trebleControl.connect(this.chimePeak);
    this.chimePeak.connect(this.cutControl);
    this.cutControl.connect(this.tremoloGain);
    if (this.powerSag) { this.tremoloGain.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.tremoloGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    this.activeChannel = 'top_boost';
  }

  _setupNormalChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.normalVolume);
    this.normalVolume.connect(this.cutControl);
    this.cutControl.connect(this.tremoloGain);
    if (this.powerSag) { this.tremoloGain.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.tremoloGain.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    this.activeChannel = 'normal';
  }

  recreateCabinet() {
    if (this.cabinet) { try { if (this.cabinet.input) this.cabinet.input.disconnect(); if (this.cabinet.output) this.cabinet.output.disconnect(); } catch (e) {} }
    try { this.preCabinet.disconnect(); } catch (e) {}
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(this.cabinetType, this.micType, this.micPosition);
      if (this.cabinet) { this.preCabinet.connect(this.cabinet.input); this.cabinet.output.connect(this.postCabinet); }
      else this.preCabinet.connect(this.postCabinet);
    } else this.preCabinet.connect(this.postCabinet);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'channel': if (value === 0) this._setupNormalChannel(); else this._setupTopBoostChannel(); this.recreateCabinet(); break;
      case 'volume': case 'gain':
        this.topBoostVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        this.normalVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        this.preampGain.gain.setTargetAtTime(1.0 + (value / 100) * 2.5, now, 0.01);
        break;
      case 'bass': this.bassControl.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'treble': this.trebleControl.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'cut': this.cutControl.frequency.setTargetAtTime(2000 + (value / 100) * 8000, now, 0.02); break;
      case 'tremolo_speed': this.tremoloLFO.frequency.setTargetAtTime(1 + (value / 100) * 12, now, 0.02); break;
      case 'tremolo_depth': this.tremoloDepth.gain.setTargetAtTime((value / 100) * 0.6, now, 0.02); break;
      case 'master': { const linLog = (v) => 0.001 * Math.pow(1000, v); this.master.gain.setTargetAtTime(linLog(value / 100), now, 0.01); break; }
      case 'cabinet_enabled': this.cabinetEnabled = !!value; this.recreateCabinet(); break;
      case 'cabinet': this.cabinetType = value; this.recreateCabinet(); break;
      case 'microphone': case 'micType': this.micType = value; this.recreateCabinet(); break;
      case 'micPosition': this.micPosition = value; this.recreateCabinet(); break;
    }
    this.params[parameter] = value;
  }

  disconnect() {
    super.disconnect();
    try { this.tremoloLFO.stop(); } catch (e) {}
    this._disconnectAllNodes();
  }
}

export default VoxAC15Amp;
