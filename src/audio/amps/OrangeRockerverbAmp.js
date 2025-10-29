import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class OrangeRockerverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Orange Rockerverb', 'orange_rockerverb');
    
    // ORANGE ROCKERVERB (British high-gain meets vintage warmth)
    // Used by Mastodon, Slipknot, High on Fire
    // Known for: Thick mids, massive headroom, natural compression
    
    // ============================================
    // NOISE GATE (Dirty channel only)
    // ============================================
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -52;
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20;
    this.noiseGate.attack.value = 0.001;
    this.noiseGate.release.value = 0.08;
    
    // ============================================
    // 2 CHANNELS with CROSSFADE (pop-free switching)
    // ============================================
    this.cleanChannel = audioContext.createGain();
    this.dirtyChannel = audioContext.createGain();
    this.cleanChannelGain = audioContext.createGain();
    this.dirtyChannelGain = audioContext.createGain();
    this.channelMixer = audioContext.createGain();
    
    // Active channel
    this.activeChannel = 'dirty'; // 'clean' or 'dirty'
    
    // ============================================
    // PREAMP (Cascading gain stages)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.preamp3 = audioContext.createGain();
    
    // Saturation stages with unique curves per stage
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    this.saturation3 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeOrangePreampCurve({drive: 5.2, asym: 1.04});
    this.saturation2.curve = this.makeOrangePreampCurve({drive: 5.8, asym: 1.07});
    this.saturation3.curve = this.makeOrangePreampCurve({drive: 6.3, asym: 1.10});
    
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    this.saturation3.oversample = '4x';
    
    // ============================================
    // TIGHT HPF (before 3rd stage - controls bass)
    // ============================================
    this.tightHPF = audioContext.createBiquadFilter();
    this.tightHPF.type = 'highpass';
    this.tightHPF.frequency.value = 90;
    this.tightHPF.Q.value = 0.707;
    
    // ============================================
    // ROCKERVERB TONE STACK (Bass, Mid, Treble)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 120;
    this.bass.gain.value = 0;
    
    this.mid.type = 'peaking';
    this.mid.frequency.value = 800;
    this.mid.Q.value = 1.0;
    this.mid.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2500;
    this.treble.gain.value = 0;
    
    // ============================================
    // ORANGE MIDRANGE CHARACTER
    // (Signature Orange mid-forward voicing)
    // ============================================
    this.midCharacter = audioContext.createBiquadFilter();
    this.midCharacter.type = 'peaking';
    this.midCharacter.frequency.value = 850;
    this.midCharacter.Q.value = 1.8;
    this.midCharacter.gain.value = 3; // Reduced from 6 to 3 dB
    
    // ============================================
    // BUILT-IN REVERB (Spring with all-pass)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // All-pass filters for more spring-like character
    this.revAP1 = audioContext.createBiquadFilter();
    this.revAP2 = audioContext.createBiquadFilter();
    this.revAP1.type = 'allpass';
    this.revAP2.type = 'allpass';
    this.revAP1.frequency.value = 1200;
    this.revAP2.frequency.value = 1800;
    
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
    this.reverbLPF.frequency.value = 3000; // Reduced from 3500 for warmer spring
    
    // Reverb routing with all-pass
    this.reverbSend.connect(this.revAP1);
    this.revAP1.connect(this.revAP2);
    this.revAP2.connect(this.reverbDelay1);
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
    // DC BLOCKER (Essential before cabinet)
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    this.dcBlock.Q.value = 0.707;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null;
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_closed';
    this.micType = 'sm57';
    this.micPosition = 'edge';
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // Output mixer (dry + reverb)
    this.outputMixer = audioContext.createGain();
    
    // ============================================
    // PARAMS (BEFORE SETUP - CRITICAL!)
    // ============================================
    this.params = {
      channel: 1, // 0=clean, 1=dirty
      
      // Gain/Volume
      gain: 70,
      channel_volume: 70,
      
      // Tone stack (with Mid!)
      bass: 60,
      mid: 50,
      treble: 65,
      
      // Reverb
      reverb: 30,
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true,
      cabinet: '2x12_closed',
      microphone: 'sm57',
      micPosition: 'center'
    };
    
    // ============================================
    // ROUTING - Setup both channels for crossfade
    // ============================================
    this.setupChannels();
    this.setActiveChannel('dirty');
    this.recreateCabinet();
    this.applyInitialSettings();
  }
  
  /**
   * Setup both channels in parallel for pop-free crossfade switching
   */
  setupChannels() {
    // CLEAN CHANNEL PATH (2 stages)
    this.input.connect(this.cleanChannel);
    this.cleanChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    this.saturation2.connect(this.cleanChannelGain);
    
    // DIRTY CHANNEL PATH (3 stages with noise gate and tight HPF)
    this.input.connect(this.noiseGate);
    this.noiseGate.connect(this.dirtyChannel);
    this.dirtyChannel.connect(this.preamp1);
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    // Tight HPF before 3rd stage for controlled bass
    this.saturation2.connect(this.tightHPF);
    this.tightHPF.connect(this.preamp3);
    this.preamp3.connect(this.saturation3);
    this.saturation3.connect(this.dirtyChannelGain);
    
    // Mix channels
    this.cleanChannelGain.connect(this.channelMixer);
    this.dirtyChannelGain.connect(this.channelMixer);
    
    // Shared tone stack (now with Mid control!)
    this.channelMixer.connect(this.bass);
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    this.treble.connect(this.midCharacter);
    this.midCharacter.connect(this.channelVolume);
    
    // Split for reverb (dry/wet mix)
    this.channelVolume.connect(this.reverbSend);
    this.channelVolume.connect(this.outputMixer);
    this.reverbReturn.connect(this.outputMixer);
    
    // Power section
    this.outputMixer.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet (can be bypassed)
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    
    this.master.connect(this.output);
  }
  
  /**
   * Crossfade between channels (15-30ms for pop-free switching)
   */
  setActiveChannel(channel) {
    const now = this.audioContext.currentTime;
    const fadeTime = 0.020; // 20ms crossfade
    
    if (channel === 'clean') {
      this.cleanChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.dirtyChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.activeChannel = 'clean';
    } else {
      this.cleanChannelGain.gain.setTargetAtTime(0.0, now, fadeTime);
      this.dirtyChannelGain.gain.setTargetAtTime(1.0, now, fadeTime);
      this.activeChannel = 'dirty';
    }
  }
  
  reconnectChannels() {
    this.disconnectAll();
    this.setupChannels();
    this.setActiveChannel(this.activeChannel);
  }
  
  disconnectAll() {
    try {
      this.input.disconnect();
      this.noiseGate.disconnect();
      this.cleanChannel.disconnect();
      this.dirtyChannel.disconnect();
      this.cleanChannelGain.disconnect();
      this.dirtyChannelGain.disconnect();
      this.channelMixer.disconnect();
      this.preamp1.disconnect();
      this.saturation1.disconnect();
      this.preamp2.disconnect();
      this.saturation2.disconnect();
      this.tightHPF.disconnect();
      this.preamp3.disconnect();
      this.saturation3.disconnect();
      this.bass.disconnect();
      this.mid.disconnect();
      this.treble.disconnect();
      this.midCharacter.disconnect();
      this.channelVolume.disconnect();
      this.reverbSend.disconnect();
      this.revAP1.disconnect();
      this.revAP2.disconnect();
      this.reverbReturn.disconnect();
      this.outputMixer.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabIR.disconnect();
      this.cabBypass.disconnect();
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
    this.cabBypass.gain.value = 1.0;
    
    // Reverb fixed send/return (control via mix)
    this.reverbSend.gain.value = 0.25;
    this.reverbReturn.gain.value = 0.5;
    this.outputMixer.gain.value = 1.0;
  }
  
  makeOrangePreampCurve({drive=5.5, asym=1.08} = {}) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // ORANGE "THICK" SATURATION with adjustable drive
      let y = Math.tanh(x * drive);
      
      // NATURAL COMPRESSION
      if (Math.abs(y) > 0.5) {
        const compression = 1 - (Math.abs(y) - 0.5) * 0.25;
        y *= compression;
      }
      
      // MID-FORWARD CHARACTER
      y += 0.15 * Math.tanh(x * 8);
      
      // Warmth
      y += 0.08 * Math.sin(x * Math.PI * 3);
      
      // Asymmetry (varies per stage)
      y *= x > 0 ? asym : 1 / asym;
      
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
  
  /**
   * Logarithmic scaling for musical control response
   */
  lin2log(value01) {
    return 0.001 * Math.pow(1000, value01); // ~-60dB to 0dB
  }
  
  recreateCabinet() {
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {}
    }
    try { this.preCabinet.disconnect(); } catch (e) {}
    
    if (this.cabinetEnabled) {
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'channel':
        this.setActiveChannel(value === 0 ? 'clean' : 'dirty');
        break;
      
      case 'gain': {
        const g = this.lin2log(value / 100) * 14;
        this.preamp1.gain.setTargetAtTime(Math.max(1, g * 0.55), now, 0.01);
        this.preamp2.gain.setTargetAtTime(Math.max(1, g * 0.30), now, 0.01);
        this.preamp3.gain.setTargetAtTime(Math.max(1, g * 0.22), now, 0.01);
        break;
      }
      
      case 'channel_volume':
        this.channelVolume.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'mid':
        this.mid.gain.setTargetAtTime((value - 50) / 5, now, 0.01); // ±10 dB range
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'reverb': {
        const wet = value / 100;         // 0..1
        const dry = 1 - wet * 0.4;       // conserve body of dry signal
        this.reverbReturn.gain.setTargetAtTime(wet, now, 0.01);
        this.outputMixer.gain.setTargetAtTime(dry, now, 0.01);
        break;
      }
      
      case 'master':
        this.master.gain.setTargetAtTime(this.lin2log(value / 100), now, 0.01);
        break;
      
      case 'cabinet_enabled':
        this.cabinetEnabled = !!value;
        this.recreateCabinet();
        break;
      case 'cabinet':
        this.cabinetType = value;
        this.recreateCabinet();
        break;
      case 'microphone':
      case 'micType':
        this.micType = value;
        this.recreateCabinet();
        break;
      case 'micPosition':
        this.micPosition = value;
        this.recreateCabinet();
        break;
    }
    
    this.params[parameter] = value;
  }
  
  /**
   * Load default Orange 2×12 closed-back cabinet IR
   */
  loadDefaultCabinetIR() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.040; // 40ms - Orange 2×12 characteristic response
    const length = Math.floor(duration * sampleRate);
    
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Orange Rockerverb signature 2×12 closed cabinet with Voice of the World speakers
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Medium-fast decay for punchy mids
      const decay = Math.exp(-t / 0.009); // 9ms decay
      
      // Early reflections (closed-back cabinet)
      const early = i < sampleRate * 0.003 ? Math.random() * 0.4 : 0;
      
      // Main impulse
      let sample = (Math.random() * 2 - 1) * decay;
      sample += early * decay;
      
      // Orange "Voice of the World" speaker response (thick mids, smooth highs)
      if (i > 0) {
        const alpha = 0.75; // Smooth but articulate
        sample = alpha * sample + (1 - alpha) * channelData[i - 1];
      }
      
      // Emphasize 800-1.5kHz region (Orange mid character)
      if (i > sampleRate * 0.002 && i < sampleRate * 0.008) {
        sample *= 1.18;
      }
      
      // Smooth highs (no harshness)
      if (i > sampleRate * 0.006 && i < sampleRate * 0.015) {
        sample *= 0.88;
      }
      
      // Warm low-end presence
      if (i > sampleRate * 0.001 && i < sampleRate * 0.004) {
        sample *= 1.08;
      }
      
      channelData[i] = sample * 0.90;
    }
    
    // Normalize
    let maxVal = 0;
    for (let i = 0; i < length; i++) {
      maxVal = Math.max(maxVal, Math.abs(channelData[i]));
    }
    if (maxVal > 0) {
      for (let i = 0; i < length; i++) {
        channelData[i] /= maxVal;
      }
    }
    
    this.cabIR.buffer = buffer;
    console.log('✅ Orange Rockerverb: Default 2×12 closed cabinet IR loaded (40ms)');
  }
  
  disconnect() {
    super.disconnect();
    this.noiseGate.disconnect();
    this.cleanChannel.disconnect();
    this.dirtyChannel.disconnect();
    this.cleanChannelGain.disconnect();
    this.dirtyChannelGain.disconnect();
    this.channelMixer.disconnect();
    this.preamp1.disconnect();
    this.saturation1.disconnect();
    this.preamp2.disconnect();
    this.saturation2.disconnect();
    this.tightHPF.disconnect();
    this.preamp3.disconnect();
    this.saturation3.disconnect();
    this.bass.disconnect();
    this.mid.disconnect();
    this.treble.disconnect();
    this.midCharacter.disconnect();
    this.channelVolume.disconnect();
    this.reverbSend.disconnect();
    this.revAP1.disconnect();
    this.revAP2.disconnect();
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
    this.dcBlock.disconnect();
    this.cabIR.disconnect();
    this.cabBypass.disconnect();
    this.master.disconnect();
  }
}

export default OrangeRockerverbAmp;
