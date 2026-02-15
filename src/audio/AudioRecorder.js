/**
 * AudioRecorder - Professional quality recording and playback
 * 
 * Features:
 * - Record guitar input with effects (post-processing)
 * - Playback recorded audio
 * - Export to 24-bit WAV with TPDF dithering
 * - High-quality codec selection
 */
import AudioConfig from './AudioConfig';

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
    const codecOptions = AudioConfig.recording.codecPriority;
    
    let mediaRecorderCreated = false;
    
    for (const options of codecOptions) {
      try {
        if (!options.mimeType || MediaRecorder.isTypeSupported(options.mimeType)) {
          this.mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorderCreated = true;
          console.log(`Recording codec: ${options.mimeType || 'default'} at ${options.audioBitsPerSecond}bps`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!mediaRecorderCreated) {
      this.mediaRecorder = new MediaRecorder(stream);
      console.warn('Using default MediaRecorder settings');
    }
    
    this.recordedChunks = [];
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = async () => {
      // Disconnect source
      if (this.recordingSourceNode) {
        try {
          this.recordingSourceNode.disconnect(this.recordingDestination);
        } catch (e) {}
        this.recordingSourceNode = null;
      }
      
      const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
      await this.loadRecordingToBuffer(blob);
    };
    
    // Start without timeslice for cleanest recording (no chunk boundaries)
    const timeslice = AudioConfig.recording.timesliceMs;
    if (timeslice > 0) {
      this.mediaRecorder.start(timeslice);
    } else {
      this.mediaRecorder.start();
    }
    
    this.isRecording = true;
    this.recordingStartTime = this.audioContext.currentTime;
    
    console.log('Recording started (HIGH QUALITY MODE)');
    console.log('Quality:', {
      codec: this.mediaRecorder.mimeType,
      sampleRate: `${this.audioContext.sampleRate / 1000}kHz`,
      exportBitDepth: `${AudioConfig.exportBitDepth}-bit`,
      dithering: AudioConfig.dithering.type,
    });
  }
  
  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.mediaRecorder.stop();
    this.isRecording = false;
    this.recordingDuration = this.audioContext.currentTime - this.recordingStartTime;
    
    console.log(`Recording stopped (${this.recordingDuration.toFixed(2)}s)`);
  }
  
  /**
   * Load recording blob to AudioBuffer
   */
  async loadRecordingToBuffer(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      this.recordedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('Recording ready for playback');
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
    
    this.playbackSource = this.audioContext.createBufferSource();
    this.playbackSource.buffer = this.recordedBuffer;
    this.playbackSource.connect(this.playbackGain);
    
    this.playbackSource.onended = () => {
      this.isPlaying = false;
    };
    
    this.playbackSource.start(0);
    this.isPlaying = true;
  }
  
  /**
   * Stop playback
   */
  stopPlayback() {
    if (this.playbackSource && this.isPlaying) {
      try {
        this.playbackSource.stop();
        this.playbackSource.disconnect();
      } catch (e) {}
      this.playbackSource = null;
      this.isPlaying = false;
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
  }
  
  /**
   * TPDF Dithering - Triangular Probability Density Function
   * Standard dithering for bit-depth reduction.
   * Eliminates quantization distortion artifacts.
   */
  _tpdfDither() {
    // Two uniform random values summed = triangular distribution
    return (Math.random() - 0.5) + (Math.random() - 0.5);
  }
  
  /**
   * Export recording to WAV file (24-bit with TPDF dithering)
   */
  async exportToWAV() {
    if (!this.recordedBuffer) {
      console.warn('No recording to export');
      return null;
    }
    
    const bitDepth = AudioConfig.exportBitDepth;
    const wavBlob = this.audioBufferToWav(this.recordedBuffer, bitDepth);
    
    const sizeInMB = (wavBlob.size / (1024 * 1024)).toFixed(2);
    console.log(`Exporting WAV: ${sizeInMB}MB, ${this.recordedBuffer.sampleRate}Hz, ${this.recordedBuffer.numberOfChannels}ch, ${bitDepth}-bit`);
    
    // Create download link
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rigmaster-recording-${Date.now()}.wav`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Recording exported successfully');
    
    return wavBlob;
  }
  
  /**
   * Convert AudioBuffer to WAV Blob
   * Supports 16-bit and 24-bit with TPDF dithering
   */
  audioBufferToWav(buffer, bitDepth = 24) {
    const numberOfChannels = buffer.numberOfChannels;
    const bytesPerSample = bitDepth / 8;
    const length = buffer.length * numberOfChannels * bytesPerSample;
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
    view.setUint32(16, 16, true);                                        // PCM format chunk size
    view.setUint16(20, 1, true);                                         // PCM format (1)
    view.setUint16(22, numberOfChannels, true);                          // Channels
    view.setUint32(24, sampleRate, true);                                // Sample rate
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true); // Byte rate
    view.setUint16(32, numberOfChannels * bytesPerSample, true);         // Block align
    view.setUint16(34, bitDepth, true);                                  // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Get channel data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    const useDithering = AudioConfig.dithering.enabled && AudioConfig.dithering.type === 'tpdf';
    
    let offset = 44;
    
    if (bitDepth === 24) {
      // 24-bit WAV export with TPDF dithering
      const scale = 0x7FFFFF; // 2^23 - 1
      const ditherScale = 1.0 / scale; // 1 LSB at 24-bit
      
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          let sample = Math.max(-1, Math.min(1, channels[channel][i]));
          
          // Add TPDF dither (1 LSB amplitude)
          if (useDithering) {
            sample += this._tpdfDither() * ditherScale;
          }
          
          // Convert to 24-bit integer
          let intSample = Math.round(sample * scale);
          intSample = Math.max(-0x800000, Math.min(0x7FFFFF, intSample));
          
          // Write 3 bytes (little-endian)
          view.setUint8(offset, intSample & 0xFF);
          view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
          view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
          offset += 3;
        }
      }
    } else {
      // 16-bit WAV export with TPDF dithering
      const scale16 = 0x7FFF;
      const ditherScale16 = 1.0 / scale16;
      
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          let sample = Math.max(-1, Math.min(1, channels[channel][i]));
          
          // Add TPDF dither
          if (useDithering) {
            sample += this._tpdfDither() * ditherScale16;
          }
          
          // Convert to 16-bit
          const intSample = sample < 0 ? Math.max(-0x8000, Math.round(sample * 0x8000)) 
                                       : Math.min(0x7FFF, Math.round(sample * 0x7FFF));
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
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
      bitDepth: AudioConfig.exportBitDepth,
      codec: this.mediaRecorder?.mimeType || 'unknown',
      dithering: AudioConfig.dithering.type,
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
    } catch (e) {}
  }
}

export default AudioRecorder;
