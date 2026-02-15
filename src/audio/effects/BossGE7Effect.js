import BaseEffect from './BaseEffect';

/**
 * BossGE7Effect - Boss GE-7 Graphic EQ
 *
 * Classic 7-band graphic equalizer pedal.
 * Used by: Blues, rock, metal players for tone sculpting and mid-boost.
 *
 * Features:
 * - 7 bands: 100Hz, 200Hz, 400Hz, 800Hz, 1.6kHz, 3.2kHz, 6.4kHz
 * - ±15dB boost/cut per band
 * - Output level control
 * - Low-noise JFET input stage emulation
 *
 * Params: band1-band7 (0-100, 50 = 0dB), level (0-100)
 */
class BossGE7Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss GE-7', 'bossge7');

    // 7 ISO-standard frequency bands
    const frequencies = [100, 200, 400, 800, 1600, 3200, 6400];

    // Input buffer — emulate JFET buffer stage
    this.inputBuffer = audioContext.createGain();
    this.inputBuffer.gain.value = 1.0;

    // Create EQ bands
    this.bands = frequencies.map((freq, index) => {
      const filter = audioContext.createBiquadFilter();

      if (index === 0) {
        // Lowest band uses lowshelf for natural roll-off
        filter.type = 'lowshelf';
      } else if (index === frequencies.length - 1) {
        // Highest band uses highshelf
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        // GE-7 uses relatively narrow Q for graphic EQ precision
        filter.Q.value = 1.5;
      }

      filter.frequency.value = freq;
      filter.gain.value = 0;

      return { freq, filter };
    });

    // Output level control
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 1.0;

    // Noise gate — subtle high-pass to cut rumble below EQ range
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 30;
    this.inputHPF.Q.value = 0.707;

    // Anti-aliasing LPF at the top end
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 12000;
    this.outputLPF.Q.value = 0.5;

    // ===== Routing: wet path =====
    this.input.connect(this.inputBuffer);
    this.inputBuffer.connect(this.inputHPF);
    this.inputHPF.connect(this.bands[0].filter);

    for (let i = 0; i < this.bands.length - 1; i++) {
      this.bands[i].filter.connect(this.bands[i + 1].filter);
    }

    this.bands[this.bands.length - 1].filter.connect(this.outputLPF);
    this.outputLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Default params
    this.params = {
      band1: 50, band2: 50, band3: 50, band4: 50,
      band5: 50, band6: 50, band7: 50,
      level: 50
    };
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    // Handle band1 through band7
    const bandMatch = param.match(/^band(\d)$/);
    if (bandMatch) {
      const bandIndex = parseInt(bandMatch[1]) - 1;
      if (bandIndex >= 0 && bandIndex < this.bands.length) {
        // Convert 0-100 to -15dB to +15dB (50 = 0dB)
        const gain = ((value - 50) / 50) * 15;
        this.bands[bandIndex].filter.gain.setTargetAtTime(gain, now, 0.01);
        this.params[param] = value;
      }
      return;
    }

    switch (param) {
      case 'level': {
        // 0-100 maps to 0.0 – 2.0 (unity at 50)
        const level = (value / 50) * 1.0;
        this.outputGain.gain.setTargetAtTime(level, now, 0.01);
        this.params.level = value;
        break;
      }
      default:
        break;
    }
  }

  // Preset: mid-boost (classic blues lead tone)
  setMidBoost() {
    const now = this.audioContext.currentTime;
    const curve = [0, 2, 6, 10, 8, 3, 0]; // dB per band
    curve.forEach((gain, i) => {
      this.bands[i].filter.gain.setTargetAtTime(gain, now, 0.01);
    });
  }

  // Preset: scoop (metal rhythm)
  setScoop() {
    const now = this.audioContext.currentTime;
    const curve = [6, 3, -3, -8, -3, 3, 6];
    curve.forEach((gain, i) => {
      this.bands[i].filter.gain.setTargetAtTime(gain, now, 0.01);
    });
  }

  // Reset all bands flat
  setFlat() {
    const now = this.audioContext.currentTime;
    this.bands.forEach(band => {
      band.filter.gain.setTargetAtTime(0, now, 0.01);
    });
  }

  disconnect() {
    super.disconnect();
    try {
      this.inputBuffer.disconnect();
      this.inputHPF.disconnect();
      this.bands.forEach(b => b.filter.disconnect());
      this.outputLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default BossGE7Effect;
