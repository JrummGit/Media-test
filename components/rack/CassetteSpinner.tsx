"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice, imageFor, type Item } from "@/lib/types";

/**
 * A rotating wire spinner rack. Cassettes hang around a cylinder in tiers.
 * Drag or swipe sideways to spin it, use the arrow keys, or tap a cassette facing you.
 */
export function CassetteSpinner({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  const tiers = items.length <= 8 ? 1 : items.length <= 18 ? 2 : 3;
  const perTier = Math.max(6, Math.ceil(items.length / tiers));
  const step = 360 / perTier;

  // Card width and cylinder radius scale with the viewport.
  const [cardW, setCardW] = useState(120);
  useEffect(() => {
    const fit = () => setCardW(Math.max(88, Math.min(130, window.innerWidth / 4.2)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const cardH = (cardW * 109) / 70;
  const radius = Math.round((cardW / 2 + 14) / Math.tan(Math.PI / perTier));

  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; a: number; moved: boolean } | null>(null);

  const frontSlot = (((Math.round(-angle / step) % perTier) + perTier) % perTier);
  const snapTo = (a: number) => setAngle(Math.round(a / step) * step);

  return (
    <div className="flex flex-col items-center">
      <div
        tabIndex={0}
        role="group"
        aria-label="Cassette spinner rack. Drag or use the arrow keys to spin it."
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          snapTo(angle + (e.key === "ArrowLeft" ? step : -step));
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, a: angle, moved: false };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 5) d.moved = true;
          setAngle(d.a + dx * 0.35);
        }}
        onPointerUp={() => {
          setDragging(false);
          if (drag.current?.moved) snapTo(angle);
          // Keep the drag record until after the click handler sees `moved`.
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          if (!drag.current) return;
          setDragging(false);
          snapTo(angle);
          drag.current = null;
        }}
        className="relative w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
        style={{ perspective: "1000px", height: tiers * (cardH + 34) + 60 }}
      >
        {/* centre pole */}
        <div className="absolute bottom-0 left-1/2 top-0 w-2 -translate-x-1/2 rounded bg-gradient-to-r from-[#6d7486] via-[#d5dae4] to-[#6d7486]" />
        {/* base */}
        <div className="absolute bottom-0 left-1/2 h-4 w-48 -translate-x-1/2 rounded-full bg-[#2b2f3a] shadow-[0_8px_16px_#000]" />

        {Array.from({ length: tiers }, (_, t) => (
          <div
            key={t}
            className="preserve-3d absolute left-1/2"
            style={{
              top: 20 + t * (cardH + 34),
              width: cardW,
              height: cardH,
              marginLeft: -cardW / 2,
              transform: `translateZ(${-radius}px) rotateY(${angle}deg)`,
              transition: dragging ? "none" : "transform 500ms cubic-bezier(.2,.8,.2,1)",
            }}
          >
            {Array.from({ length: perTier }, (_, s) => {
              const item = items[t * perTier + s];
              if (!item) return null;
              const front = imageFor(item, "front");
              const facing = s === frontSlot;
              return (
                <button
                  key={item.slug}
                  aria-label={`${item.title} by ${item.creator}`}
                  tabIndex={facing ? 0 : -1}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    if (facing) onOpen(item);
                    else snapTo(-s * step);
                  }}
                  className="backface-hidden absolute inset-0 overflow-hidden rounded-[2px] border border-black/40 shadow-[0_10px_18px_-6px_#000]"
                  style={{ transform: `rotateY(${s * step}deg) translateZ(${radius}px)` }}
                >
                  {front && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={front.src} alt="" draggable={false} className="h-full w-full object-cover" />
                  )}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,#ffffff22_50%,transparent_60%)]" />
                  {/* hanging hook */}
                  <span className="absolute left-1/2 top-0 h-2 w-6 -translate-x-1/2 rounded-b bg-[#cfd4de]" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <FacingCaption items={items} perTier={perTier} frontSlot={frontSlot} tiers={tiers} />
      <div className="mt-3 flex gap-3">
        <button onClick={() => snapTo(angle + step)} className="rounded-md border border-night-3 px-4 py-2 font-crt text-xl hover:border-teal">
          ⟲ SPIN
        </button>
        <button onClick={() => snapTo(angle - step)} className="rounded-md border border-night-3 px-4 py-2 font-crt text-xl hover:border-teal">
          SPIN ⟳
        </button>
      </div>
    </div>
  );
}

function FacingCaption({ items, perTier, frontSlot, tiers }: { items: Item[]; perTier: number; frontSlot: number; tiers: number }) {
  const facing = Array.from({ length: tiers }, (_, t) => items[t * perTier + frontSlot]).filter(Boolean);
  return (
    <div className="mt-4 min-h-12 text-center" aria-live="polite">
      {facing.map((item) => (
        <p key={item.slug} className="text-sm">
          <span className="font-semibold">{item.creator}</span> · {item.title}{" "}
          <span className="font-crt text-lg text-mustard">{formatPrice(item.priceCents)}</span>
        </p>
      ))}
    </div>
  );
}
