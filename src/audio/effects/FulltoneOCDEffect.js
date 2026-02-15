import BaseEffect from './BaseEffect';

/**
 * FulltoneOCDEffect (turbo)
 * 
 * Fulltone OCD (Obsessive Compulsive Drive) com:
 *  - MOSFET clipping (hybrid hard/soft, amp-like crunch)
 *  - HP/LP mode switch (via bassShelf + presence)
 *  - Tone peaking @ 1.2kHz
 *  - Anti-aliasing filter
 *  - Mix wet/dry
 *
 * Params aceitos:
 *   drive, tone, volume, mode (0-50=LP, 51-100=HP), mix
 */
class FulltoneOCDEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'OCD', 'fulltoneocd');

    // ===== Input / Condicionamento =====
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 2.0;

    // HPF sempre ativo (segura subgrave)
    this.hpFilter = audioContext.createBiquadFilter();
    this.hpFilter.type = 'highpass';
    this.hpFilter.frequency.value = 80;
    this.hpFilter.Q.value = 0.707;

    // Bass shelf para LP/HP (AGORA: lowshelf de verdade)
    this.bassShelf = audioContext.createBiquadFilter();
    this.bassShelf.type = 'lowshelf';
    this.bassShelf.frequency.value = 140;
    this.bassShelf.gain.value = 0;

    // MOSFET clipping
    this.clipper = audioContext.createWaveShaper();
    this.clipper.oversample = '4x';
    this.clipper.curve = this.makeOCDCurve(50);

    // Tone stack (pico em 1.2 kHz)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'peaking';
    this.toneFilter.frequency.value = 1200;
    this.toneFilter.Q.value = 1.0;
    this.toneFilter.gain.value = 0;

    // Presença leve (para HP)
    this.presenceShelf = audioContext.createBiquadFilter();
    this.presenceShelf.type = 'highshelf';
    this.presenceShelf.frequency.value = 2200;
    this.presenceShelf.gain.value = 0;

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // DC blocker pós-clip
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Saída
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.6;

    // ===== Cadeia =====
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.hpFilter);
    this.hpFilter.connect(this.bassShelf);
    this.bassShelf.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.presenceShelf);
    this.presenceShelf.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry paralelo
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      drive: 50,
      tone: 50,
      volume: 70,
      mode: 50
    };
  }

  // MOSFET: híbrido hard/soft, crunch amp-like
  makeOCDCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const drive = 1 + amount / 25;
    const knee = 0.7;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * drive;

      if (Math.abs(y) > knee) {
        y = Math.sign(y) * (knee + (Math.abs(y) - knee) * 0.3);
      } else {
        y = Math.tanh(y * 1.3);
      }

      // Conteúdo harmônico típico do OCD
      y += 0.12 * Math.tanh(x * drive * 2.5);
      curve[i] = y * 0.88;
    }

    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'drive':
        this.clipper.curve = this.makeOCDCurve(value);
        this.inputGain.gain.setTargetAtTime(1.5 + value / 50, now, 0.01);
        // Com mais drive, baixa um pouco o anti-alias para controlar aspereza
        const aa = 9000 + (100 - value) * 30; // ~9–12 kHz
        this.antiAliasLPF.frequency.setTargetAtTime(aa, now, 0.02);
        break;

      case 'tone':
        // ganho do pico em 1.2 kHz (-6dB .. +6dB aprox)
        this.toneFilter.gain.setTargetAtTime((value - 50) / 8, now, 0.01);
        break;

      case 'volume':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;

      case 'mode':
        // 0..50 = LP | 51..100 = HP
        if (value > 50) {
          // HP: mais "apertado"/agressivo
          this.hpFilter.frequency.setTargetAtTime(120, now, 0.01);
          this.bassShelf.gain.setTargetAtTime(-3, now, 0.02); // corta um pouco do grave
          this.presenceShelf.gain.setTargetAtTime(1.5, now, 0.02); // leve brilho
        } else {
          // LP: mais cheio e aberto
          this.hpFilter.frequency.setTargetAtTime(60, now, 0.01);
          this.bassShelf.gain.setTargetAtTime(2, now, 0.02);   // reforça low-end
          this.presenceShelf.gain.setTargetAtTime(0, now, 0.02);
        }
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
      this.inputGain.disconnect();
      this.hpFilter.disconnect();
      this.bassShelf.disconnect();
      this.clipper.disconnect();
      this.toneFilter.disconnect();
      this.presenceShelf.disconnect();
      this.antiAliasLPF.disconnect();
      this.dcBlocker.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FulltoneOCDEffect;
