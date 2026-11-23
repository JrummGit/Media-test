import Link from "next/link";
import { CASE_DIMENSIONS, FORMAT_LABEL, imageFor, type Format, type Item } from "@/lib/types";
import { ItemCard } from "@/components/ItemCard";

export function ShopFloorView({ catalog }: { catalog: Item[] }) {
  const byFormat = (f: Format) => catalog.filter((i) => i.format === f);
  const fresh = catalog.slice(0, 10);
  const picks = catalog.filter((i) => i.featured).slice(0, 10);

  return (
    <div>
      {/* Storefront sign */}
      <section className="relative overflow-hidden border-b border-night-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,#ff3d8122,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 text-center sm:pt-20">
          <p className="font-crt text-xl tracking-[0.3em] text-cream-dim">EST. IN A GARAGE · OPEN LATE</p>
          <h1 className="neon flicker mt-2 font-display text-6xl leading-none sm:text-8xl">Press Play</h1>
          <p className="neon-teal mt-1 font-display text-2xl tracking-[0.4em] sm:text-3xl">MEDIA</p>
          <p className="mx-auto mt-6 max-w-lg text-lg text-cream-dim">
            Hand-picked VHS tapes, cassettes and CDs. Pull anything off the shelf and flip it over to see the real
            case before you buy.
          </p>
        </div>
      </section>

      {/* Aisles */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="aisles">
        <h2 id="aisles" className="sr-only">Aisles</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <Aisle format="vhs" label="Video Wall" items={byFormat("vhs")} />
          <Aisle format="cassette" label="Tape Spinner" items={byFormat("cassette")} />
          <Aisle format="cd" label="CD Crate" items={byFormat("cd")} />
        </div>
      </section>

      <Shelf title="Fresh in the drop box" subtitle="Newest arrivals" items={fresh} />
      {picks.length > 0 && <Shelf title="Staff picks" subtitle="Graded, cleaned and recommended" items={picks} />}
    </div>
  );
}

function Aisle({ format, label, items }: { format: Format; label: string; items: Item[] }) {
  return (
    <Link
      href={`/${format}`}
      className="group relative flex h-72 flex-col overflow-hidden rounded-xl border border-night-3 bg-night-2 transition hover:border-pink hover:shadow-[0_0_40px_-10px_#ff3d81]"
    >
      <div className="relative flex-1 overflow-hidden">
        <AisleArt format={format} items={items} />
        <div className="absolute inset-0 bg-gradient-to-t from-night-2 via-transparent to-transparent" />
      </div>
      <div className="relative flex items-end justify-between px-5 pb-4">
        <div>
          <p className="font-crt text-lg tracking-widest text-cream-dim">{FORMAT_LABEL[format].toUpperCase()}</p>
          <p className="font-display text-2xl group-hover:text-pink">{label}</p>
        </div>
        <span className="font-crt text-xl text-mustard">{items.length} in stock ▸</span>
      </div>
    </Link>
  );
}

function AisleArt({ format, items }: { format: Format; items: Item[] }) {
  if (format === "vhs") {
    // A row of real spines on a plank.
    return (
      <div className="absolute inset-x-4 bottom-2 top-6 flex items-end justify-center gap-[3px]">
        {items.slice(0, 9).map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.slug}
            src={imageFor(item, "spine")?.src}
            alt=""
            className="h-[92%] w-auto rounded-[1px] shadow-[2px_0_0_#0008] transition duration-300 group-hover:-translate-y-2"
            style={{ transitionDelay: `${i * 30}ms` }}
          />
        ))}
        <div className="plank absolute inset-x-[-1rem] bottom-[-12px]" />
      </div>
    );
  }
  if (format === "cassette") {
    // Fanned J-cards.
    const shown = items.slice(0, 5);
    return (
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        {shown.map((item, i) => {
          const mid = (shown.length - 1) / 2;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.slug}
              src={imageFor(item, "front")?.src}
              alt=""
              className="absolute h-[78%] rounded-[2px] shadow-[0_10px_20px_#000a] transition duration-500"
              style={{
                aspectRatio: `${CASE_DIMENSIONS.cassette.w} / ${CASE_DIMENSIONS.cassette.h}`,
                transform: `translateX(${(i - mid) * 44}px) rotate(${(i - mid) * 8}deg)`,
                zIndex: 10 - Math.abs(i - mid),
              }}
            />
          );
        })}
      </div>
    );
  }
  // CDs leaning in a crate.
  const shown = items.slice(0, 4);
  return (
    <div className="absolute inset-0 flex items-end justify-center" style={{ perspective: 600 }}>
      {shown.map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={item.slug}
          src={imageFor(item, "front")?.src}
          alt=""
          className="absolute bottom-10 w-[48%] origin-bottom rounded-[2px] shadow-[0_-4px_12px_#0009] transition duration-500 group-hover:[transform:var(--hover)]"
          style={
            {
              transform: `translateY(${-i * 14}px) translateZ(${-i * 30}px) rotateX(${8 + i * 2}deg)`,
              "--hover": `translateY(${-i * 22}px) translateZ(${-i * 30}px) rotateX(${4 + i * 2}deg)`,
              zIndex: 10 - i,
              filter: `brightness(${1 - i * 0.15})`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="absolute inset-x-6 bottom-0 z-20 h-14 rounded-t bg-gradient-to-b from-wood to-[#3e2413]" />
    </div>
  );
}

function Shelf({ title, subtitle, items }: { title: string; subtitle: string; items: Item[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="font-crt text-lg text-cream-dim">{subtitle}</p>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4">
        {items.map((item) => (
          <li key={item.slug} className="w-32 shrink-0 snap-start sm:w-40">
            <ItemCard item={item} href={`/item/${item.slug}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
