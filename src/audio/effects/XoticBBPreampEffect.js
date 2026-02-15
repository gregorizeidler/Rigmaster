import BaseEffect from './BaseEffect';

/**
 * XoticBBPreampEffect - Xotic BB Preamp
 * 
 * Classic always-on preamp/overdrive
 * Used by: Andy Timmons, session players worldwide
 * 
 * Features:
 * - Clean boost to mild overdrive
 * - Active 2-band EQ (±15 dB)
 * - Transparent character with vintage warmth
 * - Low noise floor
 * 
 * Controls:
 * - Gain: Controls saturation and compression level
 * - Volume: Defines output volume
 * - Treble: Active high-frequency EQ (±15 dB)
 * - Bass: Active low-frequency EQ (±15 dB)
 */

class XoticBBPreampEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Xotic BB Preamp', 'xoticbb');
    
    // Curve cache (Map, step=1, 8192 samples)
    this._curveCache = new Map();
    
    // Track all params for cross-recalculation
    this.params = {
      gain: 35,
      level: 70,
      bass: 50,
      treble: 50,
    };
    
    // High-pass filter (tightness — interacts with gain)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 60;
    this.preHPF.Q.value = 0.707;
    
    // Input gain stage (drive trim)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.2;
    
    // Anti-alias pre-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // Preamp saturation (op-amp + diode clipping)
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.oversample = '4x';
    // Set default curve immediately (avoids 1-frame null if audio arrives early)
    this.preampShaper.curve = this._getCachedCurve(55, 0.12);
    
    // DC blocker (post-clipping)
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // Post-drive LPF (smoothness — dynamic with gain)
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 8000;
    this.postLPF.Q.value = 0.707;
    
    // Active EQ (2-band Baxandall-style)
    this.bassFilter = audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;
    this.bassFilter.gain.value = 0;
    
    this.trebleFilter = audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 3500;
    this.trebleFilter.gain.value = 0;
    
    // Mid focus (musical presence — dynamic with gain)
    this.midFilter = audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 900;
    this.midFilter.Q.value = 0.7;
    this.midFilter.gain.value = 1.5;
    
    // =========================================
    // SEPARATED GAIN STAGES:
    //   makeupGain — auto compensation (controlled by gain knob)
    //   levelGain  — user volume knob (independent)
    // This prevents level/gain from "fighting" each other.
    // =========================================
    this.makeupGain = audioContext.createGain();
    this.makeupGain.gain.value = 1.0;
    
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 0.7;
    
    // Output limiter — soft protection (not aggressive brick-wall)
    this.outLimiter = audioContext.createDynamicsCompressor();
    this.outLimiter.threshold.value = -6;
    this.outLimiter.knee.value = 8;
    this.outLimiter.ratio.value = 6;
    this.outLimiter.attack.value = 0.003;
    this.outLimiter.release.value = 0.08;
    
    // =========================================
    // SIGNAL CHAIN:
    // input → preHPF → inputGain → antiAliasLPF → preampShaper → dcBlock
    //       → postLPF → bassFilter → trebleFilter → midFilter
    //       → makeupGain → levelGain → outLimiter → wetGain → output
    // =========================================
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preampShaper);
    this.preampShaper.connect(this.dcBlock);
    this.dcBlock.connect(this.postLPF);
    this.postLPF.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.midFilter);
    this.midFilter.connect(this.makeupGain);
    this.makeupGain.connect(this.levelGain);
    this.levelGain.connect(this.outLimiter);
    this.outLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // BB Preamp is an overdrive — 100% wet, no dry path needed
    // (dryGain left disconnected to save CPU)
    
    // Apply initial state so audio matches params/UI from the start
    this.updateParameter('gain', this.params.gain);
    this.updateParameter('level', this.params.level);
    this.updateParameter('bass', this.params.bass);
    this.updateParameter('treble', this.params.treble);
  }
  
  // =========================================
  // CURVE CACHE (step=1, 8192 samples, clamped ±1)
  // =========================================
  _getCachedCurve(drive, asym) {
    // Composite key: drive + asym (future-proof if asym formula changes)
    const key = `${Math.round(drive)}_${Math.round(asym * 1000)}`;
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makePreampCurve(Math.round(drive), asym));
    }
    return this._curveCache.get(key);
  }
  
  /**
   * Internal: Creates preamp curve with op-amp + diode clipping
   * @param {number} drive - Drive amount (0-100)
   * @param {number} asym - Asymmetry factor (0-0.2)
   */
  _makePreampCurve(drive = 35, asym = 0.12) {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const gain = 1 + drive / 25;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Op-amp stage: soft clipping
      let y = Math.tanh(x * gain * 1.6);
      
      // Diode stage: adds even harmonics
      y += 0.08 * Math.tanh(x * gain * 4.5);
      
      // Asymmetry (diode forward voltage mismatch)
      y *= (x >= 0) ? (1 + asym) : (1 - asym * 0.7);
      
      // Compression dependent on amplitude
      y *= (1 - 0.12 * Math.min(1, Math.abs(x)));
      
      // Clamp to ±1 (prevents browser-dependent clipping artifacts)
      curve[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    
    return curve;
  }
  
  /**
   * Public API (compat) — returns cached curve
   */
  makePreampCurve(drive, asym) {
    return this._getCachedCurve(drive, asym);
  }
  
  // =========================================
  // MAKEUP GAIN (auto compensation for drive level)
  // =========================================
  _recalcMakeup() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    // Non-linear: less drop at low drive, more at high
    const makeup = 0.90 - 0.35 * Math.pow(g / 100, 1.4);
    this.makeupGain.gain.setTargetAtTime(makeup, now, 0.03);
  }
  
  // =========================================
  // DYNAMIC FILTERS (respond to gain setting)
  // =========================================
  _updateDynamicFilters() {
    const now = this.audioContext.currentTime;
    const g = this.params.gain;
    const t = g / 100; // 0..1
    
    // HPF: tighter at high gain (60 → 75 Hz)
    this.preHPF.frequency.setTargetAtTime(60 + t * 15, now, 0.02);
    
    // Post-LPF: darker at high gain (9k → 6.5k)
    this.postLPF.frequency.setTargetAtTime(9000 - t * 2500, now, 0.02);
    
    // Mid push: slightly more with gain (1.5 → 2.5 dB)
    this.midFilter.gain.setTargetAtTime(1.5 + t * 1.0, now, 0.02);
  }
  
  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    // Clamp all knob inputs to 0..100
    value = Math.max(0, Math.min(100, value));
    
    switch (param) {
      case 'gain': {
        this.params.gain = value;
        const g = value;
        
        // Drive trim: 0.5 at g=0, 2.5 at g=100
        this.inputGain.gain.setTargetAtTime(0.5 + (g / 100) * 2, now, 0.01);
        
        // Update clipping curve (cached, no re-alloc unless new integer)
        const asym = 0.1 + 0.1 * (g / 100);
        this.preampShaper.curve = this._getCachedCurve(30 + 0.7 * g, asym);
        
        // Auto-makeup (separate from level)
        this._recalcMakeup();
        
        // Dynamic filter adjustments
        this._updateDynamicFilters();
        break;
      }
      
      case 'bass':
        this.params.bass = value;
        // Active EQ: ±15 dB range (0-100 → -15 to +15 dB)
        this.bassFilter.gain.setTargetAtTime((value - 50) * 0.3, now, 0.01);
        break;
      
      case 'treble':
        this.params.treble = value;
        // Active EQ: ±15 dB range
        this.trebleFilter.gain.setTargetAtTime((value - 50) * 0.3, now, 0.01);
        break;
      
      case 'level':
        this.params.level = value;
        // User volume knob — independent from makeup
        this.levelGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      default:
        super.updateParameter?.(param, value);
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.inputGain.disconnect();
      this.antiAliasLPF.disconnect();
      this.preampShaper.disconnect();
      this.dcBlock.disconnect();
      this.postLPF.disconnect();
      this.bassFilter.disconnect();
      this.trebleFilter.disconnect();
      this.midFilter.disconnect();
      this.makeupGain.disconnect();
      this.levelGain.disconnect();
      this.outLimiter.disconnect();
    } catch (e) {
      // Already disconnected
    }
    // Free cache
    this._curveCache.clear();
  }
}

export default XoticBBPreampEffect;
