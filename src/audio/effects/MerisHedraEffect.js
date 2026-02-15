import BaseEffect from './BaseEffect';

class MerisHedraEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Meris Hedra', 'merishedra');

    // ── Pitch shifter worklet nodes (three voices) ─────────────
    this.pitchNodeA = null;
    this.pitchNodeB = null;
    this.pitchNodeC = null;

    try {
      this.pitchNodeA = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNodeA.parameters.get('pitch').value = 4;  // Major 3rd default
      this.pitchNodeA.parameters.get('mix').value = 1.0;
      this.pitchNodeA.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('MerisHedraEffect: pitch-shifter worklet not available (A).', e);
    }

    try {
      this.pitchNodeB = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNodeB.parameters.get('pitch').value = 7;  // Perfect 5th default
      this.pitchNodeB.parameters.get('mix').value = 1.0;
      this.pitchNodeB.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('MerisHedraEffect: pitch-shifter worklet not available (B).', e);
    }

    try {
      this.pitchNodeC = new AudioWorkletNode(audioContext, 'pitch-shifter');
      this.pitchNodeC.parameters.get('pitch').value = 12; // Octave default
      this.pitchNodeC.parameters.get('mix').value = 1.0;
      this.pitchNodeC.parameters.get('grain').value = 50;
    } catch (e) {
      console.warn('MerisHedraEffect: pitch-shifter worklet not available (C).', e);
    }

    // ── Voice gains ────────────────────────────────────────────
    this.voiceAGain = audioContext.createGain();
    this.voiceBGain = audioContext.createGain();
    this.voiceCGain = audioContext.createGain();
    this.directGain = audioContext.createGain();

    this.voiceAGain.gain.value = 0.5;
    this.voiceBGain.gain.value = 0.5;
    this.voiceCGain.gain.value = 0.5;
    this.directGain.gain.value = 0.7;

    // ── Anti-alias filters ─────────────────────────────────────
    this.aaFilterA = audioContext.createBiquadFilter();
    this.aaFilterA.type = 'lowpass';
    this.aaFilterA.frequency.value = 14000;
    this.aaFilterA.Q.value = 0.707;

    this.aaFilterB = audioContext.createBiquadFilter();
    this.aaFilterB.type = 'lowpass';
    this.aaFilterB.frequency.value = 14000;
    this.aaFilterB.Q.value = 0.707;

    this.aaFilterC = audioContext.createBiquadFilter();
    this.aaFilterC.type = 'lowpass';
    this.aaFilterC.frequency.value = 14000;
    this.aaFilterC.Q.value = 0.707;

    // ── DC blockers ────────────────────────────────────────────
    this.dcBlockA = audioContext.createBiquadFilter();
    this.dcBlockA.type = 'highpass';
    this.dcBlockA.frequency.value = 20;
    this.dcBlockA.Q.value = 0.707;

    this.dcBlockB = audioContext.createBiquadFilter();
    this.dcBlockB.type = 'highpass';
    this.dcBlockB.frequency.value = 20;
    this.dcBlockB.Q.value = 0.707;

    this.dcBlockC = audioContext.createBiquadFilter();
    this.dcBlockC.type = 'highpass';
    this.dcBlockC.frequency.value = 20;
    this.dcBlockC.Q.value = 0.707;

    // ── Glide delay for portamento effect ──────────────────────
    // Implemented via pitch transition smoothing time constant
    this._glideTime = 0.05; // Default 50ms glide

    // ── Feedback network ───────────────────────────────────────
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.0;

    this.feedbackDelay = audioContext.createDelay(1.0);
    this.feedbackDelay.delayTime.value = 0.15;

    this.feedbackLP = audioContext.createBiquadFilter();
    this.feedbackLP.type = 'lowpass';
    this.feedbackLP.frequency.value = 6000;
    this.feedbackLP.Q.value = 0.5;

    // ── Mixer ──────────────────────────────────────────────────
    this.mixer = audioContext.createGain();
    this.mixer.gain.value = 0.75;

    // ── Routing: Voice A ───────────────────────────────────────
    this.input.connect(this.aaFilterA);
    if (this.pitchNodeA) {
      this.aaFilterA.connect(this.pitchNodeA);
      this.pitchNodeA.connect(this.dcBlockA);
    } else {
      this.aaFilterA.connect(this.dcBlockA);
    }
    this.dcBlockA.connect(this.voiceAGain);
    this.voiceAGain.connect(this.mixer);

    // ── Routing: Voice B ───────────────────────────────────────
    this.input.connect(this.aaFilterB);
    if (this.pitchNodeB) {
      this.aaFilterB.connect(this.pitchNodeB);
      this.pitchNodeB.connect(this.dcBlockB);
    } else {
      this.aaFilterB.connect(this.dcBlockB);
    }
    this.dcBlockB.connect(this.voiceBGain);
    this.voiceBGain.connect(this.mixer);

    // ── Routing: Voice C ───────────────────────────────────────
    this.input.connect(this.aaFilterC);
    if (this.pitchNodeC) {
      this.aaFilterC.connect(this.pitchNodeC);
      this.pitchNodeC.connect(this.dcBlockC);
    } else {
      this.aaFilterC.connect(this.dcBlockC);
    }
    this.dcBlockC.connect(this.voiceCGain);
    this.voiceCGain.connect(this.mixer);

    // ── Direct ─────────────────────────────────────────────────
    this.input.connect(this.directGain);
    this.directGain.connect(this.mixer);

    // ── Feedback: mixer → feedbackDelay → feedbackLP → feedbackGain → input re-entry
    this.mixer.connect(this.feedbackDelay);
    this.feedbackDelay.connect(this.feedbackLP);
    this.feedbackLP.connect(this.feedbackGain);
    // Feedback re-enters the voice chains via the AA filters
    this.feedbackGain.connect(this.aaFilterA);
    this.feedbackGain.connect(this.aaFilterB);
    this.feedbackGain.connect(this.aaFilterC);

    // ── Master output ──────────────────────────────────────────
    this.mixer.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry bypass: input → dryGain → output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.params = {
      pitch_a: 4, pitch_b: 7, pitch_c: 12,
      mix: 50, feedback: 0, glide: 5
    };
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'pitch_a': {
        // Voice A interval in semitones: -24 to +24
        const semi = Math.max(-24, Math.min(24, value));
        if (this.pitchNodeA) {
          this.pitchNodeA.parameters.get('pitch').setTargetAtTime(semi, now, this._glideTime);
        }
        this.params.pitch_a = semi;
        break;
      }
      case 'pitch_b': {
        const semi = Math.max(-24, Math.min(24, value));
        if (this.pitchNodeB) {
          this.pitchNodeB.parameters.get('pitch').setTargetAtTime(semi, now, this._glideTime);
        }
        this.params.pitch_b = semi;
        break;
      }
      case 'pitch_c': {
        const semi = Math.max(-24, Math.min(24, value));
        if (this.pitchNodeC) {
          this.pitchNodeC.parameters.get('pitch').setTargetAtTime(semi, now, this._glideTime);
        }
        this.params.pitch_c = semi;
        break;
      }
      case 'mix': {
        // Mix 0-100: balance between direct and pitched voices
        const t = value / 100;
        this.directGain.gain.setTargetAtTime(1.0 - t * 0.7, now, 0.02);
        this.voiceAGain.gain.setTargetAtTime(t * 0.6, now, 0.02);
        this.voiceBGain.gain.setTargetAtTime(t * 0.6, now, 0.02);
        this.voiceCGain.gain.setTargetAtTime(t * 0.6, now, 0.02);
        this.params.mix = value;
        break;
      }
      case 'feedback': {
        // Feedback 0-100 → 0.0-0.80
        const fb = (value / 100) * 0.80;
        this.feedbackGain.gain.setTargetAtTime(fb, now, 0.02);
        this.params.feedback = value;
        break;
      }
      case 'glide': {
        // Glide speed 0-100 → 0.005s-0.5s time constant
        this._glideTime = 0.005 + (value / 100) * 0.495;
        this.params.glide = value;
        break;
      }
      default:
        break;
    }
  }

  disconnect() {
    try { this.aaFilterA.disconnect(); } catch (e) {}
    try { this.aaFilterB.disconnect(); } catch (e) {}
    try { this.aaFilterC.disconnect(); } catch (e) {}
    try { if (this.pitchNodeA) this.pitchNodeA.disconnect(); } catch (e) {}
    try { if (this.pitchNodeB) this.pitchNodeB.disconnect(); } catch (e) {}
    try { if (this.pitchNodeC) this.pitchNodeC.disconnect(); } catch (e) {}
    try { this.dcBlockA.disconnect(); } catch (e) {}
    try { this.dcBlockB.disconnect(); } catch (e) {}
    try { this.dcBlockC.disconnect(); } catch (e) {}
    try { this.voiceAGain.disconnect(); } catch (e) {}
    try { this.voiceBGain.disconnect(); } catch (e) {}
    try { this.voiceCGain.disconnect(); } catch (e) {}
    try { this.directGain.disconnect(); } catch (e) {}
    try { this.feedbackGain.disconnect(); } catch (e) {}
    try { this.feedbackDelay.disconnect(); } catch (e) {}
    try { this.feedbackLP.disconnect(); } catch (e) {}
    try { this.mixer.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default MerisHedraEffect;
