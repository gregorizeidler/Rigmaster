import BaseEffect from './BaseEffect';

class MesaBoogieVTwinEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa V-Twin', 'mesavtwin');
    
    // MESA BOOGIE V-TWIN - Legendary rack preamp
    // Dual-channel tube preamp simulation
    
    // Input gain (clean channel)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Stage 1: Input stage (12AX7 sim)
    this.stage1 = audioContext.createWaveShaper();
    this.stage1.oversample = '4x';
    this.stage1.curve = this.makeTubeCurve(30);
    
    // Stage 2: Gain stage (12AX7 sim)
    this.stage2 = audioContext.createWaveShaper();
    this.stage2.oversample = '4x';
    this.stage2.curve = this.makeTubeCurve(60);
    
    // Stage 3: Power amp stage (6L6 sim)
    this.stage3 = audioContext.createWaveShaper();
    this.stage3.oversample = '4x';
    this.stage3.curve = this.makeTubeCurve(40);
    
    // EQ Section (Mesa graphic EQ style)
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    this.presence = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 750;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    this.presence.type = 'peaking';
    this.presence.frequency.value = 4500;
    this.presence.Q.value = 2.0;
    this.presence.gain.value = 0;
    
    // Contour (scooped mids)
    this.contour = audioContext.createBiquadFilter();
    this.contour.type = 'peaking';
    this.contour.frequency.value = 750;
    this.contour.Q.value = 1.5;
    this.contour.gain.value = 0;
    
    // Master volume
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    
    // Channel selector (clean vs lead)
    this.channelGain = audioContext.createGain();
    this.channelGain.gain.value = 1.0;
    
    // Chain
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.channelGain);
    this.channelGain.connect(this.stage1);
    this.stage1.connect(this.stage2);
    this.stage2.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.contour);
    this.contour.connect(this.stage3);
    this.stage3.connect(this.presence);
    this.presence.connect(this.masterGain);
    this.masterGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeTubeCurve(drive) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const driveAmount = 1 + (drive / 25);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = x * driveAmount;
      
      // Tube saturation (soft clipping)
      y = Math.tanh(y * 1.5);
      
      // Add even harmonics (tube warmth)
      y += 0.1 * Math.tanh(x * driveAmount * 2);
      
      // Asymmetry (tube characteristic)
      if (x > 0) {
        y *= 1.1;
      } else {
        y *= 0.95;
      }
      
      curve[i] = y * 0.85;
    }
    
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'gain':
        this.inputGain.gain.setTargetAtTime(1 + (value / 50), now, 0.01);
        this.stage2.curve = this.makeTubeCurve(value);
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
      case 'contour':
        this.contour.gain.setTargetAtTime(-(value / 10), now, 0.01);
        break;
      case 'master':
        this.masterGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'channel':
        // Channel selector: 0-50 = Clean, 51-100 = Lead
        if (value > 50) {
          this.channelGain.gain.setTargetAtTime(2.0, now, 0.01);
          this.stage1.curve = this.makeTubeCurve(60);
        } else {
          this.channelGain.gain.setTargetAtTime(1.0, now, 0.01);
          this.stage1.curve = this.makeTubeCurve(30);
        }
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.stage1.disconnect();
      this.stage2.disconnect();
      this.stage3.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.presence.disconnect();
      this.contour.disconnect();
      this.masterGain.disconnect();
      this.channelGain.disconnect();
    } catch (e) {}
  }
}

export default MesaBoogieVTwinEffect;

