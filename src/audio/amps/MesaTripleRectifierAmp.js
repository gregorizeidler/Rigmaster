import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Mesa Triple Rectifier - 150W 3-Channel High-Gain
 * 
 * The Triple Rectifier is the most powerful member of Mesa's
 * Rectifier family. 150 watts with 3 independent channels and
 * switchable rectifier modes (silicon/tube). Known for its
 * wall-of-sound tone with crushing gain and thundering low end.
 * Used by Dave Grohl, Deftones, and many heavy rock/metal bands.
 * 
 * Tubes: 6x 12AX7 (preamp), 6x 6L6 (power), 5U4/5AR4 rectifier
 * Cabinet: '4x12_v30'
 */
class MesaTripleRectifierAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa Triple Rectifier', 'mesa_triple_rectifier');

    this.activeChannel = 'modern'; // clean, vintage, modern
    this.rectifierMode = 'silicon'; // silicon, tube (bold/spongy)

    this.noiseGate = this.createNoiseGate({ thOpen: -46, thClose: -55, attack: 0.0005, release: 0.10, rms: 0.012, peakMix: 0.40, floorDb: -70, holdMs: 6 });
    this.gateEnabled = true;

    const chCfgs = {
      clean:   { pre: 1.5,  stages: 2, post: 0.9,  tightFreq: 50  },
      vintage: { pre: 8.0,  stages: 3, post: 0.65, tightFreq: 75  },
      modern:  { pre: 22.0, stages: 5, post: 0.45, tightFreq: 100 }
    };
    this._chCfgs = chCfgs;

    // PREAMP (6x 12AX7 cascaded)
    this.preampGain = audioContext.createGain(); this.preampGain.gain.value = 22.0;

    this.stages = []; this.hpfs = [];
    for (let i = 0; i < 5; i++) {
      const ws = audioContext.createWaveShaper(); ws.oversample = '4x';
      ws.curve = this._makeRectifierCurve(5 + i * 3.5, 0.025 + i * 0.018);
      this.stages.push(ws);
      const hp = audioContext.createBiquadFilter(); hp.type = 'highpass';
      hp.frequency.value = 30 + i * 15; hp.Q.value = 0.707;
      this.hpfs.push(hp);
    }

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain(); this.channelVolume.gain.value = 0.45;

    // TONE STACK
    this.bassEQ = audioContext.createBiquadFilter(); this.bassEQ.type = 'lowshelf'; this.bassEQ.frequency.value = 140; this.bassEQ.gain.value = 0;
    this.midEQ = audioContext.createBiquadFilter(); this.midEQ.type = 'peaking'; this.midEQ.frequency.value = 850; this.midEQ.Q.value = 1.8; this.midEQ.gain.value = 0;
    this.trebleEQ = audioContext.createBiquadFilter(); this.trebleEQ.type = 'highshelf'; this.trebleEQ.frequency.value = 3000; this.trebleEQ.gain.value = 0;

    this.presence = audioContext.createBiquadFilter(); this.presence.type = 'highshelf'; this.presence.frequency.value = 5000; this.presence.gain.value = 3;

    // ============================================
    // POWER AMP (6x 6L6 - massive headroom)
    // ============================================
    this.powerSag = this.createSagProcessor('silicon', { depth: 0.08, att: 0.005, relFast: 0.05, relSlow: 0.17, rmsMs: 11, shape: 1.0, floor: 0.30, peakMix: 0.33 });

    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6TriplePower();

    // ============================================
    // CABINET
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '4x12_v30'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupChannel('modern');
    this.recreateCabinet();

    this.params = { channel: 'modern', gain: 80, bass: 60, mid: 50, treble: 65, presence: 60, master: 50, rectifier: 'silicon', gate: true, cabinet_enabled: true };
  }

  _makeRectifierCurve(gain, asym) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; const xs = x + asym;
      let y = Math.tanh(xs * gain);
      // Recto signature: thick, saturated, wall-of-sound
      y += 0.05 * Math.tanh(xs * gain * 2);
      y += 0.03 * Math.tanh(xs * gain * 4);
      y -= Math.tanh(asym * gain);
      if (x > 0) y *= 1.07;
      if (Math.abs(y) > 0.72) y = Math.sign(y) * (0.72 + (Math.abs(y) - 0.72) * 0.25);
      curve[i] = y * 0.86;
    }
    return curve;
  }

  _make6L6TriplePower() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // 150W: massive headroom, clean power section
      let y = Math.tanh(x * 1.3);
      y += 0.04 * Math.tanh(x * 3);
      if (x > 0) y *= 1.06;
      // Very little power amp distortion due to 150W headroom
      curve[i] = y * 0.92;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect(); if (this.noiseGate) this.noiseGate.disconnect();
      this.preampGain.disconnect();
      for (let i = 0; i < 5; i++) { this.stages[i].disconnect(); this.hpfs[i].disconnect(); }
      this.dcBlocker.disconnect(); this.channelVolume.disconnect();
      this.bassEQ.disconnect(); this.midEQ.disconnect(); this.trebleEQ.disconnect();
      this.presence.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupChannel(ch) {
    this._disconnectAllNodes();
    const cfg = this._chCfgs[ch] || this._chCfgs.modern;
    this.activeChannel = ch;
    this.preampGain.gain.value = cfg.pre;
    this.channelVolume.gain.value = cfg.post;

    if (this.gateEnabled && this.noiseGate) { this.input.connect(this.noiseGate); this.noiseGate.connect(this.preampGain); }
    else this.input.connect(this.preampGain);

    let last = this.preampGain;
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
      case 'gain': {
        const cfg = this._chCfgs[this.activeChannel];
        this.preampGain.gain.setTargetAtTime(cfg.pre * (0.3 + (value / 100) * 1.4), now, 0.01);
        break;
      }
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'rectifier':
        this.rectifierMode = value;
        // Switch sag characteristics
        if (this.powerSag) {
          if (value === 'tube') {
            try {
              this.powerSag.parameters.get('depth').value = 0.15;
              this.powerSag.parameters.get('relSlow').value = 0.25;
              this.powerSag.parameters.get('shape').value = 1.6;
              this.powerSag.parameters.get('floor').value = 0.25;
            } catch (e) {}
          } else {
            try {
              this.powerSag.parameters.get('depth').value = 0.08;
              this.powerSag.parameters.get('relSlow').value = 0.17;
              this.powerSag.parameters.get('shape').value = 1.0;
              this.powerSag.parameters.get('floor').value = 0.30;
            } catch (e) {}
          }
        }
        break;
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

export default MesaTripleRectifierAmp;
