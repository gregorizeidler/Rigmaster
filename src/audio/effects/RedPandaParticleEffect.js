import BaseEffect from './BaseEffect';

/**
 * RedPandaParticleEffect - Red Panda Particle V2
 * 
 * Granular delay/pitch effect that breaks audio into tiny grains
 * and rearranges, reverses, or pitch-shifts them.
 * 
 * Features:
 * - Granular delay with variable grain density
 * - Pitch shifting via playback rate manipulation
 * - Multiple modes: delay, random, reverse
 * - Time control for grain spacing
 * - Density control for grain overlap
 * - Feedback for cascading grain effects
 */

class RedPandaParticleEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Red Panda Particle', 'redpandaparticle');

    // Multiple delay lines to simulate granular buffer
    this.grainDelays = [];
    this.grainGains = [];
    for (let i = 0; i < 4; i++) {
      const delay = audioContext.createDelay(2.0);
      delay.delayTime.value = 0.1 + i * 0.08;
      this.grainDelays.push(delay);

      const gain = audioContext.createGain();
      gain.gain.value = 0.35;
      this.grainGains.push(gain);
    }

    // Grain scatter LFOs (modulate delay times for random grain positioning)
    this.scatterLfos = [];
    this.scatterDepths = [];
    for (let i = 0; i < 4; i++) {
      const lfo = audioContext.createOscillator();
      lfo.type = 'sine';
      // Different frequencies for each grain to create irregular patterns
      lfo.frequency.value = 0.7 + i * 0.4;
      this.scatterLfos.push(lfo);

      const depth = audioContext.createGain();
      depth.gain.value = 0.0;
      this.scatterDepths.push(depth);
    }

    // Pitch shifting via playback rate modulation
    this.pitchLfo = audioContext.createOscillator();
    this.pitchLfo.type = 'sawtooth';
    this.pitchLfo.frequency.value = 50;
    this.pitchDepth = audioContext.createGain();
    this.pitchDepth.gain.value = 0.0;

    // Feedback network
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0.3;

    // Feedback filter (prevents buildup of harsh frequencies)
    this.feedbackFilter = audioContext.createBiquadFilter();
    this.feedbackFilter.type = 'lowpass';
    this.feedbackFilter.frequency.value = 6000;
    this.feedbackFilter.Q.value = 0.5;

    // Density control (crossfade between grains)
    this.densityGain = audioContext.createGain();
    this.densityGain.gain.value = 0.7;

    // Pitch shifting filter chain
    this.pitchHP = audioContext.createBiquadFilter();
    this.pitchHP.type = 'highpass';
    this.pitchHP.frequency.value = 80;
    this.pitchHP.Q.value = 0.5;

    this.pitchLP = audioContext.createBiquadFilter();
    this.pitchLP.type = 'lowpass';
    this.pitchLP.frequency.value = 8000;
    this.pitchLP.Q.value = 0.5;

    // Reverse simulation: extra long delay with modulation
    this.reverseDelay = audioContext.createDelay(2.0);
    this.reverseDelay.delayTime.value = 0.3;
    this.reverseGain = audioContext.createGain();
    this.reverseGain.gain.value = 0.0;

    this.reverseLfo = audioContext.createOscillator();
    this.reverseLfo.type = 'sawtooth';
    this.reverseLfo.frequency.value = 2.0;
    this.reverseDepth = audioContext.createGain();
    this.reverseDepth.gain.value = 0.0;

    // Output mix
    this.outGain = audioContext.createGain();
    this.outGain.gain.value = 0.6;

    // Scatter LFO routing
    for (let i = 0; i < 4; i++) {
      this.scatterLfos[i].connect(this.scatterDepths[i]);
      this.scatterDepths[i].connect(this.grainDelays[i].delayTime);
    }

    // Pitch LFO routing to scatter depths
    this.pitchLfo.connect(this.pitchDepth);
    for (let i = 0; i < 4; i++) {
      this.pitchDepth.connect(this.grainDelays[i].delayTime);
    }

    // Reverse LFO
    this.reverseLfo.connect(this.reverseDepth);
    this.reverseDepth.connect(this.reverseDelay.delayTime);

    // Start all oscillators
    for (let i = 0; i < 4; i++) {
      this.scatterLfos[i].start();
    }
    this.pitchLfo.start();
    this.reverseLfo.start();

    // Signal chain: input -> grain delays -> grain gains -> filters -> outGain
    for (let i = 0; i < 4; i++) {
      this.input.connect(this.grainDelays[i]);
      this.grainDelays[i].connect(this.grainGains[i]);
      this.grainGains[i].connect(this.densityGain);
    }

    this.densityGain.connect(this.pitchHP);
    this.pitchHP.connect(this.pitchLP);
    this.pitchLP.connect(this.outGain);

    // Reverse path
    this.input.connect(this.reverseDelay);
    this.reverseDelay.connect(this.reverseGain);
    this.reverseGain.connect(this.outGain);

    // Feedback: outGain -> feedbackFilter -> feedbackGain -> first grain delay
    this.outGain.connect(this.feedbackFilter);
    this.feedbackFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.grainDelays[0]);

    this.outGain.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.mode = 'delay';
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'time':
        // Grain time spacing: 20ms to 800ms
        const time = 0.02 + (value / 100) * 0.78;
        for (let i = 0; i < 4; i++) {
          this.grainDelays[i].delayTime.setTargetAtTime(time + i * time * 0.3, now, 0.02);
        }
        break;

      case 'density':
        // 0.2 to 1.0 — controls grain overlap
        const density = 0.2 + (value / 100) * 0.8;
        this.densityGain.gain.setTargetAtTime(density, now, 0.01);
        // Higher density = more grains active
        for (let i = 0; i < 4; i++) {
          const grainAmp = Math.min(1.0, density * (1 - i * 0.15));
          this.grainGains[i].gain.setTargetAtTime(grainAmp * 0.4, now, 0.01);
        }
        break;

      case 'pitch':
        // -12 to +12 semitones mapped as 0-100 (50 = no shift)
        const pitchShift = ((value - 50) / 50) * 0.01;
        this.pitchDepth.gain.setTargetAtTime(pitchShift, now, 0.02);
        // Adjust pitch LFO frequency for grain size
        const pitchFreq = 20 + Math.abs(value - 50) * 2;
        this.pitchLfo.frequency.setTargetAtTime(pitchFreq, now, 0.02);
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      case 'feedback':
        // 0 to 0.85
        this.feedbackGain.gain.setTargetAtTime((value / 100) * 0.85, now, 0.01);
        break;

      case 'mode':
        this.mode = value;
        this._applyMode(now);
        break;

      default:
        break;
    }
  }

  _applyMode(now) {
    switch (this.mode) {
      case 'delay':
        // Standard granular delay
        for (let i = 0; i < 4; i++) {
          this.scatterDepths[i].gain.setTargetAtTime(0.0, now, 0.02);
          this.grainGains[i].gain.setTargetAtTime(0.35, now, 0.02);
        }
        this.reverseGain.gain.setTargetAtTime(0.0, now, 0.02);
        break;

      case 'random':
        // Random grain scattering
        for (let i = 0; i < 4; i++) {
          this.scatterDepths[i].gain.setTargetAtTime(0.05 + i * 0.02, now, 0.02);
          this.grainGains[i].gain.setTargetAtTime(0.3, now, 0.02);
        }
        this.reverseGain.gain.setTargetAtTime(0.0, now, 0.02);
        break;

      case 'reverse':
        // Reverse grain simulation
        for (let i = 0; i < 4; i++) {
          this.scatterDepths[i].gain.setTargetAtTime(0.02, now, 0.02);
          this.grainGains[i].gain.setTargetAtTime(0.2, now, 0.02);
        }
        this.reverseGain.gain.setTargetAtTime(0.5, now, 0.02);
        this.reverseDepth.gain.setTargetAtTime(0.15, now, 0.02);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.grainDelays.forEach(d => d.disconnect());
      this.grainGains.forEach(g => g.disconnect());
      this.scatterLfos.forEach(l => { l.stop(); l.disconnect(); });
      this.scatterDepths.forEach(d => d.disconnect());
      this.pitchLfo.stop();
      this.pitchLfo.disconnect();
      this.pitchDepth.disconnect();
      this.reverseLfo.stop();
      this.reverseLfo.disconnect();
      this.reverseDepth.disconnect();
      this.reverseDelay.disconnect();
      this.reverseGain.disconnect();
      this.feedbackGain.disconnect();
      this.feedbackFilter.disconnect();
      this.densityGain.disconnect();
      this.pitchHP.disconnect();
      this.pitchLP.disconnect();
      this.outGain.disconnect();
    } catch (e) {}
  }
}

export default RedPandaParticleEffect;
