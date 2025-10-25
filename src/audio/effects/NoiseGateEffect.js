import BaseEffect from './BaseEffect';

class NoiseGateEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Noise Gate', 'noisegate');

    // Create nodes
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 1;

    // Gate parameters
    this.threshold = -40; // dB
    this.attack = 0.001; // seconds
    this.release = 0.1; // seconds
    this.isOpen = false;

    // Analysis buffer
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect: input -> analyser -> gainNode -> wetGain -> output
    this.input.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    
    // Dry signal
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Start monitoring
    this.startMonitoring();
  }

  startMonitoring() {
    const monitor = () => {
      if (this.bypassed) {
        requestAnimationFrame(monitor);
        return;
      }

      this.analyser.getByteTimeDomainData(this.dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const normalized = (this.dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      const db = 20 * Math.log10(rms + 0.0001);

      const now = this.audioContext.currentTime;

      if (db > this.threshold) {
        // Open gate
        if (!this.isOpen) {
          this.gainNode.gain.cancelScheduledValues(now);
          this.gainNode.gain.setTargetAtTime(1, now, this.attack);
          this.isOpen = true;
        }
      } else {
        // Close gate
        if (this.isOpen) {
          this.gainNode.gain.cancelScheduledValues(now);
          this.gainNode.gain.setTargetAtTime(0, now, this.release);
          this.isOpen = false;
        }
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  }

  updateParameter(parameter, value) {
    switch (parameter) {
      case 'threshold':
        this.threshold = -60 + (value / 100) * 40; // -60dB to -20dB
        break;
      case 'attack':
        this.attack = 0.001 + (value / 100) * 0.049; // 1ms to 50ms
        break;
      case 'release':
        this.release = 0.01 + (value / 100) * 0.49; // 10ms to 500ms
        break;
      default:
        break;
    }
  }

  disconnect() {
    this.analyser.disconnect();
    this.gainNode.disconnect();
    super.disconnect();
  }
}

export default NoiseGateEffect;

