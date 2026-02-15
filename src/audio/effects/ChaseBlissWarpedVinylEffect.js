import BaseEffect from './BaseEffect';

/**
 * ChaseBlissWarpedVinylEffect - Chase Bliss Warped Vinyl HiFi
 * 
 * Experimental vibrato/chorus with random warble modulation.
 * Simulates imperfect vinyl playback with wow, flutter, and degradation.
 * 
 * Features:
 * - Primary LFO for standard modulation
 * - Random modulation (noise-based warble)
 * - Warp control adds pitch instability
 * - Tone control for lo-fi filtering
 * - Dual delay lines for stereo-like depth
 */

class ChaseBlissWarpedVinylEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Chase Bliss Warped Vinyl', 'chaseblisswarpedvinyl');

    // Primary modulation delay
    this.delayA = audioContext.createDelay(0.1);
    this.delayA.delayTime.value = 0.007;

    // Secondary delay for depth
    this.delayB = audioContext.createDelay(0.1);
    this.delayB.delayTime.value = 0.012;

    // Primary LFO (rate control)
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.5;

    this.lfoDepthA = audioContext.createGain();
    this.lfoDepthA.gain.value = 0.002;
    this.lfoDepthB = audioContext.createGain();
    this.lfoDepthB.gain.value = 0.003;

    // Random warble LFO (simulates vinyl imperfections)
    this.warbleLfo = audioContext.createOscillator();
    this.warbleLfo.type = 'sawtooth';
    this.warbleLfo.frequency.value = 3.7;

    this.warbleDepth = audioContext.createGain();
    this.warbleDepth.gain.value = 0.0003;

    // Secondary warble (slow wow)
    this.wowLfo = audioContext.createOscillator();
    this.wowLfo.type = 'sine';
    this.wowLfo.frequency.value = 0.3;

    this.wowDepth = audioContext.createGain();
    this.wowDepth.gain.value = 0.0005;

    // Warp intensity control (scales random modulation)
    this.warpGain = audioContext.createGain();
    this.warpGain.gain.value = 0.3;

    // Tone control — low-pass for lo-fi warmth
    this.toneLP = audioContext.createBiquadFilter();
    this.toneLP.type = 'lowpass';
    this.toneLP.frequency.value = 10000;
    this.toneLP.Q.value = 0.5;

    // High-frequency roll-off (vinyl character)
    this.vinylHF = audioContext.createBiquadFilter();
    this.vinylHF.type = 'lowshelf';
    this.vinylHF.frequency.value = 6000;
    this.vinylHF.gain.value = -2;

    // Subtle saturation for vinyl warmth
    this.saturation = audioContext.createWaveShaper();
    this.saturation.curve = this._makeVinylSatCurve();
    this.saturation.oversample = '2x';

    // Voice gains
    this.voiceA = audioContext.createGain();
    this.voiceA.gain.value = 0.5;
    this.voiceB = audioContext.createGain();
    this.voiceB.gain.value = 0.4;

    // Output
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.8;

    // LFO routing
    this.lfo.connect(this.lfoDepthA);
    this.lfo.connect(this.lfoDepthB);
    this.lfoDepthA.connect(this.delayA.delayTime);
    this.lfoDepthB.connect(this.delayB.delayTime);

    // Random warble routing through warp gain
    this.warbleLfo.connect(this.warpGain);
    this.wowLfo.connect(this.warpGain);
    this.warpGain.connect(this.warbleDepth);
    this.warbleDepth.connect(this.delayA.delayTime);
    this.warbleDepth.connect(this.delayB.delayTime);

    // Wow routing direct
    this.wowLfo.connect(this.wowDepth);
    this.wowDepth.connect(this.delayA.delayTime);

    // Start oscillators
    this.lfo.start();
    this.warbleLfo.start();
    this.wowLfo.start();

    // Signal chain
    this.input.connect(this.delayA);
    this.input.connect(this.delayB);

    this.delayA.connect(this.voiceA);
    this.delayB.connect(this.voiceB);

    this.voiceA.connect(this.saturation);
    this.voiceB.connect(this.saturation);

    this.saturation.connect(this.toneLP);
    this.toneLP.connect(this.vinylHF);
    this.vinylHF.connect(this.outGain);
    this.outGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  _makeVinylSatCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Gentle soft-clipping for vinyl warmth
      curve[i] = Math.tanh(x * 1.2);
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.05 to 6 Hz
        const rate = 0.05 + (value / 100) * 5.95;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        break;

      case 'depth':
        // 0 to 8ms modulation
        const depth = (value / 100) * 0.008;
        this.lfoDepthA.gain.setTargetAtTime(depth, now, 0.01);
        this.lfoDepthB.gain.setTargetAtTime(depth * 1.3, now, 0.01);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'warp':
        // 0 to 1 — scales random warble intensity
        const warp = value / 100;
        this.warpGain.gain.setTargetAtTime(warp, now, 0.02);
        this.warbleDepth.gain.setTargetAtTime(warp * 0.001, now, 0.02);
        this.wowDepth.gain.setTargetAtTime(warp * 0.0008, now, 0.02);
        // More warp = slower warble for realism
        this.warbleLfo.frequency.setTargetAtTime(2 + warp * 5, now, 0.02);
        break;

      case 'tone':
        // 2000 to 14000 Hz
        const toneFreq = 2000 + (value / 100) * 12000;
        this.toneLP.frequency.setTargetAtTime(toneFreq, now, 0.02);
        // More HF rolloff at lower tone
        const shelf = -8 + (value / 100) * 8;
        this.vinylHF.gain.setTargetAtTime(shelf, now, 0.02);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delayA.disconnect();
      this.delayB.disconnect();
      this.lfo.stop();
      this.warbleLfo.stop();
      this.wowLfo.stop();
      this.lfo.disconnect();
      this.warbleLfo.disconnect();
      this.wowLfo.disconnect();
      this.lfoDepthA.disconnect();
      this.lfoDepthB.disconnect();
      this.warbleDepth.disconnect();
      this.wowDepth.disconnect();
      this.warpGain.disconnect();
      this.toneLP.disconnect();
      this.vinylHF.disconnect();
      this.saturation.disconnect();
      this.voiceA.disconnect();
      this.voiceB.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

export default ChaseBlissWarpedVinylEffect;
