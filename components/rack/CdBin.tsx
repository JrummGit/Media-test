"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice, imageFor, type Item } from "@/lib/types";

const VISIBLE_BEHIND = 6;

/**
 * A crate of CDs you riffle through. The current CD stands upright, ones you
 * have flipped past fall forward, and the next few peek out behind it.
 * Scroll, swipe, use the arrow keys or the buttons to flip. Tap the front CD to pull it.
 */
export function CdBin({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  const [index, setIndex] = useState(0);
  const lastWheel = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const crate = useRef<HTMLDivElement>(null);

  const clamp = useCallback((i: number) => Math.max(0, Math.min(items.length - 1, i)), [items.length]);
  const step = useCallback((d: number) => setIndex((i) => clamp(i + d)), [clamp]);

  // Reset to the front when the filter changes the contents.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset position when contents change
    setIndex(0);
  }, [items]);

  // Wheel needs a non-passive listener so the page doesn't scroll while riffling.
  useEffect(() => {
    const el = crate.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      const now = Date.now();
      const next = clamp(index + Math.sign(e.deltaY));
      if (next === index) return; // let the page scroll at either end
      e.preventDefault();
      if (now - lastWheel.current < 140) return;
      lastWheel.current = now;
      setIndex(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [index, clamp]);

  if (items.length === 0) return null;
  const current = items[index];

  return (
    <div className="flex flex-col items-center">
      <div
        ref={crate}
        tabIndex={0}
        role="listbox"
        aria-label="CD crate. Use the arrow keys to flip through."
        aria-activedescendant={`cd-${current.slug}`}
        onKeyDown={(e) => {
          const keys: Record<string, () => void> = {
            ArrowDown: () => step(1),
            ArrowRight: () => step(1),
            ArrowUp: () => step(-1),
            ArrowLeft: () => step(-1),
            Enter: () => onOpen(current),
            " ": () => onOpen(current),
          };
          if (keys[e.key]) {
            e.preventDefault();
            keys[e.key]();
          }
        }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          const d = Math.abs(dx) > Math.abs(dy) ? -dx : -dy;
          if (Math.abs(d) > 30) step(d > 0 ? 1 : -1);
        }}
        className="relative w-full max-w-md select-none outline-offset-8"
        style={{ perspective: "1100px", height: "min(440px, 105vw)" }}
      >
        {/* the crate itself */}
        <div className="absolute inset-x-0 bottom-0 z-[60] h-[22%] rounded-b-lg border-t-4 border-[#3e2413] bg-gradient-to-b from-wood to-[#3e2413] shadow-[0_20px_30px_-10px_#000]">
          <div className="absolute inset-x-0 top-3 mx-auto w-28 rounded-sm bg-[#2a1a0e] py-1 text-center font-crt text-lg text-cream-dim">
            {index + 1} / {items.length}
          </div>
        </div>

        <div className="preserve-3d absolute inset-x-[6%] bottom-[12%] top-[4%]">
          {items.map((item, i) => {
            const offset = i - index;
            if (offset < -2 || offset > VISIBLE_BEHIND) return null;
            const front = imageFor(item, "front");
            let transform: string;
            let opacity = 1;
            if (offset < 0) {
              transform = `translateZ(${40 - offset * 10}px) rotateX(-68deg) translateY(${-offset * 6}px)`;
              opacity = offset === -1 ? 1 : 0.6;
            } else if (offset === 0) {
              transform = "translateZ(0) rotateX(0deg)";
            } else {
              transform = `translateZ(${-offset * 26}px) translateY(${-offset * 16}px) rotateX(${8 + offset}deg)`;
            }
            return (
              <button
                key={item.slug}
                id={`cd-${item.slug}`}
                role="option"
                aria-selected={offset === 0}
                tabIndex={-1}
                onClick={() => (offset === 0 ? onOpen(item) : setIndex(i))}
                className="absolute inset-x-0 bottom-0 origin-bottom overflow-hidden rounded-[3px] shadow-[0_-6px_18px_#0009] transition-[transform,opacity] duration-300 ease-out"
                style={{ transform, opacity, zIndex: 50 - Math.abs(offset), aspectRatio: "142 / 125" }}
                aria-label={`${item.title} by ${item.creator}`}
              >
                {front && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={front.src} alt="" draggable={false} className="h-full w-full object-cover" />
                )}
                {/* jewel case glare */}
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_35%,#ffffff2a_45%,transparent_58%)]" />
                {offset > 0 && <span className="absolute inset-0 bg-black" style={{ opacity: Math.min(0.15 * offset, 0.6) }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 text-center" aria-live="polite">
        <p className="font-display text-xl">{current.title}</p>
        <p className="text-cream-dim">
          {current.creator} · {current.releaseYear} ·{" "}
          <span className="font-crt text-xl text-mustard">{formatPrice(current.priceCents)}</span>
        </p>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => step(-1)}
          disabled={index === 0}
          className="rounded-md border border-night-3 px-4 py-2 font-crt text-xl hover:border-teal disabled:opacity-30"
        >
          ◂ BACK
        </button>
        <button onClick={() => onOpen(current)} className="rounded-md bg-teal px-4 py-2 font-crt text-xl text-night hover:brightness-110">
          PULL IT
        </button>
        <button
          onClick={() => step(1)}
          disabled={index === items.length - 1}
          className="rounded-md border border-night-3 px-4 py-2 font-crt text-xl hover:border-teal disabled:opacity-30"
        >
          FLIP ▸
        </button>
      </div>
    </div>
  );
}
