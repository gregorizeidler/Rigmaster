import BaseAmp from './BaseAmp.js';

class VictoryDuchessAmp extends BaseAmp {
  constructor(audioContext, id) {
    super(audioContext, id, 'Victory Duchess', 'victory_duchess');
    
    // VICTORY DUCHESS (Handwired British boutique)
    // Made in UK by Martin Kidd
    // Used by Rabea Massaad, Martin Miller
    // Known for: Vintage British warmth + modern clarity
    
    // ============================================
    // 2 CHANNELS WITH CROSSFADE
    // ============================================
    this.channel1 = audioContext.createGain(); // Low Gain
    this.channel2 = audioContext.createGain(); // High Gain
    
    // Crossfade gains (evita pops na troca de canal)
    this.ch1Xfade = audioContext.createGain();
    this.ch2Xfade = audioContext.createGain();
    this.ch1Xfade.gain.value = 0; // Canal 1 começa mutado
    this.ch2Xfade.gain.value = 1; // Canal 2 começa ativo
    
    // Active channel
    this.activeChannel = 2; // 1 or 2
    
    // ============================================
    // PREAMP CHANNEL 1 (Low Gain - 2 stages)
    // ============================================
    this.ch1_preamp1 = audioContext.createGain();
    this.ch1_preamp2 = audioContext.createGain();
    this.ch1_saturation1 = audioContext.createWaveShaper();
    this.ch1_saturation2 = audioContext.createWaveShaper();
    
    this.ch1_saturation1.curve = this.makeVictoryPreampCurve({drive: 4.6, asym: 1.03});
    this.ch1_saturation2.curve = this.makeVictoryPreampCurve({drive: 5.2, asym: 1.06});
    this.ch1_saturation1.oversample = '4x';
    this.ch1_saturation2.oversample = '4x';
    
    // ============================================
    // PREAMP CHANNEL 2 (High Gain - 3 stages)
    // ============================================
    this.ch2_preamp1 = audioContext.createGain();
    this.ch2_preamp2 = audioContext.createGain();
    this.ch2_preamp3 = audioContext.createGain();
    this.ch2_saturation1 = audioContext.createWaveShaper();
    this.ch2_saturation2 = audioContext.createWaveShaper();
    this.ch2_saturation3 = audioContext.createWaveShaper();
    
    this.ch2_saturation1.curve = this.makeVictoryPreampCurve({drive: 4.6, asym: 1.03});
    this.ch2_saturation2.curve = this.makeVictoryPreampCurve({drive: 5.2, asym: 1.06});
    this.ch2_saturation3.curve = this.makeVictoryPreampCurve({drive: 5.8, asym: 1.09});
    this.ch2_saturation1.oversample = '4x';
    this.ch2_saturation2.oversample = '4x';
    this.ch2_saturation3.oversample = '4x';
    
    // Noise gate para canal 2 (hi-gain tight)
    this.noiseGate = audioContext.createDynamicsCompressor();
    this.noiseGate.threshold.value = -50;
    this.noiseGate.knee.value = 0;
    this.noiseGate.ratio.value = 20;
    this.noiseGate.attack.value = 0.001;
    this.noiseGate.release.value = 0.08;
    
    // ============================================
    // TONE STACK (British-style)
    // ============================================
    this.bass = audioContext.createBiquadFilter();
    this.middle = audioContext.createBiquadFilter();
    this.treble = audioContext.createBiquadFilter();
    
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 110;
    this.bass.gain.value = 0;
    
    this.middle.type = 'peaking';
    this.middle.frequency.value = 750;
    this.middle.Q.value = 1.4;
    this.middle.gain.value = 0;
    
    this.treble.type = 'highshelf';
    this.treble.frequency.value = 2700;
    this.treble.gain.value = 0;
    
    // ============================================
    // VICTORY "VINTAGE/MODERN" VOICING SWITCH
    // ============================================
    this.voicingFilter = audioContext.createBiquadFilter();
    this.voicingFilter.type = 'peaking';
    this.voicingFilter.frequency.value = 650;
    this.voicingFilter.Q.value = 1.8;
    this.voicingFilter.gain.value = -3; // Modern (scooped)
    this.voicing = 'modern'; // 'vintage' or 'modern'
    
    // ============================================
    // POWER AMP (2x KT77 tubes - Class A/B)
    // ============================================
    this.powerAmp = audioContext.createGain();
    this.powerSaturation = audioContext.createWaveShaper();
    this.powerSaturation.curve = this.makePowerAmpCurve();
    this.powerSaturation.oversample = '4x';
    
    // British compression
    this.powerComp = audioContext.createDynamicsCompressor();
    this.powerComp.threshold.value = -18;
    this.powerComp.knee.value = 14;
    this.powerComp.ratio.value = 3;
    this.powerComp.attack.value = 0.007;
    this.powerComp.release.value = 0.11;
    
    // ============================================
    // DC BLOCK + CABINET IR
    // ============================================
    this.dcBlock = audioContext.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 20;
    
    this.cabIR = audioContext.createConvolver();
    this.cabBypass = audioContext.createGain(); // Para bypass do cabinet
    this.cabEnabled = true; // Cabinet ligado por padrão
    // IR será carregado externamente ou pode usar um buffer básico
    
    // ============================================
    // VICTORY "PRESENCE" & "RESONANCE" (pós-power/IR)
    // ============================================
    this.presence = audioContext.createBiquadFilter();
    this.resonance = audioContext.createBiquadFilter();
    
    this.presence.type = 'highshelf';
    this.presence.frequency.value = 4800;
    this.presence.gain.value = 0;
    
    this.resonance.type = 'lowshelf';
    this.resonance.frequency.value = 85;
    this.resonance.gain.value = 0;
    
    // ============================================
    // MASTER SECTION
    // ============================================
    this.channelVolume = audioContext.createGain();
    this.master = audioContext.createGain();
    
    // ============================================
    // PARAMS - DEFINIR ANTES DE SETUP
    // ============================================
    this.params = {
      channel: 2, // 1=low gain, 2=high gain
      
      // Gain/Volume
      gain: 65,
      channel_volume: 70,
      
      // Tone stack
      bass: 55,
      middle: 60,
      treble: 65,
      presence: 60,
      resonance: 50,
      
      // Voicing
      voicing: 'modern', // 'vintage' or 'modern'
      
      // Master
      master: 70,
      
      // Cabinet
      cabinet_enabled: true
    };
    
    // ============================================
    // ROUTING - AMBOS CANAIS (CROSSFADE)
    // ============================================
    this.setupBothChannels();
    
    this.applyInitialSettings();
  }
  
