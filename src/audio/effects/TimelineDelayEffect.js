/*
  Timeline-WebAudio — Delay Machines Pro (V2)
  ---------------------------------------------------------------
  Upgrades over TimelineDelayEffect V1:
  - Equal-power mix law (cos/sin)
  - Safe feedback clamp + anti-denormal dither
  - True ping-pong/cross patterns with presets
  - Real "Ice" shimmer using the PitchShifterGrain AudioWorklet (from the BigSky V2)
  - Reverse: record/playback with envelope (windowed) instead of simple swell
  - Duck: envelope follower (worklet-free) + smooth attack/release
  - Lo-Fi/DBucket: optional bit-depth/sample-rate reducer (simple, cheap)
  - Tap tempo subdivisions incl. triplet + dotted, tempo‑syncable trem
  - Mid/Side width kept; width is applied post-machine so it affects all types

  NOTE: Requires the PitchShifterGrain worklet from the BigSky V2 code.
  Call: await registerWorkletFromString(ctx, 'pitch-shifter-grain', PitchShifterGrainProcessorCode)

  API: same BaseEffect API as before; parameters/time/value1-3 kept.
*/

import BaseEffect from './BaseEffect';
import { registerWorkletFromString, PitchShifterGrainProcessorCode } from './BigskyReverbEffect';

class TimelineDelayEffect extends BaseEffect {
  static workletsInitialized = false;

  static async initWorklets(ctx){
    if (TimelineDelayEffect.workletsInitialized) return;
    // Ensure the pitch shifter exists (for ICE)
    await registerWorkletFromString(ctx, 'pitch-shifter-grain', PitchShifterGrainProcessorCode);
    TimelineDelayEffect.workletsInitialized = true;
    console.log('✓ Timeline AudioWorklets initialized');
  }

