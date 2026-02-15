import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Marshall JVM410H - 4-Channel 100W Modern Marshall
 * 
 * The JVM410H is Marshall's most versatile head, featuring four
 * independent channels (Clean, Crunch, OD1, OD2), each with three
 * gain modes (green/orange/red). The definitive modern Marshall.
 * 
 * Tubes: 5x 12AX7/ECC83, 4x EL34
 * Cabinet: '4x12_vintage'
 */
class MarshallJVM410Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JVM410', 'marshall_jvm410');

    this.activeChannel = 'od1';

    // Channel configs: { preGain, stages, postGain, midFreq, midQ }
    this.channelConfigs = {
      clean:  { preGain: 1.5,  stages: 1, postGain: 0.9,  midFreq: 700,  midQ: 0.8,  tanhK: 1.5 },
      crunch: { preGain: 4.0,  stages: 2, postGain: 0.8,  midFreq: 800,  midQ: 1.2,  tanhK: 4.0 },
      od1:    { preGain: 10.0, stages: 3, postGain: 0.65, midFreq: 900,  midQ: 1.8,  tanhK: 7.0 },
      od2:    { preGain: 20.0, stages: 4, postGain: 0.5,  midFreq: 1000, midQ: 2.2,  tanhK: 12.0 }
    };

    // ============================================
    // PREAMP STAGES (5x 12AX7)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 10.0;

    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._makePreampCurve(4.0, 0.02);

    this.hp1 = audioContext.createBiquadFilter();
    this.hp1.type = 'highpass';
    this.hp1.frequency.value = 35;
    this.hp1.Q.value = 0.707;

    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._makePreampCurve(6.0, 0.04);

    this.hp2 = audioContext.createBiquadFilter();
    this.hp2.type = 'highpass';
    this.hp2.frequency.value = 45;
    this.hp2.Q.value = 0.707;

    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._makePreampCurve(8.0, 0.06);

    this.hp3 = audioContext.createBiquadFilter();
    this.hp3.type = 'highpass';
    this.hp3.frequency.value = 55;
    this.hp3.Q.value = 0.707;

    this.stage4 = audioContext.createWaveShaper();
    this.stage4.oversample = '4x';
    this.stage4.curve = this._makePreampCurve(12.0, 0.08);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain();
    this.channelVolume.gain.value = 0.65;

    // ============================================
    // TONE STACK
    // ============================================
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 150;
    this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking';
    this.midEQ.frequency.value = 900;
    this.midEQ.Q.value = 1.5;
    this.midEQ.gain.value = 2;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 2500;
    this.trebleEQ.gain.value = 0;

    // ============================================
    // RESONANCE & PRESENCE
    // ============================================
    this.resonance = audioContext.createBiquadFilter();
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 100;
    this.resonance.gain.value = 2;

    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 3;

    // ============================================
    // POWER AMP (4x EL34)
    // ============================================
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.08,
      att: 0.005,
      relFast: 0.055,
      relSlow: 0.18,
      rmsMs: 12.0,
      shape: 1.2,
      floor: 0.30,
      peakMix: 0.33
    });

    this.master = audioContext.createGain();
    this.master.gain.value = 0.5;

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL34PowerCurve();

    // ============================================
    // CABINET
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x12_vintage';
    this.micType = 'sm57';
    this.micPosition = 'edge';

    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

    this._setupChannel('od1');
    this.recreateCabinet();

    this.params = {
      channel: 'od1',
      gain: 70,
      bass: 60,
      mid: 65,
      treble: 65,
      presence: 60,
      resonance: 50,
      master: 50,
      cabinet_enabled: true
    };
  }

  _makePreampCurve(gain, asymmetry) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xS = x + asymmetry;
      let y = Math.tanh(xS * gain);
      y += 0.03 * Math.tanh(xS * gain * 3);
      y -= Math.tanh(asymmetry * gain);
      if (Math.abs(y) > 0.75) {
        y = Math.sign(y) * (0.75 + (Math.abs(y) - 0.75) * 0.3);
      }
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _makeEL34PowerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.05 * Math.tanh(x * 4);
      y += 0.03 * Math.sin(x * Math.PI * 3);
      if (x > 0) y *= 1.07;
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect();
      this.preampGain.disconnect();
      this.stage1.disconnect();
      this.hp1.disconnect();
      this.stage2.disconnect();
      this.hp2.disconnect();
      this.stage3.disconnect();
      this.hp3.disconnect();
      this.stage4.disconnect();
      this.dcBlocker.disconnect();
      this.channelVolume.disconnect();
      this.bassEQ.disconnect();
      this.midEQ.disconnect();
      this.trebleEQ.disconnect();
      this.resonance.disconnect();
      this.presence.disconnect();
      this.master.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupChannel(ch) {
    this._disconnectAllNodes();
    const cfg = this.channelConfigs[ch] || this.channelConfigs.od1;
    this.activeChannel = ch;

    const now = this.audioContext.currentTime;
    this.preampGain.gain.setTargetAtTime(cfg.preGain, now, 0.02);
    this.channelVolume.gain.setTargetAtTime(cfg.postGain, now, 0.02);
    this.midEQ.frequency.setTargetAtTime(cfg.midFreq, now, 0.02);
    this.midEQ.Q.setTargetAtTime(cfg.midQ, now, 0.02);

    // Build chain based on number of stages
    this.input.connect(this.preampGain);
    let lastNode = this.preampGain;

    lastNode.connect(this.stage1);
    lastNode = this.stage1;
    if (cfg.stages >= 2) {
      lastNode.connect(this.hp1);
      this.hp1.connect(this.stage2);
      lastNode = this.stage2;
    }
    if (cfg.stages >= 3) {
      lastNode.connect(this.hp2);
      this.hp2.connect(this.stage3);
      lastNode = this.stage3;
    }
    if (cfg.stages >= 4) {
      lastNode.connect(this.hp3);
      this.hp3.connect(this.stage4);
      lastNode = this.stage4;
    }

    lastNode.connect(this.dcBlocker);
    this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.master);

    if (this.powerSag) {
      this.master.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.master.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.output);
  }

  recreateCabinet() {
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
    try { this.preCabinet.disconnect(); } catch (e) {}
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(this.cabinetType, this.micType, this.micPosition);
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      this.preCabinet.connect(this.postCabinet);
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'channel':
        this._setupChannel(value);
        this.recreateCabinet();
        break;
      case 'gain': {
        const cfg = this.channelConfigs[this.activeChannel];
        const g = cfg.preGain * (0.3 + (value / 100) * 1.4);
        this.preampGain.gain.setTargetAtTime(g, now, 0.01);
        break;
      }
      case 'bass':
        this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'mid':
        this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'treble':
        this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'resonance':
        this.resonance.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
        this.micPosition = value;
        this.recreateCabinet();
        break;
    }
    this.params[parameter] = value;
  }

  disconnect() {
    super.disconnect();
    this._disconnectAllNodes();
  }
}

export default MarshallJVM410Amp;
