import BaseEffect from './BaseEffect';

class EventidePitchFactorEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Eventide PitchFactor', 'eventidepitchfactor');

    // ── Mode ───────────────────────────────────────────────────
    // 'micropitch', 'hshift', 'harmonizer', 'quadravox'
    this.mode = 'micropitch';

    // ── Pitch shifter worklet nodes (two voices) ───────────────
    this.pitchNodeA = null;
    this.pitchNodeB = null;

    try {
      this.pitchNodeA = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNodeA.parameters.get('pitch').value = 0.1;
      this.pitchNodeA.parameters.get('mix').value = 1.0;
      this.pitchNodeA.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('EventidePitchFactorEffect: pitch-shifter worklet not available (A).', e);
    }

    try {
      this.pitchNodeB = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNodeB.parameters.get('pitch').value = -0.1;
      this.pitchNodeB.parameters.get('mix').value = 1.0;
      this.pitchNodeB.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('EventidePitchFactorEffect: pitch-shifter worklet not available (B).', e);
    }

    // ── Voice gains ────────────────────────────────────────────
    this.voiceAGain = audioContext.createGain();
    this.voiceBGain = audioContext.createGain();
    this.directGain = audioContext.createGain();

    this.voiceAGain.gain.value = 0.6;
    this.voiceBGain.gain.value = 0.6;
    this.directGain.gain.value = 0.7;

    // ── Pre-delay for each voice ───────────────────────────────
    this.delayA = audioContext.createDelay(1.0);
    this.delayA.delayTime.value = 0.015;

    this.delayB = audioContext.createDelay(1.0);
    this.delayB.delayTime.value = 0.020;

    // ── Feedback paths ─────────────────────────────────────────
    this.feedbackA = audioContext.createGain();
    this.feedbackA.gain.value = 0.0;

    this.feedbackB = audioContext.createGain();
    this.feedbackB.gain.value = 0.0;

    // ── Anti-alias & DC blocking ───────────────────────────────
    this.antiAliasA = audioContext.createBiquadFilter();
    this.antiAliasA.type = 'lowpass';
    this.antiAliasA.frequency.value = 14000;
    this.antiAliasA.Q.value = 0.707;

    this.antiAliasB = audioContext.createBiquadFilter();
    this.antiAliasB.type = 'lowpass';
    this.antiAliasB.frequency.value = 14000;
    this.antiAliasB.Q.value = 0.707;

    this.dcBlockA = audioContext.createBiquadFilter();
    this.dcBlockA.type = 'highpass';
    this.dcBlockA.frequency.value = 20;
    this.dcBlockA.Q.value = 0.707;

    this.dcBlockB = audioContext.createBiquadFilter();
    this.dcBlockB.type = 'highpass';
    this.dcBlockB.frequency.value = 20;
    this.dcBlockB.Q.value = 0.707;

    // ── Tone shaping (post-mix) ────────────────────────────────
    this.toneLP = audioContext.createBiquadFilter();
    this.toneLP.type = 'lowpass';
    this.toneLP.frequency.value = 12000;
    this.toneLP.Q.value = 0.707;

    // ── Mixer ──────────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 0.85;

    // ── Routing: Voice A ───────────────────────────────────────
    // input → antiAliasA → pitchNodeA → delayA → dcBlockA → voiceAGain → mixer
    this.input.connect(this.antiAliasA);
    if (this.pitchNodeA) {
      this.antiAliasA.connect(this.pitchNodeA);
      this.pitchNodeA.connect(this.delayA);
    } else {
      this.antiAliasA.connect(this.delayA);
    }
    this.delayA.connect(this.dcBlockA);
    this.dcBlockA.connect(this.voiceAGain);
    this.voiceAGain.connect(this.mixer);

    // Feedback A: dcBlockA → feedbackA → delayA
    this.dcBlockA.connect(this.feedbackA);
    this.feedbackA.connect(this.delayA);

    // ── Routing: Voice B ───────────────────────────────────────
    // input → antiAliasB → pitchNodeB → delayB → dcBlockB → voiceBGain → mixer
    this.input.connect(this.antiAliasB);
    if (this.pitchNodeB) {
      this.antiAliasB.connect(this.pitchNodeB);
      this.pitchNodeB.connect(this.delayB);
    } else {
      this.antiAliasB.connect(this.delayB);
    }
    this.delayB.connect(this.dcBlockB);
    this.dcBlockB.connect(this.voiceBGain);
    this.voiceBGain.connect(this.mixer);

    // Feedback B: dcBlockB → feedbackB → delayB
    this.dcBlockB.connect(this.feedbackB);
    this.feedbackB.connect(this.delayB);

    // ── Direct voice ───────────────────────────────────────────
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // ── Master output ──────────────────────────────────────────
    this.mixer.connect(this.toneLP);
    this.toneLP.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = {
      pitch_a: 0.1, pitch_b: -0.1, mix: 50,
      delay: 15, feedback: 0, mode: 'micropitch'
    };
  }

  /** Apply mode-specific presets */
  _applyMode() {
    const now = this.audioContext.currentTime;
    switch (this.mode) {
      case 'micropitch':
        // Subtle detuning: ±0.1 semitones
        if (this.pitchNodeA) this.pitchNodeA.parameters.get('pitch').setTargetAtTime(0.1, now, 0.02);
        if (this.pitchNodeB) this.pitchNodeB.parameters.get('pitch').setTargetAtTime(-0.1, now, 0.02);
        if (this.pitchNodeA) this.pitchNodeA.parameters.get('grain').setTargetAtTime(40, now, 0.02);
        if (this.pitchNodeB) this.pitchNodeB.parameters.get('grain').setTargetAtTime(40, now, 0.02);
        break;
      case 'hshift':
        // Larger harmonic shift
        if (this.pitchNodeA) this.pitchNodeA.parameters.get('grain').setTargetAtTime(55, now, 0.02);
        if (this.pitchNodeB) this.pitchNodeB.parameters.get('grain').setTargetAtTime(55, now, 0.02);
        break;
      case 'harmonizer':
        // Diatonic harmony intervals
        if (this.pitchNodeA) this.pitchNodeA.parameters.get('grain').setTargetAtTime(50, now, 0.02);
        if (this.pitchNodeB) this.pitchNodeB.parameters.get('grain').setTargetAtTime(50, now, 0.02);
        break;
      case 'quadravox':
        // Both voices active with wider range
        if (this.pitchNodeA) this.pitchNodeA.parameters.get('grain').setTargetAtTime(60, now, 0.02);
        if (this.pitchNodeB) this.pitchNodeB.parameters.get('grain').setTargetAtTime(60, now, 0.02);
        break;
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'pitch_a': {
        // Voice A pitch in semitones: -24 to +24
        const semi = Math.max(-24, Math.min(24, value));
        if (this.pitchNodeA) {
          this.pitchNodeA.parameters.get('pitch').setTargetAtTime(semi, now, 0.02);
        }
        this.params.pitch_a = semi;
        break;
      }
      case 'pitch_b': {
        // Voice B pitch in semitones: -24 to +24
        const semi = Math.max(-24, Math.min(24, value));
        if (this.pitchNodeB) {
          this.pitchNodeB.parameters.get('pitch').setTargetAtTime(semi, now, 0.02);
        }
        this.params.pitch_b = semi;
        break;
      }
      case 'mix': {
        // Wet/dry mix: 0-100
        const t = value / 100;
        this.directGain.gain.setTargetAtTime(1.0 - t, now, 0.02);
        this.voiceAGain.gain.setTargetAtTime(t * 0.7, now, 0.02);
        this.voiceBGain.gain.setTargetAtTime(t * 0.7, now, 0.02);
        this.params.mix = value;
        break;
      }
      case 'delay': {
        // Pre-delay in ms: 0-500
        const ms = Math.max(0, Math.min(500, value));
        const sec = ms / 1000;
        this.delayA.delayTime.setTargetAtTime(sec, now, 0.02);
        this.delayB.delayTime.setTargetAtTime(sec * 1.15, now, 0.02);
        this.params.delay = ms;
        break;
      }
      case 'feedback': {
        // Feedback amount: 0-100 → 0.0-0.85
        const fb = (value / 100) * 0.85;
        this.feedbackA.gain.setTargetAtTime(fb, now, 0.02);
        this.feedbackB.gain.setTargetAtTime(fb, now, 0.02);
        this.params.feedback = value;
        break;
      }
      case 'mode': {
        if (typeof value === 'string') {
          this.mode = value;
        } else {
          const modes = ['micropitch', 'hshift', 'harmonizer', 'quadravox'];
          this.mode = modes[Math.max(0, Math.min(3, Math.floor(value)))] || 'micropitch';
        }
        this._applyMode();
        this.params.mode = this.mode;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.antiAliasA.disconnect(); } catch (e) {}
    try { this.antiAliasB.disconnect(); } catch (e) {}
    try { if (this.pitchNodeA) this.pitchNodeA.disconnect(); } catch (e) {}
    try { if (this.pitchNodeB) this.pitchNodeB.disconnect(); } catch (e) {}
    try { this.delayA.disconnect(); } catch (e) {}
    try { this.delayB.disconnect(); } catch (e) {}
    try { this.dcBlockA.disconnect(); } catch (e) {}
    try { this.dcBlockB.disconnect(); } catch (e) {}
    try { this.feedbackA.disconnect(); } catch (e) {}
    try { this.feedbackB.disconnect(); } catch (e) {}
    try { this.voiceAGain.disconnect(); } catch (e) {}
    try { this.voiceBGain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.toneLP.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default EventidePitchFactorEffect;
