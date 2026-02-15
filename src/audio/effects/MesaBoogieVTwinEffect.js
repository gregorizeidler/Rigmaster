import BaseEffect from './BaseEffect';

class MesaBoogieVTwinEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Mesa V-Twin', 'mesavtwin');
    
    // MESA BOOGIE V-TWIN - Legendary rack preamp
    // Dual-channel tube preamp simulation
    
    // Input gain (clean channel)
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.5;
    
    // Anti-aliasing: Pre-drive HPF to tighten low end
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 100;
    
    // Post-drive filters to "cabinetize"
    this.postHPF = audioContext.createBiquadFilter();
    this.postHPF.type = 'highpass';
    this.postHPF.frequency.value = 70;
    
    this.postLPF = audioContext.createBiquadFilter();
    this.postLPF.type = 'lowpass';
    this.postLPF.frequency.value = 7500;
    
    // DC blocker before EQ
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    
    // Clean channel bright cap (high-shelf for sparkle)
    this.cleanBright = audioContext.createBiquadFilter();
    this.cleanBright.type = 'highshelf';
    this.cleanBright.frequency.value = 2500;
    this.cleanBright.gain.value = 0;
    
    // Anti-aliasing filter before stage1 (lowpass 18kHz)
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 18000;
    this.antiAlias.Q.value = 0.707;
    
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
    
    // DC blocker after stage3 (highpass 10Hz)
    this.dcBlockPost = audioContext.createBiquadFilter();
    this.dcBlockPost.type = 'highpass';
    this.dcBlockPost.frequency.value = 10;
    this.dcBlockPost.Q.value = 0.707;
    
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
    this.mid.Q.value = 1.3; // Increased Q for better "honk"
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 3000;
    this.treble.gain.value = 0;
    
    // Presence as high-shelf (power amp NFB)
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4500;
    this.presence.gain.value = 0;
    
    // Contour (V-scoop: cuts mids, boosts lows and highs)
    this.contour = audioContext.createBiquadFilter();
    this.contour.type = 'peaking';
    this.contour.frequency.value = 750;
    this.contour.Q.value = 1.5;
    this.contour.gain.value = 0;
    
    this.contourLow = audioContext.createBiquadFilter();
    this.contourLow.type = 'lowshelf';
    this.contourLow.frequency.value = 120;
    this.contourLow.gain.value = 0;
    
    this.contourHigh = audioContext.createBiquadFilter();
    this.contourHigh.type = 'highshelf';
    this.contourHigh.frequency.value = 3500;
    this.contourHigh.gain.value = 0;
    
    // Master volume
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    
    // Channel selector (clean vs lead)
    this.channelGain = audioContext.createGain();
    this.channelGain.gain.value = 1.0;
    
    // Store params for makeup gain calculation
    this.params = { master: 60 };
    
    // Signal Chain with anti-aliasing and proper filtering
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.channelGain);
    this.channelGain.connect(this.cleanBright);
    this.cleanBright.connect(this.preHPF);
    this.preHPF.connect(this.antiAlias);
    this.antiAlias.connect(this.stage1);
    this.stage1.connect(this.stage2);
    this.stage2.connect(this.dcBlock);
    this.dcBlock.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.contourLow);
    this.contourLow.connect(this.contour);
    this.contour.connect(this.contourHigh);
    this.contourHigh.connect(this.stage3);
    this.stage3.connect(this.dcBlockPost);
    this.dcBlockPost.connect(this.postHPF);
    this.postHPF.connect(this.postLPF);
    this.postLPF.connect(this.presence);
    this.presence.connect(this.masterGain);
    this.masterGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeTubeCurve(drive) {
    const samples = 65536;
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
      case 'gain': {
        // Auto-makeup gain: constant perceived level while saturating
        const drive = Math.max(0, Math.min(100, value));
        this.stage2.curve = this.makeTubeCurve(drive);
        // Input gain 1..3
        const inGain = 1 + (drive / 100) * 2;
        this.inputGain.gain.setTargetAtTime(inGain, now, 0.01);
        // Compensate at master output
        const makeup = 0.8 - (drive / 100) * 0.25; // 0.8 -> 0.55
        this.masterGain.gain.setTargetAtTime((this.params?.master ?? 60) / 100 * makeup, now, 0.02);
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
        // Presence range: ±6 dB (more controlled than ±10 dB)
        this.presence.gain.setTargetAtTime((value - 50) / 8.33, now, 0.01);
        break;
      case 'contour': {
        // V-scoop: cuts mids, boosts lows and highs
        const midCut = -(value / 10);        // 0 to -10 dB
        const shelfBoost = (value / 100) * 4; // 0 to +4 dB
        this.contour.gain.setTargetAtTime(midCut, now, 0.01);
        this.contourLow.gain.setTargetAtTime(shelfBoost, now, 0.01);
        this.contourHigh.gain.setTargetAtTime(shelfBoost, now, 0.01);
        break;
      }
      case 'master':
        // Store for makeup gain calculation
        this.params.master = value;
        this.masterGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'channel': {
        // Smooth channel morph: 0=Clean, 100=Lead
        const t = Math.min(Math.max(value / 100, 0), 1);
        // Channel gain: 1.0 -> 2.0
        this.channelGain.gain.setTargetAtTime(1.0 + t * 1.0, now, 0.01);
        // Bright cap: more present in clean, fades in lead
        this.cleanBright.gain.setTargetAtTime((1 - t) * 4, now, 0.01);
        // Stage 1 drive: 30 -> 60
        this.stage1.curve = this.makeTubeCurve(30 + t * 30);
        // Stage 2 gets a bit more drive in lead
        this.stage2.curve = this.makeTubeCurve(60 + t * 6);
        break;
      }
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.inputGain.disconnect();
      this.channelGain.disconnect();
      this.cleanBright.disconnect();
      this.preHPF.disconnect();
      this.antiAlias.disconnect();
      this.stage1.disconnect();
      this.stage2.disconnect();
      this.dcBlock.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.contourLow.disconnect();
      this.contour.disconnect();
      this.contourHigh.disconnect();
      this.stage3.disconnect();
      this.dcBlockPost.disconnect();
      this.postHPF.disconnect();
      this.postLPF.disconnect();
      this.presence.disconnect();
      this.masterGain.disconnect();
    } catch (e) {}
  }
}

export default MesaBoogieVTwinEffect;