  setupBothChannels() {
    // MONTA AMBOS CANAIS SIMULTANEAMENTE PARA CROSSFADE SEM POPS
    
    // ============================================
    // CHANNEL 1 - LOW GAIN (2 gain stages)
    // ============================================
    this.input.connect(this.channel1);
    this.channel1.connect(this.ch1_preamp1);
    this.ch1_preamp1.connect(this.ch1_saturation1);
    this.ch1_saturation1.connect(this.ch1_preamp2);
    this.ch1_preamp2.connect(this.ch1_saturation2);
    this.ch1_saturation2.connect(this.ch1Xfade);
    
    // ============================================
    // CHANNEL 2 - HIGH GAIN (3 cascading stages + noise gate)
    // ============================================
    this.input.connect(this.channel2);
    this.channel2.connect(this.noiseGate);
    this.noiseGate.connect(this.ch2_preamp1);
    this.ch2_preamp1.connect(this.ch2_saturation1);
    this.ch2_saturation1.connect(this.ch2_preamp2);
    this.ch2_preamp2.connect(this.ch2_saturation2);
    this.ch2_saturation2.connect(this.ch2_preamp3);
    this.ch2_preamp3.connect(this.ch2_saturation3);
    this.ch2_saturation3.connect(this.ch2Xfade);
    
    // ============================================
    // SHARED SIGNAL PATH (pós-canais)
    // ============================================
    // Mixer dos crossfades
    const mixer = this.audioContext.createGain();
    this.ch1Xfade.connect(mixer);
    this.ch2Xfade.connect(mixer);
    
    // Tone stack
    mixer.connect(this.voicingFilter);
    this.voicingFilter.connect(this.bass);
    this.bass.connect(this.middle);
    this.middle.connect(this.treble);
    this.treble.connect(this.channelVolume);
    
    // Power amp
    this.channelVolume.connect(this.powerComp);
    this.powerComp.connect(this.powerAmp);
    this.powerAmp.connect(this.powerSaturation);
    
    // DC block + Cabinet IR (com bypass opcional)
    this.powerSaturation.connect(this.dcBlock);
    
    // Cabinet routing (pode ser bypassed)
    if (this.cabEnabled) {
      this.dcBlock.connect(this.cabIR);
      this.cabIR.connect(this.presence);
    } else {
      this.dcBlock.connect(this.cabBypass);
      this.cabBypass.connect(this.presence);
    }
    
    // Presence/Resonance (pós-IR, mais realista)
    this.presence.connect(this.resonance);
    
    // Master out
    this.resonance.connect(this.master);
    this.master.connect(this.output);
    
    // Guardar referência ao mixer
    this.channelMixer = mixer;
  }
  
