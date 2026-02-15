import BaseEffect from './BaseEffect';

/**
 * TubeScreamerEffect (turbo)
 * 
 * Ibanez TS808/TS9 com upgrades:
 *  - Controle de diodos (si/led/ge/hard)
 *  - Assimetria e dureza ajustáveis
 *  - Mid-hump configurável (freq, Q, gain)
 *  - Fat/Bright switches
 *  - Lowcut/Highcut ajustáveis
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   drive, tone, level, mix, lowcut, highcut,
 *   mids, q, hump, fat (0/1), bright (0/1),
 *   diode ('si'|'led'|'ge'|'hard'), asym, hard
 */
class TubeScreamerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tube Screamer', 'tubescreamer');

    // ========= Pré/Proteção =========
    this.inHPF = audioContext.createBiquadFilter(); // remove rumble
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 25;

    // ========= EQ de entrada (gera o mid-hump clássico) =========
    this.hpfTS = audioContext.createBiquadFilter(); // high-pass ~ TS
    this.hpfTS.type = 'highpass';
    this.hpfTS.frequency.value = 720;

    this.midHump = audioContext.createBiquadFilter(); // realça médios
    this.midHump.type = 'peaking';
    this.midHump.frequency.value = 720;
    this.midHump.Q.value = 1.0;
    this.midHump.gain.value = 6;

    // ========= Pré-gain / Clip =========
    this.preGain = audioContext.createGain();
    this.preGain.gain.value = 3.0;

    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';

    // ========= Filtros pós-clip =========
    this.toneLPF = audioContext.createBiquadFilter(); // "tone" (mais aberto = cutoff maior)
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 2000;

    this.postHPF = audioContext.createBiquadFilter(); // lowcut ajustável
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 40;

    this.antiAliasLPF = audioContext.createBiquadFilter(); // anti-alias pré-clip
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // DC blocker pós-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // ========= Shelves auxiliares (fat / bright) =========
    this.lowShelf = audioContext.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 180;
    this.lowShelf.gain.value = 0;

    this.highShelf = audioContext.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3500;
    this.highShelf.gain.value = 0;

    // ========= Ganho de saída =========
    this.postGain = audioContext.createGain();
    this.postGain.gain.value = 0.4;

    // ========= Roteamento =========
    // wet
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.hpfTS);
    this.hpfTS.connect(this.midHump);
    this.midHump.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preGain);
    this.preGain.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLPF);
    this.toneLPF.connect(this.postHPF);
    this.postHPF.connect(this.lowShelf);
    this.lowShelf.connect(this.highShelf);
    this.highShelf.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ========= Defaults / Params =========
    this.params = {
      drive: 50,
      tone: 50,
      level: 70,
      mix: 100,        // 0..100
      lowcut: 10,      // 20..300 Hz
      highcut: 85,     // 2k..16k
      mids: 720,       // Hz
      q: 1.0,
      hump: 6,         // dB
      fat: 0,          // 0/1
      bright: 0,       // 0/1
      diode: 'si',     // 'si' | 'led' | 'ge' | 'hard'
      asym: 12,        // 0..30 (% de assimetria)
      hard: 35         // 0..100 (dureza do clip)
    };

    this.clip.curve = this.makeClipCurve(
      this.params.drive,
      this.params.asym,
      this.params.hard,
      this.params.diode
    );

    // aplica mix inicial
    this.wetGain.gain.value = this.params.mix / 100;
    this.dryGain.gain.value = 1 - this.params.mix / 100;
  }

  // Curva de clip: controlável por "drive", "asym", "hard" e modo de diodo
  makeClipCurve(driveVal = 50, asym = 12, hard = 35, diode = 'si') {
    const n = 65536;
    const c = new Float32Array(n);

    // ganho/curvatura base
    const kDrive = 1 + driveVal / 9;         // mais drive -> mais ganho
    const asymFac = 1 + (asym / 100) * 0.6;  // 1..1.6
    // dureza de transição: pequeno => macio / grande => duro
    const hardness = 0.7 + (hard / 100) * 3.3; // ~0.7..4.0

    // "tipo de diodo" ajusta a knee:
    // si = clássico TS, led = mais duro/aberto, ge = macio/escuro, hard = clip quase linear/hard
    const diodeMap = {
      si:   1.0,   // padrão
      led:  1.35,  // mais duro
      ge:   0.8,   // mais macio
      hard: 1.8
    };
    const knee = hardness * (diodeMap[diode] ?? 1.0);

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1; // -1..1
      // ganho pré-clip
      let y = x * kDrive;

      // soft clip (tanh com knee)
      y = Math.tanh(y * knee);

      // assimetria (lado positivo levemente mais alto)
      y *= x >= 0 ? asymFac : (2 - asymFac);

      // leve compressão dependente de |x| para "cola" de opamp
      y *= (1 - 0.08 * Math.min(1, Math.abs(x)));

      // saída levemente reduzida para headroom
      c[i] = y * 0.9;
    }
    return c;
  }

  // Helper para mapear 0..100 → freq (bounds inclusivos)
  _mapRange01(v, min, max) {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return min + t * (max - min);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'drive': {
        // pré-gain e curva
        this.preGain.gain.setTargetAtTime(1 + (value / 100) * 9, now, 0.01);
        this.clip.curve = this.makeClipCurve(
          value,
          this.params.asym,
          this.params.hard,
          this.params.diode
        );
        break;
      }

      case 'tone': {
        const cutoff = this._mapRange01(value, 500, 4000); // 500..4000 Hz
        this.toneLPF.frequency.setTargetAtTime(cutoff, now, 0.01);
        break;
      }

      case 'level':
        this.postGain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
        break;

      case 'mix': {
        const w = Math.max(0, Math.min(100, value)) / 100;
        this.wetGain.gain.setTargetAtTime(w, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - w, now, 0.01);
        break;
      }

      case 'lowcut':
        this.postHPF.frequency.setTargetAtTime(this._mapRange01(value, 20, 300), now, 0.01);
        break;

      case 'highcut': {
        const hc = this._mapRange01(value, 2000, 16000);
        // o highcut principal vem do "tone"; este actua como teto global
        this.antiAliasLPF.frequency.setTargetAtTime(hc, now, 0.02);
        break;
      }

      case 'mids':
        this.midHump.frequency.setTargetAtTime(value, now, 0.02); // 400..1k2 funciona bem
        break;

      case 'q':
        this.midHump.Q.setTargetAtTime(Math.max(0.3, Math.min(4, value)), now, 0.02);
        break;

      case 'hump':
        this.midHump.gain.setTargetAtTime(value, now, 0.02); // dB
        break;

      case 'fat':
        this.lowShelf.gain.setTargetAtTime(value ? 3 : 0, now, 0.01);
        break;

      case 'bright':
        this.highShelf.gain.setTargetAtTime(value ? 3 : 0, now, 0.01);
        break;

      case 'diode':
      case 'asym':
      case 'hard': {
        this.clip.curve = this.makeClipCurve(
          this.params.drive,
          this.params.asym,
          this.params.hard,
          this.params.diode
        );
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
      this.hpfTS.disconnect();
      this.midHump.disconnect();
      this.preGain.disconnect();
      this.clip.disconnect();
      this.toneLPF.disconnect();
      this.postHPF.disconnect();
      this.lowShelf.disconnect();
      this.highShelf.disconnect();
      this.antiAliasLPF.disconnect();
      this.dcBlocker.disconnect();
      this.postGain.disconnect();
    } catch (e) {}
  }
}

export default TubeScreamerEffect;
