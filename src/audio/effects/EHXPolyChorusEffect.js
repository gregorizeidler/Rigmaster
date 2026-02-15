import BaseEffect from './BaseEffect';

/**
 * EHXPolyChorusEffect - Electro-Harmonix Poly Chorus
 * 
 * Multi-voice chorus with flanging capability.
 * Known for extreme, washy chorus tones and intense flanging.
 * 
 * Features:
 * - Multiple chorus voices with staggered delays
 * - Flanger mode with high feedback
 * - Filter matrix mode for swept resonant filtering
 * - Variable feedback from subtle to self-oscillating
 * - Thick, saturated chorus character
 */

class EHXPolyChorusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Poly Chorus', 'ehxpolychorus');

    // 4 delay lines for multi-voice chorus
    this.delays = [];
    const baseTimes = [0.005, 0.008, 0.012, 0.016];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(0.1);
      delay.delayTime.value = baseTimes[i];
      this.delays.push(delay);
    }

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.6;

    // LFO depth per voice (slightly different for movement)
    this.lfoDepths = [];
    const depthVals = [0.002, 0.0025, 0.003, 0.0035];
    for (let i = 0; i < 4; i++) {
      const gain = audioContext.createGain();
      gain.gain.value = depthVals[i];
      this.lfoDepths.push(gain);
    }

    // Voice gain controls
    this.voiceGains = [];
    for (let i = 0; i < 4; i++) {
      const gain = audioContext.createGain();
      gain.gain.value = 0.35;
      this.voiceGains.push(gain);
    }

    // Feedback network
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.2;

    // Resonant filter for filter mode
    this.resFilter = audioContext.createBiquadFilter();
    this.resFilter.type = 'bandpass';
    this.resFilter.frequency.value = 1500;
    this.resFilter.Q.value = 2.0;

    // Filter mode gain (off by default)
    this.filterGain = audioContext.createGain();
    this.filterGain.gain.value = 0.0;

    // LFO for filter sweep
    this.filterLfo = audioContext.createOscillator();
    this.filterLfo.type = 'triangle';
    this.filterLfo.frequency.value = 0.3;
    this.filterLfoDepth = audioContext.createGain();
    this.filterLfoDepth.gain.value = 0;

    // Tone shaping
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 9000;
    this.toneFilter.Q.value = 0.5;

    // Saturation for that thick EHX character
    this.saturation = audioContext.createWaveShaper();
    this.saturation.curve = this._makeSoftClip();
    this.saturation.oversample = '2x';

    // Output gain
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.6;

    // LFO routing to delay times
    for (let i = 0; i < 4; i++) {
      this.lfo.connect(this.lfoDepths[i]);
      this.lfoDepths[i].connect(this.delays[i].delayTime);
    }

    // Filter LFO routing
    this.filterLfo.connect(this.filterLfoDepth);
    this.filterLfoDepth.connect(this.resFilter.frequency);

    // Start oscillators
    this.lfo.start();
    this.filterLfo.start();

    // Signal chain: input -> delays -> voice gains -> saturation -> tone -> outGain
    for (let i = 0; i < 4; i++) {
      this.input.connect(this.delays[i]);
      this.delays[i].connect(this.voiceGains[i]);
      this.voiceGains[i].connect(this.saturation);
    }

    // Feedback from first delay back to input
    this.delays[0].connect(this.feedbackGain);
    this.feedbackGain.connect(this.delays[0]);

    // Chorus/Flanger output path
    this.saturation.connect(this.toneFilter);
    this.toneFilter.connect(this.outGain);
    this.outGain.connect(this.wetGain);

    // Filter mode path: input -> resFilter -> filterGain -> wetGain
    this.input.connect(this.resFilter);
    this.resFilter.connect(this.filterGain);
    this.filterGain.connect(this.wetGain);

    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.mode = 'chorus';
  }

  _makeSoftClip() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.5);
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.05 to 8 Hz
        const rate = 0.05 + (value / 100) * 7.95;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        this.filterLfo.frequency.setTargetAtTime(rate * 0.5, now, 0.01);
        break;

      case 'depth':
        // Scale all voice depths
        const d = value / 100;
        const baseDepths = [0.002, 0.0025, 0.003, 0.0035];
        for (let i = 0; i < 4; i++) {
          this.lfoDepths[i].gain.setTargetAtTime(baseDepths[i] * d * 2, now, 0.01);
        }
        break;

      case 'feedback':
        // 0 to 0.9
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      case 'mode':
        this.mode = value;
        this._applyMode(now);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  _applyMode(now) {
    switch (this.mode) {
      case 'chorus':
        // All 4 voices, low feedback
        for (let i = 0; i < 4; i++) {
          this.voiceGains[i].gain.setTargetAtTime(0.35, now, 0.02);
        }
        this.feedbackGain.gain.setTargetAtTime(0.2, now, 0.02);
        this.filterGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.outGain.gain.setTargetAtTime(0.6, now, 0.02);
        this.filterLfoDepth.gain.setTargetAtTime(0, now, 0.02);
        break;

      case 'flanger':
        // Single voice with high feedback
        this.voiceGains[0].gain.setTargetAtTime(0.7, now, 0.02);
        for (let i = 1; i < 4; i++) {
          this.voiceGains[i].gain.setTargetAtTime(0.0, now, 0.02);
        }
        this.feedbackGain.gain.setTargetAtTime(0.75, now, 0.02);
        this.filterGain.gain.setTargetAtTime(0.0, now, 0.02);
        this.outGain.gain.setTargetAtTime(0.7, now, 0.02);
        this.filterLfoDepth.gain.setTargetAtTime(0, now, 0.02);
        break;

      case 'filter':
        // Resonant filter sweep mode
        for (let i = 0; i < 4; i++) {
          this.voiceGains[i].gain.setTargetAtTime(0.15, now, 0.02);
        }
        this.feedbackGain.gain.setTargetAtTime(0.1, now, 0.02);
        this.filterGain.gain.setTargetAtTime(0.6, now, 0.02);
        this.outGain.gain.setTargetAtTime(0.4, now, 0.02);
        this.filterLfoDepth.gain.setTargetAtTime(2000, now, 0.02);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delays.forEach(d => d.disconnect());
      this.lfo.stop();
      this.filterLfo.stop();
      this.lfo.disconnect();
      this.filterLfo.disconnect();
      this.lfoDepths.forEach(g => g.disconnect());
      this.voiceGains.forEach(g => g.disconnect());
      this.feedbackGain.disconnect();
      this.resFilter.disconnect();
      this.filterGain.disconnect();
      this.filterLfoDepth.disconnect();
      this.toneFilter.disconnect();
      this.saturation.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

export default EHXPolyChorusEffect;
