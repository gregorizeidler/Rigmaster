import BaseEffect from './BaseEffect';

/**
 * BossDS1Effect (turbo)
 * 
 * Boss DS-1 Distortion com:
 *  - Hard clipping assimétrico tipo op-amp
 *  - Crossfade tone (dark/bright) igual ao original
 *  - Pré-ênfase antes do clip
 *  - Compressão transistor stage
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   dist, tone, level, mix, anti_alias_hz
 */
class BossDS1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'DS-1', 'bossds1');

    // ===== Front-end / condicionamento =====
    this.inHPF = audioContext.createBiquadFilter(); // remove subgrave antes do ganho
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;

    this.inputGain = audioContext.createGain();     // drive global
    this.inputGain.gain.value = 1.5;

    // "transistor stage" (suave cola/ataque)
    this.preComp = audioContext.createDynamicsCompressor();
    this.preComp.threshold.value = -20;
    this.preComp.knee.value = 10;
    this.preComp.ratio.value = 2.3;
    this.preComp.attack.value = 0.002;
    this.preComp.release.value = 0.09;

    // Pré-ênfase leve (realça agudos antes do clip – típico DS-1)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 1000;
    this.preEmphasis.gain.value = 5.5;

    // ===== Distorção (op-amp hard clip assimétrico) =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeDS1Curve(50, 0.7, 0.6);

    // ===== Rede de TONE (crossfade entre HPF e LPF — mais fiel ao pedal) =====
    // ramo "bright" (HPF pós-clip)
    this.toneHPF = audioContext.createBiquadFilter();
    this.toneHPF.type = 'highpass';
    this.toneHPF.frequency.value = 720;

    // ramo "dark" (LPF pós-clip)
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2000;

    // crossfade
    this.toneXFadeA = audioContext.createGain(); // dark
    this.toneXFadeB = audioContext.createGain(); // bright
    this.toneXFadeA.gain.value = 0.5;
    this.toneXFadeB.gain.value = 0.5;

    // soma dos ramos
    this.toneSum = audioContext.createGain();
    this.toneSum.gain.value = 1.0;

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
    this.outputGain.gain.value = 0.45;

    // ===== Cadeia =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preComp);
    this.preComp.connect(this.preEmphasis);
    this.preEmphasis.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);

    // DC blocker pós-clip
    this.clipper.connect(this.dcBlocker);

    // split para os dois ramos do TONE
    this.dcBlocker.connect(this.toneLPF);
    this.dcBlocker.connect(this.toneHPF);

    // crossfade
    this.toneLPF.connect(this.toneXFadeA);
    this.toneHPF.connect(this.toneXFadeB);
    this.toneXFadeA.connect(this.toneSum);
    this.toneXFadeB.connect(this.toneSum);

    // pós
    this.toneSum.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo (da BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      dist: 50,
      tone: 50,
      level: 70
    };
  }

  // Hard-clipping assimétrico com pequeno blend harmônico
  makeDS1Curve(amount, posKnee = 0.7, negKnee = 0.6) {
    const n = 65536;
    const c = new Float32Array(n);
    const drive = 1 + amount / 10; // 1..11

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      // joelhos distintos positivo/negativo
      if (y > posKnee) {
        y = posKnee + (y - posKnee) * 0.1;    // hard no topo
      } else if (y < -negKnee) {
        y = -negKnee + (y + negKnee) * 0.15;  // levemente mais macio embaixo
      }

      // conteúdo harmônico "DS-1": odd + um pouco de even
      y += 0.10 * Math.tanh(x * drive * 3); // ímpares
      y += 0.05 * Math.tanh(x * drive * 2); // pares

      // normalização suave
      c[i] = y * 0.8;
    }
    return c;
  }

  // mapeia 0..100 em gains complementares do crossfade
  _applyToneCrossfade(value) {
    // 0 = dark (LPF), 100 = bright (HPF)
    const t = Math.max(0, Math.min(100, value)) / 100;
    // lei de potência leve p/ sensação linear
    const a = (1 - t) ** 0.8; // dark
    const b = t ** 0.8;       // bright
    const s = a + b || 1;
    this.toneXFadeA.gain.setValueAtTime(a / s, this.audioContext.currentTime);
    this.toneXFadeB.gain.setValueAtTime(b / s, this.audioContext.currentTime);

    // varre também os cortes para dar mais range útil
    // LPF 1k..5k (dark→menos agudos / bright→mais agudos)
    const lpf = 1000 + t * 4000;
    // HPF 350..1200 (dark→menos HPF / bright→mais HPF)
    const hpf = 350 + t * 850;

    this.toneLPF.frequency.setTargetAtTime(lpf, this.audioContext.currentTime, 0.01);
    this.toneHPF.frequency.setTargetAtTime(hpf, this.audioContext.currentTime, 0.01);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'dist':
        this.clipper.curve = this.makeDS1Curve(value);
        // ajusta ganho de entrada mantendo headroom
        this.inputGain.gain.setTargetAtTime(1 + value / 50, now, 0.01);
        break;

      case 'tone':
        this._applyToneCrossfade(value);
        break;

      case 'level':
        // 0..100 → 0..~0.75 (evita clip no bus)
        this.outputGain.gain.setTargetAtTime((value / 100) * 0.75, now, 0.01);
        break;

      case 'mix':
        // wet/dry global (herdado de BaseEffect)
        this.updateMix(value);
        break;

      // extras opcionais (se quiser expor depois):
      case 'anti_alias_hz': // 4k..12k
        this.antiAliasLPF.frequency.setTargetAtTime(value, now, 0.02);
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
      this.preComp.disconnect();
      this.preEmphasis.disconnect();
      this.clipper.disconnect();
      this.toneLPF.disconnect();
      this.toneHPF.disconnect();
      this.toneXFadeA.disconnect();
      this.toneXFadeB.disconnect();
      this.toneSum.disconnect();
      this.antiAliasLPF.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossDS1Effect;
