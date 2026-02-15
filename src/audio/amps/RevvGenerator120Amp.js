import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Revv Generator 120 - Modern Metal 120W
 * 
 * The Revv Generator 120 is a Canadian-made modern high-gain head.
 * Designed by Dan Richer, it features 4 channels with a unique
 * "Aggression" switch. Known for its modern metal tones with
 * extreme clarity and definition. Used by Pete Thorn, Rabea Massaad.
 * 
 * Tubes: 5x 12AX7, 4x 6L6GC
 * Cabinet: '4x12_v30'
 */
class RevvGenerator120Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Revv Generator 120', 'revv_generator');

    this.activeChannel = 'purple'; // green, blue, red, purple
    this.aggressionEnabled = false;

    this.noiseGate = this.createNoiseGate({ thOpen: -47, thClose: -55, attack: 0.0004, release: 0.09, rms: 0.011, peakMix: 0.42, floorDb: -72, holdMs: 5 });
    this.gateEnabled = true;

    const chCfgs = {
      green:  { pre: 1.5,  stages: 1, post: 0.9  },
      blue:   { pre: 5.0,  stages: 2, post: 0.75 },
      red:    { pre: 12.0, stages: 4, post: 0.55 },
      purple: { pre: 20.0, stages: 5, post: 0.45 }
    };
    this._chCfgs = chCfgs;

    // PREAMP (5 gain stages)
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 12.0;

    this.stages = []; this.hpfs = [];
    for (let i = 0; i < 5; i++) {
      const ws = audioContext.createWaveShaper(); ws.oversample = '4x';
      ws.curve = this._makeRevvCurve(4 + i * 3, 0.02 + i * 0.015);
      this.stages.push(ws);
      const hp = audioContext.createBiquadFilter(); hp.type = 'highpass';
      hp.frequency.value = 35 + i * 10; hp.Q.value = 0.707;
      this.hpfs.push(hp);
    }

    // Aggression switch (adds extra gain + tightness)
    this.aggressionGain = audioContext.createGain(); this.aggressionGain.gain.value = 1.0;
    this.aggressionHP = audioContext.createBiquadFilter(); this.aggressionHP.type = 'highpass'; this.aggressionHP.frequency.value = 100; this.aggressionHP.Q.value = 1.0;

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.55;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 140; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 900; this.midEQ.Q.value = 1.8; this.midEQ.gain.value = 0;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 3200; this.trebleEQ.gain.value = 0;
    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 3;
    this.depth = audioContext.createBiquadFilter(); this.depth.type = 'lowshelf'; this.depth.frequency.value = 80; this.depth.gain.value = 2;

    // POWER AMP (4x 6L6GC)
    this.powerSag = this.createSagProcessor('silicon', { depth: 0.07, att: 0.004, relFast: 0.04, relSlow: 0.15, rmsMs: 10, shape: 1.0, floor: 0.32, peakMix: 0.36 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6Modern();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupChannel('purple');
    this.recreateCabinet();

    this.params = { channel: 'purple', gain: 75, bass: 55, mid: 60, treble: 65, presence: 60, depth: 50, aggression: false, master: 50, gate: true, cabinet_enabled: true };
  }

  _makeRevvCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.04 * Math.tanh(xs * gain * 2.5);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.74) y = Math.sign(y) * (0.74 + (Math.abs(y) - 0.74) * 0.25);
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _make6L6Modern() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.7);
      y += 0.05 * Math.tanh(x * 5);
      if (x > 0) y *= 1.1;
      curve[i] = y * 0.86;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); if (this.noiseGate) this.noiseGate.disconnect();
      this.preampGain.disconnect(); this.aggressionGain.disconnect(); this.aggressionHP.disconnect();
      for (let i = 0; i < 5; i++) { this.stages[i].disconnect(); this.hpfs[i].disconnect(); }
      this.dcBlocker.disconnect(); this.channelVolume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.presence.disconnect(); this.depth.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupChannel(ch) {
    this._disconnectAllNodes();
    const cfg = this._chCfgs[ch] || this._chCfgs.purple;
    this.activeChannel = ch;
    this.preampGain.gain.value = cfg.pre;
    this.channelVolume.gain.value = cfg.post;

    if (this.gateEnabled && this.noiseGate) { this.input.connect(this.noiseGate); this.noiseGate.connect(this.preampGain); }
    else this.input.connect(this.preampGain);

    let last = this.preampGain;
    if (this.aggressionEnabled) {
      last.connect(this.aggressionGain); this.aggressionGain.connect(this.aggressionHP); last = this.aggressionHP;
    }

    for (let i = 0; i < cfg.stages; i++) {
      last.connect(this.stages[i]);
      if (i < cfg.stages - 1) { this.stages[i].connect(this.hpfs[i]); last = this.hpfs[i]; }
      else last = this.stages[i];
    }
    last.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation); this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.depth); this.depth.connect(this.output);
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
      case 'channel': this._setupChannel(value); this.recreateCabinet(); break;
      case 'gain': { const cfg = this._chCfgs[this.activeChannel]; this.preampGain.gain.setTargetAtTime(cfg.pre * (0.3 + (value / 100) * 1.4), now, 0.01); break; }
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'depth': this.depth.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'aggression': this.aggressionEnabled = !!value; this.aggressionGain.gain.value = value ? 2.0 : 1.0; this._setupChannel(this.activeChannel); this.recreateCabinet(); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'gate': this.gateEnabled = value; this._setupChannel(this.activeChannel); this.recreateCabinet(); break;
      case 'cabinet_enabled': this.cabinetEnabled = !!value; this.recreateCabinet(); break;
      case 'cabinet': this.cabinetType = value; this.recreateCabinet(); break;
      case 'microphone': case 'micType': this.micType = value; this.recreateCabinet(); break;
      case 'micPosition': this.micPosition = value; this.recreateCabinet(); break;
    }
    this.params[parameter] = value;
  }

  disconnect() { super.disconnect(); this._disconnectAllNodes(); }
}

export default RevvGenerator120Amp;