  switchToChannel(channelNum) {
    // CROSSFADE SUAVE ENTRE CANAIS (10-30ms)
    const now = this.audioContext.currentTime;
    const fadeTime = 0.02; // 20ms
    
    if (channelNum === 1) {
      this.ch1Xfade.gain.setTargetAtTime(1, now, fadeTime);
      this.ch2Xfade.gain.setTargetAtTime(0, now, fadeTime);
      this.activeChannel = 1;
    } else {
      this.ch1Xfade.gain.setTargetAtTime(0, now, fadeTime);
      this.ch2Xfade.gain.setTargetAtTime(1, now, fadeTime);
      this.activeChannel = 2;
    }
  }
  
  disconnectAll() {
    // Agora só é usado na destruição final (não mais nas trocas de canal)
    try {
      this.input.disconnect();
      this.channel1.disconnect();
      this.channel2.disconnect();
      this.ch1Xfade.disconnect();
      this.ch2Xfade.disconnect();
      
      // Channel 1 nodes
      this.ch1_preamp1.disconnect();
      this.ch1_saturation1.disconnect();
      this.ch1_preamp2.disconnect();
      this.ch1_saturation2.disconnect();
      
      // Channel 2 nodes
      this.noiseGate.disconnect();
      this.ch2_preamp1.disconnect();
      this.ch2_saturation1.disconnect();
      this.ch2_preamp2.disconnect();
      this.ch2_saturation2.disconnect();
      this.ch2_preamp3.disconnect();
      this.ch2_saturation3.disconnect();
      
      // Shared path
      this.voicingFilter.disconnect();
      this.bass.disconnect();
      this.middle.disconnect();
      this.treble.disconnect();
      this.channelVolume.disconnect();
      this.powerComp.disconnect();
      this.powerAmp.disconnect();
      this.powerSaturation.disconnect();
      this.dcBlock.disconnect();
      this.cabIR.disconnect();
      this.cabBypass.disconnect();
      this.presence.disconnect();
      this.resonance.disconnect();
      this.master.disconnect();
      
      if (this.channelMixer) {
        this.channelMixer.disconnect();
      }
    } catch (e) {}
  }
  
  applyInitialSettings() {
    // Helper: conversão logarítmica (0..1 -> ~-60..0 dB)
    const lin2log = v01 => 0.001 * Math.pow(1000, v01);
    
    // Channel 1 (Low Gain)
    this.ch1_preamp1.gain.value = 4.5;
    this.ch1_preamp2.gain.value = 1.8;
    
    // Channel 2 (High Gain)
    this.ch2_preamp1.gain.value = 7;
    this.ch2_preamp2.gain.value = 2.1;
    this.ch2_preamp3.gain.value = 1.6;
    
    // Channel levels
    this.channel1.gain.value = 0.7;
    this.channel2.gain.value = 1.0;
    
    // Volumes (logarítmicos)
    this.channelVolume.gain.value = lin2log(this.params.channel_volume / 100);
    this.powerAmp.gain.value = 1.08;
    this.master.gain.value = lin2log(this.params.master / 100);
  }
  
  makeVictoryPreampCurve({drive = 5.2, asym = 1.06} = {}) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // VICTORY "VINTAGE BRITISH + MODERN CLARITY"
      let y = Math.tanh(x * drive);
      
      // SMOOTH COMPRESSION (headroom variável)
      if (Math.abs(y) > 0.55) {
        const compression = 1 - (Math.abs(y) - 0.55) * 0.28;
        y *= compression;
      }
      
      // WARMTH (vintage)
      y += 0.09 * Math.sin(x * Math.PI * 3);
      
      // CLARITY (modern)
      y += 0.1 * Math.tanh(x * 9);
      
      // BRITISH CRUNCH
      y += 0.08 * Math.tanh(x * 6);
      
      // Asymmetry variável para melhor articulação
      y *= x > 0 ? asym : 1 / asym;
      
