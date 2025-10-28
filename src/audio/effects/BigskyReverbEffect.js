import BaseEffect from './BaseEffect';

/**
 * Strymon BigSky (WebAudio-inspired)
 * Revisões:
 * - Schroeder Allpass correto (estável)
 * - Mix inicial definido
 * - Shimmer feedback limitado
 * - Envelope follower p/ Nonlinear (gate/reverse)
 * - Clamps de segurança
 */
class BigskyReverbEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bigsky Reverb', 'bigskyreverb');

    // ====== TIPOS ======
    this.reverbTypes = {
      room: 'Room', hall: 'Hall', plate: 'Plate', spring: 'Spring',
      swell: 'Swell', bloom: 'Bloom', cloud: 'Cloud', chorale: 'Chorale',
      magneto: 'Magneto', nonlinear: 'Nonlinear', reflections: 'Reflections',
      shimmer: 'Shimmer'
    };
    this.currentType = 'hall';

    // ====== PRE-DELAY ======
    this.preDelay = audioContext.createDelay(2.0);
    this.preDelay.delayTime.value = 0.02;

    // ====== TONE SHAPING ======
    this.lowCut = audioContext.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.lowCut.frequency.value = 80;
    this.lowCut.Q.value = 0.707;

    this.highCut = audioContext.createBiquadFilter();
    this.highCut.type = 'lowpass';
    this.highCut.frequency.value = 10000;
    this.highCut.Q.value = 0.707;

    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 5000;
    this.dampingFilter.Q.value = 0.707;

    // ====== COMB FILTER BANK (12 paralelos) ======
    this.combDelays = [0.0297,0.0371,0.0411,0.0437,0.0503,0.0571,0.0617,0.0683,0.0751,0.0827,0.0893,0.0971];
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 12; i++) {
      const delay = audioContext.createDelay(10.0);
      delay.delayTime.value = this.combDelays[i];
      const fb = audioContext.createGain();
      fb.gain.value = 0.84;
      const damp = audioContext.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 5000;
      const tap = audioContext.createGain();
      tap.gain.value = 1/12;
      // loop: in -> delay -> damp -> fb -> back to delay
      this.combFilters.push({ delay, fb, damp, dampFilter: damp });
      this.combGains.push(tap);
    }

    // ====== ALLPASS (8 em série, Schroeder correto) ======
    this.allpass = [];
    const apTimes = [0.0051,0.0067,0.0083,0.0097,0.0113,0.0131,0.0149,0.0167];
    for (let i = 0; i < 8; i++) {
      this.allpass.push(this.makeSchroederAllpass(audioContext, apTimes[i], 0.7));
    }

    // ====== MODULAÇÃO ======
    this.modLFO1 = audioContext.createOscillator();
    this.modLFO2 = audioContext.createOscillator();
    this.modDepth1 = audioContext.createGain();
    this.modDepth2 = audioContext.createGain();
    this.modLFO1.type = 'sine'; this.modLFO2.type = 'triangle';
    this.modLFO1.frequency.value = 0.3;
    this.modLFO2.frequency.value = 0.5;
    this.modDepth1.gain.value = 0;
    this.modDepth2.gain.value = 0;
    this.modLFO1.start(); this.modLFO2.start();

    // ====== EARLY REFLECTIONS ======
    this.earlyReflections = [];
    const earlyTimes = [0.019,0.029,0.043,0.059,0.071,0.089];
    const earlyGains = [0.8,0.7,0.6,0.5,0.4,0.3];
    for (let i = 0; i < 6; i++) {
      const d = audioContext.createDelay(0.1);
      d.delayTime.value = earlyTimes[i];
      const g = audioContext.createGain();
      g.gain.value = earlyGains[i];
      this.earlyReflections.push({ d, g });
    }

    // ====== SHIMMER / CHORALE ======
    this.shimmerDelay1 = audioContext.createDelay(0.1); this.shimmerDelay1.delayTime.value = 0.012;
    this.shimmerDelay2 = audioContext.createDelay(0.1); this.shimmerDelay2.delayTime.value = 0.019;
    this.shimmerDelay3 = audioContext.createDelay(0.1); this.shimmerDelay3.delayTime.value = 0.024;
    this.shimmerGain1 = audioContext.createGain(); this.shimmerGain1.gain.value = 0;
    this.shimmerGain2 = audioContext.createGain(); this.shimmerGain2.gain.value = 0;
    this.shimmerGain3 = audioContext.createGain(); this.shimmerGain3.gain.value = 0;
    this.shimmerMixer = audioContext.createGain(); this.shimmerMixer.gain.value = 0;
    // **feedback limitado** p/ estabilidade
    this.shimmerFeedback = audioContext.createGain(); this.shimmerFeedback.gain.value = 0.35;

    // ====== CLOUD / GRANULAR ======
    this.cloudGranularDelays = [];
    this.cloudGranularGains = [];
    for (let i = 0; i < 8; i++) {
      const d = audioContext.createDelay(1.0);
      d.delayTime.value = 0.05 + Math.random()*0.3;
      const g = audioContext.createGain();
      g.gain.value = 0.125;
      this.cloudGranularDelays.push(d);
      this.cloudGranularGains.push(g);
    }
    this.cloudMixer = audioContext.createGain(); this.cloudMixer.gain.value = 0;

    // ====== NONLINEAR (Gate/Reverse) – envelope follower ======
    this.gateEnvelope = audioContext.createGain(); // VCA do rabo da reverb
    this.gateEnvelope.gain.value = 1.0;
    // detector: retificador -> LPF (ataque/release) -> escala
    this.detRect = this.makeRectifier(audioContext);
    this.detLPF = audioContext.createBiquadFilter();
    this.detLPF.type = 'lowpass'; this.detLPF.frequency.value = 15; // smoothing
    this.detGain = audioContext.createGain(); this.detGain.gain.value = 1.5; // sensibilidade
    // det -> gate control
    this.detGain.connect(this.gateEnvelope.gain);

    // ====== MIXERS / STEREO ======
    this.combMixer = audioContext.createGain();
    this.earlyMixer = audioContext.createGain();
    this.lateMixer  = audioContext.createGain(); this.lateMixer.gain.value = 1.0;
    this.diffusionGain = audioContext.createGain(); this.diffusionGain.gain.value = 0.8;

    this.reverbMix = audioContext.createGain();
    this.reverbMix.gain.value = 1.0;

    this.splitter = audioContext.createChannelSplitter(2);
    this.merger   = audioContext.createChannelMerger(2);
    this.stereoL  = audioContext.createGain(); this.stereoR = audioContext.createGain();
    this.stereoL.gain.value = 1.0; this.stereoR.gain.value = 1.0;

    this.outputGain = audioContext.createGain(); this.outputGain.gain.value = 1.0;

    // ====== Rotas ======
    this.setupRouting();

    // ====== Estado inicial seguro ======
    this.mix = 0.5; // evita NaN em getParameters()
    this.updateMix(50);
    this.setReverbType(this.currentType);
  }

  // ---------- NODES AUX ----------

  makeSchroederAllpass(ctx, time, g = 0.7) {
    // Topologia:
    // s1 = input + (feedback * apOut*g)
    // delay -> dOut
    // apOut = (-g * input) + dOut
    const input = ctx.createGain();
    const delay = ctx.createDelay(0.2); delay.delayTime.value = time;
    const ff = ctx.createGain(); ff.gain.value = -g;     // feedforward -g
    const fb = ctx.createGain(); fb.gain.value = g;      // feedback +g
    const sum1 = ctx.createGain();                       // s1
    const apOut = ctx.createGain();                      // allpass out (soma final)

    // s1 = in + fb
    input.connect(sum1);
    fb.connect(sum1);

    // delay path
    sum1.connect(delay);
    delay.connect(apOut);            // dOut -> apOut
    input.connect(ff);
    ff.connect(apOut);               // (-g * in) + dOut

    // feedback: apOut*g -> fb -> s1
    apOut.connect(fb);

    return { input, output: apOut, delay, ff, fb, sum1, apOut };
  }

  makeRectifier(ctx) {
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) {
      const x = (i - 32768) / 32768;
      curve[i] = Math.abs(x);
    }
    shaper.curve = curve; shaper.oversample = '2x';
    return shaper;
  }

  // ---------- ROUTING ----------

  setupRouting() {
    // In -> predelay -> lowcut
    this.input.connect(this.preDelay);
    this.preDelay.connect(this.lowCut);

    // Early reflections
    for (const { d, g } of this.earlyReflections) {
      this.lowCut.connect(d);
      d.connect(g);
      g.connect(this.earlyMixer);
    }

    // Comb bank
    for (let i = 0; i < this.combFilters.length; i++) {
      const { delay, fb, damp } = this.combFilters[i];
      const tap = this.combGains[i];
      this.lowCut.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);      // feedback loop
      delay.connect(tap);
      tap.connect(this.combMixer);
    }

    // Allpass série
    let apIn = this.combMixer;
    for (const ap of this.allpass) {
      apIn.connect(ap.input);
      apIn = ap.output;
    }
    apIn.connect(this.diffusionGain);
    this.diffusionGain.connect(this.dampingFilter);
    this.dampingFilter.connect(this.highCut);
    this.highCut.connect(this.lateMixer);

    // Detector (para nonlinear): pegue o sinal "late"
    // late -> retificador -> LPF -> ganho -> gateEnvelope.gain
    this.lateMixer.connect(this.detRect);
    this.detRect.connect(this.detLPF);
    this.detLPF.connect(this.detGain);

    // Shimmer (alimentado do late, com feedback de volta ao início, limitado)
    this.lateMixer.connect(this.shimmerDelay1);
    this.shimmerDelay1.connect(this.shimmerGain1);
    this.shimmerGain1.connect(this.shimmerMixer);

    this.lateMixer.connect(this.shimmerDelay2);
    this.shimmerDelay2.connect(this.shimmerGain2);
    this.shimmerGain2.connect(this.shimmerMixer);

    this.lateMixer.connect(this.shimmerDelay3);
    this.shimmerDelay3.connect(this.shimmerGain3);
    this.shimmerGain3.connect(this.shimmerMixer);

    // feedback shimmer -> lowCut (entrada da malha) com teto
    this.shimmerMixer.connect(this.shimmerFeedback);
    this.shimmerFeedback.connect(this.lowCut);

    // Cloud / granular
    for (let i = 0; i < 8; i++) {
      this.lowCut.connect(this.cloudGranularDelays[i]);
      this.cloudGranularDelays[i].connect(this.cloudGranularGains[i]);
      this.cloudGranularGains[i].connect(this.cloudMixer);
    }

    // Gate envelope VCA aplicado ao late
    this.lateMixer.connect(this.gateEnvelope);

    // Mix das branches
    this.earlyMixer.connect(this.reverbMix);
    this.gateEnvelope.connect(this.reverbMix);
    this.cloudMixer.connect(this.reverbMix);
    this.shimmerMixer.connect(this.reverbMix);

    // Stereo spread
    this.reverbMix.connect(this.splitter);
    this.splitter.connect(this.stereoL, 0);
    this.splitter.connect(this.stereoR, 1);
    this.stereoL.connect(this.merger, 0, 0);
    this.stereoR.connect(this.merger, 0, 1);

    // Out
    this.merger.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Modulação em alguns delays de comb (sutil)
    this.modLFO1.connect(this.modDepth1);
    this.modLFO2.connect(this.modDepth2);
    this.modDepth1.connect(this.combFilters[0].delay.delayTime);
    this.modDepth1.connect(this.combFilters[2].delay.delayTime);
    this.modDepth2.connect(this.combFilters[1].delay.delayTime);
    this.modDepth2.connect(this.combFilters[3].delay.delayTime);
  }

  // ---------- CONTROLES ----------

  setReverbType(type) {
    const now = this.audioContext.currentTime;
    this.currentType = type;

    // zera ganhos de branches "extras"
    this.earlyMixer.gain.setTargetAtTime(0, now, 0.01);
    this.cloudMixer.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerMixer.gain.setTargetAtTime(0, now, 0.01);
    this.lateMixer.gain.setTargetAtTime(1, now, 0.01);

    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain3.gain.setTargetAtTime(0, now, 0.01);

    this.gateEnvelope.gain.setTargetAtTime(1, now, 0.01);
    this.detLPF.frequency.setTargetAtTime(15, now, 0.01);

    const setComb = v => this.setCombFeedback(v);

    switch (type) {
      case 'room':
        setComb(0.70); this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.6, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.6, now, 0.01);
        break;
      case 'hall':
        setComb(0.88); this.dampingFilter.frequency.setTargetAtTime(4500, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.85, now, 0.01);
        this.earlyMixer.gain.setTargetAtTime(0.2, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.8, now, 0.01);
        break;
      case 'plate':
        setComb(0.85); this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.9, now, 0.01);
        this.modDepth1.gain.value = 0.0003; this.modDepth2.gain.value = 0.0003;
        break;
      case 'spring':
        setComb(0.75); this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.4, now, 0.01);
        this.modDepth1.gain.value = 0.001; this.modDepth2.gain.value = 0.001;
        this.highCut.frequency.setTargetAtTime(6000, now, 0.01);
        break;
      case 'swell':
        setComb(0.92); this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        // swell control via envelope: aumentar LPF do detector p/ ataque mais lento
        this.detLPF.frequency.setTargetAtTime(5, now, 0.01);
        break;
      case 'bloom':
        setComb(0.95); this.dampingFilter.frequency.setTargetAtTime(4000, now, 0.01);
        this.diffusionGain.gain.setTargetAtTime(0.95, now, 0.01);
        break;
      case 'cloud':
        setComb(0.90); this.cloudMixer.gain.setTargetAtTime(0.7, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.3, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        break;
      case 'chorale':
        setComb(0.88);
        this.shimmerGain1.gain.setTargetAtTime(0.3, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.2, now, 0.01);
        this.shimmerMixer.gain.setTargetAtTime(0.5, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.5, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(7000, now, 0.01);
        break;
      case 'magneto':
        setComb(0.82); this.dampingFilter.frequency.setTargetAtTime(3500, now, 0.01);
        this.modDepth1.gain.value = 0.002; this.modDepth2.gain.value = 0.002;
        this.modLFO1.frequency.setTargetAtTime(0.2, now, 0.01);
        break;
      case 'nonlinear':
        setComb(0.80); this.diffusionGain.gain.setTargetAtTime(0.7, now, 0.01);
        // Gate/Reverse: suba a sensibilidade e feche mais rápido
        this.detGain.gain.setTargetAtTime(2.0, now, 0.01);
        this.detLPF.frequency.setTargetAtTime(10, now, 0.01);
        break;
      case 'reflections':
        this.earlyMixer.gain.setTargetAtTime(1.0, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.0, now, 0.01);
        break;
      case 'shimmer':
        setComb(0.90);
        this.shimmerGain1.gain.setTargetAtTime(0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.3, now, 0.01);
        this.shimmerGain3.gain.setTargetAtTime(0.2, now, 0.01);
        this.shimmerMixer.gain.setTargetAtTime(0.6, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(0.4, now, 0.01);
        this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        break;
    }
  }

  setCombFeedback(value) {
    const now = this.audioContext.currentTime;
    // clamp pra estabilidade
    const v = Math.max(0.5, Math.min(0.98, value));
    for (let i = 0; i < this.combFilters.length; i++) {
      const variation = 1 - (i * 0.01);
      this.combFilters[i].fb.gain.setTargetAtTime(v * variation, now, 0.01);
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'decay': {
        const fb = 0.5 + (value / 100) * 0.48;
        this.setCombFeedback(fb);
        break;
      }
      case 'predelay': {
        const t = (value / 100) * 0.5;
        this.preDelay.delayTime.setTargetAtTime(t, now, 0.01);
        break;
      }
      case 'tone': {
        const f = 1000 + (value / 100) * 11000;
        this.dampingFilter.frequency.setTargetAtTime(f, now, 0.01);
        for (const c of this.combFilters) c.dampFilter.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }
      case 'mod': {
        const depth = value / 50000;
        this.modDepth1.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepth2.gain.setTargetAtTime(depth, now, 0.01);
        break;
      }
      case 'speed': {
        const rate = 0.1 + (value / 100) * 4.9;
        this.modLFO1.frequency.setTargetAtTime(rate, now, 0.01);
        this.modLFO2.frequency.setTargetAtTime(rate * 1.3, now, 0.01);
        break;
      }
      case 'diffuse': {
        const d = value / 100;
        this.diffusionGain.gain.setTargetAtTime(d, now, 0.01);
        const ap = 0.5 + (d * 0.3);
        for (const a of this.allpass) {
          a.ff.gain.setTargetAtTime(-ap, now, 0.01);
          a.fb.gain.setTargetAtTime(ap, now, 0.01);
        }
        break;
      }
      case 'lowcut': {
        const f = 20 + (value / 100) * 480;
        this.lowCut.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }
      case 'highcut': {
        const f = 2000 + (value / 100) * 18000;
        this.highCut.frequency.setTargetAtTime(f, now, 0.01);
        break;
      }
      case 'value1':
        this.value1 = value; this.updateMachineSpecificParams(); break;
      case 'value2':
        this.value2 = value; this.updateMachineSpecificParams(); break;
      case 'value3':
        this.value3 = value; this.updateMachineSpecificParams(); break;
      case 'type':
        this.setReverbType(value); break;
      case 'mix':
        this.updateMix(value); break;
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }

  updateMachineSpecificParams() {
    const now = this.audioContext.currentTime;

    switch (this.currentType) {
      case 'shimmer':
      case 'chorale': {
        const amt = this.value1 / 100;
        this.shimmerGain1.gain.setTargetAtTime(amt * 0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(amt * 0.3, now, 0.01);
        this.shimmerGain3.gain.setTargetAtTime(amt * 0.2, now, 0.01);
        const tone = 2000 + (this.value2 / 100) * 8000;
        this.highCut.frequency.setTargetAtTime(tone, now, 0.01);
        break;
      }
      case 'cloud': {
        const dens = Math.floor((this.value1 / 100) * 8);
        for (let i = 0; i < 8; i++) {
          this.cloudGranularGains[i].gain.setTargetAtTime(i < dens ? 0.125 : 0, now, 0.01);
        }
        const size = 0.02 + (this.value2 / 100) * 0.3;
        for (let i = 0; i < 8; i++) {
          this.cloudGranularDelays[i].delayTime.setTargetAtTime(size + (Math.random()*0.05), now, 0.01);
        }
        break;
      }
      case 'nonlinear': {
        // Value1 = sensibilidade do gate
        const sens = 1.0 + (this.value1 / 100) * 2.0; // 1..3
        this.detGain.gain.setTargetAtTime(sens, now, 0.05);
        // Value2 = "reverse feel": baixa LPF do detector para ataque mais lento
        const lpf = 6 + (1 - this.value2/100) * 14; // 6..20 Hz
        this.detLPF.frequency.setTargetAtTime(lpf, now, 0.05);
        break;
      }
      case 'reflections': {
        const er = this.value1 / 100;
        this.earlyMixer.gain.setTargetAtTime(er, now, 0.01);
        this.lateMixer.gain.setTargetAtTime(1 - er, now, 0.01);
        break;
      }
    }
  }

  getParameters() {
    return {
      type: this.currentType,
      predelay: (this.preDelay.delayTime.value / 0.5) * 100,
      tone: ((this.dampingFilter.frequency.value - 1000) / 11000) * 100,
      mod: this.modDepth1.gain.value * 50000,
      speed: ((this.modLFO1.frequency.value - 0.1) / 4.9) * 100,
      diffuse: this.diffusionGain.gain.value * 100,
      lowcut: ((this.lowCut.frequency.value - 20) / 480) * 100,
      highcut: ((this.highCut.frequency.value - 2000) / 18000) * 100,
      mix: (this.mix ?? 0.5) * 100,
      value1: this.value1 ?? 50,
      value2: this.value2 ?? 50,
      value3: this.value3 ?? 50
    };
  }

  updateMix(value) {
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }

  disconnect() {
    super.disconnect();
    try {
      for (const c of this.combFilters) { c.delay.disconnect(); c.fb.disconnect(); c.damp.disconnect(); }
      for (const ap of this.allpass) { ap.input.disconnect(); ap.output.disconnect(); ap.ff.disconnect(); ap.fb.disconnect(); ap.sum1?.disconnect?.(); }
      for (const er of this.earlyReflections) { er.d.disconnect(); er.g.disconnect(); }
      for (let i = 0; i < 8; i++) { this.cloudGranularDelays[i].disconnect(); this.cloudGranularGains[i].disconnect(); }
      this.shimmerDelay1.disconnect(); this.shimmerDelay2.disconnect(); this.shimmerDelay3.disconnect();
      this.shimmerGain1.disconnect(); this.shimmerGain2.disconnect(); this.shimmerGain3.disconnect();
      this.shimmerFeedback.disconnect(); this.shimmerMixer.disconnect();

      this.modLFO1.stop(); this.modLFO1.disconnect();
      this.modLFO2.stop(); this.modLFO2.disconnect();
      this.modDepth1.disconnect(); this.modDepth2.disconnect();

      this.preDelay.disconnect(); this.lowCut.disconnect(); this.highCut.disconnect(); this.dampingFilter.disconnect();
      this.combMixer.disconnect(); this.earlyMixer.disconnect(); this.lateMixer.disconnect(); this.diffusionGain.disconnect();
      this.reverbMix.disconnect(); this.splitter.disconnect(); this.stereoL.disconnect(); this.stereoR.disconnect(); this.merger.disconnect();
      this.outputGain.disconnect();

      this.detRect.disconnect(); this.detLPF.disconnect(); this.detGain.disconnect(); this.gateEnvelope.disconnect();
    } catch (e) {
      console.warn('Error disconnecting BigSky Reverb:', e);
    }
  }
}

export default BigskyReverbEffect;
