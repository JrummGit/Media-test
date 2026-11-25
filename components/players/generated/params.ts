/**
 * Deterministic parameters for the placeholder tunes. Everything is derived
 * from the item's slug and genre, so each fake album always sounds the same.
 * Pure: no Web Audio here, so it can be unit tested.
 */

export type Style =
  | "synthpop"
  | "grunge"
  | "hiphop"
  | "country"
  | "pop"
  | "ska"
  | "electronic"
  | "indie"
  | "folk"
  | "horror";

export type Drums = "four" | "rock" | "boombap" | "ska" | "soft" | "none";
export type Lead = "arp" | "melody" | "pluck" | "bell" | "none";
export type Pad = "saw" | "dist" | "organ" | "stab" | "drone" | "none";
export type Bass = "eighths" | "quarters" | "walk" | "root";

interface Preset {
  bpm: [number, number];
  scale: keyof typeof SCALES;
  drums: Drums;
  lead: Lead;
  pad: Pad;
  bass: Bass;
  swing: number;
  leadWave: OscillatorType;
}

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minorPent: [0, 3, 5, 7, 10],
  majorPent: [0, 2, 4, 7, 9],
} as const;

const PRESETS: Record<Style, Preset> = {
  synthpop: { bpm: [112, 124], scale: "minor", drums: "four", lead: "arp", pad: "saw", bass: "eighths", swing: 0, leadWave: "square" },
  grunge: { bpm: [92, 108], scale: "minor", drums: "rock", lead: "none", pad: "dist", bass: "eighths", swing: 0, leadWave: "sawtooth" },
  hiphop: { bpm: [86, 94], scale: "minorPent", drums: "boombap", lead: "melody", pad: "organ", bass: "root", swing: 0.18, leadWave: "triangle" },
  country: { bpm: [104, 116], scale: "major", drums: "rock", lead: "pluck", pad: "none", bass: "walk", swing: 0.08, leadWave: "triangle" },
  pop: { bpm: [116, 126], scale: "major", drums: "four", lead: "melody", pad: "saw", bass: "eighths", swing: 0, leadWave: "square" },
  ska: { bpm: [148, 160], scale: "major", drums: "ska", lead: "melody", pad: "stab", bass: "walk", swing: 0, leadWave: "sawtooth" },
  electronic: { bpm: [124, 132], scale: "minor", drums: "four", lead: "arp", pad: "stab", bass: "eighths", swing: 0, leadWave: "sawtooth" },
  indie: { bpm: [98, 110], scale: "majorPent", drums: "soft", lead: "melody", pad: "organ", bass: "quarters", swing: 0.1, leadWave: "triangle" },
  folk: { bpm: [88, 98], scale: "major", drums: "soft", lead: "pluck", pad: "none", bass: "root", swing: 0.12, leadWave: "triangle" },
  horror: { bpm: [60, 70], scale: "minor", drums: "none", lead: "bell", pad: "drone", bass: "root", swing: 0, leadWave: "sine" },
};

const GENRE_STYLE: Record<string, Style> = {
  synthpop: "synthpop",
  "new wave": "synthpop",
  grunge: "grunge",
  alternative: "grunge",
  "hip hop": "hiphop",
  "country rock": "country",
  country: "country",
  pop: "pop",
  ska: "ska",
  electronic: "electronic",
  indie: "indie",
  folk: "folk",
  // Film genres pick a soundtrack flavour.
  action: "synthpop",
  "sci-fi": "synthpop",
  horror: "horror",
  comedy: "ska",
  family: "pop",
  animation: "pop",
  fitness: "electronic",
};

/** Common chord loops, as scale degrees (0 = tonic). */
const PROGRESSIONS = [
  [0, 4, 5, 3], // I V vi IV
  [0, 5, 3, 4], // I vi IV V
  [5, 3, 0, 4], // vi IV I V
  [0, 3, 4, 3], // I IV V IV
  [0, 6, 5, 4], // descending
];

export interface SynthParams {
  style: Style;
  bpm: number;
  /** MIDI note number of the key's root (bass octave). */
  root: number;
  scale: readonly number[];
  progression: number[];
  drums: Drums;
  lead: Lead;
  pad: Pad;
  bass: Bass;
  swing: number;
  leadWave: OscillatorType;
  /** Cassette wobble and hiss. */
  tape: boolean;
  seed: number;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function styleFor(genres: string[]): Style {
  for (const g of genres) {
    const s = GENRE_STYLE[g.toLowerCase()];
    if (s) return s;
  }
  return "pop";
}

export function synthParams(slug: string, genres: string[], opts: { tape?: boolean } = {}): SynthParams {
  const seed = hashString(slug);
  const rand = rng(seed);
  const style = styleFor(genres);
  const p = PRESETS[style];
  const [lo, hi] = p.bpm;
  return {
    style,
    bpm: Math.round(lo + rand() * (hi - lo)),
    root: 36 + Math.floor(rand() * 12), // C2..B2
    scale: SCALES[p.scale],
    progression: style === "horror" ? [0, 0, 5, 0] : PROGRESSIONS[Math.floor(rand() * PROGRESSIONS.length)],
    drums: p.drums,
    lead: p.lead,
    pad: p.pad,
    bass: p.bass,
    swing: p.swing,
    leadWave: p.leadWave,
    tape: Boolean(opts.tape),
    seed,
  };
}

/** MIDI note for a scale degree (any integer, wraps into higher octaves). */
export function degreeToMidi(params: Pick<SynthParams, "root" | "scale">, degree: number, octave = 0): number {
  const n = params.scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return params.root + params.scale[idx] + 12 * (oct + octave);
}

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
