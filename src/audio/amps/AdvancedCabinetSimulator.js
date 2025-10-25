import IRLoader from '../IRLoader';

/**
 * AdvancedCabinetSimulator - Visual Mic Positioning + Dual Cabinet
 * 
 * Features:
 * - Visual mic positioning (distance, angle, height)
 * - Dual cabinet blending
 * - IR loading support
 * - Real-time parameter updates
 * - Phase control
 * - Stereo spread
 */

class AdvancedCabinetSimulator {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // IR Loaders (for loaded IRs)
    this.irLoader = new IRLoader(audioContext);
    
    // Cabinet A
    this.cabinetA = {
      type: '4x12-v30',
      mic: 'sm57',
      distance: 0, // 0-50cm
      angle: 0, // 0-90 degrees
      height: 0, // -1 (low), 0 (center), 1 (high)
      filters: this.createCabinetFilters(audioContext)
    };
    
    // Cabinet B
    this.cabinetB = {
      type: '2x12-greenback',
      mic: 'ribbon',
      distance: 10,
      angle: 45,
      height: 0,
      filters: this.createCabinetFilters(audioContext)
    };
    
    // Routing
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    
    // Dual cabinet mixing
    this.cabAGain = audioContext.createGain();
    this.cabBGain = audioContext.createGain();
    this.cabAGain.gain.value = 1.0;
    this.cabBGain.gain.value = 0.0;
    
    // Stereo spread (pan)
    this.panA = audioContext.createStereoPanner();
    this.panB = audioContext.createStereoPanner();
    this.panA.pan.value = -0.5; // Left
    this.panB.pan.value = 0.5;  // Right
    
    // Phase inverter for Cabinet B
    this.phaseInverter = audioContext.createGain();
    this.phaseInverter.gain.value = 1; // 1 = normal, -1 = inverted
    
    // Mode: 'single', 'dual', 'ir'
    this.mode = 'single';
    
