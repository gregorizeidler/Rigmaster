import BaseEffect from './BaseEffect';

/**
 * Line 6 Helix - Multi-FX Floor Processor
 * 
 * The Helix is Line 6's flagship multi-effects unit featuring HX Modeling
 * technology with amp simulation, drive, delay, reverb, and modulation
 * all in one unit. Known for its powerful DSP, intuitive interface, and
 * studio-quality sound. Used by professionals worldwide.
 * 
 * Signal Chain: Input → Compressor → Drive/Distortion → EQ (Bass/Mid/Treble)
 *              → Modulation → Delay → Reverb → Output
 * 
 * Channels: clean, crunch, lead, heavy
 * 
 * Parameters:
 *   drive (0-100)       - Gain/distortion amount
 *   bass (0-100)        - Low frequency EQ
 *   mid (0-100)         - Mid frequency EQ
 *   treble (0-100)      - High frequency EQ
 *   delay_time (0-100)  - Delay time (mapped to 0.01-2.0s)
 *   delay_mix (0-100)   - Delay wet/dry balance
 *   reverb_mix (0-100)  - Reverb wet/dry balance
 *   mod_rate (0-100)    - Modulation LFO rate
 *   mod_depth (0-100)   - Modulation depth
 *   channel (string)    - clean/crunch/lead/heavy
 */
