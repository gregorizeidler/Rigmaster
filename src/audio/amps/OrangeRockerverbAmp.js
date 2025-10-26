import BaseAmp from './BaseAmp.js';

class OrangeRockerverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Orange Rockerverb', 'orange_rockerverb');
    
    // ORANGE ROCKERVERB (British high-gain meets vintage warmth)
    // Used by Mastodon, Slipknot, High on Fire
    // Known for: Thick mids, massive headroom, natural compression
    
    // ============================================
    // 2 CHANNELS + FOOTSWITCHABLE MODES
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.dirtyChannel = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'dirty'; // 'clean' or 'dirty'
    
    // ============================================
    // PREAMP (Cascading gain stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeOrangePreampCurve();
    this.saturation2.curve = this.makeOrangePreampCurve();
    this.saturation3.curve = this.makeOrangePreampCurve();
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // ORANGE "PICS ONLY" TONE STACK
    // (No mid control - famous Orange characteristic)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // ============================================
    // ORANGE MIDRANGE CHARACTER
    // (Fixed mid-forward voicing)
    // ============================================
    this.midCharacter = audioContext.createBiquadFilter();
    this.midCharacter.type = 'peaking';
    this.midCharacter.frequency.value = 850;
    this.midCharacter.Q.value = 1.8;
    this.midCharacter.gain.value = 6; // Always present
    
    // ============================================
    // BUILT-IN REVERB (Spring)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    this.reverbDelay1 = audioContext.createDelay();
    this.reverbDelay2 = audioContext.createDelay();
    this.reverbDelay3 = audioContext.createDelay();
    this.reverbFeedback = audioContext.createGain();
    this.reverbLPF = audioContext.createBiquadFilter();
    
    this.reverbDelay1.delayTime.value = 0.029;
    this.reverbDelay2.delayTime.value = 0.037;
    this.reverbDelay3.delayTime.value = 0.043;
    this.reverbFeedback.gain.value = 0.4;
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 3500;
    
    // Reverb routing
    this.reverbSend.connect(this.reverbDelay1);
    this.reverbDelay1.connect(this.reverbDelay2);
    this.reverbDelay2.connect(this.reverbDelay3);
    this.reverbDelay3.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbDelay1);
    this.reverbLPF.connect(this.reverbReturn);
    
    // ============================================
    // POWER AMP (4x EL34 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Orange's natural compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 15;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.008;
    this.powerComp.release.value = 0.12;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // Output mixer (dry + reverb)
    this.outputMixer = audioContext.createGain();
    
    // ============================================
    // ROUTING - DIRTY CHANNEL (DEFAULT)
    // ============================================
    this.setupDirtyChannel();
    
    this.params = {
      channel: 1, // 0=clean, 1=dirty
      
      // Gain/Volume
      gain: 70,
      channel_volume: 70,
      
      // Tone stack
      bass: 60,
      treble: 65,
      
      // Reverb
      reverb: 30,
      
      // Master
      master: 70
    };
    
    this.applyInitialSettings();
  }
  
  setupCleanChannel() {
    // CLEAN CHANNEL - 2 gain stages
    this.disconnectAll();
    
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.midCharacter);
    this.midCharacter.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'clean';
  }
  
  setupDirtyChannel() {
    // DIRTY CHANNEL - 3 cascading gain stages
    this.disconnectAll();
    
    this.input.connect(this.dirtyChannel);
    this.dirtyChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.bass);
    this.bass.connect(this.treble);
    this.treble.connect(this.midCharacter);
    this.midCharacter.connect(this.channelVolume);
    
    // Split for reverb
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.master);
    this.master.connect(this.output);
    
    this.activeChannel = 'dirty';
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.cleanChannel.disconnect();
      this.dirtyChannel.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.bass.disconnect();
      this.treble.disconnect();
      this.midCharacter.disconnect();
      this.channelVolume.disconnect();
      this.reverbSend.disconnect();
      this.reverbReturn.disconnect();
      this.outputMixer.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.master.disconnect();
    } catch (e) {}
  }
  
  applyInitialSettings() {
    this.preamp1.gain.value = 8;
    this.preamp2.gain.value = 2.2;
    this.preamp3.gain.value = 1.6;
    this.cleanChannel.gain.value = 0.6;
    this.dirtyChannel.gain.value = 1.0;
    this.channelVolume.gain.value = 0.7;
    this.powerAmp.gain.value = 1.15;
    this.master.gain.value = 0.7;
    this.outputMixer.gain.value = 1.0;
    this.reverbSend.gain.value = 0.3;
    this.reverbReturn.gain.value = 0.5;
  }
  
  makeOrangePreampCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // ORANGE "THICK" SATURATION
      let y = Math.tanh(x * 5.5);
      
      // NATURAL COMPRESSION
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.25;
        y *= compression;
      }
      
      // MID-FORWARD CHARACTER
      y += 0.15 * Math.tanh(x * 8);
      
      // Warmth
      y += 0.08 * Math.sin(x * Math.PI * 3);
      
      // Slight asymmetry
      if (x > 0) y *= 1.08;
      
      curve[i] = y * 0.87;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 4x EL34 POWER TUBES (Class A/B)
      let y = Math.tanh(x * 1.6);
      
      // ORANGE HEADROOM (very musical compression)
      if (Math.abs(y) > 0.6) {
        const excess = Math.abs(y) - 0.6;
        y = Math.sign(y) * (0.6 + excess * 0.55);
      }
      
      // THICK LOW-END
      y += 0.12 * Math.tanh(x * 3);
      
      // EL34 aggression
      y += 0.08 * Math.tanh(x * 7);
      
      // Warmth
      y += 0.06 * Math.sin(x * Math.PI * 4);
      
      // Asymmetry
      if (x > 0) y *= 1.12;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        if (value === 0) {
          this.setupCleanChannel();
        } else {
          this.setupDirtyChannel();
        }
        break;
      
      case 'gain':
        this.preamp1.gain.setTargetAtTime(1 + (value / 9), now, 0.01);
        break;
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'reverb':
        this.reverbSend.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.cleanChannel.disconnect();
    this.dirtyChannel.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.bass.disconnect();
    this.treble.disconnect();
    this.midCharacter.disconnect();
    this.channelVolume.disconnect();
    this.reverbSend.disconnect();
    this.reverbReturn.disconnect();
    this.reverbDelay1.disconnect();
    this.reverbDelay2.disconnect();
    this.reverbDelay3.disconnect();
    this.reverbFeedback.disconnect();
    this.reverbLPF.disconnect();
    this.outputMixer.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.master.disconnect();
  }
}

export default OrangeRockerverbAmp;