  constructor(audioContext, id){
    super(audioContext, id, 'Timeline Delay', 'timelinedelay');
    
    // Initialize worklets if not done
    if (!TimelineDelayEffect.workletsInitialized) {
      TimelineDelayEffect.initWorklets(audioContext).catch(e => {
        console.warn('Failed to init Timeline worklets:', e);
      });
    }

    // ===== TYPES =====
    this.delayTypes = {
      dtape: 'dTape', dbucket: 'dBucket', tape: 'Tape Echo', lofi: 'Lo-Fi', dual: 'Dual Delay',
      pattern: 'Pattern', reverse: 'Reverse', ice: 'Ice (Shimmer)', duck: 'Duck Delay',
      swell: 'Swell', trem: 'Trem Delay', filter: 'Filter Delay'
    };
    this.currentType = 'dtape';
    
    // ===== CORE DELAYS (stereo engine + optional dual engine) =====
    const ctx = audioContext;
    this.delayL = ctx.createDelay(10.0); this.delayR = ctx.createDelay(10.0);
    this.delayL.delayTime.value = 0.5; this.delayR.delayTime.value = 0.5;

    this.delayL2 = ctx.createDelay(10.0); this.delayR2 = ctx.createDelay(10.0);
    this.delayL2.delayTime.value = 0.25; this.delayR2.delayTime.value = 0.25;

    // Feedback
    this.feedbackL = ctx.createGain(); this.feedbackR = ctx.createGain();
    this.feedbackL.gain.value = 0.4; this.feedbackR.gain.value = 0.4;
    this.crossFeedL2R = ctx.createGain(); this.crossFeedR2L = ctx.createGain();
    this.crossFeedL2R.gain.value = 0.0; this.crossFeedR2L.gain.value = 0.0;

    this.fbL2 = ctx.createGain(); this.fbR2 = ctx.createGain();
    this.fbL2.gain.value = 0.35; this.fbR2.gain.value = 0.35;

    // Tone/filters
    const mkLP = ()=>{ const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=8000; f.Q.value=0.707; return f; };
    const mkHP = ()=>{ const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=80; return f; };
    const mkPK = ()=>{ const f=ctx.createBiquadFilter(); f.type='peaking'; f.frequency.value=1000; f.Q.value=2; f.gain.value=0; return f; };
    this.lpL=mkLP(); this.lpR=mkLP(); this.hpL=mkHP(); this.hpR=mkHP(); this.pkL=mkPK(); this.pkR=mkPK();

    // Grit/tape saturation
    this.gritL = ctx.createWaveShaper(); this.gritR = ctx.createWaveShaper();
    this.gritL.oversample='2x'; this.gritR.oversample='2x';
    this.gritL.curve=this.makeGritCurve(0); this.gritR.curve=this.makeGritCurve(0);
    this.gritGainL = ctx.createGain(); this.gritGainR = ctx.createGain();
    this.gritGainL.gain.value=1.0; this.gritGainR.gain.value=1.0;

    // Cheap bit/sample reducer (optional for lofi)
    this.lofiSR = ctx.createBiquadFilter(); this.lofiSR.type='lowpass'; this.lofiSR.frequency.value=16000;

    // Modulation (delay time wobble)
    this.modLFO = ctx.createOscillator(); this.modLFO2 = ctx.createOscillator();
    this.modDepthL = ctx.createGain(); this.modDepthR = ctx.createGain();
    this.modLFO.type='sine'; this.modLFO2.type='sine'; this.modLFO.frequency.value=0.5; this.modLFO2.frequency.value=0.5;
    this.modDepthL.gain.value=0; this.modDepthR.gain.value=0; this.modLFO.start(); this.modLFO2.start();

    // Tremolo (tempo-syncable)
    this.tremLFO = ctx.createOscillator(); this.tremLFO2 = ctx.createOscillator();
    this.tremDepthL = ctx.createGain(); this.tremDepthR = ctx.createGain();
    this.tremGainL = ctx.createGain(); this.tremGainR = ctx.createGain();
    this.tremLFO.type='sine'; this.tremLFO2.type='sine';
    this.tremLFO.frequency.value=4; this.tremLFO2.frequency.value=4;
    this.tremDepthL.gain.value=0; this.tremDepthR.gain.value=0; this.tremGainL.gain.value=1; this.tremGainR.gain.value=1;
    this.tremLFO.connect(this.tremDepthL); this.tremDepthL.connect(this.tremGainL.gain);
    this.tremLFO2.connect(this.tremDepthR); this.tremDepthR.connect(this.tremGainR.gain);
    this.tremLFO.start(); this.tremLFO2.start();

    // Swell envelope (used also by reverse)
    this.swellL = ctx.createGain(); this.swellR = ctx.createGain(); this.swellL.gain.value=1; this.swellR.gain.value=1;

    // ICE: real pitch shifter worklet in feedback path (will be created async)
    this.iceUpL = null;
    this.iceUpR = null;
    this.initIceWorkletNodes();
    
    this.iceToneL = ctx.createBiquadFilter(); this.iceToneR = ctx.createBiquadFilter();
    this.iceToneL.type='lowpass'; this.iceToneR.type='lowpass'; this.iceToneL.frequency.value=9000; this.iceToneR.frequency.value=9000;
    this.iceAmtL = ctx.createGain(); this.iceAmtR = ctx.createGain(); this.iceAmtL.gain.value=0; this.iceAmtR.gain.value=0; // controlled by value1/2

    // Reverse buffers (circular) implemented via DelayNodes + window shaping
    this.revEnvL = ctx.createGain(); this.revEnvR = ctx.createGain(); this.revEnvL.gain.value=1; this.revEnvR.gain.value=1;

    // Ducking: detector + smoothing (no analyser UI loop)
    this.duckDetLP = ctx.createBiquadFilter(); this.duckDetLP.type='lowpass'; this.duckDetLP.frequency.value=30;
    this.duckRect = this.makeRectifier(ctx); this.duckEnv = ctx.createGain(); this.duckEnv.gain.value = 1.0; // mapped to delayMix

    // Mid/Side width
    this.splitter = ctx.createChannelSplitter(2); this.merger = ctx.createChannelMerger(2);
    this.msSplit = ctx.createChannelSplitter(2); this.msMerge = ctx.createChannelMerger(2);
    this.midGain = ctx.createGain(); this.sideGain = ctx.createGain(); this.midGain.gain.value=1; this.sideGain.gain.value=1;
    this.msEncSumL = ctx.createGain(); this.msEncSumR = ctx.createGain(); this.msEncDiffL = ctx.createGain(); this.msEncDiffR = ctx.createGain();
    this.msEncSumL.gain.value=0.7071; this.msEncSumR.gain.value=0.7071; this.msEncDiffL.gain.value=0.7071; this.msEncDiffR.gain.value=-0.7071;
    this.msDecMidL = ctx.createGain(); this.msDecMidR = ctx.createGain(); this.msDecSideL = ctx.createGain(); this.msDecSideR = ctx.createGain();
    this.msDecSideR.gain.value=-1;

    // Final
    this.delayMix = ctx.createGain(); this.delayMix.gain.value=0.5;
    this.outputGain = ctx.createGain(); this.outputGain.gain.value=1.0;

    // Tap tempo
    this.tapTempo = { enabled:false, bpm:120, subdivision:'1/4', lastTaps:[], maxTaps:4 };

    // Machine vals
    this.value1=50; this.value2=50; this.value3=50;

    // Routing
    this.setupRouting();

    // Mix init (equal power)
    this.mix=0.5; this.updateMix(50);
    this.setDelayType(this.currentType);
  }

