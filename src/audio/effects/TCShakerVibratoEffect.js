import BaseEffect from './BaseEffect';

/**
 * TCShakerVibratoEffect - TC Electronic Shaker Vibrato
 * 
 * Clean vibrato with different modes.
 * TonePrint compatible, studio-quality pure pitch modulation.
 * 
 * Features:
 * - Pure vibrato (pitch modulation without mixing dry signal)
 * - Latch mode (always on) and momentary mode (with rise time)
 * - Adjustable rise time for gradual vibrato onset
 * - Multiple LFO waveforms
 * - Clean signal path with anti-aliasing
 */

class TCShakerVibratoEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'TC Shaker Vibrato', 'tcshakervibrato');

    // Modulation delay line
    this.modDelay = audioContext.createDelay(0.1);
    this.modDelay.delayTime.value = 0.005;

    // Secondary delay for depth
    this.modDelay2 = audioContext.createDelay(0.1);
    this.modDelay2.delayTime.value = 0.008;

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 4.0;

    // LFO depth control
    this.lfoDepth = audioContext.createGain();
    this.lfoDepth.gain.value = 0.003;
    this.lfoDepth2 = audioContext.createGain();
    this.lfoDepth2.gain.value = 0.002;

    // Rise time envelope gain (modulates LFO depth for gradual onset)
    this.riseGain = audioContext.createGain();
    this.riseGain.gain.value = 1.0;

    // Anti-aliasing filter
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 14000;
    this.antiAlias.Q.value = 0.707;

    // Tone warmth filter
    this.warmth = audioContext.createBiquadFilter();
    this.warmth.type = 'lowshelf';
    this.warmth.frequency.value = 300;
    this.warmth.gain.value = 1.5;

    // Vibrato output gain
    this.vibratoGain = audioContext.createGain();
    this.vibratoGain.gain.value = 0.5;

    // Second voice gain
    this.voice2Gain = audioContext.createGain();
    this.voice2Gain.gain.value = 0.3;

    // Output mix
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.8;

    // LFO routing through rise envelope
    this.lfo.connect(this.riseGain);
    this.riseGain.connect(this.lfoDepth);
    this.riseGain.connect(this.lfoDepth2);
    this.lfoDepth.connect(this.modDelay.delayTime);
    this.lfoDepth2.connect(this.modDelay2.delayTime);

    this.lfo.start();

    // Signal chain: input -> modDelay -> antiAlias -> warmth -> vibratoGain -> outGain
    this.input.connect(this.modDelay);
    this.input.connect(this.modDelay2);

    this.modDelay.connect(this.vibratoGain);
    this.modDelay2.connect(this.voice2Gain);

    this.vibratoGain.connect(this.antiAlias);
    this.voice2Gain.connect(this.antiAlias);

    this.antiAlias.connect(this.warmth);
    this.warmth.connect(this.outGain);
    this.outGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Mode: 'latch' or 'momentary'
    this.mode = 'latch';
    this._riseTimeMs = 200;
    this._isActive = true;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 1 to 15 Hz
        const speed = 1 + (value / 100) * 14;
        this.lfo.frequency.setTargetAtTime(speed, now, 0.01);
        break;

      case 'depth':
        // 0 to 8ms modulation
        const depth = (value / 100) * 0.008;
        this.lfoDepth.gain.setTargetAtTime(depth, now, 0.01);
        this.lfoDepth2.gain.setTargetAtTime(depth * 0.7, now, 0.01);
        break;

      case 'rise_time':
        // 0 to 2000ms rise time
        this._riseTimeMs = (value / 100) * 2000;
        break;

      case 'mode':
        this.mode = value;
        if (this.mode === 'momentary') {
          // In momentary, vibrato fades out after release
          this._deactivate(now);
        } else {
          // In latch, vibrato is always on
          this._activate(now);
        }
        break;

      case 'activate':
        // For momentary mode: trigger vibrato on/off
        if (value) {
          this._activate(now);
        } else {
          this._deactivate(now);
        }
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  _activate(now) {
    this._isActive = true;
    const riseTimeSec = this._riseTimeMs / 1000;
    this.riseGain.gain.cancelScheduledValues(now);
    this.riseGain.gain.setValueAtTime(this.riseGain.gain.value, now);
    this.riseGain.gain.setTargetAtTime(1.0, now, riseTimeSec / 3);
  }

  _deactivate(now) {
    this._isActive = false;
    const riseTimeSec = this._riseTimeMs / 1000;
    this.riseGain.gain.cancelScheduledValues(now);
    this.riseGain.gain.setValueAtTime(this.riseGain.gain.value, now);
    this.riseGain.gain.setTargetAtTime(0.0, now, riseTimeSec / 3);
  }

  disconnect() {
    super.disconnect();
    try {
      this.modDelay.disconnect();
      this.modDelay2.disconnect();
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepth.disconnect();
      this.lfoDepth2.disconnect();
      this.riseGain.disconnect();
      this.antiAlias.disconnect();
      this.warmth.disconnect();
      this.vibratoGain.disconnect();
      this.voice2Gain.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

export default TCShakerVibratoEffect;
