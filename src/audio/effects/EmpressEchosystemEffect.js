import BaseEffect from './BaseEffect';

class EmpressEchosystemEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Empress Echosystem', 'empressechosystem');

    // EMPRESS ECHOSYSTEM (2017)
    // Dual delay engine with parallel/series modes
    // Used by: professional ambient/experimental guitarists

    // Mode presets define character for each engine
    this.enginePresets = {
      'tape': { lpf: 3000, saturation: 0.3, modRate: 0.6, modDepth: 0.003, feedbackLPF: 2800 },
      'digital': { lpf: 12000, saturation: 0.0, modRate: 0.0, modDepth: 0.0, feedbackLPF: 10000 },
      'oil_can': { lpf: 2500, saturation: 0.25, modRate: 2.5, modDepth: 0.006, feedbackLPF: 2200 },
      'lo_fi': { lpf: 1800, saturation: 0.5, modRate: 1.0, modDepth: 0.004, feedbackLPF: 1500 }
    };
    this.currentEngineMode = 'tape';
    this.routingMode = 'series'; // 'series' or 'parallel'

    // =====================
    // ENGINE A
    // =====================
    this.delayA = audioContext.createDelay(3.0);
    this.delayA.delayTime.value = 0.375;

    this.feedbackGainA = audioContext.createGain();
    this.feedbackGainA.gain.value = 0.4;

    this.lpfA = audioContext.createBiquadFilter();
    this.lpfA.type = 'lowpass';
    this.lpfA.frequency.value = 3000;
    this.lpfA.Q.value = 0.707;

    this.feedbackLpfA = audioContext.createBiquadFilter();
    this.feedbackLpfA.type = 'lowpass';
    this.feedbackLpfA.frequency.value = 2800;
    this.feedbackLpfA.Q.value = 0.707;

    this.hpFeedbackA = audioContext.createBiquadFilter();
    this.hpFeedbackA.type = 'highpass';
    this.hpFeedbackA.frequency.value = 60;
    this.hpFeedbackA.Q.value = 0.707;

    this.satA = audioContext.createWaveShaper();
    this.satA.oversample = '2x';

    this.modLfoA = audioContext.createOscillator();
    this.modDepthA = audioContext.createGain();
    this.modLfoA.type = 'sine';
    this.modLfoA.frequency.value = 0.6;
    this.modDepthA.gain.value = 0.003;
    this.modLfoA.start();

    // =====================
    // ENGINE B
    // =====================
    this.delayB = audioContext.createDelay(3.0);
    this.delayB.delayTime.value = 0.25;

    this.feedbackGainB = audioContext.createGain();
    this.feedbackGainB.gain.value = 0.35;

    this.lpfB = audioContext.createBiquadFilter();
    this.lpfB.type = 'lowpass';
    this.lpfB.frequency.value = 3000;
    this.lpfB.Q.value = 0.707;

    this.feedbackLpfB = audioContext.createBiquadFilter();
    this.feedbackLpfB.type = 'lowpass';
    this.feedbackLpfB.frequency.value = 2800;
    this.feedbackLpfB.Q.value = 0.707;

    this.hpFeedbackB = audioContext.createBiquadFilter();
    this.hpFeedbackB.type = 'highpass';
    this.hpFeedbackB.frequency.value = 60;
    this.hpFeedbackB.Q.value = 0.707;

    this.satB = audioContext.createWaveShaper();
    this.satB.oversample = '2x';

    this.modLfoB = audioContext.createOscillator();
    this.modDepthB = audioContext.createGain();
    this.modLfoB.type = 'triangle';
    this.modLfoB.frequency.value = 0.45;
    this.modDepthB.gain.value = 0.002;
    this.modLfoB.start();

    // =====================
    // SHARED
    // =====================
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Routing controls
    this.engineAOut = audioContext.createGain();
    this.engineAOut.gain.value = 0.5;
    this.engineBOut = audioContext.createGain();
    this.engineBOut.gain.value = 0.5;

    // Cross-feed for series routing
    this.seriesToB = audioContext.createGain();
    this.seriesToB.gain.value = 1.0;

    this.wetMix = audioContext.createGain();
    this.wetMix.gain.value = 0.5;

    // Build saturation curves
    this._buildSatCurve(this.satA, 0.3);
    this._buildSatCurve(this.satB, 0.3);

    // === ENGINE A CHAIN ===
    this.input.connect(this.delayA);
    this.delayA.connect(this.satA);
    this.satA.connect(this.lpfA);
    this.lpfA.connect(this.engineAOut);

    // Engine A feedback
    this.lpfA.connect(this.feedbackLpfA);
    this.feedbackLpfA.connect(this.hpFeedbackA);
    this.hpFeedbackA.connect(this.feedbackGainA);
    this.feedbackGainA.connect(this.delayA);

    // Engine A modulation
    this.modLfoA.connect(this.modDepthA);
    this.modDepthA.connect(this.delayA.delayTime);

    // === ENGINE B CHAIN ===
    // In series mode: A output feeds B. In parallel: input feeds B directly.
    this.engineAOut.connect(this.seriesToB);
    this.seriesToB.connect(this.delayB);
    // Also connect input to B for parallel mode (controlled by gain)
    this.parallelToB = audioContext.createGain();
    this.parallelToB.gain.value = 0.0;
    this.input.connect(this.parallelToB);
    this.parallelToB.connect(this.delayB);

    this.delayB.connect(this.satB);
    this.satB.connect(this.lpfB);
    this.lpfB.connect(this.engineBOut);

    // Engine B feedback
    this.lpfB.connect(this.feedbackLpfB);
    this.feedbackLpfB.connect(this.hpFeedbackB);
    this.hpFeedbackB.connect(this.feedbackGainB);
    this.feedbackGainB.connect(this.delayB);

    // Engine B modulation
    this.modLfoB.connect(this.modDepthB);
    this.modDepthB.connect(this.delayB.delayTime);

    // === MIX OUTPUT ===
    // In series: only B output goes to wet. In parallel: both A and B.
    this.engineBOut.connect(this.wetMix);
    // For parallel, A also goes to mix (will be handled by routing change)
    this.parallelAToMix = audioContext.createGain();
    this.parallelAToMix.gain.value = 0.0;
    this.engineAOut.connect(this.parallelAToMix);
    this.parallelAToMix.connect(this.wetMix);

    this.wetMix.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply defaults
    this._applyEngineMode(this.currentEngineMode);
    this._applyRouting(this.routingMode);
  }

  _buildSatCurve(shaper, amount) {
    const samples = 4096;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (amount <= 0) {
        curve[i] = x;
      } else {
        curve[i] = Math.tanh(x * (1 + amount * 3)) / Math.tanh(1 + amount * 3);
      }
    }
    shaper.curve = curve;
  }

  _applyEngineMode(mode) {
    const now = this.audioContext.currentTime;
    const preset = this.enginePresets[mode] || this.enginePresets['tape'];

    // Apply to both engines
    this.lpfA.frequency.setTargetAtTime(preset.lpf, now, 0.02);
    this.lpfB.frequency.setTargetAtTime(preset.lpf, now, 0.02);
    this.feedbackLpfA.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
    this.feedbackLpfB.frequency.setTargetAtTime(preset.feedbackLPF, now, 0.02);
    this.modLfoA.frequency.setTargetAtTime(preset.modRate, now, 0.02);
    this.modDepthA.gain.setTargetAtTime(preset.modDepth, now, 0.02);
    this.modLfoB.frequency.setTargetAtTime(preset.modRate * 0.75, now, 0.02);
    this.modDepthB.gain.setTargetAtTime(preset.modDepth * 0.8, now, 0.02);
    this._buildSatCurve(this.satA, preset.saturation);
    this._buildSatCurve(this.satB, preset.saturation);
  }

  _applyRouting(routing) {
    const now = this.audioContext.currentTime;

    if (routing === 'parallel') {
      this.seriesToB.gain.setTargetAtTime(0.0, now, 0.02);
      this.parallelToB.gain.setTargetAtTime(1.0, now, 0.02);
      this.parallelAToMix.gain.setTargetAtTime(0.5, now, 0.02);
    } else {
      // series: A -> B
      this.seriesToB.gain.setTargetAtTime(1.0, now, 0.02);
      this.parallelToB.gain.setTargetAtTime(0.0, now, 0.02);
      this.parallelAToMix.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time_a':
        this.delayA.delayTime.setTargetAtTime(0.02 + (value / 100) * 2.48, now, 0.01);
        break;
      case 'time_b':
        this.delayB.delayTime.setTargetAtTime(0.02 + (value / 100) * 2.48, now, 0.01);
        break;
      case 'feedback':
        {
          const fb = (value / 100) * 0.92;
          this.feedbackGainA.gain.setTargetAtTime(fb, now, 0.01);
          this.feedbackGainB.gain.setTargetAtTime(fb * 0.85, now, 0.01);
        }
        break;
      case 'mix':
        this.wetMix.gain.setTargetAtTime(value / 100, now, 0.01);
        break;
      case 'mode':
        this.currentEngineMode = value;
        this._applyEngineMode(value);
        break;
      case 'routing':
        this.routingMode = value;
        this._applyRouting(value);
        break;
      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.delayA.disconnect();
      this.delayB.disconnect();
      this.feedbackGainA.disconnect();
      this.feedbackGainB.disconnect();
      this.lpfA.disconnect();
      this.lpfB.disconnect();
      this.feedbackLpfA.disconnect();
      this.feedbackLpfB.disconnect();
      this.hpFeedbackA.disconnect();
      this.hpFeedbackB.disconnect();
      this.satA.disconnect();
      this.satB.disconnect();
      this.modLfoA.stop();
      this.modLfoA.disconnect();
      this.modDepthA.disconnect();
      this.modLfoB.stop();
      this.modLfoB.disconnect();
      this.modDepthB.disconnect();
      this.dcBlocker.disconnect();
      this.engineAOut.disconnect();
      this.engineBOut.disconnect();
      this.seriesToB.disconnect();
      this.parallelToB.disconnect();
      this.parallelAToMix.disconnect();
      this.wetMix.disconnect();
    } catch (e) {}
  }
}

export default EmpressEchosystemEffect;
