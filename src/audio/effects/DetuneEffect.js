import BaseEffect from './BaseEffect.js';

class DetuneEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Detune', 'detune');
    
    // TRUE DETUNE using pitch-shifter AudioWorklet
    // Two voices: one shifted up, one shifted down by N cents
    // Mixed with the direct signal for thickening
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Voice gains
    this.voice1Gain = audioContext.createGain(); // pitch up voice
    this.voice2Gain = audioContext.createGain(); // pitch down voice
    this.directGain = audioContext.createGain(); // direct signal
    
    // Mixer for all voices
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;
    
    this.voice1Gain.gain.value = 0.5;
    this.voice2Gain.gain.value = 0.5;
    this.directGain.gain.value = 0.5;
    
    // Pitch shifter nodes (created async)
    this.pitchShifter1 = null;
    this.pitchShifter2 = null;
    this._workletReady = false;
    
    // Default detune in cents
    this._detuneCents = 10;
    
    // Routing (basic path - upgraded when worklet loads)
    this.input.connect(this.inputGain);
    
    // Direct signal path
    this.inputGain.connect(this.directGain);
    this.directGain.connect(this.mixer);
    
    // Mixer → wet → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Initialize pitch shifter worklet
    this._initWorklet(audioContext);
    
    this.params = { amount: 10, mix: 50 };
  }
  
  async _initWorklet(audioContext) {
    try {
      // Ensure worklet module is loaded
      await audioContext.audioWorklet.addModule('pitch-shifter-processor.js');
    } catch (e) {
      // Module may already be registered, that's fine
    }
    
    try {
      // Voice 1: pitch UP by +cents (converted to semitones)
      this.pitchShifter1 = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchShifter1.parameters.get('pitch').value = this._detuneCents / 100;
      this.pitchShifter1.parameters.get('mix').value = 1.0;
      this.pitchShifter1.parameters.get('grain').value = 50;
      
      // Voice 2: pitch DOWN by -cents (converted to semitones)
      this.pitchShifter2 = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchShifter2.parameters.get('pitch').value = -(this._detuneCents / 100);
      this.pitchShifter2.parameters.get('mix').value = 1.0;
      this.pitchShifter2.parameters.get('grain').value = 50;
      
      // Connect: input → pitchShifter1 → voice1Gain → mixer
      this.inputGain.connect(this.pitchShifter1);
      this.pitchShifter1.connect(this.voice1Gain);
      this.voice1Gain.connect(this.mixer);
      
      // Connect: input → pitchShifter2 → voice2Gain → mixer
      this.inputGain.connect(this.pitchShifter2);
      this.pitchShifter2.connect(this.voice2Gain);
      this.voice2Gain.connect(this.mixer);
      
      this._workletReady = true;
    } catch (e) {
      console.warn('DetuneEffect: pitch-shifter worklet not available, falling back to direct signal', e);
      // Fallback: just pass direct signal through (no detune effect)
      this._workletReady = false;
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'amount':
        // Detune amount: value 0-100 maps to 0-50 cents
        this._detuneCents = (value / 100) * 50;
        const semitones = this._detuneCents / 100;
        if (this._workletReady && this.pitchShifter1 && this.pitchShifter2) {
          this.pitchShifter1.parameters.get('pitch').setTargetAtTime(semitones, now, 0.01);
          this.pitchShifter2.parameters.get('pitch').setTargetAtTime(-semitones, now, 0.01);
        }
        break;
      case 'mix':
        // Mix: 0-100 → 0.0-1.0, controls wet level
        this.setMix(value / 100);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.directGain.disconnect();
    this.voice1Gain.disconnect();
    this.voice2Gain.disconnect();
    this.mixer.disconnect();
    if (this.pitchShifter1) {
      try { this.pitchShifter1.disconnect(); } catch (e) {}
    }
    if (this.pitchShifter2) {
      try { this.pitchShifter2.disconnect(); } catch (e) {}
    }
  }
}

export default DetuneEffect;
