/**
 * IRLoader - Impulse Response Loader & Convolver
 * 
 * Features:
 * - Load .wav IR files (mono/stereo)
 * - Dual IR blending
 * - Phase inversion
 * - EQ (HPF/LPF)
 * - Real convolution reverb
 */

class IRLoader {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Main convolver
    this.convolver = audioContext.createConvolver();
    
    // Dual IR system
    this.convolverA = audioContext.createConvolver();
    this.convolverB = audioContext.createConvolver();
    
    // Mix gains for dual IR
    this.mixA = audioContext.createGain();
    this.mixB = audioContext.createGain();
    this.mixA.gain.value = 1.0;
    this.mixB.gain.value = 0.0;
    
    // Phase inverter
    this.phaseInverter = audioContext.createGain();
    this.phaseInverter.gain.value = 1; // 1 = normal, -1 = inverted
    
    // Post-EQ
    this.hpf = audioContext.createBiquadFilter();
    this.hpf.type = 'highpass';
    this.hpf.frequency.value = 80;
    this.hpf.Q.value = 0.707;
    
    this.lpf = audioContext.createBiquadFilter();
    this.lpf.type = 'lowpass';
    this.lpf.frequency.value = 8000;
    this.lpf.Q.value = 0.707;
    
    // Input/Output
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    
    // Loaded IRs
    this.irBufferA = null;
    this.irBufferB = null;
    this.currentIR = null;
    
    // Latency compensation (in seconds)
    this.latencySec = 0;
    
    // Routing mode: 'single', 'dual'
    this.mode = 'single';
    
