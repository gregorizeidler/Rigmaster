import BaseAmp from './BaseAmp.js';

/**
 * Vox AC30 (Top Boost) — WebAudio Amp Sim V2
 *
 * Upgrades vs. V1:
 * - Reactive SAG: envelope follower (attack/release) modulates supply headroom.
 * - Bright Cap emulation on volume (high-shelf linked to pot position).
 * - Bias Tremolo (pre-power modulation) + classic AM trem mix.
 * - Safer gain staging + anti-denormal DC offset guard.
 * - Input noise gate (transparent, optional) + soft limiter on output.
 * - Cabinet: Convolver IR (mono) OR fast IIR cab (fallback) + easy loader.
 * - Top Boost stack refined; Cut control placed pre-PI (as per AC30 behavior).
 * - Presets: Edge Chime, Brian May, Beatles Clean.
 */
class VoxAC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox AC30', 'vox_ac30');
    
    // ===================== Front End =====================
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 40; // tighten sub rumble
    this.inputHPF.Q.value = 0.707;

    // Optional noise gate (very gentle)
    this.gateDetector = this._makeRectifier();
    this.gateLP = audioContext.createBiquadFilter();
    this.gateLP.type = 'lowpass';
    this.gateLP.frequency.value = 25; // envelope smoothing
    this.gateAmount = audioContext.createGain();
    this.gateAmount.gain.value = 0; // 0..1, set via params
    this.gateVCA = audioContext.createGain();
    this.gateVCA.gain.value = 1.0;

    // Route detector to VCA.gain (inverse relation done in tick)
    this.gateDetector.connect(this.gateLP);

    // Preamp (EF86-ish) + gentle input gain
    this.preamp = audioContext.createGain();
    this.preamp.gain.value = 2.2; // default front gain

    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.curve = this._makeEF86Curve();
    this.preampSaturation.oversample = '4x';

    // Class A compressor to mimic preamp compression
    this.classA = audioContext.createDynamicsCompressor();
    this.classA.threshold.value = -24;
    this.classA.knee.value = 18;
    this.classA.ratio.value = 2.8;
    this.classA.attack.value = 0.004;
    this.classA.release.value = 0.12;

    // ============== Channels ==============
    // Normal
    this.normalVolume = audioContext.createGain();
    this.normalBrilliance = audioContext.createBiquadFilter();
    this.normalBrilliance.type = 'highshelf';
    this.normalBrilliance.frequency.value = 3200;
    this.normalBrilliance.gain.value = 0;
    
    // Top Boost
    this.topBoostVolume = audioContext.createGain();
    this.topBoostBass = audioContext.createBiquadFilter();
    this.topBoostBass.type = 'lowshelf';
    this.topBoostBass.frequency.value = 160;
    this.topBoostBass.gain.value = 2;

    this.topBoostTreble = audioContext.createBiquadFilter();
    this.topBoostTreble.type = 'peaking';
    this.topBoostTreble.frequency.value = 2500;
    this.topBoostTreble.Q.value = 0.9;
    this.topBoostTreble.gain.value = 3;

    // Bright cap emu: high-shelf whose gain decreases with volume
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 2800;
    this.brightCap.gain.value = 0; // updated by setVolumeWithBright()

    // Mid "honk" (light)
    this.midHonk = audioContext.createBiquadFilter();
    this.midHonk.type = 'peaking';
    this.midHonk.frequency.value = 1000;
    this.midHonk.Q.value = 1.4;
    this.midHonk.gain.value = 2.5;

    // Boom control between stages
    this.interstageHPF = audioContext.createBiquadFilter();
    this.interstageHPF.type = 'highpass';
    this.interstageHPF.frequency.value = 70;
    this.interstageHPF.Q.value = 0.707;

    // Cut control (low-pass pre PI/power)
    this.cutControl = audioContext.createBiquadFilter();
    this.cutControl.type = 'lowpass';
    this.cutControl.frequency.value = 9000; // start fairly open
    this.cutControl.Q.value = 0.707;
    
    // Additional top cut (power section tone)
    this.topCut = audioContext.createBiquadFilter();
    this.topCut.type = 'lowpass';
    this.topCut.frequency.value = 7500;
    this.topCut.Q.value = 0.707;

    // ============== Vibrato & Tremolo ==============
    // Vibrato (pre power) via short delay modulation
    this.vibratoDelay = audioContext.createDelay(0.02);
    this.vibratoDelay.delayTime.value = 0.005;
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 6;
    this.vibratoDepth = audioContext.createGain();
    this.vibratoDepth.gain.value = 0;
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoDelay.delayTime);
    this.vibratoLFO.start();

    // Bias tremolo (mod preamp saturation drive) + AM trem at end
    this.biasTremLFO = audioContext.createOscillator();
    this.biasTremLFO.type = 'sine';
    this.biasTremLFO.frequency.value = 4;
    this.biasTremDepth = audioContext.createGain();
    this.biasTremDepth.gain.value = 0; // set via params
    this.biasTremLFO.connect(this.biasTremDepth);
    // Will modulate power saturator gain later

    this.amTremDepth = audioContext.createGain();
    this.amTremDepth.gain.value = 0; // 0..1
    this.amTremGain = audioContext.createGain();
    this.amTremGain.gain.value = 1;
    this.biasTremLFO.start();

    // ============== SAG (Class A supply) ==============
    this.sagVCA = audioContext.createGain();
    this.sagVCA.gain.value = 1.0;
    this.sagDetector = this._makeRectifier();
    this.sagLP = audioContext.createBiquadFilter();
    this.sagLP.type = 'lowpass';
    this.sagLP.frequency.value = 12; // slow-ish supply response
    this.sagAmount = 0.08; // depth, set in params

    // ============== Power Amp & Chime ==============
    this.powerAmp = audioContext.createGain();
    this.powerAmp.gain.value = 1.0;

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this._makeEL84Curve();
    this.powerSaturation.oversample = '4x';
    
    // Let bias trem slightly change saturator drive via a small VCA
    this.powerDrive = audioContext.createGain();
    this.powerDrive.gain.value = 1.0;

    this.chime = audioContext.createBiquadFilter();
    this.chime.type = 'peaking';
    this.chime.frequency.value = 3000;
    this.chime.Q.value = 2;
    this.chime.gain.value = 4;
    
    // Safety DC block before cab
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============== Cabinet ==============
    this.cabIR = audioContext.createConvolver(); // mono IR recommended
    this.cabEnabled = true;
    this._loadDefaultCabinetIR();

    // Lightweight IIR cab fallback (if IR disabled)
    this.cabIIR1 = audioContext.createBiquadFilter(); // lowpass rolloff ~5k
    this.cabIIR1.type = 'lowpass';
    this.cabIIR1.frequency.value = 5200;
    this.cabIIR1.Q.value = 0.7;
    this.cabIIR2 = audioContext.createBiquadFilter(); // mid bump
    this.cabIIR2.type = 'peaking';
    this.cabIIR2.frequency.value = 1800;
    this.cabIIR2.Q.value = 1.0;
    this.cabIIR2.gain.value = 2.5;

    // Output soft limiter
    this.softLimiter = audioContext.createDynamicsCompressor();
    this.softLimiter.threshold.value = -1;
    this.softLimiter.knee.value = 15;
    this.softLimiter.ratio.value = 4;
    this.softLimiter.attack.value = 0.003;
    this.softLimiter.release.value = 0.08;

    // Master
    this.master = audioContext.createGain();
    this.master.gain.value = 0.7;

    // ===================== Spring Reverb =====================
    // (kept simple but diffused)
    this.revAP1 = audioContext.createBiquadFilter();
    this.revAP1.type = 'allpass'; this.revAP1.frequency.value = 900; this.revAP1.Q.value = 0.707;
    this.revAP2 = audioContext.createBiquadFilter();
    this.revAP2.type = 'allpass'; this.revAP2.frequency.value = 2700; this.revAP2.Q.value = 0.707;
    this.revD1 = audioContext.createDelay(0.6); this.revD1.delayTime.value = 0.027;
    this.revD2 = audioContext.createDelay(0.6); this.revD2.delayTime.value = 0.031;
    this.revD3 = audioContext.createDelay(0.6); this.revD3.delayTime.value = 0.037;
    this.revLP = audioContext.createBiquadFilter(); this.revLP.type = 'lowpass'; this.revLP.frequency.value = 3000;
    this.revFB = audioContext.createGain(); this.revFB.gain.value = 0.4;
    this.revMix = audioContext.createGain(); this.revMix.gain.value = 0;

    this.revAP1.connect(this.revAP2);
    this.revAP2.connect(this.revD1); this.revAP2.connect(this.revD2); this.revAP2.connect(this.revD3);
    this.revD1.connect(this.revLP); this.revD2.connect(this.revLP); this.revD3.connect(this.revLP);
    this.revLP.connect(this.revFB); this.revFB.connect(this.revD1); this.revFB.connect(this.revD2); this.revFB.connect(this.revD3);
    this.revLP.connect(this.revMix);

    // ===================== Routing =====================
    this._setupRouting('topboost');

    // ===================== Params =====================
    this.params = {
      channel: 1, // 0=normal, 1=topboost
      // Normal
      normal_volume: 50, brilliance: false,
      // Top Boost
      topboost_volume: 60, treble: 60, bass: 50,
      // Global
      cut: 50, master: 70,
      // FX
      tremolo_speed: 40, tremolo_depth: 0, // AM trem
      vibrato_speed: 50, vibrato_depth: 0,
      reverb: 0,
      // Back panel
      pentode_triode: true,
      // Extras
      gate: 0, // 0..100 (threshold-ish)
      width: 0, // reserved
    };

    this._startAutomation();
  }

  //===================== Routing =====================
  _setupRouting(which) {
    this._disconnectAll();

    // Detector taps
    this.input.connect(this.gateDetector);

    // Input → HPF → (gate VCA) → Preamp
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.gateVCA);

    // Gate control tick uses gateLP output
    this.gateLP.connect(this.gateAmount);

    this.gateVCA.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.classA);

    if (which === 'normal') {
      this.classA.connect(this.normalVolume);
      this.normalVolume.connect(this.normalBrilliance);
      this.normalBrilliance.connect(this.brightCap);
    } else {
      this.classA.connect(this.topBoostVolume);
      this.topBoostVolume.connect(this.topBoostBass);
      this.topBoostBass.connect(this.topBoostTreble);
      this.topBoostTreble.connect(this.brightCap);
    }

    this.brightCap.connect(this.midHonk);
    this.midHonk.connect(this.interstageHPF);
    this.interstageHPF.connect(this.cutControl);
    this.cutControl.connect(this.topCut);
    
    // Vibrato send before power
    this.topCut.connect(this.vibratoDelay);
    
    // Reverb send
    this.vibratoDelay.connect(this.revAP1);

    // SAG detector tap
    this.vibratoDelay.connect(this.sagDetector);

    // Dry to power, plus wet reverb sum
    this.vibratoDelay.connect(this.sagVCA);
    this.revMix.connect(this.sagVCA);

    // Bias tremolo influences drive: bias depth (0..~0.07) modulates gain
    this.biasTremDepth.connect(this.powerDrive.gain);

    this.sagVCA.connect(this.powerAmp);
    this.powerAmp.connect(this.powerDrive);
    this.powerDrive.connect(this.powerSaturation);
    this.powerSaturation.connect(this.chime);
    this.chime.connect(this.dcBlock);
    
    if (this.cabEnabled) {
      this.dcBlock.connect(this.cabIR);
      this.cabIR.connect(this.amTremGain);
    } else {
      this.dcBlock.connect(this.cabIIR1);
      this.cabIIR1.connect(this.cabIIR2);
      this.cabIIR2.connect(this.amTremGain);
    }

    // AM Trem (post cab)
    this.biasTremLFO.connect(this.amTremDepth); // reuse same LFO rate
    this.amTremDepth.connect(this.amTremGain.gain);

    // Soft limiter → Master → Output
    this.amTremGain.connect(this.softLimiter);
    this.softLimiter.connect(this.master);
    this.master.connect(this.output);

    this.activeChannel = (which === 'normal') ? 'normal' : 'topboost';
  }

  _disconnectAll() {
    const nodes = [
      this.inputHPF, this.gateVCA, this.preamp, this.preampSaturation, this.classA,
      this.normalVolume, this.normalBrilliance, this.topBoostVolume, this.topBoostBass,
      this.topBoostTreble, this.brightCap, this.midHonk, this.interstageHPF, this.cutControl,
      this.topCut, this.vibratoDelay, this.revAP1, this.revAP2, this.revD1, this.revD2, this.revD3,
      this.revLP, this.revFB, this.revMix, this.sagVCA, this.powerAmp, this.powerDrive,
      this.powerSaturation, this.chime, this.dcBlock, this.cabIR, this.cabIIR1, this.cabIIR2,
      this.amTremGain, this.softLimiter, this.master
    ];
    try { nodes.forEach(n => n.disconnect()); } catch(e) {}
  }

  //===================== Utilities =====================
  _makeRectifier() {
    const s = this.audioContext.createWaveShaper();
    const c = new Float32Array(65536);
    for (let i = 0; i < c.length; i++) {
      const x = (i - 32768) / 32768;
      c[i] = Math.abs(x);
    }
    s.curve = c; s.oversample = '2x';
    return s;
  }

  _makeEF86Curve() {
    const N = 44100; const c = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      let y = Math.tanh(x * 1.8);
      if (Math.abs(y) > 0.4) {
        const comp = 1 - (Math.abs(y) - 0.4) * 0.3; y *= comp;
      }
      y += 0.18 * Math.tanh(x * 3.2); // mid bite
      c[i] = y;
    }
    return c;
  }

  _makeEL84Curve() {
    const N = 44100; const c = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i * 2) / N - 1;
      let y = Math.tanh(x * 1.5);
      y += 0.12 * Math.sin(x * Math.PI * 5);
      y += 0.15 * Math.sin(x * Math.PI * 2);
      y *= (x > 0 ? 1.12 : 0.95);
      c[i] = y * 0.85;
    }
    return c;
  }

  //===================== Defaults / IR =====================
  _loadDefaultCabinetIR() {
    const sr = this.audioContext.sampleRate;
    const dur = 0.035; const len = Math.floor(dur * sr);
    const buf = this.audioContext.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr; const decay = Math.exp(-t / 0.012);
      const early = i < sr * 0.003 ? Math.random() * 0.4 : 0;
      let s = (Math.random() * 2 - 1) * decay + early * decay;
      if (i > 0) { const a = 0.65; s = a * s + (1 - a) * d[i - 1]; }
      d[i] = s * 0.8;
    }
    let m = 0; for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(d[i]));
    if (m > 0) for (let i = 0; i < len; i++) d[i] /= m;
    this.cabIR.buffer = buf;
  }

  async loadIR(irData) {
    try {
      let raw; if (typeof irData === 'string') { const r = await fetch(irData); raw = await r.arrayBuffer(); }
      else { raw = irData; }
      const ab = await this.audioContext.decodeAudioData(raw);
      this.cabIR.buffer = ab; return true;
    } catch (e) { console.error('IR load error', e); return false; }
  }

  //===================== Parameters =====================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    const logMap = v => 0.001 * Math.pow(1000, v); // 0..1 → ~-60..0 dB

    switch(parameter) {
      case 'channel':
        this._setupRouting(value === 0 ? 'normal' : 'topboost');
        break;
      
      // Normal
      case 'normal_volume':
        this.normalVolume.gain.setTargetAtTime(logMap(value/100), now, 0.01);
        this._setVolumeBright('normal', value);
        break;
      case 'brilliance':
        this.normalBrilliance.gain.setTargetAtTime(value ? 6 : 0, now, 0.01);
        break;
      
      // Top Boost
      case 'topboost_volume':
      case 'volume':
      case 'gain':
        this.topBoostVolume.gain.setTargetAtTime(logMap(value/100) * 1.2, now, 0.01);
        this._setVolumeBright('topboost', value);
        break;
      case 'treble':
        this.topBoostTreble.gain.setTargetAtTime((value-50)/10, now, 0.01);
        break;
      case 'bass':
        this.topBoostBass.gain.setTargetAtTime((value-50)/10, now, 0.01);
        break;
      
      // Global
      case 'cut': {
        const v = value/100; const f = 12000 - v * (12000-2000);
        this.cutControl.frequency.setTargetAtTime(f, now, 0.01);
        break; }
      case 'master': {
        const g = logMap(value/100);
        this.master.gain.setTargetAtTime(g, now, 0.01);
        // sag depth scales with master
        this.sagAmount = 0.05 + (value/100) * 0.12; // ~5%..17%
        break; }

      // FX
      case 'tremolo_speed':
        this.biasTremLFO.frequency.setTargetAtTime(0.5 + (value/100)*9.5, now, 0.01);
        break;
      case 'tremolo_depth':
        // split: bias trem (0..0.07) + AM trem (0..1)
        const amt = value/100;
        this.biasTremDepth.gain.setTargetAtTime(0.03 * amt, now, 0.01);
        this.amTremDepth.gain.setTargetAtTime(amt, now, 0.01);
        break;
      case 'vibrato_speed':
        this.vibratoLFO.frequency.setTargetAtTime(1 + (value/100)*11, now, 0.01);
        break;
      case 'vibrato_depth': {
        const maxD = 0.015; // 15ms
        this.vibratoDepth.gain.setTargetAtTime((value/100)*maxD, now, 0.01);
        break; }
      case 'reverb':
        this.revMix.gain.setTargetAtTime(value/100, now, 0.01);
        break;
      
      // Back panel
      case 'pentode_triode':
        this._setPentodeTriode(!!value);
        break;
      
      // Cabinet
      case 'cabinet_enabled':
        this.cabEnabled = !!value; this._setupRouting(this.activeChannel);
        break;

      // Extras
      case 'gate':
        // 0..100 ⇒ 0..0.8 (how much to attenuate when input is low)
        this.gateAmount.gain.setTargetAtTime((value/100)*0.8, now, 0.03);
        break;

      default:
        super.updateParameter(parameter, value);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  _setVolumeBright(channel, value) {
    // Bright cap effect stronger at *lower* volume positions
    const vol01 = value/100; // 0..1
    const shelf = (1 - vol01) * 8; // up to +8 dB boost
    this.brightCap.gain.setTargetAtTime(shelf, this.audioContext.currentTime, 0.01);
  }

  _setPentodeTriode(isPentode) {
    if (isPentode) {
      this.powerAmp.gain.setTargetAtTime(1.2, this.audioContext.currentTime, 0.01);
      this.classA.threshold.setTargetAtTime(-22, this.audioContext.currentTime, 0.01);
      this.classA.ratio.setTargetAtTime(2.6, this.audioContext.currentTime, 0.01);
      this.chime.gain.setTargetAtTime(4, this.audioContext.currentTime, 0.01);
      this.topCut.frequency.setTargetAtTime(7500, this.audioContext.currentTime, 0.01);
    } else {
      this.powerAmp.gain.setTargetAtTime(0.85, this.audioContext.currentTime, 0.01);
      this.classA.threshold.setTargetAtTime(-26, this.audioContext.currentTime, 0.01);
      this.classA.ratio.setTargetAtTime(3.3, this.audioContext.currentTime, 0.01);
      this.chime.gain.setTargetAtTime(2.5, this.audioContext.currentTime, 0.01);
      this.topCut.frequency.setTargetAtTime(6500, this.audioContext.currentTime, 0.01);
    }
  }

  //===================== Automation Loops =====================
  _startAutomation() {
    // SAG loop: lower headroom when detector rises
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    this.sagDetector.connect(this.sagLP);
    this.sagLP.connect(analyser);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i]-128)/128; sum += v*v; }
      const rms = Math.sqrt(sum / buf.length);
      const target = 1 - Math.min(0.4, rms * this.sagAmount * 2.2); // cap sag
      const t = this.audioContext.currentTime;
      this.sagVCA.gain.setTargetAtTime(target, t, 0.04);

      // Noise gate (inverse mapping):
      // when input level (rms) is low, reduce gateVCA.gain
      const gateDepth = this.gateAmount.gain.value; // 0..0.8
      const gateGain = 1 - Math.min(gateDepth, Math.max(0, 0.25 - rms) * 3.2 * gateDepth);
      this.gateVCA.gain.setTargetAtTime(gateGain, t, 0.02);

      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  //===================== Presets =====================
  setPreset(name) {
    const p = (k,v) => this.updateParameter(k,v);
    switch((name||'').toLowerCase()) {
      case 'edge': // The Edge chimey clean
        p('channel', 1); p('topboost_volume', 55); p('treble', 65); p('bass', 45);
        p('cut', 35); p('master', 75); p('reverb', 10);
        p('vibrato_depth', 0); p('tremolo_depth', 0); p('pentode_triode', true);
        break;
      case 'brian may':
        p('channel', 1); p('topboost_volume', 70); p('treble', 60); p('bass', 55);
        p('cut', 45); p('master', 80); p('reverb', 8);
        p('tremolo_depth', 0); p('pentode_triode', true);
        break;
      case 'beatles clean':
        p('channel', 0); p('normal_volume', 55); p('brilliance', true);
        p('cut', 40); p('master', 70); p('reverb', 6);
        p('vibrato_depth', 0); p('tremolo_depth', 0); p('pentode_triode', false);
        break;
      default:
        break;
    }
  }

  //===================== Housekeeping =====================
  disconnect() {
    super.disconnect();
    try { cancelAnimationFrame(this._raf); } catch(e) {}
    try { this.vibratoLFO.stop(); this.biasTremLFO.stop(); } catch(e) {}
    try {
      [this.inputHPF, this.gateVCA, this.preamp, this.preampSaturation, this.classA,
       this.normalVolume, this.normalBrilliance, this.topBoostVolume, this.topBoostBass,
       this.topBoostTreble, this.brightCap, this.midHonk, this.interstageHPF, this.cutControl,
       this.topCut, this.vibratoDelay, this.revAP1, this.revAP2, this.revD1, this.revD2,
       this.revD3, this.revLP, this.revFB, this.revMix, this.sagVCA, this.powerAmp,
       this.powerDrive, this.powerSaturation, this.chime, this.dcBlock, this.cabIR,
       this.cabIIR1, this.cabIIR2, this.amTremGain, this.softLimiter, this.master].forEach(n => n.disconnect());
    } catch(e) { console.warn('Vox AC30 disconnect warn', e); }
  }
}

export default VoxAC30Amp;
