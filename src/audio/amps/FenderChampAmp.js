import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Fender Champ - 5-Watt Single-Ended Class A Tube Amplifier
 * 
 * The Fender Champ is one of the most recorded amps in history.
 * A simple, single-ended 5-watt design with a single 12AX7 preamp
 * tube and a single 6V6 power tube. Known for its sweet, singing
 * breakup tone when cranked. Eric Clapton's "Layla" was recorded
 * through a Champ. Simple controls: Volume and Tone.
 * 
 * Tubes: 1x 12AX7 (preamp), 1x 6V6GT (power)
 * Speaker: 1x8" (original) / 1x10" (later models)
 * Cabinet: '1x10_open'
 */
class FenderChampAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Champ', 'fender_champ');

    // ============================================
    // PREAMP (12AX7 - Single tube, two triode stages)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 1.5;

    // First triode stage
    this.preampStage1 = audioContext.createWaveShaper();
    this.preampStage1.oversample = '4x';
    this.preampStage1.curve = this._make12AX7Stage1();

    // Coupling capacitor simulation (HP filter)
    this.couplingCap1 = audioContext.createBiquadFilter();
    this.couplingCap1.type = 'highpass';
    this.couplingCap1.frequency.value = 50;
    this.couplingCap1.Q.value = 0.707;

    // Second triode stage (cathode follower)
    this.preampStage2 = audioContext.createWaveShaper();
    this.preampStage2.oversample = '4x';
    this.preampStage2.curve = this._make12AX7Stage2();

    // Volume control (after preamp, before tone)
    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.5;

    // ============================================
    // TONE CONTROL (simple single-knob RC filter)
    // ============================================
    // The Champ has a simple tone control: a variable LP filter
    this.toneLP = audioContext.createBiquadFilter();
    this.toneLP.type = 'lowpass';
    this.toneLP.frequency.value = 5000;
    this.toneLP.Q.value = 0.707;

    // Subtle presence peak (Fender sparkle)
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 3500;
    this.sparkle.Q.value = 2.0;
    this.sparkle.gain.value = 1.0;

    // ============================================
    // POWER AMP (Single 6V6GT - Class A single-ended)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.18,      // Heavy sag (5W single-ended compresses a lot)
      att: 0.010,       // 10ms attack
      relFast: 0.09,    // 90ms fast recovery
      relSlow: 0.30,    // 300ms slow recovery (very musical sag)
      rmsMs: 28.0,      // Long RMS window (vintage)
      shape: 1.8,       // Very progressive (tube rectifier feel)
      floor: 0.22,      // Low floor (lots of compression)
      peakMix: 0.25     // Mostly RMS (smooth, singing sustain)
    });

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6V6SingleEndedCurve();

    // ============================================
    // CABINET SIMULATOR (1x10 open back)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x10_open';
    this.micType = 'sm57';
    this.micPosition = 'center';

    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

    // MASTER
    this.master = audioContext.createGain();
    this.master.gain.value = 0.7;

    // ============================================
    // ROUTING
    // ============================================
    this._setupRouting();
    this.recreateCabinet();

    this.params = {
      volume: 50,
      tone: 50,
      master: 70,
      cabinet_enabled: true
    };

    this._applyInitial();
  }

  _make12AX7Stage1() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Clean with subtle warmth (Champ preamp is very clean at low volumes)
      let y = Math.tanh(x * 1.2);
      // Slight 2nd harmonic (tube character)
      y += 0.03 * Math.tanh(x * 5);
      // Subtle asymmetry (single-ended cathode bias)
      if (x > 0) y *= 1.04;
      curve[i] = y * 0.97;
    }
    return curve;
  }

  _make12AX7Stage2() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Cathode follower: unity gain, slight compression
      let y = Math.tanh(x * 1.3);
      // Even harmonics from asymmetric clipping
      y += 0.05 * Math.tanh(x * 3.5);
      if (x > 0) y *= 1.06;
      // Gentle soft knee at extremes
      if (Math.abs(y) > 0.7) {
        y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.4);
      }
      curve[i] = y * 0.95;
    }
    return curve;
  }

  _make6V6SingleEndedCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Single-ended 6V6: very asymmetric, rich even harmonics
      let y = Math.tanh(x * 1.5);
      // Strong 2nd harmonic (single-ended hallmark)
      y += 0.12 * Math.tanh(x * 2.5);
      // 3rd harmonic (adds body)
      y += 0.04 * Math.tanh(x * 4);
      // Heavy asymmetry (single-ended class A)
      if (x > 0) y *= 1.15;
      else y *= 0.92;
      // Soft clipping at breakup point
      if (Math.abs(y) > 0.6) {
        y = Math.sign(y) * (0.6 + (Math.abs(y) - 0.6) * 0.35);
      }
      // Sweet singing sustain characteristic
      y += 0.06 * Math.sin(x * Math.PI * 3);
      curve[i] = y * 0.88;
    }
    return curve;
  }

  _setupRouting() {
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.couplingCap1);
    this.couplingCap1.connect(this.preampStage2);
    this.preampStage2.connect(this.volumeGain);

    // Volume → Tone
    this.volumeGain.connect(this.toneLP);
    this.toneLP.connect(this.sparkle);

    // Tone → Power section
    if (this.powerSag) {
      this.sparkle.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.sparkle.connect(this.powerAmp);
    }

    this.powerAmp.connect(this.powerSaturation);

    // Power → Cabinet → Output
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
  }

  _applyInitial() {
    this.preampGain.gain.value = 1.5;
    this.volumeGain.gain.value = 0.5;
    this.powerAmp.gain.value = 1.0;
    this.master.gain.value = 0.7;
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
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType, this.micType, this.micPosition
      );
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

  disconnectAll() {
    try {
      this.input.disconnect();
      this.preampGain.disconnect();
      this.preampStage1.disconnect();
      this.couplingCap1.disconnect();
      this.preampStage2.disconnect();
      this.volumeGain.disconnect();
      this.toneLP.disconnect();
      this.sparkle.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'volume':
      case 'gain': {
        const vol = value / 100;
        this.volumeGain.gain.setTargetAtTime(vol, now, 0.01);
        // At higher volumes, preamp drives harder
        const preGain = 1.0 + (vol * 2.0);
        this.preampGain.gain.setTargetAtTime(preGain, now, 0.01);
        break;
      }
      case 'tone': {
        // Simple tone control: LP filter frequency
        const freq = 1500 + (value / 100) * 6500;
        this.toneLP.frequency.setTargetAtTime(freq, now, 0.02);
        break;
      }
      case 'master': {
        const linLog = (v) => 0.001 * Math.pow(1000, v);
        this.master.gain.setTargetAtTime(linLog(value / 100), now, 0.01);
        break;
      }
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
    try {
      this.preampGain.disconnect();
      this.preampStage1.disconnect();
      this.couplingCap1.disconnect();
      this.preampStage2.disconnect();
      this.volumeGain.disconnect();
      this.toneLP.disconnect();
      this.sparkle.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.master.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Fender Champ:', e);
    }
  }
}

export default FenderChampAmp;
