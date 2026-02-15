import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class OrangeTinyTerrorAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Orange Tiny Terror', 'orange_tiny_terror');
    
    // ORANGE TINY TERROR (2006-present)
    // THE lunchbox legend - Jim Root (Slipknot), Mark Morton (Lamb of God)
    // 7W/15W Class A power (switchable output)
    // Famous for: Simplicity, thick Orange mids, natural compression, huge tone
    // Just 3 controls: Volume, Tone, Gain - yet incredibly versatile
    
    // ============================================
    // INPUT STAGE (High-pass for subsonic cleanup)
    // ============================================
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 45;
    this.inputHPF.Q.value = 0.707;
    
    // ============================================
    // NOISE GATE - AUDIOWORKLET (Dynamic based on gain)
    // TT is noisy but very dynamic - lighter gate at low gain
    // ============================================
    this.noiseGate = this.createNoiseGate({
      thOpen: -50,      // Orange moderate gate (natural feel)
      thClose: -58,     // TRUE HYSTERESIS
      attack: 0.0012,   // 1.2ms attack (quick but musical)
      release: 0.12,    // 120ms release (lets notes bloom)
      rms: 0.020,       // 20ms RMS window
      peakMix: 0.30,    // More RMS (smooth gating)
      floorDb: -60,     // Higher floor for dynamics (was -68)
      holdMs: 8         // Shorter hold for clean/crunch dynamics (was 10)
    });
    
    // ============================================
    // PREAMP (3x 12AX7 cascaded - classic Orange gain)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages with Orange character
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    // Each stage has progressive Orange character
    this.saturation1.curve = this.makeTinyTerrorPreampCurve({drive: 5.8, asym: 1.05});
    this.saturation2.curve = this.makeTinyTerrorPreampCurve({drive: 6.5, asym: 1.08});
    this.saturation3.curve = this.makeTinyTerrorPreampCurve({drive: 7.2, asym: 1.12});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // COUPLING CAPACITORS (Shape low-end between stages)
    // ============================================
    this.couplingCap1 = audioContext.createBiquadFilter();
    this.couplingCap2 = audioContext.createBiquadFilter();
    
    this.couplingCap1.type = 'highpass';
    this.couplingCap1.frequency.value = 95; // Dynamic: opens up at low gain, tightens at high gain
    this.couplingCap1.Q.value = 0.8; // Slightly more resonant for punch
    
    this.couplingCap2.type = 'highpass';
    this.couplingCap2.frequency.value = 110; // Dynamic: tightens before final stage
    this.couplingCap2.Q.value = 0.85; // More resonant for palm-mute definition
    
    // ============================================
    // VOLUME CONTROL
    // ============================================
    this.volume = audioContext.createGain();
    
    // Volume-dependent bright cap (more treble at lower volumes)
    this.brightCap = audioContext.createBiquadFilter();
    this.brightCap.type = 'highshelf';
    this.brightCap.frequency.value = 3800; // Tiny Terror sweet spot
    this.brightCap.gain.value = 0;
    this._currentVolume = 60;
    this._currentGain = 65; // Track current gain for dynamic adjustments
    
    // ============================================
    // ORANGE MIDRANGE CHARACTER (Signature thick mids)
    // ============================================
    this.orangeMidBoost = audioContext.createBiquadFilter();
    this.orangeMidBoost.type = 'peaking';
    this.orangeMidBoost.frequency.value = 900; // Orange mid-forward voice
    this.orangeMidBoost.Q.value = 1.5;
    this.orangeMidBoost.gain.value = 3.2; // Signature Orange thickness
    
    // Additional mid texture (lower mids)
    this.orangeLowMid = audioContext.createBiquadFilter();
    this.orangeLowMid.type = 'peaking';
    this.orangeLowMid.frequency.value = 350;
    this.orangeLowMid.Q.value = 1.2;
    this.orangeLowMid.gain.value = 2.0; // Warmth and body
    
    // ============================================
    // TONE CONTROL (Simple and AGGRESSIVE - TT real is not "polished")
    // toneLPF is the KING - toneShelf/presencePeak are subtle corrections
    // ============================================
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 6500;
    this.toneLPF.Q.value = 0.9; // More aggressive resonance (was 0.8)
    
    // High-shelf for tone control (SUBTLE treble correction)
    this.toneShelf = audioContext.createBiquadFilter();
    this.toneShelf.type = 'highshelf';
    this.toneShelf.frequency.value = 2400;
    this.toneShelf.gain.value = 0;
    
    // Presence-like peak (SUBTLE Tiny Terror air)
    this.presencePeak = audioContext.createBiquadFilter();
    this.presencePeak.type = 'peaking';
    this.presencePeak.frequency.value = 4200;
    this.presencePeak.Q.value = 1.6;
    this.presencePeak.gain.value = 0; // Controlled by tone (more subtle now)
    
    // ============================================
    // POWER AMP (1x EL84 @ 7W or 2x EL84 @ 15W)
    // ============================================
    this.wattage = 15; // 7 or 15
    this.powerScale = audioContext.createGain();
    this.powerScale.gain.value = 1.0;
    
    // POWER SUPPLY SAG - AUDIOWORKLET (EL84 tube rectifier)
    // Tiny Terror is famous for its sag and compression when pushed
    this.powerSag = this.createSagProcessor('tube', {
      depth: 0.16,      // 16% sag (Tiny Terror spongy feel)
      att: 0.009,       // 9ms attack (EL84 character)
      relFast: 0.085,   // 85ms fast recovery
      relSlow: 0.26,    // 260ms slow recovery (blooms beautifully)
      rmsMs: 24.0,      // 24ms RMS window (vintage smooth)
      shape: 1.6,       // Progressive (Orange compression)
      floor: 0.25,      // 25% minimum headroom (heavy sag!)
      peakMix: 0.28     // More RMS-focused (smooth Orange compression)
    });
    
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makeTinyTerrorPowerCurve();
    this.powerSaturation.oversample = '4x';
    
    // Power amp compression (EL84 behavior - very musical)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -13;
    this.powerComp.knee.value = 9; // Soft knee
    this.powerComp.ratio.value = 2.8;
    this.powerComp.attack.value = 0.010;
    this.powerComp.release.value = 0.12;
    
    // ============================================
    // TINY TERROR "BARK" (Signature aggressive mids)
    // ============================================
    this.barkPeak = audioContext.createBiquadFilter();
    this.barkPeak.type = 'peaking';
    this.barkPeak.frequency.value = 1400;
    this.barkPeak.Q.value = 2.0;
    this.barkPeak.gain.value = 2.8; // Tiny Terror bite
    
    // ============================================
    // OUTPUT TRANSFORMER SIMULATION (Small OT - dynamic with wattage)
    // ============================================
    // Small transformer = more midrange focus
    this.transformerLPF = audioContext.createBiquadFilter();
    this.transformerLPF.type = 'lowpass';
    this.transformerLPF.frequency.value = 8200; // Tiny Terror top-end (dynamic: 7.9 kHz @ 7W)
    this.transformerLPF.Q.value = 1.4; // Resonant peak
    
    this.transformerHPF = audioContext.createBiquadFilter();
    this.transformerHPF.type = 'highpass';
    this.transformerHPF.frequency.value = 85;
    this.transformerHPF.Q.value = 0.9;
    
    // Transformer saturation (adds harmonics)
    this.transformerSat = audioContext.createWaveShaper();
    this.transformerSat.curve = this.makeTransformerCurve();
    this.transformerSat.oversample = '4x';
    
    // ============================================
    // DC BLOCKER (Essential for high-gain)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 22;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '1x12_closed'; // Tiny Terror typically into 1x12
    this.micType = 'sm57';
    this.micPosition = 'off_axis'; // Off-axis for more realistic TT tone (was 'edge')
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // POST-CABINET CHARACTER (Mic and room - dynamic with tone)
    // ============================================
    this.postCabBite = audioContext.createBiquadFilter();
    this.postCabBite.type = 'peaking';
    this.postCabBite.frequency.value = 3400;
    this.postCabBite.Q.value = 1.2;
    this.postCabBite.gain.value = 1.5; // SM57 presence bump (dynamic: 1.5 → 2.2 dB with tone)
    
    // ============================================
    // SAFETY LIMITER (Ceiling without crushing dynamics)
    // ============================================
    this.safetyLimiter = audioContext.createDynamicsCompressor();
    this.safetyLimiter.threshold.value = -0.8;
    this.safetyLimiter.knee.value = 0;
    this.safetyLimiter.ratio.value = 20;
    this.safetyLimiter.attack.value = 0.002;
    this.safetyLimiter.release.value = 0.05;
    
    // ============================================
    // MASTER OUTPUT
    // ============================================
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMS (BEFORE SETUP - CRITICAL!)
    // ============================================
    this.params = {
      // Controls (Tiny Terror simplicity!)
      gain: 65,
      volume: 65,
      tone: 60,
      
      // Wattage switch
      wattage: 15, // 7 or 15
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '1x12_closed',
      microphone: 'sm57',
      micPosition: 'off_axis', // TT sounds better off-axis (was 'edge')
      
      // Master
      master: 70
    };
    
    // ============================================
    // ROUTING
    // ============================================
    this.setupRouting();
    this.recreateCabinet();
    this.applyInitialSettings();
  }
  
  setupRouting() {
    // Disconnect all first
    this.disconnectAll();
    
    // ============================================
    // SIGNAL PATH (Tiny Terror signal chain)
    // ============================================
    // Input → Gate → HPF → Preamp cascade
    this.input.connect(this.noiseGate);
    this.noiseGate.connect(this.inputHPF);
    this.inputHPF.connect(this.preamp1);
    
    // Stage 1
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.couplingCap1);
    
    // Stage 2
    this.couplingCap1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.couplingCap2);
    
    // Stage 3
    this.couplingCap2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    
    // Orange midrange character (signature thick tone)
    this.saturation3.connect(this.orangeLowMid);
    this.orangeLowMid.connect(this.orangeMidBoost);
    
    // Volume control with bright cap
    this.orangeMidBoost.connect(this.volume);
    this.volume.connect(this.brightCap);
    
    // Tone controls (simple but effective)
    this.brightCap.connect(this.toneLPF);
    this.toneLPF.connect(this.toneShelf);
    this.toneShelf.connect(this.presencePeak);
    
    // Power section with sag
    if (this.powerSag) {
      this.presencePeak.connect(this.powerSag);
      this.powerSag.connect(this.powerAmp);
    } else {
      this.presencePeak.connect(this.powerAmp);
    }
    
    // Power amp saturation and compression
    this.powerAmp.connect(this.powerScale);
    this.powerScale.connect(this.powerSaturation);
    this.powerSaturation.connect(this.powerComp);
    
    // Tiny Terror "bark" character
    this.powerComp.connect(this.barkPeak);
    
    // Output transformer
    this.barkPeak.connect(this.transformerSat);
    this.transformerSat.connect(this.transformerLPF);
    this.transformerLPF.connect(this.transformerHPF);
    this.transformerHPF.connect(this.dcBlock);
    
    // Cabinet routing with CabinetSimulator
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    
    // Post-cabinet bite → Master → Safety Limiter → Output
    this.postCabinet.connect(this.postCabBite);
    this.postCabBite.connect(this.master);
    this.master.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.output);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.couplingCap2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.orangeLowMid.disconnect();
      this.orangeMidBoost.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.toneLPF.disconnect();
      this.toneShelf.disconnect();
      this.presencePeak.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerScale.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.barkPeak.disconnect();
      this.transformerSat.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      this.postCabBite.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Some nodes may not be connected yet
    }
  }
  
  applyInitialSettings() {
    // ============================================
    // PREAMP (3x 12AX7 - Orange cascade)
    // ============================================
    this.preamp1.gain.value = 4.2; // First stage moderate
    this.preamp2.gain.value = 2.8; // Second stage builds
    this.preamp3.gain.value = 2.2; // Third stage caps it
    
    // ============================================
    // VOLUME
    // ============================================
    this.volume.gain.value = 0.65;
    this.updateBrightCapGain(); // Set initial bright cap
    
    // ============================================
    // POWER AMP (1x or 2x EL84)
    // ============================================
    this.powerAmp.gain.value = 1.10; // Will be modulated with wattage
    this.updateWattageSettings(); // Apply wattage-dependent settings
    
    // ============================================
    // MASTER (logarithmic curve for better control)
    // ============================================
    const log01 = v => 0.001 * Math.pow(1000, v);
    this.master.gain.value = log01(0.7);
  }
  
  // Helper function: Bright cap gain depends on volume (more at low volume)
  brightDbFor(volumePercent) {
    // Orange Tiny Terror bright cap curve
    const t = volumePercent / 100;
    // Smooth easing curve
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return (1 - eased) * 5.5; // Up to +5.5dB (Tiny Terror character)
  }
  
  updateBrightCapGain() {
    const now = this.audioContext.currentTime;
    let brightGain = this.brightDbFor(this._currentVolume);
    
    // LIMIT bright-cap at high gain (avoid fizz) - TT real behavior
    if (this._currentGain !== undefined && this._currentGain > 70) {
      brightGain = Math.min(brightGain, 3.5); // Cap at +3.5 dB instead of 5.5 dB
    }
    
    this.brightCap.gain.setTargetAtTime(brightGain, now, 0.02);
  }
  
  updateWattageSettings() {
    const now = this.audioContext.currentTime;
    
    if (this.wattage === 7) {
      // 7W MODE: 1x EL84, more sag, more compression, earlier breakup, darker
      this.powerScale.gain.setTargetAtTime(0.75, now, 0.02); // Lower output
      this.powerComp.threshold.setTargetAtTime(-10, now, 0.02); // Earlier compression
      this.powerComp.ratio.setTargetAtTime(3.2, now, 0.02); // More squash
      this.transformerLPF.frequency.setTargetAtTime(7850, now, 0.02); // Darker (was 7900)
      
      // More sag in 7W mode (base values - will be increased with volume)
      if (this.powerSag && this.powerSag.parameters) {
        const baseSag = 0.19;
        const baseRelSlow = 0.29;
        
        // If volume > 70, increase sag and slow recovery (7W "breathes" more)
        const volumeFactor = (this._currentVolume > 70) ? 1.0 + ((this._currentVolume - 70) / 100) : 1.0;
        
        this.powerSag.parameters.get('depth').setValueAtTime(Math.min(baseSag * volumeFactor, 0.24), now);
        this.powerSag.parameters.get('relSlow').setValueAtTime(Math.min(baseRelSlow + (volumeFactor - 1.0) * 0.03, 0.35), now);
      }
    } else {
      // 15W MODE: 2x EL84, more headroom, tighter response, brighter
      this.powerScale.gain.setTargetAtTime(1.0, now, 0.02); // Full output
      this.powerComp.threshold.setTargetAtTime(-13, now, 0.02); // More headroom
      this.powerComp.ratio.setTargetAtTime(2.8, now, 0.02); // Less compression
      this.transformerLPF.frequency.setTargetAtTime(8200, now, 0.02); // Brighter
      
      // Standard sag in 15W mode
      if (this.powerSag && this.powerSag.parameters) {
        this.powerSag.parameters.get('depth').setValueAtTime(0.16, now);
        this.powerSag.parameters.get('relSlow').setValueAtTime(0.26, now);
      }
    }
  }
  
  makeTinyTerrorPreampCurve({drive=6.0, asym=1.08} = {}) {
    // Tiny Terror preamp tubes - warm, thick Orange character
    const n = 65536; // High resolution for smooth transients
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // ORANGE THICK SATURATION
      let y = Math.tanh(x * drive);
      
      // ORANGE MIDRANGE CHARACTER (thick, creamy)
      y += 0.16 * Math.tanh(x * 7.5);
      
      // Natural compression (Orange signature)
      if (Math.abs(y) > 0.50) {
        const excess = Math.abs(y) - 0.50;
        y *= (1 - excess * 0.28);
      }
      
      // Warmth and body (even-order harmonics)
      y += 0.10 * Math.sin(x * Math.PI * 3);
      
      // Orange harmonic texture
      y += 0.06 * Math.sin(x * Math.PI * 5);
      
      // Asymmetry (Orange character)
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.86;
    }
    return curve;
  }
  
  makeTinyTerrorPowerCurve() {
    // 1x or 2x EL84 tubes (Class A) - Tiny Terror signature sound
    // EL84s are known for their aggressive mids and sweet compression
    const n = 65536; // High resolution for smooth transients
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // EL84 Class A characteristic (Tiny Terror runs hot!)
      let y = Math.tanh(x * 1.65);
      
      // EL84 "bark" - aggressive mid-range bite
      y += 0.16 * Math.tanh(x * 4.8);
      
      // EL84 harmonics - gritty Orange texture
      y += 0.12 * Math.sin(x * Math.PI * 4);
      y += 0.08 * Math.sin(x * Math.PI * 7);
      
      // Tiny Terror soft clipping (musical breakup)
      if (Math.abs(y) > 0.60) {
        const excess = Math.abs(y) - 0.60;
        y = Math.sign(y) * (0.60 + excess * 0.50);
      }
      
      // EL84 asymmetry (Class A push-pull)
      if (x > 0) y *= 1.13;
      
      // Orange warmth
      y += 0.07 * Math.sin(x * Math.PI * 2);
      
      curve[i] = y * 0.84;
    }
    return curve;
  }
  
  makeTransformerCurve() {
    // Small output transformer - adds harmonics and compression
    const n = 8192; // Lower resolution is fine for transformer
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / n * 2 - 1;
      
      // Transformer saturation (very subtle)
      let y = Math.tanh(x * 1.08);
      
      // Core saturation (adds warmth)
      if (Math.abs(y) > 0.75) {
        const excess = Math.abs(y) - 0.75;
        y = Math.sign(y) * (0.75 + excess * 0.82);
      }
      
      // Transformer harmonics
      y += 0.04 * Math.sin(x * Math.PI * 3);
      
      curve[i] = y * 0.98;
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
      // GAIN CONTROL
      // ============================================
      case 'gain': {
        this._currentGain = value;
        const t = value / 100;
        
        // Logarithmic taper for natural gain control
        const log01 = v => 0.001 * Math.pow(1000, v);
        const gainFactor = log01(t);
        
        // Distribute gain across preamp stages
        this.preamp1.gain.setTargetAtTime(4.2 * (1 + 1.8 * t), now, 0.02);
        this.preamp2.gain.setTargetAtTime(2.8 * (1 + 1.2 * t), now, 0.02);
        this.preamp3.gain.setTargetAtTime(2.2 * (1 + 0.8 * t), now, 0.02);
        
        // Orange mid boost grows with gain (signature Orange character)
        const midGain = 3.2 + (t * 1.5); // 3.2 → 4.7 dB
        this.orangeMidBoost.gain.setTargetAtTime(midGain, now, 0.02);
        
        // LOW-MID TRIM when gain high (avoid embolo) - TT real behavior
        const lowMidGain = (value > 70) ? 1.4 : 2.0; // Reduce from 2.0 to 1.4 dB
        const lowMidFreq = (value > 70) ? 300 : 350; // Lower freq slightly
        this.orangeLowMid.gain.setTargetAtTime(lowMidGain, now, 0.02);
        this.orangeLowMid.frequency.setTargetAtTime(lowMidFreq, now, 0.02);
        
        // Bark peak intensity with gain
        const barkGain = 2.8 * (0.7 + t * 0.3); // 1.96 to 2.8 dB
        this.barkPeak.gain.setTargetAtTime(barkGain, now, 0.02);
        
        // DYNAMIC HPFs for palm-mute punch (TT real: firms up bass with gain)
        // gain ≤ 50: ~90-95 Hz / ~105 Hz
        // gain ≥ 75: ~120-130 Hz / ~130-140 Hz
        const hp1 = t < 0.75 ? 95 + (t * 20) : 115 + ((t - 0.75) * 60); // 95 → ~130 Hz
        const hp2 = t < 0.75 ? 110 + (t * 20) : 130 + ((t - 0.75) * 60); // 110 → ~145 Hz
        const hpQ = 0.8 + (t * 0.1); // Q increases slightly with gain (0.8 → 0.9)
        
        this.couplingCap1.frequency.setTargetAtTime(hp1, now, 0.03);
        this.couplingCap2.frequency.setTargetAtTime(hp2, now, 0.03);
        this.couplingCap1.Q.setTargetAtTime(hpQ, now, 0.03);
        this.couplingCap2.Q.setTargetAtTime(hpQ + 0.05, now, 0.03);
        
        // Update bright cap (gain affects bright cap limit)
        this.updateBrightCapGain();
        break;
      }
      
      // ============================================
      // VOLUME CONTROL (also affects bright cap gain)
      // ============================================
      case 'volume': {
        this._currentVolume = value;
        const t = value / 100;
        
        // Logarithmic taper for natural volume control
        const log01 = v => 0.001 * Math.pow(1000, v);
        this.volume.gain.setTargetAtTime(log01(t), now, 0.01);
        
        // Update bright cap gain based on new volume
        this.updateBrightCapGain();
        
        // Power amp push at high volume (Tiny Terror character)
        const powerGain = 1.10 + (t * 0.15); // 1.10 → 1.25
        this.powerAmp.gain.setTargetAtTime(powerGain, now, 0.02);
        
        // Update wattage settings (which handles sag based on volume in 7W mode)
        this.updateWattageSettings();
        break;
      }
      
      // ============================================
      // TONE CONTROL
      // ============================================
      case 'tone': {
        // Tone control affects LPF frequency (KING), shelf/presence (SUBTLE)
        const toneValue = value / 100;
        
        // LPF frequency: 4500Hz to 9000Hz (AGGRESSIVE TT tone)
        const lpfFreq = 4500 + toneValue * 4500;
        this.toneLPF.frequency.setTargetAtTime(lpfFreq, now, 0.01);
        
        // Shelf gain: -3dB to +3dB (SUBTLE - was ±4dB)
        const shelfGain = (toneValue - 0.5) * 6;
        this.toneShelf.gain.setTargetAtTime(shelfGain, now, 0.01);
        
        // Presence peak: 0 to +2dB (SUBTLE - was +3dB)
        const presenceGain = Math.max(0, (toneValue - 0.5) * 4);
        this.presencePeak.gain.setTargetAtTime(presenceGain, now, 0.01);
        
        // POST-CABINET BITE adapts to tone (TT + V30 characteristic)
        // When tone > 65, boost post-cab presence (1.5 → 2.2 dB)
        const postCabGain = value > 65 ? 1.8 + ((value - 65) / 35 * 0.4) : 1.5;
        this.postCabBite.gain.setTargetAtTime(postCabGain, now, 0.02);
        
        // At lower tone settings, reduce mid boost for smoother sound
        const midReduction = 3.2 * (0.5 + toneValue * 0.5); // 1.6 to 3.2 dB
        this.orangeMidBoost.gain.setTargetAtTime(midReduction, now, 0.02);
        break;
      }
      
      // ============================================
      // WATTAGE SWITCH (7W / 15W)
      // ============================================
      case 'wattage':
        this.wattage = parseInt(value);
        this.updateWattageSettings();
        break;
      
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
      // Disconnect all nodes
      this.noiseGate.disconnect();
      this.inputHPF.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.couplingCap1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.couplingCap2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.orangeLowMid.disconnect();
      this.orangeMidBoost.disconnect();
      this.volume.disconnect();
      this.brightCap.disconnect();
      this.toneLPF.disconnect();
      this.toneShelf.disconnect();
      this.presencePeak.disconnect();
      if (this.powerSag) this.powerSag.disconnect();
      this.powerAmp.disconnect();
      this.powerScale.disconnect();
      this.powerSaturation.disconnect();
      this.powerComp.disconnect();
      this.barkPeak.disconnect();
      this.transformerSat.disconnect();
      this.transformerLPF.disconnect();
      this.transformerHPF.disconnect();
      this.dcBlock.disconnect();
      this.preCabinet.disconnect();
      this.postCabinet.disconnect();
      
      // Cleanup cabinet
      if (this.cabinet) {
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      }
      
      this.postCabBite.disconnect();
      this.master.disconnect();
      this.safetyLimiter.disconnect();
    } catch (e) {
      // Some nodes may not be connected
    }
  }
}

export default OrangeTinyTerrorAmp;