class Line6HelixEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Line 6 Helix', 'line6helix');

    // ============================================
    // CHANNEL PRESETS (amp sim voicing per channel)
    // ============================================
    this.channels = {
      clean:  { driveGain: 1.2,  tanhMul: 1.1,  preGain: 0.8,  postGain: 0.9,  midFreq: 800,  midQ: 1.0,  compThresh: -12 },
      crunch: { driveGain: 4.0,  tanhMul: 3.0,  preGain: 1.2,  postGain: 0.85, midFreq: 900,  midQ: 1.5,  compThresh: -18 },
      lead:   { driveGain: 10.0, tanhMul: 6.0,  preGain: 1.6,  postGain: 0.7,  midFreq: 1000, midQ: 2.0,  compThresh: -22 },
      heavy:  { driveGain: 20.0, tanhMul: 10.0, preGain: 2.0,  postGain: 0.55, midFreq: 750,  midQ: 2.5,  compThresh: -28 }
    };
    this.currentChannel = 'clean';

    // ============================================
    // STAGE 1: INPUT COMPRESSOR (studio-grade)
    // ============================================
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.2;

    // ============================================
    // STAGE 2: DRIVE / DISTORTION (HX Modeling)
    // ============================================
    this.driveInputGain = audioContext.createGain();
    this.driveInputGain.gain.value = 1.2;

    // Pre-filter: tighten bass before clipping
    this.driveTightness = audioContext.createBiquadFilter();
    this.driveTightness.type = 'highpass';
    this.driveTightness.frequency.value = 80;
    this.driveTightness.Q.value = 0.707;

    // Main saturation stage
    this.driveWaveshaper = audioContext.createWaveShaper();
    this.driveWaveshaper.oversample = '4x';
    this.driveWaveshaper.curve = this._makeDriveCurve(1.1);

    // Second harmonic enhancer (asymmetric stage)
    this.driveWaveshaper2 = audioContext.createWaveShaper();
    this.driveWaveshaper2.oversample = '4x';
    this.driveWaveshaper2.curve = this._makeAsymmetricCurve(1.0);

    // Post-drive tone shaping
    this.driveOutputGain = audioContext.createGain();
    this.driveOutputGain.gain.value = 0.9;

    this.driveLPF = audioContext.createBiquadFilter();
    this.driveLPF.type = 'lowpass';
    this.driveLPF.frequency.value = 6000;
    this.driveLPF.Q.value = 0.707;

    // ============================================
    // STAGE 3: TONE STACK (EQ)
    // ============================================
    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 120;
    this.eqBass.gain.value = 0;

    this.eqMid = audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 800;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = 0;

    this.eqTreble = audioContext.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 3000;
    this.eqTreble.gain.value = 0;

    // Presence peak (Helix characteristic sparkle)
    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5000;
    this.eqPresence.Q.value = 1.5;
    this.eqPresence.gain.value = 1.5;

    // ============================================
    // STAGE 4: MODULATION (chorus-based)
    // ============================================
    this.modLFO = audioContext.createOscillator();
    this.modLFO.type = 'sine';
    this.modLFO.frequency.value = 1.0;

    this.modDepthGain = audioContext.createGain();
    this.modDepthGain.gain.value = 0;

    this.modDelay = audioContext.createDelay(0.05);
    this.modDelay.delayTime.value = 0.007;

    this.modLFO.connect(this.modDepthGain);
    this.modDepthGain.connect(this.modDelay.delayTime);
    this.modLFO.start();

    this.modMixWet = audioContext.createGain();
    this.modMixWet.gain.value = 0;

    this.modMixDry = audioContext.createGain();
    this.modMixDry.gain.value = 1.0;

    // ============================================
    // STAGE 5: DELAY (digital/analog hybrid)
    // ============================================
    this.delayNode = audioContext.createDelay(5.0);
    this.delayNode.delayTime.value = 0.4;

    this.delayFeedback = audioContext.createGain();
    this.delayFeedback.gain.value = 0.35;

    this.delayFilter = audioContext.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 4000;
    this.delayFilter.Q.value = 0.707;

    this.delayDamping = audioContext.createBiquadFilter();
    this.delayDamping.type = 'highpass';
    this.delayDamping.frequency.value = 100;
    this.delayDamping.Q.value = 0.707;

    this.delayMixWet = audioContext.createGain();
    this.delayMixWet.gain.value = 0;

    this.delayMixDry = audioContext.createGain();
    this.delayMixDry.gain.value = 1.0;

    // Feedback loop: delay → filter → damping → feedback → delay
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayDamping);
    this.delayDamping.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // ============================================
    // STAGE 6: REVERB (plate-style algorithmic)
    // ============================================
    this.reverbPreDelay = audioContext.createDelay(0.1);
    this.reverbPreDelay.delayTime.value = 0.02;

    // Parallel comb filter network (8 lines)
    this.reverbCombs = [];
    const combTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0297 * 1.5, 0.0371 * 1.3, 0.0411 * 1.1, 0.0437 * 0.9];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      delay.delayTime.value = combTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.78;
      const damp = audioContext.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 5000 - (i * 300);
      damp.Q.value = 0.5;
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      this.reverbCombs.push({ delay, feedback, damp });
    }

    // Allpass diffusers (4 stages)
    this.reverbAllpasses = [];
    const apTimes = [0.005, 0.0068, 0.0098, 0.013];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(0.05);
      delay.delayTime.value = apTimes[i];
      const feedback = audioContext.createGain();
      feedback.gain.value = 0.6;
      this.reverbAllpasses.push({ delay, feedback });
    }

    this.reverbLPF = audioContext.createBiquadFilter();
    this.reverbLPF.type = 'lowpass';
    this.reverbLPF.frequency.value = 6000;
    this.reverbLPF.Q.value = 0.5;

    this.reverbMixWet = audioContext.createGain();
    this.reverbMixWet.gain.value = 0;

    this.reverbMixDry = audioContext.createGain();
    this.reverbMixDry.gain.value = 1.0;

    this.reverbSum = audioContext.createGain();
    this.reverbSum.gain.value = 0.25;

    // ============================================
    // OUTPUT STAGE
    // ============================================
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.85;

    // Output limiter (safety)
    this.outputLimiter = audioContext.createDynamicsCompressor();
    this.outputLimiter.threshold.value = -3;
    this.outputLimiter.knee.value = 3;
    this.outputLimiter.ratio.value = 20;
    this.outputLimiter.attack.value = 0.001;
    this.outputLimiter.release.value = 0.05;

    // ============================================
    // SIGNAL ROUTING
    // ============================================
    this._setupRouting();
  }

  // ============================================
  // WAVESHAPER CURVE GENERATORS
  // ============================================
  _makeDriveCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const k = amount;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * k);
    }
    return curve;
  }

  _makeAsymmetricCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * amount);
      // Add 2nd harmonic via asymmetry
      if (x > 0) y *= 1.05;
      else y *= 0.95;
      y += 0.02 * Math.tanh(x * amount * 3);
      curve[i] = y * 0.95;
    }
    return curve;
  }

  // ============================================
  // ROUTING
  // ============================================
  _setupRouting() {
    // Input → Compressor
    this.input.connect(this.compressor);
    this.compressor.connect(this.compMakeup);

    // Compressor → Drive chain
    this.compMakeup.connect(this.driveInputGain);
    this.driveInputGain.connect(this.driveTightness);
    this.driveTightness.connect(this.driveWaveshaper);
    this.driveWaveshaper.connect(this.driveWaveshaper2);
    this.driveWaveshaper2.connect(this.driveOutputGain);
    this.driveOutputGain.connect(this.driveLPF);

    // Drive → EQ
    this.driveLPF.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.eqPresence);

    // EQ → Modulation (wet/dry split)
    this.eqPresence.connect(this.modMixDry);
    this.eqPresence.connect(this.modDelay);
    this.modDelay.connect(this.modMixWet);

    // Modulation → Delay (wet/dry split)
    const modSumNode = this.audioContext.createGain();
    modSumNode.gain.value = 1.0;
    this._modSumNode = modSumNode;
    this.modMixDry.connect(modSumNode);
    this.modMixWet.connect(modSumNode);

    modSumNode.connect(this.delayMixDry);
    modSumNode.connect(this.delayNode);
    this.delayNode.connect(this.delayMixWet);

    // Delay → Reverb (wet/dry split)
    const delaySumNode = this.audioContext.createGain();
    delaySumNode.gain.value = 1.0;
    this._delaySumNode = delaySumNode;
    this.delayMixDry.connect(delaySumNode);
    this.delayMixWet.connect(delaySumNode);

    delaySumNode.connect(this.reverbMixDry);
    delaySumNode.connect(this.reverbPreDelay);

    // Reverb comb network
    for (let i = 0; i < 8; i++) {
      this.reverbPreDelay.connect(this.reverbCombs[i].delay);
      this.reverbCombs[i].delay.connect(this.reverbSum);
    }
    this.reverbSum.connect(this.reverbLPF);
    this.reverbLPF.connect(this.reverbMixWet);

    // Reverb sum → Output
    const reverbSumNode = this.audioContext.createGain();
    reverbSumNode.gain.value = 1.0;
    this._reverbSumNode = reverbSumNode;
    this.reverbMixDry.connect(reverbSumNode);
    this.reverbMixWet.connect(reverbSumNode);

    reverbSumNode.connect(this.outputGain);
    this.outputGain.connect(this.outputLimiter);
    this.outputLimiter.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
  }

  // ============================================
  // CHANNEL SWITCHING
  // ============================================
  _applyChannel(channelName) {
    const ch = this.channels[channelName];
    if (!ch) return;
    this.currentChannel = channelName;
    const now = this.audioContext.currentTime;

    this.driveInputGain.gain.setTargetAtTime(ch.preGain, now, 0.02);
    this.driveWaveshaper.curve = this._makeDriveCurve(ch.tanhMul);
    this.driveWaveshaper2.curve = this._makeAsymmetricCurve(ch.tanhMul * 0.7);
    this.driveOutputGain.gain.setTargetAtTime(ch.postGain, now, 0.02);
    this.compressor.threshold.value = ch.compThresh;
    this.eqMid.frequency.setTargetAtTime(ch.midFreq, now, 0.02);
    this.eqMid.Q.setTargetAtTime(ch.midQ, now, 0.02);

    // Tighten bass more for high-gain channels
    if (channelName === 'heavy') {
      this.driveTightness.frequency.setTargetAtTime(120, now, 0.02);
      this.driveLPF.frequency.setTargetAtTime(5000, now, 0.02);
    } else if (channelName === 'lead') {
      this.driveTightness.frequency.setTargetAtTime(100, now, 0.02);
      this.driveLPF.frequency.setTargetAtTime(5500, now, 0.02);
    } else {
      this.driveTightness.frequency.setTargetAtTime(80, now, 0.02);
      this.driveLPF.frequency.setTargetAtTime(6500, now, 0.02);
    }
  }

  // ============================================
  // PARAMETER UPDATES
  // ============================================
  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'drive': {
        const ch = this.channels[this.currentChannel];
        const scaledGain = ch.preGain * (0.5 + (value / 100) * 1.5);
        this.driveInputGain.gain.setTargetAtTime(scaledGain, now, 0.02);
        const scaledTanh = ch.tanhMul * (0.3 + (value / 100) * 1.4);
        this.driveWaveshaper.curve = this._makeDriveCurve(scaledTanh);
        this.driveWaveshaper2.curve = this._makeAsymmetricCurve(scaledTanh * 0.7);
        break;
      }

      case 'bass':
        this.eqBass.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;

      case 'mid':
        this.eqMid.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;

      case 'treble':
        this.eqTreble.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;

      case 'delay_time': {
        const time = 0.01 + (value / 100) * 1.99;
        this.delayNode.delayTime.setTargetAtTime(time, now, 0.03);
        break;
      }

      case 'delay_mix': {
        const wet = value / 100;
        this.delayMixWet.gain.setTargetAtTime(wet, now, 0.02);
        this.delayMixDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.02);
        break;
      }

      case 'reverb_mix': {
        const wet = value / 100;
        this.reverbMixWet.gain.setTargetAtTime(wet, now, 0.02);
        this.reverbMixDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.02);
        break;
      }

      case 'mod_rate': {
        const rate = 0.1 + (value / 100) * 9.9;
        this.modLFO.frequency.setTargetAtTime(rate, now, 0.02);
        break;
      }

      case 'mod_depth': {
        const depth = (value / 100) * 0.004;
        this.modDepthGain.gain.setTargetAtTime(depth, now, 0.02);
        const wetLevel = value / 100;
        this.modMixWet.gain.setTargetAtTime(wetLevel * 0.7, now, 0.02);
        this.modMixDry.gain.setTargetAtTime(1 - wetLevel * 0.3, now, 0.02);
        break;
      }

      case 'channel':
        this._applyChannel(value);
        break;

      default:
        super.updateParameter(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.modLFO.stop();
    } catch (e) { /* already stopped */ }
    try {
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.driveInputGain.disconnect();
      this.driveTightness.disconnect();
      this.driveWaveshaper.disconnect();
      this.driveWaveshaper2.disconnect();
      this.driveOutputGain.disconnect();
      this.driveLPF.disconnect();
      this.eqBass.disconnect();
      this.eqMid.disconnect();
      this.eqTreble.disconnect();
      this.eqPresence.disconnect();
      this.modLFO.disconnect();
      this.modDepthGain.disconnect();
      this.modDelay.disconnect();
      this.modMixWet.disconnect();
      this.modMixDry.disconnect();
      if (this._modSumNode) this._modSumNode.disconnect();
      this.delayNode.disconnect();
      this.delayFeedback.disconnect();
      this.delayFilter.disconnect();
      this.delayDamping.disconnect();
      this.delayMixWet.disconnect();
      this.delayMixDry.disconnect();
      if (this._delaySumNode) this._delaySumNode.disconnect();
      this.reverbPreDelay.disconnect();
      for (let i = 0; i < 8; i++) {
        this.reverbCombs[i].delay.disconnect();
        this.reverbCombs[i].feedback.disconnect();
        this.reverbCombs[i].damp.disconnect();
      }
      this.reverbSum.disconnect();
      this.reverbLPF.disconnect();
      this.reverbMixWet.disconnect();
      this.reverbMixDry.disconnect();
      if (this._reverbSumNode) this._reverbSumNode.disconnect();
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Line 6 Helix:', e);
    }
  }
}

export default Line6HelixEffect;
