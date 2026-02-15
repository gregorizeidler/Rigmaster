import BaseEffect from './BaseEffect';

/**
 * EHXElectricMistressEffect - Electro-Harmonix Electric Mistress Flanger
 * 
 * Classic through-zero flanger known for lush, metallic sweeps.
 * Used by David Gilmour, Andy Summers.
 * 
 * Features:
 * - Through-zero flanging simulation via opposing delay lines
 * - Filter matrix control for tonal sweep range
 * - High feedback for metallic jet-plane tones
 * - Smooth triangle-wave LFO
 */

class EHXElectricMistressEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Electric Mistress', 'ehxelectricmistress');

    // Two delay lines for through-zero flanging simulation
    this.delayWet = audioContext.createDelay(0.02);
    this.delayDry = audioContext.createDelay(0.02);
    this.delayWet.delayTime.value = 0.004;
    this.delayDry.delayTime.value = 0.004;

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.25;

    // LFO depth for wet delay
    this.lfoDepthWet = audioContext.createGain();
    this.lfoDepthWet.gain.value = 0.003;

    // LFO depth for dry delay (inverted for through-zero effect)
    this.lfoDepthDry = audioContext.createGain();
    this.lfoDepthDry.gain.value = -0.001;

    // Feedback with polarity control
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.7;

    // Filter matrix — bandpass that shapes the flanged tone
    this.filterMatrix = audioContext.createBiquadFilter();
    this.filterMatrix.type = 'peaking';
    this.filterMatrix.frequency.value = 2000;
    this.filterMatrix.Q.value = 1.5;
    this.filterMatrix.gain.value = 6;

    // Pre-emphasis filter (boosts mids going into the flanger)
    this.preEmphasis = audioContext.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.value = 1000;
    this.preEmphasis.Q.value = 0.8;
    this.preEmphasis.gain.value = 3;

    // De-emphasis on output
    this.deEmphasis = audioContext.createBiquadFilter();
    this.deEmphasis.type = 'lowpass';
    this.deEmphasis.frequency.value = 8000;
    this.deEmphasis.Q.value = 0.5;

    // Wet mix node
    this.flangeGain = audioContext.createGain();
    this.flangeGain.gain.value = 0.6;

    // LFO connections
    this.lfo.connect(this.lfoDepthWet);
    this.lfo.connect(this.lfoDepthDry);
    this.lfoDepthWet.connect(this.delayWet.delayTime);
    this.lfoDepthDry.connect(this.delayDry.delayTime);
    this.lfo.start();

    // Signal chain: input -> pre-emphasis -> wet delay -> filter -> de-emphasis -> flangeGain
    this.input.connect(this.preEmphasis);
    this.preEmphasis.connect(this.delayWet);

    // Feedback loop
    this.delayWet.connect(this.feedbackGain);
    this.feedbackGain.connect(this.filterMatrix);
    this.filterMatrix.connect(this.delayWet);

    // Wet output path
    this.delayWet.connect(this.deEmphasis);
    this.deEmphasis.connect(this.flangeGain);
    this.flangeGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path with slight delay for phase alignment
    this.input.connect(this.delayDry);
    this.delayDry.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'rate':
        // 0.02 to 5 Hz
        const rate = 0.02 + (value / 100) * 4.98;
        this.lfo.frequency.setTargetAtTime(rate, now, 0.01);
        break;

      case 'range':
        // Controls the base delay time offset: 0.5ms to 8ms
        const rangeMs = 0.0005 + (value / 100) * 0.0075;
        this.delayWet.delayTime.setTargetAtTime(rangeMs, now, 0.02);
        this.delayDry.delayTime.setTargetAtTime(rangeMs * 0.8, now, 0.02);
        break;

      case 'filter_matrix':
        // Sweeps the filter matrix center frequency: 500Hz to 6000Hz
        const filterFreq = 500 + (value / 100) * 5500;
        this.filterMatrix.frequency.setTargetAtTime(filterFreq, now, 0.02);
        // Also adjust Q for more resonance at higher settings
        const q = 0.8 + (value / 100) * 3;
        this.filterMatrix.Q.setTargetAtTime(q, now, 0.02);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'feedback':
        // 0 to 0.9
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.9, now, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delayWet.disconnect();
      this.delayDry.disconnect();
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepthWet.disconnect();
      this.lfoDepthDry.disconnect();
      this.feedbackGain.disconnect();
      this.filterMatrix.disconnect();
      this.preEmphasis.disconnect();
      this.deEmphasis.disconnect();
      this.flangeGain.disconnect();
    } catch (e) {}
  }
}

export default EHXElectricMistressEffect;
