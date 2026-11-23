"use client";

import { useEffect, useMemo, useState } from "react";
import { CONDITIONS, decadeOf, type Format, type Item } from "@/lib/types";
import { Inspector } from "@/components/inspector/Inspector";
import { GridView } from "@/components/ItemCard";
import { CassetteSpinner } from "./CassetteSpinner";
import { CdBin } from "./CdBin";
import { VhsShelf } from "./VhsShelf";

type View = "rack" | "grid";
type Sort = "new" | "price-asc" | "price-desc" | "year-asc" | "year-desc";

const VIEW_KEY = "pressplay.view.v1";

export function RackBrowser({ format, items }: { format: Format; items: Item[] }) {
  const [view, setView] = useState<View>("rack");
  const [decade, setDecade] = useState<string | null>(null);
  const [genre, setGenre] = useState<string>("");
  const [minCondition, setMinCondition] = useState<string>("");
  const [sealedOnly, setSealedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [open, setOpen] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Restore the shopper's preferred view, and default to the grid when they
  // have asked their device to reduce motion.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore preference after mount
    if (saved === "grid" || saved === "rack") setView(saved);
    else if (reduce) setView("grid");
  }, []);
  const chooseView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const decades = useMemo(() => [...new Set(items.map((i) => decadeOf(i.releaseYear)))].sort(), [items]);
  const genres = useMemo(() => [...new Set(items.flatMap((i) => i.genres))].sort(), [items]);

  const filtered = useMemo(() => {
    const condRank = (c: string) => CONDITIONS.indexOf(c as (typeof CONDITIONS)[number]);
    const list = items.filter(
      (i) =>
        (!decade || decadeOf(i.releaseYear) === decade) &&
        (!genre || i.genres.includes(genre)) &&
        (!minCondition || condRank(i.condition) <= condRank(minCondition)) &&
        (!sealedOnly || i.sealed),
    );
    const sorters: Record<Sort, (a: Item, b: Item) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.priceCents - b.priceCents,
      "price-desc": (a, b) => b.priceCents - a.priceCents,
      "year-asc": (a, b) => a.releaseYear - b.releaseYear,
      "year-desc": (a, b) => b.releaseYear - a.releaseYear,
    };
    return [...list].sort(sorters[sort]);
  }, [items, decade, genre, minCondition, sealedOnly, sort]);

  // Close the modal on Escape and lock page scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeFilters = [decade, genre, minCondition, sealedOnly || null].filter(Boolean).length;
  const selectCls =
    "rounded-md border border-night-3 bg-night-2 px-2 py-1.5 text-sm text-cream focus:border-teal";

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-night-3 bg-night-2 p-1" role="group" aria-label="View">
          {(["rack", "grid"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => chooseView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-3 py-0.5 font-crt text-lg uppercase ${view === v ? "bg-teal text-night" : "text-cream-dim"}`}
            >
              {v === "rack" ? "Browse rack" : "Grid"}
            </button>
          ))}
        </div>

        <div className="no-scrollbar order-last -mx-4 flex basis-full gap-1.5 overflow-x-auto px-4 sm:order-none sm:mx-0 sm:flex-1 sm:basis-auto sm:px-0" role="group" aria-label="Decade">
          <button
            onClick={() => setDecade(null)}
            aria-pressed={!decade}
            className={`shrink-0 rounded-full border px-3 py-0.5 font-crt text-lg ${!decade ? "border-mustard text-mustard" : "border-night-3 text-cream-dim"}`}
          >
            ALL ERAS
          </button>
          {decades.map((d) => (
            <button
              key={d}
              onClick={() => setDecade(d === decade ? null : d)}
              aria-pressed={decade === d}
              className={`shrink-0 rounded-full border px-3 py-0.5 font-crt text-lg ${decade === d ? "border-mustard text-mustard" : "border-night-3 text-cream-dim"}`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          className="ml-auto rounded-md border border-night-3 px-3 py-1 font-crt text-lg text-cream-dim hover:text-cream sm:ml-0"
        >
          FILTERS{activeFilters > 0 ? ` (${activeFilters})` : ""} {showFilters ? "▴" : "▾"}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-night-3 bg-night-2/70 p-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-cream-dim">
            Genre
            <select className={selectCls} value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any genre</option>
              {genres.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream-dim">
            Condition
            <select className={selectCls} value={minCondition} onChange={(e) => setMinCondition(e.target.value)}>
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c} or better
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cream-dim">
            Sort
            <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="new">Newest arrivals</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="year-asc">Oldest release</option>
              <option value="year-desc">Newest release</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={sealedOnly} onChange={(e) => setSealedOnly(e.target.checked)} className="h-4 w-4 accent-pink" />
            Sealed only
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-20 text-center font-crt text-3xl text-cream-dim">
          NOTHING ON THIS SHELF
          <br />
          <span className="text-xl">Try another era or clear filters.</span>
        </p>
      ) : view === "grid" ? (
        <GridView items={filtered} onOpen={setOpen} />
      ) : format === "vhs" ? (
        <VhsShelf items={filtered} onOpen={setOpen} />
      ) : format === "cd" ? (
        <CdBin items={filtered} onOpen={setOpen} />
      ) : (
        <CassetteSpinner items={filtered} onOpen={setOpen} />
      )}

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-night/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={open.title}>
          <div className="mx-auto max-w-5xl px-4 py-6 sm:py-12">
            <div className="mb-2 flex items-center justify-between">
              <a href={`/item/${open.slug}`} className="font-crt text-lg text-cream-dim underline hover:text-cream">
                Open full page ↗
              </a>
              <button onClick={() => setOpen(null)} className="font-crt text-3xl text-cream" aria-label="Put it back">
                ✕
              </button>
            </div>
            <Inspector item={open} compact />
          </div>
        </div>
      )}
    </div>
  );
}
