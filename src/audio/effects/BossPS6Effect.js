import BaseEffect from './BaseEffect';

class BossPS6Effect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Boss PS-6 Harmonist', 'bossps6');

    // ── Mode state ─────────────────────────────────────────────
    // Modes: 'pitch' (chromatic shift), 'harmony' (key-aware shift),
    //        'detune' (subtle chorus-like), 'sshift' (super shift ±3 oct)
    this.mode = 'pitch';

    // ── Pitch shifter nodes ────────────────────────────────────
    this.pitchNode = null;
    try {
      this.pitchNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNode.parameters.get('pitch').value = 0;
      this.pitchNode.parameters.get('mix').value = 1.0;
      this.pitchNode.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('BossPS6Effect: pitch-shifter worklet not available.', e);
    }

    // ── Anti-alias input filter ────────────────────────────────
    this.antiAlias = audioContext.createBiquadFilter();
    this.antiAlias.type = 'lowpass';
    this.antiAlias.frequency.value = 16000;
    this.antiAlias.Q.value = 0.707;

    // ── DC blocker after pitch shift ───────────────────────────
    this.dcBlocker = audioContext.createBiquadFilter();
    this.dcBlocker.type = 'highpass';
    this.dcBlocker.frequency.value = 20;
    this.dcBlocker.Q.value = 0.707;

    // ── Fine detune via modulated delay ────────────────────────
    // Short modulated delay for cents-level detuning
    this.fineDelay = audioContext.createDelay(0.05);
    this.fineDelay.delayTime.value = 0.0;

    // LFO for fine detune modulation
    this.fineLFO = audioContext.createOscillator();
    this.fineLFO.type = 'sine';
    this.fineLFO.frequency.value = 0.5;

    this.fineLFOGain = audioContext.createGain();
    this.fineLFOGain.gain.value = 0.0; // 0 cents by default

    this.fineLFO.connect(this.fineLFOGain);
    this.fineLFOGain.connect(this.fineDelay.delayTime);
    this.fineLFO.start();

    // ── Balance (wet/dry voice mix) ────────────────────────────
    this.shiftedGain = audioContext.createGain();
    this.directGain = audioContext.createGain();
    this.shiftedGain.gain.value = 0.7;
    this.directGain.gain.value = 0.7;

    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // ── Tone shaping ───────────────────────────────────────────
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 12000;
    this.toneFilter.Q.value = 0.707;

    // ── Routing ────────────────────────────────────────────────
    // Shifted voice: input → antiAlias → pitchNode → fineDelay → dcBlocker → toneFilter → shiftedGain → mixer
    this.input.connect(this.antiAlias);
    if (this.pitchNode) {
      this.antiAlias.connect(this.pitchNode);
      this.pitchNode.connect(this.fineDelay);
    } else {
      this.antiAlias.connect(this.fineDelay);
    }
    this.fineDelay.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.shiftedGain);
    this.shiftedGain.connect(this.mixer);

    // Direct voice: input → directGain → mixer
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // Master: mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = { shift: 0, fine: 0, balance: 50, mode: 'pitch' };
  }

  /**
   * Converts cents to delay modulation depth.
   * A 1-cent detune ≈ 5.8μs delay modulation at 1kHz.
   */
  _centsToDelayDepth(cents) {
    return Math.abs(cents) * 0.0000058;
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'shift': {
        // Pitch shift in semitones: -24 to +24
        const semitones = Math.max(-24, Math.min(24, value));
        if (this.pitchNode) {
          this.pitchNode.parameters.get('pitch').setTargetAtTime(semitones, now, 0.02);
        }
        // Adjust grain size based on shift magnitude
        if (this.pitchNode) {
          const grain = 30 + Math.abs(semitones) * 1.5;
          this.pitchNode.parameters.get('grain').setTargetAtTime(grain, now, 0.02);
        }
        this.params.shift = semitones;
        break;
      }
      case 'fine': {
        // Fine tune in cents: -50 to +50
        const cents = Math.max(-50, Math.min(50, value));
        const depth = this._centsToDelayDepth(cents);
        this.fineLFOGain.gain.setTargetAtTime(depth, now, 0.02);
        // Offset the delay center for directional detuning
        const center = cents > 0 ? depth * 0.5 : 0.001;
        this.fineDelay.delayTime.setTargetAtTime(center, now, 0.02);
        this.params.fine = cents;
        break;
      }
      case 'balance': {
        // Balance 0-100: 0 = all direct, 50 = equal, 100 = all shifted
        const t = value / 100;
        this.shiftedGain.gain.setTargetAtTime(t, now, 0.02);
        this.directGain.gain.setTargetAtTime(1.0 - t, now, 0.02);
        this.params.balance = value;
        break;
      }
      case 'mode': {
        // Mode: 'pitch', 'harmony', 'detune', 'sshift'
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['pitch', 'harmony', 'detune', 'sshift'];
          this.mode = modes[Math.max(0, Math.min(3, Math.floor(value)))] || 'pitch';
        }
        // Reconfigure behavior per mode
        if (this.mode === 'detune') {
          // Detune mode: disable pitch worklet, rely on delay modulation
          if (this.pitchNode) {
            this.pitchNode.parameters.get('pitch').setTargetAtTime(0, now, 0.02);
          }
          this.fineLFO.frequency.setTargetAtTime(3.0, now, 0.05);
          this.fineLFOGain.gain.setTargetAtTime(0.0003, now, 0.02);
        } else if (this.mode === 'sshift') {
          // Super shift: larger grain for extended range
          if (this.pitchNode) {
            this.pitchNode.parameters.get('grain').setTargetAtTime(80, now, 0.02);
          }
          this.fineLFO.frequency.setTargetAtTime(0.5, now, 0.05);
        } else {
          this.fineLFO.frequency.setTargetAtTime(0.5, now, 0.05);
        }
        this.params.mode = this.mode;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.fineLFO.stop(); } catch (e) {}
    try { this.fineLFO.disconnect(); } catch (e) {}
    try { this.fineLFOGain.disconnect(); } catch (e) {}
    try { this.fineDelay.disconnect(); } catch (e) {}
    try { this.antiAlias.disconnect(); } catch (e) {}
    try { if (this.pitchNode) this.pitchNode.disconnect(); } catch (e) {}
    try { this.dcBlocker.disconnect(); } catch (e) {}
    try { this.toneFilter.disconnect(); } catch (e) {}
    try { this.shiftedGain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default BossPS6Effect;
