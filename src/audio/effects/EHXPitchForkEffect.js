import BaseEffect from './BaseEffect';

class EHXPitchForkEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'EHX Pitch Fork', 'ehxpitchfork');

    // ── Mode state ─────────────────────────────────────────────
    // 'up', 'down', or 'dual' (both directions simultaneously)
    this.mode = 'up';
    this.latch = true; // true = always on, false = momentary

    // ── Pitch shifter nodes ────────────────────────────────────
    this.pitchUpNode = null;
    this.pitchDownNode = null;

    try {
      this.pitchUpNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchUpNode.parameters.get('pitch').value = 12;
      this.pitchUpNode.parameters.get('mix').value = 1.0;
      this.pitchUpNode.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('EHXPitchForkEffect: pitch-shifter worklet not available (up).', e);
    }

    try {
      this.pitchDownNode = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchDownNode.parameters.get('pitch').value = -12;
      this.pitchDownNode.parameters.get('mix').value = 1.0;
      this.pitchDownNode.parameters.get('grain').value = 55;
    } catch (e) {
      console.warn('EHXPitchForkEffect: pitch-shifter worklet not available (down).', e);
    }

    // ── Filters ────────────────────────────────────────────────
    this.antiAliasUp = audioContext.createBiquadFilter();
    this.antiAliasUp.type = 'lowpass';
    this.antiAliasUp.frequency.value = 16000;
    this.antiAliasUp.Q.value = 0.707;

    this.antiAliasDown = audioContext.createBiquadFilter();
    this.antiAliasDown.type = 'lowpass';
    this.antiAliasDown.frequency.value = 16000;
    this.antiAliasDown.Q.value = 0.707;

    this.dcBlockUp = audioContext.createBiquadFilter();
    this.dcBlockUp.type = 'highpass';
    this.dcBlockUp.frequency.value = 20;
    this.dcBlockUp.Q.value = 0.707;

    this.dcBlockDown = audioContext.createBiquadFilter();
    this.dcBlockDown.type = 'highpass';
    this.dcBlockDown.frequency.value = 20;
    this.dcBlockDown.Q.value = 0.707;

    // ── Voice gains ────────────────────────────────────────────
    this.upGain = audioContext.createGain();
    this.downGain = audioContext.createGain();
    this.directGain = audioContext.createGain();

    this.upGain.gain.value = 1.0;
    this.downGain.gain.value = 0.0;
    this.directGain.gain.value = 0.5;

    // ── Mixer + detune delay ───────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 1.0;

    // Slight detune via modulated delay for thickening
    this.detuneDelay = audioContext.createDelay(0.05);
    this.detuneDelay.delayTime.value = 0.005;

    this.detuneLFO = audioContext.createOscillator();
    this.detuneLFO.type = 'sine';
    this.detuneLFO.frequency.value = 0.3;

    this.detuneLFODepth = audioContext.createGain();
    this.detuneLFODepth.gain.value = 0.0; // off by default

    this.detuneLFO.connect(this.detuneLFODepth);
    this.detuneLFODepth.connect(this.detuneDelay.delayTime);
    this.detuneLFO.start();

    // ── Routing ────────────────────────────────────────────────
    // Up voice: input → antiAliasUp → pitchUpNode → dcBlockUp → detuneDelay → upGain → mixer
    this.input.connect(this.antiAliasUp);
    if (this.pitchUpNode) {
      this.antiAliasUp.connect(this.pitchUpNode);
      this.pitchUpNode.connect(this.dcBlockUp);
    } else {
      this.antiAliasUp.connect(this.dcBlockUp);
    }
    this.dcBlockUp.connect(this.detuneDelay);
    this.detuneDelay.connect(this.upGain);
    this.upGain.connect(this.mixer);

    // Down voice: input → antiAliasDown → pitchDownNode → dcBlockDown → downGain → mixer
    this.input.connect(this.antiAliasDown);
    if (this.pitchDownNode) {
      this.antiAliasDown.connect(this.pitchDownNode);
      this.pitchDownNode.connect(this.dcBlockDown);
    } else {
      this.antiAliasDown.connect(this.dcBlockDown);
    }
    this.dcBlockDown.connect(this.downGain);
    this.downGain.connect(this.mixer);

    // Direct: input → directGain → mixer
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // Master: mixer → wetGain → output
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Apply initial mode
    this._applyMode();

    this.params = { shift: 12, blend: 50, mode: 'up', latch: 1 };
  }

  /** Configures voice gains based on current mode */
  _applyMode() {
    const now = this.audioContext.currentTime;
    switch (this.mode) {
      case 'up':
        this.upGain.gain.setTargetAtTime(1.0, now, 0.01);
        this.downGain.gain.setTargetAtTime(0.0, now, 0.01);
        break;
      case 'down':
        this.upGain.gain.setTargetAtTime(0.0, now, 0.01);
        this.downGain.gain.setTargetAtTime(1.0, now, 0.01);
        break;
      case 'dual':
        this.upGain.gain.setTargetAtTime(0.7, now, 0.01);
        this.downGain.gain.setTargetAtTime(0.7, now, 0.01);
        break;
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'shift': {
        // Semitones: -36 to +36 (±3 octaves)
        const semitones = Math.max(-36, Math.min(36, value));
        if (this.pitchUpNode) {
          this.pitchUpNode.parameters.get('pitch').setTargetAtTime(Math.abs(semitones), now, 0.02);
          // Adjust grain for larger shifts
          const grain = 40 + Math.abs(semitones) * 1.2;
          this.pitchUpNode.parameters.get('grain').setTargetAtTime(grain, now, 0.02);
        }
        if (this.pitchDownNode) {
          this.pitchDownNode.parameters.get('pitch').setTargetAtTime(-Math.abs(semitones), now, 0.02);
          const grain = 45 + Math.abs(semitones) * 1.2;
          this.pitchDownNode.parameters.get('grain').setTargetAtTime(grain, now, 0.02);
        }
        this.params.shift = semitones;
        break;
      }
      case 'blend': {
        // Blend 0-100: direct vs shifted balance
        const t = value / 100;
        this.directGain.gain.setTargetAtTime(1.0 - t * 0.5, now, 0.02);
        // Shifted gains modulated by mode
        this._applyMode();
        this.params.blend = value;
        break;
      }
      case 'mode': {
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['up', 'down', 'dual'];
          this.mode = modes[Math.max(0, Math.min(2, Math.floor(value)))] || 'up';
        }
        this._applyMode();
        this.params.mode = this.mode;
        break;
      }
      case 'latch': {
        this.latch = value > 0.5 || value === true;
        this.params.latch = this.latch ? 1 : 0;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.detuneLFO.stop(); } catch (e) {}
    try { this.detuneLFO.disconnect(); } catch (e) {}
    try { this.detuneLFODepth.disconnect(); } catch (e) {}
    try { this.detuneDelay.disconnect(); } catch (e) {}
    try { this.antiAliasUp.disconnect(); } catch (e) {}
    try { this.antiAliasDown.disconnect(); } catch (e) {}
    try { if (this.pitchUpNode) this.pitchUpNode.disconnect(); } catch (e) {}
    try { if (this.pitchDownNode) this.pitchDownNode.disconnect(); } catch (e) {}
    try { this.dcBlockUp.disconnect(); } catch (e) {}
    try { this.dcBlockDown.disconnect(); } catch (e) {}
    try { this.upGain.disconnect(); } catch (e) {}
    try { this.downGain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EHXPitchForkEffect;
