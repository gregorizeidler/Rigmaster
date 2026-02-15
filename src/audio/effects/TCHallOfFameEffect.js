import BaseEffect from './BaseEffect';

/**
 * TCHallOfFameEffect - TC Electronic Hall of Fame Reverb
 * 
 * Top-selling affordable reverb
 * TonePrint technology
 * 
 * Features:
 * - 10 reverb types (algorithmic, no random noise IRs)
 * - Simple 3-knob control
 * - Pristine sound quality
 */

class TCHallOfFameEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Hall of Fame', 'tchalloffame');
    
    // Type presets: delay scaling, feedback, damping frequency, pre-delay
    this.typePresets = {
      'spring':  { delayScale: 0.6,  feedback: 0.75, damping: 3000,  preDelay: 0.01  },
      'hall':    { delayScale: 1.0,  feedback: 0.88, damping: 7000,  preDelay: 0.03  },
      'plate':   { delayScale: 0.8,  feedback: 0.86, damping: 9000,  preDelay: 0.01  },
      'room':    { delayScale: 0.5,  feedback: 0.72, damping: 4500,  preDelay: 0.005 },
      'church':  { delayScale: 1.5,  feedback: 0.92, damping: 6000,  preDelay: 0.05  },
      'mod':     { delayScale: 0.9,  feedback: 0.85, damping: 7000,  preDelay: 0.02  },
      'tile':    { delayScale: 0.4,  feedback: 0.68, damping: 10000, preDelay: 0.003 },
      'ambient': { delayScale: 1.3,  feedback: 0.90, damping: 5000,  preDelay: 0.04  },
      'lo-fi':   { delayScale: 0.7,  feedback: 0.80, damping: 2500,  preDelay: 0.02  },
      'gate':    { delayScale: 0.3,  feedback: 0.55, damping: 8000,  preDelay: 0.0   }
    };
    
    // Base comb filter delay times (scaled by type preset)
    this.baseCombDelayTimes = [
      0.0297, 0.0371, 0.0411, 0.0437,
      0.0253, 0.0269, 0.0290, 0.0307
    ];
    
    // Allpass delay times
    this.allpassDelayTimes = [0.0051, 0.0067, 0.0083, 0.0097];
    
    // Pre-delay
    this.preDelay = audioContext.createDelay(0.5);
    this.preDelay.delayTime.value = 0.03;
    
    // Create 8 comb filters with per-comb damping
    this.combFilters = [];
    this.combGains = [];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      const feedback = audioContext.createGain();
      const damping = audioContext.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = 7000;
      damping.Q.value = 0.707;
      const combGain = audioContext.createGain();
      
      delay.delayTime.value = this.baseCombDelayTimes[i];
      feedback.gain.value = 0.88;
      combGain.gain.value = 0.125;
      
      this.combFilters.push({ delay, feedback, damping });
      this.combGains.push(combGain);
    }
    
    // Comb mixer
    this.combMixer = audioContext.createGain();
    
    // Create 4 allpass filters (correct Schroeder structure)
    this.allpassFilters = [];
    for (let i = 0; i < 4; i++) {
      const apInput = audioContext.createGain();
      const apOutput = audioContext.createGain();
      const delay = audioContext.createDelay(0.1);
      const fbGain = audioContext.createGain();
      const ffGain = audioContext.createGain();
      
      delay.delayTime.value = this.allpassDelayTimes[i];
      fbGain.gain.value = 0.7;
      ffGain.gain.value = -0.7;
      
      apInput.connect(ffGain);
      ffGain.connect(apOutput);
      apInput.connect(delay);
      delay.connect(apOutput);
      delay.connect(fbGain);
      fbGain.connect(apInput);
      
      this.allpassFilters.push({ input: apInput, output: apOutput, delay, fbGain, ffGain });
    }
    
    // Tone control (post-reverb EQ)
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 10000;
    this.toneFilter.Q.value = 0.707;
    
    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;
    
    // Level control
    this.reverbGain = audioContext.createGain();
    this.reverbGain.gain.value = 0.3;
    
    // Current type
    this.reverbType = 'hall';
    
    // === ROUTING ===
    
    // Input → pre-delay → comb filters
    this.input.connect(this.preDelay);
    
    for (let i = 0; i < 8; i++) {
      const { delay, feedback, damping } = this.combFilters[i];
      const combGain = this.combGains[i];
      
      this.preDelay.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      delay.connect(combGain);
      combGain.connect(this.combMixer);
    }
    
    // Allpass in series
    this.combMixer.connect(this.allpassFilters[0].input);
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].output.connect(this.allpassFilters[i + 1].input);
    }
    
    // Output chain: allpass → DC blocker → tone → level → wet → output
    this.allpassFilters[3].output.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Apply initial type preset
    this.applyTypePreset(this.reverbType);
  }
  
  applyTypePreset(type) {
    const now = this.audioContext.currentTime;
    const preset = this.typePresets[type] || this.typePresets['hall'];
    
    for (let i = 0; i < 8; i++) {
      this.combFilters[i].delay.delayTime.setTargetAtTime(
        this.baseCombDelayTimes[i] * preset.delayScale, now, 0.02
      );
      this.combFilters[i].feedback.gain.setTargetAtTime(preset.feedback, now, 0.02);
      this.combFilters[i].damping.frequency.setTargetAtTime(preset.damping, now, 0.02);
    }
    
    this.preDelay.delayTime.setTargetAtTime(preset.preDelay, now, 0.02);
  }
  
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'decay':
        // Scale feedback around the current type's baseline
        const preset = this.typePresets[this.reverbType] || this.typePresets['hall'];
        const baseFb = preset.feedback;
        // Allow +/- 0.1 range around baseline
        const feedback = Math.max(0.4, Math.min(0.95, baseFb - 0.1 + (value / 100) * 0.2));
        for (let i = 0; i < 8; i++) {
          this.combFilters[i].feedback.gain.setTargetAtTime(feedback, now, 0.01);
        }
        break;
        
      case 'tone':
        this.toneFilter.frequency.setTargetAtTime(2000 + (value / 100) * 18000, now, 0.01);
        break;
        
      case 'level':
        this.reverbGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
        
      case 'predelay':
        this.preDelay.delayTime.setTargetAtTime((value / 100) * 0.5, now, 0.01);
        break;
        
      case 'type':
        this.reverbType = value;
        this.applyTypePreset(value);
        break;
    }
  }
  
  disconnect() {
    super.disconnect();
    this.preDelay.disconnect();
    for (let i = 0; i < 8; i++) {
      this.combFilters[i].delay.disconnect();
      this.combFilters[i].feedback.disconnect();
      this.combFilters[i].damping.disconnect();
      this.combGains[i].disconnect();
    }
    this.combMixer.disconnect();
    for (let i = 0; i < 4; i++) {
      this.allpassFilters[i].input.disconnect();
      this.allpassFilters[i].output.disconnect();
      this.allpassFilters[i].delay.disconnect();
      this.allpassFilters[i].fbGain.disconnect();
      this.allpassFilters[i].ffGain.disconnect();
    }
    this.toneFilter.disconnect();
    this.dcBlocker.disconnect();
    this.reverbGain.disconnect();
  }
}

export default TCHallOfFameEffect;