    // Initialize
    this.initializeSingleMode();
    this.updateCabinetAFilters();
  }
  
  /**
   * Create cabinet filter chain
   */
  createCabinetFilters(audioContext) {
    return {
      // Stage 1: Speaker resonance
      resonance: audioContext.createBiquadFilter(),
      
      // Stage 2: Cabinet lowpass (physical limit)
      cabinetLP: audioContext.createBiquadFilter(),
      
      // Stage 3: Mic highpass (DC removal)
      micHP: audioContext.createBiquadFilter(),
      
      // Stage 4: Proximity effect (bass boost)
      proximity: audioContext.createBiquadFilter(),
      
      // Stage 5: Mic presence peak
      presence: audioContext.createBiquadFilter(),
      
      // Stage 6: Mic HF rolloff
      micLP: audioContext.createBiquadFilter(),
      
      // Stage 7: Air absorption (distance)
      airLoss: audioContext.createBiquadFilter()
    };
  }
  
  /**
   * Initialize single cabinet mode
   */
  initializeSingleMode() {
    this.mode = 'single';
    this.disconnectAll();
    
    // Input → Cabinet A filters → Output
    this.connectCabinetA();
  }
  
  /**
   * Initialize dual cabinet mode
   */
  initializeDualMode() {
    this.mode = 'dual';
    this.disconnectAll();
    
    // Split to both cabinets
    this.connectCabinetA();
    this.connectCabinetB();
    
    // Mix with panning
    this.cabinetA.filters.airLoss.connect(this.panA);
    this.panA.connect(this.cabAGain);
    this.cabAGain.connect(this.output);
    
    this.cabinetB.filters.airLoss.connect(this.phaseInverter);
    this.phaseInverter.connect(this.panB);
    this.panB.connect(this.cabBGain);
    this.cabBGain.connect(this.output);
  }
  
  /**
   * Initialize IR mode
   */
  initializeIRMode() {
    this.mode = 'ir';
    this.disconnectAll();
    
    // Input → IR Loader → Output
    this.input.connect(this.irLoader.input);
    this.irLoader.output.connect(this.output);
  }
  
  /**
   * Connect Cabinet A filter chain
   */
  connectCabinetA() {
    const f = this.cabinetA.filters;
    
    this.input.connect(f.resonance);
    f.resonance.connect(f.cabinetLP);
    f.cabinetLP.connect(f.micHP);
    f.micHP.connect(f.proximity);
    f.proximity.connect(f.presence);
    f.presence.connect(f.micLP);
    f.micLP.connect(f.airLoss);
    
    if (this.mode === 'single') {
      f.airLoss.connect(this.output);
    }
  }
  
  /**
   * Connect Cabinet B filter chain
   */
  connectCabinetB() {
    const f = this.cabinetB.filters;
    
    this.input.connect(f.resonance);
    f.resonance.connect(f.cabinetLP);
    f.cabinetLP.connect(f.micHP);
    f.micHP.connect(f.proximity);
    f.proximity.connect(f.presence);
    f.presence.connect(f.micLP);
    f.micLP.connect(f.airLoss);
  }
  
  /**
   * Set mic position for Cabinet A
   */
  setMicPositionA(distance, angle, height) {
    this.cabinetA.distance = distance;
    this.cabinetA.angle = angle;
    this.cabinetA.height = height;
    this.updateCabinetAFilters();
  }
  
  /**
   * Set mic position for Cabinet B
   */
  setMicPositionB(distance, angle, height) {
    this.cabinetB.distance = distance;
    this.cabinetB.angle = angle;
    this.cabinetB.height = height;
    this.updateCabinetBFilters();
  }
  
  /**
   * Update Cabinet A filters based on mic position
   */
  updateCabinetAFilters() {
    const cab = this.cabinetA;
    const f = cab.filters;
    const now = this.audioContext.currentTime;
    
    // STAGE 1: Speaker resonance (80Hz for 4x12)
    f.resonance.type = 'peaking';
    f.resonance.frequency.setTargetAtTime(80, now, 0.01);
    f.resonance.Q.setTargetAtTime(3.5, now, 0.01);
    f.resonance.gain.setTargetAtTime(4, now, 0.01);
    
    // STAGE 2: Cabinet lowpass (5200Hz for V30)
    f.cabinetLP.type = 'lowpass';
    f.cabinetLP.frequency.setTargetAtTime(5200, now, 0.01);
    f.cabinetLP.Q.setTargetAtTime(1.2, now, 0.01);
    
    // STAGE 3: Mic highpass (80Hz for SM57)
    f.micHP.type = 'highpass';
    f.micHP.frequency.setTargetAtTime(80, now, 0.01);
    f.micHP.Q.setTargetAtTime(0.707, now, 0.01);
    
    // STAGE 4: Proximity effect (depends on distance)
    // Closer = more bass boost
    const proximityGain = (50 - cab.distance) / 10; // 0cm = +5dB, 50cm = 0dB
    f.proximity.type = 'lowshelf';
    f.proximity.frequency.setTargetAtTime(150, now, 0.01);
    f.proximity.gain.setTargetAtTime(proximityGain, now, 0.01);
    
    // STAGE 5: Mic presence (5000Hz for SM57)
    // Angle affects presence amount
    const presenceGain = 5 * (1 - cab.angle / 90); // 0° = +5dB, 90° = 0dB
    f.presence.type = 'peaking';
    f.presence.frequency.setTargetAtTime(5000, now, 0.01);
    f.presence.Q.setTargetAtTime(1.5, now, 0.01);
    f.presence.gain.setTargetAtTime(presenceGain, now, 0.01);
    
    // STAGE 6: Mic HF rolloff (12kHz for SM57)
    f.micLP.type = 'lowpass';
    f.micLP.frequency.setTargetAtTime(12000, now, 0.01);
    f.micLP.Q.setTargetAtTime(0.707, now, 0.01);
    
    // STAGE 7: Air absorption (depends on distance)
    const airLoss = -cab.distance / 10; // 0cm = 0dB, 50cm = -5dB @ HF
    f.airLoss.type = 'highshelf';
    f.airLoss.frequency.setTargetAtTime(4000, now, 0.01);
    f.airLoss.gain.setTargetAtTime(airLoss, now, 0.01);
  }
  
  /**
   * Update Cabinet B filters based on mic position
   */
  updateCabinetBFilters() {
    const cab = this.cabinetB;
    const f = cab.filters;
    const now = this.audioContext.currentTime;
    
    // STAGE 1: Speaker resonance (90Hz for 2x12)
    f.resonance.type = 'peaking';
    f.resonance.frequency.setTargetAtTime(90, now, 0.01);
    f.resonance.Q.setTargetAtTime(2.5, now, 0.01);
    f.resonance.gain.setTargetAtTime(3, now, 0.01);
    
    // STAGE 2: Cabinet lowpass (4800Hz for Greenback)
    f.cabinetLP.type = 'lowpass';
    f.cabinetLP.frequency.setTargetAtTime(4800, now, 0.01);
    f.cabinetLP.Q.setTargetAtTime(1.0, now, 0.01);
    
    // STAGE 3: Mic highpass (40Hz for Ribbon)
    f.micHP.type = 'highpass';
    f.micHP.frequency.setTargetAtTime(40, now, 0.01);
    f.micHP.Q.setTargetAtTime(0.707, now, 0.01);
    
    // STAGE 4: Proximity effect
    const proximityGain = (50 - cab.distance) / 10;
    f.proximity.type = 'lowshelf';
    f.proximity.frequency.setTargetAtTime(150, now, 0.01);
    f.proximity.gain.setTargetAtTime(proximityGain, now, 0.01);
    
    // STAGE 5: Mic presence (3000Hz for Ribbon - darker)
    const presenceGain = 2 * (1 - cab.angle / 90);
    f.presence.type = 'peaking';
    f.presence.frequency.setTargetAtTime(3000, now, 0.01);
    f.presence.Q.setTargetAtTime(0.8, now, 0.01);
    f.presence.gain.setTargetAtTime(presenceGain, now, 0.01);
    
    // STAGE 6: Mic HF rolloff (8kHz for Ribbon - darker)
    f.micLP.type = 'lowpass';
    f.micLP.frequency.setTargetAtTime(8000, now, 0.01);
    f.micLP.Q.setTargetAtTime(0.707, now, 0.01);
    
    // STAGE 7: Air absorption
    const airLoss = -cab.distance / 10;
    f.airLoss.type = 'highshelf';
    f.airLoss.frequency.setTargetAtTime(4000, now, 0.01);
    f.airLoss.gain.setTargetAtTime(airLoss, now, 0.01);
  }
  
  /**
   * Set cabinet type for Cabinet A
   */
  setCabinetAType(type) {
    this.cabinetA.type = type;
    this.updateCabinetAFilters();
  }
  
  /**
   * Set cabinet type for Cabinet B
   */
  setCabinetBType(type) {
    this.cabinetB.type = type;
    this.updateCabinetBFilters();
  }
  
  /**
   * Set mic type for Cabinet A
   */
  setMicAType(micType) {
    this.cabinetA.mic = micType;
    this.updateCabinetAFilters();
  }
  
  /**
   * Set mic type for Cabinet B
   */
  setMicBType(micType) {
    this.cabinetB.mic = micType;
    this.updateCabinetBFilters();
  }
  
  /**
   * Set dual cabinet mix (0 = A only, 100 = B only, 50 = 50/50)
   */
  setDualMix(percentage) {
    if (this.mode !== 'dual') {
      console.warn('Not in dual mode');
      return;
    }
    
    const mix = percentage / 100;
    const now = this.audioContext.currentTime;
    
    // Equal-power crossfade
    this.cabAGain.gain.setTargetAtTime(Math.cos(mix * Math.PI / 2), now, 0.01);
    this.cabBGain.gain.setTargetAtTime(Math.sin(mix * Math.PI / 2), now, 0.01);
  }
  
  /**
   * Set stereo spread (-100 = mono, 0 = natural, 100 = wide)
   */
  setStereoSpread(amount) {
    if (this.mode !== 'dual') return;
    
    const spread = amount / 100;
    const now = this.audioContext.currentTime;
    
    this.panA.pan.setTargetAtTime(-spread, now, 0.01);
    this.panB.pan.setTargetAtTime(spread, now, 0.01);
  }
  
  /**
   * Set phase for Cabinet B
   */
  setPhaseB(inverted) {
    const now = this.audioContext.currentTime;
    this.phaseInverter.gain.setTargetAtTime(inverted ? -1 : 1, now, 0.01);
  }
  
  /**
   * Load IR
   */
  async loadIR(url, channel = 'A') {
    this.initializeIRMode();
    return await this.irLoader.loadIR(url, channel);
  }
  
  /**
   * Load IR from file
   */
  async loadIRFromFile(file, channel = 'A') {
    this.initializeIRMode();
    return await this.irLoader.loadIRFromFile(file, channel);
  }
  
  /**
   * Set mode
   */
  setMode(mode) {
    switch (mode) {
      case 'single':
        this.initializeSingleMode();
        break;
      case 'dual':
        this.initializeDualMode();
        break;
      case 'ir':
        this.initializeIRMode();
        break;
    }
  }
  
  /**
   * Disconnect all
   */
  disconnectAll() {
    try { this.input.disconnect(); } catch (e) {}
    
    // Cabinet A
    Object.values(this.cabinetA.filters).forEach(filter => {
      try { filter.disconnect(); } catch (e) {}
    });
    
    // Cabinet B
    Object.values(this.cabinetB.filters).forEach(filter => {
      try { filter.disconnect(); } catch (e) {}
    });
    
    try { this.cabAGain.disconnect(); } catch (e) {}
    try { this.cabBGain.disconnect(); } catch (e) {}
    try { this.panA.disconnect(); } catch (e) {}
    try { this.panB.disconnect(); } catch (e) {}
    try { this.phaseInverter.disconnect(); } catch (e) {}
    try { this.irLoader.input.disconnect(); } catch (e) {}
    try { this.irLoader.output.disconnect(); } catch (e) {}
  }
  
  /**
   * Get mic position info
   */
  getMicPositionInfo(cabinet = 'A') {
    const cab = cabinet === 'A' ? this.cabinetA : this.cabinetB;
    
    return {
      distance: cab.distance,
      angle: cab.angle,
      height: cab.height,
      proximityGain: (50 - cab.distance) / 10,
      presenceGain: (cabinet === 'A' ? 5 : 2) * (1 - cab.angle / 90),
      airLoss: -cab.distance / 10
    };
  }
}

export default AdvancedCabinetSimulator;

