import BaseEffect from './BaseEffect';

class RotaryEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Rotary Speaker', 'rotary');
    
    // Create delays for doppler effect
    this.hornDelay = audioContext.createDelay();
    this.bassDelay = audioContext.createDelay();
    
    // Filters to split frequency
    this.hornFilter = audioContext.createBiquadFilter();
    this.bassFilter = audioContext.createBiquadFilter();
    
    this.hornFilter.type = 'highpass';
    this.hornFilter.frequency.value = 800;
    
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 800;
    
    // Gains
    this.hornGain = audioContext.createGain();
    this.bassGain = audioContext.createGain();
    this.hornGain.gain.value = 0.7;
    this.bassGain.gain.value = 0.7;
    
    // LFOs for rotation
    this.hornLfo = audioContext.createOscillator();
    this.bassLfo = audioContext.createOscillator();
    this.hornLfoGain = audioContext.createGain();
    this.bassLfoGain = audioContext.createGain();
    
    this.hornLfo.type = 'triangle';
    this.bassLfo.type = 'triangle';
    this.hornLfo.frequency.value = 6.5;  // Horn spins fast
    this.bassLfo.frequency.value = 0.8;  // Bass rotor slow
    
    // Increased modulation depths for more realistic rotary effect
    this.hornLfoGain.gain.value = 0.004; // 4ms horn modulation (was 2ms)
    this.bassLfoGain.gain.value = 0.008; // 8ms bass modulation (was 4ms)
    
    // Doppler gain simulation: amplitude modulated inversely with delay
    // When the speaker moves toward you (delay decreasing), gain increases
    // and vice versa. Use separate LFOs in anti-phase (inverted) for gain.
    this.hornDopplerGain = audioContext.createGain();
    this.bassDopplerGain = audioContext.createGain();
    this.hornDopplerGain.gain.value = 1.0;
    this.bassDopplerGain.gain.value = 1.0;
    
    // Doppler LFOs (same frequency as delay LFOs, inverted via negative gain)
    this.hornDopplerLfo = audioContext.createOscillator();
    this.bassDopplerLfo = audioContext.createOscillator();
    this.hornDopplerLfoGain = audioContext.createGain();
    this.bassDopplerLfoGain = audioContext.createGain();
    
    this.hornDopplerLfo.type = 'triangle';
    this.bassDopplerLfo.type = 'triangle';
    this.hornDopplerLfo.frequency.value = 6.5;
    this.bassDopplerLfo.frequency.value = 0.8;
    
    // Negative gain = inverted phase (gain increases when delay decreases)
    this.hornDopplerLfoGain.gain.value = -0.15; // Subtle amplitude modulation
    this.bassDopplerLfoGain.gain.value = -0.10;
    
    // Connect delay LFOs
    this.hornLfo.connect(this.hornLfoGain);
    this.bassLfo.connect(this.bassLfoGain);
    this.hornLfoGain.connect(this.hornDelay.delayTime);
    this.bassLfoGain.connect(this.bassDelay.delayTime);
    
    // Connect Doppler gain LFOs (modulate the gain nodes)
    this.hornDopplerLfo.connect(this.hornDopplerLfoGain);
    this.bassDopplerLfo.connect(this.bassDopplerLfoGain);
    this.hornDopplerLfoGain.connect(this.hornDopplerGain.gain);
    this.bassDopplerLfoGain.connect(this.bassDopplerGain.gain);
    
    // Connect audio - Horn (high frequencies)
    this.input.connect(this.hornFilter);
    this.hornFilter.connect(this.hornDelay);
    this.hornDelay.connect(this.hornDopplerGain);
    this.hornDopplerGain.connect(this.hornGain);
    this.hornGain.connect(this.wetGain);
    
    // Connect audio - Bass (low frequencies)
    this.input.connect(this.bassFilter);
    this.bassFilter.connect(this.bassDelay);
    this.bassDelay.connect(this.bassDopplerGain);
    this.bassDopplerGain.connect(this.bassGain);
    this.bassGain.connect(this.wetGain);
    
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    this.hornLfo.start();
    this.bassLfo.start();
    this.hornDopplerLfo.start();
    this.bassDopplerLfo.start();
    this.setMix(0.7);
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;
    const speed = value / 100;
    
    switch (parameter) {
      case 'speed':
        // Horn: 1-11Hz, Bass: 0.3-1.8Hz
        const hornFreq = 1 + speed * 10;
        const bassFreq = 0.3 + speed * 1.5;
        this.hornLfo.frequency.setTargetAtTime(hornFreq, now, 0.05);
        this.bassLfo.frequency.setTargetAtTime(bassFreq, now, 0.05);
        // Keep Doppler LFOs in sync
        this.hornDopplerLfo.frequency.setTargetAtTime(hornFreq, now, 0.05);
        this.bassDopplerLfo.frequency.setTargetAtTime(bassFreq, now, 0.05);
        break;
      case 'balance':
        // Horn/bass balance using setTargetAtTime
        this.hornGain.gain.setTargetAtTime(value / 100, now, 0.02);
        this.bassGain.gain.setTargetAtTime(1 - (value / 100), now, 0.02);
        break;
      case 'mix':
        this.setMix(value / 100);
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.hornLfo.stop();
    this.bassLfo.stop();
    this.hornDopplerLfo.stop();
    this.bassDopplerLfo.stop();
    this.hornLfo.disconnect();
    this.bassLfo.disconnect();
    this.hornLfoGain.disconnect();
    this.bassLfoGain.disconnect();
    this.hornDopplerLfo.disconnect();
    this.bassDopplerLfo.disconnect();
    this.hornDopplerLfoGain.disconnect();
    this.bassDopplerLfoGain.disconnect();
    this.hornDopplerGain.disconnect();
    this.bassDopplerGain.disconnect();
    this.hornDelay.disconnect();
    this.bassDelay.disconnect();
    this.hornFilter.disconnect();
    this.bassFilter.disconnect();
    this.hornGain.disconnect();
    this.bassGain.disconnect();
    super.disconnect();
  }
}

export default RotaryEffect;
