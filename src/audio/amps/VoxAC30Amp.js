import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

/**
 * Vox AC30 (Top Boost) — WebAudio Amp Sim V3 (patched)
 *
 * Changes vs. your V2:
 * 1) Gate fix: independent input analyser; gate now keys from preamp input.
 * 2) Top Boost treble as highshelf (wider range); bass range widened.
 * 3) Channel blend: mix Normal + Top Boost before the shared path.
 * 4) Vibrato: all‑pass phase vibrato (no combing) driven by existing LFO.
 * 5) "Reactive load" pre‑cab: speaker resonance hump + inductive highshelf.
 * 6) Anti‑alias LPFs after preamp & power shapers.
 * 7) Master scales reactive hump; small tidy‑ups.
 */
class VoxAC30Amp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Vox AC30', 'vox_ac30');

    // ===================== Front End =====================
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 40;
    this.inputHPF.Q.value = 0.707;

    // Optional noise gate (very gentle) — detector from INPUT path now
    this.gateDetector = this._makeRectifier();
    this.gateLP = audioContext.createBiquadFilter();
    this.gateLP.type = 'lowpass';
    this.gateLP.frequency.value = 25; // envelope smoothing
    this.gateAmount = audioContext.createGain();
    this.gateAmount.gain.value = 0; // 0..1, set via params
    this.gateVCA = audioContext.createGain();
    this.gateVCA.gain.value = 1.0;

    // Independent analysers for SAG and GATE
    this.sagAnalyser = this.audioContext.createAnalyser();
    this.sagAnalyser.fftSize = 256;
    this.gateAnalyser = this.audioContext.createAnalyser();
    this.gateAnalyser.fftSize = 256;

    // Preamp (EF86-ish) + gentle input gain
    this.preamp = audioContext.createGain();
    this.preamp.gain.value = 2.2; // default front gain

    this.preampSaturation = audioContext.createWaveShaper();
    this.preampSaturation.curve = this._makeEF86Curve();
    this.preampSaturation.oversample = '4x';

    // Anti-alias after preamp shaper
    this.aaPre = audioContext.createBiquadFilter();
    this.aaPre.type = 'lowpass';
    this.aaPre.frequency.value = 12000;
    this.aaPre.Q.value = 0.707;

    // Class A compressor to mimic preamp compression
    this.classA = audioContext.createDynamicsCompressor();
    this.classA.threshold.value = -24;
    this.classA.knee.value = 18;
    this.classA.ratio.value = 2.8;
    this.classA.attack.value = 0.004;
    this.classA.release.value = 0.12;

    // ============== Channels ==============
    // Normal path
    this.normalVolume = audioContext.createGain();
    this.normalBrilliance = audioContext.createBiquadFilter();
    this.normalBrilliance.type = 'highshelf';
    this.normalBrilliance.frequency.value = 3200;
    this.normalBrilliance.gain.value = 0;
    this.brightCapN = audioContext.createBiquadFilter();
    this.brightCapN.type = 'highshelf';
    this.brightCapN.frequency.value = 3200;
    this.brightCapN.gain.value = 0;

    // Top Boost path
    this.topBoostVolume = audioContext.createGain();
    this.topBoostBass = audioContext.createBiquadFilter();
    this.topBoostBass.type = 'lowshelf';
    this.topBoostBass.frequency.value = 160;
    this.topBoostBass.gain.value = 2;

    this.topBoostTreble = audioContext.createBiquadFilter();
    this.topBoostTreble.type = 'highshelf'; // changed from peaking
    this.topBoostTreble.frequency.value = 2500;
    this.topBoostTreble.gain.value = 3;

    // Bright cap emu (linked to volume) — separate for TB path
    this.brightCapTB = audioContext.createBiquadFilter();
    this.brightCapTB.type = 'highshelf';
    this.brightCapTB.frequency.value = 3200;
    this.brightCapTB.gain.value = 0;

    // Channel blend node (adds Normal into TB)
    this.channelBlend = this.audioContext.createGain();
    this.channelBlend.gain.value = 0; // 0..1 = amount of Normal added

    // Sum of both channels
    this.sumMix = this.audioContext.createGain();

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
    this.cutControl.frequency.value = 9000;
    this.cutControl.Q.value = 0.707;

    // Additional top cut (power section tone)
    this.topCut = audioContext.createBiquadFilter();
    this.topCut.type = 'lowpass';
    this.topCut.frequency.value = 7500;
    this.topCut.Q.value = 0.707;

    // ============== Vibrato (all-pass) & Tremolo ==============
    // Replace delay vibrato by phase vibrato with two allpass sections
    this.vibAP1 = this.audioContext.createBiquadFilter();
    this.vibAP1.type = 'allpass';
    this.vibAP2 = this.audioContext.createBiquadFilter();
    this.vibAP2.type = 'allpass';
    this._vibPhase = 0; // internal phase accum

    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 6;
    this.vibratoLFO.start();
    this.vibratoDepthAP = audioContext.createGain();
    this.vibratoDepthAP.gain.value = 0; // 0..1 intensity

    // Bias tremolo (mod pre-power drive) + classic AM at end
    this.biasTremLFO = audioContext.createOscillator();
    this.biasTremLFO.type = 'sine';
    this.biasTremLFO.frequency.value = 4;
    this.biasTremDepth = audioContext.createGain();
    this.biasTremDepth.gain.value = 0; // set via params
    this.biasTremLFO.connect(this.biasTremDepth);
    this.biasTremLFO.start();

    this.amTremDepth = audioContext.createGain();
    this.amTremDepth.gain.value = 0; // 0..1
    this.amTremGain = audioContext.createGain();
    this.amTremGain.gain.value = 1;

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

    this.powerDrive = audioContext.createGain();
    this.powerDrive.gain.value = 1.0; // modulated by bias trem

    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this._makeEL84Curve();
    this.powerSaturation.oversample = '4x';

    // Anti-alias after power shaper
    this.aaPower = audioContext.createBiquadFilter();
    this.aaPower.type = 'lowpass';
    this.aaPower.frequency.value = 11000;
    this.aaPower.Q.value = 0.707;

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

    // Reactive load (pre-cab) — speaker interaction
    this.spkrResLo = this.audioContext.createBiquadFilter(); // 80–100 Hz hump
    this.spkrResLo.type = 'peaking';
    this.spkrResLo.frequency.value = 90;
    this.spkrResLo.Q.value = 0.7;
    this.spkrResLo.gain.value = 2; // scaled by master later

    this.spkrIndHi = this.audioContext.createBiquadFilter(); // inductive tilt
    this.spkrIndHi.type = 'highshelf';
    this.spkrIndHi.frequency.value = 2000;
    this.spkrIndHi.gain.value = 1.5;

    // ============== Cabinet Simulator ==============
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; // Will be created on demand
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_closed'; // Vox AC30 standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();

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
    this._setupRouting();

    // ===================== Params =====================
    this.params = {
      // Channeling
      channel: 1, // legacy: 0=normal, 1=topboost (TB is base path)
      channel_blend: 0, // 0..100 add Normal into TB
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
      width: 0,
    };

    this._startAutomation();
    this.recreateCabinet();
  }

  //===================== Routing =====================
  _setupRouting() {
    this._disconnectAll();

    // --- Detector taps ---
    // Gate keys from INPUT path
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.gateVCA);
    this.inputHPF.connect(this.gateDetector);
    this.gateDetector.connect(this.gateLP);
    this.gateLP.connect(this.gateAnalyser);

    // Preamp core
    this.gateVCA.connect(this.preamp);
    this.preamp.connect(this.preampSaturation);
    this.preampSaturation.connect(this.aaPre);
    this.aaPre.connect(this.classA);

    // Build both channel paths up to their bright caps
    // Normal chain
    this.classA.connect(this.normalVolume);
    this.normalVolume.connect(this.normalBrilliance);
    this.normalBrilliance.connect(this.brightCapN);

    // Top Boost chain
    this.classA.connect(this.topBoostVolume);
    this.topBoostVolume.connect(this.topBoostBass);
    this.topBoostBass.connect(this.topBoostTreble);
    this.topBoostTreble.connect(this.brightCapTB);

    // Blend: TB is main, add Normal via channelBlend
    this.brightCapTB.connect(this.sumMix);
    this.brightCapN.connect(this.channelBlend);
    this.channelBlend.connect(this.sumMix);

    // Shared path after blend
    this.sumMix.connect(this.midHonk);
    this.midHonk.connect(this.interstageHPF);
    this.interstageHPF.connect(this.cutControl);
    this.cutControl.connect(this.topCut);

    // Vibrato all-pass chain (pre reverb / power)
    this.topCut.connect(this.vibAP1);
    this.vibAP1.connect(this.vibAP2);

    // Reverb send from vib output
    this.vibAP2.connect(this.revAP1);

    // SAG detector tap from vib output
    this.vibAP2.connect(this.sagDetector);
    this.sagDetector.connect(this.sagLP);
    this.sagLP.connect(this.sagAnalyser);

    // Dry to power + reverb wet sum → power
    this.vibAP2.connect(this.sagVCA);
    this.revMix.connect(this.sagVCA);

    // Bias tremolo influences drive
    this.biasTremDepth.connect(this.powerDrive.gain);

    // Power & anti-alias
    this.sagVCA.connect(this.powerAmp);
    this.powerAmp.connect(this.powerDrive);
    this.powerDrive.connect(this.powerSaturation);
    this.powerSaturation.connect(this.aaPower);
    this.aaPower.connect(this.chime);
    this.chime.connect(this.dcBlock);

    // Reactive load before cabinet
    this.dcBlock.connect(this.spkrResLo);
    this.spkrResLo.connect(this.spkrIndHi);

    // Cabinet routing with CabinetSimulator
    this.spkrIndHi.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.amTremGain);

    // AM Trem (post cab)
    this.biasTremLFO.connect(this.amTremDepth); // reuse LFO rate
    this.amTremDepth.connect(this.amTremGain.gain);

    // Soft limiter → Master → Output
    this.amTremGain.connect(this.softLimiter);
    this.softLimiter.connect(this.master);
    this.master.connect(this.output);

    this.activeChannel = 'topboost'; // TB is the base; Normal comes via blend
  }

  _disconnectAll() {
    const nodes = [
      this.inputHPF, this.gateVCA, this.gateDetector, this.gateLP, this.gateAnalyser,
      this.preamp, this.preampSaturation, this.aaPre, this.classA,
      this.normalVolume, this.normalBrilliance, this.brightCapN,
      this.topBoostVolume, this.topBoostBass, this.topBoostTreble, this.brightCapTB,
      this.channelBlend, this.sumMix, this.midHonk, this.interstageHPF, this.cutControl,
      this.topCut, this.vibAP1, this.vibAP2,
      this.revAP1, this.revAP2, this.revD1, this.revD2, this.revD3, this.revLP, this.revFB, this.revMix,
      this.sagDetector, this.sagLP, this.sagAnalyser, this.sagVCA,
      this.powerAmp, this.powerDrive, this.powerSaturation, this.aaPower,
      this.chime, this.dcBlock, this.spkrResLo, this.spkrIndHi,
      this.preCabinet, this.postCabinet, this.amTremGain, this.softLimiter, this.master
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

  //===================== Cabinet Simulator =====================
  recreateCabinet() {
    // Cleanup old cabinet properly
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Disconnect preCabinet
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    if (this.cabinetEnabled) {
      // Create new cabinet with current settings
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        // Fallback if cabinet creation fails
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      // Bypass cabinet
      this.preCabinet.connect(this.postCabinet);
    }
  }

  //===================== Parameters =====================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    const logMap = v => 0.001 * Math.pow(1000, v); // 0..1 → ~-60..0 dB

    switch(parameter) {
      case 'channel':
        // legacy toggle: 0→favor normal (increase blend), 1→favor TB (blend=0)
        this.params.channel = value;
        this.updateParameter('channel_blend', value === 0 ? 100 : 0);
        break;

      case 'channel_blend': { // 0..100 of Normal added to TB
        const amt = Math.min(1, Math.max(0, value/100));
        this.channelBlend.gain.setTargetAtTime(amt, now, 0.01);
        break; }

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
      case 'treble': // widened highshelf range (~±14 dB)
        this.topBoostTreble.gain.setTargetAtTime((value-50)/3.5, now, 0.01);
        break;
      case 'bass': // widen bass control too
        this.topBoostBass.gain.setTargetAtTime((value-50)/3.5, now, 0.01);
        break;

      // Global
      case 'cut': {
        const v = value/100; const f = 12000 - v * (12000-1800); // extend lower end
        this.cutControl.frequency.setTargetAtTime(f, now, 0.01);
        break; }
      case 'master': {
        const g = logMap(value/100);
        this.master.gain.setTargetAtTime(g, now, 0.01);
        // sag depth scales with master
        this.sagAmount = 0.05 + (value/100) * 0.12; // ~5%..17%
        // reactive hump scales with master (1..3.5 dB)
        const hump = 1 + (value/100)*2.5;
        this.spkrResLo.gain.setTargetAtTime(hump, now, 0.05);
        break; }

      // FX
      case 'tremolo_speed':
        this.biasTremLFO.frequency.setTargetAtTime(0.5 + (value/100)*9.5, now, 0.01);
        break;
      case 'tremolo_depth': {
        const amt = value/100;
        this.biasTremDepth.gain.setTargetAtTime(0.03 * amt, now, 0.01); // bias trem → drive
        this.amTremDepth.gain.setTargetAtTime(amt, now, 0.01); // AM post-cab
        break; }
      case 'vibrato_speed':
        this.vibratoLFO.frequency.setTargetAtTime(1 + (value/100)*11, now, 0.01);
        break;
      case 'vibrato_depth': {
        this.vibratoDepthAP.gain.setTargetAtTime((value/100), now, 0.01);
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
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
        this.micPosition = value;
        this.recreateCabinet();
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
    const targetNode = (channel === 'normal') ? this.brightCapN : this.brightCapTB;
    targetNode.gain.setTargetAtTime(shelf, this.audioContext.currentTime, 0.01);
    // give a bit of Q to shelf to feel less clinical
    targetNode.Q?.setTargetAtTime?.(0.6, this.audioContext.currentTime, 0.01);
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
    const sagBuf = new Uint8Array(this.sagAnalyser.frequencyBinCount);
    const gateBuf = new Uint8Array(this.gateAnalyser.frequencyBinCount);

    // vibrato modulation values
    let vibFreq = this.vibratoLFO.frequency.value; // we will read from param changes implicitly

    const tick = () => {
      // --- SAG RMS (post-pre path) ---
      this.sagAnalyser.getByteTimeDomainData(sagBuf);
      let s=0; for (let i = 0; i < sagBuf.length; i++) { const v=(sagBuf[i]-128)/128; s+=v*v; }
      const sagRms = Math.sqrt(s / sagBuf.length);
      const t = this.audioContext.currentTime;
      const sagTarget = 1 - Math.min(0.4, sagRms * this.sagAmount * 2.2);
      this.sagVCA.gain.setTargetAtTime(sagTarget, t, 0.04);

      // --- GATE RMS (input path) ---
      this.gateAnalyser.getByteTimeDomainData(gateBuf);
      let g=0; for (let i=0;i<gateBuf.length;i++){ const v=(gateBuf[i]-128)/128; g+=v*v; }
      const gateRms = Math.sqrt(g / gateBuf.length);
      const depth = this.gateAmount.gain.value; // 0..0.8
      const open = Math.min(1, (gateRms - 0.02) * 35); // gentle threshold
      const gateGain = 1 - depth * (1 - Math.max(0, open));
      this.gateVCA.gain.setTargetAtTime(gateGain, t, 0.02);

      // --- Vibrato all-pass modulation ---
      vibFreq = this.vibratoLFO.frequency.value; // read current rate
      const depth01 = this.vibratoDepthAP.gain.value; // 0..1
      const span = 700 * depth01; // Hz span
      const base = 400; // center
      // simple numerically cheap LFO in JS (phase advances per frame ~60Hz)
      this._vibPhase += (2*Math.PI * vibFreq) / 60;
      const lfo = 0.5 + 0.5 * Math.sin(this._vibPhase);
      this.vibAP1.frequency.setTargetAtTime(base - span * lfo, t, 0.01);
      this.vibAP2.frequency.setTargetAtTime(base + span * lfo, t, 0.01);

      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  //===================== Presets =====================
  setPreset(name) {
    const p = (k,v) => this.updateParameter(k,v);
    switch((name||'').toLowerCase()) {
      case 'edge': // The Edge chimey clean
        p('channel_blend', 0); p('topboost_volume', 58); p('treble', 68); p('bass', 42);
        p('cut', 30); p('master', 78); p('reverb', 10);
        p('vibrato_depth', 10); p('tremolo_depth', 0); p('pentode_triode', true);
        break;
      case 'brian may':
        p('channel_blend', 0); p('topboost_volume', 72); p('treble', 70); p('bass', 55);
        p('cut', 50); p('master', 82); p('reverb', 8);
        p('tremolo_depth', 0); p('pentode_triode', true);
        break;
      case 'beatles clean':
        p('channel_blend', 35); p('normal_volume', 57); p('brilliance', true);
        p('cut', 45); p('master', 70); p('reverb', 6);
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
    try {
      [this.vibratoLFO, this.biasTremLFO].forEach(o=>{ try{o.stop();}catch(_){} });
    } catch(e) {}
    try {
      [this.inputHPF, this.gateVCA, this.gateDetector, this.gateLP, this.gateAnalyser,
       this.preamp, this.preampSaturation, this.aaPre, this.classA,
       this.normalVolume, this.normalBrilliance, this.brightCapN,
       this.topBoostVolume, this.topBoostBass, this.topBoostTreble, this.brightCapTB,
       this.channelBlend, this.sumMix, this.midHonk, this.interstageHPF, this.cutControl,
       this.topCut, this.vibAP1, this.vibAP2,
       this.revAP1, this.revAP2, this.revD1, this.revD2, this.revD3, this.revLP, this.revFB, this.revMix,
       this.sagDetector, this.sagLP, this.sagAnalyser, this.sagVCA,
       this.powerAmp, this.powerDrive, this.powerSaturation, this.aaPower,
       this.chime, this.dcBlock, this.spkrResLo, this.spkrIndHi,
       this.preCabinet, this.postCabinet, this.amTremGain, this.softLimiter, this.master].forEach(n => n.disconnect());
      if (this.cabinet && this.cabinet.input) {
        this.cabinet.input.disconnect();
      }
      if (this.cabinet && this.cabinet.output) {
        this.cabinet.output.disconnect();
      }
    } catch(e) { console.warn('Vox AC30 disconnect warn', e); }
  }
}

export default VoxAC30Amp;
