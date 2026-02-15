import AudioRecorder from './AudioRecorder';
import AudioConfig from './AudioConfig';

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.inputNode = null;
    this.outputNode = null;
    this.effectsChain = [];
    this.isRunning = false;
    this.recorder = null;
    
    // Audio file playback
    this.audioFileBuffer = null;
    this.audioFileSource = null;
    this.audioFileGain = null;
    this.audioFilePaused = false;
    this.audioFileStartTime = 0;
    this.audioFilePauseTime = 0;
    this.audioFileLoop = true;
    this.usingAudioFile = false;
    this.microphoneStream = null;
    
    // Worklet readiness flags
    this.workletsLoaded = {
      gate: false,
      sag: false,
      pitchShifter: false,
      bitcrusher: false,
      ringMod: false,
      envelopeFollower: false,
    };
  }

  async initialize(deviceId = null) {
    try {
      // Create AudioContext with centralized config
      const contextOptions = {
        latencyHint: AudioConfig.latencyHint,
        sampleRate: AudioConfig.sampleRate,
      };
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)(contextOptions);
      
      console.log(`AudioContext initialized at ${this.audioContext.sampleRate}Hz`);
      
      // Load ALL AudioWorklet processors
      const worklets = [
        { file: 'gate-processor.js', key: 'gate' },
        { file: 'sag-processor.js', key: 'sag' },
        { file: 'pitch-shifter-processor.js', key: 'pitchShifter' },
        { file: 'bitcrusher-processor.js', key: 'bitcrusher' },
        { file: 'ring-mod-processor.js', key: 'ringMod' },
        { file: 'envelope-follower-processor.js', key: 'envelopeFollower' },
      ];
      
      await Promise.all(worklets.map(async ({ file, key }) => {
        try {
          await this.audioContext.audioWorklet.addModule(file);
          this.workletsLoaded[key] = true;
        } catch (error) {
          console.warn(`Failed to load ${file}:`, error);
        }
      }));
      
      // Input from microphone/guitar interface with HIGH QUALITY settings
      const constraints = {
        audio: {
          // DISABLE all browser processing for clean signal
          ...AudioConfig.inputConstraints,
          
          // HIGH QUALITY AUDIO
          sampleRate: { ideal: AudioConfig.sampleRate },
          sampleSize: { ideal: AudioConfig.inputBitDepth },
          channelCount: { ideal: 2 },
          
          // Advanced constraints (if supported)
          echoCancellationType: 'none',
          noiseSuppressType: 'none',
          autoGainControlType: 'none'
        }
      };

      // Add deviceId if specified
      if (deviceId) {
        constraints.audio.deviceId = { exact: deviceId };
        console.log(`🎤 Using device: ${deviceId}`);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log actual stream settings
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      console.log('🎤 Input Settings:', {
        deviceId: settings.deviceId,
        label: audioTrack.label,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        latency: settings.latency,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl
      });
      
      this.microphoneStream = stream;
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
      alert(`Failed to initialize audio: ${error.message}\n\nPlease check your audio device permissions and connections.`);
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
    if (!this.outputNode) return;

    console.log(`🔗 reconnectChain: usingAudioFile=${this.usingAudioFile}, hasAudioFileGain=${!!this.audioFileGain}, effectsCount=${this.effectsChain.length}`);

    // Disconnect ONLY external connections (not internal effect routing)
    try {
      if (this.inputNode) this.inputNode.disconnect();
    } catch (e) {}
    
    try {
      if (this.audioFileGain) this.audioFileGain.disconnect();
    } catch (e) {}
    
    this.effectsChain.forEach(effect => {
      try {
        // Only disconnect the OUTPUT node (external connection)
        // Do NOT call effect.disconnect() as it breaks internal routing
        effect.output.disconnect();
      } catch (e) {}
    });

    // Determine the source (microphone or audio file)
    const sourceNode = this.usingAudioFile && this.audioFileGain ? this.audioFileGain : this.inputNode;
    
    console.log(`   Source: ${this.usingAudioFile && this.audioFileGain ? 'AUDIO FILE' : 'MICROPHONE'}`);
    
    if (!sourceNode) {
      console.warn('   ⚠️ No source node available!');
      return;
    }

    // Reconnect in order
    if (this.effectsChain.length === 0) {
      sourceNode.connect(this.outputNode);
      console.log(`   ✅ Direct: source → output`);
    } else {
      sourceNode.connect(this.effectsChain[0].input);
      console.log(`   ✅ Connected: source → ${this.effectsChain[0].name}`);
      
      for (let i = 0; i < this.effectsChain.length - 1; i++) {
        this.effectsChain[i].output.connect(this.effectsChain[i + 1].input);
        console.log(`   ✅ Connected: ${this.effectsChain[i].name} → ${this.effectsChain[i + 1].name}`);
      }
      
      this.effectsChain[this.effectsChain.length - 1].output.connect(this.outputNode);
      console.log(`   ✅ Connected: ${this.effectsChain[this.effectsChain.length - 1].name} → output`);
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

  // ============================================
  // AUDIO FILE INPUT METHODS
  // ============================================

  async loadAudioFile(arrayBuffer, fileName) {
    try {
      if (!this.audioContext) {
        console.error('AudioContext not initialized');
        return false;
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioFileBuffer = audioBuffer;
      
      console.log(`✅ Audio file loaded: ${fileName}`);
      console.log(`   Duration: ${audioBuffer.duration.toFixed(2)}s`);
      console.log(`   Channels: ${audioBuffer.numberOfChannels}`);
      console.log(`   Sample Rate: ${audioBuffer.sampleRate}Hz`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load audio file:', error);
      return false;
    }
  }

  playAudioFile(loop = true) {
    if (!this.audioFileBuffer || !this.audioContext) {
      console.error('No audio file loaded');
      return false;
    }

    try {
      // Stop any existing playback
      this.stopAudioFile();

      // Create gain if doesn't exist
      if (!this.audioFileGain) {
        this.audioFileGain = this.audioContext.createGain();
        this.audioFileGain.gain.value = 0.8; // Default volume
      }

      // Switch from microphone to file input
      if (!this.usingAudioFile) {
        this._switchToFileInput();
      }

      // Create source
      this.audioFileSource = this.audioContext.createBufferSource();
      this.audioFileSource.buffer = this.audioFileBuffer;
      this.audioFileSource.loop = loop;
      this.audioFileLoop = loop;

      // Connect source to gain
      this.audioFileSource.connect(this.audioFileGain);
      
      // reconnectChain will handle connecting audioFileGain to effects/output
      this.reconnectChain();

      // Start playback
      const offset = this.audioFilePaused ? this.audioFilePauseTime : 0;
      this.audioFileSource.start(0, offset);
      this.audioFileStartTime = this.audioContext.currentTime - offset;
      this.audioFilePaused = false;

      console.log('▶️ Playing audio file through effects chain');
      return true;
    } catch (error) {
      console.error('❌ Failed to play audio file:', error);
      return false;
    }
  }

  pauseAudioFile() {
    if (!this.audioFileSource) return false;

    try {
      // Calculate pause position
      this.audioFilePauseTime = this.audioContext.currentTime - this.audioFileStartTime;
      
      // Stop current source
      this.audioFileSource.stop();
      this.audioFileSource.disconnect();
      this.audioFileSource = null;
      this.audioFilePaused = true;

      console.log('⏸️ Paused audio file');
      return true;
    } catch (error) {
      console.error('Failed to pause audio file:', error);
      return false;
    }
  }

  stopAudioFile() {
    if (this.audioFileSource) {
      try {
        this.audioFileSource.stop();
        this.audioFileSource.disconnect();
      } catch (e) {}
      this.audioFileSource = null;
    }

    this.audioFilePaused = false;
    this.audioFileStartTime = 0;
    this.audioFilePauseTime = 0;
  }

  setAudioFileLoop(loop) {
    this.audioFileLoop = loop;
    if (this.audioFileSource) {
      this.audioFileSource.loop = loop;
    }
  }

  setAudioFileVolume(volume) {
    if (this.audioFileGain) {
      this.audioFileGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.01);
    }
  }

  getAudioFileDuration() {
    return this.audioFileBuffer ? this.audioFileBuffer.duration : 0;
  }

  getAudioFileCurrentTime() {
    if (!this.audioFileSource || !this.audioContext) return null;
    
    if (this.audioFilePaused) {
      return this.audioFilePauseTime;
    }

    const currentTime = this.audioContext.currentTime - this.audioFileStartTime;
    const duration = this.audioFileBuffer.duration;

    if (this.audioFileLoop) {
      return currentTime % duration;
    }

    return Math.min(currentTime, duration);
  }

  unloadAudioFile() {
    this.stopAudioFile();
    this.audioFileBuffer = null;
    
    if (this.audioFileGain) {
      this.audioFileGain.disconnect();
      this.audioFileGain = null;
    }

    // Switch back to microphone
    if (this.usingAudioFile) {
      this._switchToMicrophoneInput();
    }

    console.log('🗑️ Audio file unloaded');
  }

  _switchToFileInput() {
    if (this.usingAudioFile) return;

    // Disconnect microphone
    try {
      this.inputNode.disconnect();
    } catch (e) {}

    this.usingAudioFile = true;
    console.log('🎵 Switched to audio file input');
  }

  _switchToMicrophoneInput() {
    if (!this.usingAudioFile) return;

    // Reconnect microphone
    if (this.inputNode) {
      this.reconnectChain();
    }

    this.usingAudioFile = false;
    console.log('🎤 Switched back to microphone input');
  }

  isUsingAudioFile() {
    return this.usingAudioFile;
  }

  stop() {
    // Stop audio file playback
    this.unloadAudioFile();
    
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

