"use client";

import { useCallback } from "react";
import { imageFor, type Item } from "@/lib/types";
import { PlayerCredit, TransportButton } from "./PlayerCredit";
import { createSource, formatClock, usePlayback } from "./usePlayback";

/**
 * A disc that slides out of its case and spins while the preview plays, with
 * a green LCD showing the track and elapsed time.
 */
export function DiscTray({ item }: { item: Item }) {
  const make = useCallback(() => createSource(item), [item]);
  const { status, time, toggle, stop } = usePlayback(make);
  const playing = status === "playing";
  const out = status !== "idle";
  const preview = item.preview!;
  const art = imageFor(item, "front")?.src;

  return (
    <section aria-label="CD player" className="mx-auto w-full max-w-sm rounded-xl border border-night-3 bg-gradient-to-b from-[#2b2f3a] to-[#1a1d25] p-4 shadow-[0_20px_40px_-20px_#000]">
      <div className="relative h-44 overflow-hidden rounded-lg bg-[#0d0e12]">
        {/* the disc */}
        <div
          className="absolute top-1/2 h-36 w-36 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: out ? "calc(50% - 4.5rem)" : "-3rem" }}
        >
          <div className={`disc h-full w-full rounded-full ${playing ? "" : "[animation-play-state:paused]"}`}>
            <div
              className="h-full w-full rounded-full"
              style={{
                background: `conic-gradient(from 20deg, #d8dde6, #f6f0ff, #c9f2ff, #e8e2f8, #fff3d6, #d8dde6)`,
                WebkitMaskImage: "radial-gradient(circle, transparent 0 10%, #000 10.5%)",
                maskImage: "radial-gradient(circle, transparent 0 10%, #000 10.5%)",
              }}
            >
              {art && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={art}
                  alt=""
                  className="h-full w-full rounded-full object-cover opacity-90"
                  style={{
                    WebkitMaskImage: "radial-gradient(circle, transparent 0 17%, #000 17.5% 92%, transparent 92.5%)",
                    maskImage: "radial-gradient(circle, transparent 0 17%, #000 17.5% 92%, transparent 92.5%)",
                  }}
                />
              )}
            </div>
          </div>
        </div>
        {/* the case the disc slides out of */}
        <div
          className="absolute -left-2 top-1/2 h-40 w-16 -translate-y-1/2 rounded-r-md border border-white/20 bg-gradient-to-r from-[#3a3f4b] to-[#20232b] shadow-[6px_0_12px_#0008] transition-opacity duration-700"
          style={{ opacity: out ? 0.6 : 1 }}
        />
      </div>

      <div className="mt-3 rounded-md border border-black bg-[#0f1f14] px-3 py-2 font-crt text-[#8cf5a3] [text-shadow:0_0_6px_#8cf5a380]">
        <div className="flex justify-between text-xl">
          <span>TRACK 01</span>
          <span aria-label="Elapsed time">{formatClock(time)}</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap text-lg">
          <span className={playing ? "marquee inline-block" : "inline-block"}>{(preview.title ?? item.title).toUpperCase()}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <TransportButton onClick={toggle} label={playing ? "Pause" : "Play"} primary>
          {playing ? "❚❚ PAUSE" : "▶ PLAY"}
        </TransportButton>
        <TransportButton onClick={stop} label="Stop" disabled={status === "idle"}>
          ■ STOP
        </TransportButton>
      </div>
      <PlayerCredit preview={preview} />
    </section>
  );
}
