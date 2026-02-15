import BaseEffect from './BaseEffect';

class LooperEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Looper', 'looper');

    // Recording parameters
    this.maxDuration = 60; // 60 seconds max
    this.sampleRate = audioContext.sampleRate;
    this.isRecording = false;
    this.isOverdubbing = false;
    this.isPlaying = false;
    this.isReversed = false;
    this.playbackRate = 1.0;

    // Pre-allocated recording buffer (stereo, max 60s at current sample rate)
    this._maxSamples = this.maxDuration * this.sampleRate;
    this._recordBufferL = new Float32Array(this._maxSamples);
    this._recordBufferR = new Float32Array(this._maxSamples);
    this._recordPosition = 0;
    this._loopLengthSamples = 0;

    // Decoded AudioBuffer for playback
    this.recordingBuffer = null;

    // Create nodes
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.loopGain = audioContext.createGain();
    this.loopGain.gain.value = 1.0;

    // Recording capture via ScriptProcessorNode (or AudioWorklet when available)
    // Using ScriptProcessor for broad compatibility - captures raw PCM samples
    this._scriptProcessor = audioContext.createScriptProcessor(4096, 2, 2);
    this._scriptProcessor.onaudioprocess = (e) => this._processAudio(e);

    // Playback source
    this.loopSource = null;
    this._loopStartTime = 0;

    // Connect: input -> inputGain -> wetGain -> output (pass-through)
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Recording path: inputGain -> scriptProcessor -> (silent output, just for processing)
    this.inputGain.connect(this._scriptProcessor);
    this._scriptProcessor.connect(audioContext.createGain()); // must connect to keep alive

    // Loop playback
    this.loopGain.connect(this.output);

    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  _processAudio(event) {
    if (!this.isRecording && !this.isOverdubbing) return;

    const inputL = event.inputBuffer.getChannelData(0);
    const inputR = event.inputBuffer.numberOfChannels > 1 
      ? event.inputBuffer.getChannelData(1) 
      : inputL;
    const bufferLength = inputL.length;

    if (this.isRecording) {
      // Initial recording: write samples directly to buffer
      for (let i = 0; i < bufferLength; i++) {
        if (this._recordPosition < this._maxSamples) {
          this._recordBufferL[this._recordPosition] = inputL[i];
          this._recordBufferR[this._recordPosition] = inputR[i];
          this._recordPosition++;
        }
      }
    } else if (this.isOverdubbing && this._loopLengthSamples > 0) {
      // Overdub: mix new input with existing buffer content
      for (let i = 0; i < bufferLength; i++) {
        const pos = this._recordPosition % this._loopLengthSamples;
        this._recordBufferL[pos] = this._recordBufferL[pos] * 0.85 + inputL[i] * 0.85;
        this._recordBufferR[pos] = this._recordBufferR[pos] * 0.85 + inputR[i] * 0.85;
        // Soft clip to prevent accumulation overflow
        this._recordBufferL[pos] = Math.max(-1, Math.min(1, this._recordBufferL[pos]));
        this._recordBufferR[pos] = Math.max(-1, Math.min(1, this._recordBufferR[pos]));
        this._recordPosition++;
      }
    }
  }

  _buildAudioBuffer() {
    if (this._loopLengthSamples === 0) return null;

    const buffer = this.audioContext.createBuffer(2, this._loopLengthSamples, this.sampleRate);
    const chL = buffer.getChannelData(0);
    const chR = buffer.getChannelData(1);

    if (this.isReversed) {
      // Reverse the buffer data
      for (let i = 0; i < this._loopLengthSamples; i++) {
        chL[i] = this._recordBufferL[this._loopLengthSamples - 1 - i];
        chR[i] = this._recordBufferR[this._loopLengthSamples - 1 - i];
      }
    } else {
      chL.set(this._recordBufferL.subarray(0, this._loopLengthSamples));
      chR.set(this._recordBufferR.subarray(0, this._loopLengthSamples));
    }

    return buffer;
  }

  startRecording() {
    if (this.isRecording) return;

    // Stop any existing playback
    this.stopLoop();

    // Reset recording position
    this._recordPosition = 0;
    this._loopLengthSamples = 0;
    this.isRecording = true;
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this._loopLengthSamples = this._recordPosition;
    this._recordPosition = 0;

    // Build AudioBuffer from raw samples
    this.recordingBuffer = this._buildAudioBuffer();

    // Auto-start loop playback
    if (this.recordingBuffer) {
      this.startLoop();
    }
  }

  startOverdub() {
    if (!this.recordingBuffer || this._loopLengthSamples === 0) return;
    this._recordPosition = 0;
    this.isOverdubbing = true;
  }

  stopOverdub() {
    if (!this.isOverdubbing) return;
    this.isOverdubbing = false;
    this._recordPosition = 0;

    // Rebuild the AudioBuffer with overdubbed content
    this.recordingBuffer = this._buildAudioBuffer();

    // Restart playback with updated buffer
    if (this.isPlaying) {
      this._restartLoop();
    }
  }

  startLoop() {
    if (!this.recordingBuffer || this.isPlaying) return;

    this.isPlaying = true;
    this._playLoopPrecise();
  }

  _playLoopPrecise() {
    if (!this.isPlaying || !this.recordingBuffer) return;

    // Stop previous source if exists
    if (this.loopSource) {
      try {
        this.loopSource.stop();
        this.loopSource.disconnect();
      } catch (e) {}
    }

    // Create new source with loop enabled
    this.loopSource = this.audioContext.createBufferSource();
    this.loopSource.buffer = this.recordingBuffer;
    this.loopSource.loop = true;
    this.loopSource.playbackRate.value = this.playbackRate;
    this.loopSource.connect(this.loopGain);

    // Use precise scheduling with audioContext.currentTime
    this._loopStartTime = this.audioContext.currentTime;
    this.loopSource.start(this._loopStartTime);
  }

  _restartLoop() {
    // Seamlessly restart with updated buffer
    const wasPlaying = this.isPlaying;
    this.stopLoop();
    if (wasPlaying) {
      this.isPlaying = true;
      this._playLoopPrecise();
    }
  }

  stopLoop() {
    this.isPlaying = false;
    if (this.loopSource) {
      try {
        this.loopSource.stop();
        this.loopSource.disconnect();
      } catch (e) {}
      this.loopSource = null;
    }
  }

  clearLoop() {
    this.stopLoop();
    this.isOverdubbing = false;
    this.isRecording = false;
    this.recordingBuffer = null;
    this._recordPosition = 0;
    this._loopLengthSamples = 0;
    this.isReversed = false;
    this.playbackRate = 1.0;
  }

  setHalfSpeed(enabled) {
    this.playbackRate = enabled ? 0.5 : 1.0;
    if (this.loopSource) {
      const now = this.audioContext.currentTime;
      this.loopSource.playbackRate.setTargetAtTime(this.playbackRate, now, 0.01);
    }
  }

  setReverse(enabled) {
    this.isReversed = enabled;
    if (this._loopLengthSamples > 0) {
      // Rebuild buffer with reversed/normal data
      this.recordingBuffer = this._buildAudioBuffer();
      if (this.isPlaying) {
        this._restartLoop();
      }
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'volume':
        this.loopGain.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'speed':
        // Playback speed: 0=half, 50=normal, 100=double
        if (value <= 50) {
          this.playbackRate = 0.5 + (value / 50) * 0.5; // 0.5 to 1.0
        } else {
          this.playbackRate = 1.0 + ((value - 50) / 50) * 1.0; // 1.0 to 2.0
        }
        if (this.loopSource) {
          this.loopSource.playbackRate.setTargetAtTime(this.playbackRate, now, 0.01);
        }
        break;
      case 'feedback':
        // Overdub feedback level (how much of existing loop is retained)
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

  overdub() {
    if (!this.isOverdubbing) {
      this.startOverdub();
    } else {
      this.stopOverdub();
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

  halfSpeed() {
    this.setHalfSpeed(this.playbackRate !== 0.5);
  }

  reverse() {
    this.setReverse(!this.isReversed);
  }

  disconnect() {
    this.stopLoop();
    this.isRecording = false;
    this.isOverdubbing = false;
    this.inputGain.disconnect();
    this.loopGain.disconnect();
    try { this._scriptProcessor.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default LooperEffect;
