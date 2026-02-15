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
    
    // Master volume and input gain nodes
    this.inputGainNode = null;    // Input gain control
    this.masterGainNode = null;   // Master volume control
    
    // BPM / Tempo
    this.bpm = 120;
    this._tapTimes = [];
    
    // CPU monitoring
    this._cpuPercent = 0;
    this._cpuInterval = null;
    
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
      
      // Create Input Gain node (placed right after the source)
      this.inputGainNode = this.audioContext.createGain();
      this.inputGainNode.gain.value = 1.0; // 0-2 range (50% slider = 1.0 unity)
      
      // Create Master Volume node (placed right before destination)
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 0.8; // 80% default
      
      this.outputNode = this.audioContext.destination;
      
      // Master gain -> destination (always)
      this.masterGainNode.connect(this.outputNode);
      
      // Initialize recorder (captures from master gain, before destination)
      this.recorder = new AudioRecorder(this.audioContext);
      this.recorder.connect(this.masterGainNode);
      
      // Start CPU monitoring
      this._startCpuMonitoring();
      
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
      if (this.inputGainNode) this.inputGainNode.disconnect();
    } catch (e) {}
    
    try {
      if (this.audioFileGain) this.audioFileGain.disconnect();
    } catch (e) {}
    
    // Disconnect master gain from destination (we'll reconnect)
    try {
      if (this.masterGainNode) this.masterGainNode.disconnect();
    } catch (e) {}
    
    this.effectsChain.forEach(effect => {
      try {
        effect.output.disconnect();
      } catch (e) {}
    });

    // Re-connect master gain -> destination
    if (this.masterGainNode) {
      this.masterGainNode.connect(this.outputNode);
    }

    // The final destination for the chain is masterGainNode (or outputNode if no master gain)
    const finalDest = this.masterGainNode || this.outputNode;

    // Determine the raw source (microphone or audio file)
    const rawSource = this.usingAudioFile && this.audioFileGain ? this.audioFileGain : this.inputNode;
    
    console.log(`   Source: ${this.usingAudioFile && this.audioFileGain ? 'AUDIO FILE' : 'MICROPHONE'}`);
    
    if (!rawSource) {
      console.warn('   ⚠️ No source node available!');
      return;
    }

    // Route through input gain: rawSource -> inputGainNode
    // Then inputGainNode becomes the effective source for the effect chain
    let sourceNode = rawSource;
    if (this.inputGainNode) {
      rawSource.connect(this.inputGainNode);
      sourceNode = this.inputGainNode;
    }

    // Reconnect in order: sourceNode -> effects -> finalDest (masterGainNode)
    if (this.effectsChain.length === 0) {
      sourceNode.connect(finalDest);
      console.log(`   ✅ Direct: source → master → output`);
    } else {
      sourceNode.connect(this.effectsChain[0].input);
      console.log(`   ✅ Connected: source → ${this.effectsChain[0].name}`);
      
      for (let i = 0; i < this.effectsChain.length - 1; i++) {
        this.effectsChain[i].output.connect(this.effectsChain[i + 1].input);
        console.log(`   ✅ Connected: ${this.effectsChain[i].name} → ${this.effectsChain[i + 1].name}`);
      }
      
      this.effectsChain[this.effectsChain.length - 1].output.connect(finalDest);
      console.log(`   ✅ Connected: ${this.effectsChain[this.effectsChain.length - 1].name} → master → output`);
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

  // ============================================
  // MASTER VOLUME & INPUT GAIN
  // ============================================

  setMasterVolume(value) {
    // value: 0-100 slider → 0.0-1.0 gain
    if (this.masterGainNode && this.audioContext) {
      const gain = Math.max(0, Math.min(1, value / 100));
      this.masterGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.015);
    }
  }

  getMasterVolume() {
    return this.masterGainNode ? Math.round(this.masterGainNode.gain.value * 100) : 80;
  }

  setInputGain(value) {
    // value: 0-100 slider → 0.0-2.0 gain (50 = unity)
    if (this.inputGainNode && this.audioContext) {
      const gain = Math.max(0, Math.min(2, value / 50));
      this.inputGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.015);
    }
  }

  getInputGain() {
    return this.inputGainNode ? Math.round(this.inputGainNode.gain.value * 50) : 50;
  }

  // ============================================
  // BPM / TAP TEMPO
  // ============================================

  setBPM(bpm) {
    this.bpm = Math.max(20, Math.min(300, bpm));
    this._syncBPMToEffects();
  }

  getBPM() {
    return this.bpm;
  }

  tapTempo() {
    const now = performance.now();
    
    // If last tap was more than 2 seconds ago, reset
    if (this._tapTimes.length > 0 && (now - this._tapTimes[this._tapTimes.length - 1]) > 2000) {
      this._tapTimes = [];
    }
    
    this._tapTimes.push(now);
    
    // Keep last 8 taps for better average
    if (this._tapTimes.length > 8) {
      this._tapTimes.shift();
    }
    
    // Need at least 2 taps to calculate BPM
    if (this._tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this._tapTimes.length; i++) {
        intervals.push(this._tapTimes[i] - this._tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      this.bpm = Math.max(20, Math.min(300, bpm));
      this._syncBPMToEffects();
      return this.bpm;
    }
    
    return this.bpm;
  }

  _syncBPMToEffects() {
    const delayTime = 60 / this.bpm; // seconds per beat
    
    this.effectsChain.forEach(effect => {
      if (effect.updateParameter) {
        // Try to sync tempo-aware effects
        const type = effect.constructor?.name || '';
        
        // Delay-based effects: set delay time to beat subdivision
        if (type.includes('Delay') || type.includes('Echo') || type.includes('TimeFactor') ||
            type.includes('DD500') || type.includes('DL4') || type.includes('Timeline') ||
            type.includes('CarbonCopy') || type.includes('MemoryMan')) {
          try {
            // Quarter note delay
            effect.updateParameter('time', delayTime * 1000); // ms
          } catch (e) {}
        }
        
        // Tremolo/slicer: sync rate
        if (type.includes('Tremolo') || type.includes('Slicer') || type.includes('TR2') ||
            type.includes('AutoPan') || type.includes('StepSlicer') || type.includes('StepFilter')) {
          try {
            // Rate in Hz synced to tempo (quarter notes)
            effect.updateParameter('rate', this.bpm / 60);
          } catch (e) {}
        }
      }
    });
    
    console.log(`🎵 BPM synced: ${this.bpm} (delay: ${(60 / this.bpm * 1000).toFixed(0)}ms)`);
  }

  // ============================================
  // CPU MONITORING
  // ============================================

  _startCpuMonitoring() {
    if (this._cpuInterval) {
      clearInterval(this._cpuInterval);
    }
    
    // Use AudioContext's performance hints when available
    this._cpuInterval = setInterval(() => {
      if (!this.audioContext || this.audioContext.state !== 'running') {
        this._cpuPercent = 0;
        return;
      }

      // Use the baseLatency and outputLatency to estimate load
      // Also factor in number of active effects
      const baseLatency = this.audioContext.baseLatency || 0;
      const outputLatency = this.audioContext.outputLatency || 0;
      const bufferSize = 128; // default render quantum
      const sampleRate = this.audioContext.sampleRate;
      const bufferDuration = bufferSize / sampleRate; // time available to process one buffer
      
      // Estimate: total latency / expected latency gives us rough CPU usage
      const totalLatency = baseLatency + outputLatency;
      const expectedLatency = bufferDuration * 2; // 2 buffers baseline
      
      // Factor in active effects count
      const activeEffects = this.effectsChain.filter(e => !e.bypassed).length;
      const effectLoad = activeEffects * 1.5; // ~1.5% per active effect (rough estimate)
      
      // Combine latency-based estimate with effect count estimate
      let cpuEstimate;
      if (totalLatency > 0 && expectedLatency > 0) {
        cpuEstimate = Math.min(95, (totalLatency / expectedLatency) * 15 + effectLoad);
      } else {
        // Fallback: purely effect-count based estimate
        cpuEstimate = Math.min(95, 3 + effectLoad);
      }
      
      // Smooth the value
      this._cpuPercent = this._cpuPercent * 0.7 + cpuEstimate * 0.3;
    }, 500);
  }

  getCpuUsage() {
    return Math.round(this._cpuPercent);
  }

  // ============================================
  // MIDI
  // ============================================

  async initMIDI() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      return { supported: false, inputs: [] };
    }
    
    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this._midiAccess = midiAccess;
      this._midiLearnTarget = null;
      this._midiMappings = this._loadMidiMappings();
      
      const inputs = [];
      midiAccess.inputs.forEach((input) => {
        inputs.push({ id: input.id, name: input.name, manufacturer: input.manufacturer });
        input.onmidimessage = (msg) => this._handleMIDIMessage(msg);
      });
      
      // Listen for device changes
      midiAccess.onstatechange = (e) => {
        if (e.port.type === 'input') {
          if (e.port.state === 'connected') {
            e.port.onmidimessage = (msg) => this._handleMIDIMessage(msg);
            console.log(`🎹 MIDI input connected: ${e.port.name}`);
          } else {
            console.log(`🎹 MIDI input disconnected: ${e.port.name}`);
          }
        }
      };
      
      console.log(`🎹 MIDI initialized with ${inputs.length} input(s)`);
      return { supported: true, inputs };
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      return { supported: false, inputs: [], error: error.message };
    }
  }

  _handleMIDIMessage(event) {
    const [status, cc, value] = event.data;
    const channel = status & 0x0F;
    const messageType = status & 0xF0;
    
    // CC messages (0xB0)
    if (messageType === 0xB0) {
      // MIDI Learn mode
      if (this._midiLearnTarget) {
        const key = `${channel}:${cc}`;
        this._midiMappings[key] = { ...this._midiLearnTarget };
        this._saveMidiMappings();
        console.log(`🎹 MIDI Learn: CC${cc} ch${channel} → ${this._midiLearnTarget.effectId}:${this._midiLearnTarget.param}`);
        
        // Fire callback if set
        if (this._onMidiLearnComplete) {
          this._onMidiLearnComplete(key, this._midiLearnTarget);
        }
        this._midiLearnTarget = null;
        return;
      }
      
      // Apply mapping
      const key = `${channel}:${cc}`;
      const mapping = this._midiMappings[key];
      if (mapping) {
        const normalizedValue = value / 127;
        const mappedValue = mapping.min + normalizedValue * (mapping.max - mapping.min);
        
        if (mapping.effectId === '__master__') {
          this.setMasterVolume(mappedValue);
        } else if (mapping.effectId === '__input__') {
          this.setInputGain(mappedValue);
        } else if (mapping.effectId === '__bpm__') {
          this.setBPM(Math.round(mappedValue));
        } else {
          this.updateEffect(mapping.effectId, mapping.param, mappedValue);
        }
        
        // Fire callback for UI update
        if (this._onMidiCC) {
          this._onMidiCC(mapping, mappedValue);
        }
      }
    }
    
    // Program Change (0xC0)
    if (messageType === 0xC0) {
      if (this._onMidiProgramChange) {
        this._onMidiProgramChange(cc); // cc is actually the program number
      }
    }
  }

  startMidiLearn(effectId, param, min = 0, max = 100) {
    this._midiLearnTarget = { effectId, param, min, max };
    console.log(`🎹 MIDI Learn: waiting for CC... (target: ${effectId}:${param})`);
  }

  cancelMidiLearn() {
    this._midiLearnTarget = null;
  }

  removeMidiMapping(key) {
    delete this._midiMappings[key];
    this._saveMidiMappings();
  }

  getMidiMappings() {
    return { ...this._midiMappings };
  }

  onMidiCC(callback) {
    this._onMidiCC = callback;
  }

  onMidiLearnComplete(callback) {
    this._onMidiLearnComplete = callback;
  }

  onMidiProgramChange(callback) {
    this._onMidiProgramChange = callback;
  }

  _loadMidiMappings() {
    try {
      const saved = localStorage.getItem('rigmaster_midi_mappings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  _saveMidiMappings() {
    try {
      localStorage.setItem('rigmaster_midi_mappings', JSON.stringify(this._midiMappings));
    } catch (e) {
      console.warn('Failed to save MIDI mappings:', e);
    }
  }

  stop() {
    // Stop audio file playback
    this.unloadAudioFile();
    
    // Stop CPU monitoring
    if (this._cpuInterval) {
      clearInterval(this._cpuInterval);
      this._cpuInterval = null;
    }
    
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

