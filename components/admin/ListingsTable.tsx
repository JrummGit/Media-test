"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { removeSampleItems, setFeatured, setItemStatus } from "@/app/admin/actions";
import type { AdminItem } from "@/lib/admin-data";
import { CASE_DIMENSIONS, FORMAT_LABEL, formatPrice } from "@/lib/types";

const FILTERS = ["all", "active", "draft", "reserved", "sold"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<string, string> = {
  active: "bg-teal/20 text-teal",
  draft: "bg-night-3 text-cream-dim",
  reserved: "bg-mustard/20 text-mustard",
  sold: "bg-tape/20 text-tape",
};

export function ListingsTable({ items }: { items: AdminItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, start] = useTransition();
  const [confirmSamples, setConfirmSamples] = useState(false);
  const samples = items.filter((i) => i.isSample && (i.status === "active" || i.status === "draft")).length;
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? items.length : items.filter((i) => i.status === f).length])), [items]);
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-display text-2xl">Listings</h1>
        <Link href="/admin/listings/new" className="rounded-md bg-pink px-4 py-2 font-display text-white hover:brightness-110">
          + New listing
        </Link>
      </div>

      {samples > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-mustard/40 bg-mustard/10 p-3 text-sm">
          <p className="flex-1">
            {samples} sample items are still in the shop. Remove them once you&apos;ve added some real listings.
          </p>
          {confirmSamples ? (
            <>
              <button disabled={pending} onClick={() => start(async () => { await removeSampleItems(); setConfirmSamples(false); })} className="rounded bg-tape px-3 py-1.5 font-semibold text-white">
                {pending ? "Removing…" : `Yes, remove ${samples}`}
              </button>
              <button onClick={() => setConfirmSamples(false)} className="rounded border border-night-3 px-3 py-1.5">Keep them</button>
            </>
          ) : (
            <button onClick={() => setConfirmSamples(true)} className="rounded border border-mustard px-3 py-1.5 text-mustard">Remove samples</button>
          )}
        </div>
      )}

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`shrink-0 rounded-full border px-3 py-0.5 font-crt text-lg uppercase ${filter === f ? "border-mustard text-mustard" : "border-night-3 text-cream-dim"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-cream-dim">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-night-3 rounded-lg border border-night-3 bg-night-2/60">
          {shown.map((item) => {
            const front = item.images.find((i) => i.role === "front");
            const dim = CASE_DIMENSIONS[item.format];
            const editable = item.status === "active" || item.status === "draft";
            return (
              <li key={item.id} className="flex items-center gap-3 p-3">
                <div className="w-12 shrink-0 overflow-hidden rounded-sm bg-night-3" style={{ aspectRatio: `${dim.w} / ${dim.h}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {front && <img src={front.src} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {item.title} {item.isSample && <span className="ml-1 rounded bg-night-3 px-1 text-[10px] uppercase text-cream-dim">sample</span>}
                  </p>
                  <p className="truncate text-xs text-cream-dim">
                    {FORMAT_LABEL[item.format].replace(/s$/, "")} · {item.creator} · {item.releaseYear} · {formatPrice(item.priceCents)}
                  </p>
                </div>
                <span className={`hidden rounded px-2 py-0.5 font-crt text-lg uppercase sm:inline ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                <button
                  disabled={pending}
                  onClick={() => start(() => setFeatured(item.id, !item.featured))}
                  aria-pressed={item.featured}
                  aria-label={item.featured ? `Unfeature ${item.title}` : `Feature ${item.title} in Staff picks`}
                  title="Staff pick"
                  className={`text-xl ${item.featured ? "text-mustard" : "text-night-3 hover:text-cream-dim"}`}
                >
                  ★
                </button>
                {editable && (
                  <button
                    disabled={pending}
                    onClick={() => start(() => setItemStatus(item.id, item.status === "active" ? "draft" : "active"))}
                    className="rounded border border-night-3 px-2 py-1 text-xs hover:border-teal"
                  >
                    {item.status === "active" ? "Unpublish" : "Publish"}
                  </button>
                )}
                {editable ? (
                  <Link href={`/admin/listings/${item.id}`} className="rounded border border-night-3 px-2 py-1 text-xs hover:border-pink">Edit</Link>
                ) : (
                  <span className={`rounded px-2 py-0.5 font-crt text-lg uppercase sm:hidden ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
