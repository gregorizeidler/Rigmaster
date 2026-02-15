import BaseEffect from './BaseEffect';

/**
 * MorleyBadHorsieEffect - Morley Bad Horsie Wah
 *
 * Steve Vai's signature switchless wah pedal.
 * Auto-engages when signal is detected — no footswitch needed.
 *
 * Features:
 * - Electro-optical (LED/LDR) style envelope detection
 * - Auto-engage: wah activates when signal exceeds threshold
 * - Auto-disengage: returns to bypass when signal drops
 * - Contour control shapes the wah voicing
 * - Smooth sweep from bass to treble driven by input dynamics
 *
 * Params: contour (0-100), level (0-100), wah_range (0-100)
 */
class MorleyBadHorsieEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Morley Bad Horsie', 'morleybadhorsie');

    // ===== Envelope follower (AnalyserNode) =====
    this.envelopeAnalyser = audioContext.createAnalyser();
    this.envelopeAnalyser.fftSize = 256;
    this.envelopeAnalyser.smoothingTimeConstant = 0.82;
    this._envelopeBuffer = new Uint8Array(this.envelopeAnalyser.frequencyBinCount);

    // ===== Input gain =====
    this.inputGain = audioContext.createGain();
    this.inputGain.gain.value = 1.0;

    // ===== Input conditioning =====
    this.inputHPF = audioContext.createBiquadFilter();
    this.inputHPF.type = 'highpass';
    this.inputHPF.frequency.value = 50;
    this.inputHPF.Q.value = 0.5;

    // ===== Main wah bandpass filter =====
    this.wahFilter = audioContext.createBiquadFilter();
    this.wahFilter.type = 'bandpass';
    this.wahFilter.frequency.value = 600;
    this.wahFilter.Q.value = 5.0;

    // ===== Contour shaping — peaking filter that changes the wah voicing =====
    this.contourFilter = audioContext.createBiquadFilter();
    this.contourFilter.type = 'peaking';
    this.contourFilter.frequency.value = 1200;
    this.contourFilter.Q.value = 2.0;
    this.contourFilter.gain.value = 6;

    // ===== Wah presence boost =====
    this.presenceFilter = audioContext.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 2500;
    this.presenceFilter.Q.value = 1.5;
    this.presenceFilter.gain.value = 3;

    // ===== Low-end retention (Morley's buffer retains some bass) =====
    this.lowRetain = audioContext.createBiquadFilter();
    this.lowRetain.type = 'lowshelf';
    this.lowRetain.frequency.value = 200;
    this.lowRetain.gain.value = 3;

    // ===== Auto-engage crossfade gains =====
    this.engageWet = audioContext.createGain();
    this.engageWet.gain.value = 0; // Starts disengaged
    this.engageDry = audioContext.createGain();
    this.engageDry.gain.value = 1.0;

    // ===== Output =====
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.8;

    // DC blocker
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 10;
    this.dcBlocker.Q.value = 0.707;

    // Output limiter to protect against resonance spikes
    this.outputLPF = audioContext.createBiquadFilter();
    this.outputLPF.type = 'lowpass';
    this.outputLPF.frequency.value = 10000;
    this.outputLPF.Q.value = 0.5;

    // ===== Wet signal chain =====
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.inputHPF);

    // Wah path → engageWet
    this.inputHPF.connect(this.wahFilter);
    this.wahFilter.connect(this.contourFilter);
    this.contourFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.lowRetain);
    this.lowRetain.connect(this.engageWet);

    // Clean path → engageDry (for auto-engage/disengage)
    this.inputHPF.connect(this.engageDry);

    // Combine engage paths
    this.engageWet.connect(this.dcBlocker);
    this.engageDry.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputLPF);
    this.outputLPF.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Envelope tap
    this.input.connect(this.envelopeAnalyser);

    // ===== Dry path =====
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // ===== Envelope / auto-engage state =====
    this._smoothedEnvelope = 0;
    this._isEngaged = false;
    this._engageThreshold = 0.015;
    this._disengageThreshold = 0.005;
    this._rangeMin = 300;
    this._rangeMax = 3500;
    this._contour = 0.5;
    this._animationId = null;
    this._startEnvelopeFollower();

    this.params = { contour: 50, level: 70, wah_range: 50 };
  }

  _startEnvelopeFollower() {
    const tick = () => {
      this.envelopeAnalyser.getByteTimeDomainData(this._envelopeBuffer);

      // RMS envelope detection
      let sum = 0;
      for (let i = 0; i < this._envelopeBuffer.length; i++) {
        const s = (this._envelopeBuffer[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this._envelopeBuffer.length);

      // LED/LDR style smoothing: fast attack, slow release
      const att = 0.3;
      const rel = 0.02;
      if (rms > this._smoothedEnvelope) {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * att;
      } else {
        this._smoothedEnvelope += (rms - this._smoothedEnvelope) * rel;
      }

      const now = this.audioContext.currentTime;

      // ===== Auto-engage logic =====
      if (!this._isEngaged && this._smoothedEnvelope > this._engageThreshold) {
        this._isEngaged = true;
        this.engageWet.gain.setTargetAtTime(1.0, now, 0.015);
        this.engageDry.gain.setTargetAtTime(0.0, now, 0.015);
      } else if (this._isEngaged && this._smoothedEnvelope < this._disengageThreshold) {
        this._isEngaged = false;
        this.engageWet.gain.setTargetAtTime(0.0, now, 0.05);
        this.engageDry.gain.setTargetAtTime(1.0, now, 0.05);
      }

      // ===== Sweep wah frequency based on envelope =====
      if (this._isEngaged) {
        const envScaled = Math.min(this._smoothedEnvelope * 8, 1.0);
        const minLog = Math.log10(this._rangeMin);
        const maxLog = Math.log10(this._rangeMax);
        const freq = Math.pow(10, minLog + envScaled * (maxLog - minLog));

        this.wahFilter.frequency.setTargetAtTime(freq, now, 0.006);
        this.contourFilter.frequency.setTargetAtTime(freq * 1.4, now, 0.008);
      }

      this._animationId = requestAnimationFrame(tick);
    };
    this._animationId = requestAnimationFrame(tick);
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;
    this.params[param] = value;

    switch (param) {
      case 'contour': {
        // 0-100 shapes the wah voicing
        this._contour = value / 100;
        // Low contour = dark/bassy, high contour = bright/cutting
        const q = 3 + (value / 100) * 8;
        this.wahFilter.Q.setTargetAtTime(q, now, 0.01);
        // Contour shifts the resonance character
        const contourGain = 3 + (value / 100) * 9;
        this.contourFilter.gain.setTargetAtTime(contourGain, now, 0.01);
        const contourQ = 1.0 + (value / 100) * 4.0;
        this.contourFilter.Q.setTargetAtTime(contourQ, now, 0.01);
        // Presence adjusts with contour
        const presGain = 1 + (value / 100) * 6;
        this.presenceFilter.gain.setTargetAtTime(presGain, now, 0.01);
        break;
      }

      case 'level': {
        // 0-100 → 0.0 to 1.5
        const lvl = (value / 100) * 1.5;
        this.outputGain.gain.setTargetAtTime(lvl, now, 0.01);
        break;
      }

      case 'wah_range': {
        // 0-100 adjusts the sweep range
        this._rangeMin = 200 + (value / 100) * 200;   // 200–400Hz
        this._rangeMax = 2000 + (value / 100) * 4000;  // 2–6kHz
        break;
      }

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }
    try {
      this.inputGain.disconnect();
      this.inputHPF.disconnect();
      this.envelopeAnalyser.disconnect();
      this.wahFilter.disconnect();
      this.contourFilter.disconnect();
      this.presenceFilter.disconnect();
      this.lowRetain.disconnect();
      this.engageWet.disconnect();
      this.engageDry.disconnect();
      this.dcBlocker.disconnect();
      this.outputLPF.disconnect();
      this.outputGain.disconnect();
    } catch (e) {}
  }
}

export default MorleyBadHorsieEffect;
