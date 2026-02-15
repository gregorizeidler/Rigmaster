import BaseEffect from './BaseEffect';

/**
 * JHSSuperBoltEffect (turbo)
 * - Plexi-ish brit crunch com upgrades:
 *   1) HPF de entrada (tight)                -> param: lowcut
 *   2) DC-block pós-clip                     -> fix de offset
 *   3) Duplo clipping (op-amp + diodos)      -> mais textura e pares
 *   4) Post-LPF anti-areia                   -> param: highcut
 *   5) Mid voice ativo (mid hump)            -> param: mids
 *   6) Presence shelf                        -> param: presence
 *   7) "MORE" (hi/lo gain) + bias assimétr.  -> param: more / bias
 *   8) SAG (comp leve) + blend seco/molhado  -> param: sag / blend
 *   9) Cab-sim simples (LPF)                 -> param: cab
 *
 * Knobs/params aceitos:
 *   gain, tone, level, mids, presence, bias, more (0/1),
 *   lowcut, highcut, sag, blend, cab (0/1)
 */
class JHSSuperBoltEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'JHS Superbolt', 'jhssuperbolt');

    // --- Pré / Tight ---
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 60; // lowcut

    // Ganho de entrada
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // Clipping 1 (op-amp style, base do crunch)
    this.clipA = audioContext.createWaveShaper();
    this.clipA.oversample = '4x';
    this.clipA.curve = this.makeOpampCurve(35, 0.12); // drive, asym

    // DC blocker pós-clip
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // Clipping 2 (mistura de "diodos" para pares extras)
    this.clipB = audioContext.createWaveShaper();
    this.clipB.oversample = '4x';
    this.clipB.curve = this.makeDiodeCurve(28, 0.10);

    // Anti-areia pós-clipping
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8000;
    this.postLPF.Q.value = 0.707;

    // Mid hump (Marshall vibe)
    this.midBoost = audioContext.createBiquadFilter();
    this.midBoost.type = 'peaking';
    this.midBoost.frequency.value = 1200;
    this.midBoost.Q.value = 1.0;
    this.midBoost.gain.value = 5;

    // Presence (brilho alto)
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 3500;
    this.presenceFilter.gain.value = 3;

    // Tone (filtro lowpass amplo)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 5000;
    this.toneFilter.Q.value = 0.707;

    // SAG / comp leve (dá "amp feel" quando more/gain altos)
    this.sagComp = audioContext.createDynamicsCompressor();
    this.sagComp.threshold.value = -20;
    this.sagComp.knee.value = 6;
    this.sagComp.ratio.value = 3;
    this.sagComp.attack.value = 0.006;
    this.sagComp.release.value = 0.08;

    // Cab sim simples (LPF) – desligável
    this.cabSim = audioContext.createBiquadFilter();
    this.cabSim.type = 'lowpass';
    this.cabSim.frequency.value = 5500;
    this.cabSim.Q.value = 0.9;

    // Saída
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.9;

    // Blend seco/molhado
    this.blend = 0.5;
    this.wetGain.gain.value = this.blend;
    this.dryGain.gain.value = 1 - this.blend;

    // Roteamento
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipA);
    this.clipA.connect(this.dcBlock);
    this.dcBlock.connect(this.clipB);
    this.clipB.connect(this.postLPF);
    this.postLPF.connect(this.midBoost);
    this.midBoost.connect(this.presenceFilter);
    this.presenceFilter.connect(this.toneFilter);
    this.toneFilter.connect(this.sagComp);
    this.sagComp.connect(this.cabSim);
    this.cabSim.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Estado
    this.more = 1;   // hi/lo gain
    this.bias = 0.12;
    this.cabEnabled = 1;
    
    // Inicializa params para UI
    this.params = {
      gain: 50,
      tone: 50,
      level: 70,
      more: 1
    };
  }

  // Soft clip "op-amp" com leve assimetria
  makeOpampCurve(drive = 35, asym = 0.12) {
    const n = 65536, c = new Float32Array(n);
    const g = 1 + drive / 25;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh(x * g * 1.8);
      y += 0.06 * Math.tanh(x * g * 3.2);
      y *= (x >= 0) ? (1 + asym) : (1 - asym * 0.6);
      y *= (1 - 0.10 * Math.min(1, Math.abs(x)));
      c[i] = y * 0.9;
    }
    return c;
  }

  // "Diodos" suaves para pares/texture
  makeDiodeCurve(drive = 28, asym = 0.10) {
    const n = 65536, c = new Float32Array(n);
    const g = 1 + drive / 22;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh(x * g * 1.4);
      y += 0.09 * Math.tanh(x * g * 5.0); // pares ↑
      y *= (x >= 0) ? (1 + asym) : (1 - asym);
      c[i] = y * 0.88;
    }
    return c;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      // GAIN: ajusta entrada + re-sintetiza curvas (mais/menos drive)
      case 'gain': {
        const g = Math.max(0, Math.min(100, value));
        // "MORE" empurra o ganho base
        const moreFactor = this.more ? 1.6 : 1.0;
        this.inputGain.gain.setTargetAtTime(0.6 + (g / 100) * 3 * moreFactor, now, 0.01);

        // Atualiza curvas com headroom/bias
        const baseDrive = 25 + g * 0.7 * (this.more ? 1.2 : 1.0);
        this.clipA.curve = this.makeOpampCurve(baseDrive, this.bias);
        this.clipB.curve = this.makeDiodeCurve(baseDrive * 0.8, this.bias * 0.9);

        // SAG aumenta com ganho
        const sagAmt = 2 + (g / 100) * 3; // ratio 2..5
        this.sagComp.ratio.setTargetAtTime(sagAmt, now, 0.05);
        this.sagComp.threshold.setTargetAtTime(-24 + (g / 100) * 10, now, 0.05);
        break;
      }

      // Tone varre o LPF amplo (2k..10k)
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(2000 + (value / 100) * 8000, now, 0.01);
        break;

      case 'level':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      // Mids: -6..+6 dB
      case 'mids':
        this.midBoost.gain.setTargetAtTime((value - 50) / 50 * 6, now, 0.01);
        break;

      // Presence: -6..+6 dB @ 3.5k
      case 'presence':
        this.presenceFilter.gain.setTargetAtTime((value - 50) / 50 * 6, now, 0.01);
        break;

      // Bias (0..100) => assimetria 0..0.25
      case 'bias': {
        const b = Math.max(0, Math.min(100, value)) / 100;
        this.bias = 0.25 * b;
        // re-render curvas com ganho atual aproximado
        this.clipA.curve = this.makeOpampCurve(35, this.bias);
        this.clipB.curve = this.makeDiodeCurve(28, this.bias * 0.9);
        break;
      }

      // MORE switch (0/1)
      case 'more':
        this.more = value ? 1 : 0;
        // reaplica ganho atual para refletir o modo
        this.updateParameter('gain', this.params?.gain ?? 60);
        break;

      // Lowcut 20..200 Hz
      case 'lowcut':
        this.preHPF.frequency.setTargetAtTime(20 + (value / 100) * 180, now, 0.01);
        break;

      // Highcut 3k..16k
      case 'highcut':
        this.postLPF.frequency.setTargetAtTime(3000 + (value / 100) * 13000, now, 0.01);
        break;

      // SAG: 0..100 reforça o efeito (ratio/threshold)
      case 'sag': {
        const s = Math.max(0, Math.min(100, value)) / 100;
        this.sagComp.ratio.setTargetAtTime(2 + s * 6, now, 0.05);
        this.sagComp.threshold.setTargetAtTime(-28 + s * 16, now, 0.05);
        break;
      }

      // Blend seco/molhado
      case 'blend': {
        const b = Math.max(0, Math.min(100, value)) / 100;
        this.blend = b;
        this.wetGain.gain.setTargetAtTime(b, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - b, now, 0.01);
        break;
      }

      // Cab sim on/off
      case 'cab':
        this.cabEnabled = value ? 1 : 0;
        this.cabSim.frequency.setTargetAtTime(value ? 5500 : 20000, now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
    }

    // guarda último valor
    this.params = this.params || {};
    this.params[param] = value;
  }

  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.inputGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clipA.disconnect();
      this.dcBlock.disconnect();
      this.clipB.disconnect();
      this.postLPF.disconnect();
      this.midBoost.disconnect();
      this.presenceFilter.disconnect();
      this.toneFilter.disconnect();
      this.sagComp.disconnect();
      this.cabSim.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default JHSSuperBoltEffect;
