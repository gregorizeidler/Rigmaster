import BaseEffect from './BaseEffect';

class ChorusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Chorus', 'chorus');
    
    // Professional chorus with 4 voices for rich, lush sound
    this.voices = [];
    
    // Voice parameters (delay, LFO rate, LFO phase)
    const voiceParams = [
      { delay: 0.020, rate: 0.5, phase: 0 },      // Voice 1
      { delay: 0.025, rate: 0.7, phase: Math.PI / 2 }, // Voice 2 (90° phase)
      { delay: 0.030, rate: 0.6, phase: Math.PI },     // Voice 3 (180° phase)
      { delay: 0.035, rate: 0.8, phase: (3 * Math.PI) / 2 } // Voice 4 (270° phase)
    ];
    
    // Create 4 voices with independent LFOs
    for (let i = 0; i < 4; i++) {
      const voice = {
        delay: audioContext.createDelay(0.1),
        lfo: audioContext.createOscillator(),
        lfoGain: audioContext.createGain(),
        voiceGain: audioContext.createGain()
      };
      
      // Setup delay
      voice.delay.delayTime.value = voiceParams[i].delay;
      
      // Setup LFO (desynchronized for natural chorus)
      voice.lfo.type = 'sine';
      voice.lfo.frequency.value = voiceParams[i].rate;
      voice.lfoGain.gain.value = 0.003; // Modulation depth
      
      // Voice mix level
      voice.voiceGain.gain.value = 0.25; // Equal mix of 4 voices
      
      // Connect LFO to delay
      voice.lfo.connect(voice.lfoGain);
      voice.lfoGain.connect(voice.delay.delayTime);
      
      // Start LFO with phase offset
      voice.lfo.start(audioContext.currentTime + voiceParams[i].phase / (2 * Math.PI));
      
      this.voices.push(voice);
    }
    
    // Stereo splitter & merger for stereo width
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Left/Right gains for stereo width
    this.leftGain = audioContext.createGain();
    this.rightGain = audioContext.createGain();
    this.leftGain.gain.value = 0.7;
    this.rightGain.gain.value = 0.7;
    
    // Mixer for all voices
    this.voiceMixer = audioContext.createGain();
    this.voiceMixer.gain.value = 1.0;
    
    // Connect voices to mixer with stereo panning
    // Voices 1&2 -> Left, Voices 3&4 -> Right
    this.input.connect(this.voices[0].delay);
    this.voices[0].delay.connect(this.voices[0].voiceGain);
    this.voices[0].voiceGain.connect(this.leftGain);
    
    this.input.connect(this.voices[1].delay);
    this.voices[1].delay.connect(this.voices[1].voiceGain);
    this.voices[1].voiceGain.connect(this.leftGain);
    
    this.input.connect(this.voices[2].delay);
    this.voices[2].delay.connect(this.voices[2].voiceGain);
    this.voices[2].voiceGain.connect(this.rightGain);
    
    this.input.connect(this.voices[3].delay);
    this.voices[3].delay.connect(this.voices[3].voiceGain);
    this.voices[3].voiceGain.connect(this.rightGain);
    
    // Merge stereo and output
    this.leftGain.connect(this.merger, 0, 0);
    this.rightGain.connect(this.merger, 0, 1);
    this.merger.connect(this.voiceMixer);
    this.voiceMixer.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    switch (parameter) {
      case 'rate':
        // Update all LFO rates proportionally
        const baseRate = value / 20; // 0 to 5 Hz
        this.voices[0].lfo.frequency.setTargetAtTime(baseRate * 0.5, now, 0.01);
        this.voices[1].lfo.frequency.setTargetAtTime(baseRate * 0.7, now, 0.01);
        this.voices[2].lfo.frequency.setTargetAtTime(baseRate * 0.6, now, 0.01);
        this.voices[3].lfo.frequency.setTargetAtTime(baseRate * 0.8, now, 0.01);
        break;
      case 'depth':
        // Update all LFO depths
        const depth = (value / 100) * 0.008; // 0 to 8ms modulation
        for (let i = 0; i < 4; i++) {
          this.voices[i].lfoGain.gain.setTargetAtTime(depth, now, 0.01);
        }
        break;
      case 'width':
        // Control stereo width (0-100)
        const width = value / 100;
        this.leftGain.gain.setTargetAtTime(0.5 + width * 0.5, now, 0.01);
        this.rightGain.gain.setTargetAtTime(0.5 + width * 0.5, now, 0.01);
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
    
    // Disconnect all voices
    for (let i = 0; i < 4; i++) {
      this.voices[i].lfo.stop();
      this.voices[i].lfo.disconnect();
      this.voices[i].lfoGain.disconnect();
      this.voices[i].delay.disconnect();
      this.voices[i].voiceGain.disconnect();
    }
    
    this.leftGain.disconnect();
    this.rightGain.disconnect();
    this.splitter.disconnect();
    this.merger.disconnect();
    this.voiceMixer.disconnect();
  }
}

export default ChorusEffect;

