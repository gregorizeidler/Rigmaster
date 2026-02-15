import BaseEffect from './BaseEffect.js';

class StepFilterEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Step Filter', 'stepfilter');

    // STEP FILTER (Step sequencer controlled filter)

    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();

    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 10;

    // Step sequencer
    this.steps = [500, 1000, 2000, 4000, 3000, 1500, 800, 600];
    this.bpm = 120;

    // Scheduling state
    this._schedulerTimer = null;
    this._nextStepTime = 0;
    this._currentStep = 0;
    this._isRunning = false;
    this._lookAhead = 0.1; // Schedule 100ms ahead
    this._scheduleInterval = 25; // Check every 25ms
    this._glideTime = 0.005; // 5ms glide between steps

    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.filter);
    this.filter.connect(this.outputGain);
    this.outputGain.connect(this.output);

    this._startScheduler();

    this.params = { rate: 120, depth: 50, resonance: 50, steps: 8 };
  }

  _getStepDuration() {
    // 16th notes at current BPM
    return 60 / this.bpm / 4;
  }

  _startScheduler() {
    this._stopScheduler();
    this._isRunning = true;
    this._nextStepTime = this.audioContext.currentTime;
    this._currentStep = 0;

    const schedule = () => {
      if (!this._isRunning) return;

      const currentTime = this.audioContext.currentTime;
      const stepDuration = this._getStepDuration();

      // Schedule all steps that fall within the look-ahead window
      while (this._nextStepTime < currentTime + this._lookAhead) {
        const freq = this.steps[this._currentStep % this.steps.length];

        // Use linearRampToValueAtTime for smooth, click-free transitions
        this.filter.frequency.setValueAtTime(
          this.filter.frequency.value, this._nextStepTime
        );
        this.filter.frequency.linearRampToValueAtTime(
          freq, this._nextStepTime + this._glideTime
        );

        this._currentStep++;
        this._nextStepTime += stepDuration;
      }

      this._schedulerTimer = setTimeout(schedule, this._scheduleInterval);
    };

    schedule();
  }

  _stopScheduler() {
    this._isRunning = false;
    if (this._schedulerTimer !== null) {
      clearTimeout(this._schedulerTimer);
      this._schedulerTimer = null;
    }
  }

  updateParameter(parameter, value) {
    const now = this.audioContext.currentTime;

    switch (parameter) {
      case 'rate':
        this.bpm = 40 + (value / 100) * 240; // 40-280 BPM
        this._startScheduler();
        break;
      case 'depth': {
        // Adjust step frequency range
        const baseFreq = 200;
        const range = (value / 100) * 8000;
        for (let i = 0; i < this.steps.length; i++) {
          this.steps[i] = baseFreq + (range * (i / this.steps.length));
        }
        break;
      }
      case 'resonance':
        this.filter.Q.setTargetAtTime(1 + (value / 100) * 19, now, 0.02);
        break;
      case 'steps': {
        const numSteps = Math.floor(4 + (value / 100) * 12); // 4-16 steps
        // Resize steps array, generating new values if needed
        while (this.steps.length < numSteps) {
          const baseFreq = 200;
          const range = (this.params.depth || 50) / 100 * 8000;
          this.steps.push(baseFreq + range * Math.random());
        }
        this.steps.length = numSteps;
        break;
      }
      case 'glide':
        this._glideTime = 0.001 + (value / 100) * 0.099; // 1ms to 100ms
        break;
    }

    this.params[parameter] = value;
  }

  disconnect() {
    this._stopScheduler();
    try { this.filter.frequency.cancelScheduledValues(this.audioContext.currentTime); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.filter.disconnect(); } catch (e) {}
    try { this.outputGain.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default StepFilterEffect;
