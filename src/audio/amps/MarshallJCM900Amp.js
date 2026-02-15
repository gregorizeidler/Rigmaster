import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Marshall JCM900 - 90s High-Gain Marshall 100W
 * 
 * The JCM900 bridged the gap between the classic JCM800 and modern
 * high-gain Marshalls. Features a diode-clipping circuit for additional
 * gain on the lead channel, making it more aggressive than the JCM800
 * while retaining the classic Marshall midrange character. Used by
 * Slash, Gary Moore, and many 90s rock bands.
 * 
 * Tubes: 3x 12AX7 (preamp), 2x EL34 or 5881 (power)
 * Cabinet: '4x12_vintage'
 */
class MarshallJCM900Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Marshall JCM900', 'marshall_jcm900');

    this.activeChannel = 'lead';

    // ============================================
    // PREAMP (12AX7 x3 + diode clipping on lead)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 3.0;

    this.preampStage1 = audioContext.createWaveShaper();
    this.preampStage1.oversample = '4x';
    this.preampStage1.curve = this._makeMarshallPreampCurve(4.0);

    this.couplingHP1 = audioContext.createBiquadFilter();
    this.couplingHP1.type = 'highpass';
    this.couplingHP1.frequency.value = 40;
    this.couplingHP1.Q.value = 0.707;

    this.preampStage2 = audioContext.createWaveShaper();
    this.preampStage2.oversample = '4x';
    this.preampStage2.curve = this._makeMarshallPreampCurve(6.0);

    this.couplingHP2 = audioContext.createBiquadFilter();
    this.couplingHP2.type = 'highpass';
    this.couplingHP2.frequency.value = 50;
    this.couplingHP2.Q.value = 0.707;

    // Diode clipping stage (JCM900 signature - lead channel only)
    this.diodeClip = audioContext.createWaveShaper();
    this.diodeClip.oversample = '4x';
    this.diodeClip.curve = this._makeDiodeClipCurve();

    this.preampStage3 = audioContext.createWaveShaper();
    this.preampStage3.oversample = '4x';
    this.preampStage3.curve = this._makeMarshallPreampCurve(8.0);

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // Channel volumes
    this.cleanVolume = audioContext.createGain();
    this.cleanVolume.gain.value = 0.5;
    this.leadVolume = audioContext.createGain();
    this.leadVolume.gain.value = 0.6;

    // ============================================
    // TONE STACK (Marshall-style)
    // ============================================
    this.bassEQ = audioContext.createBiquadFilter();
    this.bassEQ.type = 'lowshelf';
    this.bassEQ.frequency.value = 150;
    this.bassEQ.gain.value = 0;

    this.midEQ = audioContext.createBiquadFilter();
    this.midEQ.type = 'peaking';
    this.midEQ.frequency.value = 800;
    this.midEQ.Q.value = 1.5;
    this.midEQ.gain.value = 2;

    this.trebleEQ = audioContext.createBiquadFilter();
    this.trebleEQ.type = 'highshelf';
    this.trebleEQ.frequency.value = 2500;
    this.trebleEQ.gain.value = 0;

    // ============================================
    // PRESENCE & RESONANCE
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 3;

    this.resonance = audioContext.createBiquadFilter();
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 100;
    this.resonance.gain.value = 2;

    // ============================================
    // POWER AMP (EL34 x2)
    // ============================================
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.09,
      att: 0.006,
      relFast: 0.06,
      relSlow: 0.20,
      rmsMs: 15.0,
      shape: 1.3,
      floor: 0.28,
      peakMix: 0.32
    });

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._makeEL34PowerCurve();

    this.master = audioContext.createGain();
    this.master.gain.value = 0.5;

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

    this._setupLeadChannel();
    this.recreateCabinet();

    this.params = {
      channel: 1,
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

  _makeMarshallPreampCurve(gain) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * gain);
      y += 0.04 * Math.tanh(x * gain * 3);
      if (x > 0) y *= 1.08;
      if (Math.abs(y) > 0.7) {
        y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.35);
      }
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _makeDiodeClipCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Diode clipping: harder knee than tube
      let y;
      if (Math.abs(x) < 0.3) {
        y = x * 2.5;
      } else {
        y = Math.sign(x) * (0.75 + 0.25 * Math.tanh((Math.abs(x) - 0.3) * 8));
      }
      // Slight asymmetry (silicon diodes)
      if (x > 0) y *= 1.05;
      curve[i] = y * 0.85;
    }
    return curve;
  }

  _makeEL34PowerCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.6);
      y += 0.06 * Math.tanh(x * 5);
      y += 0.03 * Math.sin(x * Math.PI * 3);
      if (x > 0) y *= 1.08;
      if (Math.abs(y) > 0.65) {
        y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.3);
      }
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect();
      this.preampGain.disconnect();
      this.preampStage1.disconnect();
      this.couplingHP1.disconnect();
      this.preampStage2.disconnect();
      this.couplingHP2.disconnect();
      this.diodeClip.disconnect();
      this.preampStage3.disconnect();
      this.dcBlocker.disconnect();
      this.cleanVolume.disconnect();
      this.leadVolume.disconnect();
      this.bassEQ.disconnect();
      this.midEQ.disconnect();
      this.trebleEQ.disconnect();
      this.presence.disconnect();
      this.resonance.disconnect();
      this.master.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupLeadChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.couplingHP1);
    this.couplingHP1.connect(this.preampStage2);
    this.preampStage2.connect(this.couplingHP2);
    this.couplingHP2.connect(this.diodeClip);
    this.diodeClip.connect(this.preampStage3);
    this.preampStage3.connect(this.dcBlocker);
    this.dcBlocker.connect(this.leadVolume);
    this.leadVolume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.master);
    this.master.connect(this.powerSag || this.powerAmp);
    if (this.powerSag) this.powerSag.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.output);
    this.activeChannel = 'lead';
  }

  _setupCleanChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.couplingHP1);
    this.couplingHP1.connect(this.preampStage2);
    this.preampStage2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.cleanVolume);
    this.cleanVolume.connect(this.bassEQ);
    this.bassEQ.connect(this.midEQ);
    this.midEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.master);
    this.master.connect(this.powerSag || this.powerAmp);
    if (this.powerSag) this.powerSag.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.presence);
    this.presence.connect(this.resonance);
    this.resonance.connect(this.output);
    this.activeChannel = 'clean';
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
        if (value === 0) this._setupCleanChannel();
        else this._setupLeadChannel();
        this.recreateCabinet();
        break;
      case 'gain': {
        const g = 1 + (value / 100) * 8;
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

export default MarshallJCM900Amp;
