import BaseEffect from './BaseEffect';

/**
 * Fractal Audio Axe-FX III - Ultra-Res Amp Modeler & Multi-FX Processor
 * 
 * The Axe-FX III is Fractal Audio's flagship unit, considered the gold standard
 * for studio amp modeling and effects processing. Features dual SHARC DSP
 * processors, 512 presets, and incredibly accurate amp/cab simulations.
 * 
 * Signal Chain: Input → Compressor → Drive → EQ (5-band) → Modulation → Delay → Reverb → Output
 * 
 * Parameters:
 *   drive (0-100)           - Preamp drive amount
 *   bass (0-100)            - Low frequency EQ
 *   mid (0-100)             - Mid frequency EQ
 *   treble (0-100)          - High frequency EQ
 *   presence (0-100)        - Presence (upper mids/highs)
 *   depth (0-100)           - Depth (sub-bass resonance)
 *   delay_time (0-100)      - Delay time (0.01-2.5s)
 *   delay_feedback (0-100)  - Delay feedback amount
 *   reverb_decay (0-100)    - Reverb tail length
 *   reverb_mix (0-100)      - Reverb wet/dry balance
 */
class FractalAxeFXEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fractal Axe-FX III', 'fractalaxefx');

    // ============================================
    // STAGE 1: INPUT CONDITIONING & COMPRESSOR
    // ============================================
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;

    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.12;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.3;

    // Input noise gate (subtle)
    this.gateHP = audioContext.createBiquadFilter();
    this.gateHP.type = 'highpass';
    this.gateHP.frequency.value = 30;
    this.gateHP.Q.value = 0.707;

    // ============================================
    // STAGE 2: AMP DRIVE (Fractal's Quantum modeling)
    // ============================================
    this.drivePreGain = audioContext.createGain();
    this.drivePreGain.gain.value = 2.0;

    // Tight control (removes sub-bass mud before clipping)
    this.driveTightHP = audioContext.createBiquadFilter();
    this.driveTightHP.type = 'highpass';
    this.driveTightHP.frequency.value = 90;
    this.driveTightHP.Q.value = 0.5;

    // Primary saturation (tube preamp model)
    this.driveStage1 = audioContext.createWaveShaper();
    this.driveStage1.oversample = '4x';
    this.driveStage1.curve = this._makeQuantumCurve(2.0);

    // Interstage coupling filter
    this.interstageLP = audioContext.createBiquadFilter();
    this.interstageLP.type = 'lowpass';
    this.interstageLP.frequency.value = 7000;
    this.interstageLP.Q.value = 0.5;

    this.interstageHP = audioContext.createBiquadFilter();
    this.interstageHP.type = 'highpass';
    this.interstageHP.frequency.value = 60;
    this.interstageHP.Q.value = 0.5;

    // Secondary saturation (power amp harmonics)
    this.driveStage2 = audioContext.createWaveShaper();
    this.driveStage2.oversample = '4x';
    this.driveStage2.curve = this._makeSoftClipCurve(1.5);

    this.drivePostGain = audioContext.createGain();
    this.drivePostGain.gain.value = 0.75;

    // ============================================
    // STAGE 3: 5-BAND EQ (parametric studio EQ)
    // ============================================
    this.eqDepth = audioContext.createBiquadFilter();
    this.eqDepth.type = 'lowshelf';
    this.eqDepth.frequency.value = 60;
    this.eqDepth.gain.value = 0;

    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 150;
    this.eqBass.gain.value = 0;

    this.eqMid = audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 800;
    this.eqMid.Q.value = 1.2;
    this.eqMid.gain.value = 0;

    this.eqTreble = audioContext.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 3200;
    this.eqTreble.gain.value = 0;

    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5500;
    this.eqPresence.Q.value = 1.0;
    this.eqPresence.gain.value = 0;

    // ============================================
    // STAGE 4: MODULATION (multi-voice chorus)
    // ============================================
    this.modLFO1 = audioContext.createOscillator();
    this.modLFO1.type = 'sine';
    this.modLFO1.frequency.value = 0.7;

    this.modLFO2 = audioContext.createOscillator();
    this.modLFO2.type = 'triangle';
    this.modLFO2.frequency.value = 1.1;

    this.modDepth1 = audioContext.createGain();
    this.modDepth1.gain.value = 0;

    this.modDepth2 = audioContext.createGain();
    this.modDepth2.gain.value = 0;

    this.modDelayL = audioContext.createDelay(0.05);
    this.modDelayL.delayTime.value = 0.006;

    this.modDelayR = audioContext.createDelay(0.05);
    this.modDelayR.delayTime.value = 0.008;

    this.modLFO1.connect(this.modDepth1);
    this.modDepth1.connect(this.modDelayL.delayTime);
    this.modLFO2.connect(this.modDepth2);
    this.modDepth2.connect(this.modDelayR.delayTime);

    this.modLFO1.start();
    this.modLFO2.start();

    this.modMix = audioContext.createGain();
    this.modMix.gain.value = 1.0;

    // ============================================
    // STAGE 5: DELAY (dual-tap stereo)
    // ============================================
    this.delayL = audioContext.createDelay(5.0);
    this.delayL.delayTime.value = 0.5;

    this.delayR = audioContext.createDelay(5.0);
    this.delayR.delayTime.value = 0.375;

    this.delayFeedbackL = audioContext.createGain();
    this.delayFeedbackL.gain.value = 0.3;

    this.delayFeedbackR = audioContext.createGain();
    this.delayFeedbackR.gain.value = 0.3;

    this.delayDampLP = audioContext.createBiquadFilter();
    this.delayDampLP.type = 'lowpass';
    this.delayDampLP.frequency.value = 5000;
    this.delayDampLP.Q.value = 0.5;

    this.delayDampHP = audioContext.createBiquadFilter();
    this.delayDampHP.type = 'highpass';
    this.delayDampHP.frequency.value = 80;
    this.delayDampHP.Q.value = 0.5;

    this.delayMixWet = audioContext.createGain();
    this.delayMixWet.gain.value = 0;

    this.delayMixDry = audioContext.createGain();
    this.delayMixDry.gain.value = 1.0;

    // Delay feedback loop
    this.delayL.connect(this.delayDampLP);
    this.delayDampLP.connect(this.delayDampHP);
    this.delayDampHP.connect(this.delayFeedbackL);
    this.delayFeedbackL.connect(this.delayL);

    this.delayR.connect(this.delayFeedbackR);
    this.delayFeedbackR.connect(this.delayR);

    // ============================================
    // STAGE 6: REVERB (studio plate + hall hybrid)
    // ============================================
    this.reverbPreDelay = audioContext.createDelay(0.2);
    this.reverbPreDelay.delayTime.value = 0.025;

    this.reverbCombs = [];
    const combDelays = [0.0297, 0.0341, 0.0397, 0.0421, 0.0467, 0.0507, 0.0553, 0.0587, 0.0631, 0.0673];
    for (let i = 0; i < 10; i++) {
      const delay = audioContext.createDelay(0.2);
      delay.delayTime.value = combDelays[i];
      const fb = audioContext.createGain();
      fb.gain.value = 0.82;
      const damp = audioContext.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 5500 - (i * 250);
      damp.Q.value = 0.5;
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      this.reverbCombs.push({ delay, fb, damp });
    }

    this.reverbAllpasses = [];
    const apDelays = [0.005, 0.007, 0.01, 0.014, 0.019];
    for (let i = 0; i < 5; i++) {
      const delay = audioContext.createDelay(0.05);
      delay.delayTime.value = apDelays[i];
      const fb = audioContext.createGain();
      fb.gain.value = 0.55;
      this.reverbAllpasses.push({ delay, fb });
    }

    this.reverbSum = audioContext.createGain();
    this.reverbSum.gain.value = 0.2;

    this.reverbLP = audioContext.createBiquadFilter();
    this.reverbLP.type = 'lowpass';
    this.reverbLP.frequency.value = 7000;
    this.reverbLP.Q.value = 0.5;

    this.reverbMixWet = audioContext.createGain();
    this.reverbMixWet.gain.value = 0;

    this.reverbMixDry = audioContext.createGain();
    this.reverbMixDry.gain.value = 1.0;

    // ============================================
    // OUTPUT STAGE
    // ============================================
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.8;

    this.outputLimiter = audioContext.createDynamicsCompressor();
    this.outputLimiter.threshold.value = -2;
    this.outputLimiter.knee.value = 3;
    this.outputLimiter.ratio.value = 20;
    this.outputLimiter.attack.value = 0.001;
    this.outputLimiter.release.value = 0.05;

    // ============================================
    // ROUTING
    // ============================================
    this._setupRouting();
  }

  _makeQuantumCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * amount);
      // Fractal's "Quantum" modeling adds subtle odd harmonics
      y += 0.03 * Math.tanh(x * amount * 5);
      y += 0.015 * Math.tanh(x * amount * 9);
      if (x > 0) y *= 1.04; // Subtle asymmetry
      curve[i] = y * 0.92;
    }
    return curve;
  }

  _makeSoftClipCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const abs = Math.abs(x * amount);
      let y;
      if (abs < 0.5) {
        y = x * amount;
      } else if (abs < 1.0) {
        y = Math.sign(x) * (3 - (2 - 3 * abs) * (2 - 3 * abs)) / 3;
      } else {
        y = Math.sign(x);
      }
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    // Input → Gate HP → Compressor → Drive chain
    this.input.connect(this.gateHP);
    this.gateHP.connect(this.compressor);
    this.compressor.connect(this.compMakeup);

    this.compMakeup.connect(this.drivePreGain);
    this.drivePreGain.connect(this.driveTightHP);
    this.driveTightHP.connect(this.driveStage1);
    this.driveStage1.connect(this.interstageLP);
    this.interstageLP.connect(this.interstageHP);
    this.interstageHP.connect(this.driveStage2);
    this.driveStage2.connect(this.drivePostGain);

    // Drive → EQ
    this.drivePostGain.connect(this.eqDepth);
    this.eqDepth.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.eqPresence);

    // EQ → Mod → Delay → Reverb → Output
    this.eqPresence.connect(this.modMix);

    // Mod section (parallel)
    this.modMix.connect(this.delayMixDry);
    this.modMix.connect(this.delayL);
    this.modMix.connect(this.delayR);

    this.delayL.connect(this.delayMixWet);
    this.delayR.connect(this.delayMixWet);

    const delaySumNode = this.audioContext.createGain();
    delaySumNode.gain.value = 1.0;
    this._delaySumNode = delaySumNode;
    this.delayMixDry.connect(delaySumNode);
    this.delayMixWet.connect(delaySumNode);

    // Delay → Reverb
    delaySumNode.connect(this.reverbMixDry);
    delaySumNode.connect(this.reverbPreDelay);

    for (let i = 0; i < 10; i++) {
      this.reverbPreDelay.connect(this.reverbCombs[i].delay);
      this.reverbCombs[i].delay.connect(this.reverbSum);
    }

    this.reverbSum.connect(this.reverbLP);
    this.reverbLP.connect(this.reverbMixWet);

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

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'drive': {
        const amount = 1.0 + (value / 100) * 12.0;
        this.drivePreGain.gain.setTargetAtTime(0.5 + (value / 100) * 4.0, now, 0.02);
        this.driveStage1.curve = this._makeQuantumCurve(amount);
        this.driveStage2.curve = this._makeSoftClipCurve(amount * 0.6);
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
      case 'presence':
        this.eqPresence.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'depth':
        this.eqDepth.gain.setTargetAtTime((value - 50) / 5, now, 0.02);
        break;
      case 'delay_time': {
        const time = 0.01 + (value / 100) * 2.49;
        this.delayL.delayTime.setTargetAtTime(time, now, 0.03);
        this.delayR.delayTime.setTargetAtTime(time * 0.75, now, 0.03);
        break;
      }
      case 'delay_feedback': {
        const fb = (value / 100) * 0.85;
        this.delayFeedbackL.gain.setTargetAtTime(fb, now, 0.02);
        this.delayFeedbackR.gain.setTargetAtTime(fb * 0.9, now, 0.02);
        const wet = Math.min(1.0, value / 80);
        this.delayMixWet.gain.setTargetAtTime(wet * 0.5, now, 0.02);
        break;
      }
      case 'reverb_decay': {
        const decay = 0.6 + (value / 100) * 0.38;
        for (let i = 0; i < 10; i++) {
          this.reverbCombs[i].fb.gain.setTargetAtTime(decay, now, 0.03);
        }
        break;
      }
      case 'reverb_mix': {
        const wet = value / 100;
        this.reverbMixWet.gain.setTargetAtTime(wet, now, 0.02);
        this.reverbMixDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.02);
        break;
      }
      default:
        super.updateParameter(param, value);
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.modLFO1.stop();
      this.modLFO2.stop();
    } catch (e) { /* already stopped */ }
    try {
      this.inputBuffer.disconnect();
      this.gateHP.disconnect();
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.drivePreGain.disconnect();
      this.driveTightHP.disconnect();
      this.driveStage1.disconnect();
      this.interstageLP.disconnect();
      this.interstageHP.disconnect();
      this.driveStage2.disconnect();
      this.drivePostGain.disconnect();
      this.eqDepth.disconnect();
      this.eqBass.disconnect();
      this.eqMid.disconnect();
      this.eqTreble.disconnect();
      this.eqPresence.disconnect();
      this.modLFO1.disconnect();
      this.modLFO2.disconnect();
      this.modDepth1.disconnect();
      this.modDepth2.disconnect();
      this.modDelayL.disconnect();
      this.modDelayR.disconnect();
      this.modMix.disconnect();
      this.delayL.disconnect();
      this.delayR.disconnect();
      this.delayFeedbackL.disconnect();
      this.delayFeedbackR.disconnect();
      this.delayDampLP.disconnect();
      this.delayDampHP.disconnect();
      this.delayMixWet.disconnect();
      this.delayMixDry.disconnect();
      if (this._delaySumNode) this._delaySumNode.disconnect();
      this.reverbPreDelay.disconnect();
      for (let i = 0; i < 10; i++) {
        this.reverbCombs[i].delay.disconnect();
        this.reverbCombs[i].fb.disconnect();
        this.reverbCombs[i].damp.disconnect();
      }
      this.reverbSum.disconnect();
      this.reverbLP.disconnect();
      this.reverbMixWet.disconnect();
      this.reverbMixDry.disconnect();
      if (this._reverbSumNode) this._reverbSumNode.disconnect();
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Fractal Axe-FX III:', e);
    }
  }
}

export default FractalAxeFXEffect;
