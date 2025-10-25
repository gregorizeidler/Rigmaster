import BaseEffect from './BaseEffect';

class BitCrusherEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Bit Crusher', 'bitcrusher');

    // Create ScriptProcessor for custom processing
    this.processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    this.bitDepth = 16;
    this.sampleRateReduction = 1;
    
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      
      let step = Math.pow(0.5, this.bitDepth);
      let phaser = 0;
      let last = 0;

      for (let i = 0; i < input.length; i++) {
        phaser += this.sampleRateReduction;
        if (phaser >= 1.0) {
          phaser -= 1.0;
          last = step * Math.floor(input[i] / step + 0.5);
        }
        output[i] = last;
      }
    };

    // Connect: input -> processor -> wetGain -> output
    this.input.connect(this.processor);
    this.processor.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'bits':
        this.bitDepth = 2 + (value / 100) * 14; // 2-bit to 16-bit
        break;
      case 'rate':
        this.sampleRateReduction = 0.05 + (value / 100) * 0.95; // Heavy to no reduction
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.processor.disconnect();
    super.disconnect();
  }
}

export default BitCrusherEffect;

