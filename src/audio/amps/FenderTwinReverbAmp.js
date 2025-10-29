import BaseAmp from './BaseAmp.js';
import CabinetSimulator from './CabinetSimulator.js';

class FenderTwinReverbAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fender Twin Reverb', 'fender_twin_reverb');
    
    // FENDER TWIN REVERB (Blackface Era 1963-1967)
    // 2 x 12" speakers, 85W, 2 channels (Normal + Vibrato)
    // Used by: Eric Johnson, Stevie Ray Vaughan, Eric Clapton
    // Known for: Crystal clean headroom, chimey highs, tight bass
    
    // ============================================
    // 2 CHANNELS - NORMAL & VIBRATO
    // ============================================
    this.normalChannel = audioContext.createGain();
    this.vibratoChannel = audioContext.createGain();
    this.activeChannel = 1; // 0 = Normal, 1 = Vibrato
    
    // ============================================
    // INPUT STAGE (Bright vs Normal)
    // ============================================
    this.inputBright = audioContext.createBiquadFilter();
    this.inputBright.type = 'highshelf';
    this.inputBright.frequency.value = 3500; // ✨ Sparkle clássico
    this.inputBright.gain.value = 0; // controlado por bright switch
    
    // ============================================
    // PREAMP STAGES (12AX7 tubes)
    // ============================================
    this.preamp1 = audioContext.createGain();
    this.preamp2 = audioContext.createGain();
    this.saturation1 = audioContext.createWaveShaper();
    this.saturation2 = audioContext.createWaveShaper();
    
    this.saturation1.curve = this.makeFenderCleanCurve();
    this.saturation2.curve = this.makeFenderCleanCurve();
    this.saturation1.oversample = '4x';
    this.saturation2.oversample = '4x';
    
    // ✨ HPF anti-lama (pré-tonestack) ~80 Hz
    this.preHPF = audioContext.createBiquadFilter();
    this.preHPF.type = 'highpass';
    this.preHPF.frequency.value = 80;
    this.preHPF.Q.value = 0.707;
    
    // ============================================
    // BLACKFACE TONE STACK
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.mid = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 100;
    this.bass.gain.value = 0;
    
    // Fender "mid scoop" characteristic
    this.mid.type = 'peaking';
    this.mid.frequency.value = 500;
    this.mid.Q.value = 0.8;
    this.mid.gain.value = -2; // natural scoop
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2800;
    this.treble.gain.value = 0;
    
    // ============================================
    // VIBRATO / TREMOLO EFFECT
    // ============================================
    this.vibratoLFO = audioContext.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = 5; // Speed
    this.vibratoLFO.start();
    
    this.vibratoDepth = audioContext.createGain();
    this.vibratoDepth.gain.value = 0; // Intensity (0 = off)
    
    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 1; // ✅ Base sempre 1.0
    
    // ✅ Vibrato setup correto (LFO modula o gain)
    this.vibratoLFO.connect(this.vibratoDepth);
    this.vibratoDepth.connect(this.vibratoGain.gain);
    
    // ============================================
    // SPRING REVERB (Fender 6G15 style)
    // ============================================
    this.reverbSend = audioContext.createGain();
    this.reverbReturn = audioContext.createGain();
    
    // Reverb tank simulation (3 spring configuration)
    this.reverbDelay1 = audioContext.createDelay();
    this.reverbDelay2 = audioContext.createDelay();
    this.reverbDelay3 = audioContext.createDelay();
    this.reverbFeedback = audioContext.createGain();
    
    this.reverbDelay1.delayTime.value = 0.037; // ~37ms
    this.reverbDelay2.delayTime.value = 0.041; // ~41ms
    this.reverbDelay3.delayTime.value = 0.043; // ~43ms
    this.reverbFeedback.gain.value = 0.3;
    
    // ✨ LPF no loop de feedback (damping realista)
    this.reverbLoopLPF = audioContext.createBiquadFilter();
    this.reverbLoopLPF.type = 'lowpass';
    this.reverbLoopLPF.frequency.value = 4500;
    this.reverbLoopLPF.Q.value = 0.707;
    
    // Spring reverb characteristic filters
    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 3500;
    this.reverbLPF.Q.value = 0.7;
    
    this.reverbHPF = audioContext.createBiquadFilter();
    this.reverbHPF.type = 'highpass';
    this.reverbHPF.frequency.value = 200;
    
    // ✨ Allpass para "drip" extra
    this.reverbAllpass = audioContext.createBiquadFilter();
    this.reverbAllpass.type = 'allpass';
    this.reverbAllpass.frequency.value = 1200;
    this.reverbAllpass.Q.value = 2.0;
    
    // Spring "boing" resonance
    this.springResonance = audioContext.createBiquadFilter();
    this.springResonance.type = 'peaking';
    this.springResonance.frequency.value = 2200;
    this.springResonance.Q.value = 3.0;
    this.springResonance.gain.value = 4;
    
    // ============================================
    // POWER AMP (4x 6L6 tubes, Class AB)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // Fender power amp compression (gentle)
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -24;
    this.powerComp.knee.value = 12;
    this.powerComp.ratio.value = 2.5;
    this.powerComp.attack.value = 0.008;
    this.powerComp.release.value = 0.15;
    
    // ============================================
    // CABINET SIMULATOR
    // ============================================
    this.cabinetSimulator = new CabinetSimulator(audioContext);
    this.cabinet = null; // Will be created on demand
    this.cabinetEnabled = true;
    this.cabinetType = '2x12_open'; // Fender Twin standard
    this.micType = 'sm57';
    this.micPosition = 'edge';
    
    // Cabinet bypass routing
    this.preCabinet = audioContext.createGain();
    this.postCabinet = audioContext.createGain();
    
    // ============================================
    // DC BLOCK & OUTPUT
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMS
    // ============================================
    this.params = {
      channel: 1, // 0 = Normal, 1 = Vibrato
      input_type: 'bright', // 'bright' or 'normal'
      
      // Volumes por canal
      normal_volume: 50,
      vibrato_volume: 50,
      
      // Tone stack
      bass: 50,
      mid: 50,
      treble: 60,
      
      // Vibrato/Tremolo
      vibrato_speed: 50, // 0-100 (0.5-12 Hz)
      vibrato_intensity: 0, // 0-100 (depth)
      
      // Reverb
      reverb: 30,
      reverb_dwell: 50, // feedback amount
      
      // Switches
      bright: true,
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true
    };
    
    // Setup inicial
    this.setupChannel(this.activeChannel);
    this.applyInitialSettings();
  }
  
  // ✅ Método de desconexão completo
  disconnectAll() {
    const nodes = [
      this.input, this.normalChannel, this.vibratoChannel, this.inputBright,
      this.preamp1, this.saturation1, this.preamp2, this.saturation2,
      this.preHPF, this.bass, this.mid, this.treble, this.vibratoGain,
      this.reverbSend, this.reverbHPF, this.reverbDelay1, this.reverbDelay2, 
      this.reverbDelay3, this.reverbFeedback, this.reverbLoopLPF,
      this.springResonance, this.reverbAllpass, this.reverbLPF, this.reverbReturn,
      this.channelVolume, this.powerComp, this.powerAmp, this.powerSaturation,
      this.dcBlock, this.cabinetSim, this.master
    ];
    
    for (const node of nodes) {
      try {
        if (node && node.disconnect) {
          node.disconnect();
        }
      } catch (e) {
        // Ignora erros de desconexão
      }
    }
  }
  
  setupChannel(channel) {
    // ✅ Desconecta tudo antes de reconectar
    this.disconnectAll();
    this.activeChannel = channel;
    
    // ============================================
    // ROUTING PRINCIPAL
    // ============================================
    this.input.connect(this.inputBright);
    
    if (channel === 0) {
      // NORMAL CHANNEL (mais simples, sem vibrato)
      this.inputBright.connect(this.normalChannel);
      this.normalChannel.connect(this.preamp1);
    } else {
      // VIBRATO CHANNEL (com efeito de tremolo)
      this.inputBright.connect(this.vibratoChannel);
      this.vibratoChannel.connect(this.preamp1);
    }
    
    // Preamp stages
    this.preamp1.connect(this.saturation1);
    this.saturation1.connect(this.preamp2);
    this.preamp2.connect(this.saturation2);
    
    // ✨ HPF anti-lama antes do tone stack
    this.saturation2.connect(this.preHPF);
    this.preHPF.connect(this.bass);
    
    // Tone stack
    this.bass.connect(this.mid);
    this.mid.connect(this.treble);
    
    // Vibrato effect (só ativo no canal vibrato)
    if (channel === 1) {
      this.vibratoGain.gain.value = 1; // ✅ Base sempre 1.0
      this.treble.connect(this.vibratoGain);
      this.vibratoGain.connect(this.channelVolume);
    } else {
      this.treble.connect(this.channelVolume);
    }
    
    // ============================================
    // REVERB SEND/RETURN (parallel)
    // ============================================
    this.channelVolume.connect(this.reverbSend);
    this.reverbSend.connect(this.reverbHPF);
    this.reverbHPF.connect(this.reverbDelay1);
    this.reverbDelay1.connect(this.reverbDelay2);
    this.reverbDelay2.connect(this.reverbDelay3);
    
    // ✅ Loop com damping (LPF no loop)
    this.reverbDelay3.connect(this.reverbFeedback);
    this.reverbFeedback.connect(this.reverbLoopLPF);
    this.reverbLoopLPF.connect(this.reverbDelay1); // feedback com LPF
    
    // ✨ Wet out com allpass drip
    this.reverbDelay3.connect(this.springResonance);
    this.springResonance.connect(this.reverbAllpass);
    this.reverbAllpass.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbReturn);
    
    // Mix dry + reverb
    this.channelVolume.connect(this.powerComp); // dry
    this.reverbReturn.connect(this.powerComp); // wet
    
    // ============================================
    // POWER AMP & OUTPUT
    // ============================================
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet routing with CabinetSimulator
    this.dcBlock.connect(this.preCabinet);
    // preCabinet → cabinet → postCabinet (configured in recreateCabinet())
    this.postCabinet.connect(this.master);
    
    this.master.connect(this.output);
  }
  
  applyInitialSettings() {
    // ✨ Ganhos iniciais (headroom otimizado)
    this.preamp1.gain.value = 1.8; // Reduzido para mais headroom
    this.preamp2.gain.value = 1.5;
    this.powerAmp.gain.value = 1.20; // Compensado (+0.05)
    
    // Volumes por canal
    this.normalChannel.gain.value = 0.001 * Math.pow(1000, this.params.normal_volume / 100);
    this.vibratoChannel.gain.value = 0.001 * Math.pow(1000, this.params.vibrato_volume / 100);
    this.channelVolume.gain.value = 1.0;
    this.master.gain.value = 0.001 * Math.pow(1000, this.params.master / 100);
    
    // Reverb
    this.reverbSend.gain.value = this.params.reverb / 200; // send level
    this.reverbReturn.gain.value = this.params.reverb / 100;
    
    // ✅ Bright switch com frequency otimizada
    this.inputBright.gain.value = this.params.bright ? 3 : 0;
    
    // Initialize cabinet
    this.recreateCabinet();
  }
  
  makeFenderCleanCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // Fender clean - muito headroom, sutil saturação
      let y = Math.tanh(x * 1.8);
      
      // Blackface sparkle (even harmonics)
      y += 0.04 * Math.sin(x * Math.PI * 2);
      
      // Subtle compression at peaks
      if (Math.abs(y) > 0.7) {
        const excess = Math.abs(y) - 0.7;
        y = Math.sign(y) * (0.7 + excess * 0.4);
      }
      
      curve[i] = y * 0.92;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // 6L6 power tubes - clean and punchy
      let y = Math.tanh(x * 1.4);
      
      // 6L6 warmth
      y += 0.05 * Math.sin(x * Math.PI * 3);
      
      // Gentle compression
      if (Math.abs(y) > 0.65) {
        const excess = Math.abs(y) - 0.65;
        y = Math.sign(y) * (0.65 + excess * 0.5);
      }
      
      curve[i] = y * 0.90;
    }
    return curve;
  }
  
  recreateCabinet() {
    // Cleanup old cabinet properly
    if (this.cabinet) {
      try {
        if (this.cabinet.dispose) this.cabinet.dispose();
        if (this.cabinet.input) this.cabinet.input.disconnect();
        if (this.cabinet.output) this.cabinet.output.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Disconnect preCabinet
    try {
      this.preCabinet.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    if (this.cabinetEnabled) {
      // Create new cabinet with current settings
      this.cabinet = this.cabinetSimulator.createCabinet(
        this.cabinetType,
        this.micType,
        this.micPosition
      );
      
      if (this.cabinet) {
        this.preCabinet.connect(this.cabinet.input);
        this.cabinet.output.connect(this.postCabinet);
      } else {
        // Fallback if cabinet creation fails
        this.preCabinet.connect(this.postCabinet);
      }
    } else {
      // Bypass cabinet
      this.preCabinet.connect(this.postCabinet);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    const lin2log = v01 => 0.001 * Math.pow(1000, v01);
    
    switch (parameter) {
      case 'channel':
        this.setupChannel(value);
        break;
      
      // ✅ input_type domina o bright (evita conflito)
      case 'input_type': {
        const isBright = (value === 'bright');
        this.params.bright = isBright; // mantém coerência
        this.inputBright.gain.setTargetAtTime(isBright ? 3 : 0, now, 0.01);
        break;
      }
      
      case 'normal_volume':
        this.normalChannel.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
      
      case 'vibrato_volume':
        this.vibratoChannel.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      // ✅ Mid range mais musical: -6 dB a +4 dB
      case 'mid': {
        const dB = -6 + (value / 100) * 10; // -6..+4 dB
        this.mid.gain.setTargetAtTime(dB, now, 0.01);
        break;
      }
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'vibrato_speed':
        // 0-100 maps to 0.5-12 Hz
        const speed = 0.5 + (value / 100) * 11.5;
        this.vibratoLFO.frequency.setTargetAtTime(speed, now, 0.05);
        break;
      
      case 'vibrato_intensity':
        // 0-100 maps to 0-0.5 depth
        const intensity = (value / 100) * 0.5;
        this.vibratoDepth.gain.setTargetAtTime(intensity, now, 0.05);
        break;
      
      case 'reverb':
        this.reverbSend.gain.setTargetAtTime(value / 200, now, 0.02);
        this.reverbReturn.gain.setTargetAtTime(value / 100, now, 0.02);
        break;
      
      case 'reverb_dwell':
        // Dwell controls feedback (spring decay time)
        this.reverbFeedback.gain.setTargetAtTime(0.2 + (value / 100) * 0.3, now, 0.05);
        break;
      
      case 'bright':
        this.inputBright.gain.setTargetAtTime(value ? 3 : 0, now, 0.01);
        this.params.input_type = value ? 'bright' : 'normal'; // mantém coerência
        break;
      
      case 'master':
        this.master.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
      
      // Cabinet controls
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
  
  disconnect() {
    super.disconnect();
    try {
      this.disconnectAll();
      this.vibratoLFO.stop();
    } catch (e) {
      // Ignora erros
    }
  }
}

export default FenderTwinReverbAmp;
