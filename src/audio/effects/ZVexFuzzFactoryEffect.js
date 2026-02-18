import BaseEffect from './BaseEffect';

/**
 * ZVexFuzzFactoryEffect (turbo)
 * 
 * Z.Vex Fuzz Factory com:
 *  - Real feedback loop (DelayNode curto) para auto-oscilação segura
 *  - SAFE mode (limitador) para evitar estouro de volume
 *  - Tone tilt (balança graves/agudos num único knob)
 *  - DC blocker (gate = HPF ressonante de bias, não noise gate)
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

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

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

    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    this.compGain = audioContext.createGain();
    this.compGain.gain.value = 0.65;

    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.5;

    this.limiter = audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.08;

    this.directSend = audioContext.createGain();
    this.limitedSend = audioContext.createGain();
    this.directSend.gain.value = 0;
    this.limitedSend.gain.value = 1;
    this.wetBus = audioContext.createGain();
    this.wetBus.gain.value = 1;
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
    this.biasFilter.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.fuzzClip);

    this.fuzzClip.connect(this.toneLow);
    this.toneLow.connect(this.toneHigh);
    this.toneHigh.connect(this.dcBlock);
    this.dcBlock.connect(this.compGain);
    this.compGain.connect(this.outputGain);

    this.outputGain.connect(this.directSend);
    this.outputGain.connect(this.limiter);
    this.limiter.connect(this.limitedSend);
    this.directSend.connect(this.wetBus);
    this.limitedSend.connect(this.wetBus);
    this.wetBus.connect(this.wetGain);

    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    this.outputGain.connect(this.fbDelay);
    this.fbDelay.connect(this.fbGain);

    this.fbHPF = audioContext.createBiquadFilter();
    this.fbHPF.type = 'highpass';
    this.fbHPF.frequency.value = 30;
    this.fbHPF.Q.value = 0.707;
    this.fbLPF = audioContext.createBiquadFilter();
    this.fbLPF.type = 'lowpass';
    this.fbLPF.frequency.value = 8000;
    this.fbLPF.Q.value = 0.707;
    this.fbGain.connect(this.fbHPF);
    this.fbHPF.connect(this.fbLPF);
    this.fbLPF.connect(this.biasFilter);

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

    this.params = {
      drive: 50,
      gate: 50,
      comp: 50,
      stab: 50,
      tone: 50,
      volume: 70,
      safe: 1,
      mix: 100
    };
    this.compGain.gain.value = 0.3 + (this.params.comp / 100) * 0.7;
    this.outputGain.gain.value = Math.min(0.9, 0.05 + (this.params.volume / 100) * 0.85);
    this._safeRoute(true);
    this.updateMix(100);
  }

  updateMix(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    if (this.params) this.params.mix = v;
    if (typeof this.setMix === 'function') this.setMix(v / 100);
    else {
      const w = v / 100;
      this._currentWetLevel = w;
      this._currentDryLevel = 1 - w;
      const now = this.audioContext.currentTime;
      this.wetGain.gain.setTargetAtTime(w, now, 0.02);
      this.dryGain.gain.setTargetAtTime(1 - w, now, 0.02);
    }
  }

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

  // makeNoiseNode: BufferSource is one-shot; effect instance is assumed recreated when re-added

  makeFuzzFactoryCurve(amount) {
    const samples = 16384;
    const curve = new Float32Array(samples);
    const amt = Math.max(0, Math.min(100, amount));
    const drive = 1 + amt / 10;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      let y = x * drive;

      if (y > 0.5)       y = 0.5 + (y - 0.5) * 0.05;
      else if (y < -0.5) y = -0.5 + (y + 0.5) * 0.05;
      else               y = Math.tanh(y * 1.8);

      y += 0.2 * Math.tanh(x * drive * 5);
      y += 0.15 * Math.tanh(x * drive * 10);
      y += 0.02 * Math.tanh(x * 6);

      curve[i] = Math.max(-1, Math.min(1, y * 0.72));
    }
    return curve;
  }

  _safeRoute(enabled) {
    this.safeEnabled = !!enabled;
    const now = this.audioContext.currentTime;
    if (this.safeEnabled) {
      this.directSend.gain.setTargetAtTime(0, now, 0.01);
      this.limitedSend.gain.setTargetAtTime(1, now, 0.01);
    } else {
      this.directSend.gain.setTargetAtTime(1, now, 0.01);
      this.limitedSend.gain.setTargetAtTime(0.25, now, 0.01);
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'drive': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.drive = v;
        this.fuzzClip.curve = this.makeFuzzFactoryCurve(v);
        this.inputGain.gain.setTargetAtTime(3 + v / 25, now, 0.01);
        break;
      }

      case 'gate': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.gate = v;
        const f = 50 + v * 5;
        const q = 1 + v / 12;
        this.biasFilter.frequency.setTargetAtTime(f, now, 0.01);
        this.biasFilter.Q.setTargetAtTime(q, now, 0.01);
        break;
      }

      case 'comp': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.comp = v;
        this.compGain.gain.setTargetAtTime(0.3 + (v / 100) * 0.7, now, 0.01);
        break;
      }

      case 'stab': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.stab = v;
        const inv = (100 - v) / 100;
        this.fbGain.gain.setTargetAtTime(inv * 0.6, now, 0.01);
        this.fbDelay.delayTime.setTargetAtTime(0.001 + inv * 0.006, now, 0.01);
        this.noiseGain.gain.setTargetAtTime(inv * 0.02, now, 0.05);
        this.oscGain.gain.setTargetAtTime(inv * 0.08, now, 0.02);
        this.oscillator.frequency.setTargetAtTime(50 + (100 - v) * 3, now, 0.02);
        break;
      }

      case 'tone': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.tone = v;
        const t = (v - 50) / 50;
        this.toneLow.gain.setTargetAtTime(6 * Math.max(0, -t), now, 0.02);
        this.toneHigh.gain.setTargetAtTime(6 * Math.max(0, t), now, 0.02);
        break;
      }

      case 'volume': {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.params) this.params.volume = v;
        this.outputGain.gain.setTargetAtTime(Math.min(0.9, 0.05 + (v / 100) * 0.85), now, 0.01);
        break;
      }

      case 'safe': {
        const on = !!value;
        if (this.params) this.params.safe = on ? 1 : 0;
        this._safeRoute(on);
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
      this.antiAliasLPF.disconnect();
      this.fuzzClip.disconnect();
      this.toneLow.disconnect();
      this.toneHigh.disconnect();
      this.dcBlock.disconnect();
      this.compGain.disconnect();
      this.outputGain.disconnect();
      this.directSend.disconnect();
      this.limiter.disconnect();
      this.limitedSend.disconnect();
      this.wetBus.disconnect();
      this.fbDelay.disconnect();
      this.fbGain.disconnect();
      this.fbHPF.disconnect();
      this.fbLPF.disconnect();
      this.noiseGain.disconnect();
      this.oscGain.disconnect();
      if (this.oscillator) this.oscillator.stop();
      if (this.noise) this.noise.stop();
    } catch (e) {}
  }
}

export default ZVexFuzzFactoryEffect;
