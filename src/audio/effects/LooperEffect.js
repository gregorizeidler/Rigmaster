import BaseEffect from './BaseEffect';

class LooperEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Looper', 'looper');

    // Recording parameters
    this.maxDuration = 30; // 30 seconds max
    this.sampleRate = audioContext.sampleRate;
    this.recordingBuffer = null;
    this.isRecording = false;
    this.isPlaying = false;
    this.recordingStartTime = 0;
    this.recordingLength = 0;

    // Create nodes
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.loopGain = audioContext.createGain();
    
    // Recording destination
    this.recordingDestination = audioContext.createMediaStreamDestination();
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // Playback source
    this.loopSource = null;

    // Connect: input -> inputGain -> wetGain -> output
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Recording path
    this.inputGain.connect(this.recordingDestination);
    
    // Loop playback
    this.loopGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  startRecording() {
    if (this.isRecording) return;

    this.recordedChunks = [];
    this.isRecording = true;
    this.recordingStartTime = this.audioContext.currentTime;

    // Setup MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      this.loadLoop(blob);
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.recordingLength = this.audioContext.currentTime - this.recordingStartTime;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async loadLoop(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    this.recordingBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.startLoop();
  }

  startLoop() {
    if (!this.recordingBuffer || this.isPlaying) return;

    this.isPlaying = true;
    this.playLoop();
  }

  playLoop() {
    if (!this.isPlaying || !this.recordingBuffer) return;

    // Stop previous source if exists
    if (this.loopSource) {
      this.loopSource.stop();
      this.loopSource.disconnect();
    }

    // Create new source
    this.loopSource = this.audioContext.createBufferSource();
    this.loopSource.buffer = this.recordingBuffer;
    this.loopSource.loop = true;
    this.loopSource.connect(this.loopGain);

    // Start playback
    this.loopSource.start(0);

    // Schedule next iteration (for seamless looping)
    this.loopSource.onended = () => {
      if (this.isPlaying) {
        this.playLoop();
      }
    };
  }

  stopLoop() {
    this.isPlaying = false;
    if (this.loopSource) {
      this.loopSource.stop();
      this.loopSource.disconnect();
      this.loopSource = null;
    }
  }

  clearLoop() {
    this.stopLoop();
    this.recordingBuffer = null;
    this.recordedChunks = [];
    this.recordingLength = 0;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'volume':
        this.loopGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'feedback':
        // Not used in basic looper, but could be for overdub
        break;
      default:
        break;
    }
  }

  // Special methods for UI control
  record() {
    if (!this.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  play() {
    if (this.recordingBuffer) {
      if (this.isPlaying) {
        this.stopLoop();
      } else {
        this.startLoop();
      }
    }
  }

  clear() {
    this.clearLoop();
  }

  disconnect() {
    this.stopLoop();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.loopGain.disconnect();
    super.disconnect();
  }
}

export default LooperEffect;

