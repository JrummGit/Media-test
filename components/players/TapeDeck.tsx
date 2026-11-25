"use client";

import { useCallback } from "react";
import type { Item } from "@/lib/types";
import { PlayerCredit, TransportButton } from "./PlayerCredit";
import { createSource, usePlayback } from "./usePlayback";

const R_MIN = 13;
const R_MAX = 34;

/**
 * A cassette in a deck. The reels turn while it plays and the tape visibly
 * winds from the left spool to the right one over the length of the clip.
 */
export function TapeDeck({ item }: { item: Item }) {
  const make = useCallback(() => createSource(item), [item]);
  const { status, time, progress, toggle, stop } = usePlayback(make);
  const playing = status === "playing";
  const preview = item.preview!;

  const supply = R_MIN + (R_MAX - R_MIN) * (1 - progress);
  const takeup = R_MIN + (R_MAX - R_MIN) * progress;
  const counter = String(Math.floor(time * 3)).padStart(3, "0");
  const ink = item.ground ?? "#1a1423";

  return (
    <section aria-label="Tape deck" className="mx-auto w-full max-w-sm rounded-xl border border-night-3 bg-gradient-to-b from-[#2b2f3a] to-[#1a1d25] p-4 shadow-[0_20px_40px_-20px_#000]">
      <div className="mb-3 flex items-center justify-between font-crt text-lg text-cream-dim">
        <span>
          <span className={playing ? "text-tape" : ""}>●</span> {playing ? "PLAYING" : status === "paused" ? "PAUSED" : "STOPPED"}
        </span>
        <span aria-label="Tape counter" className="rounded bg-black px-2 tracking-[0.3em] text-mustard">
          {counter}
        </span>
      </div>

      <svg viewBox="0 0 320 200" className="w-full" role="img" aria-label={`Cassette: ${item.creator}, ${item.title}`}>
        <defs>
          <clipPath id={`win-${item.slug}`}>
            <rect x="62" y="86" width="196" height="58" rx="10" />
          </clipPath>
        </defs>
        {/* shell */}
        <rect x="4" y="4" width="312" height="192" rx="12" fill="#22252d" stroke="#0006" strokeWidth="2" />
        {/* label */}
        <rect x="22" y="18" width="276" height="140" rx="6" fill="#f3ead7" />
        <rect x="22" y="18" width="276" height="26" rx="6" fill={item.accent} />
        <text x="34" y="37" fontFamily="var(--font-bungee), Impact, sans-serif" fontSize="15" fill={ink}>
          A
        </text>
        <text x="56" y="37" fontFamily="var(--font-grotesk), sans-serif" fontSize="12" fontWeight="700" fill={ink}>
          {`${item.creator} · ${item.title}`.slice(0, 38)}
        </text>
        <text x="34" y="76" fontFamily="var(--font-vt323), monospace" fontSize="16" fill="#4a4458">
          {(preview.title ?? "").slice(0, 34)}
        </text>
        {/* window with tape packs */}
        <rect x="62" y="86" width="196" height="58" rx="10" fill="#0d0e12" />
        <g clipPath={`url(#win-${item.slug})`}>
          <circle cx="104" cy="115" r={supply} fill="#4a2e1d" />
          <circle cx="216" cy="115" r={takeup} fill="#4a2e1d" />
          <line x1={104} y1={115 + supply} x2={216} y2={115 + takeup} stroke="#3a2416" strokeWidth="2" />
        </g>
        {/* hubs */}
        {[104, 216].map((cx) => (
          <g key={cx} className="reel" style={{ transformOrigin: `${cx}px 115px`, animationPlayState: playing ? "running" : "paused" }}>
            <circle cx={cx} cy="115" r="11" fill="#e9e9ee" />
            <circle cx={cx} cy="115" r="5" fill="#0d0e12" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <rect key={a} x={cx - 1.5} y={115 - 11} width="3" height="4" fill="#0d0e12" transform={`rotate(${a} ${cx} 115)`} />
            ))}
          </g>
        ))}
        {/* bottom trapezoid */}
        <path d="M70 196 L88 164 L232 164 L250 196 Z" fill="#1a1c22" />
        {[110, 140, 180, 210].map((x) => (
          <circle key={x} cx={x} cy="182" r="4" fill="#0d0e12" />
        ))}
      </svg>

      <div className="mt-3 flex justify-center gap-2">
        <TransportButton onClick={toggle} label={playing ? "Pause" : "Play"} primary>
          {playing ? "❚❚ PAUSE" : "▶ PLAY"}
        </TransportButton>
        <TransportButton onClick={stop} label="Stop and rewind" disabled={status === "idle"}>
          ■ STOP
        </TransportButton>
      </div>
      <p className="sr-only" aria-live="polite">
        {playing ? `Playing ${preview.title}` : ""}
      </p>
      <PlayerCredit preview={preview} />
    </section>
  );
}
