import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Dr. Z Maz 38 NR - Boutique Vox-Style 38W
 * 
 * The Dr. Z Maz 38 is a boutique amplifier inspired by the Vox AC30
 * but with its own unique voicing. Known for its chimey, EL84-driven
 * tone with incredible dynamic response and touch sensitivity. Brad
 * Paisley's main amp. Features a simple, no-nonsense control layout.
 * 
 * Tubes: 3x 12AX7 (preamp), 4x EL84 (power)
 * Speaker: 1x12" Celestion
 * Cabinet: '1x12_open'
 */
class DrZMaz38Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Dr. Z Maz 38', 'drz_maz38');

    // ============================================
    // PREAMP (Vox-inspired but cleaner)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 2.0;

    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._makeDrZCurve(2.0, 0.02);

    this.couplingHP = audioContext.createBiquadFilter();
    this.couplingHP.type = 'highpass'; this.couplingHP.frequency.value = 40; this.couplingHP.Q.value = 0.707;

    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._makeDrZCurve(3.5, 0.03);

    this.couplingHP2 = audioContext.createBiquadFilter();
    this.couplingHP2.type = 'highpass'; this.couplingHP2.frequency.value = 50; this.couplingHP2.Q.value = 0.707;

    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._makeDrZCurve(4.5, 0.04);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.volume = audioContext.createGain(); this.volume.gain.value = 0.5;

    // TONE STACK (Vox-style cut/bass with Dr. Z refinements)
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 110; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 1100; this.midEQ.Q.value = 1.5; this.midEQ.gain.value = 2;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 2500; this.trebleEQ.gain.value = 0;
    this.cutControl = audioContext.createBiquadFilter(); this.cutControl.type = 'lowpass'; this.cutControl.frequency.value = 6500; this.cutControl.Q.value = 0.707;
    this.chimePeak = audioContext.createBiquadFilter(); this.chimePeak.type = 'peaking'; this.chimePeak.frequency.value = 3600; this.chimePeak.Q.value = 2.5; this.chimePeak.gain.value = 2;

    // POWER AMP (4x EL84 Class A/B)
    this.powerSag = this.createSagProcessor('tube', { depth: 0.15, att: 0.009, relFast: 0.08, relSlow: 0.27, rmsMs: 25, shape: 1.6, floor: 0.24, peakMix: 0.28 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.7;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL84PowerCurve();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '1x12_open'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupRouting();
    this.recreateCabinet();

    this.params = { volume: 50, bass: 55, mid: 55, treble: 60, cut: 50, master: 70, cabinet_enabled: true };
  }

  _makeDrZCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.06 * Math.tanh(xs * gain * 2.5);
      y += 0.04 * Math.sin(xs * Math.PI * 4);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.65) y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.35);
      curve[i] = y * 0.92;
    }
    return curve;
  }

  _makeEL84PowerCurve() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.4);
      y += 0.08 * Math.tanh(x * 3);
      y += 0.05 * Math.sin(x * Math.PI * 5);
      if (x > 0) y *= 1.1;
      if (Math.abs(y) > 0.6) y = Math.sign(y) * (0.6 + (Math.abs(y) - 0.6) * 0.35);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1); this.stage1.connect(this.couplingHP);
    this.couplingHP.connect(this.stage2); this.stage2.connect(this.couplingHP2);
    this.couplingHP2.connect(this.stage3); this.stage3.connect(this.dcBlocker);
    this.dcBlocker.connect(this.volume);
    this.volume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.chimePeak);
    this.chimePeak.connect(this.cutControl);
    if (this.powerSag) { this.cutControl.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.cutControl.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master); this.master.connect(this.output);
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
      case 'volume': case 'gain':
        this.volume.gain.setTargetAtTime(value / 100, now, 0.01);
        this.preampGain.gain.setTargetAtTime(1 + (value / 100) * 3, now, 0.01);
        break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'cut': this.cutControl.frequency.setTargetAtTime(2000 + (value / 100) * 8000, now, 0.02); break;
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
    try {
      this.preampGain.disconnect(); this.stage1.disconnect(); this.couplingHP.disconnect();
      this.stage2.disconnect(); this.couplingHP2.disconnect(); this.stage3.disconnect();
      this.dcBlocker.disconnect(); this.volume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.cutControl.disconnect(); this.chimePeak.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect(); this.master.disconnect();
    } catch (e) { console.warn('Error disconnecting Dr. Z Maz 38:', e); }
  }
}

export default DrZMaz38Amp;
