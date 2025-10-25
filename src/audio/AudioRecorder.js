/**
 * AudioRecorder - Record and playback with effects
 * 
 * Features:
 * - Record guitar input with effects
 * - Playback recorded audio
 * - Export to WAV
 * - Overdub capability
 */

class AudioRecorder {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Recording state
    this.isRecording = false;
    this.isPlaying = false;
    this.recordedBuffer = null;
    this.recordingStartTime = 0;
    this.recordingDuration = 0;
    
    // MediaRecorder for recording
    this.mediaRecorder = null;
    this.recordedChunks = [];
    
    // Nodes
    this.recordingDestination = audioContext.createMediaStreamDestination();
    this.playbackSource = null;
    this.playbackGain = audioContext.createGain();
    this.playbackGain.gain.value = 1.0;
    
    // Output for playback
    this.output = audioContext.createGain();
    this.playbackGain.connect(this.output);
  }
  
  /**
   * Start recording
   * @param {AudioNode} sourceNode - The node to record from (after effects)
   */
  startRecording(sourceNode) {
    if (this.isRecording) return;
    
    // Save source node reference to disconnect later
    this.recordingSourceNode = sourceNode;
    
    // Connect source to recording destination
    sourceNode.connect(this.recordingDestination);
    
    // Create MediaRecorder with HIGH QUALITY settings
    const stream = this.recordingDestination.stream;
    
    // Try different codecs/settings in order of quality preference
    const codecOptions = [
      // Highest quality: PCM (uncompressed) - Chrome/Safari
      { mimeType: 'audio/webm;codecs=pcm', audioBitsPerSecond: 2116800 }, // 44.1kHz * 16bit * 2ch * 1.5
      // High quality: Opus at maximum bitrate
      { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 510000 }, // Max opus bitrate (510kbps)
      // Safari fallback
      { mimeType: 'audio/mp4', audioBitsPerSecond: 320000 },
      // Generic high quality
      { audioBitsPerSecond: 320000 }
    ];
    
    let mediaRecorderCreated = false;
    
    for (const options of codecOptions) {
      try {
        if (!options.mimeType || MediaRecorder.isTypeSupported(options.mimeType)) {
          this.mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorderCreated = true;
          console.log(`✅ Using codec: ${options.mimeType || 'default'} at ${options.audioBitsPerSecond}bps`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!mediaRecorderCreated) {
      // Last resort fallback
      this.mediaRecorder = new MediaRecorder(stream);
      console.warn('⚠️ Using default MediaRecorder settings (may be lower quality)');
    }
    
    this.recordedChunks = [];
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = async () => {
      // Disconnect source to avoid feedback
      if (this.recordingSourceNode) {
        try {
          this.recordingSourceNode.disconnect(this.recordingDestination);
        } catch (e) {
          console.warn('Source already disconnected');
        }
        this.recordingSourceNode = null;
      }
      
      const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
      await this.loadRecordingToBuffer(blob);
    };
    
    // Capture every 100ms for smooth recording
    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.recordingStartTime = this.audioContext.currentTime;
    
    // Log quality info for user
    const qualityInfo = {
      codec: this.mediaRecorder.mimeType,
      sampleRate: `${this.audioContext.sampleRate / 1000}kHz`,
      bitrate: this.mediaRecorder.audioBitsPerSecond 
        ? `${Math.round(this.mediaRecorder.audioBitsPerSecond / 1000)}kbps` 
        : 'default'
    };
    
    console.log('🔴 Recording started (HIGH QUALITY MODE)');
    console.log('📊 Quality Settings:', qualityInfo);
  }
  
  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.mediaRecorder.stop();
    this.isRecording = false;
    this.recordingDuration = this.audioContext.currentTime - this.recordingStartTime;
    
    console.log(`⏹️ Recording stopped (${this.recordingDuration.toFixed(2)}s)`);
  }
  
  /**
   * Load recording blob to AudioBuffer
   */
  async loadRecordingToBuffer(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      this.recordedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('✅ Recording ready for playback');
    } catch (error) {
      console.error('Failed to decode recording:', error);
    }
  }
  
  /**
   * Play recorded audio
   */
  playRecording() {
    if (!this.recordedBuffer) {
      console.warn('No recording available');
      return;
    }
    
    if (this.isPlaying) {
      this.stopPlayback();
    }
    
    // Create buffer source
    this.playbackSource = this.audioContext.createBufferSource();
    this.playbackSource.buffer = this.recordedBuffer;
    this.playbackSource.connect(this.playbackGain);
    
    // Auto-stop when finished
    this.playbackSource.onended = () => {
      this.isPlaying = false;
      console.log('⏹️ Playback finished');
    };
    
    this.playbackSource.start(0);
    this.isPlaying = true;
    
    console.log('▶️ Playing recording...');
  }
  
  /**
   * Stop playback
   */
  stopPlayback() {
    if (this.playbackSource && this.isPlaying) {
      try {
        this.playbackSource.stop();
        this.playbackSource.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.playbackSource = null;
      this.isPlaying = false;
      console.log('⏹️ Playback stopped');
    }
  }
  
  /**
   * Clear recorded audio
   */
  clearRecording() {
    this.stopPlayback();
    this.recordedBuffer = null;
    this.recordedChunks = [];
    this.recordingDuration = 0;
    console.log('🗑️ Recording cleared');
  }
  
  /**
   * Export recording to WAV file
   */
  async exportToWAV() {
    if (!this.recordedBuffer) {
      console.warn('No recording to export');
      return null;
    }
    
    // Convert AudioBuffer to WAV
    const wavBlob = this.audioBufferToWav(this.recordedBuffer);
    
    // Log export info
    const sizeInMB = (wavBlob.size / (1024 * 1024)).toFixed(2);
    console.log('💾 Exporting WAV file...');
    console.log(`📊 File Info: ${sizeInMB}MB, ${this.recordedBuffer.sampleRate}Hz, ${this.recordedBuffer.numberOfChannels}ch, 16-bit`);
    
    // Create download link
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guitrard-recording-${Date.now()}.wav`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Recording exported successfully');
    
    return wavBlob;
  }
  
  /**
   * Convert AudioBuffer to WAV Blob
   */
  audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const sampleRate = buffer.sampleRate;
    
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Write audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  /**
   * Get recording info
   */
  getInfo() {
    return {
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      hasRecording: !!this.recordedBuffer,
      duration: this.recordingDuration,
      sampleRate: this.recordedBuffer?.sampleRate || this.audioContext.sampleRate,
      channels: this.recordedBuffer?.numberOfChannels || 2,
      bitDepth: 16, // WAV export is 16-bit
      codec: this.mediaRecorder?.mimeType || 'unknown'
    };
  }
  
  /**
   * Set playback volume
   */
  setVolume(value) {
    // value 0-100
    this.playbackGain.gain.value = value / 100;
  }
  
  /**
   * Connect output to destination
   */
  connect(destination) {
    this.output.connect(destination);
  }
  
  /**
   * Disconnect
   */
  disconnect() {
    try {
      this.stopPlayback();
      this.stopRecording();
      this.output.disconnect();
      this.playbackGain.disconnect();
      this.recordingDestination.disconnect();
    } catch (e) {
      // Already disconnected
    }
  }
}

export default AudioRecorder;

