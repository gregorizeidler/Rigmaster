import BaseEffect from './BaseEffect.js';

class DetuneEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Detune', 'detune');
    
    // DETUNE (Subtle pitch detuning for thickening)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Two slightly detuned voices
    this.delay1 = audioContext.createDelay(0.1);
    this.delay2 = audioContext.createDelay(0.1);
    
    this.voice1Gain = audioContext.createGain();
    this.voice2Gain = audioContext.createGain();
    
    // LFO for subtle modulation
    this.lfo1 = audioContext.createOscillator();
    this.lfo2 = audioContext.createOscillator();
    this.lfo1.type = 'sine';
    this.lfo2.type = 'sine';
    this.lfo1.frequency.value = 0.3;
    this.lfo2.frequency.value = 0.35;
    
    this.lfoGain1 = audioContext.createGain();
    this.lfoGain2 = audioContext.createGain();
    this.lfoGain1.gain.value = 0.0002;
    this.lfoGain2.gain.value = 0.0002;
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Voice 1 (slightly sharp)
    this.inputGain.connect(this.delay1);
    this.lfo1.connect(this.lfoGain1);
    this.lfoGain1.connect(this.delay1.delayTime);
    this.delay1.connect(this.voice1Gain);
    this.voice1Gain.connect(this.wetGain);
    
    // Voice 2 (slightly flat)
    this.inputGain.connect(this.delay2);
    this.lfo2.connect(this.lfoGain2);
    this.lfoGain2.connect(this.delay2.delayTime);
    this.delay2.connect(this.voice2Gain);
    this.voice2Gain.connect(this.wetGain);
    
    this.wetGain.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.lfo1.start();
    this.lfo2.start();
    
    // Detune amounts (+/- 10 cents)
    this.delay1.delayTime.value = 0.0105;
    this.delay2.delayTime.value = 0.0095;
    
    this.wetGain.gain.value = 0.5;
    this.dryGain.gain.value = 1.0;
    this.voice1Gain.gain.value = 0.5;
    this.voice2Gain.gain.value = 0.5;
    
    this.params = { amount: 10, mix: 50, spread: 50 };
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'amount':
        // Detune amount in cents (0-50)
        const cents = (value / 100) * 50;
        const ratio1 = Math.pow(2, cents / 1200);
        const ratio2 = Math.pow(2, -cents / 1200);
        this.delay1.delayTime.setTargetAtTime(0.01 * ratio1, now, 0.01);
        this.delay2.delayTime.setTargetAtTime(0.01 * ratio2, now, 0.01);
        break;
      case 'mix':
        this.wetGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'spread':
        // Stereo spread
        this.voice1Gain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
        this.voice2Gain.gain.setTargetAtTime((value / 100) * 0.8, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.lfo1.stop();
    this.lfo2.stop();
    this.inputGain.disconnect();
    this.delay1.disconnect();
    this.delay2.disconnect();
    this.lfo1.disconnect();
    this.lfo2.disconnect();
    this.lfoGain1.disconnect();
    this.lfoGain2.disconnect();
    this.voice1Gain.disconnect();
    this.voice2Gain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.outputGain.disconnect();
  }
}

export default DetuneEffect;

