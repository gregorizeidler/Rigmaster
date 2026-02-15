import BaseEffect from './BaseEffect';

/**
 * Boss GT-1000 - Flagship Multi-Effects Processor
 * 
 * Boss's top-tier multi-effects pedal featuring AIRD (Augmented Impulse
 * Response Dynamics) technology for realistic amp and cabinet simulation.
 * Features 250+ effects, MIDI control, USB audio interface, and
 * dual-signal path routing. Used by professional guitarists worldwide.
 * 
 * Signal Chain: Input → Compressor → Drive → EQ (Bass/Mid/Treble)
 *              → Delay → Reverb → FX Level → Output
 * 
 * Parameters:
 *   drive (0-100)           - Distortion/overdrive amount
 *   bass (0-100)            - Low frequency EQ
 *   mid (0-100)             - Mid frequency EQ
 *   treble (0-100)          - High frequency EQ
 *   delay_time (0-100)      - Delay time (0.01-2.0s)
 *   delay_feedback (0-100)  - Delay feedback amount
 *   reverb_mix (0-100)      - Reverb wet/dry balance
 *   fx_level (0-100)        - Overall effects level
 *   comp_sustain (0-100)    - Compressor sustain amount
 */
class BossGT1000Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss GT-1000', 'bossgt1000');

    // ============================================
    // STAGE 1: COMPRESSOR (Boss MDP)
    // ============================================
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.2;

    // Compressor sidechain HP (preserves low-end dynamics)
    this.compHP = audioContext.createBiquadFilter();
    this.compHP.type = 'highpass';
    this.compHP.frequency.value = 30;
    this.compHP.Q.value = 0.707;

    // ============================================
    // STAGE 2: DRIVE (AIRD-modeled)
    // ============================================
    this.driveInputGain = audioContext.createGain();
    this.driveInputGain.gain.value = 1.5;

    // Tight control
    this.driveHP = audioContext.createBiquadFilter();
    this.driveHP.type = 'highpass';
    this.driveHP.frequency.value = 75;
    this.driveHP.Q.value = 0.5;

    // Main saturation (AIRD engine)
    this.driveStage1 = audioContext.createWaveShaper();
    this.driveStage1.oversample = '4x';
    this.driveStage1.curve = this._makeAIRDCurve(1.5);

    // Interstage filter
    this.driveInterLP = audioContext.createBiquadFilter();
    this.driveInterLP.type = 'lowpass';
    this.driveInterLP.frequency.value = 7000;
    this.driveInterLP.Q.value = 0.5;

    this.driveInterHP = audioContext.createBiquadFilter();
    this.driveInterHP.type = 'highpass';
    this.driveInterHP.frequency.value = 55;
    this.driveInterHP.Q.value = 0.5;

    // Secondary saturation
    this.driveStage2 = audioContext.createWaveShaper();
    this.driveStage2.oversample = '4x';
    this.driveStage2.curve = this._makeSoftClipCurve(1.2);

    this.driveOutputGain = audioContext.createGain();
    this.driveOutputGain.gain.value = 0.8;

    // Post-drive filter
    this.driveLP = audioContext.createBiquadFilter();
    this.driveLP.type = 'lowpass';
    this.driveLP.frequency.value = 6500;
    this.driveLP.Q.value = 0.707;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // ============================================
    // STAGE 3: TONE STACK (Boss 3-band EQ)
    // ============================================
    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 125;
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

    // Presence peak (Boss characteristic)
    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5000;
    this.eqPresence.Q.value = 1.5;
    this.eqPresence.gain.value = 1.0;

    // ============================================
    // STAGE 4: DELAY (Boss DD-style digital)
    // ============================================
    this.delayNode = audioContext.createDelay(5.0);
    this.delayNode.delayTime.value = 0.4;

    this.delayFeedback = audioContext.createGain();
    this.delayFeedback.gain.value = 0.35;

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

    // Feedback loop
    this.delayNode.connect(this.delayDampLP);
    this.delayDampLP.connect(this.delayDampHP);
    this.delayDampHP.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // ============================================
    // STAGE 5: REVERB (Boss plate-style)
    // ============================================
    this.reverbPreDelay = audioContext.createDelay(0.1);
    this.reverbPreDelay.delayTime.value = 0.015;

    this.reverbCombs = [];
    const combTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0467, 0.0507, 0.0553, 0.0587];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      delay.delayTime.value = combTimes[i];
      const fb = audioContext.createGain();
      fb.gain.value = 0.78;
      const damp = audioContext.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 5500 - (i * 300);
      damp.Q.value = 0.5;
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      this.reverbCombs.push({ delay, fb, damp });
    }

    this.reverbSum = audioContext.createGain();
    this.reverbSum.gain.value = 0.22;

    this.reverbLP = audioContext.createBiquadFilter();
    this.reverbLP.type = 'lowpass';
    this.reverbLP.frequency.value = 6000;
    this.reverbLP.Q.value = 0.5;

    this.reverbMixWet = audioContext.createGain();
    this.reverbMixWet.gain.value = 0;

    this.reverbMixDry = audioContext.createGain();
    this.reverbMixDry.gain.value = 1.0;

    // ============================================
    // FX LEVEL & OUTPUT
    // ============================================
    this.fxLevel = audioContext.createGain();
    this.fxLevel.gain.value = 1.0;

    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.85;

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

  _makeAIRDCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * amount);
      // AIRD adds subtle dynamic response
      y += 0.02 * Math.tanh(x * amount * 4);
      if (x > 0) y *= 1.03;
      // Soft compression at peaks
      if (Math.abs(y) > 0.85) {
        y = Math.sign(y) * (0.85 + (Math.abs(y) - 0.85) * 0.3);
      }
      curve[i] = y * 0.94;
    }
    return curve;
  }

  _makeSoftClipCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const input = x * amount;
      const absInput = Math.abs(input);
      let y;
      if (absInput < 0.5) {
        y = input;
      } else if (absInput < 1.0) {
        y = Math.sign(input) * (3 - (2 - 3 * absInput) * (2 - 3 * absInput)) / 3;
      } else {
        y = Math.sign(input);
      }
      curve[i] = y * 0.9;
    }
    return curve;
  }

  _setupRouting() {
    // Input → Compressor
    this.input.connect(this.compHP);
    this.compHP.connect(this.compressor);
    this.compressor.connect(this.compMakeup);

    // Compressor → Drive chain
    this.compMakeup.connect(this.driveInputGain);
    this.driveInputGain.connect(this.driveHP);
    this.driveHP.connect(this.driveStage1);
    this.driveStage1.connect(this.driveInterLP);
    this.driveInterLP.connect(this.driveInterHP);
    this.driveInterHP.connect(this.driveStage2);
    this.driveStage2.connect(this.driveOutputGain);
    this.driveOutputGain.connect(this.driveLP);
    this.driveLP.connect(this.dcBlocker);

    // Drive → EQ
    this.dcBlocker.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);
    this.eqTreble.connect(this.eqPresence);

    // EQ → Delay (wet/dry split)
    this.eqPresence.connect(this.delayMixDry);
    this.eqPresence.connect(this.delayNode);
    this.delayNode.connect(this.delayMixWet);

    const delaySumNode = this.audioContext.createGain();
    delaySumNode.gain.value = 1.0;
    this._delaySumNode = delaySumNode;
    this.delayMixDry.connect(delaySumNode);
    this.delayMixWet.connect(delaySumNode);

    // Delay → Reverb (wet/dry split)
    delaySumNode.connect(this.reverbMixDry);
    delaySumNode.connect(this.reverbPreDelay);

    for (let i = 0; i < 8; i++) {
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

    // Reverb → FX Level → Output
    reverbSumNode.connect(this.fxLevel);
    this.fxLevel.connect(this.outputGain);
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
        const amount = 1.0 + (value / 100) * 10.0;
        this.driveInputGain.gain.setTargetAtTime(0.5 + (value / 100) * 4.0, now, 0.02);
        this.driveStage1.curve = this._makeAIRDCurve(amount);
        this.driveStage2.curve = this._makeSoftClipCurve(amount * 0.6);
        const tightFreq = 60 + (value / 100) * 50;
        this.driveHP.frequency.setTargetAtTime(tightFreq, now, 0.02);
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
      case 'delay_feedback': {
        const fb = (value / 100) * 0.85;
        this.delayFeedback.gain.setTargetAtTime(fb, now, 0.02);
        const wet = Math.min(1.0, value / 80);
        this.delayMixWet.gain.setTargetAtTime(wet * 0.5, now, 0.02);
        break;
      }
      case 'reverb_mix': {
        const wet = value / 100;
        this.reverbMixWet.gain.setTargetAtTime(wet, now, 0.02);
        this.reverbMixDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.02);
        break;
      }
      case 'fx_level':
        this.fxLevel.gain.setTargetAtTime(value / 100, now, 0.02);
        break;
      case 'comp_sustain': {
        const thresh = -10 - (value / 100) * 30;
        this.compressor.threshold.value = thresh;
        const ratio = 2 + (value / 100) * 8;
        this.compressor.ratio.value = ratio;
        const makeup = 1.0 + (value / 100) * 1.0;
        this.compMakeup.gain.setTargetAtTime(makeup, now, 0.02);
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
      this.compHP.disconnect();
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.driveInputGain.disconnect();
      this.driveHP.disconnect();
      this.driveStage1.disconnect();
      this.driveInterLP.disconnect();
      this.driveInterHP.disconnect();
      this.driveStage2.disconnect();
      this.driveOutputGain.disconnect();
      this.driveLP.disconnect();
      this.dcBlocker.disconnect();
      this.eqBass.disconnect();
      this.eqMid.disconnect();
      this.eqTreble.disconnect();
      this.eqPresence.disconnect();
      this.delayNode.disconnect();
      this.delayFeedback.disconnect();
      this.delayDampLP.disconnect();
      this.delayDampHP.disconnect();
      this.delayMixWet.disconnect();
      this.delayMixDry.disconnect();
      if (this._delaySumNode) this._delaySumNode.disconnect();
      this.reverbPreDelay.disconnect();
      for (let i = 0; i < 8; i++) {
        this.reverbCombs[i].delay.disconnect();
        this.reverbCombs[i].fb.disconnect();
        this.reverbCombs[i].damp.disconnect();
      }
      this.reverbSum.disconnect();
      this.reverbLP.disconnect();
      this.reverbMixWet.disconnect();
      this.reverbMixDry.disconnect();
      if (this._reverbSumNode) this._reverbSumNode.disconnect();
      this.fxLevel.disconnect();
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Boss GT-1000:', e);
    }
  }
}

export default BossGT1000Effect;