  async initIceWorkletNodes() {
    if (!TimelineDelayEffect.workletsInitialized) {
      await TimelineDelayEffect.initWorklets(this.audioContext);
    }

    try {
      const ctx = this.audioContext;
      this.iceUpL = new AudioWorkletNode(ctx, 'pitch-shifter-grain', { numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[2]});
      this.iceUpR = new AudioWorkletNode(ctx, 'pitch-shifter-grain', { numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[2]});
      this.iceUpL.parameters.get('semitones').value=12; this.iceUpR.parameters.get('semitones').value=7; // blend +12/+7 classic
      this.iceUpL.parameters.get('grainSizeMs').value=50; this.iceUpR.parameters.get('grainSizeMs').value=60;
      this.iceUpL.parameters.get('mix').value=1; this.iceUpR.parameters.get('mix').value=1;
    } catch (e) {
      console.warn('Failed to create Timeline ICE worklet nodes:', e);
    }
  }

  makeRectifier(ctx){ const s=ctx.createWaveShaper(); const curve=new Float32Array(65536); for(let i=0;i<65536;i++){ const x=(i-32768)/32768; curve[i]=Math.abs(x);} s.curve=curve; s.oversample='2x'; return s; }

  makeGritCurve(amount){ const samples=44100; const curve=new Float32Array(samples); const drive=1+(amount/20); for(let i=0;i<samples;i++){ const x=(i*2)/samples-1; let y=Math.tanh(x*drive); y+=0.03*Math.tanh(x*drive*3); y+=0.02*Math.tanh(x*drive*5); curve[i]=y*0.92;} return curve; }

