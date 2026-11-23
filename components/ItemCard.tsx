import { CASE_DIMENSIONS, formatPrice, imageFor, shortDecade, type Item } from "@/lib/types";

/** Flat cover card used in grids and home-page shelves. */
export function ItemCard({ item, onOpen, href }: { item: Item; onOpen?: () => void; href?: string }) {
  const front = imageFor(item, "front");
  const dim = CASE_DIMENSIONS[item.format];
  const inner = (
    <>
      <div
        className="relative overflow-hidden rounded-[3px] bg-night-3 shadow-[0_12px_24px_-10px_#000] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_30px_-10px_#000]"
        style={{ aspectRatio: `${dim.w} / ${dim.h}` }}
      >
        {front && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={front.src} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        {item.sealed && <span className="sticker absolute right-1 top-2 px-1.5 text-[10px]">Sealed</span>}
        {item.status === "reserved" && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center font-crt text-lg">ON HOLD</span>
        )}
      </div>
      <div className="mt-2 text-left">
        <p className="truncate text-sm font-semibold leading-tight">{item.title}</p>
        <p className="truncate text-xs text-cream-dim">
          {item.creator} · {shortDecade(item.releaseYear)}
        </p>
        <p className="font-crt text-xl leading-tight text-mustard">{formatPrice(item.priceCents)}</p>
      </div>
    </>
  );
  if (href)
    return (
      <a href={href} className="group block" aria-label={`${item.title} by ${item.creator}`}>
        {inner}
      </a>
    );
  return (
    <button onClick={onOpen} className="group block w-full" aria-label={`${item.title} by ${item.creator}`}>
      {inner}
    </button>
  );
}

export function GridView({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.slug}>
          <ItemCard item={item} onOpen={() => onOpen(item)} />
        </li>
      ))}
    </ul>
  );
}
