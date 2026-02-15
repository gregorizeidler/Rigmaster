import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Marshall DSL - Dual Super Lead 100W
 * 
 * The Marshall DSL series (originally DSL100) is the modern descendant
 * of the Super Lead line. Features two channels (Classic Gain / Ultra Gain),
 * each with two modes. Known for its versatile Marshall tone from clean
 * to high-gain. One of Marshall's best-selling amp series.
 * 
 * Tubes: 4x 12AX7/ECC83 (preamp), 4x EL34 (power)
 * Cabinet: '4x12_vintage'
 */
class MarshallDSLAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall DSL', 'marshall_dsl');

    this.activeChannel = 'ultra';

    // ============================================
    // PREAMP
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 6.0;

    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this._makeMarshallCurve(5.0, 0.03);

    this.hp1 = audioContext.createBiquadFilter();
    this.hp1.type = 'highpass';
    this.hp1.frequency.value = 40;
    this.hp1.Q.value = 0.707;

    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this._makeMarshallCurve(7.0, 0.05);

    this.hp2 = audioContext.createBiquadFilter();
    this.hp2.type = 'highpass';
    this.hp2.frequency.value = 50;
    this.hp2.Q.value = 0.707;

    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this._makeMarshallCurve(10.0, 0.07);

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    this.channelVolume = audioContext.createGain();
    this.channelVolume.gain.value = 0.6;

    // ============================================
    // TONE STACK
    // ============================================
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 150;
    this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking';
    this.midEQ.frequency.value = 850;
    this.midEQ.Q.value = 1.5;
    this.midEQ.gain.value = 2;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 2500;
    this.trebleEQ.gain.value = 0;

    // Tone shift (deep switch emulation - boosts lows and mids)
    this.toneShift = audioContext.createBiquadFilter();
    this.toneShift.type = 'peaking';
    this.toneShift.frequency.value = 400;
    this.toneShift.Q.value = 0.8;
    this.toneShift.gain.value = 0;

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
      depth: 0.09,
      att: 0.006,
      relFast: 0.06,
      relSlow: 0.19,
      rmsMs: 14.0,
      shape: 1.2,
      floor: 0.28,
      peakMix: 0.32
    });

    this.master = audioContext.createGain();
    this.master.gain.value = 0.5;

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL34Power();

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

    this._setupUltraChannel();
    this.recreateCabinet();

    this.params = {
      channel: 1,
      gain: 65,
      bass: 60,
      mid: 60,
      treble: 65,
      presence: 60,
      resonance: 50,
      tone_shift: false,
      master: 50,
      cabinet_enabled: true
    };
  }

  _makeMarshallCurve(gain, asym) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const xs = x + asym;
      let y = Math.tanh(xs * gain);
      y += 0.04 * Math.tanh(xs * gain * 3);
      y -= Math.tanh(asym * gain);
      if (Math.abs(y) > 0.72) y = Math.sign(y) * (0.72 + (Math.abs(y) - 0.72) * 0.3);
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _makeEL34Power() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.05 * Math.tanh(x * 4);
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
      this.dcBlocker.disconnect();
      this.channelVolume.disconnect();
      this.bassEQ.disconnect();
      this.midEQ.disconnect();
      this.trebleEQ.disconnect();
      this.toneShift.disconnect();
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

  _setupClassicChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1);
    this.hp1.connect(this.stage2);
    this.stage2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.toneShift);
    this.toneShift.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.output);
    this.activeChannel = 'classic';
    this.preampGain.gain.value = 3.0;
    this.channelVolume.gain.value = 0.8;
  }

  _setupUltraChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.stage1);
    this.stage1.connect(this.hp1);
    this.hp1.connect(this.stage2);
    this.stage2.connect(this.hp2);
    this.hp2.connect(this.stage3);
    this.stage3.connect(this.dcBlocker);
    this.dcBlocker.connect(this.channelVolume);
    this.channelVolume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.toneShift);
    this.toneShift.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.output);
    this.activeChannel = 'ultra';
    this.preampGain.gain.value = 6.0;
    this.channelVolume.gain.value = 0.6;
  }

  recreateCabinet() {
    if (this.cabinet) {
      try { if (this.cabinet.input) this.cabinet.input.disconnect(); if (this.cabinet.output) this.cabinet.output.disconnect(); } catch (e) {}
    }
    try { this.preCabinet.disconnect(); } catch (e) {}
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(this.cabinetType, this.micType, this.micPosition);
      if (this.cabinet) { this.preCabinet.connect(this.cabinet.input); this.cabinet.output.connect(this.postCabinet); }
      else this.preCabinet.connect(this.postCabinet);
    } else { this.preCabinet.connect(this.postCabinet); }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'channel':
        if (value === 0) this._setupClassicChannel(); else this._setupUltraChannel();
        this.recreateCabinet();
        break;
      case 'gain':
        this.preampGain.gain.setTargetAtTime(1 + (value / 100) * (this.activeChannel === 'ultra' ? 12 : 6), now, 0.01);
        break;
      case 'bass': this.bassEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.midEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'treble': this.trebleEQ.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'resonance': this.resonance.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'tone_shift': this.toneShift.gain.setTargetAtTime(value ? 4 : 0, now, 0.02); break;
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

export default MarshallDSLAmp;
