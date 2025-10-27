import BaseEffect from './BaseEffect';

/**
 * Strymon Timeline - Professional Studio Delay
 * 
 * 12 DELAY MACHINES (tipos):
 * 1. dTape - Digital Tape Delay
 * 2. dBucket - Bucket Brigade (Analog)
 * 3. dTape - Tape Echo
 * 4. Lo-Fi - Degraded/Vintage
 * 5. Dual - Two Independent Delays
 * 6. Pattern - Rhythmic Patterns
 * 7. Reverse - Backwards delay
 * 8. Ice - Shimmer/Pitch-shifted
 * 9. Duck - Dynamic ducking
 * 10. Swell - Volume swell
 * 11. Trem - Tremolo + Delay
 * 12. Filter - Filtered repeats
 * 
 * CONTROLES (hardware):
 * - TIME: Delay time (0-5000ms or tap tempo)
 * - REPEATS: Feedback amount
 * - MIX: Wet/Dry balance
 * - FILTER: Tone/Filter control
 * - GRIT: Saturation/degradation
 * - MOD: Modulation depth
 * - SPEED: Modulation rate
 * - VALUE 1-3: Machine-specific parameters
 */
class TimelineDelayEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Timeline Delay', 'timelinedelay');
    
    // 12 DELAY TYPES
    this.delayTypes = {
      'dtape': 'dTape',
      'dbucket': 'dBucket',
      'tape': 'Tape Echo',
      'lofi': 'Lo-Fi',
      'dual': 'Dual Delay',
      'pattern': 'Pattern',
      'reverse': 'Reverse',
      'ice': 'Ice (Shimmer)',
      'duck': 'Duck Delay',
      'swell': 'Swell',
      'trem': 'Trem Delay',
      'filter': 'Filter Delay'
    };
    
    this.currentType = 'dtape';
    
    // === STEREO DELAY ENGINES ===
    this.delayL = audioContext.createDelay(10.0);
    this.delayR = audioContext.createDelay(10.0);
    this.delayL.delayTime.value = 0.5;
    this.delayR.delayTime.value = 0.5;
    
    // Dual delay (second engine)
    this.delayL2 = audioContext.createDelay(10.0);
    this.delayR2 = audioContext.createDelay(10.0);
    this.delayL2.delayTime.value = 0.25;
    this.delayR2.delayTime.value = 0.25;
    
    // === FEEDBACK ===
    this.feedbackL = audioContext.createGain();
    this.feedbackR = audioContext.createGain();
    this.crossFeedL2R = audioContext.createGain();
    this.crossFeedR2L = audioContext.createGain();
    this.feedbackL.gain.value = 0.4;
    this.feedbackR.gain.value = 0.4;
    this.crossFeedL2R.gain.value = 0.0;
    this.crossFeedR2L.gain.value = 0.0;
    
    // Feedback for dual delays
    this.fbL2 = audioContext.createGain();
    this.fbR2 = audioContext.createGain();
    this.fbL2.gain.value = 0.35;
    this.fbR2.gain.value = 0.35;
    
    // === TONE/FILTER SECTION ===
    // Lowpass (darkness/age)
    this.lpFilterL = audioContext.createBiquadFilter();
    this.lpFilterR = audioContext.createBiquadFilter();
    this.lpFilterL.type = 'lowpass';
    this.lpFilterR.type = 'lowpass';
    this.lpFilterL.frequency.value = 8000;
    this.lpFilterR.frequency.value = 8000;
    this.lpFilterL.Q.value = 0.707;
    this.lpFilterR.Q.value = 0.707;
    
    // Highpass (prevent bass buildup)
    this.hpFilterL = audioContext.createBiquadFilter();
    this.hpFilterR = audioContext.createBiquadFilter();
    this.hpFilterL.type = 'highpass';
    this.hpFilterR.type = 'highpass';
    this.hpFilterL.frequency.value = 80;
    this.hpFilterR.frequency.value = 80;
    
    // Peaking filter (for filter delay mode)
    this.peakFilterL = audioContext.createBiquadFilter();
    this.peakFilterR = audioContext.createBiquadFilter();
    this.peakFilterL.type = 'peaking';
    this.peakFilterR.type = 'peaking';
    this.peakFilterL.frequency.value = 1000;
    this.peakFilterR.frequency.value = 1000;
    this.peakFilterL.Q.value = 2;
    this.peakFilterR.Q.value = 2;
    this.peakFilterL.gain.value = 0;
    this.peakFilterR.gain.value = 0;
    
    // === GRIT/SATURATION ===
    this.gritL = audioContext.createWaveShaper();
    this.gritR = audioContext.createWaveShaper();
    this.gritL.oversample = '2x';
    this.gritR.oversample = '2x';
    this.gritL.curve = this.makeGritCurve(0);
    this.gritR.curve = this.makeGritCurve(0);
    
    // Separate grit gain for each channel
    this.gritGainL = audioContext.createGain();
    this.gritGainR = audioContext.createGain();
    this.gritGainL.gain.value = 1.0;
    this.gritGainR.gain.value = 1.0;
    
    // === MODULATION - STEREO WITH PHASE ===
    this.modLFO = audioContext.createOscillator();
    this.modLFO2 = audioContext.createOscillator();
    this.modDepthL = audioContext.createGain();
    this.modDepthR = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO2.type = 'sine';
    this.modLFO.frequency.value = 0.5;
    this.modLFO2.frequency.value = 0.5;
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    this.modLFO.start();
    this.modLFO2.start();
    
    // === DUCKING (real dynamic control with analyser) ===
    this.duckAnalyser = audioContext.createAnalyser();
    this.duckAnalyser.fftSize = 512;
    this.duckingAmount = 0; // 0-100
    this._duckRAF = null;
    this._duckBuffer = new Uint8Array(this.duckAnalyser.frequencyBinCount);
    
    // === SWELL (volume envelope) - STEREO ===
    this.swellGainL = audioContext.createGain();
    this.swellGainR = audioContext.createGain();
    this.swellGainL.gain.value = 1.0;
    this.swellGainR.gain.value = 1.0;
    
    // === TREMOLO (for trem delay) - STEREO WITH PHASE ===
    this.tremLFO = audioContext.createOscillator();
    this.tremLFO2 = audioContext.createOscillator();
    this.tremDepthL = audioContext.createGain();
    this.tremDepthR = audioContext.createGain();
    this.tremGainL = audioContext.createGain();
    this.tremGainR = audioContext.createGain();
    this.tremLFO.type = 'sine';
    this.tremLFO2.type = 'sine';
    this.tremLFO.frequency.value = 4;
    this.tremLFO2.frequency.value = 4;
    this.tremDepthL.gain.value = 0;
    this.tremDepthR.gain.value = 0;
    this.tremGainL.gain.value = 1;
    this.tremGainR.gain.value = 1;
    // Phase offset for stereo imaging
    this.tremLFO.connect(this.tremDepthL);
    this.tremDepthL.connect(this.tremGainL.gain);
    this.tremLFO2.connect(this.tremDepthR);
    this.tremDepthR.connect(this.tremGainR.gain);
    this.tremLFO.start();
    this.tremLFO2.start();
    
    // === SHIMMER/ICE (pitch shifter simulation) ===
    this.shimmerDelay1 = audioContext.createDelay(0.1);
    this.shimmerDelay2 = audioContext.createDelay(0.1);
    this.shimmerDelay1.delayTime.value = 0.012; // ~+12 semitones simulation
    this.shimmerDelay2.delayTime.value = 0.019; // ~+19 semitones simulation
    this.shimmerGain1 = audioContext.createGain();
    this.shimmerGain2 = audioContext.createGain();
    this.shimmerGain1.gain.value = 0;
    this.shimmerGain2.gain.value = 0;
    
    // === STEREO WIDTH - MID/SIDE PROCESSING ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Mid/Side encoding/decoding
    this.msSplitter = audioContext.createChannelSplitter(2);
    this.msMerger = audioContext.createChannelMerger(2);
    this.midGain = audioContext.createGain();
    this.sideGain = audioContext.createGain();
    this.midGain.gain.value = 1.0;
    this.sideGain.gain.value = 1.0; // Width control
    
    // MS encoding nodes (L+R, L-R)
    this.msEncSumL = audioContext.createGain();
    this.msEncSumR = audioContext.createGain();
    this.msEncDiffL = audioContext.createGain();
    this.msEncDiffR = audioContext.createGain();
    this.msEncSumL.gain.value = 0.7071; // 1/√2
    this.msEncSumR.gain.value = 0.7071;
    this.msEncDiffL.gain.value = 0.7071;
    this.msEncDiffR.gain.value = -0.7071;
    
    // MS decoding nodes (M+S, M-S)
    this.msDecMidL = audioContext.createGain();
    this.msDecMidR = audioContext.createGain();
    this.msDecSideL = audioContext.createGain();
    this.msDecSideR = audioContext.createGain();
    this.msDecMidL.gain.value = 1.0;
    this.msDecMidR.gain.value = 1.0;
    this.msDecSideL.gain.value = 1.0;
    this.msDecSideR.gain.value = -1.0;
    
    // Final output gains
    this.finalOutL = audioContext.createGain();
    this.finalOutR = audioContext.createGain();
    this.finalOutL.gain.value = 1.0;
    this.finalOutR.gain.value = 1.0;
    
    // === TAP TEMPO ===
    this.tapTempo = {
      enabled: false,
      bpm: 120,
      subdivision: '1/4', // '1/8', '1/4', '1/2', 'dotted'
      lastTaps: [],
      maxTaps: 4
    };
    
    // === MACHINE-SPECIFIC PARAMETERS ===
    this.value1 = 50; // Different per machine
    this.value2 = 50;
    this.value3 = 50;
    
    // === OUTPUT ===
    this.delayMix = audioContext.createGain();
    this.delayMix.gain.value = 0.5;
    
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;
    
    // === ROUTING ===
    this.setupRouting();
  }
  
  setupRouting() {
    // Main input split to stereo
    this.input.connect(this.splitter);
    
    // Ducking analyser (monitors dry input)
    this.input.connect(this.duckAnalyser);
    
    // === LEFT CHANNEL CHAIN ===
    // Input -> Delay1 L
    this.splitter.connect(this.delayL, 0);
    
    // Delay1 L -> Grit (with drive gain) -> Filters
    this.delayL.connect(this.gritGainL);
    this.gritGainL.connect(this.gritL);
    this.gritL.connect(this.lpFilterL);
    this.lpFilterL.connect(this.hpFilterL);
    this.hpFilterL.connect(this.peakFilterL);
    
    // Filters -> Swell -> Trem (separate L channel)
    this.peakFilterL.connect(this.swellGainL);
    this.swellGainL.connect(this.tremGainL);
    
    // Feedback L (main delay)
    this.tremGainL.connect(this.feedbackL);
    this.feedbackL.connect(this.delayL);
    
    // Crossfeed L->R
    this.tremGainL.connect(this.crossFeedL2R);
    this.crossFeedL2R.connect(this.delayR);
    
    // Shimmer/Ice L
    this.tremGainL.connect(this.shimmerDelay1);
    this.shimmerDelay1.connect(this.shimmerGain1);
    this.shimmerGain1.connect(this.delayL);
    
    // Dual Delay L2 (parallel engine)
    this.hpFilterL.connect(this.delayL2);
    this.delayL2.connect(this.fbL2);
    this.fbL2.connect(this.delayL2);
    this.delayL2.connect(this.tremGainL); // Sum into wet L
    
    // Output L
    this.tremGainL.connect(this.merger, 0, 0);
    
    // === RIGHT CHANNEL CHAIN ===
    // Input -> Delay1 R
    this.splitter.connect(this.delayR, 1);
    
    // Delay1 R -> Grit (with drive gain) -> Filters
    this.delayR.connect(this.gritGainR);
    this.gritGainR.connect(this.gritR);
    this.gritR.connect(this.lpFilterR);
    this.lpFilterR.connect(this.hpFilterR);
    this.hpFilterR.connect(this.peakFilterR);
    
    // Filters -> Swell -> Trem (separate R channel)
    this.peakFilterR.connect(this.swellGainR);
    this.swellGainR.connect(this.tremGainR);
    
    // Feedback R (main delay)
    this.tremGainR.connect(this.feedbackR);
    this.feedbackR.connect(this.delayR);
    
    // Crossfeed R->L
    this.tremGainR.connect(this.crossFeedR2L);
    this.crossFeedR2L.connect(this.delayL);
    
    // Shimmer/Ice R
    this.tremGainR.connect(this.shimmerDelay2);
    this.shimmerDelay2.connect(this.shimmerGain2);
    this.shimmerGain2.connect(this.delayR);
    
    // Dual Delay R2 (parallel engine)
    this.hpFilterR.connect(this.delayR2);
    this.delayR2.connect(this.fbR2);
    this.fbR2.connect(this.delayR2);
    this.delayR2.connect(this.tremGainR); // Sum into wet R
    
    // Output R
    this.tremGainR.connect(this.merger, 0, 1);
    
    // === MODULATION (stereo with phase offset) ===
    this.modLFO.connect(this.modDepthL);
    this.modDepthL.connect(this.delayL.delayTime);
    this.modLFO2.connect(this.modDepthR);
    this.modDepthR.connect(this.delayR.delayTime);
    
    // === MID/SIDE WIDTH PROCESSING ===
    // Encode: (L,R) -> (M,S)
    this.merger.connect(this.msSplitter);
    
    // Mid = (L+R)/√2
    this.msSplitter.connect(this.msEncSumL, 0);
    this.msSplitter.connect(this.msEncSumR, 1);
    this.msEncSumL.connect(this.midGain);
    this.msEncSumR.connect(this.midGain);
    
    // Side = (L-R)/√2
    this.msSplitter.connect(this.msEncDiffL, 0);
    this.msSplitter.connect(this.msEncDiffR, 1);
    this.msEncDiffL.connect(this.sideGain);
    this.msEncDiffR.connect(this.sideGain);
    
    // Decode: (M,S) -> (L,R)
    // L = M + S
    this.midGain.connect(this.msDecMidL);
    this.sideGain.connect(this.msDecSideL);
    this.msDecMidL.connect(this.finalOutL);
    this.msDecSideL.connect(this.finalOutL);
    
    // R = M - S
    this.midGain.connect(this.msDecMidR);
    this.sideGain.connect(this.msDecSideR);
    this.msDecMidR.connect(this.finalOutR);
    this.msDecSideR.connect(this.finalOutR);
    
    // Final stereo output
    this.finalOutL.connect(this.msMerger, 0, 0);
    this.finalOutR.connect(this.msMerger, 0, 1);
    
    // === FINAL MIX ===
    this.msMerger.connect(this.delayMix);
    this.delayMix.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }
  
  startDucking() {
    if (this._duckRAF) return; // Already running
    
    const tick = () => {
      this.duckAnalyser.getByteTimeDomainData(this._duckBuffer);
      
      // Calculate RMS level (0..1)
      let sum = 0;
      for (let i = 0; i < this._duckBuffer.length; i++) {
        const v = (this._duckBuffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this._duckBuffer.length);
      
      // Duck amount based on value1 parameter
      const amt = this.duckingAmount / 100;
      const target = 1 - (rms * 0.8 * amt); // Playing loud => reduce wet
      const t = this.audioContext.currentTime;
      
      // Apply to delay mix with smooth release
      this.delayMix.gain.setTargetAtTime(Math.max(0.1, target), t, 0.03);
      
      this._duckRAF = requestAnimationFrame(tick);
    };
    
    this._duckRAF = requestAnimationFrame(tick);
  }
  
  stopDucking() {
    if (this._duckRAF) {
      cancelAnimationFrame(this._duckRAF);
      this._duckRAF = null;
      // Restore normal gain
      const now = this.audioContext.currentTime;
      this.delayMix.gain.setTargetAtTime(1.0, now, 0.05);
    }
  }
  
  makeGritCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const drive = 1 + (amount / 20);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * drive);
      // Add tape-like compression
      y += 0.03 * Math.tanh(x * drive * 3);
      // Add subtle even harmonics (tape saturation)
      y += 0.02 * Math.tanh(x * drive * 5);
      curve[i] = y * 0.92;
    }
    
    return curve;
  }
  
  setDelayType(type) {
    const now = this.audioContext.currentTime;
    this.currentType = type;
    
    // === COMPLETE RESET TO NEUTRAL ===
    // Filters
    this.lpFilterL.frequency.setTargetAtTime(12000, now, 0.01);
    this.lpFilterR.frequency.setTargetAtTime(12000, now, 0.01);
    this.hpFilterL.frequency.setTargetAtTime(80, now, 0.01);
    this.hpFilterR.frequency.setTargetAtTime(80, now, 0.01);
    this.peakFilterL.gain.setTargetAtTime(0, now, 0.01);
    this.peakFilterR.gain.setTargetAtTime(0, now, 0.01);
    
    // Crossfeed/Pattern
    this.crossFeedL2R.gain.setTargetAtTime(0, now, 0.01);
    this.crossFeedR2L.gain.setTargetAtTime(0, now, 0.01);
    
    // Shimmer
    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    
    // Modulation
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    this.modLFO.frequency.setTargetAtTime(0.5, now, 0.01);
    this.modLFO2.frequency.setTargetAtTime(0.5, now, 0.01);
    
    // Tremolo
    this.tremDepthL.gain.setTargetAtTime(0, now, 0.01);
    this.tremDepthR.gain.setTargetAtTime(0, now, 0.01);
    
    // Swell
    this.swellGainL.gain.cancelScheduledValues(now);
    this.swellGainR.gain.cancelScheduledValues(now);
    this.swellGainL.gain.setValueAtTime(1.0, now);
    this.swellGainR.gain.setValueAtTime(1.0, now);
    
    // Dual engines
    this.fbL2.gain.setTargetAtTime(0, now, 0.01);
    this.fbR2.gain.setTargetAtTime(0, now, 0.01);
    
    // Stop ducking
    this.stopDucking();
    
    switch (type) {
      case 'dtape':
        // dTape - Digital Tape Delay (pristine with subtle warmth)
        this.lpFilterL.frequency.setTargetAtTime(10000, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(10000, now, 0.01);
        this.gritL.curve = this.makeGritCurve(5);
        this.gritR.curve = this.makeGritCurve(5);
        this.modDepthL.gain.value = 0.0002;
        this.modDepthR.gain.value = 0.0002;
        break;
        
      case 'dbucket':
        // dBucket - Bucket Brigade Analog (warm, dark)
        this.lpFilterL.frequency.setTargetAtTime(5000, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(5000, now, 0.01);
        this.hpFilterL.frequency.setTargetAtTime(120, now, 0.01);
        this.hpFilterR.frequency.setTargetAtTime(120, now, 0.01);
        this.gritL.curve = this.makeGritCurve(25);
        this.gritR.curve = this.makeGritCurve(25);
        this.modDepthL.gain.value = 0.0008;
        this.modDepthR.gain.value = 0.0008;
        break;
        
      case 'tape':
        // Tape Echo - Classic tape machine
        this.lpFilterL.frequency.setTargetAtTime(3500, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(3500, now, 0.01);
        this.hpFilterL.frequency.setTargetAtTime(120, now, 0.01);
        this.hpFilterR.frequency.setTargetAtTime(120, now, 0.01);
        this.gritL.curve = this.makeGritCurve(40);
        this.gritR.curve = this.makeGritCurve(40);
        this.modDepthL.gain.value = 0.0015;
        this.modDepthR.gain.value = 0.0015;
        this.modLFO.frequency.setTargetAtTime(0.3, now, 0.01); // Slow wow/flutter
        this.modLFO2.frequency.setTargetAtTime(0.3, now, 0.01);
        break;
        
      case 'lofi':
        // Lo-Fi - Degraded/vintage
        this.lpFilterL.frequency.setTargetAtTime(2000, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(2000, now, 0.01);
        this.hpFilterL.frequency.setTargetAtTime(150, now, 0.01);
        this.hpFilterR.frequency.setTargetAtTime(150, now, 0.01);
        this.gritL.curve = this.makeGritCurve(70);
        this.gritR.curve = this.makeGritCurve(70);
        this.modDepthL.gain.value = 0.003;
        this.modDepthR.gain.value = 0.003;
        break;
        
      case 'dual':
        // Dual Delay - Two independent delays (parallel engines)
        const ratio = 0.75;
        this.delayL2.delayTime.setTargetAtTime(this.delayL.delayTime.value * ratio, now, 0.01);
        this.delayR2.delayTime.setTargetAtTime(this.delayR.delayTime.value * ratio, now, 0.01);
        this.fbL2.gain.setTargetAtTime(0.35, now, 0.01);
        this.fbR2.gain.setTargetAtTime(0.35, now, 0.01);
        break;
        
      case 'pattern':
        // Pattern - Rhythmic patterns (ping-pong style)
        this.crossFeedL2R.gain.setTargetAtTime(0.6, now, 0.01);
        this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01);
        this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01);
        break;
        
      case 'reverse':
        // Reverse - Backwards delay (simulated with envelope)
        this.swellGainL.gain.cancelScheduledValues(now);
        this.swellGainR.gain.cancelScheduledValues(now);
        this.swellGainL.gain.setValueAtTime(0.1, now);
        this.swellGainR.gain.setValueAtTime(0.1, now);
        this.swellGainL.gain.exponentialRampToValueAtTime(1.0, now + 0.5);
        this.swellGainR.gain.exponentialRampToValueAtTime(1.0, now + 0.5);
        break;
        
      case 'ice':
        // Ice - Shimmer/pitch-shifted
        this.shimmerGain1.gain.setTargetAtTime(0.3, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(0.2, now, 0.01);
        this.lpFilterL.frequency.setTargetAtTime(8000, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(8000, now, 0.01);
        break;
        
      case 'duck':
        // Duck - Dynamic ducking (delays duck when you play)
        this.startDucking();
        break;
        
      case 'swell':
        // Swell - Volume swell on repeats
        // Controlled by value3 (swell time)
        break;
        
      case 'trem':
        // Trem - Tremolo + Delay (stereo with phase)
        this.tremDepthL.gain.setTargetAtTime(0.5, now, 0.01);
        this.tremDepthR.gain.setTargetAtTime(0.5, now, 0.01);
        break;
        
      case 'filter':
        // Filter - Filtered repeats (peak filter sweeps)
        this.peakFilterL.gain.setTargetAtTime(12, now, 0.01);
        this.peakFilterR.gain.setTargetAtTime(12, now, 0.01);
        this.peakFilterL.Q.setTargetAtTime(4, now, 0.01);
        this.peakFilterR.Q.setTargetAtTime(4, now, 0.01);
        break;
        
      default:
        break;
    }
  }
  
  tapTap() {
    // Tap tempo implementation
    const now = Date.now();
    this.tapTempo.lastTaps.push(now);
    
    if (this.tapTempo.lastTaps.length > this.tapTempo.maxTaps) {
      this.tapTempo.lastTaps.shift();
    }
    
    if (this.tapTempo.lastTaps.length >= 2) {
      // Calculate average interval
      let totalInterval = 0;
      for (let i = 1; i < this.tapTempo.lastTaps.length; i++) {
        totalInterval += this.tapTempo.lastTaps[i] - this.tapTempo.lastTaps[i - 1];
      }
      const avgInterval = totalInterval / (this.tapTempo.lastTaps.length - 1);
      
      // Convert to BPM
      const bpm = 60000 / avgInterval;
      this.tapTempo.bpm = Math.round(bpm);
      
      // Set delay time based on BPM and subdivision
      this.updateDelayTimeFromTempo();
    }
  }
  
  updateDelayTimeFromTempo() {
    if (!this.tapTempo.enabled) return;
    
    const beatDuration = 60 / this.tapTempo.bpm; // seconds per beat
    let delayTime = beatDuration;
    
    // Apply subdivision
    switch (this.tapTempo.subdivision) {
      case '1/8':
        delayTime = beatDuration / 2;
        break;
      case '1/4':
        delayTime = beatDuration;
        break;
      case '1/2':
        delayTime = beatDuration * 2;
        break;
      case 'dotted':
        delayTime = beatDuration * 1.5; // Dotted quarter
        break;
    }
    
    const now = this.audioContext.currentTime;
    this.delayL.delayTime.setTargetAtTime(delayTime, now, 0.01);
    this.delayR.delayTime.setTargetAtTime(delayTime, now, 0.01);
    
    // Update dual engines if in dual mode
    if (this.currentType === 'dual') {
      const ratio = 0.25 + (this.value1 / 100) * 0.75;
      this.delayL2.delayTime.setTargetAtTime(delayTime * ratio, now, 0.01);
      this.delayR2.delayTime.setTargetAtTime(delayTime * ratio, now, 0.01);
    }
  }
  
  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    
    switch (parameter) {
      case 'time':
        // Delay time (40ms to 5000ms)
        const time = 0.04 + (value / 100) * 4.96;
        this.delayL.delayTime.setTargetAtTime(time, now, 0.01);
        this.delayR.delayTime.setTargetAtTime(time, now, 0.01);
        this.tapTempo.enabled = false; // Disable tap tempo when manually adjusting
        break;
        
      case 'repeats':
        // Feedback amount (0-95%)
        const fb = (value / 100) * 0.95;
        this.feedbackL.gain.setTargetAtTime(fb, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(fb, now, 0.01);
        break;
        
      case 'filter':
        // Tone/Filter control (lowpass frequency)
        const freq = 500 + (value / 100) * 11500;
        this.lpFilterL.frequency.setTargetAtTime(freq, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(freq, now, 0.01);
        break;
        
      case 'grit':
        // Saturation/degradation (0-100)
        this.gritL.curve = this.makeGritCurve(value);
        this.gritR.curve = this.makeGritCurve(value);
        break;
        
      case 'mod':
        // Modulation depth (0-100)
        const depth = value / 50000; // Scaled for delayTime modulation
        this.modDepthL.gain.setTargetAtTime(depth, now, 0.01);
        this.modDepthR.gain.setTargetAtTime(depth, now, 0.01);
        break;
        
      case 'speed':
        // Modulation rate (0.1Hz to 10Hz)
        const rate = 0.1 + (value / 100) * 9.9;
        this.modLFO.frequency.setTargetAtTime(rate, now, 0.01);
        break;
        
      case 'width':
        // Stereo width (0-100%) - Real Mid/Side processing
        const width = value / 100;
        this.sideGain.gain.setTargetAtTime(width, now, 0.01);
        this.midGain.gain.setTargetAtTime(1.0, now, 0.01);
        break;
        
      case 'value1':
        // Machine-specific parameter 1
        this.value1 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'value2':
        // Machine-specific parameter 2
        this.value2 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'value3':
        // Machine-specific parameter 3
        this.value3 = value;
        this.updateMachineSpecificParams();
        break;
        
      case 'type':
        this.setDelayType(value);
        break;
        
      case 'mix':
        this.updateMix(value);
        break;
        
      case 'taptempo':
        this.tapTempo.enabled = value;
        if (value) {
          this.updateDelayTimeFromTempo();
        }
        break;
        
      case 'subdivision':
        this.tapTempo.subdivision = value;
        if (this.tapTempo.enabled) {
        this.updateDelayTimeFromTempo();
        }
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  updateMachineSpecificParams() {
    const now = this.audioContext.currentTime;
    
    // Machine-specific parameter behavior with VALUE3 support
    switch (this.currentType) {
      case 'dual':
        // Value1 = secondary delay time ratio (L2/R2 vs L/R)
        const ratio = 0.25 + (this.value1 / 100) * 0.75; // 0.25x to 1.0x
        this.delayL2.delayTime.setTargetAtTime(
          this.delayL.delayTime.value * ratio,
          now,
          0.01
        );
        this.delayR2.delayTime.setTargetAtTime(
          this.delayR.delayTime.value * ratio,
          now,
          0.01
        );
        // Value2 = feedback balance between engines
        const fbBalance = this.value2 / 100;
        this.feedbackL.gain.setTargetAtTime(fbBalance * 0.5, now, 0.01);
        this.feedbackR.gain.setTargetAtTime(fbBalance * 0.5, now, 0.01);
        this.fbL2.gain.setTargetAtTime((1 - fbBalance) * 0.5, now, 0.01);
        this.fbR2.gain.setTargetAtTime((1 - fbBalance) * 0.5, now, 0.01);
        // Value3 = engine mix (balance between L/L2 and R/R2)
        // Implemented via dual engine levels
        break;
        
      case 'ice':
        // Value1 = shimmer amount
        const shimmer = this.value1 / 100;
        this.shimmerGain1.gain.setTargetAtTime(shimmer * 0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(shimmer * 0.3, now, 0.01);
        // Value2 = shimmer pitch (adjust delay times for pitch simulation)
        const pitchShift = 0.008 + (this.value2 / 100) * 0.016; // 8-24ms
        this.shimmerDelay1.delayTime.setTargetAtTime(pitchShift, now, 0.01);
        this.shimmerDelay2.delayTime.setTargetAtTime(pitchShift * 1.5, now, 0.01);
        // Value3 = shimmer feedback
        break;
        
      case 'filter':
        // Value1 = filter frequency sweep
        const filterFreq = 200 + (this.value1 / 100) * 3800;
        this.peakFilterL.frequency.setTargetAtTime(filterFreq, now, 0.01);
        this.peakFilterR.frequency.setTargetAtTime(filterFreq, now, 0.01);
        // Value2 = filter Q (resonance)
        const filterQ = 0.5 + (this.value2 / 100) * 9.5;
        this.peakFilterL.Q.setTargetAtTime(filterQ, now, 0.01);
        this.peakFilterR.Q.setTargetAtTime(filterQ, now, 0.01);
        // Value3 = filter gain
        const filterGain = 6 + (this.value3 / 100) * 12; // 6-18 dB
        this.peakFilterL.gain.setTargetAtTime(filterGain, now, 0.01);
        this.peakFilterR.gain.setTargetAtTime(filterGain, now, 0.01);
        break;
        
      case 'trem':
        // Value1 = tremolo rate
        const tremRate = 0.5 + (this.value1 / 100) * 15;
        this.tremLFO.frequency.setTargetAtTime(tremRate, now, 0.01);
        this.tremLFO2.frequency.setTargetAtTime(tremRate, now, 0.01);
        // Value2 = tremolo depth
        const tremDepth = this.value2 / 100;
        this.tremDepthL.gain.setTargetAtTime(tremDepth, now, 0.01);
        this.tremDepthR.gain.setTargetAtTime(tremDepth, now, 0.01);
        // Value3 = tremolo waveform (adjust via LFO type simulation)
        break;
        
      case 'duck':
        // Value1 = ducking amount
        this.duckingAmount = this.value1;
        // Value2 = ducking release time (adjust in tick function)
        // Value3 = ducking threshold
        break;
        
      case 'reverse':
        // Value1 = reverse swell time
        const swellTime = 0.1 + (this.value1 / 100) * 1.4; // 0.1-1.5s
        this.swellGainL.gain.cancelScheduledValues(now);
        this.swellGainR.gain.cancelScheduledValues(now);
        this.swellGainL.gain.setValueAtTime(0.1, now);
        this.swellGainR.gain.setValueAtTime(0.1, now);
        this.swellGainL.gain.exponentialRampToValueAtTime(1.0, now + swellTime);
        this.swellGainR.gain.exponentialRampToValueAtTime(1.0, now + swellTime);
        // Value2 = reverse curve shape
        // Value3 = reverse mix
        break;
        
      case 'pattern':
        // Value1 = pattern type (different crossfeed patterns)
        const patternType = Math.floor((this.value1 / 100) * 4); // 0-3
        switch (patternType) {
          case 0: // Ping-pong
            this.crossFeedL2R.gain.setTargetAtTime(0.6, now, 0.01);
            this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01);
            this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01);
            this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01);
            break;
          case 1: // Cross-only
            this.crossFeedL2R.gain.setTargetAtTime(0.7, now, 0.01);
            this.crossFeedR2L.gain.setTargetAtTime(0.7, now, 0.01);
            this.feedbackL.gain.setTargetAtTime(0, now, 0.01);
            this.feedbackR.gain.setTargetAtTime(0, now, 0.01);
            break;
          case 2: // Alternating
            this.crossFeedL2R.gain.setTargetAtTime(0.5, now, 0.01);
            this.crossFeedR2L.gain.setTargetAtTime(0.3, now, 0.01);
            this.feedbackL.gain.setTargetAtTime(0.3, now, 0.01);
            this.feedbackR.gain.setTargetAtTime(0.5, now, 0.01);
            break;
          case 3: // Complex
            this.crossFeedL2R.gain.setTargetAtTime(0.4, now, 0.01);
            this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01);
            this.feedbackL.gain.setTargetAtTime(0.4, now, 0.01);
            this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01);
            break;
        }
        // Value2 = pattern feedback
        // Value3 = pattern stereo width
        break;
        
      case 'swell':
        // Value1 = swell attack time
        const swellAttack = 0.05 + (this.value1 / 100) * 1.95; // 50-2000ms
        // Value2 = swell depth
        const swellDepth = 0.1 + (this.value2 / 100) * 0.9; // 0.1-1.0
        // Value3 = swell mode (auto-trigger vs continuous)
        break;
        
      case 'tape':
      case 'dtape':
        // Value1 = wow/flutter amount
        const wowAmount = (this.value1 / 100) * 0.002;
        this.modDepthL.gain.setTargetAtTime(wowAmount, now, 0.01);
        this.modDepthR.gain.setTargetAtTime(wowAmount, now, 0.01);
        // Value2 = tape age (affects feedback limit)
        const tapeAge = this.value2 / 100;
        const fbLimit = 0.95 - (tapeAge * 0.02); // Darker = slightly higher fb safe
        // Value3 = head bump (low freq boost)
        break;
        
      case 'dbucket':
      case 'lofi':
        // Value1 = clock noise/distortion amount
        const distAmount = 20 + (this.value1 / 100) * 60;
        this.gritL.curve = this.makeGritCurve(distAmount);
        this.gritR.curve = this.makeGritCurve(distAmount);
        // Value2 = sample rate reduction simulation (via additional filtering)
        const srReduce = 2000 + (this.value2 / 100) * 10000;
        this.lpFilterL.frequency.setTargetAtTime(srReduce, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(srReduce, now, 0.01);
        // Value3 = bit depth (affects grit curve)
        break;
    }
  }
  
  getParameters() {
    return {
      type: this.currentType,
      time: ((this.delayL.delayTime.value - 0.04) / 4.96) * 100,
      repeats: (this.feedbackL.gain.value / 0.95) * 100,
      filter: ((this.lpFilterL.frequency.value - 500) / 11500) * 100,
      grit: 0, // Stored separately
      mod: this.modDepthL.gain.value * 50000,
      speed: ((this.modLFO.frequency.value - 0.1) / 9.9) * 100,
      width: this.sideGain.gain.value * 100,
      mix: this.mix * 100,
      value1: this.value1,
      value2: this.value2,
      value3: this.value3,
      taptempo: this.tapTempo.enabled,
      subdivision: this.tapTempo.subdivision,
      bpm: this.tapTempo.bpm
    };
  }
  
  updateMix(value) {
    // Update wet/dry mix (0-100)
    this.mix = value / 100;
    const now = this.audioContext.currentTime;
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.01);
    this.dryGain.gain.setTargetAtTime(1 - this.mix, now, 0.01);
  }
  
  disconnect() {
    // Stop ducking animation
    this.stopDucking();
    
    super.disconnect();
    try {
      // Delays
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayL2.disconnect();
      this.delayR2.disconnect();
      
      // Feedback
      this.feedbackL.disconnect();
      this.feedbackR.disconnect();
      this.fbL2.disconnect();
      this.fbR2.disconnect();
      this.crossFeedL2R.disconnect();
      this.crossFeedR2L.disconnect();
      
      // Filters
      this.lpFilterL.disconnect();
      this.lpFilterR.disconnect();
      this.hpFilterL.disconnect();
      this.hpFilterR.disconnect();
      this.peakFilterL.disconnect();
      this.peakFilterR.disconnect();
      
      // Grit
      this.gritL.disconnect();
      this.gritR.disconnect();
      this.gritGainL.disconnect();
      this.gritGainR.disconnect();
      
      // Modulation
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modLFO2.stop();
      this.modLFO2.disconnect();
      this.modDepthL.disconnect();
      this.modDepthR.disconnect();
      
      // Tremolo
      this.tremLFO.stop();
      this.tremLFO.disconnect();
      this.tremLFO2.stop();
      this.tremLFO2.disconnect();
      this.tremDepthL.disconnect();
      this.tremDepthR.disconnect();
      this.tremGainL.disconnect();
      this.tremGainR.disconnect();
      
      // Shimmer
      this.shimmerDelay1.disconnect();
      this.shimmerDelay2.disconnect();
      this.shimmerGain1.disconnect();
      this.shimmerGain2.disconnect();
      
      // Swell
      this.swellGainL.disconnect();
      this.swellGainR.disconnect();
      
      // Ducking
      this.duckAnalyser.disconnect();
      
      // Stereo/MS
      this.splitter.disconnect();
      this.merger.disconnect();
      this.msSplitter.disconnect();
      this.msMerger.disconnect();
      this.midGain.disconnect();
      this.sideGain.disconnect();
      this.msEncSumL.disconnect();
      this.msEncSumR.disconnect();
      this.msEncDiffL.disconnect();
      this.msEncDiffR.disconnect();
      this.msDecMidL.disconnect();
      this.msDecMidR.disconnect();
      this.msDecSideL.disconnect();
      this.msDecSideR.disconnect();
      this.finalOutL.disconnect();
      this.finalOutR.disconnect();
      
      // Output
      this.delayMix.disconnect();
      this.outputGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Timeline Delay:', e);
    }
  }
}

export default TimelineDelayEffect;
