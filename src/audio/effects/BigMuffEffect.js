import BaseEffect from './BaseEffect';

/**
 * BigMuffEffect (turbo)
 * 
 * Electro-Harmonix Big Muff Pi com:
 *  - Dual-stage diode clipping (2 estágios com características diferentes)
 *  - HPF de entrada (~90Hz) para evitar mud
 *  - LPF pós-clip dinâmico (ajusta com sustain)
 *  - Tone stack paralelo real (LP + HP em paralelo)
 *  - DC blocker
 *  - Alto headroom de saída (típico do Muff)
 *
 * Params aceitos:
 *   sustain, tone, volume, mix
 */
class BigMuffEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Big Muff', 'bigmuff');

    // ===== Estágios de ganho (pré-clipping) =====
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 90;
    this.preHPF.Q.value = 0.707;

    this.preGain1 = audioContext.createGain();
    this.preGain2 = audioContext.createGain();
    this.preGain1.gain.value = 8;   // forte, como no circuito
    this.preGain2.gain.value = 6;

    // ===== Clipping em dois estágios (diodes-to-ground vibe) =====
    this.clipper1 = audioContext.createWaveShaper();
    this.clipper2 = audioContext.createWaveShaper();
    this.clipper1.oversample = '4x';
    this.clipper2.oversample = '4x';
    this.clipper1.curve = this.makeMuffClipCurve(36, 0.28, 0.22); // drive, vt+, vt-
    this.clipper2.curve = this.makeMuffClipCurve(48, 0.26, 0.24); // mais fechado

    // ===== Anti-fizz LPF pós-clip (dinâmico com sustain) =====
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    this.postLPF.Q.value = 0.7;

    // ===== Tone stack paralelo REAL (LP + HP em paralelo) =====
    this.bassPath = audioContext.createBiquadFilter();
    this.bassPath.type = 'lowpass';
    this.bassPath.frequency.value = 650;
    this.bassPath.Q.value = 0.707;

    this.treblePath = audioContext.createBiquadFilter();
    this.treblePath.type = 'highpass';
    this.treblePath.frequency.value = 1600;
    this.treblePath.Q.value = 0.707;

    this.bassGain = audioContext.createGain();
    this.trebleGain = audioContext.createGain();
    this.bassGain.gain.value = 0.5;
    this.trebleGain.gain.value = 0.5;

    this.toneMixer = audioContext.createGain();
    this.toneMixer.gain.value = 1.0;

    // ===== Saída / Normalização =====
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.35; // Muff tem MUITO volume disponível

    // ===== Roteamento =====
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.preGain1);
    this.preGain1.connect(this.clipper1);
    this.clipper1.connect(this.preGain2);
    this.preGain2.connect(this.clipper2);

    // Tone stack paralelo
    this.clipper2.connect(this.bassPath);
    this.clipper2.connect(this.treblePath);
    this.bassPath.connect(this.bassGain);
    this.treblePath.connect(this.trebleGain);
    this.bassGain.connect(this.toneMixer);
    this.trebleGain.connect(this.toneMixer);

    // Pós-clip + saída
    this.toneMixer.connect(this.postLPF);
    this.postLPF.connect(this.dcBlock);
    this.dcBlock.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      sustain: 50,
      tone: 50,
      volume: 70
    };
  }

  // Curva de clipping estilo diodo: limiar assimétrico leve + joelho suave
  // drive: ganho interno; vtP/vtN: thresholds +/- (em "volts" normalizados)
  makeMuffClipCurve(drive = 40, vtP = 0.28, vtN = 0.28) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const knee = 0.22; // suavidade do joelho

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // [-1, 1]
      let y = x * (1 + drive / 20);

      // Lado positivo
      if (y > vtP) {
        const over = y - vtP;
        y = vtP + Math.tanh(over / knee) * knee;
      }
      // Lado negativo
      if (y < -vtN) {
        const under = y + vtN;
        y = -vtN + Math.tanh(under / knee) * knee;
      }

      // Compressão central (mantém sustain sem serrilhar)
      y = Math.tanh(y * 1.15);

      // Realce leve de ímpares (raspado Muff)
      y += 0.07 * Math.tanh(x * (1 + drive / 15) * 3.0);

      curve[i] = y * 0.95;
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'sustain': {
        // Ganho dos estágios de pré conforme sustain
        const g1 = 3 + (value / 100) * 17; // ~3–20
        const g2 = 1.5 + (value / 100) * 10.5; // ~1.5–12
        this.preGain1.gain.setTargetAtTime(g1, now, 0.01);
        this.preGain2.gain.setTargetAtTime(g2, now, 0.01);

        // Mais sustain => LPF um pouco mais baixo (controla fizz)
        const fAA = 6500 + (100 - value) * 25; // ~6.5–9 kHz
        this.postLPF.frequency.setTargetAtTime(fAA, now, 0.02);
        break;
      }

      case 'tone': {
        // Crossfade musical (curva levemente log) entre LP (bass) e HP (treble)
        const t = value / 100; // 0..1
        // Dou uma leve curva S pra zona central ficar mais utilizável
        const shape = (u) => 0.5 + 0.5 * Math.tanh((u - 0.5) * 2.2);
        const treble = shape(t);
        const bass = 1 - treble;
        // Normaliza para 0..1 relativo
        const norm = Math.max(0.001, bass + treble);
        this.bassGain.gain.setTargetAtTime(bass / norm, now, 0.01);
        this.trebleGain.gain.setTargetAtTime(treble / norm, now, 0.01);
        break;
      }

      case 'volume':
        // Headroom alto típico do Muff
        this.postGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      case 'mix':
        // se você usa blend global, mantém consistente
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
      this.preHPF.disconnect();
      this.preGain1.disconnect();
      this.preGain2.disconnect();
      this.clipper1.disconnect();
      this.clipper2.disconnect();
      this.bassPath.disconnect();
      this.treblePath.disconnect();
      this.bassGain.disconnect();
      this.trebleGain.disconnect();
      this.toneMixer.disconnect();
      this.postLPF.disconnect();
      this.dcBlock.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default BigMuffEffect;
