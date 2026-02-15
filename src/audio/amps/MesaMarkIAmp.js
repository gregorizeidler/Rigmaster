import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Mesa Boogie Mark I - Original Mark Series 60/100W
 * 
 * The original Mesa Boogie, born from a modified Fender Princeton.
 * Randall Smith created the first high-gain amp by cascading gain stages.
 * Carlos Santana's "Abraxas" tone. Features the signature 5-band
 * graphic EQ and a unique Fender-derived clean tone with added gain stages.
 * 
 * Tubes: 5x 12AX7 (preamp), 2x 6L6 or EL34 (power)
 * Cabinet: '1x12_closed'
 */
class MesaMarkIAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Boogie Mark I', 'mesa_mark_i');

    // ============================================
    // PREAMP (cascaded gain stages - the Boogie innovation)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 4.0;

    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._makeBoogieCurve(3.0, 0.02);

    this.hp1 = audioContext.createBiquadFilter();
    this.hp1.type = 'highpass'; this.hp1.frequency.value = 40; this.hp1.Q.value = 0.707;

    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._makeBoogieCurve(5.0, 0.04);

    this.hp2 = audioContext.createBiquadFilter();
    this.hp2.type = 'highpass'; this.hp2.frequency.value = 55; this.hp2.Q.value = 0.707;

    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._makeBoogieCurve(6.0, 0.05);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.volume = audioContext.createGain();
    this.volume.gain.value = 0.6;

    // ============================================
    // TONE STACK (Fender-derived)
    // ============================================
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 120; this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 650; this.midEQ.Q.value = 1.0; this.midEQ.gain.value = 0;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 2500; this.trebleEQ.gain.value = 0;

    // 5-Band Graphic EQ (Mesa signature)
    this.gEQ80 = audioContext.createBiquadFilter();
    this.gEQ80.type = 'peaking'; this.gEQ80.frequency.value = 80; this.gEQ80.Q.value = 2; this.gEQ80.gain.value = 0;
    this.gEQ240 = audioContext.createBiquadFilter();
    this.gEQ240.type = 'peaking'; this.gEQ240.frequency.value = 240; this.gEQ240.Q.value = 2; this.gEQ240.gain.value = 0;
    this.gEQ750 = audioContext.createBiquadFilter();
    this.gEQ750.type = 'peaking'; this.gEQ750.frequency.value = 750; this.gEQ750.Q.value = 2; this.gEQ750.gain.value = 0;
    this.gEQ2200 = audioContext.createBiquadFilter();
    this.gEQ2200.type = 'peaking'; this.gEQ2200.frequency.value = 2200; this.gEQ2200.Q.value = 2; this.gEQ2200.gain.value = 0;
    this.gEQ6600 = audioContext.createBiquadFilter();
    this.gEQ6600.type = 'peaking'; this.gEQ6600.frequency.value = 6600; this.gEQ6600.Q.value = 2; this.gEQ6600.gain.value = 0;

    this.graphicEQEnabled = false;

    // ============================================
    // PRESENCE
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 2;

    // ============================================
    // POWER AMP (6L6)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.12, att: 0.008, relFast: 0.07, relSlow: 0.24, rmsMs: 20.0, shape: 1.5, floor: 0.26, peakMix: 0.30
    });

    this.master = audioContext.createGain();
    this.master.gain.value = 0.5;

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6PowerCurve();

    // ============================================
    // CABINET
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x12_closed';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

    this._setupRouting();
    this.recreateCabinet();

    this.params = { gain: 60, volume: 60, bass: 55, mid: 55, treble: 60, presence: 55, master: 50, graphic_eq: false, eq_80: 50, eq_240: 50, eq_750: 50, eq_2200: 50, eq_6600: 50, cabinet_enabled: true };
  }

  _makeBoogieCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.04 * Math.tanh(xs * gain * 2.5);
      y += 0.025 * Math.sin(xs * Math.PI * 3);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.05;
      if (Math.abs(y) > 0.7) y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.3);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _make6L6PowerCurve() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.4);
      y += 0.05 * Math.tanh(x * 3.5);
      y += 0.03 * Math.sin(x * Math.PI * 4);
      if (x > 0) y *= 1.06;
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1); this.hp1.connect(this.stage2);
    this.stage2.connect(this.hp2); this.hp2.connect(this.stage3);
    this.stage3.connect(this.dcBlocker);
    this.dcBlocker.connect(this.volume);
    this.volume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.gEQ80);
    this.gEQ80.connect(this.gEQ240); this.gEQ240.connect(this.gEQ750);
    this.gEQ750.connect(this.gEQ2200); this.gEQ2200.connect(this.gEQ6600);
    this.gEQ6600.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.output);
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
      case 'gain': this.preampGain.gain.setTargetAtTime(1 + (value / 100) * 10, now, 0.01); break;
      case 'volume': this.volume.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'eq_80': this.gEQ80.gain.setTargetAtTime((value - 50) / 4, now, 0.01); break;
      case 'eq_240': this.gEQ240.gain.setTargetAtTime((value - 50) / 4, now, 0.01); break;
      case 'eq_750': this.gEQ750.gain.setTargetAtTime((value - 50) / 4, now, 0.01); break;
      case 'eq_2200': this.gEQ2200.gain.setTargetAtTime((value - 50) / 4, now, 0.01); break;
      case 'eq_6600': this.gEQ6600.gain.setTargetAtTime((value - 50) / 4, now, 0.01); break;
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
      this.preampGain.disconnect(); this.stage1.disconnect(); this.hp1.disconnect();
      this.stage2.disconnect(); this.hp2.disconnect(); this.stage3.disconnect();
      this.dcBlocker.disconnect(); this.volume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.gEQ80.disconnect(); this.gEQ240.disconnect(); this.gEQ750.disconnect();
      this.gEQ2200.disconnect(); this.gEQ6600.disconnect();
      this.presence.disconnect(); this.master.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) { console.warn('Error disconnecting Mesa Mark I:', e); }
  }
}

export default MesaMarkIAmp;
