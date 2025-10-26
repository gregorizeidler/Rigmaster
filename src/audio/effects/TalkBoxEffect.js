import BaseEffect from './BaseEffect.js';

class TalkBoxEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Talk Box', 'talkbox');
    
    // TALK BOX (Formant filter/vocoder-style)
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Formant filters (vowel shaping)
    this.formant1 = audioContext.createBiquadFilter();
    this.formant2 = audioContext.createBiquadFilter();
    this.formant3 = audioContext.createBiquadFilter();
    
    this.formant1.type = 'bandpass';
    this.formant2.type = 'bandpass';
    this.formant3.type = 'bandpass';
    
    this.formant1.Q.value = 10;
    this.formant2.Q.value = 10;
    this.formant3.Q.value = 10;
    
    // Default to "A" vowel
    this.setVowel('a');
    
    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.formant1);
    this.formant1.connect(this.formant2);
    this.formant2.connect(this.formant3);
    this.formant3.connect(this.outputGain);
    this.outputGain.connect(this.output);
    
    this.params = { vowel: 0, resonance: 50, mix: 100 };
  }
  
  setVowel(vowel) {
    // Formant frequencies for different vowels
    const formants = {
      'a': [700, 1220, 2600],   // "ah"
      'e': [530, 1840, 2480],   // "eh"
      'i': [270, 2290, 3010],   // "ee"
      'o': [570, 840, 2410],    // "oh"
      'u': [440, 1020, 2240]    // "oo"
    };
    
    const f = formants[vowel] || formants['a'];
    this.formant1.frequency.value = f[0];
    this.formant2.frequency.value = f[1];
    this.formant3.frequency.value = f[2];
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'vowel':
        // 0-20=a, 21-40=e, 41-60=i, 61-80=o, 81-100=u
        const vowels = ['a', 'e', 'i', 'o', 'u'];
        const idx = Math.floor(value / 20);
        this.setVowel(vowels[Math.min(idx, 4)]);
        break;
      case 'resonance':
        const q = 5 + (value / 100) * 20; // 5 to 25
        this.formant1.Q.setTargetAtTime(q, now, 0.01);
        this.formant2.Q.setTargetAtTime(q, now, 0.01);
        this.formant3.Q.setTargetAtTime(q, now, 0.01);
        break;
      case 'mix':
        this.outputGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.inputGain.disconnect();
    this.formant1.disconnect();
    this.formant2.disconnect();
    this.formant3.disconnect();
    this.outputGain.disconnect();
  }
}

export default TalkBoxEffect;

