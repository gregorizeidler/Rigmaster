import BaseEffect from './BaseEffect';

/**
 * MerisEnzoEffect - Meris Enzo Multi-Voice Synthesizer Pedal
 * 
 * Converts guitar signal into a synthesizer with filter, envelope, and pitch.
 * Multiple voice modes from mono synth to arpeggiated to polyphonic.
 * 
 * Features:
 * - Mono synth voice with envelope following
 * - Arpeggiator mode with rhythmic patterns
 * - Polyphonic mode for chord tracking
 * - Resonant low-pass filter with envelope
 * - Sustain/decay control
 * - Pitch shifting
 * - Sub-oscillator synthesis
 */

class MerisEnzoEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Meris Enzo', 'merisenzo');

    // Envelope follower via dynamics compressor
    this.envFollower = audioContext.createDynamicsCompressor();
    this.envFollower.threshold.value = -40;
    this.envFollower.ratio.value = 20;
    this.envFollower.attack.value = 0.005;
    this.envFollower.release.value = 0.1;

    // Resonant filter (main synth filter)
    this.synthFilter = audioContext.createBiquadFilter();
    this.synthFilter.type = 'lowpass';
    this.synthFilter.frequency.value = 2000;
    this.synthFilter.Q.value = 5.0;

    // Filter envelope LFO (simulates filter sweep)
    this.filterLfo = audioContext.createOscillator();
    this.filterLfo.type = 'sine';
    this.filterLfo.frequency.value = 0.5;
    this.filterLfoDepth = audioContext.createGain();
    this.filterLfoDepth.gain.value = 500;

    // Sub-oscillator for bass synth effect
    this.subOsc = audioContext.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 80;
    this.subOscGain = audioContext.createGain();
    this.subOscGain.gain.value = 0.0;

    // Sustain/gate node
    this.sustainGain = audioContext.createGain();
    this.sustainGain.gain.value = 1.0;

    // Waveshaper for synth-like square wave generation
    this.squareShaper = audioContext.createWaveShaper();
    this.squareShaper.curve = this._makeSquareWaveCurve();

    // Clean synth path gain
    this.synthGain = audioContext.createGain();
    this.synthGain.gain.value = 0.5;

    // Square wave path gain (mono synth character)
    this.squareGain = audioContext.createGain();
    this.squareGain.gain.value = 0.0;

    // Arpeggiator LFO (gates signal rhythmically)
    this.arpLfo = audioContext.createOscillator();
    this.arpLfo.type = 'square';
    this.arpLfo.frequency.value = 4.0;
    this.arpDepth = audioContext.createGain();
    this.arpDepth.gain.value = 0.0;

    // Arp gate gain
    this.arpGate = audioContext.createGain();
    this.arpGate.gain.value = 1.0;

    // Pitch shift delay (simple pitch shifting via modulated delay)
    this.pitchDelay = audioContext.createDelay(0.1);
    this.pitchDelay.delayTime.value = 0.01;
    this.pitchLfo = audioContext.createOscillator();
    this.pitchLfo.type = 'sawtooth';
    this.pitchLfo.frequency.value = 100;
    this.pitchLfoDepth = audioContext.createGain();
    this.pitchLfoDepth.gain.value = 0.0;

    // Tone control
    this.toneFilter = audioContext.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.value = 8000;
    this.toneFilter.Q.value = 0.5;

    // High-pass to clean up sub-frequencies
    this.inputHP = audioContext.createBiquadFilter();
    this.inputHP.type = 'highpass';
    this.inputHP.frequency.value = 60;
    this.inputHP.Q.value = 0.5;

    // Output gain
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.6;

    // Dry signal for blending
    this.dryBlend = audioContext.createGain();
    this.dryBlend.gain.value = 0.0;

    // Filter LFO routing
    this.filterLfo.connect(this.filterLfoDepth);
    this.filterLfoDepth.connect(this.synthFilter.frequency);

    // Pitch LFO routing
    this.pitchLfo.connect(this.pitchLfoDepth);
    this.pitchLfoDepth.connect(this.pitchDelay.delayTime);

    // Arp LFO routing
    this.arpLfo.connect(this.arpDepth);
    this.arpDepth.connect(this.arpGate.gain);

    // Start oscillators
    this.filterLfo.start();
    this.subOsc.start();
    this.arpLfo.start();
    this.pitchLfo.start();

    // Signal chain:
    // input -> inputHP -> envFollower -> sustainGain -> [synth paths] -> synthFilter -> toneFilter -> outGain
    this.input.connect(this.inputHP);
    this.inputHP.connect(this.envFollower);
    this.envFollower.connect(this.sustainGain);

    // Clean synth path
    this.sustainGain.connect(this.synthGain);
    this.synthGain.connect(this.arpGate);

    // Square wave synth path
    this.sustainGain.connect(this.squareShaper);
    this.squareShaper.connect(this.squareGain);
    this.squareGain.connect(this.arpGate);

    // Sub-oscillator
    this.subOsc.connect(this.subOscGain);
    this.subOscGain.connect(this.arpGate);

    // Arp gate -> pitch delay -> filter -> tone -> output
    this.arpGate.connect(this.pitchDelay);
    this.pitchDelay.connect(this.synthFilter);
    this.synthFilter.connect(this.toneFilter);
    this.toneFilter.connect(this.outGain);
    this.outGain.connect(this.wetGain);

    // Dry blend path
    this.input.connect(this.dryBlend);
    this.dryBlend.connect(this.wetGain);

    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.voice = 'mono';
  }

  _makeSquareWaveCurve() {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      // Hard clip to create square-ish wave from input
      curve[i] = x > 0 ? 0.8 : -0.8;
    }
    return curve;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'voice':
        this.voice = value;
        this._applyVoice(now);
        break;

      case 'tone':
        // 500 to 12000 Hz
        const toneFreq = 500 + (value / 100) * 11500;
        this.toneFilter.frequency.setTargetAtTime(toneFreq, now, 0.02);
        break;

      case 'sustain':
        // Controls envelope release: 0.01 to 2.0 seconds
        const release = 0.01 + (value / 100) * 1.99;
        this.envFollower.release.setTargetAtTime(release, now, 0.01);
        // Also affects sustain level
        this.sustainGain.gain.setTargetAtTime(0.5 + (value / 100) * 0.5, now, 0.02);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'filter':
        // Filter cutoff: 200 to 8000 Hz
        const filterFreq = 200 + (value / 100) * 7800;
        this.synthFilter.frequency.setTargetAtTime(filterFreq, now, 0.02);
        // Higher settings = more resonance
        const q = 1 + (value / 100) * 12;
        this.synthFilter.Q.setTargetAtTime(q, now, 0.02);
        break;

      case 'pitch':
        // Pitch shift amount: 0 = no shift, 100 = octave up
        const pitchAmt = (value / 100) * 0.005;
        this.pitchLfoDepth.gain.setTargetAtTime(pitchAmt, now, 0.02);
        // Sub-oscillator frequency tracks input
        const subFreq = 40 + (value / 100) * 80;
        this.subOsc.frequency.setTargetAtTime(subFreq, now, 0.02);
        break;

      default:
        break;
    }
  }

  _applyVoice(now) {
    // Reset all voice-specific gains
    this.synthGain.gain.setTargetAtTime(0, now, 0.01);
    this.squareGain.gain.setTargetAtTime(0, now, 0.01);
    this.subOscGain.gain.setTargetAtTime(0, now, 0.01);
    this.arpDepth.gain.setTargetAtTime(0, now, 0.01);
    this.arpGate.gain.setTargetAtTime(1.0, now, 0.01);
    this.dryBlend.gain.setTargetAtTime(0, now, 0.01);

    switch (this.voice) {
      case 'mono':
        // Mono synth: square wave + sub osc
        this.squareGain.gain.setTargetAtTime(0.5, now + 0.02, 0.01);
        this.subOscGain.gain.setTargetAtTime(0.25, now + 0.02, 0.01);
        this.synthGain.gain.setTargetAtTime(0.2, now + 0.02, 0.01);
        break;

      case 'arp':
        // Arpeggiated: square wave with rhythmic gating
        this.squareGain.gain.setTargetAtTime(0.5, now + 0.02, 0.01);
        this.arpDepth.gain.setTargetAtTime(0.5, now + 0.02, 0.01);
        this.synthGain.gain.setTargetAtTime(0.15, now + 0.02, 0.01);
        break;

      case 'poly':
        // Polyphonic: clean synth sound, more voices
        this.synthGain.gain.setTargetAtTime(0.6, now + 0.02, 0.01);
        this.subOscGain.gain.setTargetAtTime(0.15, now + 0.02, 0.01);
        break;

      case 'dry':
        // Dry blend with synth filter applied
        this.synthGain.gain.setTargetAtTime(0.3, now + 0.02, 0.01);
        this.dryBlend.gain.setTargetAtTime(0.5, now + 0.02, 0.01);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.envFollower.disconnect();
      this.synthFilter.disconnect();
      this.filterLfo.stop();
      this.subOsc.stop();
      this.arpLfo.stop();
      this.pitchLfo.stop();
      this.filterLfo.disconnect();
      this.filterLfoDepth.disconnect();
      this.subOsc.disconnect();
      this.subOscGain.disconnect();
      this.sustainGain.disconnect();
      this.squareShaper.disconnect();
      this.synthGain.disconnect();
      this.squareGain.disconnect();
      this.arpLfo.disconnect();
      this.arpDepth.disconnect();
      this.arpGate.disconnect();
      this.pitchDelay.disconnect();
      this.pitchLfo.disconnect();
      this.pitchLfoDepth.disconnect();
      this.toneFilter.disconnect();
      this.inputHP.disconnect();
      this.outGain.disconnect();
      this.dryBlend.disconnect();
    } catch (e) {}
  }
}

export default MerisEnzoEffect;
