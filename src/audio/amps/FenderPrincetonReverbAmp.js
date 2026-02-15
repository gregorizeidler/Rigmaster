import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Fender Princeton Reverb - Blackface 15W Tube Amplifier
 * 
 * The Princeton Reverb is one of the most beloved Fender amps.
 * A 15-watt, 1x10" combo with blackface tone, built-in spring reverb,
 * and vibrato (tremolo). Known for its chimey cleans and sweet breakup
 * when pushed. Used by countless studio musicians for its "just right"
 * size - loud enough to gig but breaks up beautifully at reasonable volumes.
 * 
 * Tubes: 2x 12AX7 (preamp/phase inv), 2x 6V6GT (power), 12AT7 (reverb driver)
 * Speaker: 1x10" Jensen C10R
 * Cabinet: '1x10_open'
 */
class FenderPrincetonReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Princeton Reverb', 'fender_princeton');

    // ============================================
    // PREAMP (12AX7 dual triode)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 1.3;

    this.preampStage1 = audioContext.createWaveShaper();
    this.preampStage1.oversample = '4x';
    this.preampStage1.curve = this._make12AX7Clean();

    this.couplingCap1 = audioContext.createBiquadFilter();
    this.couplingCap1.type = 'highpass';
    this.couplingCap1.frequency.value = 45;
    this.couplingCap1.Q.value = 0.707;

    this.preampStage2 = audioContext.createWaveShaper();
    this.preampStage2.oversample = '4x';
    this.preampStage2.curve = this._make12AX7Warm();

    this.volumeGain = audioContext.createGain();
    this.volumeGain.gain.value = 0.5;

    // ============================================
    // BLACKFACE TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;

    this.mid = audioContext.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = -1.5; // Classic Fender mid scoop

    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2000;
    this.treble.gain.value = 0;

    // Fender sparkle peak
    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 3500;
    this.sparkle.Q.value = 2.0;
    this.sparkle.gain.value = 1.5;

    // ============================================
    // SPRING REVERB (3-spring tank)
    // ============================================
    this.reverbDwell = audioContext.createGain();
    this.reverbDwell.gain.value = 0.3;

    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 0.4;

    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    this.spring1.delayTime.value = 0.030;
    this.spring2.delayTime.value = 0.038;
    this.spring3.delayTime.value = 0.043;

    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3200;
    this.reverbFilter.Q.value = 0.707;

    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.45;

    // Spring reverb routing
    this.spring1.connect(this.reverbFilter);
    this.spring2.connect(this.reverbFilter);
    this.spring3.connect(this.reverbFilter);
    this.reverbFilter.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.spring1);
    this.reverbFeedback.connect(this.spring2);
    this.reverbFeedback.connect(this.spring3);
    this.reverbFilter.connect(this.reverbMix);

    this.reverbSum = audioContext.createGain();

    // ============================================
    // VIBRATO/TREMOLO (optical tremolo)
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5;

    this.vibratoDepthControl = audioContext.createGain();
    this.vibratoDepthControl.gain.value = 0;

    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 1;

    this.vibratoLFO.connect(this.vibratoDepthControl);
    this.vibratoDepthControl.connect(this.vibratoGain.gain);
    this.vibratoLFO.start();

    // ============================================
    // POWER AMP (2x 6V6GT Push-Pull)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.14,
      att: 0.009,
      relFast: 0.08,
      relSlow: 0.28,
      rmsMs: 25.0,
      shape: 1.7,
      floor: 0.24,
      peakMix: 0.28
    });

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6V6PushPullCurve();

    // ============================================
    // CABINET (1x10 open back Jensen C10R)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x10_open';
    this.micType = 'sm57';
    this.micPosition = 'edge';

    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

    this.master = audioContext.createGain();
    this.master.gain.value = 0.7;

    // ============================================
    // ROUTING
    // ============================================
    this._setupRouting();
    this.recreateCabinet();

    this.params = {
      volume: 50,
      bass: 55,
      mid: 50,
      treble: 60,
      reverb: 30,
      reverb_dwell: 50,
      vibrato_speed: 50,
      vibrato_intensity: 0,
      master: 70,
      cabinet_enabled: true
    };
  }

  _make12AX7Clean() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.15);
      y += 0.03 * Math.tanh(x * 5);
      if (x > 0) y *= 1.03;
      curve[i] = y * 0.97;
    }
    return curve;
  }

  _make12AX7Warm() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.25);
      y += 0.05 * Math.tanh(x * 4);
      y += 0.02 * Math.sin(x * Math.PI * 3);
      if (x > 0) y *= 1.05;
      if (Math.abs(y) > 0.65) {
        y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.4);
      }
      curve[i] = y * 0.95;
    }
    return curve;
  }

  _make6V6PushPullCurve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.35);
      // Push-pull: more odd harmonics than single-ended
      y += 0.04 * Math.tanh(x * 4);
      y += 0.03 * Math.sin(x * Math.PI * 5);
      // Slight asymmetry (bias drift)
      if (x > 0) y *= 1.06;
      // Sweet compression
      if (Math.abs(y) > 0.62) {
        y = Math.sign(y) * (0.62 + (Math.abs(y) - 0.62) * 0.35);
      }
      curve[i] = y * 0.92;
    }
    return curve;
  }

  _setupRouting() {
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampStage1);
    this.preampStage1.connect(this.couplingCap1);
    this.couplingCap1.connect(this.preampStage2);
    this.preampStage2.connect(this.volumeGain);

    // Tone stack
    this.volumeGain.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.vibratoGain);
    this.vibratoGain.connect(this.sparkle);

    // Reverb
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);

    this.sparkle.connect(this.reverbSum);
    this.reverbMix.connect(this.reverbSum);

    // Power amp
    if (this.powerSag) {
      this.reverbSum.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.reverbSum.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);

    // Cabinet
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
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
      case 'volume':
      case 'gain': {
        const v = value / 100;
        this.volumeGain.gain.setTargetAtTime(v, now, 0.01);
        this.preampGain.gain.setTargetAtTime(1.0 + v * 1.5, now, 0.01);
        break;
      }
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      case 'reverb':
        this.reverbMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'reverb_dwell':
        this.reverbDwell.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'vibrato_speed':
        this.vibratoLFO.frequency.setTargetAtTime(1.5 + (value / 100) * 8.5, now, 0.02);
        break;
      case 'vibrato_intensity':
      case 'vibrato_depth':
        this.vibratoDepthControl.gain.setTargetAtTime((value / 100) * 0.5, now, 0.02);
        break;
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
    try { this.vibratoLFO.stop(); } catch (e) {}
    try {
      this.preampGain.disconnect();
      this.preampStage1.disconnect();
      this.couplingCap1.disconnect();
      this.preampStage2.disconnect();
      this.volumeGain.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.vibratoLFO.disconnect();
      this.vibratoDepthControl.disconnect();
      this.vibratoGain.disconnect();
      this.reverbDwell.disconnect();
      this.spring1.disconnect();
      this.spring2.disconnect();
      this.spring3.disconnect();
      this.reverbFilter.disconnect();
      this.reverbFeedback.disconnect();
      this.reverbMix.disconnect();
      this.reverbSum.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.master.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Fender Princeton Reverb:', e);
    }
  }
}

export default FenderPrincetonReverbAmp;