      curve[i] = y * 0.88;
    }
    return curve;
  }
  
  makePowerAmpCurve() {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      
      // KT77 POWER TUBES (EL34 family)
      let y = Math.tanh(x * 1.58);
      
      // KT77 COMPRESSION
      if (Math.abs(y) > 0.62) {
        const excess = Math.abs(y) - 0.62;
        y = Math.sign(y) * (0.62 + excess * 0.53);
      }
      
      // BRITISH WARMTH
      y += 0.07 * Math.sin(x * Math.PI * 3);
      y += 0.05 * Math.sin(x * Math.PI * 5);
      
      // KT77 PUNCH
      y += 0.09 * Math.tanh(x * 3.5);
      
      // KT77 AGGRESSION
      y += 0.08 * Math.tanh(x * 7);
      
      // Asymmetry
      if (x > 0) y *= 1.11;
      
      curve[i] = y * 0.89;
    }
    return curve;
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    // Helper: conversão logarítmica (0..1 -> ~-60..0 dB)
    const lin2log = v01 => 0.001 * Math.pow(1000, v01);
    
    switch (parameter) {
      case 'channel':
        // Usa crossfade suave em vez de reconexão
        this.switchToChannel(value);
        break;
      
      case 'gain': {
        // Mapeamento logarítmico para resposta mais natural
        const g = lin2log(value / 100) * 20; // fator total desejado
        
        // Channel 1 (Low Gain - 2 stages)
        this.ch1_preamp1.gain.setTargetAtTime(g * 0.6, now, 0.01);
        this.ch1_preamp2.gain.setTargetAtTime(Math.max(1, g * 0.3), now, 0.01);
        
        // Channel 2 (High Gain - 3 stages)
        this.ch2_preamp1.gain.setTargetAtTime(g, now, 0.01);
        this.ch2_preamp2.gain.setTargetAtTime(Math.max(1, g * 0.35), now, 0.01);
        this.ch2_preamp3.gain.setTargetAtTime(Math.max(1, g * 0.25), now, 0.01);
        break;
      }
      
      case 'channel_volume':
        // Logarítmico
        this.channelVolume.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        break;
      
      case 'bass':
        this.bass.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'middle':
      case 'mid':
        this.middle.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'treble':
        this.treble.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'presence':
        this.presence.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'resonance':
        this.resonance.gain.setTargetAtTime((value - 50) / 10, now, 0.01);
        break;
      
      case 'voicing':
        // Voicing mais audível: vintage = mids realçados + treble suave
        // modern = scoop + aire
        this.voicing = value;
        if (value === 'vintage') {
          this.voicingFilter.frequency.setTargetAtTime(850, now, 0.01);
          this.voicingFilter.Q.setTargetAtTime(1.2, now, 0.01);
          this.voicingFilter.gain.setTargetAtTime(+2.0, now, 0.01);
          this.presence.gain.setTargetAtTime(-1.0, now, 0.01);
        } else { // modern
          this.voicingFilter.frequency.setTargetAtTime(650, now, 0.01);
          this.voicingFilter.Q.setTargetAtTime(1.8, now, 0.01);
          this.voicingFilter.gain.setTargetAtTime(-3.0, now, 0.01);
          this.presence.gain.setTargetAtTime(+1.0, now, 0.01);
        }
        break;
      
      case 'master': {
        // Logarítmico
        this.master.gain.setTargetAtTime(lin2log(value / 100), now, 0.01);
        
        // Power comp "british" dependente do master
        // Threshold ajusta conforme volume: dá sensação de "abrir" quando alto
        const thr = -20 + (value / 100) * 4; // -20 .. -16 dB
        this.powerComp.threshold.setTargetAtTime(thr, now, 0.05);
        break;
      }
      
      // ============================================
      // CABINET CONTROL
      // ============================================
      case 'cabinet_enabled':
        this.cabEnabled = value;
        // Re-rota para habilitar/desabilitar cabinet
        this.setupBothChannels();
        break;
    }
    
    this.params[parameter] = value;
  }
  
  disconnect() {
    super.disconnect();
    this.channel1.disconnect();
    this.channel2.disconnect();
    this.ch1Xfade.disconnect();
    this.ch2Xfade.disconnect();
    
    // Channel 1 nodes
    this.ch1_preamp1.disconnect();
    this.ch1_saturation1.disconnect();
    this.ch1_preamp2.disconnect();
    this.ch1_saturation2.disconnect();
    
    // Channel 2 nodes
    this.noiseGate.disconnect();
    this.ch2_preamp1.disconnect();
    this.ch2_saturation1.disconnect();
    this.ch2_preamp2.disconnect();
    this.ch2_saturation2.disconnect();
    this.ch2_preamp3.disconnect();
    this.ch2_saturation3.disconnect();
    
    // Shared path
    this.voicingFilter.disconnect();
    this.bass.disconnect();
    this.middle.disconnect();
    this.treble.disconnect();
    this.channelVolume.disconnect();
    this.powerComp.disconnect();
    this.powerAmp.disconnect();
    this.powerSaturation.disconnect();
    this.dcBlock.disconnect();
    this.cabIR.disconnect();
    this.cabBypass.disconnect();
    this.presence.disconnect();
    this.resonance.disconnect();
    this.master.disconnect();
    
    if (this.channelMixer) {
      this.channelMixer.disconnect();
    }
  }
}

export default VictoryDuchessAmp;

