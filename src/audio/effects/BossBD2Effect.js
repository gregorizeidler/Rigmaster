import BaseEffect from './BaseEffect';

/**
 * BossBD2Effect (turbo)
 * 
 * Boss BD-2 Blues Driver com:
 *  - Clipping suave amp-like com assimetria sutil
 *  - Tilt-EQ (low-shelf + high-shelf complementares)
 *  - Pré-ênfase para pick attack
 *  - SAG compression para resposta dinâmica
 *  - Body mid correction para madeira BD-2
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   gain, tone, level, mix
 */
class BossBD2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'BD-2', 'bossbd2');

    // ===== Front-end / condicionamento =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35; // remove subgrave antes do gain

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;

    // leve pré-ênfase (realça pick attack antes do clip)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 1500;
    this.preEmphasis.gain.value = 3;

    // ===== Clipping "amp-like" suave com assimetria sutil =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeBD2Curve(50);

    // "sag"/cola dinâmica (resposta a transientes)
    this.sagComp = audioContext.createDynamicsCompressor();
    this.sagComp.threshold.value = -24;
    this.sagComp.knee.value = 12;
    this.sagComp.ratio.value = 2.1;
    this.sagComp.attack.value = 0.004;
    this.sagComp.release.value = 0.12;

    // ===== TONE: Tilt-EQ (low-shelf + high-shelf com ganhos complementares) =====
    this.toneLow = audioContext.createBiquadFilter();
    this.toneLow.type = 'lowshelf';
    this.toneLow.frequency.value = 280; // abaixo do pivô ~1k

    this.toneHigh = audioContext.createBiquadFilter();
    this.toneHigh.type = 'highshelf';
    this.toneHigh.frequency.value = 2200; // acima do pivô ~1k

    // pequena correção de médios para "madeira" do BD-2
    this.bodyMid = audioContext.createBiquadFilter();
    this.bodyMid.type = 'peaking';
    this.bodyMid.frequency.value = 800;
    this.bodyMid.Q.value = 0.9;
    this.bodyMid.gain.value = 0;

    // ===== Anti-alias pré-clip =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // DC blocker pós-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.5;

    // ===== Cadeia =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preEmphasis);
    this.preEmphasis.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.sagComp);
    this.sagComp.connect(this.toneLow);
    this.toneLow.connect(this.toneHigh);
    this.toneHigh.connect(this.bodyMid);
    this.bodyMid.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      gain: 50,
      tone: 50,
      level: 70
    };
  }

  // curva suave com joelho largo e leve assimetria (caráter BD-2)
  makeBD2Curve(amount) {
    const n = 65536;
    const c = new Float32Array(n);
    const drive = 1 + amount / 25; // 1..5

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // joelho suave
      y = Math.tanh(y * 1.5);

      // harmônicos pares (quente) + leve assimetria (ataque)
      y += 0.08 * Math.tanh(x * drive * 2);
      if (x > 0) y *= 1.04;

      c[i] = y * 0.9;
    }
    return c;
  }

  _applyToneTilt(value) {
    // value 0..100 → gains opostos em ~±8 dB
    const t = Math.max(0, Math.min(100, value)) / 100; // 0..1
    const range = 8; // dB total por banda
    const lowGain = (1 - t) * range - range / 2;  // -4..+4 dB
    const highGain = t * range - range / 2;       // -4..+4 dB
    const midComp = (t - 0.5) * -2.0;             // compensa médios levemente

    const now = this.audioContext.currentTime;
    this.toneLow.gain.setTargetAtTime(lowGain, now, 0.02);
    this.toneHigh.gain.setTargetAtTime(highGain, now, 0.02);
    this.bodyMid.gain.setTargetAtTime(midComp, now, 0.02);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'gain':
        this.clipper.curve = this.makeBD2Curve(value);
        this.inputGain.gain.setTargetAtTime(1 + value / 100, now, 0.01);
        break;

      case 'tone':
        this._applyToneTilt(value);
        break;

      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      case 'mix':
        this.updateMix(value);
        break;

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.inputGain.disconnect();
      this.preEmphasis.disconnect();
      this.clipper.disconnect();
      this.sagComp.disconnect();
      this.toneLow.disconnect();
      this.toneHigh.disconnect();
      this.bodyMid.disconnect();
      this.antiAliasLPF.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossBD2Effect;
