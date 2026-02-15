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
    
    // High-pass filter (tightness control)
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 60;
    this.preHPF.Q.value = 0.707;
    
    // Input gain stage
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.2;
    
    // Anti-alias pré-clip
    this.antiAliasLPF = audioContext.createBiquadFilter();
    this.antiAliasLPF.type = 'lowpass';
    this.antiAliasLPF.frequency.value = 18000;
    this.antiAliasLPF.Q.value = 0.707;

    // Preamp saturation (op-amp + diode clipping)
    this.preampShaper = audioContext.createWaveShaper();
    this.preampShaper.curve = this.makePreampCurve(35, 0.12);
    this.preampShaper.oversample = '4x';
    
    // DC blocker (post-clipping)
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // Low-pass filter (smoothness)
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
    
    // Mid focus (musical presence)
    this.midFilter = audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 900;
    this.midFilter.Q.value = 0.7;
    this.midFilter.gain.value = 1.5; // Subtle mid boost for character
    
    // Output stage with soft limiting
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    this.outLimiter = audioContext.createDynamicsCompressor();
    this.outLimiter.threshold.value = -3;
    this.outLimiter.knee.value = 0;
    this.outLimiter.ratio.value = 12;
    this.outLimiter.attack.value = 0.003;
    this.outLimiter.release.value = 0.06;
    
    // Connect the signal chain
    this.input.connect(this.preHPF);
    this.preHPF.connect(this.inputGain);
    this.inputGain.connect(this.antiAliasLPF);
    this.antiAliasLPF.connect(this.preampShaper);
    this.preampShaper.connect(this.dcBlock);
    this.dcBlock.connect(this.postLPF);
    this.postLPF.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.midFilter);
    this.midFilter.connect(this.outputGain);
    this.outputGain.connect(this.outLimiter);
    this.outLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry path for blend
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  /**
   * Creates preamp curve with op-amp + diode clipping characteristics
   * @param {number} drive - Drive amount (0-100)
   * @param {number} asym - Asymmetry factor (0-0.2)
   */
  makePreampCurve(drive = 35, asym = 0.12) {
    const samples = 65536;
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
      
      curve[i] = y * 0.9;
    }
    
    return curve;
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'gain': {
        // Gain controls saturation and compression
        const g = Math.max(0, Math.min(100, value));
        this.inputGain.gain.setTargetAtTime(0.5 + (g / 100) * 2, now, 0.01);
        
        // Update clipping curve with dynamic drive and asymmetry
        this.preampShaper.curve = this.makePreampCurve(30 + 0.7 * g, 0.1 + 0.1 * (g / 100));
        
        // Automatic makeup gain compensation
        const makeup = 0.85 - 0.25 * (g / 100);
        const lvl = (this.params?.level ?? 100) / 100;
        this.outputGain.gain.setTargetAtTime(lvl * makeup, now, 0.02);
        break;
      }
      
      case 'bass':
        // Active EQ: ±15 dB range
        // Value 0-100 → -15 to +15 dB
        this.bassFilter.gain.setTargetAtTime((value - 50) * 0.3, now, 0.01);
        break;
      
      case 'treble':
        // Active EQ: ±15 dB range
        this.trebleFilter.gain.setTargetAtTime((value - 50) * 0.3, now, 0.01);
        break;
      
      case 'level':
        // Volume control
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
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
      this.outputGain.disconnect();
      this.outLimiter.disconnect();
    } catch (e) {
      // Already disconnected
    }
  }
}

export default XoticBBPreampEffect;

