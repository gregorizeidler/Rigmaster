import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * ENGL Savage 120 - Aggressive German High-Gain
 * 
 * The ENGL Savage is known for its brutal, aggressive tone with
 * incredible note definition even at extreme gain. Features 4 channels
 * and ENGL's signature mid-focused voicing. Used by Alexi Laiho,
 * Marty Friedman, and many extreme metal guitarists.
 * 
 * Tubes: 4x 12AX7 (preamp), 4x 6L6GC (power)
 * Cabinet: '4x12_v30'
 */
class ENGLSavageAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'ENGL Savage', 'engl_savage');

    this.activeChannel = 'lead2';

    this.noiseGate = this.createNoiseGate({ thOpen: -46, thClose: -54, attack: 0.0004, release: 0.09, rms: 0.011, peakMix: 0.42, floorDb: -72, holdMs: 5 });
    this.gateEnabled = true;

    // PREAMP (4 cascaded stages with tight filtering)
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 15.0;

    this.stages = [];
    this.hpfs = [];
    for (let i = 0; i < 4; i++) {
      const ws = audioContext.createWaveShaper(); ws.oversample = '4x';
      ws.curve = this._makeENGLCurve(5 + i * 4, 0.03 + i * 0.02);
      this.stages.push(ws);
      const hp = audioContext.createBiquadFilter(); hp.type = 'highpass';
      hp.frequency.value = 40 + i * 12; hp.Q.value = 0.707;
      this.hpfs.push(hp);
    }

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.55;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 130; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 1000; this.midEQ.Q.value = 2.0; this.midEQ.gain.value = 3;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 3200; this.trebleEQ.gain.value = 0;

    // Contour (mid-notch)
    this.contour = audioContext.createBiquadFilter(); this.contour.type = 'peaking'; this.contour.frequency.value = 600; this.contour.Q.value = 2.5; this.contour.gain.value = 0;

    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 3;
    this.depth = audioContext.createBiquadFilter(); this.depth.type = 'lowshelf'; this.depth.frequency.value = 80; this.depth.gain.value = 2;

    // POWER AMP (4x 6L6GC)
    this.powerSag = this.createSagProcessor('silicon', { depth: 0.08, att: 0.004, relFast: 0.045, relSlow: 0.16, rmsMs: 10, shape: 1.1, floor: 0.32, peakMix: 0.36 });
    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6Aggressive();

    // CABINET
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupRouting(4);
    this.recreateCabinet();

    this.params = { gain: 75, bass: 55, mid: 65, treble: 65, presence: 60, depth: 50, contour: 50, master: 50, gate: true, cabinet_enabled: true };
  }

  _makeENGLCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.035 * Math.tanh(xs * gain * 2.5);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.07;
      if (Math.abs(y) > 0.73) y = Math.sign(y) * (0.73 + (Math.abs(y) - 0.73) * 0.25);
      curve[i] = y * 0.87;
    }
    return curve;
  }

  _make6L6Aggressive() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.8);
      y += 0.06 * Math.tanh(x * 5);
      if (x > 0) y *= 1.1;
      curve[i] = y * 0.85;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); if (this.noiseGate) this.noiseGate.disconnect();
      this.preampGain.disconnect();
      for (let i = 0; i < 4; i++) { this.stages[i].disconnect(); this.hpfs[i].disconnect(); }
      this.dcBlocker.disconnect(); this.channelVolume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.contour.disconnect(); this.presence.disconnect(); this.depth.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupRouting(numStages) {
    this._disconnectAllNodes();
    if (this.gateEnabled && this.noiseGate) { this.input.connect(this.noiseGate); this.noiseGate.connect(this.preampGain); }
    else this.input.connect(this.preampGain);
    let last = this.preampGain;
    for (let i = 0; i < numStages; i++) {
      last.connect(this.stages[i]);
      if (i < numStages - 1) { this.stages[i].connect(this.hpfs[i]); last = this.hpfs[i]; }
      else last = this.stages[i];
    }
    last.connect(this.dcBlocker); this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ); this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ); this.trebleEQ.connect(this.contour);
    this.contour.connect(this.master);
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
      case 'gain': this.preampGain.gain.setTargetAtTime(1 + (value / 100) * 20, now, 0.01); break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'depth': this.depth.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'contour': this.contour.gain.setTargetAtTime(-(value - 50) / 5, now, 0.01); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'gate': this.gateEnabled = value; this._setupRouting(4); this.recreateCabinet(); break;
      case 'cabinet_enabled': this.cabinetEnabled = !!value; this.recreateCabinet(); break;
      case 'cabinet': this.cabinetType = value; this.recreateCabinet(); break;
      case 'microphone': case 'micType': this.micType = value; this.recreateCabinet(); break;
      case 'micPosition': this.micPosition = value; this.recreateCabinet(); break;
    }
    this.params[parameter] = value;
  }

  disconnect() { super.disconnect(); this._disconnectAllNodes(); }
}

export default ENGLSavageAmp;
