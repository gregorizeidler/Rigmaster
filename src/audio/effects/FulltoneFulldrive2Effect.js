import BaseEffect from './BaseEffect';

/**
 * FulltoneFulldrive2Effect
 *
 * Fulltone Fulldrive 2 MOSFET – legendary dual-mode overdrive pedal.
 *
 * Key characteristics:
 *  - MOSFET-based clipping (warm, tube-like saturation)
 *  - Two modes: Vintage (asymmetric soft clip) and Comp-Cut (symmetrical, tighter)
 *  - Boost channel with independent volume control
 *  - Dynamic, touch-sensitive response
 *  - Smooth, musical mid-hump with excellent harmonic content
 *  - Extended low-end compared to typical TS circuits
 *
 * Params: drive (0-100), tone (0-100), volume (0-100), boost (0-100), mode (0-100)
 */
class FulltoneFulldrive2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fulldrive 2 MOSFET', 'fulldrive2');

    // ===== Input conditioning =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 30;
    this.inHPF.Q.value = 0.707;

    // ===== Pre-EQ – musical mid presence (Fulltone signature) =====
    this.preMidEQ = audioContext.createBiquadFilter();
    this.preMidEQ.type = 'peaking';
    this.preMidEQ.frequency.value = 720;
    this.preMidEQ.Q.value = 0.6;
    this.preMidEQ.gain.value = 4;

    // Bass control – keeps more lows than standard TS
    this.preBassHPF = audioContext.createBiquadFilter();
    this.preBassHPF.type = 'highpass';
    this.preBassHPF.frequency.value = 120;
    this.preBassHPF.Q.value = 0.5;

    // ===== Drive stage (MOSFET clipping) =====
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 2.0;

    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    this.mosfetClip = audioContext.createWaveShaper();
    this.mosfetClip.oversample = '4x';
    this.mosfetClip.curve = this._makeMosfetCurve('vintage');

    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Post-clip presence shaping =====
    this.postPresence = audioContext.createBiquadFilter();
    this.postPresence.type = 'peaking';
    this.postPresence.frequency.value = 3200;
    this.postPresence.Q.value = 0.8;
    this.postPresence.gain.value = 2;

    // ===== Tone control =====
    this.toneLP = audioContext.createBiquadFilter();
    this.toneLP.type = 'lowpass';
    this.toneLP.frequency.value = 4500;
    this.toneLP.Q.value = 0.6;

    // ===== Boost section (independent second gain stage) =====
    this.boostGain = audioContext.createGain();
    this.boostGain.gain.value = 1.0;

    this.boostClip = audioContext.createWaveShaper();
    this.boostClip.oversample = '4x';
    this.boostClip.curve = this._makeBoostCurve();

    this.boostDCBlock = audioContext.createBiquadFilter();
    this.boostDCBlock.type = 'highpass';
    this.boostDCBlock.frequency.value = 10;
    this.boostDCBlock.Q.value = 0.707;

    // ===== Output level =====
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.7;

    // ===== Final output filter =====
    this.outLPF = audioContext.createBiquadFilter();
    this.outLPF.type = 'lowpass';
    this.outLPF.frequency.value = 12000;
    this.outLPF.Q.value = 0.5;

    // ===== Connect chain =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.preMidEQ);
    this.preMidEQ.connect(this.preBassHPF);
    this.preBassHPF.connect(this.preGain);
    this.preGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.mosfetClip);
    this.mosfetClip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postPresence);
    this.postPresence.connect(this.toneLP);
    this.toneLP.connect(this.boostGain);
    this.boostGain.connect(this.boostClip);
    this.boostClip.connect(this.boostDCBlock);
    this.boostDCBlock.connect(this.outGain);
    this.outGain.connect(this.outLPF);
    this.outLPF.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path (BaseEffect bypass)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Internal parameter state =====
    this.params = {
      drive: 50,
      tone: 50,
      volume: 70,
      boost: 0,
      mode: 0
    };
  }

  /**
   * MOSFET clipping curve – warm, tube-like saturation
   * Vintage mode: asymmetric soft-clip (even harmonics, open sound)
   * Comp-Cut mode: symmetrical harder clip (tighter, more compressed)
   */
  _makeMosfetCurve(mode) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;
    for (let i = 0; i < samples; i++) {
      let x = (i - mid) / mid;
      if (mode === 'vintage') {
        // Asymmetric MOSFET: positive side clips softer, negative harder
        if (x >= 0) {
          curve[i] = Math.tanh(x * 1.2) * 0.95;
        } else {
          curve[i] = Math.tanh(x * 1.6) * 0.85;
        }
      } else {
        // Comp-Cut: symmetrical, tighter compression
        curve[i] = (2 / Math.PI) * Math.atan(x * 2.5);
      }
    }
    return curve;
  }

  _makeBoostCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;
    for (let i = 0; i < samples; i++) {
      let x = (i - mid) / mid;
      curve[i] = Math.tanh(x * 0.8);
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        const drive = value / 100;
        const gainVal = 1.2 + drive * 10.8;
        this.preGain.gain.setTargetAtTime(gainVal, now, 0.01);
        this.preMidEQ.gain.setTargetAtTime(3 + drive * 4, now, 0.01);
        break;
      }

      case 'tone': {
        const tone = value / 100;
        const toneFreq = 1800 + tone * 6700;
        this.toneLP.frequency.setTargetAtTime(toneFreq, now, 0.01);
        this.postPresence.gain.setTargetAtTime(1 + tone * 3, now, 0.01);
        break;
      }

      case 'volume': {
        const vol = 0.1 + (value / 100) * 1.1;
        this.outGain.gain.setTargetAtTime(vol, now, 0.01);
        break;
      }

      case 'boost': {
        const boostVal = 1.0 + (value / 100) * 3.0;
        this.boostGain.gain.setTargetAtTime(boostVal, now, 0.01);
        break;
      }

      case 'mode': {
        const modeType = value < 50 ? 'vintage' : 'compcut';
        this.mosfetClip.curve = this._makeMosfetCurve(modeType);
        break;
      }

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.preMidEQ.disconnect();
      this.preBassHPF.disconnect();
      this.preGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.mosfetClip.disconnect();
      this.dcBlocker.disconnect();
      this.postPresence.disconnect();
      this.toneLP.disconnect();
      this.boostGain.disconnect();
      this.boostClip.disconnect();
      this.boostDCBlock.disconnect();
      this.outGain.disconnect();
      this.outLPF.disconnect();
    } catch (e) {}
  }
}

export default FulltoneFulldrive2Effect;
