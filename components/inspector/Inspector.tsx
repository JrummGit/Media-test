"use client";

import { useState } from "react";
import { decadeOf, formatPrice, FORMAT_LABEL, imageFor, type Item } from "@/lib/types";
import { useCart } from "@/components/cart/CartProvider";
import { FlipCase } from "./FlipCase";
import { ZoomViewer } from "./ZoomViewer";

export function Inspector({ item, compact = false }: { item: Item; compact?: boolean }) {
  const { add, has } = useCart();
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const inCart = has(item.slug);
  const onHold = item.status === "reserved";

  return (
    <div className={`grid gap-8 ${compact ? "md:grid-cols-[1.1fr_1fr]" : "md:grid-cols-[1.2fr_1fr]"} md:items-center`}>
      <FlipCase item={item} maxHeight={compact ? 380 : 460} onZoom={(src, alt) => setZoom({ src, alt })} />

      <div>
        <p className="font-crt text-xl uppercase tracking-widest text-teal">
          {FORMAT_LABEL[item.format].replace(/s$/, "")} · {item.releaseYear} · {item.genres.join(" / ")}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{item.title}</h1>
        <p className="mt-1 text-lg text-cream-dim">{item.creator}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-night-3 bg-night-2 p-3">
            <dt className="text-cream-dim">Condition</dt>
            <dd className="font-semibold">{item.condition}</dd>
          </div>
          <div className="rounded-md border border-night-3 bg-night-2 p-3">
            <dt className="text-cream-dim">Era</dt>
            <dd className="font-semibold">{decadeOf(item.releaseYear)}</dd>
          </div>
        </dl>

        {item.notes && (
          <p className="mt-4 rounded-md border-l-4 border-mustard bg-night-2 p-3 text-sm leading-relaxed">
            <span className="font-crt text-lg text-mustard">GRADER&apos;S NOTES: </span>
            {item.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {item.sealed && <span className="sticker px-2 py-0.5 text-xs">Factory sealed</span>}
          {item.tags.map((t) => (
            <span key={t} className="rounded-full border border-night-3 px-2.5 py-0.5 text-xs text-cream-dim">
              #{t}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <p className="font-crt text-4xl text-mustard">{formatPrice(item.priceCents)}</p>
          <button
            disabled={inCart || onHold}
            onClick={() =>
              add({
                slug: item.slug,
                title: item.title,
                creator: item.creator,
                format: item.format,
                priceCents: item.priceCents,
                image: imageFor(item, "front")?.src ?? "",
              })
            }
            className="relative rotate-[-2deg] rounded-sm bg-tape px-6 py-3 font-display text-lg text-white shadow-[3px_4px_0_#0008] transition hover:rotate-0 hover:brightness-110 disabled:rotate-0 disabled:bg-night-3 disabled:text-cream-dim"
          >
            {onHold ? "On hold" : inCart ? "In your stack ✓" : "Add to stack"}
          </button>
        </div>
        <p className="mt-2 text-xs text-cream-dim">One of a kind. Once it&apos;s gone, it&apos;s gone.</p>
      </div>

      {zoom && <ZoomViewer src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  );
}
