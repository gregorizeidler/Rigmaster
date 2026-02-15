/**
 * AudioConfig - Centralized audio configuration
 * 
 * All audio-related constants and defaults in one place.
 * Import this instead of hardcoding values throughout the codebase.
 */

const AudioConfig = {
  // ============================================
  // SAMPLE RATE & BIT DEPTH
  // ============================================
  sampleRate: 48000,            // Professional standard (48kHz)
  inputBitDepth: 24,            // Input capture depth (ideal)
  exportBitDepth: 24,           // WAV export depth (was 16, now 24)
  internalBitDepth: 32,         // Web Audio API internal (32-bit float)

  // ============================================
  // LATENCY
  // ============================================
  latencyHint: 'interactive',   // 'interactive' for live, 'playback' for mixing
  
  // ============================================
  // WAVESHAPER DEFAULTS
  // ============================================
  curveResolution: 65536,       // Samples per waveshaper curve (was 44100)
  defaultOversample: '4x',     // '2x' or '4x' for all waveshapers
  
  // ============================================
  // ANTI-ALIASING DEFAULTS
  // ============================================
  antiAlias: {
    frequency: 18000,           // Pre-clip lowpass cutoff (Hz)
    Q: 0.707,                   // Butterworth Q
  },
  
  // ============================================
  // DC BLOCKER DEFAULTS
  // ============================================
  dcBlocker: {
    frequency: 10,              // Highpass cutoff (Hz)
    Q: 0.707,                   // Butterworth Q
  },
  
  // ============================================
  // SMOOTHING TIME CONSTANTS (seconds)
  // ============================================
  smoothing: {
    gain: 0.03,                 // Volume/gain changes (30ms)
    eq: 0.015,                  // EQ parameter changes (15ms)
    bypass: 0.02,               // Bypass crossfade (20ms)
    fast: 0.005,                // Fast transitions (5ms)
  },
  
  // ============================================
  // INPUT CONSTRAINTS
  // ============================================
  inputConstraints: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: 0,
  },
  
  // ============================================
  // RECORDING
  // ============================================
  recording: {
    timesliceMs: 0,             // 0 = no timeslice (cleanest recording)
    codecPriority: [
      { mimeType: 'audio/webm;codecs=pcm', audioBitsPerSecond: 4608000 },  // PCM 48kHz * 24bit * 2ch
      { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 510000 },   // Max opus
      { mimeType: 'audio/mp4', audioBitsPerSecond: 320000 },                // Safari fallback
      { audioBitsPerSecond: 320000 }                                         // Generic fallback
    ],
    exportFormat: 'wav',
    exportSampleRate: 48000,
    exportChannels: 2,
  },
  
  // ============================================
  // DITHERING (TPDF - Triangular Probability Density Function)
  // ============================================
  dithering: {
    enabled: true,
    type: 'tpdf',               // 'tpdf' (standard) or 'none'
  },

  // ============================================
  // HELPER: Create anti-aliasing filter node
  // ============================================
  createAntiAlias(audioContext) {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.antiAlias.frequency;
    filter.Q.value = this.antiAlias.Q;
    return filter;
  },

  // ============================================
  // HELPER: Create DC blocker node
  // ============================================
  createDCBlocker(audioContext) {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = this.dcBlocker.frequency;
    filter.Q.value = this.dcBlocker.Q;
    return filter;
  },

  // ============================================
  // HELPER: Create properly configured waveshaper
  // ============================================
  createWaveShaper(audioContext, curveFunction) {
    const shaper = audioContext.createWaveShaper();
    shaper.oversample = this.defaultOversample;
    if (curveFunction) {
      shaper.curve = curveFunction(this.curveResolution);
    }
    return shaper;
  },
};

export default AudioConfig;
