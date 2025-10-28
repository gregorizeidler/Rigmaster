import BaseEffect from './BaseEffect';

/**
 * ProCoRATEffect (turbo)
 * 
 * ProCo RAT Distortion com:
 *  - LM308 op-amp simulation (slew-rate limiting)
 *  - Hard clipping ±0.8V com compressão central
 *  - Mid boost pre-clipping (1.5kHz)
 *  - Ruetz mod opcional
 *  - Filter inverso (CCW = mais brilho)
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   distortion, filter, volume, mix, ruetz (0/1)
 */
class ProCoRATEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'RAT', 'procorat');

    // ===== Condicionamento de entrada =====
    this.inHPF = audioContext.createBiquadFilter();
    this.inHPF.type = 'highpass';
    this.inHPF.frequency.value = 120; // segura subgrave sem tirar corpo

    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;

    // Mid boost antes do clip (cara do RAT)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.value = 1500;
    this.preEmphasis.Q.value = 2.0;
    this.preEmphasis.gain.value = 12;

    // Slew-rate "LM308": limita transientes muito rápidos
    this.slewRateLimiter = audioContext.createBiquadFilter();
    this.slewRateLimiter.type = 'lowpass';
    this.slewRateLimiter.frequency.value = 15000;
    this.slewRateLimiter.Q.value = 0.5;

    // Pré-compressor para o "squish" do LM308
    this.preCompressor = audioContext.createDynamicsCompressor();
    this.preCompressor.threshold.value = -15;
    this.preCompressor.knee.value = 6;
    this.preCompressor.ratio.value = 3;
    this.preCompressor.attack.value = 0.001;
    this.preCompressor.release.value = 0.05;

    // Clipping RAT
    this.ratClip = audioContext.createWaveShaper();
    this.ratClip.oversample = '4x';
    this.ratClip.curve = this.makeRATCurve(50);

    // Anti-alias pós-clip (suaviza o serrilhado nos agudos)
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 10000;
    this.antiAliasLPF.Q.value = 0.7;

    // Filtro "Filter" (inverso: CCW = mais brilho)
    this.ratFilter = audioContext.createBiquadFilter();
    this.ratFilter.type = 'lowpass';
    this.ratFilter.frequency.value = 2000;
    this.ratFilter.Q.value = 2.2; // leve ressonância

    // Saída
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.35;

    // ===== Cadeia =====
    this.input.connect(this.inHPF);
    this.inHPF.connect(this.inputGain);
    this.inputGain.connect(this.preEmphasis);
    this.preEmphasis.connect(this.slewRateLimiter);
    this.slewRateLimiter.connect(this.preCompressor);
    this.preCompressor.connect(this.ratClip);
    this.ratClip.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.ratFilter);
    this.ratFilter.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ----- Mod opcional: RUETZ (mais aberto, menos compressão) -----
    this.ruetz = false; // liga via this.setRuetz(true)
    this._applyRuetzMod();
    
    // Inicializa params para UI
    this.params = {
      distortion: 50,
      filter: 50,
      volume: 70
    };
  }

  // Curva: hard clip ±0.8 com compressão no miolo + harmônicos "nervosos".
  makeRATCurve(amount) {
    const n = 44100;
    const curve = new Float32Array(n);
    const drive = 1 + amount / 12; // escala original
    const hard = 0.8;

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = x * drive;

      if (y > hard) y = hard;
      else if (y < -hard) y = -hard;
      else y = Math.tanh(y * 1.35); // comprime zona central

      // "Grão" de RAT (ímpares fortes + um pouco de conteúdo extra)
      y += 0.15 * Math.tanh(x * drive * 2.5);
      y += 0.08 * Math.tanh(x * drive * 5.0);

      curve[i] = y * 0.74; // headroom
    }
    return curve;
  }

  _applyRuetzMod() {
    // Ruetz: reduz ênfase de médios antes do clip e abre o filtro final
    if (this.ruetz) {
      this.preEmphasis.gain.value = 6;   // menos "nasal"
      this.ratFilter.Q.value = 1.2;      // menos ressonância
      this.inHPF.frequency.value = 90;   // um pouquinho mais de grave
    } else {
      this.preEmphasis.gain.value = 12;
      this.ratFilter.Q.value = 2.2;
      this.inHPF.frequency.value = 120;
    }
  }

  setRuetz(enabled) {
    this.ruetz = !!enabled;
    this._applyRuetzMod();
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'distortion':
        this.ratClip.curve = this.makeRATCurve(value);
        // leve make-up com o drive
        this.inputGain.gain.setTargetAtTime(1.5 + value / 50, now, 0.01);
        // com mais dist, protege os agudos
        const aa = 8000 + (100 - value) * 30; // 8–11 kHz
        this.antiAliasLPF.frequency.setTargetAtTime(aa, now, 0.02);
        break;

      case 'filter':
        // inverso: 0 = mais brilho (~10k), 100 = mais fechado (~500 Hz)
        const f = 500 + (100 - value) * 95; // 500..10000
        this.ratFilter.frequency.setTargetAtTime(f, now, 0.01);
        break;

      case 'volume':
        this.outputGain.gain.setTargetAtTime(value / 150, now, 0.01);
        break;

      case 'mix':
        this.updateMix(value);
        break;
        
      case 'ruetz':
        this.setRuetz(!!value);
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
      this.slewRateLimiter.disconnect();
      this.preCompressor.disconnect();
      this.ratClip.disconnect();
      this.antiAliasLPF.disconnect();
      this.ratFilter.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default ProCoRATEffect;
