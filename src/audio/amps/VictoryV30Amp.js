import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Victory V30 The Countess - Modern British 42W
 * 
 * Victory Amplification's The Countess is a modern British-voiced amp
 * designed by Martin Sherwood. Known for its versatile clean-to-crunch
 * tone, lush reverb, and premium British EL34 power section. A modern
 * take on the classic British amp tradition.
 * 
 * Tubes: 4x 12AX7, 2x EL34 (power)
 * Cabinet: '2x12_closed'
 */
class VictoryV30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Victory V30', 'victory_v30');

    this.activeChannel = 'dirty';

    // PREAMP
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 3.0;

    this.stage1 = audioContext.createWaveShaper(); this.stage1.oversample = '4x';
    this.stage1.curve = this._makeBritishCurve(3.0, 0.02);
    this.hp1 = audioContext.createBiquadFilter(); this.hp1.type = 'highpass'; this.hp1.frequency.value = 40; this.hp1.Q.value = 0.707;
    this.stage2 = audioContext.createWaveShaper(); this.stage2.oversample = '4x';
    this.stage2.curve = this._makeBritishCurve(5.0, 0.04);
    this.hp2 = audioContext.createBiquadFilter(); this.hp2.type = 'highpass'; this.hp2.frequency.value = 50; this.hp2.Q.value = 0.707;
    this.stage3 = audioContext.createWaveShaper(); this.stage3.oversample = '4x';
    this.stage3.curve = this._makeBritishCurve(7.0, 0.05);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.6;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 130; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 850; this.midEQ.Q.value = 1.5; this.midEQ.gain.value = 2;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 2800; this.trebleEQ.gain.value = 0;

    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 4500; this.presence.gain.value = 3;
    this.resonance = audioContext.createBiquadFilter(); this.resonance.type = 'lowshelf'; this.resonance.frequency.value = 90; this.resonance.gain.value = 2;

    // POWER AMP (2x EL34)
    this.powerSag = this.createSagProcessor('tube', { depth: 0.11, att: 0.007, relFast: 0.065, relSlow: 0.22, rmsMs: 18, shape: 1.4, floor: 0.27, peakMix: 0.30 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL34Power();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '2x12_closed'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupDirtyChannel();
    this.recreateCabinet();

    this.params = { channel: 1, gain: 60, bass: 55, mid: 60, treble: 60, presence: 55, resonance: 50, master: 50, cabinet_enabled: true };
  }

  _makeBritishCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.05 * Math.tanh(xs * gain * 2.5);
      y += 0.03 * Math.sin(xs * Math.PI * 3);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.7) y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.3);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _makeEL34Power() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.06 * Math.tanh(x * 4);
      y += 0.03 * Math.sin(x * Math.PI * 3);
      if (x > 0) y *= 1.08;
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); this.preampGain.disconnect();
      this.stage1.disconnect(); this.hp1.disconnect(); this.stage2.disconnect();
      this.hp2.disconnect(); this.stage3.disconnect();
      this.dcBlocker.disconnect(); this.channelVolume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.presence.disconnect(); this.resonance.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupCleanChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain); this.preampGain.connect(this.stage1);
    this.stage1.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation); this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.resonance); this.resonance.connect(this.output);
    this.activeChannel = 'clean'; this.preampGain.gain.value = 1.5; this.channelVolume.gain.value = 0.85;
  }

  _setupDirtyChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain); this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1); this.hp1.connect(this.stage2);
    this.stage2.connect(this.hp2); this.hp2.connect(this.stage3);
    this.stage3.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation); this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.resonance); this.resonance.connect(this.output);
    this.activeChannel = 'dirty'; this.preampGain.gain.value = 3.0; this.channelVolume.gain.value = 0.6;
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
      case 'channel': if (value === 0) this._setupCleanChannel(); else this._setupDirtyChannel(); this.recreateCabinet(); break;
      case 'gain': this.preampGain.gain.setTargetAtTime(1 + (value / 100) * (this.activeChannel === 'dirty' ? 8 : 3), now, 0.01); break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'resonance': this.resonance.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
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

export default VictoryV30Amp;