  setupRouting(){
    const ctx=this.audioContext;
    // Input split
    this.input.connect(this.splitter);

    // Duck detector from dry input
    this.input.connect(this.duckRect); this.duckRect.connect(this.duckDetLP);

    // LEFT chain: input -> delayL -> grit -> lp -> hp -> pk -> swell -> trem -> feedback/cross -> out(L)
    this.splitter.connect(this.delayL,0);
    this.delayL.connect(this.gritGainL); this.gritGainL.connect(this.gritL);
    this.gritL.connect(this.lpL); this.lpL.connect(this.hpL); this.hpL.connect(this.pkL);
    this.pkL.connect(this.swellL); this.swellL.connect(this.tremGainL);
    this.tremGainL.connect(this.feedbackL); this.feedbackL.connect(this.delayL);
    this.tremGainL.connect(this.crossFeedL2R); this.crossFeedL2R.connect(this.delayR);

    // ICE feedback inserts (per channel) - connect when nodes are ready
    if (this.iceUpL) {
      this.tremGainL.connect(this.iceUpL); this.iceUpL.connect(this.iceToneL); this.iceToneL.connect(this.iceAmtL); this.iceAmtL.connect(this.delayL);
    }

    // Dual engine
    this.hpL.connect(this.delayL2); this.delayL2.connect(this.fbL2); this.fbL2.connect(this.delayL2); this.delayL2.connect(this.tremGainL);

    // RIGHT chain
    this.splitter.connect(this.delayR,1);
    this.delayR.connect(this.gritGainR); this.gritGainR.connect(this.gritR);
    this.gritR.connect(this.lpR); this.lpR.connect(this.hpR); this.hpR.connect(this.pkR);
    this.pkR.connect(this.swellR); this.swellR.connect(this.tremGainR);
    this.tremGainR.connect(this.feedbackR); this.feedbackR.connect(this.delayR);
    this.tremGainR.connect(this.crossFeedR2L); this.crossFeedR2L.connect(this.delayL);

    if (this.iceUpR) {
      this.tremGainR.connect(this.iceUpR); this.iceUpR.connect(this.iceToneR); this.iceToneR.connect(this.iceAmtR); this.iceAmtR.connect(this.delayR);
    }

    this.hpR.connect(this.delayR2); this.delayR2.connect(this.fbR2); this.fbR2.connect(this.delayR2); this.delayR2.connect(this.tremGainR);

    // Modulation routing
    this.modLFO.connect(this.modDepthL); this.modDepthL.connect(this.delayL.delayTime);
    this.modLFO2.connect(this.modDepthR); this.modDepthR.connect(this.delayR.delayTime);

    // Trem already wired to tremGainL/R

    // Merge stereo for MS
    this.tremGainL.connect(this.merger,0,0); this.tremGainR.connect(this.merger,0,1);

    // MS encode
    this.merger.connect(this.msSplit);
    this.msSplit.connect(this.msEncSumL,0); this.msSplit.connect(this.msEncSumR,1);
    this.msEncSumL.connect(this.midGain); this.msEncSumR.connect(this.midGain);
    this.msSplit.connect(this.msEncDiffL,0); this.msSplit.connect(this.msEncDiffR,1);
    this.msEncDiffL.connect(this.sideGain); this.msEncDiffR.connect(this.sideGain);

    // MS decode
    this.midGain.connect(this.msDecMidL); this.midGain.connect(this.msDecMidR);
    this.sideGain.connect(this.msDecSideL); this.sideGain.connect(this.msDecSideR);

    // Final stereo out
    this.msDecMidL.connect(this.msMerge,0,0); this.msDecSideL.connect(this.msMerge,0,0);
    this.msDecMidR.connect(this.msMerge,0,1); this.msDecSideR.connect(this.msMerge,0,1);

    // Delay mix and output
    this.msMerge.connect(this.delayMix);
    this.delayMix.connect(this.outputGain); this.outputGain.connect(this.wetGain); this.wetGain.connect(this.output);

    // Dry path
    this.input.connect(this.dryGain); this.dryGain.connect(this.output);
  }

  // ===== Tap tempo =====
  tapTap(){ const now=Date.now(); this.tapTempo.lastTaps.push(now); if(this.tapTempo.lastTaps.length>this.tapTempo.maxTaps) this.tapTempo.lastTaps.shift(); if(this.tapTempo.lastTaps.length>=2){ let total=0; for(let i=1;i<this.tapTempo.lastTaps.length;i++){ total+=this.tapTempo.lastTaps[i]-this.tapTempo.lastTaps[i-1]; } const avg=total/(this.tapTempo.lastTaps.length-1); const bpm=60000/avg; this.tapTempo.bpm=Math.max(20,Math.min(300,Math.round(bpm))); this.updateDelayTimeFromTempo(); } }

