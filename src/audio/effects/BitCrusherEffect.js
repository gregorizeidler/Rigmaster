import BaseEffect from './BaseEffect';

class BitCrusherEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bit Crusher', 'bitcrusher');

    // Bitcrusher AudioWorklet node
    this.bitcrusherNode = null;

    try {
      this.bitcrusherNode = new AudioWorkletNode(audioContext, 'bitcrusher');
      this.bitcrusherNode.parameters.get('bits').value = 8;
      this.bitcrusherNode.parameters.get('downsample').value = 1;
      this.bitcrusherNode.parameters.get('mix').value = 1.0; // Fully wet internally
    } catch (e) {
      console.warn(
        'BitCrusherEffect: bitcrusher AudioWorklet not available. Effect will pass audio through unprocessed.',
        e
      );
    }

    // Wet signal chain: input → bitcrusherNode → wetGain → output
    if (this.bitcrusherNode) {
      this.input.connect(this.bitcrusherNode);
      this.bitcrusherNode.connect(this.wetGain);
    } else {
      // Fallback: pass-through when worklet unavailable
      this.input.connect(this.wetGain);
    }
    this.wetGain.connect(this.output);

    // Dry signal chain: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default: fully wet
    this.setMix(1.0);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'bits': {
        // Bit depth: 1-24
        if (!this.bitcrusherNode) break;
        const bits = Math.max(1, Math.min(24, Math.round(value)));
        this.bitcrusherNode.parameters.get('bits').setTargetAtTime(bits, now, 0.02);
        break;
      }
      case 'rate':
      case 'downsample': {
        // Sample rate reduction factor: 1-64
        if (!this.bitcrusherNode) break;
        const downsample = Math.max(1, Math.min(64, Math.round(value)));
        this.bitcrusherNode.parameters.get('downsample').setTargetAtTime(downsample, now, 0.02);
        break;
      }
      case 'mix': {
        // 0-100 → 0.0-1.0
        this.setMix(value / 100);
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { if (this.bitcrusherNode) this.bitcrusherNode.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default BitCrusherEffect;
