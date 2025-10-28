import BaseEffect from './BaseEffect';

/**
 * BossSD1Effect (turbo)
 * 
 * Boss SD-1 Super Overdrive com:
 *  - Clipping assimétrico com joelho suave
 *  - Assimetria forte no ciclo negativo (característico)
 *  - Tilt-EQ (low-shelf + high-shelf complementares)
 *  - Mid-hump sutil em 750Hz
 *  - Pré-ênfase para pick attack
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   drive, tone, level, mix
 */
class BossSD1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss SD-1', 'bosssd1');

    // ===== Condicionamento de entrada =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 60; // aperta subgrave antes do gain

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.8;

    // Pré-ênfase: realça agudos antes do clip (ataque mais "SD-1")
    this.preFilter = audioContext.createBiquadFilter();
    this.preFilter.type = 'highshelf';
    this.preFilter.frequency.value = 1000;
    this.preFilter.gain.value = 4;

    // ===== Clipping assimétrico com joelho suave =====
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeSD1Curve(50);

    // Mid-hump suave (empurra 750 Hz)
    this.midHump = audioContext.createBiquadFilter();
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 750;
    this.midHump.Q.value = 0.9;
    this.midHump.gain.value = 2; // bem discreto; o SD-1 tem essa cara

    // ===== TONE: Tilt-EQ em torno de ~1 kHz =====
    this.toneLow = audioContext.createBiquadFilter();
    this.toneLow.type = 'lowshelf';
    this.toneLow.frequency.value = 300;

    this.toneHigh = audioContext.createBiquadFilter();
    this.toneHigh.type = 'highshelf';
    this.toneHigh.frequency.value = 2200;

    // ===== Anti-alias & saída =====
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 9500;
    this.antiAliasLPF.Q.value = 0.8;

    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.5;

    // ===== Cadeia =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preFilter);
    this.preFilter.connect(this.clipper);
    this.clipper.connect(this.midHump);
    this.midHump.connect(this.toneLow);
    this.toneLow.connect(this.toneHigh);
    this.toneHigh.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      drive: 50,
      tone: 50,
      level: 70
    };
  }

  // Curva SD-1: assimetria forte no ciclo negativo e joelho mais musical.
  makeSD1Curve(amount) {
    const n = 44100;
    const curve = new Float32Array(n);

    // drive base 1..4.3 aprox; assimetria cresce com o drive
    const drive = 1 + amount / 30;
    const asym = 1.4 + (amount / 100) * 0.9; // ganho maior no negativo

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;

      // ganho diferenciado por polaridade
      const g = x >= 0 ? 1.4 : asym;

      // joelho suave + "g" para assimetria
      let y = Math.tanh((x * drive) * g);

      // harmônicos pares sutis (quente)
      y += 0.06 * Math.tanh(x * drive * 2);

      // segura nível para não estourar o mixer
      curve[i] = y * 0.86;
    }
    return curve;
  }

  _applyToneTilt(value) {
    // 0..100 → ±8 dB de tilt entre graves/agudos
    const t = Math.max(0, Math.min(100, value)) / 100; // 0..1
    const range = 8; // dB por banda
    const lowGain = (1 - t) * range - range / 2;  // -4..+4 dB
    const highGain = t * range - range / 2;       // -4..+4 dB
    const now = this.audioContext.currentTime;
    this.toneLow.gain.setTargetAtTime(lowGain, now, 0.02);
    this.toneHigh.gain.setTargetAtTime(highGain, now, 0.02);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'drive':
        this.clipper.curve = this.makeSD1Curve(value);
        // pouquinho de make-up com o drive
        this.inputGain.gain.setTargetAtTime(1.5 + value / 66, now, 0.01);
        break;

      case 'tone':
        // substitui o simples LPF por tilt (mais útil e musical)
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
      this.preFilter.disconnect();
      this.clipper.disconnect();
      this.midHump.disconnect();
      this.toneLow.disconnect();
      this.toneHigh.disconnect();
      this.antiAliasLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossSD1Effect;