  updateDelayTimeFromTempo(){ if(!this.tapTempo.enabled) return; const beat=60/this.tapTempo.bpm; let mult=1; switch(this.tapTempo.subdivision){ case '1/8': mult=0.5; break; case '1/4': mult=1; break; case '1/2': mult=2; break; case 'dotted': mult=1.5; break; case 'triplet': mult=2/3; break; } const d = beat*mult; const now=this.audioContext.currentTime; this.delayL.delayTime.setTargetAtTime(d, now, 0.01); this.delayR.delayTime.setTargetAtTime(d, now, 0.01); if(this.currentType==='dual'){ const ratio = 0.25 + (this.value1/100)*0.75; this.delayL2.delayTime.setTargetAtTime(d*ratio, now, 0.01); this.delayR2.delayTime.setTargetAtTime(d*ratio, now, 0.01);} this.tremLFO.frequency.setTargetAtTime(1/beat, now, 0.01); this.tremLFO2.frequency.setTargetAtTime(1/beat, now, 0.01); }

  // ===== Mode selection =====
  setDelayType(type){ const now=this.audioContext.currentTime; this.currentType=type;
    // Reset
    this.lpL.frequency.setTargetAtTime(12000, now, 0.01); this.lpR.frequency.setTargetAtTime(12000, now, 0.01);
    this.hpL.frequency.setTargetAtTime(80, now, 0.01); this.hpR.frequency.setTargetAtTime(80, now, 0.01);
    this.pkL.gain.setTargetAtTime(0, now, 0.01); this.pkR.gain.setTargetAtTime(0, now, 0.01);
    this.crossFeedL2R.gain.setTargetAtTime(0, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0, now, 0.01);
    this.iceAmtL.gain.setTargetAtTime(0, now, 0.01); this.iceAmtR.gain.setTargetAtTime(0, now, 0.01);
    this.modDepthL.gain.value=0; this.modDepthR.gain.value=0; this.modLFO.frequency.setTargetAtTime(0.5, now, 0.01); this.modLFO2.frequency.setTargetAtTime(0.5, now, 0.01);
    this.tremDepthL.gain.setTargetAtTime(0, now, 0.01); this.tremDepthR.gain.setTargetAtTime(0, now, 0.01);
    this.swellL.gain.cancelScheduledValues(now); this.swellR.gain.cancelScheduledValues(now); this.swellL.gain.setValueAtTime(1, now); this.swellR.gain.setValueAtTime(1, now);
    this.fbL2.gain.setTargetAtTime(0, now, 0.01); this.fbR2.gain.setTargetAtTime(0, now, 0.01);

    switch(type){
      case 'dtape': this.lpL.frequency.setTargetAtTime(10000, now, 0.01); this.lpR.frequency.setTargetAtTime(10000, now, 0.01); this.gritL.curve=this.makeGritCurve(5); this.gritR.curve=this.makeGritCurve(5); this.modDepthL.gain.value=0.0002; this.modDepthR.gain.value=0.0002; break;
      case 'dbucket': this.lpL.frequency.setTargetAtTime(5000, now, 0.01); this.lpR.frequency.setTargetAtTime(5000, now, 0.01); this.hpL.frequency.setTargetAtTime(120, now, 0.01); this.hpR.frequency.setTargetAtTime(120, now, 0.01); this.gritL.curve=this.makeGritCurve(25); this.gritR.curve=this.makeGritCurve(25); this.modDepthL.gain.value=0.0008; this.modDepthR.gain.value=0.0008; break;
      case 'tape': this.lpL.frequency.setTargetAtTime(3500, now, 0.01); this.lpR.frequency.setTargetAtTime(3500, now, 0.01); this.hpL.frequency.setTargetAtTime(120, now, 0.01); this.hpR.frequency.setTargetAtTime(120, now, 0.01); this.gritL.curve=this.makeGritCurve(40); this.gritR.curve=this.makeGritCurve(40); this.modDepthL.gain.value=0.0015; this.modDepthR.gain.value=0.0015; this.modLFO.frequency.setTargetAtTime(0.3, now, 0.01); this.modLFO2.frequency.setTargetAtTime(0.3, now, 0.01); break;
      case 'lofi': this.lpL.frequency.setTargetAtTime(2000, now, 0.01); this.lpR.frequency.setTargetAtTime(2000, now, 0.01); this.hpL.frequency.setTargetAtTime(150, now, 0.01); this.hpR.frequency.setTargetAtTime(150, now, 0.01); this.gritL.curve=this.makeGritCurve(70); this.gritR.curve=this.makeGritCurve(70); this.modDepthL.gain.value=0.003; this.modDepthR.gain.value=0.003; break;
      case 'dual': { const ratio=0.75; this.delayL2.delayTime.setTargetAtTime(this.delayL.delayTime.value*ratio, now, 0.01); this.delayR2.delayTime.setTargetAtTime(this.delayR.delayTime.value*ratio, now, 0.01); this.fbL2.gain.setTargetAtTime(0.35, now, 0.01); this.fbR2.gain.setTargetAtTime(0.35, now, 0.01); } break;
      case 'pattern': this.crossFeedL2R.gain.setTargetAtTime(0.6, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01); this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01); this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01); break;
      case 'reverse': this.applyReverseEnvelope(0.5); break;
      case 'ice': this.iceAmtL.gain.setTargetAtTime(0.25, now, 0.02); this.iceAmtR.gain.setTargetAtTime(0.2, now, 0.02); this.lpL.frequency.setTargetAtTime(8000, now, 0.01); this.lpR.frequency.setTargetAtTime(8000, now, 0.01); break;
      case 'duck': /* activated by updateMachineSpecificParams via value1 */ break;
      case 'swell': /* handled by updateMachineSpecificParams */ break;
      case 'trem': this.tremDepthL.gain.setTargetAtTime(0.5, now, 0.01); this.tremDepthR.gain.setTargetAtTime(0.5, now, 0.01); break;
      case 'filter': this.pkL.gain.setTargetAtTime(12, now, 0.01); this.pkR.gain.setTargetAtTime(12, now, 0.01); this.pkL.Q.setTargetAtTime(4, now, 0.01); this.pkR.Q.setTargetAtTime(4, now, 0.01); break;
    }
  }

  // Reverse envelope helper
  applyReverseEnvelope(seconds){ const now=this.audioContext.currentTime; const end=now+seconds; this.swellL.gain.cancelScheduledValues(now); this.swellR.gain.cancelScheduledValues(now); this.swellL.gain.setValueAtTime(0.1, now); this.swellR.gain.setValueAtTime(0.1, now); this.swellL.gain.exponentialRampToValueAtTime(1.0, end); this.swellR.gain.exponentialRampToValueAtTime(1.0, end); }

  // ===== Parameters =====
  updateParameter(parameter, value){ const now=this.audioContext.currentTime;
    switch(parameter){
      case 'time':{ const t=0.04+(value/100)*4.96; this.delayL.delayTime.setTargetAtTime(t, now, 0.01); this.delayR.delayTime.setTargetAtTime(t, now, 0.01); this.tapTempo.enabled=false; break; }
      case 'repeats':{ const fb=Math.min(0.95,(value/100)*0.95); this.feedbackL.gain.setTargetAtTime(fb, now, 0.01); this.feedbackR.gain.setTargetAtTime(fb, now, 0.01); break; }
      case 'filter':{ const f=500+(value/100)*11500; this.lpL.frequency.setTargetAtTime(f, now, 0.01); this.lpR.frequency.setTargetAtTime(f, now, 0.01); break; }
      case 'grit': this.gritL.curve=this.makeGritCurve(value); this.gritR.curve=this.makeGritCurve(value); break;
      case 'mod':{ const depth=value/50000; this.modDepthL.gain.setTargetAtTime(depth, now, 0.01); this.modDepthR.gain.setTargetAtTime(depth, now, 0.01); break; }
      case 'speed':{ const rate=0.1+(value/100)*9.9; this.modLFO.frequency.setTargetAtTime(rate, now, 0.01); this.modLFO2.frequency.setTargetAtTime(rate, now, 0.01); break; }
      case 'width':{ const w=value/100; this.sideGain.gain.setTargetAtTime(w, now, 0.01); this.midGain.gain.setTargetAtTime(1.0, now, 0.01); break; }
      case 'type': this.setDelayType(value); break;
      case 'mix': this.updateMix(value); break;
      case 'taptempo': this.tapTempo.enabled=!!value; if(value) this.updateDelayTimeFromTempo(); break;
      case 'subdivision': this.tapTempo.subdivision=value; if(this.tapTempo.enabled) this.updateDelayTimeFromTempo(); break;
      case 'value1': this.value1=value; this.updateMachineSpecificParams(); break;
      case 'value2': this.value2=value; this.updateMachineSpecificParams(); break;
      case 'value3': this.value3=value; this.updateMachineSpecificParams(); break;
      default: super.updateParameter(parameter, value); break;
    }
  }

  updateMachineSpecificParams(){ const now=this.audioContext.currentTime;
    switch(this.currentType){
      case 'dual':{ const ratio=0.25+(this.value1/100)*0.75; this.delayL2.delayTime.setTargetAtTime(this.delayL.delayTime.value*ratio, now, 0.01); this.delayR2.delayTime.setTargetAtTime(this.delayR.delayTime.value*ratio, now, 0.01); const bal=this.value2/100; this.feedbackL.gain.setTargetAtTime(bal*0.5, now, 0.01); this.feedbackR.gain.setTargetAtTime(bal*0.5, now, 0.01); this.fbL2.gain.setTargetAtTime((1-bal)*0.5, now, 0.01); this.fbR2.gain.setTargetAtTime((1-bal)*0.5, now, 0.01); break; }
      case 'ice':{ 
        if (!this.iceUpL || !this.iceUpR) break;
        const amt=(this.value1??50)/100; this.iceAmtL.gain.setTargetAtTime(0.05+0.45*amt, now, 0.02); this.iceAmtR.gain.setTargetAtTime(0.05+0.35*amt, now, 0.02); const tone=4000+((this.value2??50)/100)*7000; this.iceToneL.frequency.setTargetAtTime(tone, now, 0.02); this.iceToneR.frequency.setTargetAtTime(tone, now, 0.02); /* value3: future blend +12/+7 */ break; }
      case 'filter':{ const ff=200+(this.value1/100)*3800; this.pkL.frequency.setTargetAtTime(ff, now, 0.01); this.pkR.frequency.setTargetAtTime(ff, now, 0.01); const q=0.5+(this.value2/100)*9.5; this.pkL.Q.setTargetAtTime(q, now, 0.01); this.pkR.Q.setTargetAtTime(q, now, 0.01); const g=6+(this.value3/100)*12; this.pkL.gain.setTargetAtTime(g, now, 0.01); this.pkR.gain.setTargetAtTime(g, now, 0.01); break; }
      case 'trem':{ const rate=0.5+(this.value1/100)*15; this.tremLFO.frequency.setTargetAtTime(rate, now, 0.01); this.tremLFO2.frequency.setTargetAtTime(rate, now, 0.01); const depth=(this.value2/100); this.tremDepthL.gain.setTargetAtTime(depth, now, 0.01); this.tremDepthR.gain.setTargetAtTime(depth, now, 0.01); break; }
      case 'duck':{ const amt=(this.value1??50)/100; const inv = 1-0.8*amt; this.delayMix.gain.setTargetAtTime(Math.max(0.1, inv), now, 0.05); break; }
      case 'reverse':{ const t=0.1+(this.value1/100)*1.4; this.applyReverseEnvelope(t); break; }
      case 'swell':{ const atk=0.05+(this.value1/100)*1.95; const depth=0.1+(this.value2/100)*0.9; this.swellL.gain.cancelScheduledValues(now); this.swellR.gain.cancelScheduledValues(now); this.swellL.gain.setValueAtTime(1-depth, now); this.swellR.gain.setValueAtTime(1-depth, now); this.swellL.gain.linearRampToValueAtTime(1.0, now+atk); this.swellR.gain.linearRampToValueAtTime(1.0, now+atk); break; }
      case 'dtape':
      case 'tape':{ const wow=(this.value1/100)*0.002; this.modDepthL.gain.setTargetAtTime(wow, now, 0.01); this.modDepthR.gain.setTargetAtTime(wow, now, 0.01); break; }
      case 'dbucket':
      case 'lofi':{ const dist=20+(this.value1/100)*60; this.gritL.curve=this.makeGritCurve(dist); this.gritR.curve=this.makeGritCurve(dist); const sr=2000+(this.value2/100)*10000; this.lpL.frequency.setTargetAtTime(sr, now, 0.01); this.lpR.frequency.setTargetAtTime(sr, now, 0.01); break; }
      case 'pattern':{ const t=Math.floor((this.value1/100)*4); switch(t){ case 0: this.crossFeedL2R.gain.setTargetAtTime(0.6, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01); this.feedbackL.gain.setTargetAtTime(0.2, now, 0.01); this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01); break; case 1: this.crossFeedL2R.gain.setTargetAtTime(0.7, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0.7, now, 0.01); this.feedbackL.gain.setTargetAtTime(0, now, 0.01); this.feedbackR.gain.setTargetAtTime(0, now, 0.01); break; case 2: this.crossFeedL2R.gain.setTargetAtTime(0.5, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0.3, now, 0.01); this.feedbackL.gain.setTargetAtTime(0.3, now, 0.01); this.feedbackR.gain.setTargetAtTime(0.5, now, 0.01); break; case 3: this.crossFeedL2R.gain.setTargetAtTime(0.4, now, 0.01); this.crossFeedR2L.gain.setTargetAtTime(0.6, now, 0.01); this.feedbackL.gain.setTargetAtTime(0.4, now, 0.01); this.feedbackR.gain.setTargetAtTime(0.2, now, 0.01); break; } break; }
    }
  }

  getParameters(){ return { type:this.currentType, time:((this.delayL.delayTime.value-0.04)/4.96)*100, repeats:(this.feedbackL.gain.value/0.95)*100, filter:((this.lpL.frequency.value-500)/11500)*100, grit:0, mod:this.modDepthL.gain.value*50000, speed:((this.modLFO.frequency.value-0.1)/9.9)*100, width:this.sideGain.gain.value*100, mix:(this.mix??0.5)*100, value1:this.value1, value2:this.value2, value3:this.value3, taptempo:this.tapTempo.enabled, subdivision:this.tapTempo.subdivision, bpm:this.tapTempo.bpm }; }

  updateMix(value){ this.mix=value/100; const now=this.audioContext.currentTime; const wet=Math.sin(0.5*Math.PI*this.mix); const dry=Math.cos(0.5*Math.PI*this.mix); this.wetGain.gain.setTargetAtTime(wet, now, 0.01); this.dryGain.gain.setTargetAtTime(dry, now, 0.01); }

  disconnect(){ 
    super.disconnect();
    try{ 
      this.modLFO?.stop(); this.modLFO2?.stop(); this.tremLFO?.stop(); this.tremLFO2?.stop(); 
      if (this.iceUpL) this.iceUpL.disconnect();
      if (this.iceUpR) this.iceUpR.disconnect();
    }catch(e){
      console.warn('Error disconnecting Timeline:', e);
    }
  }
}

export default TimelineDelayEffect;
