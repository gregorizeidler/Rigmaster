import BaseEffect from './BaseEffect';

/**
 * FulltoneDejaVibeEffect - Fulltone Deja Vibe
 * 
 * Uni-Vibe clone with photocell-style modulation.
 * Distinctive throbbing, pulsing character different from standard phaser/chorus.
 * 
 * Features:
 * - 4-stage phase shift with staggered frequencies (simulates photocell LDR response)
 * - Non-linear LFO waveshaping for characteristic throb
 * - Chorus/Vibrato toggle
 * - Intensity control for modulation depth
 * - Warm, organic modulation character
 */

class FulltoneDejaVibeEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Fulltone Deja Vibe', 'fulltonedejavibe');

    // 4-stage allpass filters (Uni-Vibe uses staggered frequencies)
    this.allpass = [];
    // Real Uni-Vibe caps: 15nF, 22nF, 47nF, 100nF → different center frequencies
    const centerFreqs = [350, 700, 1500, 3500];
    for (let i = 0; i < 4; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = centerFreqs[i];
      filter.Q.value = 0.45;
      this.allpass.push(filter);
    }

    // LFO with non-linear waveshaping to simulate photocell response
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 3.0;

    // Waveshaper to create asymmetric LFO (photocell has slow attack, fast release)
    this.lfoShaper = audioContext.createWaveShaper();
    this.lfoShaper.curve = this._makePhotocellCurve();

    // LFO depth controls for each stage (different depths simulate cap differences)
    this.lfoDepths = [];
    const depthValues = [250, 500, 1000, 2500];
    for (let i = 0; i < 4; i++) {
      const gain = audioContext.createGain();
      gain.gain.value = depthValues[i];
      this.lfoDepths.push(gain);
    }

    // Intensity scaler
    this.intensityGain = audioContext.createGain();
    this.intensityGain.gain.value = 0.7;

    // Chorus path (dry + phase-shifted wet)
    this.chorusGain = audioContext.createGain();
    this.chorusGain.gain.value = 0.5;

    // Phase-shifted output
    this.phaseGain = audioContext.createGain();
    this.phaseGain.gain.value = 0.6;

    // Warm tone filter
    this.warmFilter = audioContext.createBiquadFilter();
    this.warmFilter.type = 'lowpass';
    this.warmFilter.frequency.value = 7000;
    this.warmFilter.Q.value = 0.5;

    // Pre-filter (simulates input transformer coloring)
    this.inputColor = audioContext.createBiquadFilter();
    this.inputColor.type = 'peaking';
    this.inputColor.frequency.value = 800;
    this.inputColor.Q.value = 0.7;
    this.inputColor.gain.value = 2;

    // Chain allpass filters
    this.input.connect(this.inputColor);
    this.inputColor.connect(this.allpass[0]);
    for (let i = 0; i < 3; i++) {
      this.allpass[i].connect(this.allpass[i + 1]);
    }

    // Phase-shifted output path
    this.allpass[3].connect(this.warmFilter);
    this.warmFilter.connect(this.phaseGain);
    this.phaseGain.connect(this.wetGain);

    // Chorus mode: mix dry signal with phase-shifted
    this.input.connect(this.chorusGain);
    this.chorusGain.connect(this.wetGain);

    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // LFO routing through photocell shaper and intensity
    this.lfo.connect(this.lfoShaper);
    this.lfoShaper.connect(this.intensityGain);

    for (let i = 0; i < 4; i++) {
      this.intensityGain.connect(this.lfoDepths[i]);
      this.lfoDepths[i].connect(this.allpass[i].frequency);
    }

    this.lfo.start();

    // Mode: 'chorus' or 'vibrato'
    this.chorusVibrato = 'chorus';
  }

  _makePhotocellCurve() {
    // Asymmetric curve: slow rise, fast fall — simulates LDR photocell response
    const samples = 512;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (x >= 0) {
        // Positive half: compressed (slow photocell charge)
        curve[i] = 1 - Math.exp(-3 * x);
      } else {
        // Negative half: sharper (faster photocell discharge)
        curve[i] = -(1 - Math.exp(5 * x));
      }
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 0.5 to 10 Hz (Uni-Vibes have a wide speed range)
        const speed = 0.5 + (value / 100) * 9.5;
        this.lfo.frequency.setTargetAtTime(speed, now, 0.01);
        break;

      case 'intensity':
        // 0 to 1.0 — scales all LFO depths
        const intensity = value / 100;
        this.intensityGain.gain.setTargetAtTime(intensity, now, 0.01);
        break;

      case 'chorus_vibrato':
        this.chorusVibrato = value ? 'vibrato' : 'chorus';
        if (this.chorusVibrato === 'vibrato') {
          // Pure phase-shifted signal
          this.chorusGain.gain.setTargetAtTime(0.0, now, 0.02);
          this.phaseGain.gain.setTargetAtTime(0.8, now, 0.02);
        } else {
          // Mix of dry and phase-shifted
          this.chorusGain.gain.setTargetAtTime(0.5, now, 0.02);
          this.phaseGain.gain.setTargetAtTime(0.6, now, 0.02);
        }
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.allpass.forEach(f => f.disconnect());
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoShaper.disconnect();
      this.lfoDepths.forEach(g => g.disconnect());
      this.intensityGain.disconnect();
      this.chorusGain.disconnect();
      this.phaseGain.disconnect();
      this.warmFilter.disconnect();
      this.inputColor.disconnect();
    } catch (e) {}
  }
}

export default FulltoneDejaVibeEffect;
