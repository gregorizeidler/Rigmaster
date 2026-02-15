import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Mesa Boogie Mark IIC+ - The Holy Grail
 * 
 * The Mark IIC+ is the most sought-after Mesa amplifier ever made.
 * Only about 1500 were produced. Known for its liquid lead tone
 * with massive sustain and singing quality. Metallica's "Master of
 * Puppets" was recorded with a Mark IIC+. John Petrucci, Santana.
 * 
 * Tubes: 5x 12AX7 (preamp), 2x 6L6 (power), Simul-Class option
 * Cabinet: '1x12_closed' or '4x12_v30'
 */
class MesaMarkIICPlusAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Mark IIC+', 'mesa_mark_iic_plus');

    this.activeChannel = 'lead';

    // ============================================
    // PREAMP (5 cascaded 12AX7 stages)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 12.0;

    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._makeIICPlusCurve(3.5, 0.02);

    this.hp1 = audioContext.createBiquadFilter();
    this.hp1.type = 'highpass'; this.hp1.frequency.value = 35; this.hp1.Q.value = 0.707;

    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._makeIICPlusCurve(6.0, 0.04);

    this.hp2 = audioContext.createBiquadFilter();
    this.hp2.type = 'highpass'; this.hp2.frequency.value = 50; this.hp2.Q.value = 0.707;

    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._makeIICPlusCurve(8.0, 0.06);

    this.hp3 = audioContext.createBiquadFilter();
    this.hp3.type = 'highpass'; this.hp3.frequency.value = 60; this.hp3.Q.value = 0.707;

    this.stage4 = audioContext.createWaveShaper();
    this.stage4.oversample = '4x';
    this.stage4.curve = this._makeIICPlusCurve(10.0, 0.07);

    this.hp4 = audioContext.createBiquadFilter();
    this.hp4.type = 'highpass'; this.hp4.frequency.value = 65; this.hp4.Q.value = 0.707;

    this.stage5 = audioContext.createWaveShaper();
    this.stage5.oversample = '4x';
    this.stage5.curve = this._makeIICPlusCurve(12.0, 0.08);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.volume = audioContext.createGain();
    this.volume.gain.value = 0.5;

    // ============================================
    // TONE STACK
    // ============================================
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 120; this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 700; this.midEQ.Q.value = 1.2; this.midEQ.gain.value = 0;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 2500; this.trebleEQ.gain.value = 0;

    // 5-Band Graphic EQ
    this.gEQ80 = audioContext.createBiquadFilter(); this.gEQ80.type = 'peaking'; this.gEQ80.frequency.value = 80; this.gEQ80.Q.value = 2; this.gEQ80.gain.value = 0;
    this.gEQ240 = audioContext.createBiquadFilter(); this.gEQ240.type = 'peaking'; this.gEQ240.frequency.value = 240; this.gEQ240.Q.value = 2; this.gEQ240.gain.value = 0;
    this.gEQ750 = audioContext.createBiquadFilter(); this.gEQ750.type = 'peaking'; this.gEQ750.frequency.value = 750; this.gEQ750.Q.value = 2; this.gEQ750.gain.value = 0;
    this.gEQ2200 = audioContext.createBiquadFilter(); this.gEQ2200.type = 'peaking'; this.gEQ2200.frequency.value = 2200; this.gEQ2200.Q.value = 2; this.gEQ2200.gain.value = 0;
    this.gEQ6600 = audioContext.createBiquadFilter(); this.gEQ6600.type = 'peaking'; this.gEQ6600.frequency.value = 6600; this.gEQ6600.Q.value = 2; this.gEQ6600.gain.value = 0;

    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 2;

    // ============================================
    // POWER AMP (Simul-Class: 2x 6L6 + 2x EL34)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.10, att: 0.007, relFast: 0.065, relSlow: 0.22, rmsMs: 18.0, shape: 1.4, floor: 0.27, peakMix: 0.30
    });

    this.master = audioContext.createGain();
    this.master.gain.value = 0.5;

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeSimulClassPower();

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

    this._setupLeadChannel();
    this.recreateCabinet();

    this.params = { channel: 1, gain: 75, volume: 55, bass: 55, mid: 55, treble: 65, presence: 55, master: 50, eq_80: 50, eq_240: 50, eq_750: 50, eq_2200: 50, eq_6600: 50, cabinet_enabled: true };
  }

  _makeIICPlusCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xs = x + asym;
      let y = Math.tanh(xs * gain);
      // IIC+ signature: liquid, singing quality
      y += 0.05 * Math.tanh(xs * gain * 2);
      y += 0.03 * Math.sin(xs * Math.PI * 3);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.72) y = Math.sign(y) * (0.72 + (Math.abs(y) - 0.72) * 0.3);
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _makeSimulClassPower() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Simul-Class: blend of 6L6 tightness and EL34 harmonics
      let y = Math.tanh(x * 1.45);
      y += 0.06 * Math.tanh(x * 3.5);
      y += 0.04 * Math.sin(x * Math.PI * 4);
      if (x > 0) y *= 1.07;
      if (Math.abs(y) > 0.63) y = Math.sign(y) * (0.63 + (Math.abs(y) - 0.63) * 0.32);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); this.preampGain.disconnect();
      this.stage1.disconnect(); this.hp1.disconnect(); this.stage2.disconnect(); this.hp2.disconnect();
      this.stage3.disconnect(); this.hp3.disconnect(); this.stage4.disconnect(); this.hp4.disconnect();
      this.stage5.disconnect(); this.dcBlocker.disconnect(); this.volume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.gEQ80.disconnect(); this.gEQ240.disconnect(); this.gEQ750.disconnect();
      this.gEQ2200.disconnect(); this.gEQ6600.disconnect();
      this.presence.disconnect(); this.master.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupLeadChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1); this.stage1.connect(this.hp1);
    this.hp1.connect(this.stage2); this.stage2.connect(this.hp2);
    this.hp2.connect(this.stage3); this.stage3.connect(this.hp3);
    this.hp3.connect(this.stage4); this.stage4.connect(this.hp4);
    this.hp4.connect(this.stage5); this.stage5.connect(this.dcBlocker);
    this.dcBlocker.connect(this.volume);
    this.volume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.gEQ80);
    this.gEQ80.connect(this.gEQ240); this.gEQ240.connect(this.gEQ750);
    this.gEQ750.connect(this.gEQ2200); this.gEQ2200.connect(this.gEQ6600);
    this.gEQ6600.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.output);
    this.activeChannel = 'lead';
  }

  _setupCleanChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1); this.stage1.connect(this.hp1);
    this.hp1.connect(this.stage2); this.stage2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.volume);
    this.volume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.gEQ80);
    this.gEQ80.connect(this.gEQ240); this.gEQ240.connect(this.gEQ750);
    this.gEQ750.connect(this.gEQ2200); this.gEQ2200.connect(this.gEQ6600);
    this.gEQ6600.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.output);
    this.activeChannel = 'clean';
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
      case 'channel': if (value === 0) this._setupCleanChannel(); else this._setupLeadChannel(); this.recreateCabinet(); break;
      case 'gain': this.preampGain.gain.setTargetAtTime(1 + (value / 100) * 16, now, 0.01); break;
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

  disconnect() { super.disconnect(); this._disconnectAllNodes(); }
}

export default MesaMarkIICPlusAmp;
