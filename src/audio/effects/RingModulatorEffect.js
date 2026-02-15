import BaseEffect from './BaseEffect';

class RingModulatorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Ring Modulator', 'ringmod');

    // Ring modulator AudioWorklet node (true signal multiplication)
    this.ringModNode = null;

    try {
      this.ringModNode = new AudioWorkletNode(audioContext, 'ring-mod');
      this.ringModNode.parameters.get('frequency').value = 440;
      this.ringModNode.parameters.get('waveform').value = 0;   // sine
      this.ringModNode.parameters.get('mix').value = 1.0;       // Fully wet internally
    } catch (e) {
      console.warn(
        'RingModulatorEffect: ring-mod AudioWorklet not available. Effect will pass audio through unprocessed.',
        e
      );
    }

    // Wet signal chain: input → ringModNode → wetGain → output
    if (this.ringModNode) {
      this.input.connect(this.ringModNode);
      this.ringModNode.connect(this.wetGain);
    } else {
      this.input.connect(this.wetGain);
    }
    this.wetGain.connect(this.output);

    // Dry signal chain: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default: 50% wet/dry mix
    this.setMix(0.5);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'frequency': {
        // Carrier frequency in Hz: 20-5000
        if (!this.ringModNode) break;
        const freq = Math.max(20, Math.min(5000, value));
        this.ringModNode.parameters.get('frequency').setTargetAtTime(freq, now, 0.02);
        break;
      }
      case 'waveform': {
        // Accept string ('sine','triangle','square','sawtooth') or numeric index (0-3)
        if (!this.ringModNode) break;
        let waveformIndex;
        if (typeof value === 'string') {
          const waveformMap = { sine: 0, triangle: 1, square: 2, sawtooth: 3 };
          waveformIndex = waveformMap[value] ?? 0;
        } else {
          waveformIndex = Math.max(0, Math.min(3, Math.round(value)));
        }
        this.ringModNode.parameters.get('waveform').setTargetAtTime(waveformIndex, now, 0.02);
        break;
      }
      case 'mix':
      case 'depth': {
        // 0-100 → 0.0-1.0
        this.setMix(value / 100);
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { if (this.ringModNode) this.ringModNode.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default RingModulatorEffect;
