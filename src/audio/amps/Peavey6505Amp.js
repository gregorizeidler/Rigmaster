import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Peavey 6505 - Metal Standard 120W (formerly 5150 II)
 * 
 * The 6505 is the renamed 5150 II after EVH left Peavey. Same circuit
 * foundation as the 5150 but with slightly different voicing - tighter
 * low end and more aggressive mids. THE standard for modern metal.
 * Used by August Burns Red, Trivium, and countless metal bands.
 * 
 * Tubes: 5x 12AX7 (preamp), 4x 6L6GC (power)
 * Cabinet: '4x12_sheffield'
 */
class Peavey6505Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Peavey 6505', 'peavey_6505');

    this.activeChannel = 'lead';

    this.noiseGate = this.createNoiseGate({
      thOpen: -48, thClose: -56, attack: 0.0005, release: 0.10,
      rms: 0.012, peakMix: 0.40, floorDb: -70, holdMs: 6
    });
    this.gateEnabled = true;

    // ============================================
    // PREAMP (5 cascaded gain stages - tighter voicing than 5150)
    // ============================================
    this.rhythmPreGain = audioContext.createGain();
    this.rhythmPreGain.gain.value = 5;
    this.leadPreGain = audioContext.createGain();
    this.leadPreGain.gain.value = 22;

    this.gain1 = audioContext.createWaveShaper(); this.gain1.oversample = '4x';
    this.gain1.curve = this._makeGainStage(1, 9.0, 0.03);
    this.gain2 = audioContext.createWaveShaper(); this.gain2.oversample = '4x';
    this.gain2.curve = this._makeGainStage(2, 11.0, 0.05);
    this.gain3 = audioContext.createWaveShaper(); this.gain3.oversample = '4x';
    this.gain3.curve = this._makeGainStage(3, 13.0, 0.08);
    this.gain4 = audioContext.createWaveShaper(); this.gain4.oversample = '4x';
    this.gain4.curve = this._makeGainStage(4, 15.0, 0.10);
    this.gain5 = audioContext.createWaveShaper(); this.gain5.oversample = '4x';
    this.gain5.curve = this._makeGainStage(5, 16.0, 0.12);

    this.hpf1 = audioContext.createBiquadFilter(); this.hpf1.type = 'highpass'; this.hpf1.frequency.value = 35; this.hpf1.Q.value = 0.707;
    this.hpf2 = audioContext.createBiquadFilter(); this.hpf2.type = 'highpass'; this.hpf2.frequency.value = 45; this.hpf2.Q.value = 0.707;
    this.hpf3 = audioContext.createBiquadFilter(); this.hpf3.type = 'highpass'; this.hpf3.frequency.value = 55; this.hpf3.Q.value = 0.707;
    this.hpf4 = audioContext.createBiquadFilter(); this.hpf4.type = 'highpass'; this.hpf4.frequency.value = 65; this.hpf4.Q.value = 0.707;

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass'; this.dcBlocker.frequency.value = 20; this.dcBlocker.Q.value = 0.707;

    this.leadPostGain = audioContext.createGain(); this.leadPostGain.gain.value = 1.5;
    this.rhythmPostGain = audioContext.createGain(); this.rhythmPostGain.gain.value = 1.0;

    // ============================================
    // TONE STACK (tighter than 5150)
    // ============================================
    this.sharedLow = audioContext.createBiquadFilter();
    this.sharedLow.type = 'lowshelf'; this.sharedLow.frequency.value = 160; this.sharedLow.gain.value = 7;
    this.sharedMid = audioContext.createBiquadFilter();
    this.sharedMid.type = 'peaking'; this.sharedMid.frequency.value = 800; this.sharedMid.Q.value = 2; this.sharedMid.gain.value = -4;
    this.sharedHigh = audioContext.createBiquadFilter();
    this.sharedHigh.type = 'highshelf'; this.sharedHigh.frequency.value = 3200; this.sharedHigh.gain.value = 5;

    // ============================================
    // RESONANCE & PRESENCE
    // ============================================
    this.resonance = audioContext.createBiquadFilter();
    this.resonance.type = 'lowshelf'; this.resonance.frequency.value = 100; this.resonance.gain.value = 3;
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf'; this.presence.frequency.value = 4000; this.presence.gain.value = 4;

    // ============================================
    // POWER AMP (4x 6L6GC)
    // ============================================
    this.powerSag = this.createSagProcessor('silicon', {
      depth: 0.09, att: 0.005, relFast: 0.05, relSlow: 0.17,
      rmsMs: 11.0, shape: 1.1, floor: 0.30, peakMix: 0.35
    });

    this.master = audioContext.createGain(); this.master.gain.value = 0.5;
    this.powerAmp = audioContext.createGain(); this.powerAmp.gain.value = 1.0;
    this.powerSaturation = audioContext.createWaveShaper(); this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6PowerCurve();

    // ============================================
    // CABINET
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; this.cabinetEnabled = true;
    this.cabinetType = '4x12_sheffield'; this.micType = 'sm57'; this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain(); this.postCabinet = audioContext.createGain();

    this._setupLeadChannel();
    this.recreateCabinet();

    this.params = { channel: 1, lead_pre_gain: 80, lead_post_gain: 70, rhythm_pre_gain: 50, rhythm_post_gain: 50, low: 75, mid: 40, high: 70, resonance: 60, presence: 65, master: 50, gate: true, cabinet_enabled: true };
  }

  _makeGainStage(stage, gainFactor, asymmetry) {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let x = (i * 2) / samples - 1;
      x += asymmetry;
      const knee = 1.0 + (stage * 0.05);
      let y = Math.tanh(x * gainFactor * knee);
      y -= Math.tanh(asymmetry * gainFactor * knee);
      curve[i] = y;
    }
    return curve;
  }

  _make6L6PowerCurve() {
    const samples = 65536; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.9);
      if (Math.abs(x) > 0.2 && Math.abs(x) < 0.5) y *= 0.87;
      if (x > 0) y *= 1.22;
      y += 0.08 * Math.tanh(x * 22);
      curve[i] = y * 0.72;
    }
    return curve;
  }

  _disconnectAll() {
    try {
      this.input.disconnect(); if (this.noiseGate) this.noiseGate.disconnect();
      this.leadPreGain.disconnect(); this.rhythmPreGain.disconnect();
      this.gain1.disconnect(); this.gain2.disconnect(); this.gain3.disconnect();
      this.gain4.disconnect(); this.gain5.disconnect();
      this.hpf1.disconnect(); this.hpf2.disconnect(); this.hpf3.disconnect(); this.hpf4.disconnect();
      this.dcBlocker.disconnect(); this.leadPostGain.disconnect(); this.rhythmPostGain.disconnect();
      this.sharedLow.disconnect(); this.sharedMid.disconnect(); this.sharedHigh.disconnect();
      this.resonance.disconnect(); this.presence.disconnect();
      this.master.disconnect(); if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect(); this.powerSaturation.disconnect();
      this.preCabinet.disconnect(); this.postCabinet.disconnect();
    } catch (e) {}
  }

  _setupLeadChannel() {
    this._disconnectAll();
    if (this.gateEnabled && this.noiseGate) { this.input.connect(this.noiseGate); this.noiseGate.connect(this.leadPreGain); }
    else this.input.connect(this.leadPreGain);
    this.leadPreGain.connect(this.gain1); this.gain1.connect(this.hpf1);
    this.hpf1.connect(this.gain2); this.gain2.connect(this.hpf2);
    this.hpf2.connect(this.gain3); this.gain3.connect(this.hpf3);
    this.hpf3.connect(this.gain4); this.gain4.connect(this.hpf4);
    this.hpf4.connect(this.gain5); this.gain5.connect(this.dcBlocker);
    this.dcBlocker.connect(this.sharedLow); this.sharedLow.connect(this.sharedMid);
    this.sharedMid.connect(this.sharedHigh); this.sharedHigh.connect(this.leadPostGain);
    this.leadPostGain.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.resonance); this.resonance.connect(this.presence); this.presence.connect(this.output);
    this.activeChannel = 'lead';
  }

  _setupRhythmChannel() {
    this._disconnectAll();
    if (this.gateEnabled && this.noiseGate) { this.input.connect(this.noiseGate); this.noiseGate.connect(this.rhythmPreGain); }
    else this.input.connect(this.rhythmPreGain);
    this.rhythmPreGain.connect(this.gain1); this.gain1.connect(this.hpf1);
    this.hpf1.connect(this.gain2); this.gain2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.sharedLow); this.sharedLow.connect(this.sharedMid);
    this.sharedMid.connect(this.sharedHigh); this.sharedHigh.connect(this.rhythmPostGain);
    this.rhythmPostGain.connect(this.master);
    if (this.powerSag) { this.master.connect(this.powerSag); this.powerSag.connect(this.powerAmp); }
    else this.master.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.resonance); this.resonance.connect(this.presence); this.presence.connect(this.output);
    this.activeChannel = 'rhythm';
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
      case 'channel': if (value === 0) this._setupRhythmChannel(); else this._setupLeadChannel(); this.recreateCabinet(); break;
      case 'lead_pre_gain': case 'gain': this.leadPreGain.gain.setTargetAtTime(1 + (value / 5), now, 0.01); break;
      case 'lead_post_gain': this.leadPostGain.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'rhythm_pre_gain': this.rhythmPreGain.gain.setTargetAtTime(1 + (value / 10), now, 0.01); break;
      case 'rhythm_post_gain': this.rhythmPostGain.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'low': case 'bass': this.sharedLow.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'mid': this.sharedMid.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'high': case 'treble': this.sharedHigh.gain.setTargetAtTime((value - 50) / 5, now, 0.01); break;
      case 'resonance': this.resonance.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'presence': this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01); break;
      case 'master': this.master.gain.setTargetAtTime(value / 100, now, 0.01); break;
      case 'gate': this.gateEnabled = value; if (this.activeChannel === 'lead') this._setupLeadChannel(); else this._setupRhythmChannel(); this.recreateCabinet(); break;
      case 'cabinet_enabled': this.cabinetEnabled = !!value; this.recreateCabinet(); break;
      case 'cabinet': this.cabinetType = value; this.recreateCabinet(); break;
      case 'microphone': case 'micType': this.micType = value; this.recreateCabinet(); break;
      case 'micPosition': this.micPosition = value; this.recreateCabinet(); break;
    }
    this.params[parameter] = value;
  }

  disconnect() { super.disconnect(); this._disconnectAll(); }
}

export default Peavey6505Amp;
