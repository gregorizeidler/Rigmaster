import BaseEffect from './BaseEffect';

/**
 * WalrusJuliaEffect - Walrus Audio Julia Chorus/Vibrato
 * 
 * Modern analog chorus/vibrato
 * Top seller 2020-2024
 * 
 * Features:
 * - Chorus/Vibrato blend
 * - Lag control (ramp time)
 * - Waveform selection
 * - D-C-V switch
 */

class WalrusJuliaEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Walrus Julia', 'walrusjulia');
    
    // Delay line for modulation
    this.delayNode = audioContext.createDelay(0.1);
    this.delayNode.delayTime.value = 0.005; // 5ms base delay
    
    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;
    
    // LFO depth control
    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 0.002; // ±2ms modulation
    
    // Chorus/Vibrato blend
    this.chorusGain = audioContext.createGain();
    this.chorusGain.gain.value = 0.5;
    
    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 0.5;
    
    // Tone filter (warmth)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 8000;
    this.toneFilter.Q.value = 0.707;
    
    // Connect LFO
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();
    
    // Chorus path (dry + wet)
    this.input.connect(this.chorusGain); // Dry for chorus
    this.input.connect(this.delayNode);
    this.delayNode.connect(this.toneFilter);
    this.toneFilter.connect(this.chorusGain); // Wet for chorus
    
    // Vibrato path (wet only)
    this.toneFilter.connect(this.vibratoGain);
    
    // Mix outputs
    this.chorusGain.connect(this.wetGain);
    this.vibratoGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Mode: 'chorus', 'vibrato', 'blend'
    this.mode = 'chorus';
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'rate':
        // 0.1 to 5 Hz
        this.lfo.frequency.setTargetAtTime(0.1 + (value / 100) * 4.9, now, 0.01);
        break;
        
      case 'depth':
        // 0 to 5ms modulation
        this.lfoGain.gain.setTargetAtTime((value / 100) * 0.005, now, 0.01);
        break;
        
      case 'lag':
        // Ramp time (affects LFO transition)
        // This would need custom implementation
        break;
        
      case 'mode':
        // 'chorus', 'vibrato', 'blend'
        this.mode = value;
        this.updateMode();
        break;
        
      case 'dcv':
        // D (dark) / C (center) / V (vibrant)
        if (value === 'dark') {
          this.toneFilter.frequency.setTargetAtTime(5000, now, 0.01);
        } else if (value === 'center') {
          this.toneFilter.frequency.setTargetAtTime(8000, now, 0.01);
        } else if (value === 'vibrant') {
          this.toneFilter.frequency.setTargetAtTime(12000, now, 0.01);
        }
        break;
    }
  }
  
  updateMode() {
    const now = this.audioContext.currentTime;
    
    if (this.mode === 'chorus') {
      this.chorusGain.gain.setTargetAtTime(1, now, 0.01);
      this.vibratoGain.gain.setTargetAtTime(0, now, 0.01);
    } else if (this.mode === 'vibrato') {
      this.chorusGain.gain.setTargetAtTime(0, now, 0.01);
      this.vibratoGain.gain.setTargetAtTime(1, now, 0.01);
    } else if (this.mode === 'blend') {
      this.chorusGain.gain.setTargetAtTime(0.5, now, 0.01);
      this.vibratoGain.gain.setTargetAtTime(0.5, now, 0.01);
    }
  }
}

export default WalrusJuliaEffect;

