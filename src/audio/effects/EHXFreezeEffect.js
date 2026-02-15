import BaseEffect from './BaseEffect';

class EHXFreezeEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Freeze', 'ehxfreeze');

    // ── State ──────────────────────────────────────────────────
    this.isFrozen = false;
    this.mode = 'fast'; // 'fast', 'slow', 'latch'
    this.sampleRate = audioContext.sampleRate;

    // ── Capture parameters ─────────────────────────────────────
    // Buffer length: short fragment capture (~100ms for fast, ~500ms for slow)
    this._captureMs = 100;
    this._maxCaptureSamples = Math.ceil(this.sampleRate * 0.5); // 500ms max
    this._captureBuffer = new Float32Array(this._maxCaptureSamples);
    this._captureBufferR = new Float32Array(this._maxCaptureSamples);
    this._capturePos = 0;
    this._captureLength = 0;
    this._isCapturing = true;

    // ── Playback ───────────────────────────────────────────────
    this.freezeSource = null;
    this.freezeBuffer = null;

    // ── Gains ──────────────────────────────────────────────────
    this.freezeGain = audioContext.createGain();
    this.freezeGain.gain.value = 0.0; // Silent until frozen

    this.throughGain = audioContext.createGain();
    this.throughGain.gain.value = 1.0;

    // ── Decay envelope for frozen sound ────────────────────────
    this.decayGain = audioContext.createGain();
    this.decayGain.gain.value = 1.0;

    // ── Tone shaping: LP + slight reverb-like smoothing ────────
    this.freezeLP = audioContext.createBiquadFilter();
    this.freezeLP.type = 'lowpass';
    this.freezeLP.frequency.value = 8000;
    this.freezeLP.Q.value = 0.5;

    // ── Cross-fade delay for seamless looping ──────────────────
    this.crossfadeDelay = audioContext.createDelay(0.05);
    this.crossfadeDelay.delayTime.value = 0.005;

    // ── Continuous capture via ScriptProcessor ──────────────────
    this._scriptProcessor = audioContext.createScriptProcessor(2048, 2, 2);
    this._scriptProcessor.onaudioprocess = (e) => this._captureAudio(e);

    // ── Routing ────────────────────────────────────────────────
    // Through path (when not frozen): input → throughGain → wetGain → output
    this.input.connect(this.throughGain);
    this.throughGain.connect(this.wetGain);

    // Capture path: input → scriptProcessor → (keep alive)
    this.input.connect(this._scriptProcessor);
    const silentDest = audioContext.createGain();
    silentDest.gain.value = 0;
    this._scriptProcessor.connect(silentDest);
    silentDest.connect(audioContext.destination);

    // Freeze playback: freezeSource → crossfadeDelay → freezeLP → decayGain → freezeGain → wetGain
    this.crossfadeDelay.connect(this.freezeLP);
    this.freezeLP.connect(this.decayGain);
    this.decayGain.connect(this.freezeGain);
    this.freezeGain.connect(this.wetGain);

    // Master: wetGain → output
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { mode: 'fast', decay: 100 };
  }

  /** Continuously captures the latest audio fragment in a circular buffer */
  _captureAudio(event) {
    if (!this._isCapturing) return;

    const inputL = event.inputBuffer.getChannelData(0);
    const inputR = event.inputBuffer.numberOfChannels > 1
      ? event.inputBuffer.getChannelData(1)
      : inputL;
    const len = inputL.length;
    const maxSamples = this._getCaptureSamples();

    for (let i = 0; i < len; i++) {
      this._captureBuffer[this._capturePos % maxSamples] = inputL[i];
      this._captureBufferR[this._capturePos % maxSamples] = inputR[i];
      this._capturePos++;
    }

    this._captureLength = Math.min(this._capturePos, maxSamples);
  }

  /** Returns capture buffer length in samples based on mode */
  _getCaptureSamples() {
    switch (this.mode) {
      case 'fast': return Math.ceil(this.sampleRate * 0.08);  // 80ms
      case 'slow': return Math.ceil(this.sampleRate * 0.3);   // 300ms
      case 'latch': return Math.ceil(this.sampleRate * 0.12); // 120ms
      default: return Math.ceil(this.sampleRate * 0.1);
    }
  }

  /** Builds an AudioBuffer from the circular capture buffer with crossfade */
  _buildFreezeBuffer() {
    const len = this._captureLength;
    if (len === 0) return null;

    const buffer = this.audioContext.createBuffer(2, len, this.sampleRate);
    const chL = buffer.getChannelData(0);
    const chR = buffer.getChannelData(1);
    const maxSamples = this._getCaptureSamples();
    const start = (this._capturePos - len + maxSamples) % maxSamples;

    // Copy with crossfade at loop boundaries (first/last 5% overlap)
    const fadeLen = Math.floor(len * 0.05);

    for (let i = 0; i < len; i++) {
      const idx = (start + i) % maxSamples;
      let sample_l = this._captureBuffer[idx];
      let sample_r = this._captureBufferR[idx];

      // Apply crossfade at boundaries for click-free looping
      if (i < fadeLen) {
        const fade = i / fadeLen;
        sample_l *= fade;
        sample_r *= fade;
      } else if (i >= len - fadeLen) {
        const fade = (len - i) / fadeLen;
        sample_l *= fade;
        sample_r *= fade;
      }

      chL[i] = sample_l;
      chR[i] = sample_r;
    }

    return buffer;
  }

  /** Activates freeze: captures current audio and loops it */
  freeze() {
    if (this.isFrozen) return;

    this.freezeBuffer = this._buildFreezeBuffer();
    if (!this.freezeBuffer) return;

    this.isFrozen = true;
    const now = this.audioContext.currentTime;

    // Stop capturing while frozen
    this._isCapturing = false;

    // Create looping source
    this.freezeSource = this.audioContext.createBufferSource();
    this.freezeSource.buffer = this.freezeBuffer;
    this.freezeSource.loop = true;
    this.freezeSource.connect(this.crossfadeDelay);
    this.freezeSource.start();

    // Crossfade: through off, freeze on
    const fadeTime = this.mode === 'fast' ? 0.01 : 0.08;
    this.throughGain.gain.setTargetAtTime(0.0, now, fadeTime);
    this.freezeGain.gain.setTargetAtTime(1.0, now, fadeTime);
    this.decayGain.gain.setTargetAtTime(1.0, now, 0.01);
  }

  /** Releases the frozen sound */
  unfreeze() {
    if (!this.isFrozen) return;

    this.isFrozen = false;
    const now = this.audioContext.currentTime;
    const fadeTime = this.mode === 'fast' ? 0.02 : 0.15;

    // Crossfade: freeze off, through on
    this.freezeGain.gain.setTargetAtTime(0.0, now, fadeTime);
    this.throughGain.gain.setTargetAtTime(1.0, now, fadeTime);

    // Stop source after fade
    if (this.freezeSource) {
      const stopTime = now + fadeTime * 5;
      try { this.freezeSource.stop(stopTime); } catch (e) {}
      this.freezeSource = null;
    }

    // Resume capturing
    this._isCapturing = true;
    this._capturePos = 0;
    this._captureLength = 0;
  }

  /** Toggle freeze on/off */
  toggle() {
    if (this.isFrozen) {
      this.unfreeze();
    } else {
      this.freeze();
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'mode': {
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['fast', 'slow', 'latch'];
          this.mode = modes[Math.max(0, Math.min(2, Math.floor(value)))] || 'fast';
        }
        this.params.mode = this.mode;
        break;
      }
      case 'decay': {
        // Decay: 0-100 → 0.0-1.0 (how quickly the frozen sound fades)
        // 100 = infinite sustain, 0 = quick fade
        const decayLevel = value / 100;
        this.decayGain.gain.setTargetAtTime(decayLevel, now, 0.05);
        this.params.decay = value;
        break;
      }
      case 'activate': {
        // Special trigger parameter for freeze activation
        if (value > 0.5) {
          this.freeze();
        } else {
          this.unfreeze();
        }
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    this._isCapturing = false;
    if (this.freezeSource) {
      try { this.freezeSource.stop(); } catch (e) {}
      try { this.freezeSource.disconnect(); } catch (e) {}
    }
    try { this._scriptProcessor.disconnect(); } catch (e) {}
    try { this.throughGain.disconnect(); } catch (e) {}
    try { this.freezeGain.disconnect(); } catch (e) {}
    try { this.decayGain.disconnect(); } catch (e) {}
    try { this.freezeLP.disconnect(); } catch (e) {}
    try { this.crossfadeDelay.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EHXFreezeEffect;
