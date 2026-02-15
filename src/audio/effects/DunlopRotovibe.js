import BaseEffect from './BaseEffect';

/**
 * DunlopRotovibe - Dunlop Rotovibe
 * 
 * Rotary speaker simulation with speed ramp up/down.
 * Classic Uni-Vibe style modulation with expression pedal control.
 * 
 * Features:
 * - Rotary speaker simulation with horn/drum separation
 * - Speed ramp (slow-to-fast transition like a Leslie)
 * - Chorus and vibrato modes
 * - Amplitude modulation for rotary effect
 * - Dual LFOs for horn and drum simulation
 */

class DunlopRotovibe extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Dunlop Rotovibe', 'dunloprotovibe');

    // Horn simulation: fast-spinning high-frequency component
    this.hornFilter = audioContext.createBiquadFilter();
    this.hornFilter.type = 'highpass';
    this.hornFilter.frequency.value = 800;
    this.hornFilter.Q.value = 0.5;

    // Drum simulation: slow-spinning low-frequency component
    this.drumFilter = audioContext.createBiquadFilter();
    this.drumFilter.type = 'lowpass';
    this.drumFilter.frequency.value = 800;
    this.drumFilter.Q.value = 0.5;

    // Delay lines for pitch modulation (Doppler effect)
    this.hornDelay = audioContext.createDelay(0.05);
    this.hornDelay.delayTime.value = 0.004;
    this.drumDelay = audioContext.createDelay(0.05);
    this.drumDelay.delayTime.value = 0.006;

    // Horn LFO (faster, for treble rotation)
    this.hornLfo = audioContext.createOscillator();
    this.hornLfo.type = 'sine';
    this.hornLfo.frequency.value = 6.0;
    this.hornLfoDepth = audioContext.createGain();
    this.hornLfoDepth.gain.value = 0.002;

    // Drum LFO (slower, for bass rotation)
    this.drumLfo = audioContext.createOscillator();
    this.drumLfo.type = 'sine';
    this.drumLfo.frequency.value = 1.0;
    this.drumLfoDepth = audioContext.createGain();
    this.drumLfoDepth.gain.value = 0.003;

    // Amplitude modulation gains (simulates volume change as speaker rotates)
    this.hornAmpMod = audioContext.createGain();
    this.hornAmpMod.gain.value = 0.8;
    this.drumAmpMod = audioContext.createGain();
    this.drumAmpMod.gain.value = 0.8;

    // AM LFOs (same frequency as pitch LFOs but for amplitude)
    this.hornAmpLfo = audioContext.createOscillator();
    this.hornAmpLfo.type = 'sine';
    this.hornAmpLfo.frequency.value = 6.0;
    this.hornAmpLfoDepth = audioContext.createGain();
    this.hornAmpLfoDepth.gain.value = 0.3;

    this.drumAmpLfo = audioContext.createOscillator();
    this.drumAmpLfo.type = 'sine';
    this.drumAmpLfo.frequency.value = 1.0;
    this.drumAmpLfoDepth = audioContext.createGain();
    this.drumAmpLfoDepth.gain.value = 0.2;

    // Chorus mix gain (direct signal for chorus mode)
    this.chorusDirect = audioContext.createGain();
    this.chorusDirect.gain.value = 0.5;

    // Combiner
    this.mixNode = audioContext.createGain();
    this.mixNode.gain.value = 0.7;

    // Pitch modulation: LFOs -> delay times
    this.hornLfo.connect(this.hornLfoDepth);
    this.hornLfoDepth.connect(this.hornDelay.delayTime);
    this.drumLfo.connect(this.drumLfoDepth);
    this.drumLfoDepth.connect(this.drumDelay.delayTime);

    // Amplitude modulation: AM LFOs -> gain nodes
    this.hornAmpLfo.connect(this.hornAmpLfoDepth);
    this.hornAmpLfoDepth.connect(this.hornAmpMod.gain);
    this.drumAmpLfo.connect(this.drumAmpLfoDepth);
    this.drumAmpLfoDepth.connect(this.drumAmpMod.gain);

    // Signal chain
    // Horn path: input -> hornFilter -> hornDelay -> hornAmpMod -> mixNode
    this.input.connect(this.hornFilter);
    this.hornFilter.connect(this.hornDelay);
    this.hornDelay.connect(this.hornAmpMod);
    this.hornAmpMod.connect(this.mixNode);

    // Drum path: input -> drumFilter -> drumDelay -> drumAmpMod -> mixNode
    this.input.connect(this.drumFilter);
    this.drumFilter.connect(this.drumDelay);
    this.drumDelay.connect(this.drumAmpMod);
    this.drumAmpMod.connect(this.mixNode);

    // Chorus direct path
    this.input.connect(this.chorusDirect);
    this.chorusDirect.connect(this.mixNode);

    this.mixNode.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Start all oscillators
    this.hornLfo.start();
    this.drumLfo.start();
    this.hornAmpLfo.start();
    this.drumAmpLfo.start();

    // Mode: 'chorus' or 'vibrato'
    this.mode = 'chorus';
    // Target speed for ramping
    this._targetSpeed = 1.0;
  }

  updateParameter(param, value) {
    const now = this.audioContext.currentTime;

    switch (param) {
      case 'speed':
        // 0.5 to 8 Hz base speed
        this._targetSpeed = 0.5 + (value / 100) * 7.5;
        // Horn is faster than drum (real Leslie behavior)
        const hornSpeed = this._targetSpeed * 1.8;
        const drumSpeed = this._targetSpeed * 0.6;
        // Ramp to speed (simulates motor acceleration)
        this.hornLfo.frequency.setTargetAtTime(hornSpeed, now, 0.3);
        this.drumLfo.frequency.setTargetAtTime(drumSpeed, now, 0.8);
        this.hornAmpLfo.frequency.setTargetAtTime(hornSpeed, now, 0.3);
        this.drumAmpLfo.frequency.setTargetAtTime(drumSpeed, now, 0.8);
        break;

      case 'depth':
        // Modulation depth
        const d = value / 100;
        this.hornLfoDepth.gain.setTargetAtTime(d * 0.003, now, 0.01);
        this.drumLfoDepth.gain.setTargetAtTime(d * 0.005, now, 0.01);
        this.hornAmpLfoDepth.gain.setTargetAtTime(d * 0.35, now, 0.01);
        this.drumAmpLfoDepth.gain.setTargetAtTime(d * 0.25, now, 0.01);
        break;

      case 'mode':
        this.mode = value;
        if (this.mode === 'vibrato') {
          this.chorusDirect.gain.setTargetAtTime(0.0, now, 0.02);
          this.mixNode.gain.setTargetAtTime(0.85, now, 0.02);
        } else {
          this.chorusDirect.gain.setTargetAtTime(0.5, now, 0.02);
          this.mixNode.gain.setTargetAtTime(0.7, now, 0.02);
        }
        break;

      case 'mix':
        this.setMix(value / 100);
        break;

      default:
        break;
    }
  }

  disconnect() {
    super.disconnect();
    try {
      this.hornFilter.disconnect();
      this.drumFilter.disconnect();
      this.hornDelay.disconnect();
      this.drumDelay.disconnect();
      this.hornLfo.stop();
      this.drumLfo.stop();
      this.hornAmpLfo.stop();
      this.drumAmpLfo.stop();
      this.hornLfo.disconnect();
      this.drumLfo.disconnect();
      this.hornAmpLfo.disconnect();
      this.drumAmpLfo.disconnect();
      this.hornLfoDepth.disconnect();
      this.drumLfoDepth.disconnect();
      this.hornAmpLfoDepth.disconnect();
      this.drumAmpLfoDepth.disconnect();
      this.hornAmpMod.disconnect();
      this.drumAmpMod.disconnect();
      this.chorusDirect.disconnect();
      this.mixNode.disconnect();
    } catch (e) {}
  }
}

export default DunlopRotovibe;
