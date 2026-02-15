import BaseEffect from './BaseEffect';

class BossCE1Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss CE-1', 'bossce1');
    
    // BOSS CE-1 CHORUS ENSEMBLE (1976)
    // First Boss pedal - legendary chorus
    // Used by The Police, The Cure
    
    // Dual delay lines for stereo chorus
    this.delayL = audioContext.createDelay(0.05);
    this.delayR = audioContext.createDelay(0.05);
    this.delayL.delayTime.value = 0.008;
    this.delayR.delayTime.value = 0.012;
    
    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfoDepthL = audioContext.createGain();
    this.lfoDepthR = audioContext.createGain();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.8; // Classic CE-1 speed
    this.lfoDepthL.gain.value = 0.003;
    this.lfoDepthR.gain.value = 0.004; // Slightly different for stereo width
    this.lfo.start();
    
    // Wet gains
    this.wetL = audioContext.createGain();
    this.wetR = audioContext.createGain();
    this.wetL.gain.value = 0.5;
    this.wetR.gain.value = 0.5;
    
    // Splitter/Merger for stereo
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Chain
    this.input.connect(this.delayL);
    this.input.connect(this.delayR);
    
    this.delayL.connect(this.wetL);
    this.delayR.connect(this.wetR);
    
    this.wetL.connect(this.merger, 0, 0);
    this.wetR.connect(this.merger, 0, 1);
    
    this.merger.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // LFO modulation
    this.lfo.connect(this.lfoDepthL);
    this.lfo.connect(this.lfoDepthR);
    this.lfoDepthL.connect(this.delayL.delayTime);
    this.lfoDepthR.connect(this.delayR.delayTime);
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'rate':
        this.lfo.frequency.setTargetAtTime(0.1 + (value / 100) * 3, now, 0.01);
        break;
      case 'depth':
        this.lfoDepthL.gain.setTargetAtTime(value / 100 * 0.008, now, 0.01);
        this.lfoDepthR.gain.setTargetAtTime(value / 100 * 0.01, now, 0.01);
        break;
      case 'intensity':
        this.wetL.gain.setTargetAtTime(value / 100, now, 0.01);
        this.wetR.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepthL.disconnect();
      this.lfoDepthR.disconnect();
      this.wetL.disconnect();
      this.wetR.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
    } catch (e) {}
  }
}

export default BossCE1Effect;

