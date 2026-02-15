import BaseEffect from './BaseEffect';

/**
 * TCCoronaChorusEffect - TC Electronic Corona Chorus
 * 
 * Tri-chorus mode with 3 delay lines and offset LFOs.
 * Standard, Tri, and Bass modes.
 * 
 * Features:
 * - 3 independent delay lines with phase-offset LFOs
 * - Standard single-voice chorus
 * - Tri-chorus (3 voices with 120° phase offset)
 * - Bass mode preserves low-end clarity
 * - High-pass filter in bass mode to keep fundamentals clean
 */

class TCCoronaChorusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Corona Chorus', 'tccoronachorus');

    // Three delay lines for tri-chorus
    this.delay1 = audioContext.createDelay(0.1);
    this.delay2 = audioContext.createDelay(0.1);
    this.delay3 = audioContext.createDelay(0.1);
    this.delay1.delayTime.value = 0.006;
    this.delay2.delayTime.value = 0.008;
    this.delay3.delayTime.value = 0.010;

    // Three LFOs with phase offsets (achieved via frequency offset trick)
    this.lfo1 = audioContext.createOscillator();
    this.lfo2 = audioContext.createOscillator();
    this.lfo3 = audioContext.createOscillator();
    this.lfo1.type = 'sine';
    this.lfo2.type = 'sine';
    this.lfo3.type = 'sine';
    this.lfo1.frequency.value = 0.8;
    this.lfo2.frequency.value = 0.8;
    this.lfo3.frequency.value = 0.8;

    // LFO depth controls
    this.lfoDepth1 = audioContext.createGain();
    this.lfoDepth2 = audioContext.createGain();
    this.lfoDepth3 = audioContext.createGain();
    this.lfoDepth1.gain.value = 0.002;
    this.lfoDepth2.gain.value = 0.002;
    this.lfoDepth3.gain.value = 0.002;

    // Voice gains (for mode switching)
    this.voice1Gain = audioContext.createGain();
    this.voice2Gain = audioContext.createGain();
    this.voice3Gain = audioContext.createGain();
    this.voice1Gain.gain.value = 0.6;
    this.voice2Gain.gain.value = 0.0;
    this.voice3Gain.gain.value = 0.0;

    // Tone shaping
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 10000;
    this.toneFilter.Q.value = 0.5;

    // Bass mode high-pass (keeps low-end clean)
    this.bassHPF = audioContext.createBiquadFilter();
    this.bassHPF.type = 'highpass';
    this.bassHPF.frequency.value = 20;
    this.bassHPF.Q.value = 0.5;

    // Mix node
    this.mixGain = audioContext.createGain();
    this.mixGain.gain.value = 1.0;

    // Connect LFOs to delay times
    this.lfo1.connect(this.lfoDepth1);
    this.lfo2.connect(this.lfoDepth2);
    this.lfo3.connect(this.lfoDepth3);
    this.lfoDepth1.connect(this.delay1.delayTime);
    this.lfoDepth2.connect(this.delay2.delayTime);
    this.lfoDepth3.connect(this.delay3.delayTime);

    // Start LFOs with phase offsets (staggered start times for 120° offset)
    const now = audioContext.currentTime;
    this.lfo1.start(now);
    // Offset lfo2 by 1/3 period and lfo3 by 2/3 period
    this.lfo2.start(now + (1 / (3 * 0.8)));
    this.lfo3.start(now + (2 / (3 * 0.8)));

    // Signal routing: input -> bass HPF -> delays -> voice gains -> tone -> mix -> wetGain
    this.input.connect(this.bassHPF);
    this.bassHPF.connect(this.delay1);
    this.bassHPF.connect(this.delay2);
    this.bassHPF.connect(this.delay3);

    this.delay1.connect(this.voice1Gain);
    this.delay2.connect(this.voice2Gain);
    this.delay3.connect(this.voice3Gain);

    this.voice1Gain.connect(this.toneFilter);
    this.voice2Gain.connect(this.toneFilter);
    this.voice3Gain.connect(this.toneFilter);

    this.toneFilter.connect(this.mixGain);
    this.mixGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Mode state: 'standard', 'tri', 'bass'
    this.mode = 'standard';
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 0.1 to 6 Hz
        const freq = 0.1 + (value / 100) * 5.9;
        this.lfo1.frequency.setTargetAtTime(freq, now, 0.01);
        this.lfo2.frequency.setTargetAtTime(freq, now, 0.01);
        this.lfo3.frequency.setTargetAtTime(freq, now, 0.01);
        break;

      case 'depth':
        // 0 to 6ms modulation depth
        const depth = (value / 100) * 0.006;
        this.lfoDepth1.gain.setTargetAtTime(depth, now, 0.01);
        this.lfoDepth2.gain.setTargetAtTime(depth * 0.85, now, 0.01);
        this.lfoDepth3.gain.setTargetAtTime(depth * 0.7, now, 0.01);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'mode':
        this.mode = value;
        this._applyMode(now);
        break;

      default:
        break;
    }
  }

  _applyMode(now) {
    switch (this.mode) {
      case 'standard':
        // Single voice chorus
        this.voice1Gain.gain.setTargetAtTime(0.6, now, 0.01);
        this.voice2Gain.gain.setTargetAtTime(0.0, now, 0.01);
        this.voice3Gain.gain.setTargetAtTime(0.0, now, 0.01);
        this.bassHPF.frequency.setTargetAtTime(20, now, 0.01);
        break;

      case 'tri':
        // All three voices active for lush tri-chorus
        this.voice1Gain.gain.setTargetAtTime(0.45, now, 0.01);
        this.voice2Gain.gain.setTargetAtTime(0.35, now, 0.01);
        this.voice3Gain.gain.setTargetAtTime(0.3, now, 0.01);
        this.bassHPF.frequency.setTargetAtTime(20, now, 0.01);
        break;

      case 'bass':
        // Tri-chorus with high-pass to preserve bass fundamentals
        this.voice1Gain.gain.setTargetAtTime(0.45, now, 0.01);
        this.voice2Gain.gain.setTargetAtTime(0.35, now, 0.01);
        this.voice3Gain.gain.setTargetAtTime(0.3, now, 0.01);
        this.bassHPF.frequency.setTargetAtTime(250, now, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delay1.disconnect();
      this.delay2.disconnect();
      this.delay3.disconnect();
      this.lfo1.stop();
      this.lfo2.stop();
      this.lfo3.stop();
      this.lfo1.disconnect();
      this.lfo2.disconnect();
      this.lfo3.disconnect();
      this.lfoDepth1.disconnect();
      this.lfoDepth2.disconnect();
      this.lfoDepth3.disconnect();
      this.voice1Gain.disconnect();
      this.voice2Gain.disconnect();
      this.voice3Gain.disconnect();
      this.toneFilter.disconnect();
      this.bassHPF.disconnect();
      this.mixGain.disconnect();
    } catch (e) {}
  }
}

export default TCCoronaChorusEffect;
