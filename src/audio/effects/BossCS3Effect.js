import BaseEffect from './BaseEffect';

/**
 * BossCS3Effect - Boss CS-3 Compression Sustainer
 * 
 * Classic Boss compression pedal with simple, effective controls.
 * Known for its slightly colored, punchy compression character.
 * 
 * Features:
 * - Classic VCA-style compression
 * - Tone control for post-compression shaping
 * - Sustain control for compression amount
 * - Level control for output volume
 * - Punchy, slightly colored character
 */

class BossCS3Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss CS-3', 'bosscs3');
    
    // Main compressor - Boss VCA style
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -22;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;
    
    // Input buffer / sustain drive
    this.sustainDrive = audioContext.createGain();
    this.sustainDrive.gain.value = 1.2;
    
    // Tone control - CS-3 has a distinctive tone knob
    // Low-pass filter for the tone knob
    this.toneLPF = audioContext.createBiquadFilter();
    this.toneLPF.type = 'lowpass';
    this.toneLPF.frequency.value = 6000;
    this.toneLPF.Q.value = 0.7;
    
    // Mid-range presence (Boss character)
    this.bossCharacter = audioContext.createBiquadFilter();
    this.bossCharacter.type = 'peaking';
    this.bossCharacter.frequency.value = 1000;
    this.bossCharacter.Q.value = 1.2;
    this.bossCharacter.gain.value = 2.0;
    
    // High-frequency hiss reduction (CS-3 noise gate behavior)
    this.noiseFilter = audioContext.createBiquadFilter();
    this.noiseFilter.type = 'highshelf';
    this.noiseFilter.frequency.value = 7000;
    this.noiseFilter.gain.value = -2.0;
    
    // Level (output volume)
    this.levelGain = audioContext.createGain();
    this.levelGain.gain.value = 1.8;
    
    // Parallel compression
    this.compressedGain = audioContext.createGain();
    this.compressedGain.gain.value = 0.8;
    
    this.uncompressedGain = audioContext.createGain();
    this.uncompressedGain.gain.value = 0.2;
    
    // Compressed signal path
    this.input.connect(this.sustainDrive);
    this.sustainDrive.connect(this.compressor);
    this.compressor.connect(this.toneLPF);
    this.toneLPF.connect(this.bossCharacter);
    this.bossCharacter.connect(this.noiseFilter);
    this.noiseFilter.connect(this.levelGain);
    this.levelGain.connect(this.compressedGain);
    this.compressedGain.connect(this.wetGain);
    
    // Uncompressed path (for blend)
    this.input.connect(this.uncompressedGain);
    this.uncompressedGain.connect(this.wetGain);
    
    this.wetGain.connect(this.output);
    
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'level':
        // Output level: 0.3x to 4x
        const level = 0.3 + (value / 100) * 3.7;
        this.levelGain.gain.setTargetAtTime(level, now, 0.01);
        break;
        
      case 'tone':
        // Tone controls LPF cutoff: 2kHz to 12kHz
        const freq = 2000 + (value / 100) * 10000;
        this.toneLPF.frequency.setTargetAtTime(freq, now, 0.01);
        // Also adjusts mid character
        const midGain = 1.0 + (value / 100) * 3.0;
        this.bossCharacter.gain.setTargetAtTime(midGain, now, 0.01);
        break;
        
      case 'attack':
        // 0.5ms to 50ms
        this.compressor.attack.setTargetAtTime(
          0.0005 + (value / 100) * 0.0495, now, 0.01
        );
        break;
        
      case 'sustain':
        // Drives compressor harder + adjusts threshold/ratio
        const driveVal = 0.8 + (value / 100) * 2.5;
        this.sustainDrive.gain.setTargetAtTime(driveVal, now, 0.01);
        const thresh = -12 - (value / 100) * 28;
        this.compressor.threshold.setTargetAtTime(thresh, now, 0.01);
        const ratio = 2 + (value / 100) * 10;
        this.compressor.ratio.setTargetAtTime(ratio, now, 0.01);
        // More sustain = longer release
        const release = 0.1 + (value / 100) * 0.5;
        this.compressor.release.setTargetAtTime(release, now, 0.01);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try { this.compressor.disconnect(); } catch (e) {}
    try { this.sustainDrive.disconnect(); } catch (e) {}
    try { this.toneLPF.disconnect(); } catch (e) {}
    try { this.bossCharacter.disconnect(); } catch (e) {}
    try { this.noiseFilter.disconnect(); } catch (e) {}
    try { this.levelGain.disconnect(); } catch (e) {}
    try { this.compressedGain.disconnect(); } catch (e) {}
    try { this.uncompressedGain.disconnect(); } catch (e) {}
  }
}

export default BossCS3Effect;
