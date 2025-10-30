import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class FenderProJuniorAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Pro Junior', 'fender_pro_junior');
    
    // FENDER PRO JUNIOR (1990s-present)
    // THE simple tube amp - Neil Young, Jack White
    // 15W all-tube combo with just Volume and Tone
    // Famous for its "sweet spot" breakup when pushed hard
    
    // ============================================
    // INPUT STAGE
    // ============================================
    // Input HPF - removes subsonic rumble
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 40;
    this.inputHPF.Q.value = 0.707;
    
    // ============================================
    // PREAMP (2x 12AX7 cascaded for gain)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    
    // Saturation stages (Pro Junior characteristic - warm, compressed)
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation1.curve = this.make12AX7Curve();
    this.saturation2.curve = this.make12AX7Curve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // Cathode coupling cap simulation (shapes low end)
    this.couplingCap = audioContext.createBiquadFilter();
    this.couplingCap.type = 'highpass';
    this.couplingCap.frequency.value = 100; // 120 → 100 Hz (mais corpo)
    this.couplingCap.Q.value = 0.707;
    
    // ============================================
    // VOLUME CONTROL
    // ============================================
    this.volume = audioContext.createGain();
    
    // Volume-dependent bright cap (more treble at lower volumes)
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 4200; // 3500 → 4200 Hz (treble bleed real)
    this.brightCap.gain.value = 0;
    this._currentVolume = 60;
    
    // ============================================
    // TONE CONTROL (Simple passive tone stack)
    // ============================================
    this.tone = audioContext.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 6000;
    this.tone.Q.value = 0.707;
    
    // Additional tone shaping (Pro Junior "voice")
    this.toneShelf = audioContext.createBiquadFilter();
    this.toneShelf.type = 'highshelf';
    this.toneShelf.frequency.value = 2000;
    this.toneShelf.gain.value = 0;
    
    // Mid-range presence bump (Pro Junior characteristic)
    this.midBump = audioContext.createBiquadFilter();
    this.midBump.type = 'peaking';
    this.midBump.frequency.value = 1100; // 800 → 1100 Hz (menos nasal)
    this.midBump.Q.value = 1.1; // 1.2 → 1.1 (mais musical)
    this.midBump.gain.value = 1.6; // 2.5 → 1.6 dB (mais sutil)
    
    // ============================================
    // RECTIFIER SAG (5Y3 tube rectifier - vintage sag)
    // ============================================
    this.rectifierSag = audioContext.createDynamicsCompressor();
    this.rectifierSag.threshold.value = -18; // -24 → -18 (menos compressão)
    this.rectifierSag.ratio.value = 1.6; // 2.4 → 1.6 (mais natural)
    this.rectifierSag.attack.value = 0.008; // +8ms
    this.rectifierSag.release.value = 0.12;
    
    // ============================================
    // POWER AMP (2x EL84 - Class AB push-pull)
    // ============================================
    // POWER SUPPLY SAG - AUDIOWORKLET (5Y3 tube rectifier)
    // Pro Junior is famous for its sag and compression when pushed
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.15,      // 15% sag (Pro Junior signature "spongy" feel)
      att: 0.010,       // 10ms attack (slower, vintage)
      relFast: 0.09,    // 90ms fast recovery
      relSlow: 0.28,    // 280ms slow recovery (5Y3 slow response)
      rmsMs: 26.0,      // 26ms RMS window (vintage feel)
      shape: 1.8,       // Very progressive (vintage sag character)
      floor: 0.24,      // 24% minimum headroom (heavy sag!)
      peakMix: 0.27     // More RMS-focused (smooth vintage compression)
    });
    
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeEL84Curve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression (Class AB character)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -14; // -16 → -14 (alivia compressão)
    this.powerComp.knee.value = 8;
    this.powerComp.ratio.value = 2.6; // 3.2 → 2.6 (mais natural)
    this.powerComp.attack.value = 0.009;
    this.powerComp.release.value = 0.11;
    
    // ============================================
    // PRO JUNIOR "BARK" (Mid-forward character)
    // ============================================
    this.bark = audioContext.createBiquadFilter();
    this.bark.type = 'peaking';
    this.bark.frequency.value = 1200;
    this.bark.Q.value = 1.8;
    this.bark.gain.value = 3.5;
    
    // ============================================
    // OUTPUT TRANSFORMER SIMULATION
    // ============================================
    // Small OT = more midrange, less extended lows/highs
    this.transformerLPF = audioContext.createBiquadFilter();
    this.transformerLPF.type = 'lowpass';
    this.transformerLPF.frequency.value = 7000; // 8000 → 7000 Hz (10" speaker)
    this.transformerLPF.Q.value = 1.2; // Resonant peak
    
    this.transformerHPF = audioContext.createBiquadFilter();
    this.transformerHPF.type = 'highpass';
    this.transformerHPF.frequency.value = 90;
    this.transformerHPF.Q.value = 0.8;
    
    // ============================================
    // POST-CABINET BITE (SM57 presence)
    // ============================================
    this.postCabBite = audioContext.createBiquadFilter();
    this.postCabBite.type = 'peaking';
    this.postCabBite.frequency.value = 3600;
    this.postCabBite.Q.value = 1.0;
    this.postCabBite.gain.value = 1.2;
    
    // ============================================
    // DC BLOCKER (subsonic rumble + offset)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // SAFETY LIMITER (ceiling sem modernizar timbre)
    // ============================================
    this.safetyLimiter = audioContext.createDynamicsCompressor();
    this.safetyLimiter.threshold.value = -1;
    this.safetyLimiter.knee.value = 0;
    this.safetyLimiter.ratio.value = 20;
    this.safetyLimiter.attack.value = 0.003;
    this.safetyLimiter.release.value = 0.05;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x10_open'; // Pro Junior standard 10" speaker
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER OUTPUT
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // ROUTING
    // ============================================
    this.setupRouting();
    this.recreateCabinet();
    
    this.params = {
      // Controls
      volume: 60,
      tone: 60,
      
      // Cabinet
      cabinet_enabled: true,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupRouting() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // SIGNAL PATH
    // ============================================
    // Input → HPF → Preamp stages
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.couplingCap);
    
    // Second gain stage
    this.couplingCap.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // Volume control with bright cap
    this.saturation2.connect(this.volume);
    this.volume.connect(this.brightCap);
    
    // Tone controls
    this.brightCap.connect(this.tone);
    this.tone.connect(this.toneShelf);
    this.toneShelf.connect(this.midBump);
    
    // Rectifier sag → Power supply sag (AudioWorklet)
    this.midBump.connect(this.rectifierSag);
    if (this.powerSag) {
      this.rectifierSag.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.rectifierSag.connect(this.powerAmp);
    }
    
    // Power amp section
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    
    // Pro Junior "bark" character
    this.powerComp.connect(this.bark);
    
    // Output transformer
    this.bark.connect(this.transformerLPF);
    this.transformerLPF.connect(this.transformerHPF);
    
    // Cabinet routing with CabinetSimulator
    this.transformerHPF.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    
    // Post-cabinet bite → DC Block → Master → Safety Limiter → Output
    this.postCabinet.connect(this.postCabBite);
    this.postCabBite.connect(this.dcBlock);
    this.dcBlock.connect(this.master);
    this.master.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.tone.disconnect();
      this.toneShelf.disconnect();
      this.midBump.disconnect();
      this.rectifierSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.bark.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.postCabBite.disconnect();
      this.dcBlock.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (2x 12AX7 - high gain cascade)
    // ============================================
    this.preamp1.gain.value = 3.6; // 4.5 → 3.6 (mais headroom)
    this.preamp2.gain.value = 2.4; // 2.2 → 2.4 (levemente acima)
    
    // ============================================
    // VOLUME
    // ============================================
    this.volume.gain.value = 0.6;
    this.updateBrightCapGain(); // Set initial bright cap
    
    // ============================================
    // POWER AMP (2x EL84)
    // ============================================
    this.powerAmp.gain.value = 1.05; // 1.15 → 1.05 (base, será modulado com volume)
    
    // ============================================
    // MASTER (logarithmic curve for better control)
    // ============================================
    const log01 = v => 0.001 * Math.pow(1000, v);
    this.master.gain.value = log01(0.7);
  }
  
  // Helper function: Bright cap gain depends on volume (more at low volume)
  brightDbFor(volumePercent) {
    // Curva easing para transição mais suave entre 30-50%
    const t = volumePercent / 100;
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // quad in/out
    return (1 - eased) * 6; // Até +6dB (mais musical)
  }
  
  updateBrightCapGain() {
    const now = this.audioContext.currentTime;
    const brightGain = this.brightDbFor(this._currentVolume);
    this.brightCap.gain.setTargetAtTime(brightGain, now, 0.02);
  }
  
  make12AX7Curve() {
    // 12AX7 preamp tubes in Pro Junior - warm, compressed breakup
    const n = 65536; // Alta resolução para transientes suaves
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // 12AX7: High gain factor with smooth compression
      let y = Math.tanh(x * 2.8);
      
      // Pro Junior "warmth" - even-order harmonics
      y += 0.08 * Math.tanh(x * 5);
      
      // Smooth compression (Pro Junior doesn't get too harsh)
      if (Math.abs(y) > 0.45) {
        y *= 0.92;
      }
      
      // Slight asymmetry (Class A single-ended preamp)
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makeEL84Curve() {
    // 2x EL84 tubes in Class AB push-pull (Pro Junior signature sound)
    // EL84s are known for their mid-forward "bark" and sweet compression
    const n = 65536; // Alta resolução para transientes suaves
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // EL84 Class AB characteristic - more aggressive than 6V6
      let y = Math.tanh(x * 1.55);
      
      // EL84 "bark" - mid-range bite
      y += 0.14 * Math.tanh(x * 4.5);
      
      // EL84 harmonics - gritty texture
      y += 0.10 * Math.sin(x * Math.PI * 4);
      y += 0.06 * Math.sin(x * Math.PI * 7);
      
      // Soft clipping when pushed (Pro Junior "sweet spot")
      if (Math.abs(y) > 0.58) {
        const excess = Math.abs(y) - 0.58;
        y = Math.sign(y) * (0.58 + excess * 0.48);
      }
      
      // EL84 asymmetry (push-pull but still has character)
      if (x > 0) y *= 1.10;
      
      curve[i] = y * 0.85;
    }
    return curve;
  }
  
  // ============================================
  // CABINET SIMULATOR
  // ============================================
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
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      // ============================================
      // VOLUME (also affects bright cap gain)
      // ============================================
      case 'volume':
      case 'gain': {
        this._currentVolume = value;
        const t = value / 100;
        
        // Logarithmic taper for natural volume control
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.volume.gain.setTargetAtTime(log01(t), now, 0.01);
        
        // Update bright cap gain based on new volume
        this.updateBrightCapGain();
        
        // Sweet spot vem do POWER AMP (menos no preamp, mais no power)
        this.preamp1.gain.setTargetAtTime(3.6 * (1 + 0.20 * t), now, 0.02); // 20% máx
        this.powerAmp.gain.setTargetAtTime(1.05 + 0.15 * t, now, 0.02); // +15% power feel
        
        // Sag levemente mais profundo com volume alto (se disponível)
        if (this.powerSag && this.powerSag.parameters && this.powerSag.parameters.get('depth')) {
          const targetDepth = 0.12 + 0.05 * t; // 0.12 → 0.17
          this.powerSag.parameters.get('depth').setTargetAtTime(targetDepth, now, 0.05);
        }
        break;
      }
      
      // ============================================
      // TONE CONTROL
      // ============================================
      case 'tone': {
        // Tone control affects both LPF frequency and shelf gain
        // Low tone = darker, High tone = brighter
        const toneValue = value / 100;
        
        // LPF frequency: 3800Hz to 10000Hz (mantém definição mesmo em mínimo)
        const lpfFreq = 3800 + toneValue * 6200;
        this.tone.frequency.setTargetAtTime(lpfFreq, now, 0.01);
        
        // Shelf gain: -3dB to +3dB (mais sutil)
        const shelfGain = (toneValue - 0.5) * 6;
        this.toneShelf.gain.setTargetAtTime(shelfGain, now, 0.01);
        
        // At lower tone settings, reduce mid bump for smoother sound
        const midGain = 1.6 * (0.4 + toneValue * 0.6); // 0.64 to 1.6 dB
        this.midBump.gain.setTargetAtTime(midGain, now, 0.02);
        break;
      }
      
      // ============================================
      // CABINET
      // ============================================
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
      
      // ============================================
      // MASTER (logarithmic curve)
      // ============================================
      case 'master': {
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.master.gain.setTargetAtTime(log01(value / 100), now, 0.01);
        break;
      }
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    
    try {
      // Disconnect all nodes (ordem não importa, mas completa é essencial)
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.tone.disconnect();
      this.toneShelf.disconnect();
      this.midBump.disconnect();
      this.rectifierSag.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.bark.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      
      // Cleanup cabinet
      if (this.cabinet) {
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      }
      
      this.postCabBite.disconnect();
      this.dcBlock.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Alguns nós podem não estar conectados
    }
  }
}

export default FenderProJuniorAmp;

