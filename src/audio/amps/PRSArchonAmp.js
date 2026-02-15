import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * PRS Archon - PRS Signature High-Gain 100W
 * 
 * The PRS Archon is Paul Reed Smith's entry into the high-gain
 * amplifier world. Features 2 channels (clean/lead) with a lush,
 * aggressive lead tone and a brilliant clean channel. Known for
 * its unique "3D" quality and incredible note separation under gain.
 * Mark Holcomb (Periphery) is a notable user.
 * 
 * Tubes: 4x 12AX7, 2x 6L6GC/5881
 * Cabinet: '2x12_closed' or '4x12_v30'
 */
class PRSArchonAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'PRS Archon', 'prs_archon');

    this.activeChannel = 'lead';

    // PREAMP
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 10.0;

    this.stage1 = audioContext.createWaveShaper(); this.stage1.oversample = '4x';
    this.stage1.curve = this._makeArchonCurve(4.0, 0.02);
    this.hp1 = audioContext.createBiquadFilter(); this.hp1.type = 'highpass'; this.hp1.frequency.value = 38; this.hp1.Q.value = 0.707;
    this.stage2 = audioContext.createWaveShaper(); this.stage2.oversample = '4x';
    this.stage2.curve = this._makeArchonCurve(6.5, 0.04);
    this.hp2 = audioContext.createBiquadFilter(); this.hp2.type = 'highpass'; this.hp2.frequency.value = 48; this.hp2.Q.value = 0.707;
    this.stage3 = audioContext.createWaveShaper(); this.stage3.oversample = '4x';
    this.stage3.curve = this._makeArchonCurve(9.0, 0.06);
    this.hp3 = audioContext.createBiquadFilter(); this.hp3.type = 'highpass'; this.hp3.frequency.value = 58; this.hp3.Q.value = 0.707;
    this.stage4 = audioContext.createWaveShaper(); this.stage4.oversample = '4x';
    this.stage4.curve = this._makeArchonCurve(11.0, 0.07);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.55;

    // Bright switch
    this.brightSwitch = audioContext.createBiquadFilter(); this.brightSwitch.type = 'highshelf'; this.brightSwitch.frequency.value = 4000; this.brightSwitch.gain.value = 0;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 140; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 900; this.midEQ.Q.value = 1.5; this.midEQ.gain.value = 0;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 3000; this.trebleEQ.gain.value = 0;

    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 3;
    this.depth = audioContext.createBiquadFilter(); this.depth.type = 'lowshelf'; this.depth.frequency.value = 80; this.depth.gain.value = 2;

    // POWER AMP (2x 6L6GC)
    this.powerSag = this.createSagProcessor('silicon', { depth: 0.08, att: 0.005, relFast: 0.05, relSlow: 0.17, rmsMs: 12, shape: 1.1, floor: 0.30, peakMix: 0.33 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6Power();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '2x12_closed'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupLeadChannel();
    this.recreateCabinet();

    this.params = { channel: 1, gain: 70, bass: 55, mid: 60, treble: 65, presence: 60, depth: 50, bright: false, master: 50, cabinet_enabled: true };
  }

  _makeArchonCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      // PRS Archon: 3D quality with clear note definition
      y += 0.04 * Math.tanh(xs * gain * 2);
      y += 0.02 * Math.sin(xs * Math.PI * 4);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.05;
      if (Math.abs(y) > 0.72) y = Math.sign(y) * (0.72 + (Math.abs(y) - 0.72) * 0.28);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _make6L6Power() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.05 * Math.tanh(x * 4);
      if (x > 0) y *= 1.08;
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); this.preampGain.disconnect();
      this.stage1.disconnect(); this.hp1.disconnect(); this.stage2.disconnect();
      this.hp2.disconnect(); this.stage3.disconnect(); this.hp3.disconnect(); this.stage4.disconnect();
      this.dcBlocker.disconnect(); this.channelVolume.disconnect(); this.brightSwitch.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.presence.disconnect(); this.depth.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupLeadChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain); this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1); this.hp1.connect(this.stage2);
    this.stage2.connect(this.hp2); this.hp2.connect(this.stage3);
    this.stage3.connect(this.hp3); this.hp3.connect(this.stage4);
    this.stage4.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.brightSwitch); this.brightSwitch.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ); this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation); this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.depth); this.depth.connect(this.output);
    this.activeChannel = 'lead'; this.preampGain.gain.value = 10.0; this.channelVolume.gain.value = 0.55;
  }

  _setupCleanChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain); this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1); this.hp1.connect(this.stage2);
    this.stage2.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.brightSwitch); this.brightSwitch.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ); this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation); this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.depth); this.depth.connect(this.output);
    this.activeChannel = 'clean'; this.preampGain.gain.value = 2.0; this.channelVolume.gain.value = 0.85;
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
      case 'gain': this.preampGain.gain.setTargetAtTime(1 + (value / 100) * (this.activeChannel === 'lead' ? 14 : 4), now, 0.01); break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'depth': this.depth.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'bright': this.brightSwitch.gain.setTargetAtTime(value ? 4 : 0, now, 0.02); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'cabinet_enabled': this.cabinetEnabled = !!value; this.recreateCabinet(); break;
      case 'cabinet': this.cabinetType = value; this.recreateCabinet(); break;
      case 'microphone': case 'micType': this.micType = value; this.recreateCabinet(); break;
      case 'micPosition': this.micPosition = value; this.recreateCabinet(); break;
    }
    this.params[parameter] = value;
  }

  disconnect() { super.disconnect(); this._disconnectAllNodes(); }
}

export default PRSArchonAmp;
