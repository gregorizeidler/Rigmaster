import BaseEffect from './BaseEffect';

/**
 * Strymon Mobius - Professional Modulation Workstation
 * 
 * 12 MODULATION MACHINES:
 * 1. Chorus - Classic stereo chorus
 * 2. Flanger - Through-zero flanger
 * 3. Phaser - 4/6/8/10/12-stage phaser
 * 4. Rotary - Rotary speaker (Leslie)
 * 5. Vibe - Uni-Vibe/Vibratone
 * 6. Tremolo - Harmonic/Bias/Optical
 * 7. Vibrato - Pitch vibrato
 * 8. Auto-Pan - Stereo auto-panner
 * 9. Filter - Envelope/LFO filter
 * 10. Ring Mod - Ring modulator
 * 11. Destroyer - Lo-fi/bit crusher
 * 12. Quad-Flange - 4-voice flanger
 * 
 * CONTROLS:
 * - SPEED: LFO/motor speed
 * - DEPTH: Modulation depth
 * - TONE: Tone/filter control
 * - MIX: Wet/dry mix
 * - MODIFY: Machine-specific control
 * - WAVE: LFO waveform
 * - TAP: Tap tempo
 */
class StrymonMobiusEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Strymon Mobius', 'strymonmobius');
    
    this.modulationTypes = {
      'chorus': 'Chorus',
      'flanger': 'Flanger',
      'phaser': 'Phaser',
      'rotary': 'Rotary',
      'vibe': 'Vibe',
      'tremolo': 'Tremolo',
      'vibrato': 'Vibrato',
      'autopan': 'Auto-Pan',
      'filter': 'Filter',
      'ringmod': 'Ring Mod',
      'destroyer': 'Destroyer',
      'quadflange': 'Quad-Flange'
    };
    
    this.currentType = 'chorus';
    
    // === CHORUS/FLANGER (stereo delay lines) ===
    this.delayL = audioContext.createDelay(0.1);
    this.delayR = audioContext.createDelay(0.1);
    this.delayL.delayTime.value = 0.008;
    this.delayR.delayTime.value = 0.010;
    
    // Additional delays for quad-flange
    this.delayL2 = audioContext.createDelay(0.1);
    this.delayR2 = audioContext.createDelay(0.1);
    this.delayL2.delayTime.value = 0.012;
    this.delayR2.delayTime.value = 0.014;
    
    // === LFO SYSTEM (dual LFO) ===
    this.lfo1 = audioContext.createOscillator();
    this.lfo2 = audioContext.createOscillator();
    this.lfoDepth1 = audioContext.createGain();
    this.lfoDepth2 = audioContext.createGain();
    this.lfo1.type = 'sine';
    this.lfo2.type = 'sine';
    this.lfo1.frequency.value = 0.5;
    this.lfo2.frequency.value = 0.6; // Slightly offset
    this.lfoDepth1.gain.value = 0.003;
    this.lfoDepth2.gain.value = 0.003;
    this.lfo1.start();
    this.lfo2.start();
    
    // === PHASER (12-stage allpass) ===
    this.allpass = [];
    for (let i = 0; i < 12; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 200 + (i * 200);
      filter.Q.value = 1.0;
      this.allpass.push(filter);
    }
    
    this.phaserStages = 4; // 4, 6, 8, 10, or 12 stages
    
    // === ROTARY SPEAKER SIMULATION ===
    // Horn (high frequencies)
    this.rotaryHornLP = audioContext.createBiquadFilter();
    this.rotaryHornHP = audioContext.createBiquadFilter();
    this.rotaryHornLP.type = 'lowpass';
    this.rotaryHornHP.type = 'highpass';
    this.rotaryHornLP.frequency.value = 4000;
    this.rotaryHornHP.frequency.value = 800;
    
    this.rotaryHornDelay = audioContext.createDelay(0.1);
    this.rotaryHornDelay.delayTime.value = 0.01;
    this.rotaryHornAM = audioContext.createGain(); // Amplitude modulation
    this.rotaryHornAM.gain.value = 1.0;
    
    // Drum (low frequencies)
    this.rotaryDrumLP = audioContext.createBiquadFilter();
    this.rotaryDrumLP.type = 'lowpass';
    this.rotaryDrumLP.frequency.value = 800;
    
    this.rotaryDrumDelay = audioContext.createDelay(0.1);
    this.rotaryDrumDelay.delayTime.value = 0.015;
    this.rotaryDrumAM = audioContext.createGain();
    this.rotaryDrumAM.gain.value = 1.0;
    
    // === TREMOLO ===
    this.tremoloGain = audioContext.createGain();
    this.tremoloGain.gain.value = 1.0;
    this.tremoloDepth = audioContext.createGain();
    this.tremoloDepth.gain.value = 0;
    
    // === VIBRATO (pitch modulation) ===
    this.vibratoDelay = audioContext.createDelay(0.05);
    this.vibratoDelay.delayTime.value = 0.005;
    this.vibratoDepth = audioContext.createGain();
    this.vibratoDepth.gain.value = 0;
    
    // === AUTO-PAN ===
    this.pannerL = audioContext.createStereoPanner();
    this.pannerR = audioContext.createStereoPanner();
    this.pannerL.pan.value = -0.5;
    this.pannerR.pan.value = 0.5;
    
    // === FILTER (envelope/LFO) ===
    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.value = 1000;
    this.filterNode.Q.value = 4;
    
    // === RING MODULATOR ===
    this.ringModOsc = audioContext.createOscillator();
    this.ringModGain = audioContext.createGain();
    this.ringModOsc.frequency.value = 100;
    this.ringModGain.gain.value = 0;
    this.ringModOsc.start();
    
    // === DESTROYER (Lo-Fi/Bit Crusher) ===
    this.destroyerCrusher = audioContext.createWaveShaper();
    this.destroyerCrusher.oversample = 'none';
    this.destroyerCrusher.curve = this.makeBitCrushCurve(16);
    
    this.destroyerLP = audioContext.createBiquadFilter();
    this.destroyerLP.type = 'lowpass';
    this.destroyerLP.frequency.value = 4000;
    
    // === FEEDBACK ===
    this.feedbackL = audioContext.createGain();
    this.feedbackR = audioContext.createGain();
    this.feedbackL.gain.value = 0.5;
    this.feedbackR.gain.value = 0.5;
    
    // === TONE SHAPING ===
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 8000;
    
    // === STEREO WIDTH ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.widthL = audioContext.createGain();
    this.widthR = audioContext.createGain();
    this.widthL.gain.value = 1.0;
    this.widthR.gain.value = 1.0;
    
    // === MIX ===
    this.wetMix = audioContext.createGain();
    this.wetMix.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === MACHINE-SPECIFIC PARAMETERS ===
    this.modify = 50; // Machine-specific control
    this.waveform = 'sine';
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  setupRouting() {
    // Basic stereo split
    this.input.connect(this.splitter);
    
    // LEFT CHANNEL - goes through delay and processing
    this.splitter.connect(this.delayL, 0);
    this.delayL.connect(this.toneFilter);
    
    // RIGHT CHANNEL
    this.splitter.connect(this.delayR, 1);
    this.delayR.connect(this.toneFilter);
    
    // Feedback loops
    this.toneFilter.connect(this.feedbackL);
    this.feedbackL.connect(this.delayL);
    this.toneFilter.connect(this.feedbackR);
    this.feedbackR.connect(this.delayR);
    
    // Output to mix
    this.toneFilter.connect(this.wetMix);
    
    // LFO modulation connections
    this.lfo1.connect(this.lfoDepth1);
    this.lfo2.connect(this.lfoDepth2);
    
    // Tremolo LFO to gain
    this.lfo1.connect(this.tremoloDepth);
    this.tremoloDepth.connect(this.tremoloGain.gain);
    
    // Final output
    this.wetMix.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  makeBitCrushCurve(bits) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const levels = Math.pow(2, bits);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      const crushed = Math.floor(x * levels) / levels;
      curve[i] = crushed;
    }
    
    return curve;
  }
  
  setModulationType(type) {
    const now = this.audioContext.currentTime;
    this.currentType = type;
    
    // Reset connections
    this.disconnectModulation();
    
    switch (type) {
      case 'chorus':
        // Classic stereo chorus
        this.delayL.delayTime.value = 0.008;
        this.delayR.delayTime.value = 0.010;
        this.lfoDepth1.gain.value = 0.003;
        this.lfoDepth2.gain.value = 0.003;
        this.lfo1.frequency.setTargetAtTime(0.5, now, 0.01);
        this.lfo2.frequency.setTargetAtTime(0.6, now, 0.01);
        this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01);
        
        // Connect LFO to delays
        this.lfoDepth1.connect(this.delayL.delayTime);
        this.lfoDepth2.connect(this.delayR.delayTime);
        break;
        
      case 'flanger':
        // Through-zero flanger
        this.delayL.delayTime.value = 0.001;
        this.delayR.delayTime.value = 0.001;
        this.lfoDepth1.gain.value = 0.002;
        this.lfoDepth2.gain.value = 0.002;
        this.lfo1.frequency.setTargetAtTime(0.3, now, 0.01);
        this.feedbackL.gain.setTargetAtTime(0.7, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(0.7, now, 0.01);
        
        this.lfoDepth1.connect(this.delayL.delayTime);
        this.lfoDepth2.connect(this.delayR.delayTime);
        break;
        
      case 'phaser':
        // 12-stage phaser (adjustable stages)
        this.feedbackL.gain.setTargetAtTime(0.6, now, 0.01);
        
        // Connect allpass filters in series
        let current = this.toneFilter;
        for (let i = 0; i < this.phaserStages; i++) {
          current.connect(this.allpass[i]);
          current = this.allpass[i];
        }
        current.connect(this.wetMix);
        
        // Connect LFO to allpass frequencies
        for (let i = 0; i < this.phaserStages; i++) {
          this.lfoDepth1.connect(this.allpass[i].frequency);
        }
        break;
        
      case 'rotary':
        // Leslie rotary speaker
        this.lfo1.frequency.setTargetAtTime(0.8, now, 0.01); // Slow speed
        this.lfo2.frequency.setTargetAtTime(6.0, now, 0.01); // Fast speed
        
        // Split into horn and drum
        this.toneFilter.connect(this.rotaryHornHP);
        this.rotaryHornHP.connect(this.rotaryHornLP);
        this.rotaryHornLP.connect(this.rotaryHornDelay);
        this.rotaryHornDelay.connect(this.rotaryHornAM);
        this.rotaryHornAM.connect(this.wetMix);
        
        this.toneFilter.connect(this.rotaryDrumLP);
        this.rotaryDrumLP.connect(this.rotaryDrumDelay);
        this.rotaryDrumDelay.connect(this.rotaryDrumAM);
        this.rotaryDrumAM.connect(this.wetMix);
        
        // LFO to delays and AM
        this.lfoDepth1.connect(this.rotaryHornDelay.delayTime);
        this.lfoDepth1.connect(this.rotaryHornAM.gain);
        this.lfoDepth2.connect(this.rotaryDrumDelay.delayTime);
        this.lfoDepth2.connect(this.rotaryDrumAM.gain);
        break;
        
      case 'vibe':
        // Uni-Vibe simulation
        this.lfo1.frequency.setTargetAtTime(1.5, now, 0.01);
        this.phaserStages = 4;
        
        // 4-stage phaser with vibrato
        let currentVibe = this.toneFilter;
        for (let i = 0; i < 4; i++) {
          currentVibe.connect(this.allpass[i]);
          currentVibe = this.allpass[i];
          this.lfoDepth1.connect(this.allpass[i].frequency);
        }
        currentVibe.connect(this.wetMix);
        break;
        
      case 'tremolo':
        // Harmonic/Bias/Optical tremolo
        this.toneFilter.connect(this.tremoloGain);
        this.tremoloGain.connect(this.wetMix);
        this.lfo1.frequency.setTargetAtTime(4, now, 0.01);
        this.tremoloDepth.gain.value = 0.5;
        break;
        
      case 'vibrato':
        // Pitch vibrato
        this.toneFilter.connect(this.vibratoDelay);
        this.vibratoDelay.connect(this.wetMix);
        this.lfo1.frequency.setTargetAtTime(4, now, 0.01);
        this.vibratoDepth.gain.value = 0.002;
        this.lfoDepth1.connect(this.vibratoDelay.delayTime);
        break;
        
      case 'autopan':
        // Stereo auto-panner
        this.toneFilter.connect(this.pannerL);
        this.toneFilter.connect(this.pannerR);
        this.pannerL.connect(this.wetMix);
        this.pannerR.connect(this.wetMix);
        this.lfo1.frequency.setTargetAtTime(0.5, now, 0.01);
        // LFO modulates pan position
        this.lfoDepth1.connect(this.pannerL.pan);
        break;
        
      case 'filter':
        // Envelope/LFO filter
        this.toneFilter.connect(this.filterNode);
        this.filterNode.connect(this.wetMix);
        this.lfo1.frequency.setTargetAtTime(0.5, now, 0.01);
        this.lfoDepth1.connect(this.filterNode.frequency);
        break;
        
      case 'ringmod':
        // Ring modulator
        this.toneFilter.connect(this.ringModGain);
        this.ringModOsc.connect(this.ringModGain.gain);
        this.ringModGain.connect(this.wetMix);
        this.ringModOsc.frequency.setTargetAtTime(100, now, 0.01);
        break;
        
      case 'destroyer':
        // Lo-fi/bit crusher
        this.toneFilter.connect(this.destroyerCrusher);
        this.destroyerCrusher.connect(this.destroyerLP);
        this.destroyerLP.connect(this.wetMix);
        break;
        
      case 'quadflange':
        // 4-voice flanger
        this.delayL.delayTime.value = 0.002;
        this.delayR.delayTime.value = 0.003;
        this.delayL2.delayTime.value = 0.004;
        this.delayR2.delayTime.value = 0.005;
        
        this.toneFilter.connect(this.delayL2);
        this.delayL2.connect(this.wetMix);
        this.toneFilter.connect(this.delayR2);
        this.delayR2.connect(this.wetMix);
        
        this.lfoDepth1.connect(this.delayL.delayTime);
        this.lfoDepth1.connect(this.delayL2.delayTime);
        this.lfoDepth2.connect(this.delayR.delayTime);
        this.lfoDepth2.connect(this.delayR2.delayTime);
        break;
        
      default:
        break;
    }
  }
  
  disconnectModulation() {
    try {
      this.lfoDepth1.disconnect();
      this.lfoDepth2.disconnect();
      this.tremoloDepth.disconnect();
      
      // Disconnect all processing nodes
      this.allpass.forEach(ap => {
        try { ap.disconnect(); } catch(e) {}
      });
      
      try { this.rotaryHornHP.disconnect(); } catch(e) {}
      try { this.rotaryHornLP.disconnect(); } catch(e) {}
      try { this.rotaryHornDelay.disconnect(); } catch(e) {}
      try { this.rotaryHornAM.disconnect(); } catch(e) {}
      try { this.rotaryDrumLP.disconnect(); } catch(e) {}
      try { this.rotaryDrumDelay.disconnect(); } catch(e) {}
      try { this.rotaryDrumAM.disconnect(); } catch(e) {}
      try { this.tremoloGain.disconnect(); } catch(e) {}
      try { this.vibratoDelay.disconnect(); } catch(e) {}
      try { this.pannerL.disconnect(); } catch(e) {}
      try { this.pannerR.disconnect(); } catch(e) {}
      try { this.filterNode.disconnect(); } catch(e) {}
      try { this.ringModGain.disconnect(); } catch(e) {}
      try { this.destroyerCrusher.disconnect(); } catch(e) {}
      try { this.destroyerLP.disconnect(); } catch(e) {}
      try { this.delayL2.disconnect(); } catch(e) {}
      try { this.delayR2.disconnect(); } catch(e) {}
      
      // Reconnect LFOs to depth controls
      this.lfo1.connect(this.lfoDepth1);
      this.lfo2.connect(this.lfoDepth2);
      this.lfo1.connect(this.tremoloDepth);
    } catch(e) {
      console.warn('Error disconnecting modulation:', e);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'speed':
        // LFO speed (0.05Hz to 20Hz)
        const speed = 0.05 + (value / 100) * 19.95;
        this.lfo1.frequency.setTargetAtTime(speed, now, 0.01);
        this.lfo2.frequency.setTargetAtTime(speed * 1.2, now, 0.01);
        break;
        
      case 'depth':
        // Modulation depth (0-100%)
        const depth = value / 100;
        this.lfoDepth1.gain.setTargetAtTime(depth * 0.01, now, 0.01);
        this.lfoDepth2.gain.setTargetAtTime(depth * 0.01, now, 0.01);
        this.tremoloDepth.gain.setTargetAtTime(depth, now, 0.01);
        this.vibratoDepth.gain.setTargetAtTime(depth * 0.005, now, 0.01);
        break;
        
      case 'tone':
        // Tone control (filter frequency)
        const freq = 500 + (value / 100) * 11500;
        this.toneFilter.frequency.setTargetAtTime(freq, now, 0.01);
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      case 'feedback':
        // Feedback amount
        const fb = value / 100;
        this.feedbackL.gain.setTargetAtTime(fb, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(fb, now, 0.01);
        break;
        
      case 'modify':
        // Machine-specific control
        this.modify = value;
        this.updateModifyParameter();
        break;
        
      case 'wave':
        // LFO waveform
        this.waveform = value;
        if (value === 'sine') {
          this.lfo1.type = 'sine';
          this.lfo2.type = 'sine';
        } else if (value === 'triangle') {
          this.lfo1.type = 'triangle';
          this.lfo2.type = 'triangle';
        } else if (value === 'square') {
          this.lfo1.type = 'square';
          this.lfo2.type = 'square';
        } else if (value === 'sawtooth') {
          this.lfo1.type = 'sawtooth';
          this.lfo2.type = 'sawtooth';
        }
        break;
        
      case 'type':
        this.setModulationType(value);
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  updateModifyParameter() {
    const now = this.audioContext.currentTime;
    
    switch (this.currentType) {
      case 'phaser':
        // Modify = number of stages (4, 6, 8, 10, 12)
        this.phaserStages = 4 + Math.floor((this.modify / 100) * 4) * 2;
        this.setModulationType('phaser'); // Reconnect with new stages
        break;
        
      case 'filter':
        // Modify = filter resonance (Q)
        const q = 0.5 + (this.modify / 100) * 19.5;
        this.filterNode.Q.setTargetAtTime(q, now, 0.01);
        break;
        
      case 'ringmod':
        // Modify = ring mod frequency
        const ringFreq = 20 + (this.modify / 100) * 2000;
        this.ringModOsc.frequency.setTargetAtTime(ringFreq, now, 0.01);
        break;
        
      case 'destroyer':
        // Modify = bit depth
        const bits = 4 + Math.floor((this.modify / 100) * 12); // 4-16 bits
        this.destroyerCrusher.curve = this.makeBitCrushCurve(bits);
        break;
        
      case 'rotary':
        // Modify = slow/fast speed switch
        if (this.modify > 50) {
          // Fast
          this.lfo1.frequency.setTargetAtTime(6.0, now, 0.01);
          this.lfo2.frequency.setTargetAtTime(10.0, now, 0.01);
        } else {
          // Slow
          this.lfo1.frequency.setTargetAtTime(0.8, now, 0.01);
          this.lfo2.frequency.setTargetAtTime(1.2, now, 0.01);
        }
        break;
    }
  }
  
  getParameters() {
    return {
      type: this.currentType,
      speed: ((this.lfo1.frequency.value - 0.05) / 19.95) * 100,
      depth: this.lfoDepth1.gain.value * 100,
      tone: ((this.toneFilter.frequency.value - 500) / 11500) * 100,
      feedback: this.feedbackL.gain.value * 100,
      mix: this.mix * 100,
      modify: this.modify,
      wave: this.waveform
    };
  }
  
  updateMix(value) {
    // Update wet/dry mix (0-100)
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }
  
  disconnect() {
    super.disconnect();
    try {
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayL2.disconnect();
      this.delayR2.disconnect();
      this.lfo1.stop();
      this.lfo1.disconnect();
      this.lfo2.stop();
      this.lfo2.disconnect();
      this.lfoDepth1.disconnect();
      this.lfoDepth2.disconnect();
      this.allpass.forEach(f => f.disconnect());
      this.feedbackL.disconnect();
      this.feedbackR.disconnect();
      this.toneFilter.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
      this.widthL.disconnect();
      this.widthR.disconnect();
      this.wetMix.disconnect();
      this.outputGain.disconnect();
      
      // Rotary
      this.rotaryHornLP.disconnect();
      this.rotaryHornHP.disconnect();
      this.rotaryHornDelay.disconnect();
      this.rotaryHornAM.disconnect();
      this.rotaryDrumLP.disconnect();
      this.rotaryDrumDelay.disconnect();
      this.rotaryDrumAM.disconnect();
      
      // Other effects
      this.tremoloGain.disconnect();
      this.tremoloDepth.disconnect();
      this.vibratoDelay.disconnect();
      this.vibratoDepth.disconnect();
      this.pannerL.disconnect();
      this.pannerR.disconnect();
      this.filterNode.disconnect();
      this.ringModOsc.stop();
      this.ringModOsc.disconnect();
      this.ringModGain.disconnect();
      this.destroyerCrusher.disconnect();
      this.destroyerLP.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Strymon Mobius:', e);
    }
  }
}

export default StrymonMobiusEffect;
