import BaseEffect from './BaseEffect.js';

class StepSlicerEffect extends BaseEffect {
  constructor(audioContext, id) {
    super(audioContext, id, 'Step Slicer', 'stepslicer');

    // STEP SLICER (Rhythmic gate with step sequencer)

    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.gate = audioContext.createGain();

    // Step pattern (1=on, 0=off)
    this.pattern = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0];
    this.bpm = 120;
    this.attackTime = 0.005; // 5ms attack
    this.releaseTime = 0.005; // 5ms release
    this.depth = 1.0;

    // Scheduling state
    this._schedulerTimer = null;
    this._nextStepTime = 0;
    this._currentStep = 0;
    this._isRunning = false;
    this._lookAhead = 0.1; // Schedule 100ms ahead
    this._scheduleInterval = 25; // Check every 25ms

    // Routing
    this.input.connect(this.inputGain);
    this.inputGain.connect(this.gate);
    this.gate.connect(this.outputGain);
    this.outputGain.connect(this.output);

    this._startScheduler();

    this.params = { rate: 120, depth: 100, pattern: 0, attack: 5, release: 5 };
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
        const stepValue = this.pattern[this._currentStep % this.pattern.length];

        // Apply depth: stepValue=1 → gate=1, stepValue=0 → gate=(1-depth)
        const gateOn = 1.0;
        const gateOff = 1.0 - this.depth;

        if (stepValue === 1) {
          // Gate open: ramp to 1.0
          this.gate.gain.setTargetAtTime(gateOn, this._nextStepTime, this.attackTime);
        } else {
          // Gate closed: ramp to floor
          this.gate.gain.setTargetAtTime(gateOff, this._nextStepTime, this.releaseTime);
        }

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
    switch (parameter) {
      case 'rate':
        this.bpm = 40 + (value / 100) * 240; // 40-280 BPM
        // Restart scheduler with new timing
        this._startScheduler();
        break;
      case 'depth':
        this.depth = value / 100; // 0-100%
        break;
      case 'pattern': {
        // Preset patterns
        const patterns = [
          [1, 0, 1, 0, 1, 0, 1, 0],
          [1, 1, 0, 0, 1, 1, 0, 0],
          [1, 0, 0, 1, 0, 0, 1, 0],
          [1, 1, 1, 0, 1, 0, 1, 0],
          [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0]
        ];
        this.pattern = patterns[Math.floor(value / 20)] || patterns[0];
        break;
      }
      case 'attack':
        this.attackTime = 0.001 + (value / 100) * 0.049; // 1ms to 50ms
        break;
      case 'release':
        this.releaseTime = 0.001 + (value / 100) * 0.049; // 1ms to 50ms
        break;
    }

    this.params[parameter] = value;
  }

  disconnect() {
    this._stopScheduler();
    try { this.gate.gain.cancelScheduledValues(this.audioContext.currentTime); } catch (e) {}
    try { this.inputGain.disconnect(); } catch (e) {}
    try { this.gate.disconnect(); } catch (e) {}
    try { this.outputGain.disconnect(); } catch (e) {}
    super.disconnect();
  }
}

export default StepSlicerEffect;
