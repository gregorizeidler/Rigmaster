import BaseEffect from './BaseEffect';

/**
 * XoticEPBoosterEffect (turbo)
 * Echoplex EP-3 preamp vibe, com:
 *  - Tilt-EQ (tone)        -> shelves opostos
 *  - Lowcut/Highcut        -> controle de corpo/brilho
 *  - Headroom & Bias       -> sensação de "tubo"/assimetria
 *  - Comp ajustável        -> cola mais forte se quiser
 *  - Bright/Fat switches   -> presets rápidos
 *  - Blend wet/dry         -> sempre no lugar na mix
 *  - Cab-sim simples       -> LPF removível p/ direto na mesa
 *
 * Params aceitos:
 *   boost, level, tone, lowcut, highcut, headroom, bias,
 *   comp, bright (0/1), fat (0/1), blend, cab (0/1)
 */
class XoticEPBoosterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Xotic EP Booster', 'xoticep');

    // -------- Pré/Proteção --------
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 30;

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // -------- Preamp EP-3 --------
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.oversample = '4x';
    this.bias = 0.1;       // 0..0.25
    this.headroom = 50;    // 0..100
    this.preampShaper.curve = this.makeEPCurve(this.headroom, this.bias);

    // DC blocker pós-saturação
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // -------- Compressão (cola EP) --------
    this.comp = audioContext.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 16;
    this.comp.ratio.value = 2.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    // -------- EQs principais --------
    // Body (low-mid) & Presence (hi-mid)
    this.body = audioContext.createBiquadFilter();
    this.body.type = 'peaking';
    this.body.frequency.value = 400;
    this.body.Q.value = 0.8;
    this.body.gain.value = 1;

    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 2400;
    this.presence.Q.value = 1.0;
    this.presence.gain.value = 2;

    // Tilt-EQ: par de shelves para um "tone" musical
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 180;
    this.lowShelf.gain.value = 0;

    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3200;
    this.highShelf.gain.value = 0;

    // Limitadores de banda (Lowcut/Highcut)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 35;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 16000;

    // Cab-sim (LPF mais baixo) – opcional
    this.cabSim = audioContext.createBiquadFilter();
    this.cabSim.type = 'lowpass';
    this.cabSim.frequency.value = 6000;
    this.cabSim.Q.value = 0.8;
    this.cabEnabled = 0;

    // -------- Saída / Blend --------
    this.boostGain = audioContext.createGain(); // "boost" principal
    this.boostGain.gain.value = 1.5;

    this.level = audioContext.createGain();
    this.level.gain.value = 0.8;

    // Blend seco/molhado
    this.blendVal = 1.0; // 100% wet por padrão
    this.wetGain.gain.value = this.blendVal;
    this.dryGain.gain.value = 1 - this.blendVal;

    // -------- Roteamento --------
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preampShaper);
    this.preampShaper.connect(this.dcBlock);
    this.dcBlock.connect(this.comp);
    this.comp.connect(this.body);
    this.body.connect(this.presence);
    this.presence.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    // caminho com/sem cab-sim
    this.postLPF.connect(this.cabSim);
    // mix de cab on/off feito por filtro (mudando freq)
    this.cabSim.connect(this.boostGain);
    this.boostGain.connect(this.level);
    this.level.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      boost: 50,
      level: 80
    };
  }

  // Curva EP-3 com headroom/bias configuráveis
  makeEPCurve(headroom = 50, bias = 0.1) {
    const n = 65536, c = new Float32Array(n);
    // headroom baixo = mais drive
    const drive = 1.1 + (100 - headroom) / 70; // ~1.1..2.5
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // base: saturação suave EP
      let y = Math.tanh(x * drive * 1.25);
      // pares suaves (EP color)
      y += 0.06 * Math.tanh(x * drive * 3.0);
      // assimetria leve
      y *= x >= 0 ? (1 + bias) : (1 - bias * 0.6);
      // compressão sutil dependente da amplitude
      y *= (1 - 0.08 * Math.min(1, Math.abs(x)));
      c[i] = y * 0.95;
    }
    return c;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      // Booster principal 1x..3x + comp interativa
      case 'boost': {
        const amt = 1 + (value / 100) * 2;
        this.boostGain.gain.setTargetAtTime(amt, now, 0.01);
        // mais boost -> comp ligeiramente menos agressiva (headroom maior)
        this.comp.threshold.setTargetAtTime(-20 + (value / 12), now, 0.02);
        break;
      }

      case 'level':
        this.level.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      // Tilt-EQ: +hi = abre agudos e segura graves (e vice-versa)
      case 'tone': {
        const t = (value - 50) / 50; // -1..+1
        const tiltDb = 6 * t;        // até ±6 dB
        this.highShelf.gain.setTargetAtTime( tiltDb, now, 0.01);
        this.lowShelf.gain.setTargetAtTime(-tiltDb, now, 0.01);
        break;
      }

      // Lowcut 20..200 Hz
      case 'lowcut':
        this.postHPF.frequency.setTargetAtTime(20 + (value / 100) * 180, now, 0.01);
        break;

      // Highcut 4k..18k
      case 'highcut':
        this.postLPF.frequency.setTargetAtTime(4000 + (value / 100) * 14000, now, 0.01);
        break;

      // Headroom (0..100) e Bias (0..100)
      case 'headroom':
        this.headroom = Math.max(0, Math.min(100, value));
        this.preampShaper.curve = this.makeEPCurve(this.headroom, this.bias);
        break;

      case 'bias': {
        const b = Math.max(0, Math.min(100, value)) / 100; // 0..1
        this.bias = 0.25 * b;
        this.preampShaper.curve = this.makeEPCurve(this.headroom, this.bias);
        break;
      }

      // Comp (0..100): aumenta ratio e desce threshold
      case 'comp': {
        const k = Math.max(0, Math.min(100, value)) / 100;
        this.comp.ratio.setTargetAtTime(1.5 + k * 4, now, 0.05);          // 1.5..5.5
        this.comp.threshold.setTargetAtTime(-26 + k * 14, now, 0.05);     // -26..-12
        break;
      }

      // Switches rápidos
      case 'bright':
        this.presence.gain.setTargetAtTime(value ? 3 : 0, now, 0.01);
        break;

      case 'fat':
        this.body.gain.setTargetAtTime(value ? 2 : 0, now, 0.01);
        break;

      // Blend wet/dry
      case 'blend': {
        const b = Math.max(0, Math.min(100, value)) / 100;
        this.blendVal = b;
        this.wetGain.gain.setTargetAtTime(b, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - b, now, 0.01);
        break;
      }

      // Cab-sim on/off (LPF forte)
      case 'cab':
        this.cabEnabled = value ? 1 : 0;
        this.cabSim.frequency.setTargetAtTime(value ? 6000 : 20000, now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }

    this.params = this.params || {};
    this.params[param] = value;
  }

  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.inputGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.preampShaper.disconnect();
      this.dcBlock.disconnect();
      this.comp.disconnect();
      this.body.disconnect();
      this.presence.disconnect();
      this.lowShelf.disconnect();
      this.highShelf.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.cabSim.disconnect();
      this.boostGain.disconnect();
      this.level.disconnect();
    } catch (e) {}
  }
}

export default XoticEPBoosterEffect;
