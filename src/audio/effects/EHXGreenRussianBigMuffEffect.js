import BaseEffect from './BaseEffect';

/**
 * EHXGreenRussianBigMuffEffect
 *
 * Electro-Harmonix Green Russian Big Muff Pi – the Sovtek variant.
 * Known for its woolly, bass-heavy character with less top end than
 * the NYC version. More low-end sustain, darker tone, thicker.
 *
 * Signal chain:
 *   input → inputHPF → preGain1 → antiAliasLPF1 → clipper1
 *         → midFilter → preGain2 → antiAliasLPF2 → clipper2
 *         → dcBlocker → toneStack (parallel LP + HP) → postLPF
 *         → bassRestore → postGain → wetGain → output
 *
 * Params: sustain (0-100), tone (0-100), volume (0-100)
 */
class EHXGreenRussianBigMuffEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Green Russian Muff', 'ehxgreenrussianmuff');

    // ===== Input HPF =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 35;
    this.inputHPF.Q.value = 0.707;

    // ===== First gain stage =====
    this.preGain1 = audioContext.createGain();
    this.preGain1.gain.value = 7.0;

    // Anti-alias LPF 1
    this.antiAliasLPF1 = audioContext.createBiquadFilter();
    this.antiAliasLPF1.type = 'lowpass';
    this.antiAliasLPF1.frequency.value = 18000;
    this.antiAliasLPF1.Q.value = 0.707;

    // First clipping stage (wider, more bass-friendly)
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper1.oversample = '4x';
    this.clipper1.curve = this._makeGreenRussianCurve(50, 1);

    // ===== Inter-stage mid scoop (Green Russian voicing) =====
    this.midScoop = audioContext.createBiquadFilter();
    this.midScoop.type = 'peaking';
    this.midScoop.frequency.value = 500;
    this.midScoop.Q.value = 0.6;
    this.midScoop.gain.value = -3;

    // Low-mid warmth boost (woolly character)
    this.woollyBoost = audioContext.createBiquadFilter();
    this.woollyBoost.type = 'peaking';
    this.woollyBoost.frequency.value = 200;
    this.woollyBoost.Q.value = 0.5;
    this.woollyBoost.gain.value = 3;

    // ===== Second gain stage =====
    this.preGain2 = audioContext.createGain();
    this.preGain2.gain.value = 5.5;

    // Anti-alias LPF 2
    this.antiAliasLPF2 = audioContext.createBiquadFilter();
    this.antiAliasLPF2.type = 'lowpass';
    this.antiAliasLPF2.frequency.value = 18000;
    this.antiAliasLPF2.Q.value = 0.707;

    // Second clipping stage (tighter)
    this.clipper2 = audioContext.createWaveShaper();
    this.clipper2.oversample = '4x';
    this.clipper2.curve = this._makeGreenRussianCurve(50, 2);

    // ===== DC blocker =====
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ===== Tone stack (parallel LP + HP, like Big Muff) =====
    this.bassPath = audioContext.createBiquadFilter();
    this.bassPath.type = 'lowpass';
    this.bassPath.frequency.value = 500; // lower crossover than NYC = more bass
    this.bassPath.Q.value = 0.707;

    this.treblePath = audioContext.createBiquadFilter();
    this.treblePath.type = 'highpass';
    this.treblePath.frequency.value = 1200; // lower than NYC = less treble
    this.treblePath.Q.value = 0.707;

    this.bassGain = audioContext.createGain();
    this.trebleGain = audioContext.createGain();
    this.bassGain.gain.value = 0.6;
    this.trebleGain.gain.value = 0.4;

    this.toneMixer = audioContext.createGain();
    this.toneMixer.gain.value = 1.0;

    // ===== Post LPF (darker voicing: lower ceiling) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 5500;
    this.postLPF.Q.value = 0.5;

    // ===== Bass restoration shelf =====
    this.bassRestore = audioContext.createBiquadFilter();
    this.bassRestore.type = 'lowshelf';
    this.bassRestore.frequency.value = 150;
    this.bassRestore.gain.value = 3;

    // ===== Output =====
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.35;

    // ===== Routing =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.preGain1);
    this.preGain1.connect(this.antiAliasLPF1);
    this.antiAliasLPF1.connect(this.clipper1);
    this.clipper1.connect(this.midScoop);
    this.midScoop.connect(this.woollyBoost);
    this.woollyBoost.connect(this.preGain2);
    this.preGain2.connect(this.antiAliasLPF2);
    this.antiAliasLPF2.connect(this.clipper2);
    this.clipper2.connect(this.dcBlocker);

    // Tone stack (parallel)
    this.dcBlocker.connect(this.bassPath);
    this.dcBlocker.connect(this.treblePath);
    this.bassPath.connect(this.bassGain);
    this.treblePath.connect(this.trebleGain);
    this.bassGain.connect(this.toneMixer);
    this.trebleGain.connect(this.toneMixer);

    this.toneMixer.connect(this.postLPF);
    this.postLPF.connect(this.bassRestore);
    this.bassRestore.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Params =====
    this.params = {
      sustain: 50,
      tone: 50,
      volume: 70
    };
  }

  /**
   * Green Russian clipping: wider headroom than NYC Muff, more bass-friendly.
   * Stage 1: softer, maintains low-end body.
   * Stage 2: tighter but still woolly.
   */
  _makeGreenRussianCurve(sustain, stage) {
    const n = 65536;
    const curve = new Float32Array(n);

    const baseDrive = stage === 1 ? 1.5 : 2.0;
    const drive = baseDrive + (sustain / 100) * (stage === 1 ? 5 : 7);
    // Wider knee than NYC Muff = woolly, less harsh
    const knee = stage === 1 ? 0.35 : 0.28;
    const vtPos = stage === 1 ? 0.32 : 0.26;
    const vtNeg = stage === 1 ? 0.30 : 0.24;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // Asymmetric soft-clip (woolly character)
      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // Gentle saturation (less harsh than NYC)
      y = Math.tanh(y * (stage === 1 ? 1.1 : 1.3));

      // Even harmonics for warmth
      y += 0.04 * Math.tanh(x * drive * 1.5);

      // Sustain compression
      y *= 1 - 0.05 * Math.min(1, Math.abs(x));

      curve[i] = y * 0.93;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'sustain': {
        const g1 = 2.5 + (value / 100) * 15;
        const g2 = 1.5 + (value / 100) * 10;
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);
        this.clipper1.curve = this._makeGreenRussianCurve(value, 1);
        this.clipper2.curve = this._makeGreenRussianCurve(value, 2);
        // More sustain → slightly lower post-LPF to keep it woolly
        const lpf = 6000 - (value / 100) * 2000;
        this.postLPF.frequency.setTargetAtTime(lpf, now, 0.02);
        break;
      }

      case 'tone': {
        // Crossfade between bass and treble paths
        const t = value / 100;
        const shape = (u) => 0.5 + 0.5 * Math.tanh((u - 0.5) * 2.0);
        const treble = shape(t);
        const bass = 1 - treble;
        const norm = Math.max(0.001, bass + treble);
        this.bassGain.gain.setTargetAtTime(bass / norm, now, 0.01);
        this.trebleGain.gain.setTargetAtTime(treble / norm, now, 0.01);
        // Also shift the post-LPF slightly
        const ceil = 4500 + (value / 100) * 3000;
        this.postLPF.frequency.setTargetAtTime(ceil, now, 0.02);
        break;
      }

      case 'volume':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputHPF.disconnect();
      this.preGain1.disconnect();
      this.antiAliasLPF1.disconnect();
      this.clipper1.disconnect();
      this.midScoop.disconnect();
      this.woollyBoost.disconnect();
      this.preGain2.disconnect();
      this.antiAliasLPF2.disconnect();
      this.clipper2.disconnect();
      this.dcBlocker.disconnect();
      this.bassPath.disconnect();
      this.treblePath.disconnect();
      this.bassGain.disconnect();
      this.trebleGain.disconnect();
      this.toneMixer.disconnect();
      this.postLPF.disconnect();
      this.bassRestore.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default EHXGreenRussianBigMuffEffect;
