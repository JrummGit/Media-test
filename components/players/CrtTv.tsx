"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { drawFrame, SCREEN_H, SCREEN_W, sceneFor, type FootageInfo } from "./generated/footage";
import { PlayerCredit, TransportButton } from "./PlayerCredit";
import { createSource, usePlayback } from "./usePlayback";

const WARM_UP_MS = 650;

/**
 * A CRT television. Sample tapes play generated footage through a full CRT
 * effect. Real listings play the official trailer in YouTube's own player
 * inside the TV, with nothing drawn on top of it (YouTube's rules).
 */
export function CrtTv({ item }: { item: Item }) {
  const preview = item.preview!;
  const isYouTube = preview.provider === "youtube" && Boolean(preview.ref);
  const make = useCallback(() => createSource(item), [item]);
  const { status, time, toggle, play, stop } = usePlayback(make);
  const [power, setPower] = useState<"off" | "warming" | "on">("off");
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef({ time: 0, paused: false });

  useEffect(() => {
    clock.current = { time, paused: status === "paused" };
  }, [time, status]);

  const powerOn = () => {
    // Sound has to start inside the tap, so start it before the warm-up.
    if (!isYouTube) play();
    setPower("warming");
    setTimeout(() => setPower((p) => (p === "warming" ? "on" : p)), WARM_UP_MS);
  };
  const powerOff = () => {
    stop();
    setPower("off");
  };

  // Draw the generated footage while the set is on.
  useEffect(() => {
    if (power !== "on" || isYouTube) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const info: FootageInfo = {
      slug: item.slug,
      title: item.title,
      creator: item.creator,
      year: item.releaseYear,
      accent: item.accent,
      ground: item.ground ?? "#1b0f3b",
      scene: sceneFor(item.genres),
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (reduced && now - last < 120) return; // ~8fps for reduced motion
      last = now;
      drawFrame(ctx, info, { t: clock.current.time, wall: now / 1000, paused: clock.current.paused, reducedMotion: reduced });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [power, isYouTube, item]);

  // When the generated clip ends, the set switches itself off.
  useEffect(() => {
    if (status === "ended") {
      const t = setTimeout(() => setPower("off"), 800);
      return () => clearTimeout(t);
    }
  }, [status]);

  const on = power !== "off";

  return (
    <section aria-label="Television" className="mx-auto w-full max-w-sm">
      {/* Cabinet */}
      <div className="rounded-[22px] border border-black/60 bg-gradient-to-b from-[#5a4632] to-[#3b2c1f] p-3 shadow-[0_24px_40px_-18px_#000,inset_0_1px_0_#ffffff22]">
        <div className="flex gap-3">
          {/* Screen */}
          <div className="relative flex-1 overflow-hidden rounded-[18%/22%] bg-[#0b0d0c] shadow-[inset_0_0_30px_#000]" style={{ aspectRatio: "4 / 3" }}>
            {power === "on" && isYouTube ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${preview.ref}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                title={`${item.title} trailer`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <canvas
                  ref={canvas}
                  width={SCREEN_W}
                  height={SCREEN_H}
                  className="absolute inset-0 h-full w-full"
                  style={{ opacity: power === "on" ? 1 : 0, filter: "saturate(1.25) contrast(1.1) blur(0.3px)" }}
                  aria-label={power === "on" ? `${item.title}: placeholder footage` : undefined}
                  role="img"
                />
                {/* Glass curvature and glare: only over footage we own */}
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_center,transparent_55%,#000a_100%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(160deg,#ffffff1f_0%,transparent_35%)]" />
              </>
            )}
            {power === "warming" && <div className="crt-warm absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-white shadow-[0_0_18px_6px_#fff]" />}
            {power === "off" && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-crt text-lg tracking-widest text-cream-dim/50">{isYouTube || preview.provider === "generated" ? "PRESS PLAY" : "NO SIGNAL"}</span>
              </div>
            )}
          </div>
          {/* Side panel: dials and speaker grille */}
          <div className="flex w-10 flex-col items-center gap-3 py-2" aria-hidden>
            <div className="h-7 w-7 rounded-full border border-black/50 bg-gradient-to-br from-[#d9d2c4] to-[#8d8678] shadow" />
            <div className="h-7 w-7 rounded-full border border-black/50 bg-gradient-to-br from-[#d9d2c4] to-[#8d8678] shadow" />
            <div className="flex flex-1 flex-col justify-end gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-0.5 w-7 rounded bg-black/50" />
              ))}
            </div>
            <div className={`h-1.5 w-1.5 rounded-full ${on ? "bg-tape shadow-[0_0_6px_#e63946]" : "bg-black/60"}`} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {!on ? (
          <TransportButton onClick={powerOn} label="Play" primary>
            ▶ PLAY
          </TransportButton>
        ) : (
          <>
            {!isYouTube && (
              <TransportButton onClick={toggle} label={status === "playing" ? "Pause" : "Play"} primary>
                {status === "playing" ? "❚❚ PAUSE" : "▶ PLAY"}
              </TransportButton>
            )}
            <TransportButton onClick={powerOff} label="Stop">
              ■ STOP
            </TransportButton>
          </>
        )}
      </div>
      <PlayerCredit preview={preview} />
    </section>
  );
}
