import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Fender Super Reverb - Blackface 4x10" 40W Tube Amplifier
 * 
 * The Super Reverb is a Fender blackface classic with 4x10" speakers.
 * 40 watts of power from 2x 6L6GC tubes gives more headroom than
 * a Deluxe Reverb, while the 4x10 configuration provides a unique,
 * punchy tone that's distinct from 1x12 or 2x12 configurations.
 * Stevie Ray Vaughan was a famous Super Reverb player.
 * 
 * Tubes: 4x 12AX7, 2x 6L6GC, 5AR4 rectifier
 * Speaker: 4x10" Jensen/CTS Alnico
 * Cabinet: '4x10_bassman'
 */
class FenderSuperReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Super Reverb', 'fender_super_reverb');

    // ============================================
    // CHANNEL SELECTION: Normal / Vibrato
    // ============================================
    this.activeChannel = 'vibrato';
    this.normalVolume = audioContext.createGain();
    this.normalVolume.gain.value = 0.5;
    this.vibratoVolume = audioContext.createGain();
    this.vibratoVolume.gain.value = 0.5;

    // Bright cap
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 4000;
    this.brightCap.gain.value = 0;
    this._brightOn = false;

    // ============================================
    // PREAMP (12AX7)
    // ============================================
    this.preampGain = audioContext.createGain();
    this.preampGain.gain.value = 1.2;

    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.oversample = '4x';
    this.preampSaturation.curve = this._make12AX7Blackface();

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
    this.mid.gain.value = -2;

    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2000;
    this.treble.gain.value = 0;

    this.sparkle = audioContext.createBiquadFilter();
    this.sparkle.type = 'peaking';
    this.sparkle.frequency.value = 3500;
    this.sparkle.Q.value = 2;
    this.sparkle.gain.value = 1.5;

    // ============================================
    // SPRING REVERB (long tank - bigger reverb than Princeton)
    // ============================================
    this.reverbDwell = audioContext.createGain();
    this.reverbDwell.gain.value = 0.3;
    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 0.4;

    this.spring1 = audioContext.createDelay(0.2);
    this.spring2 = audioContext.createDelay(0.2);
    this.spring3 = audioContext.createDelay(0.2);
    this.spring1.delayTime.value = 0.033;
    this.spring2.delayTime.value = 0.041;
    this.spring3.delayTime.value = 0.047;

    this.reverbFilter = audioContext.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.frequency.value = 3000;
    this.reverbFilter.Q.value = 0.707;

    this.reverbFeedback = audioContext.createGain();
    this.reverbFeedback.gain.value = 0.5;

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
    // VIBRATO/TREMOLO
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5;
    this.vibratoDepthControl = audioContext.createGain();
    this.vibratoDepthControl.gain.value = 0;
    this.vibratoGainNode = audioContext.createGain();
    this.vibratoGainNode.gain.value = 1;
    this.vibratoLFO.connect(this.vibratoDepthControl);
    this.vibratoDepthControl.connect(this.vibratoGainNode.gain);
    this.vibratoLFO.start();

    // ============================================
    // POWER AMP (2x 6L6GC)
    // ============================================
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.11,
      att: 0.008,
      relFast: 0.07,
      relSlow: 0.24,
      rmsMs: 22.0,
      shape: 1.5,
      floor: 0.28,
      peakMix: 0.30
    });

    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.oversample = '4x';
    this.powerSaturation.curve = this._make6L6Curve();

    // ============================================
    // CABINET (4x10 open back)
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '4x10_bassman';
    this.micType = 'sm57';
    this.micPosition = 'edge';

    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    this.master = audioContext.createGain();
    this.master.gain.value = 0.7;

    this._setupVibratoChannel();
    this.recreateCabinet();

    this.params = {
      channel: 1,
      volume: 50,
      bass: 55,
      mid: 50,
      treble: 60,
      bright: false,
      reverb: 30,
      reverb_dwell: 50,
      vibrato_speed: 50,
      vibrato_intensity: 0,
      master: 70,
      cabinet_enabled: true
    };
  }

  _make12AX7Blackface() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.1);
      y += 0.04 * Math.tanh(x * 6);
      if (Math.abs(y) > 0.55) y *= 0.96;
      if (x > 0) y *= 1.03;
      curve[i] = y * 0.98;
    }
    return curve;
  }

  _make6L6Curve() {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * 1.3);
      y += 0.05 * Math.tanh(x * 3.5);
      y += 0.03 * Math.sin(x * Math.PI * 4);
      if (x > 0) y *= 1.05;
      if (Math.abs(y) > 0.65) {
        y = Math.sign(y) * (0.65 + (Math.abs(y) - 0.65) * 0.3);
      }
      curve[i] = y * 0.93;
    }
    return curve;
  }

  _disconnectAllNodes() {
    try {
      this.input.disconnect();
      this.preampGain.disconnect();
      this.preampSaturation.disconnect();
      this.normalVolume.disconnect();
      this.vibratoVolume.disconnect();
      this.brightCap.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.sparkle.disconnect();
      this.vibratoGainNode.disconnect();
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
    } catch (e) {}
  }

  _setupVibratoChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampSaturation);
    this.preampSaturation.connect(this.vibratoVolume);
    this.vibratoVolume.connect(this.brightCap);
    this.brightCap.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.vibratoGainNode);
    this.vibratoGainNode.connect(this.sparkle);
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    this.sparkle.connect(this.reverbSum);
    this.reverbMix.connect(this.reverbSum);
    if (this.powerSag) {
      this.reverbSum.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.reverbSum.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    this.activeChannel = 'vibrato';
  }

  _setupNormalChannel() {
    this._disconnectAllNodes();
    this.input.connect(this.preampGain);
    this.preampGain.connect(this.preampSaturation);
    this.preampSaturation.connect(this.normalVolume);
    this.normalVolume.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.sparkle);
    this.sparkle.connect(this.reverbDwell);
    this.reverbDwell.connect(this.spring1);
    this.reverbDwell.connect(this.spring2);
    this.reverbDwell.connect(this.spring3);
    this.sparkle.connect(this.reverbSum);
    this.reverbMix.connect(this.reverbSum);
    if (this.powerSag) {
      this.reverbSum.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.reverbSum.connect(this.powerAmp);
    }
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.preCabinet);
    this.postCabinet.connect(this.master);
    this.master.connect(this.output);
    this.activeChannel = 'normal';
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
        if (value === 0) this._setupNormalChannel();
        else this._setupVibratoChannel();
        this.recreateCabinet();
        break;
      case 'volume':
      case 'gain': {
        const v = value / 100;
        this.vibratoVolume.gain.setTargetAtTime(v, now, 0.01);
        this.normalVolume.gain.setTargetAtTime(v, now, 0.01);
        this.preampGain.gain.setTargetAtTime(1.0 + v * 1.2, now, 0.01);
        if (this._brightOn) {
          this.brightCap.gain.setTargetAtTime((1 - v) * 8, now, 0.03);
        }
        break;
      }
      case 'bright':
        this._brightOn = !!value;
        this.brightCap.gain.setTargetAtTime(this._brightOn ? 4 : 0, now, 0.03);
        break;
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
    this._disconnectAllNodes();
  }
}

export default FenderSuperReverbAmp;
