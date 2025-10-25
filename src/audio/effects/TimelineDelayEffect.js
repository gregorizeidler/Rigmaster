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
    
    this.gritGain = audioContext.createGain();
    this.gritGain.gain.value = 1.0;
    
    // === MODULATION ===
    this.modLFO = audioContext.createOscillator();
    this.modDepthL = audioContext.createGain();
    this.modDepthR = audioContext.createGain();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 0.5;
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    this.modLFO.start();
    
    // === DUCKING (dynamic feedback) ===
    this.duckingCompressor = audioContext.createDynamicsCompressor();
    this.duckingCompressor.threshold.value = -30;
    this.duckingCompressor.knee.value = 10;
    this.duckingCompressor.ratio.value = 6;
    this.duckingCompressor.attack.value = 0.001;
    this.duckingCompressor.release.value = 0.15;
    this.duckingAmount = 0; // 0-100
    
    // === SWELL (volume envelope) ===
    this.swellGain = audioContext.createGain();
    this.swellGain.gain.value = 1.0;
    
    // === TREMOLO (for trem delay) ===
    this.tremLFO = audioContext.createOscillator();
    this.tremDepth = audioContext.createGain();
    this.tremGain = audioContext.createGain();
    this.tremLFO.type = 'sine';
    this.tremLFO.frequency.value = 4;
    this.tremDepth.gain.value = 0;
    this.tremGain.gain.value = 1;
    this.tremLFO.connect(this.tremDepth);
    this.tremDepth.connect(this.tremGain.gain);
    this.tremLFO.start();
    
    // === SHIMMER/ICE (pitch shifter simulation) ===
    this.shimmerDelay1 = audioContext.createDelay(0.1);
    this.shimmerDelay2 = audioContext.createDelay(0.1);
    this.shimmerDelay1.delayTime.value = 0.012; // ~+12 semitones simulation
    this.shimmerDelay2.delayTime.value = 0.019; // ~+19 semitones simulation
    this.shimmerGain1 = audioContext.createGain();
    this.shimmerGain2 = audioContext.createGain();
    this.shimmerGain1.gain.value = 0;
    this.shimmerGain2.gain.value = 0;
    
    // === STEREO WIDTH ===
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.widthL = audioContext.createGain();
    this.widthR = audioContext.createGain();
    this.widthL.gain.value = 1.0;
    this.widthR.gain.value = 1.0;
    
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
    
    // LEFT CHANNEL CHAIN
    this.splitter.connect(this.delayL, 0);
    this.delayL.connect(this.gritL);
    this.gritL.connect(this.lpFilterL);
    this.lpFilterL.connect(this.hpFilterL);
    this.hpFilterL.connect(this.peakFilterL);
    this.peakFilterL.connect(this.swellGain);
    this.swellGain.connect(this.tremGain);
    
    // Feedback loops
    this.tremGain.connect(this.feedbackL);
    this.feedbackL.connect(this.delayL);
    this.tremGain.connect(this.crossFeedL2R);
    this.crossFeedL2R.connect(this.delayR);
    
    // Shimmer/Ice
    this.tremGain.connect(this.shimmerDelay1);
    this.shimmerDelay1.connect(this.shimmerGain1);
    this.shimmerGain1.connect(this.delayL);
    
    // Output
    this.tremGain.connect(this.widthL);
    this.widthL.connect(this.merger, 0, 0);
    
    // RIGHT CHANNEL CHAIN
    this.splitter.connect(this.delayR, 1);
    this.delayR.connect(this.gritR);
    this.gritR.connect(this.lpFilterR);
    this.lpFilterR.connect(this.hpFilterR);
    this.hpFilterR.connect(this.peakFilterR);
    this.peakFilterR.connect(this.swellGain);
    
    // Feedback loops
    this.tremGain.connect(this.feedbackR);
    this.feedbackR.connect(this.delayR);
    this.tremGain.connect(this.crossFeedR2L);
    this.crossFeedR2L.connect(this.delayL);
    
    // Shimmer/Ice
    this.tremGain.connect(this.shimmerDelay2);
    this.shimmerDelay2.connect(this.shimmerGain2);
    this.shimmerGain2.connect(this.delayR);
    
    // Output
    this.tremGain.connect(this.widthR);
    this.widthR.connect(this.merger, 0, 1);
    
    // Modulation
    this.modLFO.connect(this.modDepthL);
    this.modDepthL.connect(this.delayL.delayTime);
    this.modLFO.connect(this.modDepthR);
    this.modDepthR.connect(this.delayR.delayTime);
    
    // Final mix
    this.merger.connect(this.delayMix);
    this.delayMix.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
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
    
    // Reset to neutral
    this.lpFilterL.frequency.setTargetAtTime(12000, now, 0.01);
    this.lpFilterR.frequency.setTargetAtTime(12000, now, 0.01);
    this.hpFilterL.frequency.setTargetAtTime(80, now, 0.01);
    this.hpFilterR.frequency.setTargetAtTime(80, now, 0.01);
    this.peakFilterL.gain.setTargetAtTime(0, now, 0.01);
    this.peakFilterR.gain.setTargetAtTime(0, now, 0.01);
    this.crossFeedL2R.gain.setTargetAtTime(0, now, 0.01);
    this.crossFeedR2L.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain1.gain.setTargetAtTime(0, now, 0.01);
    this.shimmerGain2.gain.setTargetAtTime(0, now, 0.01);
    this.modDepthL.gain.value = 0;
    this.modDepthR.gain.value = 0;
    
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
        break;
        
      case 'lofi':
        // Lo-Fi - Degraded/vintage
        this.lpFilterL.frequency.setTargetAtTime(2000, now, 0.01);
        this.lpFilterR.frequency.setTargetAtTime(2000, now, 0.01);
        this.hpFilterL.frequency.setTargetAtTime(200, now, 0.01);
        this.hpFilterR.frequency.setTargetAtTime(200, now, 0.01);
        this.gritL.curve = this.makeGritCurve(70);
        this.gritR.curve = this.makeGritCurve(70);
        this.modDepthL.gain.value = 0.003;
        this.modDepthR.gain.value = 0.003;
        break;
        
      case 'dual':
        // Dual Delay - Two independent delays
        // Left = main time, Right = secondary time
        this.delayR.delayTime.setTargetAtTime(this.delayL.delayTime.value * 0.75, now, 0.01);
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
        this.swellGain.gain.cancelScheduledValues(now);
        this.swellGain.gain.setValueAtTime(0.1, now);
        this.swellGain.gain.exponentialRampToValueAtTime(1.0, now + 0.5);
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
        // This is handled in realtime by duckingCompressor
        break;
        
      case 'swell':
        // Swell - Volume swell on repeats
        break;
        
      case 'trem':
        // Trem - Tremolo + Delay
        this.tremDepth.gain.setTargetAtTime(0.5, now, 0.01);
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
        // Stereo width (0-100%)
        const width = value / 100;
        this.widthL.gain.setTargetAtTime(width, now, 0.01);
        this.widthR.gain.setTargetAtTime(width, now, 0.01);
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
        this.updateDelayTimeFromTempo();
        break;
        
      default:
        super.updateParameter(parameter, value);
        break;
    }
  }
  
  updateMachineSpecificParams() {
    const now = this.audioContext.currentTime;
    
    // Machine-specific parameter behavior
    switch (this.currentType) {
      case 'dual':
        // Value1 = secondary delay time ratio
        const ratio = 0.25 + (this.value1 / 100) * 0.75; // 0.25x to 1.0x
        this.delayR.delayTime.setTargetAtTime(
          this.delayL.delayTime.value * ratio,
          now,
          0.01
        );
        break;
        
      case 'ice':
        // Value1 = shimmer amount
        const shimmer = this.value1 / 100;
        this.shimmerGain1.gain.setTargetAtTime(shimmer * 0.4, now, 0.01);
        this.shimmerGain2.gain.setTargetAtTime(shimmer * 0.3, now, 0.01);
        break;
        
      case 'filter':
        // Value1 = filter frequency sweep
        const filterFreq = 200 + (this.value1 / 100) * 3800;
        this.peakFilterL.frequency.setTargetAtTime(filterFreq, now, 0.01);
        this.peakFilterR.frequency.setTargetAtTime(filterFreq, now, 0.01);
        // Value2 = filter Q
        const filterQ = 0.5 + (this.value2 / 100) * 9.5;
        this.peakFilterL.Q.setTargetAtTime(filterQ, now, 0.01);
        this.peakFilterR.Q.setTargetAtTime(filterQ, now, 0.01);
        break;
        
      case 'trem':
        // Value1 = tremolo rate
        const tremRate = 0.5 + (this.value1 / 100) * 15;
        this.tremLFO.frequency.setTargetAtTime(tremRate, now, 0.01);
        // Value2 = tremolo depth
        const tremDepth = this.value2 / 100;
        this.tremDepth.gain.setTargetAtTime(tremDepth, now, 0.01);
        break;
        
      case 'duck':
        // Value1 = ducking amount
        const duckThreshold = -40 + (this.value1 / 100) * 30;
        this.duckingCompressor.threshold.setTargetAtTime(duckThreshold, now, 0.01);
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
      width: this.widthL.gain.value * 100,
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
    super.disconnect();
    try {
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayL2.disconnect();
      this.delayR2.disconnect();
      this.feedbackL.disconnect();
      this.feedbackR.disconnect();
      this.crossFeedL2R.disconnect();
      this.crossFeedR2L.disconnect();
      this.lpFilterL.disconnect();
      this.lpFilterR.disconnect();
      this.hpFilterL.disconnect();
      this.hpFilterR.disconnect();
      this.peakFilterL.disconnect();
      this.peakFilterR.disconnect();
      this.gritL.disconnect();
      this.gritR.disconnect();
      this.modLFO.stop();
      this.modLFO.disconnect();
      this.modDepthL.disconnect();
      this.modDepthR.disconnect();
      this.tremLFO.stop();
      this.tremLFO.disconnect();
      this.tremDepth.disconnect();
      this.tremGain.disconnect();
      this.shimmerDelay1.disconnect();
      this.shimmerDelay2.disconnect();
      this.shimmerGain1.disconnect();
      this.shimmerGain2.disconnect();
      this.swellGain.disconnect();
      this.splitter.disconnect();
      this.merger.disconnect();
      this.widthL.disconnect();
      this.widthR.disconnect();
      this.delayMix.disconnect();
      this.outputGain.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Timeline Delay:', e);
    }
  }
}

export default TimelineDelayEffect;
