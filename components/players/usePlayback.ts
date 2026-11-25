"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { synthParams } from "./generated/params";
import { GeneratedTrack } from "./generated/synth";

/** Anything the players can drive: a generated tune or a preview clip URL. */
export interface PlaybackSource {
  play(): void | Promise<void>;
  pause(): void;
  stop(): void;
  dispose(): void;
  currentTime(): number;
  readonly duration: number;
  onEnded?: () => void;
}

class ElementSource implements PlaybackSource {
  private el: HTMLAudioElement;
  onEnded?: () => void;
  constructor(url: string) {
    this.el = new Audio(url);
    this.el.preload = "auto";
    this.el.addEventListener("ended", () => this.onEnded?.());
  }
  get duration() {
    return Number.isFinite(this.el.duration) ? this.el.duration : 30;
  }
  play() {
    return this.el.play();
  }
  pause() {
    this.el.pause();
  }
  stop() {
    this.el.pause();
    this.el.currentTime = 0;
  }
  dispose() {
    this.stop();
    this.el.removeAttribute("src");
    this.el.load();
  }
  currentTime() {
    return this.el.currentTime;
  }
}

/** Builds the audio source for an item. Call only from inside a tap. */
export function createSource(item: Item): PlaybackSource | null {
  const p = item.preview;
  if (!p) return null;
  if (p.provider === "generated") return new GeneratedTrack(synthParams(item.slug, item.genres, { tape: item.format === "cassette" }));
  if (p.kind === "audio" && p.url) return new ElementSource(p.url);
  return null;
}

// Only one preview plays at a time, site-wide.
let current: { stop: () => void } | null = null;

export type PlaybackStatus = "idle" | "playing" | "paused" | "ended";

export function usePlayback(make: () => PlaybackSource | null) {
  const source = useRef<PlaybackSource | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const self = useRef<{ stop: () => void }>({ stop: () => {} });

  const stop = useCallback(() => {
    source.current?.stop();
    setStatus("idle");
    setTime(0);
    if (current === self.current) current = null;
  }, []);

  useEffect(() => {
    self.current.stop = stop;
  }, [stop]);

  const play = useCallback(() => {
    if (current && current !== self.current) current.stop();
    current = self.current;
    if (!source.current) {
      source.current = make();
      if (!source.current) return;
      source.current.onEnded = () => {
        setStatus("ended");
        setTime(source.current?.duration ?? 0);
        if (current === self.current) current = null;
      };
    }
    if (status === "ended") source.current.stop();
    setDuration(source.current.duration);
    const r = source.current.play();
    setStatus("playing");
    if (r instanceof Promise) r.catch(() => setStatus("paused"));
  }, [make, status]);

  const pause = useCallback(() => {
    source.current?.pause();
    setStatus("paused");
  }, []);

  const toggle = useCallback(() => (status === "playing" ? pause() : play()), [status, pause, play]);

  // Tick the clock while playing.
  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    const tick = () => {
      if (source.current) setTime(source.current.currentTime());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // Putting the case back (unmount) always silences it.
  useEffect(
    () => () => {
      source.current?.dispose();
      if (current === self.current) current = null;
    },
    [],
  );

  return { status, time, duration, play, pause, stop, toggle, progress: duration ? Math.min(1, time / duration) : 0 };
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
