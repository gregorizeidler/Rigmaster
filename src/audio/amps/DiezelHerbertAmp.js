import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Diezel Herbert - 180W German Extreme Gain, 3-Channel
 * 
 * The Herbert is Diezel's flagship, a 180-watt monster with three
 * independent channels. Known for its incredibly tight, articulate
 * high-gain tone with German precision. Adam Jones (Tool), Jerry
 * Cantrell (AiC). Each channel has independent gain and volume.
 * 
 * Tubes: 7x 12AX7 (preamp), 4x KT77/6L6 (power)
 * Cabinet: '4x12_v30'
 */
class DiezelHerbertAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Diezel Herbert', 'diezel_herbert');

    this.activeChannel = 'ch2'; // ch1 (clean), ch2 (crunch), ch3 (lead)

    const chConfigs = { ch1: { pre: 1.5, stages: 2, post: 0.9 }, ch2: { pre: 6.0, stages: 3, post: 0.7 }, ch3: { pre: 18.0, stages: 5, post: 0.5 } };
    this._chConfigs = chConfigs;

    // PREAMP
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 6.0;

    this.stages = [];
    this.hpfs = [];
    for (let i = 0; i < 5; i++) {
      const ws = audioContext.createWaveShaper(); ws.oversample = '4x';
      ws.curve = this._makeDiezelCurve(4 + i * 3, 0.02 + i * 0.015);
      this.stages.push(ws);
      const hp = audioContext.createBiquadFilter(); hp.type = 'highpass';
      hp.frequency.value = 30 + i * 10; hp.Q.value = 0.707;
      this.hpfs.push(hp);
    }

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.7;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 140; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 900; this.midEQ.Q.value = 1.8; this.midEQ.gain.value = 0;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 3000; this.trebleEQ.gain.value = 0;

    // Deep switch
    this.deepSwitch = audioContext.createBiquadFilter(); this.deepSwitch.type = 'lowshelf'; this.deepSwitch.frequency.value = 80; this.deepSwitch.gain.value = 0;

    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 3;

    // POWER AMP (4x KT77)
    this.powerSag = this.createSagProcessor('silicon', { depth: 0.07, att: 0.004, relFast: 0.04, relSlow: 0.15, rmsMs: 10, shape: 1.0, floor: 0.32, peakMix: 0.35 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeKT77Power();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupChannel('ch2');
    this.recreateCabinet();

    this.params = { channel: 'ch2', gain: 70, bass: 55, mid: 60, treble: 65, presence: 60, deep: false, master: 50, cabinet_enabled: true };
  }

  _makeDiezelCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.03 * Math.tanh(xs * gain * 2.5);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.06;
      if (Math.abs(y) > 0.75) y = Math.sign(y) * (0.75 + (Math.abs(y) - 0.75) * 0.25);
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _makeKT77Power() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.6);
      y += 0.04 * Math.tanh(x * 5);
      if (x > 0) y *= 1.08;
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); this.preampGain.disconnect();
      for (let i = 0; i < 5; i++) { this.stages[i].disconnect(); this.hpfs[i].disconnect(); }
      this.dcBlocker.disconnect(); this.channelVolume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.deepSwitch.disconnect(); this.presence.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupChannel(ch) {
    this._disconnectAllNodes();
    const cfg = this._chConfigs[ch] || this._chConfigs.ch2;
    this.activeChannel = ch;
    this.preampGain.gain.value = cfg.pre;
    this.channelVolume.gain.value = cfg.post;

    this.input.connect(this.preampGain);
    let last = this.preampGain;
    for (let i = 0; i < cfg.stages; i++) {
      last.connect(this.stages[i]);
      if (i < cfg.stages - 1) { this.stages[i].connect(this.hpfs[i]); last = this.hpfs[i]; }
      else last = this.stages[i];
    }
    last.connect(this.dcBlocker);
    this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.deepSwitch);
    this.deepSwitch.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence); this.presence.connect(this.output);
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
      case 'gain': { const cfg = this._chConfigs[this.activeChannel]; this.preampGain.gain.setTargetAtTime(cfg.pre * (0.3 + (value / 100) * 1.4), now, 0.01); break; }
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'deep': this.deepSwitch.gain.setTargetAtTime(value ? 6 : 0, now, 0.02); break;
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

export default DiezelHerbertAmp;