    // Initialize routing
    this.initializeSingleMode();
  }
  
  /**
   * Initialize single IR mode
   */
  initializeSingleMode() {
    this.mode = 'single';
    this.disconnectAll();
    
    // Input → Convolver → Phase → EQ → Output
    this.input.connect(this.convolver);
    this.convolver.connect(this.phaseInverter);
    this.phaseInverter.connect(this.hpf);
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.output);
  }
  
  /**
   * Initialize dual IR mode (blend 2 IRs)
   */
  initializeDualMode() {
    this.mode = 'dual';
    this.disconnectAll();
    
    // Split to both convolvers
    this.input.connect(this.convolverA);
    this.input.connect(this.convolverB);
    
    // Mix with gains
    this.convolverA.connect(this.mixA);
    this.convolverB.connect(this.mixB);
    
    // Merge → Phase → EQ → Output
    this.mixA.connect(this.phaseInverter);
    this.mixB.connect(this.phaseInverter);
    this.phaseInverter.connect(this.hpf);
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.output);
  }
  
  /**
   * Calculate IR latency (finds peak position for phase alignment)
   */
  calculateIRLatency(audioBuffer) {
    if (!audioBuffer) return 0;
    
    const channelData = audioBuffer.getChannelData(0);
    let peakIndex = 0;
    let peakValue = 0;
    
    // Find the main peak (first 20ms is typically where the direct sound is)
    const searchLength = Math.min(channelData.length, Math.floor(audioBuffer.sampleRate * 0.02));
    
    for (let i = 0; i < searchLength; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > peakValue) {
        peakValue = absValue;
        peakIndex = i;
      }
    }
    
    // Convert to seconds
    return peakIndex / audioBuffer.sampleRate;
  }
  
  /**
   * Load IR from URL
   */
  async loadIR(url, channel = 'A') {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      if (channel === 'A' || this.mode === 'single') {
        this.irBufferA = audioBuffer;
        this.convolver.buffer = audioBuffer;
        this.convolverA.buffer = audioBuffer;
        this.currentIR = audioBuffer;
        this.latencySec = this.calculateIRLatency(audioBuffer);
      } else {
        this.irBufferB = audioBuffer;
        this.convolverB.buffer = audioBuffer;
      }
      
      console.log(`✅ IR loaded (${channel}): ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channel(s), latency: ${(this.latencySec * 1000).toFixed(2)}ms`);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load IR:', error);
      return null;
    }
  }
  
  /**
   * Load IR from File object (user upload)
   */
  async loadIRFromFile(file, channel = 'A') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      if (channel === 'A' || this.mode === 'single') {
        this.irBufferA = audioBuffer;
        this.convolver.buffer = audioBuffer;
        this.convolverA.buffer = audioBuffer;
        this.currentIR = audioBuffer;
        this.latencySec = this.calculateIRLatency(audioBuffer);
      } else {
        this.irBufferB = audioBuffer;
        this.convolverB.buffer = audioBuffer;
      }
      
      console.log(`✅ IR loaded from file (${channel}): ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channel(s), latency: ${(this.latencySec * 1000).toFixed(2)}ms`);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load IR from file:', error);
      return null;
    }
  }
  
  /**
   * Set dual IR mix (0 = A only, 100 = B only, 50 = 50/50)
   */
  setDualMix(percentage) {
    if (this.mode !== 'dual') {
      console.warn('Not in dual mode');
      return;
    }
    
    const mix = percentage / 100;
    const now = this.audioContext.currentTime;
    
    // Equal-power crossfade
    this.mixA.gain.setTargetAtTime(Math.cos(mix * Math.PI / 2), now, 0.01);
    this.mixB.gain.setTargetAtTime(Math.sin(mix * Math.PI / 2), now, 0.01);
  }
  
  /**
   * Set phase (normal or inverted)
   */
  setPhase(inverted) {
    const now = this.audioContext.currentTime;
    this.phaseInverter.gain.setTargetAtTime(inverted ? -1 : 1, now, 0.01);
  }
  
  /**
   * Set HPF frequency
   */
  setHPF(frequency) {
    const now = this.audioContext.currentTime;
    this.hpf.frequency.setTargetAtTime(frequency, now, 0.01);
  }
  
  /**
   * Set LPF frequency
   */
  setLPF(frequency) {
    const now = this.audioContext.currentTime;
    this.lpf.frequency.setTargetAtTime(frequency, now, 0.01);
  }
  
  /**
   * Enable/disable dual mode
   */
  setMode(mode) {
    if (mode === 'single') {
      this.initializeSingleMode();
    } else if (mode === 'dual') {
      this.initializeDualMode();
    }
  }
  
  /**
   * Get IR info
   */
  getIRInfo(channel = 'A') {
    const buffer = channel === 'A' ? this.irBufferA : this.irBufferB;
    
    if (!buffer) {
      return null;
    }
    
    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      length: buffer.length
    };
  }
  
  /**
   * Clear IR
   */
  clearIR(channel = 'A') {
    if (channel === 'A' || this.mode === 'single') {
      this.irBufferA = null;
      this.convolver.buffer = null;
      this.convolverA.buffer = null;
      this.currentIR = null;
    } else {
      this.irBufferB = null;
      this.convolverB.buffer = null;
    }
  }
  
  /**
   * Disconnect all connections
   */
  disconnectAll() {
    try { this.input.disconnect(); } catch (e) {}
    try { this.convolver.disconnect(); } catch (e) {}
    try { this.convolverA.disconnect(); } catch (e) {}
    try { this.convolverB.disconnect(); } catch (e) {}
    try { this.mixA.disconnect(); } catch (e) {}
    try { this.mixB.disconnect(); } catch (e) {}
    try { this.phaseInverter.disconnect(); } catch (e) {}
    try { this.hpf.disconnect(); } catch (e) {}
    try { this.lpf.disconnect(); } catch (e) {}
  }
  
  /**
   * Create IR from parameters (for testing/generation)
   */
  createSyntheticIR(type = 'room', duration = 1.0) {
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      switch (type) {
        case 'room':
          this.generateRoomIR(data, length, sampleRate);
          break;
        case 'hall':
          this.generateHallIR(data, length, sampleRate);
          break;
        case 'plate':
          this.generatePlateIR(data, length, sampleRate);
          break;
        case 'spring':
          this.generateSpringIR(data, length, sampleRate);
          break;
        default:
          this.generateRoomIR(data, length, sampleRate);
      }
    }
    
    return buffer;
  }
  
  /**
   * Generate room IR
   */
  generateRoomIR(data, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      // Exponential decay with early reflections
      const decay = Math.exp(-i / (sampleRate * 0.5));
      const early = i < sampleRate * 0.05 ? Math.random() * 0.3 : 0;
      data[i] = (Math.random() * 2 - 1) * decay + early;
    }
  }
  
  /**
   * Generate hall IR
   */
  generateHallIR(data, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      // Longer decay
      const decay = Math.exp(-i / (sampleRate * 2.0));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  
  /**
   * Generate plate IR
   */
  generatePlateIR(data, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      // Dense early reflections
      const decay = Math.exp(-i / (sampleRate * 1.5));
      const density = Math.random() * 0.8;
      data[i] = (Math.random() * 2 - 1) * decay * density;
    }
  }
  
  /**
   * Generate spring IR
   */
  generateSpringIR(data, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      // Metallic resonance
      const decay = Math.exp(-i / (sampleRate * 0.3));
      const spring = Math.sin(i * 0.1) * 0.5;
      data[i] = (Math.random() * 2 - 1) * decay + spring * decay;
    }
  }
}

export default IRLoader;

