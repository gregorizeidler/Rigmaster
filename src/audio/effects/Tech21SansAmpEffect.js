import BaseEffect from './BaseEffect';

class Tech21SansAmpEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tech 21 SansAmp', 'tech21sansamp');
    
    // TECH 21 SANSAMP - Legendary amp simulator
    // Direct recording amp simulation, no amp/cab needed
    
    // Pre-drive HPF (tightness - removes bass bloat before saturation)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 80;
    this.preHPF.Q.value = 0.707;
    
    // Input drive
    this.drive = audioContext.createGain();
    this.drive.gain.value = 1.5;
    
    // Anti-aliasing filter before preamp (lowpass 18kHz)
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 18000;
    this.antiAlias.Q.value = 0.707;
    
    // Preamp stage
    this.preamp = audioContext.createWaveShaper();
    this.preamp.oversample = '4x';
    this.preamp.curve = this.makeSansAmpCurve(50);
    
    // DC blocker (removes DC offset from waveshaper)
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 10;
    this.dcBlock.Q.value = 0.707;
    
    // Tone stack (Fender/Marshall/Vox style selectable)
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
    
    // Presence (high-shelf for more "air", less nasal)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4200;
    this.presence.gain.value = 0;
    
    // Cabinet simulation (speaker sim)
    this.cabinet = audioContext.createBiquadFilter();
    this.cabinet.type = 'lowpass';
    this.cabinet.frequency.value = 5000;
    this.cabinet.Q.value = 0.707;
    
    // Cabinet resonance (emulates speaker cone resonance peak)
    this.cabRes = audioContext.createBiquadFilter();
    this.cabRes.type = 'peaking';
    this.cabRes.frequency.value = 3000;
    this.cabRes.Q.value = 1.2;
    this.cabRes.gain.value = 2.5;
    
    // Post-processing filters (anti-aliasing)
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 60;
    this.postHPF.Q.value = 0.707;
    
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 6500;
    this.postLPF.Q.value = 0.707;
    
    // Level
    this.level = audioContext.createGain();
    this.level.gain.value = 0.7;
    
    // Output limiter (transparent, just catches peaks)
    this.outLimiter = audioContext.createDynamicsCompressor();
    this.outLimiter.threshold.value = -2;
    this.outLimiter.knee.value = 0;
    this.outLimiter.ratio.value = 12;
    this.outLimiter.attack.value = 0.003;
    this.outLimiter.release.value = 0.08;
    
    // Chain: input -> preHPF -> drive -> antiAlias -> preamp -> dcBlock -> EQ -> presence -> cabinet -> cabRes -> postHPF -> postLPF -> level -> limiter -> wetGain
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.drive);
    this.drive.connect(this.antiAlias);
    this.antiAlias.connect(this.preamp);
    this.preamp.connect(this.dcBlock);
    this.dcBlock.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.cabinet);
    this.cabinet.connect(this.cabRes);
    this.cabRes.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.level);
    this.level.connect(this.outLimiter);
    this.outLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeSansAmpCurve(drive) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const driveAmount = 1 + (drive / 20);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * driveAmount;
      
      // SansAmp-style saturation (solid-state with tube character)
      y = Math.tanh(y * 2);
      
      // Add subtle 2nd harmonic for more "tubey" warmth
      y += 0.06 * Math.tanh(x * driveAmount * 4);
      
      // Add subtle compression
      y *= (1 - Math.abs(x) * 0.15);
      
      // Slight asymmetry
      if (x > 0) {
        y *= 1.05;
      }
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'drive': {
        const d = Math.max(0, Math.min(100, value));
        this.drive.gain.setTargetAtTime(1 + (d / 50), now, 0.01);
        this.preamp.curve = this.makeSansAmpCurve(d);
        
        // Store drive for makeup gain calculation
        if (!this.params) this.params = {};
        this.params.drive = d;
        
        // Auto-makeup gain: compensate volume as drive increases
        const makeup = 0.8 - 0.25 * (d / 100); // 0.8 -> 0.55
        const levelParam = this.params?.level ?? 70;
        const target = (levelParam / 100) * makeup;
        this.level.gain.setTargetAtTime(target, now, 0.02);
        break;
      }
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 5, now, 0.01);
        break;
      case 'level': {
        // Store level for makeup gain calculation
        if (!this.params) this.params = {};
        this.params.level = value;
        
        // Apply with current makeup compensation
        const driveParam = this.params?.drive ?? 50;
        const makeup = 0.8 - 0.25 * (driveParam / 100);
        const target = (value / 100) * makeup;
        this.level.gain.setTargetAtTime(target, now, 0.01);
        break;
      }
      case 'character':
        // Character selector (amp voicing) - complete signature
        if (value < 33) {
          // Fender-style (scooped mids, bright, sparkly)
          this.mid.frequency.setTargetAtTime(500, now, 0.01);
          this.mid.gain.setTargetAtTime(-4, now, 0.01);
          this.bass.gain.setTargetAtTime(2, now, 0.01);
          this.treble.gain.setTargetAtTime(4, now, 0.01);
          this.cabinet.frequency.setTargetAtTime(6000, now, 0.01);
          this.cabRes.frequency.setTargetAtTime(2800, now, 0.01);
        } else if (value < 66) {
          // Marshall-style (mid-forward, aggressive, crunchy)
          this.mid.frequency.setTargetAtTime(800, now, 0.01);
          this.mid.gain.setTargetAtTime(3, now, 0.01);
          this.bass.gain.setTargetAtTime(1, now, 0.01);
          this.treble.gain.setTargetAtTime(2, now, 0.01);
          this.cabinet.frequency.setTargetAtTime(5000, now, 0.01);
          this.cabRes.frequency.setTargetAtTime(3200, now, 0.01);
        } else {
          // Vox-style (chime, jangle, upper-mid focus)
          this.mid.frequency.setTargetAtTime(1200, now, 0.01);
          this.mid.gain.setTargetAtTime(1.5, now, 0.01);
          this.bass.gain.setTargetAtTime(0, now, 0.01);
          this.treble.gain.setTargetAtTime(5, now, 0.01);
          this.cabinet.frequency.setTargetAtTime(7000, now, 0.01);
          this.cabRes.frequency.setTargetAtTime(3400, now, 0.01);
        }
        break;
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
      this.cabinet.disconnect();
      this.cabRes.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.level.disconnect();
      this.outLimiter.disconnect();
    } catch (e) {}
  }
}

export default Tech21SansAmpEffect;

