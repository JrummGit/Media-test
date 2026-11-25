/**
 * Plays a short, original placeholder tune with the Web Audio API. Used for the
 * sample inventory until real listings have licensed preview clips.
 */
import { degreeToMidi, midiToHz, rng, type SynthParams } from "./params";

export const CLIP_SECONDS = 30;
const LOOKAHEAD = 0.15; // seconds of audio scheduled ahead
const TICK_MS = 30;

let sharedCtx: AudioContext | null = null;

/** Must first be called from inside a tap/click so iOS allows sound. */
export function audioContext(): AudioContext {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  sharedCtx ??= new Ctor();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

export class GeneratedTrack {
  private ctx: AudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private wow?: OscillatorNode;
  private wowGain?: GainNode;
  private hiss?: AudioBufferSourceNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  /** Seconds of the clip already played, excluding the current run. */
  private elapsedBefore = 0;
  private runStart = 0;
  private melody: number[];
  private ended = false;
  onEnded?: () => void;
  readonly duration = CLIP_SECONDS;

  constructor(private p: SynthParams) {
    this.ctx = audioContext();
    const comp = this.ctx.createDynamicsCompressor();
    comp.connect(this.ctx.destination);
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(comp);

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    const r = rng(p.seed ^ 0x9e3779b9);
    for (let i = 0; i < data.length; i++) data[i] = r() * 2 - 1;

    // A two-bar melody, repeated, sounds more like a song than a random walk.
    const mr = rng(p.seed + 7);
    let deg = 4;
    this.melody = Array.from({ length: 32 }, (_, i) => {
      if (i % 2 === 1 && mr() < 0.55) return NaN; // rest
      deg = Math.max(0, Math.min(11, deg + Math.round((mr() - 0.5) * 4)));
      return deg;
    });
  }

  private get stepDur() {
    return 60 / this.p.bpm / 4; // 16th notes
  }

  currentTime(): number {
    if (!this.timer) return this.elapsedBefore;
    return Math.min(this.duration, this.elapsedBefore + (this.ctx.currentTime - this.runStart));
  }

  play() {
    if (this.timer || this.ended) return;
    const ctx = this.ctx;
    if (ctx.state === "suspended") void ctx.resume();
    this.runStart = ctx.currentTime;
    this.nextTime = ctx.currentTime + 0.05;
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(0.32, ctx.currentTime, 0.05);
    if (this.p.tape) this.startTape();
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  pause() {
    if (!this.timer) return;
    this.elapsedBefore = this.currentTime();
    clearInterval(this.timer);
    this.timer = null;
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    this.stopTape();
  }

  stop() {
    this.pause();
    this.elapsedBefore = 0;
    this.step = 0;
    this.ended = false;
  }

  dispose() {
    this.pause();
    setTimeout(() => this.out.disconnect(), 300);
  }

  private finish() {
    this.pause();
    this.ended = true;
    this.elapsedBefore = this.duration;
    this.onEnded?.();
  }

  private schedule() {
    const ctx = this.ctx;
    if (this.currentTime() >= this.duration) return this.finish();
    // Fade out over the last two seconds of the clip.
    const remaining = this.duration - this.currentTime();
    if (remaining < 2) this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const swing = this.step % 2 === 1 ? this.p.swing * this.stepDur : 0;
      this.playStep(this.step, this.nextTime + swing);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  // ── Tape character ─────────────────────────────────────────────────────
  private startTape() {
    const ctx = this.ctx;
    this.wow = ctx.createOscillator();
    this.wow.frequency.value = 0.6;
    this.wowGain = ctx.createGain();
    this.wowGain.gain.value = 9; // cents
    this.wow.connect(this.wowGain);
    this.wow.start();
    this.hiss = ctx.createBufferSource();
    this.hiss.buffer = this.noise;
    this.hiss.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.value = 0.025;
    this.hiss.connect(hp).connect(g).connect(this.out);
    this.hiss.start();
  }

  private stopTape() {
    try {
      this.wow?.stop();
      this.hiss?.stop();
    } catch {}
    this.wow = this.hiss = undefined;
  }

  // ── Voices ─────────────────────────────────────────────────────────────
  private tone(
    midi: number,
    t: number,
    dur: number,
    o: { type?: OscillatorType; gain?: number; attack?: number; release?: number; cutoff?: number; detune?: number; shaper?: boolean } = {},
  ) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sawtooth";
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = o.detune ?? 0;
    if (this.wowGain) this.wowGain.connect(osc.detune);
    const env = ctx.createGain();
    const peak = o.gain ?? 0.2;
    const a = o.attack ?? 0.005;
    const r = o.release ?? 0.08;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + a);
    env.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 3);
    let node: AudioNode = osc;
    if (o.shaper) {
      const ws = ctx.createWaveShaper();
      ws.curve = distortionCurve();
      node = node.connect(ws);
    }
    if (o.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.cutoff;
      node = node.connect(f);
    }
    node.connect(env).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + r * 2 + 0.05);
  }

  private noiseHit(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(env).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private kick(t: number) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(env).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  private chordDegrees(bar: number) {
    const d = this.p.progression[bar % this.p.progression.length];
    return [d, d + 2, d + 4];
  }

  private playStep(step: number, t: number) {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const p = this.p;
    const chord = this.chordDegrees(bar);
    const sd = this.stepDur;

    // Drums
    const hat = (g = 0.12) => this.noiseHit(t, 0.04, g, "highpass", 7000);
    const snare = () => this.noiseHit(t, 0.16, 0.45, "bandpass", 1800);
    switch (p.drums) {
      case "four":
        if (s % 4 === 0) this.kick(t);
        if (s === 4 || s === 12) snare();
        if (s % 4 === 2) hat(0.16);
        break;
      case "rock":
        if (s === 0 || s === 8 || s === 10) this.kick(t);
        if (s === 4 || s === 12) snare();
        if (s % 2 === 0) hat();
        break;
      case "boombap":
        if (s === 0 || s === 7 || s === 10) this.kick(t);
        if (s === 4 || s === 12) snare();
        if (s % 2 === 0) hat(0.1);
        break;
      case "ska":
        if (s === 0 || s === 8) this.kick(t);
        if (s === 4 || s === 12) snare();
        if (s % 2 === 0) hat(0.14);
        break;
      case "soft":
        if (s === 0 || s === 8) this.kick(t);
        if (s % 2 === 0) this.noiseHit(t, 0.05, 0.05, "highpass", 5000);
        break;
    }

    // Bass
    const rootDeg = chord[0];
    switch (p.bass) {
      case "eighths":
        if (s % 2 === 0) this.tone(degreeToMidi(p, rootDeg), t, sd * 1.6, { type: "square", gain: 0.16, cutoff: 600 });
        break;
      case "quarters":
        if (s % 4 === 0) this.tone(degreeToMidi(p, rootDeg), t, sd * 3, { type: "triangle", gain: 0.3 });
        break;
      case "walk":
        if (s % 4 === 0) this.tone(degreeToMidi(p, rootDeg + (s === 8 ? 4 : s === 4 || s === 12 ? 2 : 0)), t, sd * 3, { type: "triangle", gain: 0.32 });
        break;
      case "root":
        if (s === 0) this.tone(degreeToMidi(p, rootDeg), t, sd * 14, { type: "triangle", gain: 0.3, release: 0.4 });
        break;
    }

    // Pad / chords
    switch (p.pad) {
      case "saw":
        if (s === 0) for (const d of chord) this.tone(degreeToMidi(p, d, 2), t, sd * 15, { gain: 0.05, attack: 0.08, release: 0.3, cutoff: 1800, detune: 6 });
        break;
      case "organ":
        if (s === 0) for (const d of chord) this.tone(degreeToMidi(p, d, 2), t, sd * 15, { type: "sine", gain: 0.07, attack: 0.05, release: 0.3 });
        break;
      case "dist":
        if (s % 2 === 0)
          for (const st of [0, 7, 12])
            this.tone(degreeToMidi(p, rootDeg, 1) + st, t, sd * 1.7, { gain: 0.06, shaper: true, cutoff: 2600 });
        break;
      case "stab":
        if (s % 4 === 2) for (const d of chord) this.tone(degreeToMidi(p, d, 2), t, sd * 0.8, { gain: 0.06, cutoff: 3200 });
        break;
      case "drone":
        if (s === 0) {
          this.tone(degreeToMidi(p, 0, 1), t, sd * 16, { gain: 0.08, attack: 0.6, release: 1, cutoff: 500, detune: -8 });
          this.tone(degreeToMidi(p, 0, 1), t, sd * 16, { gain: 0.08, attack: 0.6, release: 1, cutoff: 500, detune: 8 });
        }
        break;
    }

    // Lead
    switch (p.lead) {
      case "arp": {
        const notes = [chord[0], chord[1], chord[2], chord[0] + 7];
        this.tone(degreeToMidi(p, notes[s % 4], 3), t, sd * 0.7, { type: p.leadWave, gain: 0.07, cutoff: 3500 });
        break;
      }
      case "melody": {
        const deg = this.melody[step % 32];
        if (!Number.isNaN(deg) && s % 2 === 0) this.tone(degreeToMidi(p, deg, 3), t, sd * 1.8, { type: p.leadWave, gain: 0.09, cutoff: 3000 });
        break;
      }
      case "pluck":
        if (s % 2 === 0) {
          const d = [chord[0], chord[2], chord[1], chord[2]][(s / 2) % 4];
          this.tone(degreeToMidi(p, d, 2), t, sd * 0.5, { type: "triangle", gain: 0.16, release: 0.35 });
        }
        break;
      case "bell":
        if (s === 0 || (s === 10 && bar % 2 === 1))
          this.tone(degreeToMidi(p, this.melody[bar % 32] || 4, 4), t, sd * 2, { type: "sine", gain: 0.12, release: 2.5 });
        if (s === 0 && bar % 2 === 0) this.noiseHit(t, 1.5, 0.04, "bandpass", 400);
        break;
    }
  }
}

let curve: Float32Array<ArrayBuffer> | null = null;
function distortionCurve() {
  if (curve) return curve;
  const n = 1024;
  curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    curve[i] = Math.tanh(x * 6);
  }
  return curve;
}
