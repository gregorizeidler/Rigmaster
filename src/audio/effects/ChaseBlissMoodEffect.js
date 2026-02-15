import BaseEffect from './BaseEffect';

class ChaseBlissMoodEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Chase Bliss Mood', 'chasblissmood');

    // ── Mode ───────────────────────────────────────────────────
    // 'tape' (warm lofi), 'slip' (pitch-shifted), 'stretch' (granular)
    this.mode = 'tape';
    this.sampleRate = audioContext.sampleRate;

    // ── Micro-looper state ─────────────────────────────────────
    this._maxLoopSamples = Math.ceil(this.sampleRate * 4); // 4 seconds max
    this._loopBuffer = new Float32Array(this._maxLoopSamples);
    this._loopBufferR = new Float32Array(this._maxLoopSamples);
    this._writePos = 0;
    this._loopLength = 0;
    this._isRecording = true;
    this.loopSource = null;
    this.loopAudioBuffer = null;

    // ── Clock division sets loop length ────────────────────────
    this._clockDivision = 0.5; // Seconds: 0.1s to 4s

    // ── ScriptProcessor for continuous micro-loop capture ──────
    this._scriptProcessor = audioContext.createScriptProcessor(2048, 2, 2);
    this._scriptProcessor.onaudioprocess = (e) => this._captureLoop(e);

    // ── Loop playback gain ─────────────────────────────────────
    this.loopGain = audioContext.createGain();
    this.loopGain.gain.value = 0.7;

    // ── Through signal ─────────────────────────────────────────
    this.throughGain = audioContext.createGain();
    this.throughGain.gain.value = 1.0;

    // ── Reverb-like tail using feedback delay network ──────────
    this.reverbDelay1 = audioContext.createDelay(0.5);
    this.reverbDelay1.delayTime.value = 0.037;

    this.reverbDelay2 = audioContext.createDelay(0.5);
    this.reverbDelay2.delayTime.value = 0.053;

    this.reverbFB1 = audioContext.createGain();
    this.reverbFB1.gain.value = 0.4;

    this.reverbFB2 = audioContext.createGain();
    this.reverbFB2.gain.value = 0.35;

    this.reverbMixer = audioContext.createGain();
    this.reverbMixer.gain.value = 0.3;

    // ── Tone shaping filter ────────────────────────────────────
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 8000;
    this.toneFilter.Q.value = 0.707;

    // ── Modify: modulation depth (tape warble / pitch warp) ────
    this.modDelay = audioContext.createDelay(0.05);
    this.modDelay.delayTime.value = 0.005;

    this.modLFO = audioContext.createOscillator();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.8;

    this.modLFODepth = audioContext.createGain();
    this.modLFODepth.gain.value = 0.0005; // Subtle warble

    this.modLFO.connect(this.modLFODepth);
    this.modLFODepth.connect(this.modDelay.delayTime);
    this.modLFO.start();

    // ── Tape saturation waveshaper ─────────────────────────────
    this.tapeSat = audioContext.createWaveShaper();
    this.tapeSat.curve = this._makeTapeSatCurve(1024);
    this.tapeSat.oversample = '2x';

    // ── Master mixer ───────────────────────────────────────────
    this.masterMixer = audioContext.createGain();
    this.masterMixer.gain.value = 1.0;

    // ── Routing ────────────────────────────────────────────────
    // Through path: input → throughGain → masterMixer
    this.input.connect(this.throughGain);
    this.throughGain.connect(this.masterMixer);

    // Capture path: input → scriptProcessor (kept alive)
    this.input.connect(this._scriptProcessor);
    const silentOut = audioContext.createGain();
    silentOut.gain.value = 0;
    this._scriptProcessor.connect(silentOut);
    silentOut.connect(audioContext.destination);

    // Loop playback: loopSource → modDelay → tapeSat → toneFilter → loopGain → masterMixer
    this.modDelay.connect(this.tapeSat);
    this.tapeSat.connect(this.toneFilter);
    this.toneFilter.connect(this.loopGain);
    this.loopGain.connect(this.masterMixer);

    // Reverb tail: loopGain → reverbDelay1 → reverbFB1 → reverbDelay1 (feedback)
    this.loopGain.connect(this.reverbDelay1);
    this.reverbDelay1.connect(this.reverbFB1);
    this.reverbFB1.connect(this.reverbDelay1);
    this.reverbDelay1.connect(this.reverbMixer);

    // Second reverb tap: loopGain → reverbDelay2 → reverbFB2 → reverbDelay2 (feedback)
    this.loopGain.connect(this.reverbDelay2);
    this.reverbDelay2.connect(this.reverbFB2);
    this.reverbFB2.connect(this.reverbDelay2);
    this.reverbDelay2.connect(this.reverbMixer);

    this.reverbMixer.connect(this.masterMixer);

    // Master: masterMixer → wetGain → output
    this.masterMixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Start initial loop capture
    this._startLoopRefresh();

    this.params = { time: 50, mix: 50, clock: 50, filter: 80, modify: 20, mode: 'tape' };
  }

  /** Tape-style soft saturation curve */
  _makeTapeSatCurve(samples) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft asymmetric clipping characteristic of tape
      curve[i] = Math.tanh(x * 1.2) * 0.9;
    }
    return curve;
  }

  /** Continuously writes incoming audio to the circular loop buffer */
  _captureLoop(event) {
    if (!this._isRecording) return;

    const inputL = event.inputBuffer.getChannelData(0);
    const inputR = event.inputBuffer.numberOfChannels > 1
      ? event.inputBuffer.getChannelData(1)
      : inputL;
    const len = inputL.length;
    const maxLen = Math.ceil(this._clockDivision * this.sampleRate);
    const cappedMax = Math.min(maxLen, this._maxLoopSamples);

    for (let i = 0; i < len; i++) {
      const pos = this._writePos % cappedMax;
      this._loopBuffer[pos] = inputL[i];
      this._loopBufferR[pos] = inputR[i];
      this._writePos++;
    }

    this._loopLength = Math.min(this._writePos, cappedMax);
  }

  /** Builds an AudioBuffer from the loop buffer with crossfade seam */
  _buildLoopBuffer() {
    const len = this._loopLength;
    if (len < 256) return null;

    const buffer = this.audioContext.createBuffer(2, len, this.sampleRate);
    const chL = buffer.getChannelData(0);
    const chR = buffer.getChannelData(1);

    const maxLen = Math.ceil(this._clockDivision * this.sampleRate);
    const cappedMax = Math.min(maxLen, this._maxLoopSamples);
    const start = (this._writePos - len + cappedMax) % cappedMax;
    const fadeLen = Math.max(32, Math.floor(len * 0.03));

    for (let i = 0; i < len; i++) {
      const idx = (start + i) % cappedMax;
      let sL = this._loopBuffer[idx];
      let sR = this._loopBufferR[idx];

      // Crossfade at loop boundaries
      if (i < fadeLen) {
        const f = i / fadeLen;
        sL *= f;
        sR *= f;
      } else if (i >= len - fadeLen) {
        const f = (len - i) / fadeLen;
        sL *= f;
        sR *= f;
      }

      chL[i] = sL;
      chR[i] = sR;
    }

    return buffer;
  }

  /** Starts or refreshes the micro-loop playback */
  _startLoopRefresh() {
    // Auto-refresh the loop every clock period
    this._loopInterval = setInterval(() => {
      this._refreshLoop();
    }, this._clockDivision * 1000);
  }

  _refreshLoop() {
    this.loopAudioBuffer = this._buildLoopBuffer();
    if (!this.loopAudioBuffer) return;

    // Stop previous source
    if (this.loopSource) {
      try { this.loopSource.stop(); this.loopSource.disconnect(); } catch (e) {}
    }

    // Create new looping source
    this.loopSource = this.audioContext.createBufferSource();
    this.loopSource.buffer = this.loopAudioBuffer;
    this.loopSource.loop = true;

    // Mode-specific playback rate
    if (this.mode === 'slip') {
      this.loopSource.playbackRate.value = 0.5; // Half-speed for pitch down
    } else if (this.mode === 'stretch') {
      this.loopSource.playbackRate.value = 0.25; // Granular stretch
    } else {
      this.loopSource.playbackRate.value = 1.0;
    }

    this.loopSource.connect(this.modDelay);
    this.loopSource.start();

    // Reset write position for next capture cycle
    this._writePos = 0;
    this._loopLength = 0;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'time': {
        // Loop time: 0-100 → 0.1s-4.0s (logarithmic)
        const minT = 0.1;
        const maxT = 4.0;
        this._clockDivision = minT * Math.pow(maxT / minT, value / 100);
        // Restart interval with new timing
        if (this._loopInterval) clearInterval(this._loopInterval);
        this._startLoopRefresh();
        this.params.time = value;
        break;
      }
      case 'mix': {
        // Mix 0-100: through vs loop balance
        const t = value / 100;
        this.throughGain.gain.setTargetAtTime(1.0 - t * 0.5, now, 0.02);
        this.loopGain.gain.setTargetAtTime(t, now, 0.02);
        this.params.mix = value;
        break;
      }
      case 'clock': {
        // Clock division: 0-100 → affects loop length subdivision
        const minDiv = 0.05;
        const maxDiv = 2.0;
        this._clockDivision = minDiv + (value / 100) * (maxDiv - minDiv);
        if (this._loopInterval) clearInterval(this._loopInterval);
        this._startLoopRefresh();
        this.params.clock = value;
        break;
      }
      case 'filter': {
        // Filter: 0-100 → 200Hz-16000Hz (logarithmic)
        const minF = 200;
        const maxF = 16000;
        const freq = minF * Math.pow(maxF / minF, value / 100);
        this.toneFilter.frequency.setTargetAtTime(freq, now, 0.02);
        this.params.filter = value;
        break;
      }
      case 'modify': {
        // Modify: modulation depth 0-100
        // Controls LFO depth and tape saturation amount
        const depth = (value / 100) * 0.003;
        this.modLFODepth.gain.setTargetAtTime(depth, now, 0.02);
        this.modLFO.frequency.setTargetAtTime(0.3 + (value / 100) * 4.0, now, 0.02);
        // Increase reverb feedback with modify
        const revFb = 0.2 + (value / 100) * 0.5;
        this.reverbFB1.gain.setTargetAtTime(revFb, now, 0.02);
        this.reverbFB2.gain.setTargetAtTime(revFb * 0.85, now, 0.02);
        this.params.modify = value;
        break;
      }
      case 'mode': {
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['tape', 'slip', 'stretch'];
          this.mode = modes[Math.max(0, Math.min(2, Math.floor(value)))] || 'tape';
        }
        // Apply mode-specific character
        if (this.mode === 'tape') {
          this.modLFO.frequency.setTargetAtTime(0.8, now, 0.05);
          this.reverbMixer.gain.setTargetAtTime(0.3, now, 0.02);
        } else if (this.mode === 'slip') {
          this.modLFO.frequency.setTargetAtTime(0.4, now, 0.05);
          this.reverbMixer.gain.setTargetAtTime(0.4, now, 0.02);
        } else if (this.mode === 'stretch') {
          this.modLFO.frequency.setTargetAtTime(0.15, now, 0.05);
          this.reverbMixer.gain.setTargetAtTime(0.55, now, 0.02);
        }
        // Update playback rate on active source
        if (this.loopSource) {
          const rate = this.mode === 'slip' ? 0.5 : this.mode === 'stretch' ? 0.25 : 1.0;
          this.loopSource.playbackRate.setTargetAtTime(rate, now, 0.05);
        }
        this.params.mode = this.mode;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    this._isRecording = false;
    if (this._loopInterval) clearInterval(this._loopInterval);
    if (this.loopSource) {
      try { this.loopSource.stop(); this.loopSource.disconnect(); } catch (e) {}
    }
    try { this.modLFO.stop(); } catch (e) {}
    try { this.modLFO.disconnect(); } catch (e) {}
    try { this.modLFODepth.disconnect(); } catch (e) {}
    try { this.modDelay.disconnect(); } catch (e) {}
    try { this.tapeSat.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.loopGain.disconnect(); } catch (e) {}
    try { this.throughGain.disconnect(); } catch (e) {}
    try { this.reverbDelay1.disconnect(); } catch (e) {}
    try { this.reverbDelay2.disconnect(); } catch (e) {}
    try { this.reverbFB1.disconnect(); } catch (e) {}
    try { this.reverbFB2.disconnect(); } catch (e) {}
    try { this.reverbMixer.disconnect(); } catch (e) {}
    try { this.masterMixer.disconnect(); } catch (e) {}
    try { this._scriptProcessor.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default ChaseBlissMoodEffect;
