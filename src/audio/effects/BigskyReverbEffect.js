/*
  BigSky-WebAudio—dual-tank + shimmer real + cloud granular (complete)
  ---------------------------------------------------------------
  This file contains:
  1) Utility to load AudioWorklet processors from strings
  2) PitchShifterGrainProcessor (AudioWorklet) — real +12/+7 shimmer capable
  3) GranularDelayProcessor (AudioWorklet) — windowed, jittered "cloud" grains
  4) BigskyReverbEffect — dual-tank with cross-feed, stereo ERs, chorale vibrato,
     shimmer-in-the-loop using PitchShifterGrain, cloud granular with windowing,
     equal-power mix law, and other small polish fixes.

  Drop-in note: this class extends your BaseEffect (same API as your original).
  You can replace your previous class by this one and wire the parameter updates the same way.
*/

import BaseEffect from './BaseEffect';

// ---------------------------------------------------------------
// 1) Utility: register AudioWorklet processors from inline strings
// ---------------------------------------------------------------
export async function registerWorkletFromString(audioContext, name, code) {
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  await audioContext.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------
// 2) PitchShifterGrainProcessor (AudioWorklet)
//    Windowed granular pitch shifter with overlap-add. Stereo-safe.
//    Parameters: semitones, grainSizeMs, overlap, mix
// ---------------------------------------------------------------
export const PitchShifterGrainProcessorCode = `
class RingBuffer {
  constructor(channels, length) {
    this.channels = channels;
    this.length = length;
    this.writeIdx = 0;
    this.readIdx = 0; // not used directly; we use per-voice heads
    this.buff = [];
    for (let c = 0; c < channels; c++) this.buff.push(new Float32Array(length));
  }
  write(input) {
    const frames = input[0].length;
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < this.channels; c++) {
        this.buff[c][this.writeIdx] = input[c][i];
      }
      this.writeIdx = (this.writeIdx + 1) % this.length;
    }
  }
  readAt(ch, idx) { return this.buff[ch][idx]; }
}

function hann(n, N){ return 0.5 * (1 - Math.cos(2*Math.PI*n/(N-1))); }

registerProcessor('pitch-shifter-grain', class PitchShifterGrain extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'semitones', defaultValue: 12, minValue: -24, maxValue: 24, automationRate: 'k-rate' },
      { name: 'grainSizeMs', defaultValue: 50, minValue: 12, maxValue: 120, automationRate: 'k-rate' },
      { name: 'overlap', defaultValue: 4, minValue: 2, maxValue: 8, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }
  constructor() {
    super();
    this.sampleRate = sampleRate;
    this.channels = 2;
    const maxDelaySec = 1.0; // 1s buffer
    this.ring = new RingBuffer(this.channels, Math.floor(this.sampleRate * maxDelaySec));

    // Two-voice OLA heads for smoother artifacts
    this.voices = [ { pos: 0, age: 0 }, { pos: 0, age: 0.5 } ]; // age: phase in [0,1)
    this.prevParams = { semitones: 12, grainSize: Math.floor(0.05*this.sampleRate), overlap: 4, mix: 1 };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) {
      for (let c=0;c<output.length;c++) output[c].fill(0);
      return true;
    }

    const chCount = Math.min(output.length, input.length || 2, 2);
    const frames = output[0].length;

    const semitones = parameters.semitones.length ? parameters.semitones[0] : this.prevParams.semitones;
    const ratio = Math.pow(2, semitones/12);
    const grainSize = Math.max(8, Math.floor(((parameters.grainSizeMs.length?parameters.grainSizeMs[0]:50)/1000)*this.sampleRate));
    const overlap = Math.max(2, Math.floor(parameters.overlap.length?parameters.overlap[0]:this.prevParams.overlap));
    const mix = parameters.mix.length?parameters.mix[0]:this.prevParams.mix;

    // Write input into ring
    // Ensure stereo shape
    const writeIn = [ new Float32Array(frames), new Float32Array(frames) ];
    for (let i=0;i<frames;i++){
      writeIn[0][i] = (input[0]?.[i]||0);
      writeIn[1][i] = (input[1]?.[i]||writeIn[0][i]);
    }
    this.ring.write(writeIn);

    // Prepare window
    if (!this.win || this.win.length !== grainSize){
      this.win = new Float32Array(grainSize);
      for(let n=0;n<grainSize;n++) this.win[n] = hann(n, grainSize);
    }

    // hop size from overlap
    const hop = Math.max(1, Math.floor(grainSize/overlap));

    for (let c=0;c<chCount;c++) output[c].fill(0);

    for (let i=0;i<frames;i++){
      // Each frame, advance voices and mix grains
      for (let v=0; v<this.voices.length; v++){
        const voice = this.voices[v];
        // When age passes 1.0, reset (start a new grain)
        if (voice.phase === undefined) voice.phase = 0;
        voice.phase += 1/hop;
        if (voice.phase >= 1){
          voice.phase -= 1;
          // Start a new grain: set read position behind write head so we have audio
          // Compute read speed inverse of ratio (pitch shift): time-scaling approach
          voice.readStep = 1/ratio;
          // Start window phase at 0
          voice.winIdx = 0;
          voice.pos = (this.ring.writeIdx - grainSize + this.ring.length) % this.ring.length;
        }
      }

      // Mix active grains
      for (let v=0; v<this.voices.length; v++){
        const voice = this.voices[v];
        if (voice.winIdx !== undefined && voice.winIdx < grainSize){
          const w = this.win[voice.winIdx];
          for (let c=0;c<chCount;c++){
            const idx = Math.floor(voice.pos) % this.ring.length;
            output[c][i] += w * this.ring.readAt(c, idx);
          }
          // advance
          voice.pos += voice.readStep;
          voice.winIdx++;
        }
      }
    }

    // Normalize by sum of windows (roughly depends on overlap/voices)
    const norm = 1 / (this.voices.length * 0.75);
    for (let c=0;c<chCount;c++){
      const dry = input[c] || input[0] || new Float32Array(frames);
      for (let i=0;i<frames;i++){
        const wet = output[c][i]*norm;
        const d = dry[i]||0;
        output[c][i] = d*(1-mix) + wet*mix;
      }
    }

    this.prevParams = { semitones, grainSize, overlap, mix };
    return true;
  }
});
`;

// ---------------------------------------------------------------
// 3) GranularDelayProcessor (AudioWorklet)
//    Windowed granular delay for "cloud" texture. Parameters: sizeMs, density, jitter, feedback, mix
// ---------------------------------------------------------------
export const GranularDelayProcessorCode = `
function hann(n, N){ return 0.5 * (1 - Math.cos(2*Math.PI*n/(N-1))); }

class DelayLine {
  constructor(channels, maxSec, sr){
    this.channels = channels; this.sr = sr;
    this.length = Math.floor(maxSec*sr);
    this.data = []; for (let c=0;c<channels;c++) this.data.push(new Float32Array(this.length));
    this.w = 0;
  }
  write(frame){
    for (let c=0;c<this.channels;c++) this.data[c][this.w] = frame[c];
    this.w = (this.w+1) % this.length;
  }
  read(ch, offset){ // offset in samples (positive = past)
    let idx = this.w - 1 - offset;
    while (idx < 0) idx += this.length;
    return this.data[ch][idx % this.length];
  }
}

registerProcessor('granular-delay', class GranularDelay extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    return [
      { name: 'sizeMs', defaultValue: 60, minValue: 20, maxValue: 250, automationRate: 'k-rate' },
      { name: 'density', defaultValue: 0.5, minValue: 0.05, maxValue: 1.5, automationRate: 'k-rate' }, // grains per 10ms
      { name: 'jitter', defaultValue: 0.1, minValue: 0, maxValue: 0.5, automationRate: 'k-rate' },
      { name: 'spreadMs', defaultValue: 120, minValue: 0, maxValue: 500, automationRate: 'k-rate' },
      { name: 'feedback', defaultValue: 0.2, minValue: 0, maxValue: 0.95, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 0.6, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }
  constructor(){
    super();
    this.sr = sampleRate; this.channels = 2;
    this.delay = new DelayLine(this.channels, 2.0, this.sr); // 2s max
    this.maxGrains = 64;
    this.grains = [];
    this.phase = 0; // scheduler phase (10ms base)
  }
  spawnGrain(sizeSamples, baseOffset, jitter, spread){
    const offsetJitter = baseOffset + Math.floor((Math.random()*2-1)*jitter*sizeSamples);
    const pan = Math.random()*2-1;
    this.grains.push({ pos: 0, size: sizeSamples, offset: Math.max(0, offsetJitter), pan });
    if (this.grains.length > this.maxGrains) this.grains.shift();
  }
  process(inputs, outputs, parameters){
    const input = inputs[0]; const output = outputs[0];
    const frames = output[0].length; const chs = Math.min(2, output.length);

    const sizeMs = parameters.sizeMs.length?parameters.sizeMs[0]:60;
    const size = Math.max(16, Math.floor(sizeMs/1000*this.sr));
    const density = parameters.density.length?parameters.density[0]:0.5; // grains per 10ms window
    const jitter = parameters.jitter.length?parameters.jitter[0]:0.1;
    const spreadMs = parameters.spreadMs.length?parameters.spreadMs[0]:120;
    const spread = Math.floor(spreadMs/1000*this.sr);
    const fb = parameters.feedback.length?parameters.feedback[0]:0.2;
    const mix = parameters.mix.length?parameters.mix[0]:0.6;

    // Precompute window
    if (!this.win || this.win.length!==size){
      this.win = new Float32Array(size); for(let n=0;n<size;n++) this.win[n]=hann(n,size);
    }

    for (let i=0;i<frames;i++){
      const inL = (input[0]?.[i])||0; const inR = (input[1]?.[i])||inL;
      // feedback write: read a tap from spread/2 and feed back
      const fbL = this.delay.read(0, spread/2|0) * fb;
      const fbR = this.delay.read(1, spread/2|0) * fb;
      this.delay.write([inL + fbL, inR + fbR]);

      // Grain scheduler (every 128 samples ~ 3ms at 44.1k) but scaled to get ~10ms resolution
      this.phase++;
      if (this.phase >= 128){
        this.phase = 0;
        const grainsToSpawn = Math.min(4, Math.floor(density));
        const prob = density - grainsToSpawn;
        let count = grainsToSpawn + (Math.random()<prob?1:0);
        while (count-->0) this.spawnGrain(size, spread, jitter, spread);
      }

      // Clear output sample
      for (let c=0;c<chs;c++) output[c][i]=0;

      // Render grains (sum)
      for (let g=0; g<this.grains.length; g++){
        const gr = this.grains[g];
        if (gr.pos < gr.size){
          const w = this.win[gr.pos];
          const sL = this.delay.read(0, gr.offset + gr.pos);
          const sR = this.delay.read(1, gr.offset + gr.pos);
          // simple constant-power pan
          const p = (gr.pan+1)*0.5; // 0..1
          const gl = Math.cos(0.5*Math.PI*p);
          const grr = Math.sin(0.5*Math.PI*p);
          output[0][i] += w * (sL*gl + sR*(1-gl)*0.3);
          output[1][i] += w * (sR*grr + sL*(1-grr)*0.3);
          gr.pos++;
        }
      }
      // Remove finished grains occasionally
      if ((i & 63) === 0) this.grains = this.grains.filter(g=>g.pos<g.size);

      // Mix dry in (pre-mix here just in case node is used standalone)
      output[0][i] = input[0] ? input[0][i]*(1-mix) + output[0][i]*mix : output[0][i];
      output[1][i] = input[1] ? input[1][i]*(1-mix) + output[1][i]*mix : output[1][i];
    }
    return true;
  }
});
`;

// ---------------------------------------------------------------
// 4) BigskyReverbEffect — dual-tank + cross-feed + shimmer/chorale/cloud polish
// ---------------------------------------------------------------
class BigskyReverbEffect extends BaseEffect {
  static workletsInitialized = false;

  static async initWorklets(ctx){
    if (BigskyReverbEffect.workletsInitialized) return;
    await registerWorkletFromString(ctx, 'pitch-shifter-grain', PitchShifterGrainProcessorCode);
    await registerWorkletFromString(ctx, 'granular-delay', GranularDelayProcessorCode);
    BigskyReverbEffect.workletsInitialized = true;
    console.log('✓ BigSky AudioWorklets initialized');
  }

  constructor(audioContext, id){
    super(audioContext, id, 'BigSky Reverb', 'bigskyreverb');

    // Ensure worklets are loaded
    if (!BigskyReverbEffect.workletsInitialized) {
      BigskyReverbEffect.initWorklets(audioContext).catch(e => {
        console.warn('Failed to init worklets in constructor:', e);
      });
    }

    // ====== TYPES ======
    this.reverbTypes = {
      room: 'Room', hall: 'Hall', plate: 'Plate', spring: 'Spring',
      swell: 'Swell', bloom: 'Bloom', cloud: 'Cloud', chorale: 'Chorale',
      magneto: 'Magneto', nonlinear: 'Nonlinear', reflections: 'Reflections',
      shimmer: 'Shimmer'
    };
    this.currentType = 'hall';

    // ====== PRE-DELAY & TONE ======
    this.preDelay = audioContext.createDelay(2.0); this.preDelay.delayTime.value = 0.02;

    this.lowCut = audioContext.createBiquadFilter(); this.lowCut.type='highpass'; this.lowCut.frequency.value = 80; this.lowCut.Q.value=0.707;
    this.highCut = audioContext.createBiquadFilter(); this.highCut.type='lowpass'; this.highCut.frequency.value = 10000; this.highCut.Q.value=0.707;
    this.dampingFilter = audioContext.createBiquadFilter(); this.dampingFilter.type='lowpass'; this.dampingFilter.frequency.value=5000; this.dampingFilter.Q.value=0.707;

    // ====== EARLY REFLECTIONS (true stereo, asymmetrical) ======
    this.earlyL = []; this.earlyR = [];
    const earlyTimesL = [0.007,0.013,0.021,0.034,0.048,0.063];
    const earlyTimesR = [0.009,0.017,0.027,0.039,0.052,0.071];
    const earlyGainsL = [0.9,0.75,0.62,0.5,0.4,0.3];
    const earlyGainsR = [0.85,0.7,0.58,0.48,0.38,0.28];
    for (let i=0;i<6;i++){
      const dL = audioContext.createDelay(0.1); dL.delayTime.value = earlyTimesL[i];
      const gL = audioContext.createGain(); gL.gain.value = earlyGainsL[i];
      this.earlyL.push({d:dL,g:gL});
      const dR = audioContext.createDelay(0.1); dR.delayTime.value = earlyTimesR[i];
      const gR = audioContext.createGain(); gR.gain.value = earlyGainsR[i];
      this.earlyR.push({d:dR,g:gR});
    }

    // ====== DUAL TANK: comb banks (per channel) ======
    this.combDelaysL = [0.0297,0.0371,0.0411,0.0437,0.0503,0.0571];
    this.combDelaysR = [0.0311,0.0359,0.0403,0.0461,0.0527,0.0607];
    this.combL = []; this.combR = [];
    const mkComb = (t)=>{ const d=audioContext.createDelay(10.0); d.delayTime.value=t; const fb=audioContext.createGain(); fb.gain.value=0.84; const lp=audioContext.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=5000; return {d,fb,lp}; };
    for (const t of this.combDelaysL) this.combL.push(mkComb(t));
    for (const t of this.combDelaysR) this.combR.push(mkComb(t));

    // ====== Allpass chains per channel (Schroeder) ======
    const apTimesL = [0.0051,0.0067,0.0083,0.0097];
    const apTimesR = [0.0057,0.0073,0.0089,0.0107];
    this.apL = apTimesL.map(t=>this.makeSchroederAllpass(audioContext,t,0.7));
    this.apR = apTimesR.map(t=>this.makeSchroederAllpass(audioContext,t,0.7));

    this.diffuseL = audioContext.createGain(); this.diffuseL.gain.value = 0.8;
    this.diffuseR = audioContext.createGain(); this.diffuseR.gain.value = 0.8;

    // ====== Cross-feed between tanks ======
    this.crossLtoR = audioContext.createGain(); this.crossRtoL = audioContext.createGain();
    this.crossLtoR.gain.value = 0.07; this.crossRtoL.gain.value = 0.07;

    // ====== Late mixers per channel ======
    this.lateL = audioContext.createGain(); this.lateR = audioContext.createGain();
    this.lateL.gain.value = 1.0; this.lateR.gain.value = 1.0;

    // ====== Chorale vibrato (post-late) ======
    this.vibratoDL = audioContext.createDelay(0.02); this.vibratoDR = audioContext.createDelay(0.02);
    this.vibratoDL.delayTime.value = 0.006; this.vibratoDR.delayTime.value = 0.006;
    this.vibratoLFO1 = audioContext.createOscillator(); this.vibratoLFO2 = audioContext.createOscillator();
    this.vibDepth1 = audioContext.createGain(); this.vibDepth2 = audioContext.createGain();
    this.vibratoLFO1.type='sine'; this.vibratoLFO2.type='sine';
    this.vibratoLFO1.frequency.value=0.35; this.vibratoLFO2.frequency.value=0.47;
    this.vibDepth1.gain.value=0; this.vibDepth2.gain.value=0; // enabled in chorale
    this.vibratoLFO1.connect(this.vibDepth1); this.vibratoLFO2.connect(this.vibDepth2);
    this.vibDepth1.connect(this.vibratoDL.delayTime); this.vibDepth2.connect(this.vibratoDR.delayTime);
    this.vibratoLFO1.start(); this.vibratoLFO2.start();

    // ====== Shimmer & Cloud (AudioWorklet nodes - create async) ======
    this.shifterUp = null;
    this.cloud = null;
    this.initWorkletNodes();

    this.shimmerFB = audioContext.createGain(); this.shimmerFB.gain.value = 0.0; // start disabled
    this.shimmerTone = audioContext.createBiquadFilter(); this.shimmerTone.type='lowpass'; this.shimmerTone.frequency.value=8500;

    // ====== Envelope follower for nonlinear (gate/reverse) ======
    this.gateEnvelope = audioContext.createGain(); this.gateEnvelope.gain.value = 1.0;
    this.detRect = this.makeRectifier(audioContext);
    this.detLPF = audioContext.createBiquadFilter(); this.detLPF.type='lowpass'; this.detLPF.frequency.value=15;
    this.detGain = audioContext.createGain(); this.detGain.gain.value=1.5;
    this.detGain.connect(this.gateEnvelope.gain);

    // ====== Mixers ======
    this.earlyMixerL = audioContext.createGain(); this.earlyMixerR = audioContext.createGain();
    this.earlyMixerL.gain.value=0.2; this.earlyMixerR.gain.value=0.2;

    this.reverbMixL = audioContext.createGain(); this.reverbMixR = audioContext.createGain();

    this.outputGain = audioContext.createGain(); this.outputGain.gain.value = 1.0;

    // ====== Routing ======
    this.setupRouting();

    // Safe init state
    this.mix = 0.5; this.updateMix(50);
    this.setReverbType(this.currentType);
  }

  async initWorkletNodes() {
    if (!BigskyReverbEffect.workletsInitialized) {
      await BigskyReverbEffect.initWorklets(this.audioContext);
    }

    try {
      // Shimmer: pitch shifters inside the feedback path
      this.shifterUp = new AudioWorkletNode(this.audioContext, 'pitch-shifter-grain', { 
        numberOfInputs:1, 
        numberOfOutputs:1, 
        outputChannelCount:[2] 
      });
      this.shifterUp.parameters.get('semitones').value = 12;
      this.shifterUp.parameters.get('grainSizeMs').value = 60;
      this.shifterUp.parameters.get('overlap').value = 4;
      this.shifterUp.parameters.get('mix').value = 1;

      // Cloud granular (windowed)
      this.cloud = new AudioWorkletNode(this.audioContext, 'granular-delay', { 
        numberOfInputs:1, 
        numberOfOutputs:1, 
        outputChannelCount:[2]
      });
      this.cloud.parameters.get('sizeMs').value = 70;
      this.cloud.parameters.get('density').value = 0.6;
      this.cloud.parameters.get('jitter').value = 0.12;
      this.cloud.parameters.get('spreadMs').value = 160;
      this.cloud.parameters.get('feedback').value = 0.18;
      this.cloud.parameters.get('mix').value = 0.7;
    } catch (e) {
      console.warn('Failed to create BigSky worklet nodes:', e);
    }
  }

  makeSchroederAllpass(ctx, time, g=0.7){
    const input = ctx.createGain();
    const delay = ctx.createDelay(0.2); delay.delayTime.value=time;
    const ff = ctx.createGain(); ff.gain.value=-g; const fb = ctx.createGain(); fb.gain.value=g;
    const sum1 = ctx.createGain(); const apOut = ctx.createGain();
    input.connect(sum1); fb.connect(sum1);
    sum1.connect(delay); delay.connect(apOut); input.connect(ff); ff.connect(apOut);
    apOut.connect(fb);
    return { input, output: apOut, delay, ff, fb, sum1, apOut };
  }

  makeRectifier(ctx){
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(65536);
    for (let i=0;i<65536;i++){ const x=(i-32768)/32768; curve[i]=Math.abs(x); }
    shaper.curve = curve; shaper.oversample = '4x';
    return shaper;
  }

  setupRouting(){
    // In -> predelay -> lowcut
    this.input.connect(this.preDelay); this.preDelay.connect(this.lowCut);

    // ER stereo
    for (const {d,g} of this.earlyL){ this.lowCut.connect(d); d.connect(g); g.connect(this.earlyMixerL); }
    for (const {d,g} of this.earlyR){ this.lowCut.connect(d); d.connect(g); g.connect(this.earlyMixerR); }

    // Tanks L
    const tankInL = this.lowCut;
    this.combMixerL = this.audioContext.createGain();
    for (const {d,fb,lp} of this.combL){ tankInL.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); d.connect(this.combMixerL); }
    let apInL = this.combMixerL; for (const ap of this.apL){ apInL.connect(ap.input); apInL=ap.output; }
    apInL.connect(this.diffuseL); this.diffuseL.connect(this.dampingFilter); // share damping

    // Tanks R
    const tankInR = this.lowCut;
    this.combMixerR = this.audioContext.createGain();
    for (const {d,fb,lp} of this.combR){ tankInR.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); d.connect(this.combMixerR); }
    let apInR = this.combMixerR; for (const ap of this.apR){ apInR.connect(ap.input); apInR=ap.output; }
    apInR.connect(this.diffuseR); this.diffuseR.connect(this.dampingFilter);

    // Shared damping -> highCut -> split to L/R late paths
    this.dampingFilter.connect(this.highCut);
    const splitLate = this.audioContext.createChannelSplitter(2);
    const mergeLate = this.audioContext.createChannelMerger(2);
    this.highCut.connect(splitLate);
    splitLate.connect(this.lateL,0); splitLate.connect(this.lateR,1);

    // Cross-feed (small amount from each late into the opposite tank input)
    this.lateL.connect(this.crossLtoR); this.lateR.connect(this.crossRtoL);
    this.crossLtoR.connect(this.combMixerR); this.crossRtoL.connect(this.combMixerL);

    // Detector from combined late (sum)
    const lateSum = this.audioContext.createGain();
    this.lateL.connect(lateSum); this.lateR.connect(lateSum);
    lateSum.connect(this.detRect); this.detRect.connect(this.detLPF); this.detLPF.connect(this.detGain);

    // Shimmer in the loop: late sum -> pitch up -> tone -> feedback to lowCut
    if (this.shifterUp) {
      lateSum.connect(this.shifterUp); 
      this.shifterUp.connect(this.shimmerTone); 
      this.shimmerTone.connect(this.shimmerFB); 
      this.shimmerFB.connect(this.lowCut);
    }

    // Chorale vibrato: per-channel vibrato after late
    this.lateL.connect(this.vibratoDL); this.lateR.connect(this.vibratoDR);

    // Cloud granular fed from lowCut (early in the loop), mixed as a parallel branch
    if (this.cloud) {
      this.lowCut.connect(this.cloud);
    }

    // Gate envelope VCA on late sum (affects both channels equally)
    const gateBus = this.audioContext.createGain();
    this.vibratoDL.connect(gateBus); this.vibratoDR.connect(gateBus);
    gateBus.connect(this.gateEnvelope);

    // Build stereo from branches: ER L/R, gate late (stereo), cloud (stereo)
    const cloudSplit = this.audioContext.createChannelSplitter(2);
    if (this.cloud) {
      this.cloud.connect(cloudSplit);
    }

    // Equal-power reverb mix per channel
    const reMixMerger = this.audioContext.createChannelMerger(2);
    this.earlyMixerL.connect(this.reverbMixL); this.earlyMixerR.connect(this.reverbMixR);
    // gateEnvelope is mono here; split to stereo
    const gateSplit = this.audioContext.createChannelSplitter(2);
    const gateOut = this.audioContext.createGain(); this.gateEnvelope.connect(gateOut);
    gateOut.connect(gateSplit);

    gateSplit.connect(this.reverbMixL,0); gateSplit.connect(this.reverbMixR,1);
    if (this.cloud) {
      cloudSplit.connect(this.reverbMixL,0); cloudSplit.connect(this.reverbMixR,1);
    }

    // Stereo out of reverbMix to output
    this.reverbMixL.connect(reMixMerger,0,0); this.reverbMixR.connect(reMixMerger,0,1);
    reMixMerger.connect(this.outputGain);

    // Wet/Dry and output
    this.outputGain.connect(this.wetGain); this.wetGain.connect(this.output);
    this.input.connect(this.dryGain); this.dryGain.connect(this.output);
  }

  // ---------- Controls ----------
  setReverbType(type){
    const now = this.audioContext.currentTime; this.currentType = type;

    const setComb = v => this.setCombFeedback(v);
    const setVibrato = (depthMs, rateL, rateR) => {
      this.vibDepth1.gain.setTargetAtTime(depthMs, now, 0.01);
      this.vibDepth2.gain.setTargetAtTime(depthMs, now, 0.01);
      this.vibratoLFO1.frequency.setTargetAtTime(rateL, now, 0.01);
      this.vibratoLFO2.frequency.setTargetAtTime(rateR, now, 0.01);
    };

    // reset branches defaults
    this.earlyMixerL.gain.setTargetAtTime(0.2, now, 0.01);
    this.earlyMixerR.gain.setTargetAtTime(0.2, now, 0.01);
    this.shimmerFB.gain.setTargetAtTime(0.0, now, 0.02);
    setVibrato(0, 0.35, 0.47);

    switch(type){
      case 'room':
        setComb(0.70); this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        this.diffuseL.gain.setTargetAtTime(0.6, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.6, now, 0.01);
        break;
      case 'hall':
        setComb(0.88); this.dampingFilter.frequency.setTargetAtTime(4500, now, 0.01);
        this.diffuseL.gain.setTargetAtTime(0.85, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.85, now, 0.01);
        break;
      case 'plate':
        setComb(0.85); this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.diffuseL.gain.setTargetAtTime(0.92, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.92, now, 0.01);
        break;
      case 'spring':
        setComb(0.75); this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.highCut.frequency.setTargetAtTime(6000, now, 0.01);
        break;
      case 'swell':
        setComb(0.92); this.dampingFilter.frequency.setTargetAtTime(5000, now, 0.01);
        this.detLPF.frequency.setTargetAtTime(5, now, 0.01); // slower attack
        break;
      case 'bloom':
        setComb(0.95); this.dampingFilter.frequency.setTargetAtTime(4000, now, 0.01);
        this.diffuseL.gain.setTargetAtTime(0.95, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.95, now, 0.01);
        break;
      case 'cloud':
        setComb(0.90); this.dampingFilter.frequency.setTargetAtTime(6000, now, 0.01);
        if (this.cloud) {
          this.cloud.parameters.get('mix').setTargetAtTime(0.75, now, 0.01);
        }
        break;
      case 'chorale':
        setComb(0.88); this.dampingFilter.frequency.setTargetAtTime(7000, now, 0.01);
        setVibrato(0.004, 0.28, 0.41); // ~4ms depth, slow LFOs
        break;
      case 'magneto':
        setComb(0.82); this.dampingFilter.frequency.setTargetAtTime(3500, now, 0.01);
        break;
      case 'nonlinear':
        setComb(0.80); this.diffuseL.gain.setTargetAtTime(0.7, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.7, now, 0.01);
        this.detGain.gain.setTargetAtTime(2.0, now, 0.01); this.detLPF.frequency.setTargetAtTime(10, now, 0.01);
        break;
      case 'reflections':
        this.earlyMixerL.gain.setTargetAtTime(1.0, now, 0.01); this.earlyMixerR.gain.setTargetAtTime(1.0, now, 0.01);
        this.diffuseL.gain.setTargetAtTime(0.0, now, 0.01); this.diffuseR.gain.setTargetAtTime(0.0, now, 0.01);
        break;
      case 'shimmer':
        setComb(0.90); this.dampingFilter.frequency.setTargetAtTime(8000, now, 0.01);
        this.shimmerFB.gain.setTargetAtTime(0.32, now, 0.02);
        break;
    }
  }

  setCombFeedback(value){
    const now = this.audioContext.currentTime; const v = Math.max(0.5, Math.min(0.98, value));
    const apply = (bank)=>{ for (let i=0;i<bank.length;i++){ const variation = 1 - (i*0.01); bank[i].fb.gain.setTargetAtTime(v*variation, now, 0.01);} };
    apply(this.combL); apply(this.combR);
  }

  updateParameter(parameter, value){
    const now = this.audioContext.currentTime;
    switch(parameter){
      case 'decay':{ const fb = 0.5 + (value/100)*0.48; this.setCombFeedback(fb); break; }
      case 'predelay':{ const t=(value/100)*0.5; this.preDelay.delayTime.setTargetAtTime(t, now, 0.01); break; }
      case 'tone':{
        const f = 1000 + (value/100)*11000; this.dampingFilter.frequency.setTargetAtTime(f, now, 0.01);
        for (const c of this.combL) c.lp.frequency.setTargetAtTime(f, now, 0.01);
        for (const c of this.combR) c.lp.frequency.setTargetAtTime(f, now, 0.01);
        break; }
      case 'mod':{ /* keep for LFO depth if you add more modulation */ break; }
      case 'speed':{ /* reserved */ break; }
      case 'diffuse':{
        const d = value/100; this.diffuseL.gain.setTargetAtTime(d, now, 0.01); this.diffuseR.gain.setTargetAtTime(d, now, 0.01);
        const ap = 0.5 + (d*0.3);
        for (const a of this.apL){ a.ff.gain.setTargetAtTime(-ap, now, 0.01); a.fb.gain.setTargetAtTime(ap, now, 0.01); }
        for (const a of this.apR){ a.ff.gain.setTargetAtTime(-ap, now, 0.01); a.fb.gain.setTargetAtTime(ap, now, 0.01); }
        break; }
      case 'lowcut':{ const f = 20 + (value/100)*480; this.lowCut.frequency.setTargetAtTime(f, now, 0.01); break; }
      case 'highcut':{ const f = 2000 + (value/100)*18000; this.highCut.frequency.setTargetAtTime(f, now, 0.01); break; }
      case 'type': this.setReverbType(value); break;
      case 'mix': this.updateMix(value); break;
      case 'value1': this.value1=value; this.updateMachineSpecificParams(); break;
      case 'value2': this.value2=value; this.updateMachineSpecificParams(); break;
      case 'value3': this.value3=value; this.updateMachineSpecificParams(); break;
      default: super.updateParameter(parameter, value); break;
    }
  }

  updateMachineSpecificParams(){
    const now = this.audioContext.currentTime;
    switch(this.currentType){
      case 'shimmer':
      case 'chorale': {
        const amt = (this.value1??50)/100; // shimmer amount
        this.shimmerFB.gain.setTargetAtTime(0.15 + 0.35*amt, now, 0.02);
        const tone = 3000 + ((this.value2??50)/100)*7000; this.shimmerTone.frequency.setTargetAtTime(tone, now, 0.02);
        break; }
      case 'cloud':{
        if (!this.cloud) break;
        const dens = (this.value1??50)/100; // 0..1.0 mapped to density
        const size = 40 + ((this.value2??50)/100)*140; // ms
        this.cloud.parameters.get('density').setTargetAtTime(0.2 + dens*1.2, now, 0.01);
        this.cloud.parameters.get('sizeMs').setTargetAtTime(size, now, 0.01);
        break; }
      case 'nonlinear':{
        const sens = 1.0 + ((this.value1??50)/100)*2.0; this.detGain.gain.setTargetAtTime(sens, now, 0.05);
        const lpf = 6 + (1 - (this.value2??50)/100) * 14; this.detLPF.frequency.setTargetAtTime(lpf, now, 0.05);
        break; }
      case 'reflections':{
        const er = (this.value1??50)/100; this.earlyMixerL.gain.setTargetAtTime(er, now, 0.01); this.earlyMixerR.gain.setTargetAtTime(er, now, 0.01);
        break; }
      case 'chorale':{
        const depth = 0.002 + ((this.value1??50)/100)*0.006; // 2..8 ms
        this.vibDepth1.gain.setTargetAtTime(depth, now, 0.02); this.vibDepth2.gain.setTargetAtTime(depth, now, 0.02);
        break; }
    }
  }

  getParameters(){
    return {
      type: this.currentType,
      predelay: (this.preDelay.delayTime.value/0.5)*100,
      tone: ((this.dampingFilter.frequency.value-1000)/11000)*100,
      diffuse: this.diffuseL.gain.value*100,
      lowcut: ((this.lowCut.frequency.value-20)/480)*100,
      highcut: ((this.highCut.frequency.value-2000)/18000)*100,
      mix: (this.mix??0.5)*100,
      value1: this.value1??50,
      value2: this.value2??50,
      value3: this.value3??50
    };
  }

  // Equal-power mix (cos/sin) for stable perceived loudness
  updateMix(value){
    this.mix = value/100; const now=this.audioContext.currentTime;
    const wet = Math.sin(0.5*Math.PI*this.mix);
    const dry = Math.cos(0.5*Math.PI*this.mix);
    this.wetGain.gain.setTargetAtTime(wet, now, 0.01);
    this.dryGain.gain.setTargetAtTime(dry, now, 0.01);
  }

  disconnect(){
    super.disconnect();
    try{
      // stop LFOs
      this.vibratoLFO1?.stop?.(); this.vibratoLFO2?.stop?.();
      
      // Disconnect worklet nodes
      if (this.shifterUp) this.shifterUp.disconnect();
      if (this.cloud) this.cloud.disconnect();
      
      // Disconnect all other nodes
      for (const {d,g} of [...this.earlyL, ...this.earlyR]) { d.disconnect(); g.disconnect(); }
      for (const {d,fb,lp} of [...this.combL, ...this.combR]) { d.disconnect(); fb.disconnect(); lp.disconnect(); }
      for (const ap of [...this.apL, ...this.apR]) { 
        ap.input.disconnect(); ap.output.disconnect(); ap.ff.disconnect(); ap.fb.disconnect(); 
      }
    } catch(e){
      console.warn('Error disconnecting BigSky:', e);
    }
  }
}

export default BigskyReverbEffect;
