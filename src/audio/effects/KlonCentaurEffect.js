import BaseEffect from './BaseEffect';

/**
 * KlonCentaurEffect (turbo)
 * 
 * Lendário overdrive transparente com:
 *  - Dual path (clean + dirty blend)
 *  - Controle de diodos (ge/si/led/hard)
 *  - Assimetria ajustável
 *  - Bass cut e air cut configuráveis
 *  - Mid voicing (pre e post clip)
 *  - Mix wet/dry global
 *
 * Params aceitos:
 *   gain, treble, level, mix,
 *   diode ('ge'|'si'|'led'|'hard'), asym,
 *   bass_cut, air_cut, mid_db, pre_mid_db
 */
class KlonCentaurEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Klon Centaur', 'kloncentaur');

    // ===== Buffers / proteção =====
    this.inHPF = audioContext.createBiquadFilter(); // corta subgrave antes do clip
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 35;

    // ===== Caminhos clean/dirty (característica do Klon) =====
    this.cleanGain = audioContext.createGain(); // parte limpa sempre presente
    this.cleanGain.gain.value = 0.65;

    this.preEQ = audioContext.createBiquadFilter(); // leve pré-EQ do caminho sujo
    this.preEQ.type = 'peaking';
    this.preEQ.frequency.value = 800;
    this.preEQ.Q.value = 0.7;
    this.preEQ.gain.value = 0.0;

    this.dirtyGain = audioContext.createGain();
    this.dirtyGain.gain.value = 1.6;

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    this.clip = audioContext.createWaveShaper();
    this.clip.oversample = '4x';
    this.clip.curve = this.makeKlonCurve({ drive: 50, diode: 'ge', asym: 10 });

    // DC blocker pós-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Pós-clip (ajuste de graves/aresta)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;

    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 15000;

    // Treble (shelving alto – igual ao controle do Klon)
    this.treble = audioContext.createBiquadFilter();
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 1600;
    this.treble.gain.value = 0;

    // Mid voicing (opcional – transparente por padrão)
    this.midVoice = audioContext.createBiquadFilter();
    this.midVoice.type = 'peaking';
    this.midVoice.frequency.value = 1200;
    this.midVoice.Q.value = 0.9;
    this.midVoice.gain.value = 0;

    // Mistura clean+dirty interna (antes do wet/dry global da BaseEffect)
    this.sumGain = audioContext.createGain();
    this.sumGain.gain.value = 1.0;

    // Saída
    this.level = audioContext.createGain();
    this.level.gain.value = 0.7;

    // ===== Roteamento =====
    // entrada -> HPF
    this.input.connect(this.inHPF);

    // clean: inHPF -> cleanGain -> sum
    this.inHPF.connect(this.cleanGain);
    this.cleanGain.connect(this.sumGain);

    // dirty: inHPF -> preEQ -> dirtyGain -> antiAlias -> clip -> dcBlocker -> pós-filtros -> treble -> mid -> sum
    this.inHPF.connect(this.preEQ);
    this.preEQ.connect(this.dirtyGain);
    this.dirtyGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clip);
    this.clip.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.treble);
    this.treble.connect(this.midVoice);
    this.midVoice.connect(this.sumGain);

    // sum -> nivel -> wetGain -> out
    this.sumGain.connect(this.level);
    this.level.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // dry global paralelo (BaseEffect)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Parâmetros internos =====
    this.params = {
      gain: 50,        // mix clean/dirty + leve drive
      treble: 50,      // ±dB
      level: 70,       // saída
      mix: 100,        // wet/dry global (BaseEffect)
      diode: 'ge',     // 'ge' | 'si' | 'led' | 'hard'
      asym: 10,        // 0..30
      bass_cut: 20,    // 20..200 Hz (HPF pós-clip)
      air_cut: 90,     // 4k..18k (LPF pós-clip)
      mid_db: 0,       // -6..+6 dB
      pre_mid_db: 0    // -4..+4 dB (antes do clip)
    };

    // aplica mix global inicial
    this.wetGain.gain.value = this.params.mix / 100;
    this.dryGain.gain.value = 1 - this.params.mix / 100;
  }

  // Curva com joelho macio estilo germanium, controle de diodo/assimetria
  makeKlonCurve({ drive = 50, diode = 'ge', asym = 10 } = {}) {
    const n = 65536;
    const c = new Float32Array(n);

    const driveMul = 1 + drive / 33; // ~1..2.5
    const diodeKnee = ({ ge: 0.85, si: 1.1, led: 1.35, hard: 1.8 }[diode] ?? 0.85);
    const asymFac = 1 + (asym / 100) * 0.5; // 1..1.5

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * driveMul;

      // joelho extremamente macio
      y = Math.tanh(y * diodeKnee);

      // assimetria: lado positivo um pouco maior
      y *= x >= 0 ? asymFac : (2 - asymFac);

      // "cola" leve dependente do nível
      y *= 1 - 0.06 * Math.min(1, Math.abs(x));

      // um toque de pares (calor)
      y += 0.02 * Math.tanh(x * driveMul * 2);

      c[i] = y * 0.95;
    }
    return c;
  }

  // mapeia 0..100 → [a..b]
  _map(v, a, b) { const t = Math.max(0, Math.min(100, v)) / 100; return a + t * (b - a); }

  // Lei de mistura clean/dirty parecida com o feel do Klon:
  // mais "gain" => aumenta dirty e reduz clean, mas o clean nunca zera totalmente.
  _applyKlonBlend(gainVal) {
    const now = this.audioContext.currentTime;
    // mix curvo para manter corpo limpo
    const t = Math.max(0, Math.min(100, gainVal)) / 100;
    const dirty = 0.9 * (t ** 0.8) + 0.2;  // ~0.2..1.1
    const clean = 0.85 * (1 - t ** 0.5) + 0.15; // ~0.15..1.0

    this.cleanGain.gain.setTargetAtTime(clean, now, 0.01);
    this.dirtyGain.gain.setTargetAtTime(dirty, now, 0.01);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'gain': {
        // blend + atualização da curva
        this._applyKlonBlend(value);
        this.clip.curve = this.makeKlonCurve({
          drive: value,
          diode: this.params.diode,
          asym: this.params.asym
        });
        break;
      }

      case 'treble': {
        // ±5 dB a partir do centro (50)
        const dB = (value - 50) / 10; // ±5 dB
        this.treble.gain.setTargetAtTime(dB, now, 0.02);
        break;
      }

      case 'level':
        this.level.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      case 'mix': {
        const w = Math.max(0, Math.min(100, value)) / 100;
        this.wetGain.gain.setTargetAtTime(w, now, 0.01);
        this.dryGain.gain.setTargetAtTime(1 - w, now, 0.01);
        break;
      }

      // ===== extras =====
      case 'diode':
      case 'asym': {
        this.clip.curve = this.makeKlonCurve({
          drive: this.params.gain,
          diode: this.params.diode,
          asym: this.params.asym
        });
        break;
      }

      case 'bass_cut': // 20..200 Hz
        this.postHPF.frequency.setTargetAtTime(this._map(value, 20, 200), now, 0.02);
        break;

      case 'air_cut': // 4k..18k Hz
        this.postLPF.frequency.setTargetAtTime(this._map(value, 4000, 18000), now, 0.02);
        break;

      case 'mid_db': // -6..+6 dB
        this.midVoice.gain.setTargetAtTime(Math.max(-6, Math.min(6, value)), now, 0.02);
        break;

      case 'pre_mid_db': // -4..+4 dB
        this.preEQ.gain.setTargetAtTime(Math.max(-4, Math.min(4, value)), now, 0.02);
        break;

      default:
        super.updateParameter?.(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inHPF.disconnect();
      this.cleanGain.disconnect();
      this.preEQ.disconnect();
      this.dirtyGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.clip.disconnect();
      this.dcBlocker.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.treble.disconnect();
      this.midVoice.disconnect();
      this.sumGain.disconnect();
      this.level.disconnect();
    } catch (e) {}
  }
}

export default KlonCentaurEffect;
