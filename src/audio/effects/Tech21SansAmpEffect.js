import BaseEffect from './BaseEffect';

class Tech21SansAmpEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Tech 21 SansAmp', 'tech21sansamp');
    
    // TECH 21 SANSAMP - Legendary amp simulator
    // Direct recording amp simulation, no amp/cab needed
    
    // Input drive
    this.drive = audioContext.createGain();
    this.drive.gain.value = 1.5;
    
    // Preamp stage
    this.preamp = audioContext.createWaveShaper();
    this.preamp.oversample = '4x';
    this.preamp.curve = this.makeSansAmpCurve(50);
    
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
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // Presence (high-frequency boost)
    this.presence = audioContext.createBiquadFilter();
    this.presence.type = 'peaking';
    this.presence.frequency.value = 3500;
    this.presence.Q.value = 2.0;
    this.presence.gain.value = 0;
    
    // Cabinet simulation (speaker sim)
    this.cabinet = audioContext.createBiquadFilter();
    this.cabinet.type = 'lowpass';
    this.cabinet.frequency.value = 5000;
    this.cabinet.Q.value = 0.707;
    
    // Level
    this.level = audioContext.createGain();
    this.level.gain.value = 0.7;
    
    // Chain
    this.input.connect(this.drive);
    this.drive.connect(this.preamp);
    this.preamp.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.presence);
    this.presence.connect(this.cabinet);
    this.cabinet.connect(this.level);
    this.level.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeSansAmpCurve(drive) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const driveAmount = 1 + (drive / 20);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * driveAmount;
      
      // SansAmp-style saturation (solid-state with tube character)
      y = Math.tanh(y * 2);
      
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
      case 'drive':
        this.drive.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        this.preamp.curve = this.makeSansAmpCurve(value);
        break;
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
      case 'level':
        this.level.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'character':
        // Character selector (amp voicing)
        if (value < 33) {
          // Fender-style (scooped, bright)
          this.mid.gain.value = -3;
          this.treble.gain.value = 4;
          this.cabinet.frequency.value = 6000;
        } else if (value < 66) {
          // Marshall-style (mid-forward, aggressive)
          this.mid.gain.value = 3;
          this.treble.gain.value = 2;
          this.cabinet.frequency.value = 5000;
        } else {
          // Vox-style (chimey, jangly)
          this.mid.gain.value = 1;
          this.treble.gain.value = 5;
          this.cabinet.frequency.value = 7000;
        }
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.drive.disconnect();
      this.preamp.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.cabinet.disconnect();
      this.level.disconnect();
    } catch (e) {}
  }
}

export default Tech21SansAmpEffect;

