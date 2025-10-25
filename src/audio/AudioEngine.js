import AudioRecorder from './AudioRecorder';

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.inputNode = null;
    this.outputNode = null;
    this.effectsChain = [];
    this.isRunning = false;
    this.recorder = null;
  }

  async initialize() {
    try {
      // Create AudioContext with optimal settings for guitar processing
      const contextOptions = {
        latencyHint: 'interactive', // Low latency for live playing
        sampleRate: 48000 // Professional sample rate (48kHz)
      };
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)(contextOptions);
      
      console.log(`🎸 AudioContext initialized at ${this.audioContext.sampleRate}Hz`);
      
      // Input from microphone/guitar interface with HIGH QUALITY settings
      const constraints = {
        audio: {
          // DISABLE all browser processing for clean signal
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          
          // LOW LATENCY
          latency: 0,
          
          // HIGH QUALITY AUDIO
          sampleRate: { ideal: 48000 }, // Pro audio standard
          sampleSize: { ideal: 24 },    // 24-bit depth
          channelCount: { ideal: 2 },   // Stereo
          
          // Advanced constraints (if supported)
          echoCancellationType: 'none',
          noiseSuppressType: 'none',
          autoGainControlType: 'none'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log actual stream settings
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      console.log('🎤 Input Settings:', {
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        latency: settings.latency,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl
      });
      
      this.inputNode = this.audioContext.createMediaStreamSource(stream);
      this.outputNode = this.audioContext.destination;
      
      // Initialize recorder
      this.recorder = new AudioRecorder(this.audioContext);
      this.recorder.connect(this.outputNode);
      
      this.isRunning = true;
      this.reconnectChain();
      
      console.log('✅ Audio engine initialized with HIGH QUALITY settings');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      return false;
    }
  }

  addEffect(effect) {
    this.effectsChain.push(effect);
    this.reconnectChain();
  }

  removeEffect(effectId) {
    const index = this.effectsChain.findIndex(e => e.id === effectId);
    if (index !== -1) {
      this.effectsChain[index].disconnect();
      this.effectsChain.splice(index, 1);
      this.reconnectChain();
    }
  }

  moveEffect(fromIndex, toIndex) {
    const [effect] = this.effectsChain.splice(fromIndex, 1);
    this.effectsChain.splice(toIndex, 0, effect);
    this.reconnectChain();
  }

  reconnectChain() {
    if (!this.inputNode || !this.outputNode) return;

    // Disconnect ONLY external connections (not internal effect routing)
    try {
      this.inputNode.disconnect();
    } catch (e) {}
    
    this.effectsChain.forEach(effect => {
      try {
        // Only disconnect the OUTPUT node (external connection)
        // Do NOT call effect.disconnect() as it breaks internal routing
        effect.output.disconnect();
      } catch (e) {}
    });

    // Reconnect in order
    if (this.effectsChain.length === 0) {
      this.inputNode.connect(this.outputNode);
    } else {
      this.inputNode.connect(this.effectsChain[0].input);
      
      for (let i = 0; i < this.effectsChain.length - 1; i++) {
        this.effectsChain[i].output.connect(this.effectsChain[i + 1].input);
      }
      
      this.effectsChain[this.effectsChain.length - 1].output.connect(this.outputNode);
    }
  }

  updateEffect(effectId, parameter, value) {
    const effect = this.effectsChain.find(e => e.id === effectId);
    if (effect && effect.updateParameter) {
      effect.updateParameter(parameter, value);
    }
  }

  toggleBypass(effectId) {
    const effect = this.effectsChain.find(e => e.id === effectId);
    if (effect && effect.toggleBypass) {
      effect.toggleBypass();
    }
  }

  // ============================================
  // RECORDING METHODS
  // ============================================

  startRecording() {
    if (!this.recorder || !this.isRunning) return false;
    
    // Record from the last effect (or input if no effects)
    const sourceNode = this.effectsChain.length > 0 
      ? this.effectsChain[this.effectsChain.length - 1].output 
      : this.inputNode;
    
    this.recorder.startRecording(sourceNode);
    return true;
  }

  stopRecording() {
    if (!this.recorder) return false;
    this.recorder.stopRecording();
    return true;
  }

  playRecording() {
    if (!this.recorder) return false;
    this.recorder.playRecording();
    return true;
  }

  stopPlayback() {
    if (!this.recorder) return false;
    this.recorder.stopPlayback();
    return true;
  }

  clearRecording() {
    if (!this.recorder) return false;
    this.recorder.clearRecording();
    return true;
  }

  exportRecording() {
    if (!this.recorder) return null;
    return this.recorder.exportToWAV();
  }

  getRecordingInfo() {
    if (!this.recorder) return null;
    return this.recorder.getInfo();
  }

  setRecordingVolume(value) {
    if (!this.recorder) return;
    this.recorder.setVolume(value);
  }

  stop() {
    if (this.recorder) {
      this.recorder.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.isRunning = false;
    }
  }
}

export default AudioEngine;

