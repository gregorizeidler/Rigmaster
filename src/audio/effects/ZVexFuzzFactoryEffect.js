import BaseEffect from './BaseEffect';

/**
 * ZVexFuzzFactoryEffect (turbo)
 * 
 * Z.Vex Fuzz Factory com:
 *  - Real feedback loop (DelayNode curto) para auto-oscilação segura
 *  - SAFE mode (limitador) para evitar estouro de volume
 *  - Tone tilt (balança graves/agudos num único knob)
 *  - DC blocker e noise gate sutil
 *  - Oscilador auxiliar para instabilidade controlada
 *  - Noise injection para "acender" oscilação
 *
 * Params aceitos:
 *   drive, gate, comp, stab, tone, volume, safe, mix
 */
class ZVexFuzzFactoryEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzz Factory', 'zvexfuzzfactory');

    // ===== Entrada e pre-shape =====
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 5.0; // quente, como o pedal real

    // Gate/Bias: HPF ressonante que define o ponto de "abre/fecha"
    this.biasFilter = audioContext.createBiquadFilter();
    this.biasFilter.type = 'highpass';
    this.biasFilter.frequency.value = 100;
    this.biasFilter.Q.value = 5.0;

    // Clipper FUZZ (brutal, mas com joelho controlável)
    this.fuzzClip = audioContext.createWaveShaper();
    this.fuzzClip.oversample = '4x';
    this.fuzzClip.curve = this.makeFuzzFactoryCurve(50);

    // ===== Tone tilt (um knob balanceando low/high) =====
    this.toneLow = audioContext.createBiquadFilter();
    this.toneLow.type = 'lowshelf';
    this.toneLow.frequency.value = 300;
    this.toneLow.gain.value = 0;

    this.toneHigh = audioContext.createBiquadFilter();
    this.toneHigh.type = 'highshelf';
    this.toneHigh.frequency.value = 2000;
    this.toneHigh.gain.value = 0;

    // DC blocker / "anti-pum"
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // Pós volume
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.2;

    // ===== SAFE MODE: limitador suave =====
    this.limiter = audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -6; // ceiling
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.08;
    this.safeEnabled = true;

    // ===== Auto-oscillation feedback (sem loops ilegais) =====
    this.fbDelay = audioContext.createDelay(0.02); // 20ms máx
    this.fbDelay.delayTime.value = 0.002;          // bem curtinho
    this.fbGain = audioContext.createGain();
    this.fbGain.gain.value = 0.0;                  // controlado por 'stab'
    // noise sutil para "acender" a oscilação quando o gate fecha
    this.noise = this.makeNoiseNode(audioContext);
    this.noiseGain = audioContext.createGain();
    this.noiseGain.gain.value = 0.0; // liga via 'stab' também

    // ===== Cadeia principal =====
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.biasFilter);
    this.biasFilter.connect(this.fuzzClip);

    // Tone / saída
    this.fuzzClip.connect(this.toneLow);
    this.toneLow.connect(this.toneHigh);
    this.toneHigh.connect(this.dcBlock);
    this.dcBlock.connect(this.outputGain);

    // SAFE on/off (roteamento flexível)
    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.wetGain);
    this.outputGain.connect(this.wetGain); // mantemos ambos e comutamos ganho

    // Dry blend do BaseEffect
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Saída final
    this.wetGain.connect(this.output);

    // ===== Feedback path =====
    // output → fbDelay → fbGain → biasFilter (volta pro início do fuzz)
    this.outputGain.connect(this.fbDelay);
    this.fbDelay.connect(this.fbGain);
    this.fbGain.connect(this.biasFilter);

    // Noise → fbGain (entra no loop quando precisa instabilizar)
    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.fbGain);

    // ===== Oscilador auxiliar (opcional) =====
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 100;
    this.oscGain = audioContext.createGain();
    this.oscGain.gain.value = 0.0;
    this.oscillator.connect(this.oscGain);
    this.oscGain.connect(this.outputGain);
    this.oscillator.start();

    // Estado inicial
    this._safeRoute(true);
    
    // Inicializa params para UI
    this.params = {
      drive: 50,
      gate: 50,
      comp: 50,
      stab: 50,
      volume: 70
    };
  }

  // ===== util: ruído branco contínuo =====
  makeNoiseNode(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    src.start();
    return src;
  }

  // Curva agressiva com "granulação" e pequeno ruído harmônico
  makeFuzzFactoryCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + amount / 10;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;

      let y = x * drive;

      // hard clip assimétrico com compressão no meio
      if (y > 0.5)       y = 0.5 + (y - 0.5) * 0.05;
      else if (y < -0.5) y = -0.5 + (y + 0.5) * 0.05;
      else               y = Math.tanh(y * 1.8);

      // harmônicos ásperos
      y += 0.2 * Math.tanh(x * drive * 5);
      y += 0.15 * Math.tanh(x * drive * 10);

      // micro-dente de serra (granulação)
      y += 0.03 * Math.sin(i * 0.75);

      curve[i] = y * 0.72;
    }
    return curve;
  }

  // liga/desliga SAFE (faz o caminho do limitador "valer" ou ficar bypassado)
  _safeRoute(enabled) {
    this.safeEnabled = enabled;
    const now = this.audioContext.currentTime;
    if (enabled) {
      // passa limitter e corta o caminho direto
      this.limiter.threshold.setTargetAtTime(-6, now, 0.01);
      this.wetGain.gain.setTargetAtTime(1, now, 0.01);
    } else {
      // alivía limitter (quase bypass) — mantemos roteado por segurança
      this.limiter.threshold.setTargetAtTime(0, now, 0.01);
      this.wetGain.gain.setTargetAtTime(1, now, 0.01);
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'drive': {
        // "Drive" clássico do FF: mais ganho e curva mais feroz
        this.fuzzClip.curve = this.makeFuzzFactoryCurve(value);
        this.inputGain.gain.setTargetAtTime(3 + value / 25, now, 0.01);
        break;
      }

      case 'gate': {
        // define fechamento: freq/Q mais altos = mais gating/estalo
        const f = 50 + value * 5; // ~50–550 Hz
        const q = 1 + value / 12; // mais alto = mais travado/ressonante
        this.biasFilter.frequency.setTargetAtTime(f, now, 0.01);
        this.biasFilter.Q.setTargetAtTime(q, now, 0.01);
        break;
      }

      case 'comp': {
        // "Comp" do FF lida basicamente com nível/compressão sentida
        // aqui: ajusta o ganho de saída de forma inversa
        this.outputGain.gain.setTargetAtTime(0.1 + (100 - value) / 250, now, 0.01);
        break;
      }

      case 'stab': {
        // estabilidade = quão perto do auto-oscilo (feedback + delay + noise)
        // 0  → muito instável (mais feedback + noise)
        // 100→ super estável (menos feedback, sem noise)
        const inv = (100 - value) / 100; // 0..1
        this.fbGain.gain.setTargetAtTime(inv * 0.6, now, 0.01);     // feedback máximo ~0.6
        this.fbDelay.delayTime.setTargetAtTime(0.001 + inv * 0.006, now, 0.01);
        this.noiseGain.gain.setTargetAtTime(inv * 0.02, now, 0.05); // injeta só um "cheiro" de ruído
        // oscilador auxiliar: mistura leve quando instável
        this.oscGain.gain.setTargetAtTime(inv * 0.08, now, 0.02);
        // também move a freq do oscilador
        this.oscillator.frequency.setTargetAtTime(50 + value * 3, now, 0.02);
        break;
      }

      case 'tone': {
        // tilt: -100 = mais graves | +100 = mais agudos
        const t = (value - 50) / 50; // -1..+1
        this.toneLow.gain.setTargetAtTime(6 * Math.max(0, -t), now, 0.02);
        this.toneHigh.gain.setTargetAtTime(6 * Math.max(0, t), now, 0.02);
        break;
      }

      case 'volume': {
        this.outputGain.gain.setTargetAtTime(value / 150, now, 0.01);
        break;
      }

      case 'safe': {
        this._safeRoute(!!value);
        break;
      }

      case 'mix': {
        this.updateMix(value);
        break;
      }

      default:
        super.updateParameter?.(parameter, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.biasFilter.disconnect();
      this.fuzzClip.disconnect();
      this.toneLow.disconnect();
      this.toneHigh.disconnect();
      this.dcBlock.disconnect();
      this.outputGain.disconnect();
      this.limiter.disconnect();
      this.fbDelay.disconnect();
      this.fbGain.disconnect();
      this.noiseGain.disconnect();
      this.oscGain.disconnect();
      if (this.oscillator) this.oscillator.stop();
      if (this.noise) this.noise.stop();
    } catch (e) {}
  }
}

export default ZVexFuzzFactoryEffect;
