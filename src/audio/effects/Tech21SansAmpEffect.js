import BaseEffect from './BaseEffect';

class Tech21SansAmpEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tech 21 SansAmp', 'tech21sansamp');
    
    // TECH 21 SANSAMP - Legendary amp simulator / DI
    // Direct recording amp simulation — designed for 100% wet
    
    // Curve cache (step=1, 16384 samples, ~6.4KB each)
    this._curveCache = new Map();
    
    // Pre-drive HPF (tightness)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 80;
    this.preHPF.Q.value = 0.707;
    
    // Drive trim (0.8–2.0, NOT the main saturation — curve handles that)
    this.drive = audioContext.createGain();
    this.drive.gain.value = 1.0;
    
    // Anti-aliasing before preamp
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 18000;
    this.antiAlias.Q.value = 0.707;
    
    // Preamp stage (main saturation)
    this.preamp = audioContext.createWaveShaper();
    this.preamp.oversample = '4x';
    this.preamp.curve = this._getCachedCurve(50);
    
    // DC blocker
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 10;
    this.dcBlock.Q.value = 0.707;
    
    // =========================================
    // TONE STACK (EQ)
    // =========================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 800;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // Presence
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4200;
    this.presence.gain.value = 0;
    
    // =========================================
    // CABINET SIM (improved: HPF + LPF + resonance + notch)
    // =========================================
    // Cab HPF — speaker doesn't reproduce sub bass
    this.cabHPF = audioContext.createBiquadFilter();
    this.cabHPF.type = 'highpass';
    this.cabHPF.frequency.value = 100;
    this.cabHPF.Q.value = 0.8;
    
    // Cab LPF — speaker cone rolloff
    this.cabinet = audioContext.createBiquadFilter();
    this.cabinet.type = 'lowpass';
    this.cabinet.frequency.value = 5000;
    this.cabinet.Q.value = 0.707;
    
    // Cab resonance — speaker midrange "body"
    this.cabRes = audioContext.createBiquadFilter();
    this.cabRes.type = 'peaking';
    this.cabRes.frequency.value = 3000;
    this.cabRes.Q.value = 1.2;
    this.cabRes.gain.value = 2.5;
    
    // Cab notch — removes harshness/fizz region
    this.cabNotch = audioContext.createBiquadFilter();
    this.cabNotch.type = 'peaking';
    this.cabNotch.frequency.value = 4000;
    this.cabNotch.Q.value = 1.5;
    this.cabNotch.gain.value = -3;
    
    // Post cab rolloffs
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;
    this.postHPF.Q.value = 0.707;
    
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 6500;
    this.postLPF.Q.value = 0.707;
    
    // Level (output)
    this.level = audioContext.createGain();
    this.level.gain.value = 0.7;
    
    // Output limiter (transparent peak catcher)
    this.outLimiter = audioContext.createDynamicsCompressor();
    this.outLimiter.threshold.value = -2;
    this.outLimiter.knee.value = 0;
    this.outLimiter.ratio.value = 12;
    this.outLimiter.attack.value = 0.003;
    this.outLimiter.release.value = 0.08;
    
    // Track ALL params for cross-recalculation
    this.params = {
      drive: 50,
      level: 70,
      bass: 50,
      mid: 50,
      treble: 50,
      presence: 50,
      character: 50, // Marshall default (middle)
    };
    
    // Character offset storage (applied on top of user EQ)
    this._charOffsets = { bass: 0, mid: 0, treble: 0 };
    
    // =========================================
    // SIGNAL CHAIN:
    // input → preHPF → drive(trim) → antiAlias → preamp → dcBlock
    // → bass → mid → treble → presence
    // → cabHPF → cabinet → cabRes → cabNotch → postHPF → postLPF
    // → level → outLimiter → wetGain → output
    // =========================================
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.drive);
    this.drive.connect(this.antiAlias);
    this.antiAlias.connect(this.preamp);
    this.preamp.connect(this.dcBlock);
    this.dcBlock.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.cabHPF);
    this.cabHPF.connect(this.cabinet);
    this.cabinet.connect(this.cabRes);
    this.cabRes.connect(this.cabNotch);
    this.cabNotch.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.level);
    this.level.connect(this.outLimiter);
    this.outLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // SansAmp is a DI/amp sim — default 100% wet (no dry blend)
    // dryGain is 0 by default from BaseEffect, which is correct here
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Apply initial voicing so audio matches params/UI from the start
    this.updateParameter('character', this.params.character);
    this.updateParameter('presence', this.params.presence);
    this._recalcLevel();
  }
  
  // =========================================
  // CURVE CACHE (step=1, 16384 samples, clamped to ±1)
  // =========================================
  _getCachedCurve(drive) {
    const key = Math.round(drive);
    if (!this._curveCache.has(key)) {
      this._curveCache.set(key, this._makeSansAmpCurve(key));
    }
    return this._curveCache.get(key);
  }
  
  _makeSansAmpCurve(drive) {
    const samples = 16384;
    const curve = new Float32Array(samples);
    const driveAmount = 1 + (drive / 20);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * driveAmount;
      
      // SansAmp-style saturation (solid-state with tube character)
      y = Math.tanh(y * 2);
      
      // Subtle 2nd harmonic for warmth
      y += 0.06 * Math.tanh(x * driveAmount * 4);
      
      // Subtle compression
      y *= (1 - Math.abs(x) * 0.15);
      
      // Slight asymmetry
      if (x > 0) {
        y *= 1.05;
      }
      
      // Clamp to ±1 to avoid clipping artifacts across browsers
      curve[i] = Math.max(-1, Math.min(1, y * 0.9));
    }
    
    return curve;
  }
  
  // Public API (backward compat)
  makeSansAmpCurve(drive) {
    return this._getCachedCurve(drive);
  }
  
  // =========================================
  // LEVEL (makeup-aware)
  // =========================================
  _recalcLevel() {
    const now = this.audioContext.currentTime;
    const d = this.params.drive;
    const lvl = this.params.level;
    // Smoother makeup curve: less drop at low drive, more at high
    // quadratic: 0.85 at drive=0, 0.55 at drive=100
    const makeup = 0.85 - 0.30 * Math.pow(d / 100, 1.5);
    const target = (lvl / 100) * makeup;
    this.level.gain.setTargetAtTime(target, now, 0.04);
  }
  
  // =========================================
  // EQ with character offsets
  // =========================================
  _applyEQ() {
    const now = this.audioContext.currentTime;
    const p = this.params;
    const o = this._charOffsets;
    
    // User knob value (-10..+10 dB) + character offset, clamped to ±12 dB
    const clamp = (v) => Math.max(-12, Math.min(12, v));
    this.bass.gain.setTargetAtTime(clamp((p.bass - 50) / 5 + o.bass), now, 0.01);
    this.mid.gain.setTargetAtTime(clamp((p.mid - 50) / 5 + o.mid), now, 0.01);
    this.treble.gain.setTargetAtTime(clamp((p.treble - 50) / 5 + o.treble), now, 0.01);
  }
  
  // =========================================
  // PARAMETER UPDATES
  // =========================================
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    // Clamp all knob inputs to 0..100 (UI safety net)
    value = Math.max(0, Math.min(100, value));
    
    switch (parameter) {
      case 'drive': {
        const d = value;
        this.params.drive = d;
        
        // Drive trim: 0.8 at d=0, 2.0 at d=100 (curve is the main saturation)
        this.drive.gain.setTargetAtTime(0.8 + (d / 100) * 1.2, now, 0.01);
        this.preamp.curve = this._getCachedCurve(d);
        this._recalcLevel();
        break;
      }
      case 'bass':
        this.params.bass = value;
        this._applyEQ();
        break;
      case 'mid':
        this.params.mid = value;
        this._applyEQ();
        break;
      case 'treble':
        this.params.treble = value;
        this._applyEQ();
        break;
      case 'presence':
        this.params.presence = value;
        this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'level':
        this.params.level = value;
        this._recalcLevel();
        break;
      case 'character': {
        this.params.character = value;
        
        // Character acts as EQ OFFSET — doesn't clobber user knob positions
        if (value < 33) {
          // Fender-style (scooped mids, bright, sparkly)
          this.mid.frequency.setTargetAtTime(500, now, 0.01);
          this._charOffsets = { bass: 2, mid: -4, treble: 4 };
          this.cabinet.frequency.setTargetAtTime(6000, now, 0.02);
          this.cabRes.frequency.setTargetAtTime(2800, now, 0.02);
        } else if (value < 66) {
          // Marshall-style (mid-forward, aggressive, crunchy)
          this.mid.frequency.setTargetAtTime(800, now, 0.01);
          this._charOffsets = { bass: 1, mid: 3, treble: 2 };
          this.cabinet.frequency.setTargetAtTime(5000, now, 0.02);
          this.cabRes.frequency.setTargetAtTime(3200, now, 0.02);
        } else {
          // Vox-style (chime, jangle, upper-mid focus)
          this.mid.frequency.setTargetAtTime(1200, now, 0.01);
          this._charOffsets = { bass: 0, mid: 1.5, treble: 5 };
          this.cabinet.frequency.setTargetAtTime(7000, now, 0.02);
          this.cabRes.frequency.setTargetAtTime(3400, now, 0.02);
        }
        // Re-apply EQ with new offsets
        this._applyEQ();
        break;
      }
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.preHPF.disconnect();
      this.drive.disconnect();
      this.antiAlias.disconnect();
      this.preamp.disconnect();
      this.dcBlock.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.cabHPF.disconnect();
      this.cabinet.disconnect();
      this.cabRes.disconnect();
      this.cabNotch.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.level.disconnect();
      this.outLimiter.disconnect();
    } catch (e) {}
    // Free cache
    this._curveCache.clear();
  }
}

export default Tech21SansAmpEffect;
