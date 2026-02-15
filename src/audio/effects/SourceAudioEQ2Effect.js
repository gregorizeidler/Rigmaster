import BaseEffect from './BaseEffect';

/**
 * SourceAudioEQ2Effect - Source Audio EQ2 Programmable EQ
 *
 * Studio-grade 10-band parametric equalizer pedal.
 * Each of the first 5 bands has independent frequency, gain, and Q controls.
 * The remaining 5 bands mirror the same structure for full spectrum coverage.
 *
 * Features:
 * - 10 fully parametric bands (freq + gain + Q each)
 * - Sweepable frequency per band (20Hz – 20kHz)
 * - Adjustable Q from 0.1 (wide) to 10 (surgical)
 * - Master volume control
 *
 * Params: freq1-freq5, gain1-gain5, q1-q5, master (0-100)
 */
class SourceAudioEQ2Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Source Audio EQ2', 'sourceaudioeq2');

    // Default centre frequencies for 10 bands (spread across spectrum)
    const defaultFreqs = [60, 150, 350, 800, 2000, 4000, 6000, 8000, 12000, 16000];

    // Create 10 parametric band filters
    this.bands = defaultFreqs.map((freq, index) => {
      const filter = audioContext.createBiquadFilter();

      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === 9) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }

      filter.frequency.value = freq;
      filter.gain.value = 0;
      filter.Q.value = 1.0;

      return { freq, filter };
    });

    // Master output gain
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 1.0;

    // Input conditioning HPF
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 20;
    this.inputHPF.Q.value = 0.707;

    // Output protection LPF
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 20000;
    this.outputLPF.Q.value = 0.707;

    // ===== Wet signal chain =====
    this.input.connect(this.inputHPF);
    this.inputHPF.connect(this.bands[0].filter);

    for (let i = 0; i < this.bands.length - 1; i++) {
      this.bands[i].filter.connect(this.bands[i + 1].filter);
    }

    this.bands[this.bands.length - 1].filter.connect(this.outputLPF);
    this.outputLPF.connect(this.masterGain);
    this.masterGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { master: 50 };
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    // Frequency: freq1-freq5 (each 0-100 → logarithmic 20Hz–20kHz)
    const freqMatch = param.match(/^freq(\d+)$/);
    if (freqMatch) {
      const idx = parseInt(freqMatch[1]) - 1;
      if (idx >= 0 && idx < this.bands.length) {
        // Logarithmic frequency mapping: 20Hz to 20kHz
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const freq = Math.pow(10, minLog + (value / 100) * (maxLog - minLog));
        this.bands[idx].filter.frequency.setTargetAtTime(freq, now, 0.015);
      }
      return;
    }

    // Gain: gain1-gain5 (0-100 → -15dB to +15dB)
    const gainMatch = param.match(/^gain(\d+)$/);
    if (gainMatch) {
      const idx = parseInt(gainMatch[1]) - 1;
      if (idx >= 0 && idx < this.bands.length) {
        const gain = ((value - 50) / 50) * 15;
        this.bands[idx].filter.gain.setTargetAtTime(gain, now, 0.01);
      }
      return;
    }

    // Q: q1-q5 (0-100 → 0.1 to 10.0)
    const qMatch = param.match(/^q(\d+)$/);
    if (qMatch) {
      const idx = parseInt(qMatch[1]) - 1;
      if (idx >= 0 && idx < this.bands.length) {
        const q = 0.1 + (value / 100) * 9.9;
        this.bands[idx].filter.Q.setTargetAtTime(q, now, 0.01);
      }
      return;
    }

    // Master output level
    if (param === 'master') {
      const masterLevel = (value / 50) * 1.0;
      this.masterGain.gain.setTargetAtTime(masterLevel, now, 0.01);
      this.params.master = value;
    }
  }

  // Reset all bands flat
  setFlat() {
    const now = this.audioContext.currentTime;
    this.bands.forEach(band => {
      band.filter.gain.setTargetAtTime(0, now, 0.01);
      band.filter.Q.setTargetAtTime(1.0, now, 0.01);
    });
    this.masterGain.gain.setTargetAtTime(1.0, now, 0.01);
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputHPF.disconnect();
      this.bands.forEach(b => b.filter.disconnect());
      this.outputLPF.disconnect();
      this.masterGain.disconnect();
    } catch (e) {}
  }
}

export default SourceAudioEQ2Effect;
