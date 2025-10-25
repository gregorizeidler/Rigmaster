/**
 * SignalRouter - Advanced Signal Routing System
 * 
 * Features:
 * - Series/Parallel routing
 * - Split/Merge with crossfade
 * - A/B/Y box simulation
 * - Effects loop (Pre/Post amp)
 * - Multiple routing configurations
 */

class SignalRouter {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Main routing nodes
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    
    // Routing mode: 'series', 'parallel', 'aby'
    this.routingMode = 'series';
    
    // Parallel paths
    this.pathA = {
      input: audioContext.createGain(),
      output: audioContext.createGain(),
      effects: []
    };
    
    this.pathB = {
      input: audioContext.createGain(),
      output: audioContext.createGain(),
      effects: []
    };
    
    // Series chain (default)
    this.seriesChain = [];
    
    // Mix controls for parallel mode
    this.pathAGain = audioContext.createGain();
    this.pathBGain = audioContext.createGain();
    this.pathAGain.gain.value = 0.5; // 50/50 mix default
    this.pathBGain.gain.value = 0.5;
    
    // Effects loop (Pre/Post amp)
    this.preAmpLoop = {
      send: audioContext.createGain(),
      return: audioContext.createGain(),
      effects: []
    };
    
    this.postAmpLoop = {
      send: audioContext.createGain(),
      return: audioContext.createGain(),
      effects: []
    };
    
    // Dry/Wet for parallel processing
    this.dryGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain.gain.value = 0.3;
    this.wetGain.gain.value = 0.7;
    
