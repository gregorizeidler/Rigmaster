import BaseEffect from './BaseEffect';

class UniVibeEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Uni-Vibe', 'univibe');
    
    // UNI-VIBE (1968)
    // Legendary modulation effect
    // Hendrix's "Machine Gun" sound, Robin Trower
    
    // 4-stage phaser (like Phase 90 but different)
    this.allpass = [];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 200 + (i * 500);
      filter.Q.value = 1.5;
      this.allpass.push(filter);
    }
    
    // LFO (slower than Phase 90, more pronounced)
    this.lfo = audioContext.createOscillator();
    this.lfoGain = audioContext.createGain();
    this.lfo.type = 'sine'; // Uni-Vibe uses sine wave
    this.lfo.frequency.value = 1.2; // Classic Uni-Vibe speed
    this.lfoGain.gain.value = 1000;
    this.lfo.start();
    
    // Chorus/Vibrato switch
    this.chorusGain = audioContext.createGain();
    this.vibratoGain = audioContext.createGain();
    this.chorusGain.gain.value = 0.7; // Chorus mode (default)
    this.vibratoGain.gain.value = 0;
    
    // Chain
    this.input.connect(this.allpass[0]);
    for (let i = 0; i < 3; i++) {
      this.allpass[i].connect(this.allpass[i + 1]);
    }
    
    // Chorus mode (wet + dry)
    this.allpass[3].connect(this.chorusGain);
    this.chorusGain.connect(this.wetGain);
    
    // Vibrato mode (wet only)
    this.allpass[3].connect(this.vibratoGain);
    this.vibratoGain.connect(this.output);
    
    this.wetGain.connect(this.output);
    
    // Dry (only in chorus mode)
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // LFO
    this.lfo.connect(this.lfoGain);
    for (let i = 0; i < 4; i++) {
      this.lfoGain.connect(this.allpass[i].frequency);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'speed':
        this.lfo.frequency.setTargetAtTime(0.2 + (value / 100) * 6, now, 0.01);
        break;
      case 'depth':
        this.lfoGain.gain.setTargetAtTime(value * 12, now, 0.01);
        break;
      case 'mode':
        // Chorus vs Vibrato
        if (value > 50) {
          // Vibrato mode
          this.chorusGain.gain.setTargetAtTime(0, now, 0.01);
          this.vibratoGain.gain.setTargetAtTime(1, now, 0.01);
          this.dryGain.gain.setTargetAtTime(0, now, 0.01);
        } else {
          // Chorus mode
          this.chorusGain.gain.setTargetAtTime(0.7, now, 0.01);
          this.vibratoGain.gain.setTargetAtTime(0, now, 0.01);
          this.dryGain.gain.setTargetAtTime(0.5, now, 0.01);
        }
        break;
      case 'mix':
        this.updateMix(value);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.allpass.forEach(f => f.disconnect());
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoGain.disconnect();
      this.chorusGain.disconnect();
      this.vibratoGain.disconnect();
    } catch (e) {}
  }
}

export default UniVibeEffect;
