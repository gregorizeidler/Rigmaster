import BaseEffect from './BaseEffect';

/**
 * FuzzFaceEffect (turbo)
 * 
 * Dallas Arbiter Fuzz Face com germanium transistors:
 *  - Bias control (Q2 ~4.5–5.0V) para assimetria/gating/"spit"
 *  - Bass control (input cap) corta graves antes do fuzz
 *  - Tone control (LPF pós-fuzz) abre/fecha brilho
 *  - Cleanup real reage ao volume da guitarra
 *  - DC blocker + headroom saudável
 *  - Even harmonics típicos de germanium
 *
 * Params aceitos:
 *   fuzz, bias, bass, tone, volume, mix
 */
class FuzzFaceEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fuzz Face', 'fuzzface');

    // ===== Entrada / "impedância" e bass roll-off =====
    this.inputPad = audioContext.createGain();
    this.inputPad.gain.value = 1.0;

    this.inputHPF = audioContext.createBiquadFilter(); // "input cap" virtual
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 120; // ajustável via 'bass'
    this.inputHPF.Q.value = 0.707;

    // Pré-ênfase leve que reage ao nível de entrada (cleanup com volume da guitarra)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'highshelf';
    this.preEmphasis.frequency.value = 1400;
    this.preEmphasis.gain.value = 1.5;

    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // ===== Clipper germanium com bias/asym =====
    this.fuzzClip = audioContext.createWaveShaper();
    this.fuzzClip.oversample = '4x';
    this.bias = 50; // 0–100
    this.fuzzAmount = 50; // 0–100
    this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);

    // ===== Pós-filtro / tone =====
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 6000; // ajustável via 'tone'
    this.outputLPF.Q.value = 0.707;

    // DC blocker para evitar offset depois do fuzz
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;

    // ===== Saída =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.35;

    // ===== Cadeia =====
    this.input.connect(this.inputPad);
    this.inputPad.connect(this.inputHPF);
    this.inputHPF.connect(this.preEmphasis);
    this.preEmphasis.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.fuzzClip);
    this.fuzzClip.connect(this.outputLPF);
    this.outputLPF.connect(this.dcBlock);
    this.dcBlock.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry para blend global do BaseEffect
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Inicializa params para UI
    this.params = {
      fuzz: 50,
      bias: 50,
      volume: 70
    };
  }

  // Curva germanium com joelho suave + assimetria controlada pelo 'bias'
  makeFuzzFaceCurve(amount = 50, bias = 50) {
    const samples = 65536;
    const curve = new Float32Array(samples);

    // drive global
    const drive = 1 + amount / 18; // ~1–6.5

    // bias: 0 = gating pesado; 50 = clássico; 100 = mais simétrico/aberto
    const asym = (bias - 50) / 100; // -0.5..+0.5
    const vtPos = 0.22 - asym * 0.06; // limiar + (germanium ~0.2V)
    const vtNeg = 0.22 + asym * 0.06; // limiar - (move ao contrário)
    const knee = 0.22;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * drive;

      // clipping assimétrico com joelho suave
      if (y > vtPos) {
        const over = y - vtPos;
        y = vtPos + Math.tanh(over / knee) * knee;
      } else if (y < -vtNeg) {
        const under = y + vtNeg;
        y = -vtNeg + Math.tanh(under / knee) * knee;
      }

      // compressão "transistor" + paridade (even harm) do germanium
      y = Math.tanh(y * 2.0);
      y += 0.12 * Math.tanh(x * drive * 1.6); // even harmonics

      // toque/cleanup: reduz ganho relativo nos picos (dinâmica)
      const dyn = 1 - Math.min(0.25, Math.abs(x) * 0.22);
      y *= dyn;

      curve[i] = y * 0.9;
    }
    return curve;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    if (this.params) {
      this.params[parameter] = value;
    }

    switch (parameter) {
      case 'fuzz':
        this.fuzzAmount = value;
        this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);
        // ganho de entrada também sobe, mas com curva suave (sente "sustentar")
        this.inputPad.gain.setTargetAtTime(1.2 + value / 60, now, 0.015);
        break;

      case 'bias':
        this.bias = value;
        this.fuzzClip.curve = this.makeFuzzFaceCurve(this.fuzzAmount, this.bias);
        break;

      case 'bass':
        // 40–200 Hz útil para segurar embolo
        const fBass = 40 + (value / 100) * 200;
        this.inputHPF.frequency.setTargetAtTime(fBass, now, 0.02);
        break;

      case 'tone':
        // 2 kHz (fechado) a 9 kHz (aberto)
        const fTone = 2000 + (value / 100) * 7000;
        this.outputLPF.frequency.setTargetAtTime(fTone, now, 0.02);
        break;

      case 'volume':
        // headroom alto para empurrar amp
        this.outputGain.gain.setTargetAtTime(value / 120, now, 0.01);
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
      this.inputPad.disconnect();
      this.inputHPF.disconnect();
      this.preEmphasis.disconnect();
      this.antiAliasLPF.disconnect();
      this.fuzzClip.disconnect();
      this.outputLPF.disconnect();
      this.dcBlock.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default FuzzFaceEffect;