    // Initialize in series mode
    this.initializeSeriesMode();
  }
  
  /**
   * Initialize Series Mode (default)
   */
  initializeSeriesMode() {
    this.routingMode = 'series';
    this.disconnectAll();
    // Input connects directly to first effect in series chain
    // Will be connected when effects are added
  }
  
  /**
   * Initialize Parallel Mode (A/B dual path)
   */
  initializeParallelMode() {
    this.routingMode = 'parallel';
    this.disconnectAll();
    
    // Split input to both paths
    this.input.connect(this.pathA.input);
    this.input.connect(this.pathB.input);
    
    // Connect path outputs to mix gains
    this.pathA.output.connect(this.pathAGain);
    this.pathB.output.connect(this.pathBGain);
    
    // Mix to output
    this.pathAGain.connect(this.output);
    this.pathBGain.connect(this.output);
  }
  
  /**
   * Initialize A/B/Y Mode (dual amp simulation)
   */
  initializeABYMode() {
    this.routingMode = 'aby';
    this.disconnectAll();
    
    // Similar to parallel but with independent outputs
    this.input.connect(this.pathA.input);
    this.input.connect(this.pathB.input);
    
    // Paths output independently (for dual amps)
    this.pathA.output.connect(this.pathAGain);
    this.pathB.output.connect(this.pathBGain);
    
    this.pathAGain.connect(this.output);
    this.pathBGain.connect(this.output);
  }
  
  /**
   * Set routing mode
   */
  setRoutingMode(mode) {
    switch (mode) {
      case 'series':
        this.initializeSeriesMode();
        break;
      case 'parallel':
        this.initializeParallelMode();
        break;
      case 'aby':
        this.initializeABYMode();
        break;
      default:
        console.warn('Unknown routing mode:', mode);
    }
  }
  
  /**
   * Add effect to series chain
   */
  addToSeries(effect, index = -1) {
    if (index === -1) {
      this.seriesChain.push(effect);
    } else {
      this.seriesChain.splice(index, 0, effect);
    }
    this.reconnectSeries();
  }
  
  /**
   * Add effect to Path A
   */
  addToPathA(effect, index = -1) {
    if (index === -1) {
      this.pathA.effects.push(effect);
    } else {
      this.pathA.effects.splice(index, 0, effect);
    }
    this.reconnectPathA();
  }
  
  /**
   * Add effect to Path B
   */
  addToPathB(effect, index = -1) {
    if (index === -1) {
      this.pathB.effects.push(effect);
    } else {
      this.pathB.effects.splice(index, 0, effect);
    }
    this.reconnectPathB();
  }
  
  /**
   * Add effect to Pre-Amp loop
   */
  addToPreAmpLoop(effect) {
    this.preAmpLoop.effects.push(effect);
    this.reconnectPreAmpLoop();
  }
  
  /**
   * Add effect to Post-Amp loop
   */
  addToPostAmpLoop(effect) {
    this.postAmpLoop.effects.push(effect);
    this.reconnectPostAmpLoop();
  }
  
  /**
   * Reconnect series chain
   */
  reconnectSeries() {
    // Disconnect all
    try { this.input.disconnect(); } catch (e) {}
    this.seriesChain.forEach(effect => {
      try { effect.output.disconnect(); } catch (e) {}
    });
    
    if (this.seriesChain.length === 0) {
      this.input.connect(this.output);
      return;
    }
    
    // Reconnect in order
    this.input.connect(this.seriesChain[0].input);
    
    for (let i = 0; i < this.seriesChain.length - 1; i++) {
      this.seriesChain[i].output.connect(this.seriesChain[i + 1].input);
    }
    
    this.seriesChain[this.seriesChain.length - 1].output.connect(this.output);
  }
  
  /**
   * Reconnect Path A
   */
  reconnectPathA() {
    // Disconnect
    try { this.pathA.input.disconnect(); } catch (e) {}
    this.pathA.effects.forEach(effect => {
      try { effect.output.disconnect(); } catch (e) {}
    });
    
    if (this.pathA.effects.length === 0) {
      this.pathA.input.connect(this.pathA.output);
      return;
    }
    
    // Reconnect
    this.pathA.input.connect(this.pathA.effects[0].input);
    
    for (let i = 0; i < this.pathA.effects.length - 1; i++) {
      this.pathA.effects[i].output.connect(this.pathA.effects[i + 1].input);
    }
    
    this.pathA.effects[this.pathA.effects.length - 1].output.connect(this.pathA.output);
  }
  
  /**
   * Reconnect Path B
   */
  reconnectPathB() {
    // Disconnect
    try { this.pathB.input.disconnect(); } catch (e) {}
    this.pathB.effects.forEach(effect => {
      try { effect.output.disconnect(); } catch (e) {}
    });
    
    if (this.pathB.effects.length === 0) {
      this.pathB.input.connect(this.pathB.output);
      return;
    }
    
    // Reconnect
    this.pathB.input.connect(this.pathB.effects[0].input);
    
    for (let i = 0; i < this.pathB.effects.length - 1; i++) {
      this.pathB.effects[i].output.connect(this.pathB.effects[i + 1].input);
    }
    
    this.pathB.effects[this.pathB.effects.length - 1].output.connect(this.pathB.output);
  }
  
  /**
   * Reconnect Pre-Amp loop
   */
  reconnectPreAmpLoop() {
    try { this.preAmpLoop.send.disconnect(); } catch (e) {}
    this.preAmpLoop.effects.forEach(effect => {
      try { effect.output.disconnect(); } catch (e) {}
    });
    
    if (this.preAmpLoop.effects.length === 0) {
      this.preAmpLoop.send.connect(this.preAmpLoop.return);
      return;
    }
    
    this.preAmpLoop.send.connect(this.preAmpLoop.effects[0].input);
    
    for (let i = 0; i < this.preAmpLoop.effects.length - 1; i++) {
      this.preAmpLoop.effects[i].output.connect(this.preAmpLoop.effects[i + 1].input);
    }
    
    this.preAmpLoop.effects[this.preAmpLoop.effects.length - 1].output.connect(this.preAmpLoop.return);
  }
  
  /**
   * Reconnect Post-Amp loop
   */
  reconnectPostAmpLoop() {
    try { this.postAmpLoop.send.disconnect(); } catch (e) {}
    this.postAmpLoop.effects.forEach(effect => {
      try { effect.output.disconnect(); } catch (e) {}
    });
    
    if (this.postAmpLoop.effects.length === 0) {
      this.postAmpLoop.send.connect(this.postAmpLoop.return);
      return;
    }
    
    this.postAmpLoop.send.connect(this.postAmpLoop.effects[0].input);
    
    for (let i = 0; i < this.postAmpLoop.effects.length - 1; i++) {
      this.postAmpLoop.effects[i].output.connect(this.postAmpLoop.effects[i + 1].input);
    }
    
    this.postAmpLoop.effects[this.postAmpLoop.effects.length - 1].output.connect(this.postAmpLoop.return);
  }
  
  /**
   * Set parallel mix (0 = Path A only, 100 = Path B only, 50 = 50/50)
   */
  setParallelMix(percentage) {
    const mix = percentage / 100;
    const now = this.audioContext.currentTime;
    
    // Equal-power crossfade
    this.pathAGain.gain.setTargetAtTime(Math.cos(mix * Math.PI / 2), now, 0.01);
    this.pathBGain.gain.setTargetAtTime(Math.sin(mix * Math.PI / 2), now, 0.01);
  }
  
  /**
   * Set path levels independently
   */
  setPathALevel(level) {
    const now = this.audioContext.currentTime;
    this.pathAGain.gain.setTargetAtTime(level, now, 0.01);
  }
  
  setPathBLevel(level) {
    const now = this.audioContext.currentTime;
    this.pathBGain.gain.setTargetAtTime(level, now, 0.01);
  }
  
  /**
   * Remove effect
   */
  removeEffect(effect) {
    // Check all chains
    let index = this.seriesChain.indexOf(effect);
    if (index !== -1) {
      this.seriesChain.splice(index, 1);
      this.reconnectSeries();
      return;
    }
    
    index = this.pathA.effects.indexOf(effect);
    if (index !== -1) {
      this.pathA.effects.splice(index, 1);
      this.reconnectPathA();
      return;
    }
    
    index = this.pathB.effects.indexOf(effect);
    if (index !== -1) {
      this.pathB.effects.splice(index, 1);
      this.reconnectPathB();
      return;
    }
  }
  
  /**
   * Disconnect all connections
   */
  disconnectAll() {
    try { this.input.disconnect(); } catch (e) {}
    try { this.pathA.input.disconnect(); } catch (e) {}
    try { this.pathA.output.disconnect(); } catch (e) {}
    try { this.pathB.input.disconnect(); } catch (e) {}
    try { this.pathB.output.disconnect(); } catch (e) {}
    try { this.pathAGain.disconnect(); } catch (e) {}
    try { this.pathBGain.disconnect(); } catch (e) {}
  }
  
  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      mode: this.routingMode,
      seriesChain: this.seriesChain.map(e => e.id),
      pathA: this.pathA.effects.map(e => e.id),
      pathB: this.pathB.effects.map(e => e.id),
      preAmpLoop: this.preAmpLoop.effects.map(e => e.id),
      postAmpLoop: this.postAmpLoop.effects.map(e => e.id),
      pathALevel: this.pathAGain.gain.value,
      pathBLevel: this.pathBGain.gain.value
    };
  }
}

export default SignalRouter;

