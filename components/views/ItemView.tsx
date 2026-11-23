import Link from "next/link";
import { FORMAT_LABEL, type Item } from "@/lib/types";
import { Inspector } from "@/components/inspector/Inspector";
import { ItemCard } from "@/components/ItemCard";

/** Up to five nearby-era items, preferring the same format. */
export function relatedItems(catalog: Item[], item: Item): Item[] {
  return catalog
    .filter((i) => i.slug !== item.slug && (i.format === item.format || Math.abs(i.releaseYear - item.releaseYear) <= 3))
    .sort((a, b) => Math.abs(a.releaseYear - item.releaseYear) - Math.abs(b.releaseYear - item.releaseYear))
    .slice(0, 5);
}

export function ItemView({ item, related }: { item: Item; related: Item[] }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 font-crt text-lg text-cream-dim">
        <Link href="/" className="hover:text-cream">SHOP</Link> /{" "}
        <Link href={`/${item.format}`} className="hover:text-cream">{FORMAT_LABEL[item.format].toUpperCase()}</Link> /{" "}
        <span className="text-cream">{item.title.toUpperCase()}</span>
      </nav>
      <Inspector item={item} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-display text-xl">From the same era</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {related.map((r) => (
              <li key={r.slug}>
                <ItemCard item={r} href={`/item/${r.slug}`} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
