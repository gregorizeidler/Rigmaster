import BaseEffect from './BaseEffect';

/**
 * Headrush Pedalboard - Multi-FX Processor
 * 
 * The Headrush Pedalboard features a 7-inch touchscreen, quad-core
 * processor, and Eleven HD modeling engine inherited from Avid/Digidesign.
 * Known for its intuitive drag-and-drop signal routing, high-quality
 * amp models, and built-in looper. Popular with gigging musicians.
 * 
 * Signal Chain: Input → Compressor → Drive → EQ (Bass/Mid/Treble)
 *              → Delay → Reverb → Output
 * 
 * Parameters:
 *   gain (0-100)          - Amp model gain
 *   bass (0-100)          - Low frequency EQ
 *   mid (0-100)           - Mid frequency EQ
 *   treble (0-100)        - High frequency EQ
 *   delay_time (0-100)    - Delay time (0.01-2.0s)
 *   delay_mix (0-100)     - Delay wet/dry balance
 *   reverb_decay (0-100)  - Reverb tail length
 *   reverb_mix (0-100)    - Reverb wet/dry balance
 */
class HeadrushPedalboardEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Headrush Pedalboard', 'headrushpedalboard');

    // ============================================
    // STAGE 1: COMPRESSOR (Eleven HD)
    // ============================================
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.16;

    this.compMakeup = audioContext.createGain();
    this.compMakeup.gain.value = 1.2;

    this.compHP = audioContext.createBiquadFilter();
    this.compHP.type = 'highpass';
    this.compHP.frequency.value = 30;
    this.compHP.Q.value = 0.707;

    // ============================================
    // STAGE 2: DRIVE (Eleven HD modeling)
    // ============================================
    this.driveInputGain = audioContext.createGain();
    this.driveInputGain.gain.value = 1.5;

    // Bass tightness filter
    this.driveHP = audioContext.createBiquadFilter();
    this.driveHP.type = 'highpass';
    this.driveHP.frequency.value = 70;
    this.driveHP.Q.value = 0.5;

    // Primary saturation
    this.driveStage1 = audioContext.createWaveShaper();
    this.driveStage1.oversample = '4x';
    this.driveStage1.curve = this._makeElevenCurve(1.5);

    // Interstage coupling
    this.interLP = audioContext.createBiquadFilter();
    this.interLP.type = 'lowpass';
    this.interLP.frequency.value = 7500;
    this.interLP.Q.value = 0.5;

    this.interHP = audioContext.createBiquadFilter();
    this.interHP.type = 'highpass';
    this.interHP.frequency.value = 50;
    this.interHP.Q.value = 0.5;

    // Secondary saturation
    this.driveStage2 = audioContext.createWaveShaper();
    this.driveStage2.oversample = '4x';
    this.driveStage2.curve = this._makeSoftSatCurve(1.2);

    // Power amp section
    this.driveStage3 = audioContext.createWaveShaper();
    this.driveStage3.oversample = '4x';
    this.driveStage3.curve = this._makePowerCurve(1.0);

    this.driveOutputGain = audioContext.createGain();
    this.driveOutputGain.gain.value = 0.75;

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
    // STAGE 3: TONE STACK (3-band EQ)
    // ============================================
    this.eqBass = audioContext.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 130;
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

    // Presence (Eleven HD voicing)
    this.eqPresence = audioContext.createBiquadFilter();
    this.eqPresence.type = 'peaking';
    this.eqPresence.frequency.value = 5000;
    this.eqPresence.Q.value = 1.2;
    this.eqPresence.gain.value = 1.0;

    // ============================================
    // STAGE 4: DELAY
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
    // STAGE 5: REVERB (Hall/Plate hybrid)
    // ============================================
    this.reverbPreDelay = audioContext.createDelay(0.1);
    this.reverbPreDelay.delayTime.value = 0.02;

    this.reverbCombs = [];
    const combTimes = [0.031, 0.037, 0.041, 0.044, 0.049, 0.053, 0.058, 0.062];
    for (let i = 0; i < 8; i++) {
      const delay = audioContext.createDelay(0.2);
      delay.delayTime.value = combTimes[i];
      const fb = audioContext.createGain();
      fb.gain.value = 0.8;
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
    // OUTPUT
    // ============================================
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

  _makeElevenCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * amount);
      // Eleven HD characteristic: warm even harmonics
      y += 0.025 * Math.sin(x * amount * Math.PI);
      y += 0.015 * Math.tanh(x * amount * 4);
      if (x > 0) y *= 1.03;
      curve[i] = y * 0.94;
    }
    return curve;
  }

  _makeSoftSatCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const input = x * amount;
      const abs = Math.abs(input);
      let y;
      if (abs < 0.5) y = input;
      else if (abs < 1.0) y = Math.sign(input) * (3 - (2 - 3 * abs) * (2 - 3 * abs)) / 3;
      else y = Math.sign(input);
      curve[i] = y * 0.92;
    }
    return curve;
  }

  _makePowerCurve(amount) {
    const samples = 65536;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      let y = Math.tanh(x * amount * 1.1);
      if (Math.abs(x) > 0.5) {
        const excess = Math.abs(x) - 0.5;
        y -= Math.sign(x) * excess * 0.06;
      }
      y += 0.012 * x * (1 - x * x);
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
    this.driveStage1.connect(this.interLP);
    this.interLP.connect(this.interHP);
    this.interHP.connect(this.driveStage2);
    this.driveStage2.connect(this.driveStage3);
    this.driveStage3.connect(this.driveOutputGain);
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

    // Delay → Reverb
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

    // Reverb → Output
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
      case 'gain': {
        const amount = 1.0 + (value / 100) * 10.0;
        this.driveInputGain.gain.setTargetAtTime(0.5 + (value / 100) * 4.0, now, 0.02);
        this.driveStage1.curve = this._makeElevenCurve(amount);
        this.driveStage2.curve = this._makeSoftSatCurve(amount * 0.6);
        this.driveStage3.curve = this._makePowerCurve(0.8 + (value / 100) * 0.8);
        const tightFreq = 55 + (value / 100) * 50;
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
      case 'delay_mix': {
        const wet = value / 100;
        this.delayMixWet.gain.setTargetAtTime(wet, now, 0.02);
        this.delayMixDry.gain.setTargetAtTime(1 - wet * 0.5, now, 0.02);
        break;
      }
      case 'reverb_decay': {
        const decay = 0.6 + (value / 100) * 0.38;
        for (let i = 0; i < 8; i++) {
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
      this.compHP.disconnect();
      this.compressor.disconnect();
      this.compMakeup.disconnect();
      this.driveInputGain.disconnect();
      this.driveHP.disconnect();
      this.driveStage1.disconnect();
      this.interLP.disconnect();
      this.interHP.disconnect();
      this.driveStage2.disconnect();
      this.driveStage3.disconnect();
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
      this.outputGain.disconnect();
      this.outputLimiter.disconnect();
    } catch (e) {
      console.warn('Error disconnecting Headrush Pedalboard:', e);
    }
  }
}

export default HeadrushPedalboardEffect;
