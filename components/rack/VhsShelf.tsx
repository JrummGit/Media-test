"use client";

import { useState } from "react";
import { CASE_DIMENSIONS, imageFor, type Item } from "@/lib/types";

const SPINE_H = 230;
const PLANK_H = 16;
const ROW_GAP = PLANK_H + 28;
const SPINE_W = Math.round((CASE_DIMENSIONS.vhs.d / CASE_DIMENSIONS.vhs.h) * SPINE_H) + 6;

/**
 * Tapes stand spine-out on one long wooden wall, sorted by genre with divider
 * cards like a rental store. Hover or focus tilts a tape out; tapping pulls it.
 */
export function VhsShelf({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  const [pulling, setPulling] = useState<string | null>(null);

  const sorted = [...items].sort(
    (a, b) => (a.genres[0] ?? "").localeCompare(b.genres[0] ?? "") || a.title.localeCompare(b.title),
  );

  function pull(item: Item) {
    setPulling(item.slug);
    setTimeout(() => {
      onOpen(item);
      setPulling(null);
    }, 280);
  }

  const cells: React.ReactNode[] = [];
  let lastGenre = "";
  for (const item of sorted) {
    const genre = item.genres[0] ?? "Misc";
    if (genre !== lastGenre) {
      lastGenre = genre;
      cells.push(
        <li key={`div-${genre}`} aria-hidden className="relative mx-1" style={{ height: SPINE_H, width: 30 }}>
          {/* genre divider card, taller than the tapes */}
          <div
            className="absolute bottom-0 flex w-full items-start justify-center rounded-t-md border-2 border-cream/80 bg-night-3 pt-2 shadow-[2px_0_0_#0008]"
            style={{ height: SPINE_H + 18 }}
          >
            <span className="font-display text-xs tracking-[0.2em] text-mustard" style={{ writingMode: "vertical-rl" }}>
              {genre.toUpperCase()}
            </span>
          </div>
        </li>,
      );
    }
    const spine = imageFor(item, "spine");
    const isPulling = pulling === item.slug;
    cells.push(
      <li key={item.slug} className="relative" style={{ width: SPINE_W, height: SPINE_H }}>
        <button
          onClick={() => pull(item)}
          aria-label={`${item.title} (${item.releaseYear}), ${genre}`}
          title={item.title}
          className={`absolute inset-0 origin-bottom rounded-[2px] shadow-[2px_0_0_#0008,inset_-2px_0_0_#0004] transition duration-200 hover:-translate-y-3 hover:-rotate-3 focus-visible:-translate-y-3 ${
            isPulling ? "-translate-y-10 scale-105 opacity-0" : ""
          }`}
          style={{ background: item.accent, transitionDuration: isPulling ? "280ms" : undefined }}
        >
          {spine ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={spine.src} alt="" loading="lazy" className="h-full w-full rounded-[2px] object-cover" />
          ) : (
            <span className="block h-full w-full overflow-hidden p-1 font-display text-xs" style={{ writingMode: "vertical-rl" }}>
              {item.title}
            </span>
          )}
          {item.status === "reserved" && (
            <span className="absolute inset-x-0 top-1/2 bg-tape py-0.5 text-center font-crt text-xs">HOLD</span>
          )}
        </button>
      </li>,
    );
  }

  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-b from-[#1a1328] to-[#0f0b18] pt-8 shadow-[inset_0_10px_30px_#000a]">
      {/* Every wrapped row of tapes sits on its own plank. */}
      <ul
        className="flex flex-wrap items-end gap-x-1 px-3"
        style={{
          rowGap: ROW_GAP,
          paddingBottom: PLANK_H,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${SPINE_H}px, var(--wood-hi) ${SPINE_H}px, var(--wood) ${SPINE_H + 6}px, #3e2413 ${SPINE_H + PLANK_H}px, transparent ${SPINE_H + PLANK_H}px ${SPINE_H + ROW_GAP}px)`,
        }}
      >
        {cells}
      </ul>
    </div>
  );
}
