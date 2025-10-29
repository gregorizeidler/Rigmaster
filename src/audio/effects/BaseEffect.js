class BaseEffect {
  constructor(audioContext, id, name, type) {
    this.audioContext = audioContext;
    this.id = id || 'effect-' + Math.random().toString(36).substr(2, 9);
    this.name = name || 'Effect';
    this.type = type || 'effect';
    this.bypassed = false;
    
    // Create input and output nodes
    this.input = audioContext.createGain();
    this.output = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Default gain values for wet/dry mix
    // When NOT bypassed: wet=1.0, dry=0.0 (effect active)
    // When bypassed: wet=0.0, dry=1.0 (effect bypassed)
    this.wetGain.gain.value = 1.0;
    this.dryGain.gain.value = 0.0;
    
    // NOTE: Child effects MUST connect both:
    // 1. wet signal: input -> [processing] -> wetGain -> output
    // 2. dry signal: input -> dryGain -> output
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    try {
      this.input.disconnect();
    } catch (e) {}
    try {
      this.output.disconnect();
    } catch (e) {}
    try {
      this.wetGain.disconnect();
    } catch (e) {}
    try {
      this.dryGain.disconnect();
    } catch (e) {}
  }

  toggleBypass() {
    this.bypassed = !this.bypassed;
    console.log(`🔇 ${this.name} (${this.id}): toggleBypass -> ${this.bypassed ? 'BYPASSED' : 'ACTIVE'}`);
    if (this.bypassed) {
      this.wetGain.gain.value = 0.0;
      this.dryGain.gain.value = 1.0;
    } else {
      // Quando reativado, voltar ao valor padrão (100% wet)
      // Nota: Efeitos com mix customizado devem sobrescrever este método
      this.wetGain.gain.value = 1.0;
      this.dryGain.gain.value = 0.0;
    }
    console.log(`   wet: ${this.wetGain.gain.value}, dry: ${this.dryGain.gain.value}`);
    return this.bypassed;
  }

  updateParameter(parameter, value) {
    // Override in subclasses
  }

  setMix(value) {
    // value from 0 to 1
    this.wetGain.gain.value = value;
    this.dryGain.gain.value = 1 - value;
  }
}

export default BaseEffect;

