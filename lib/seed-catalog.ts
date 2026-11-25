import { SEED_ITEMS } from "@/data/seed";
import { CASE_DIMENSIONS, type Item, type ItemImage } from "@/lib/types";

const ART_SCALE = 4;

export function seedCatalog(): Item[] {
  return SEED_ITEMS.map((s, i) => {
    const dim = CASE_DIMENSIONS[s.format];
    const images: ItemImage[] = [
      { role: "front", src: `/seed/${s.slug}-front.svg`, width: dim.w * ART_SCALE, height: dim.h * ART_SCALE },
      { role: "back", src: `/seed/${s.slug}-back.svg`, width: dim.w * ART_SCALE, height: dim.h * ART_SCALE },
      { role: "spine", src: `/seed/${s.slug}-spine.svg`, width: dim.d * ART_SCALE, height: dim.h * ART_SCALE },
    ];
    return {
      id: `seed-${i}`,
      slug: s.slug,
      title: s.title,
      creator: s.creator,
      format: s.format,
      releaseYear: s.releaseYear,
      genres: s.genres,
      tags: s.tags,
      condition: s.condition,
      sealed: s.sealed,
      notes: s.notes,
      priceCents: s.priceCents,
      status: "active",
      featured: s.featured,
      // Stagger dates so "fresh in" ordering is meaningful.
      createdAt: new Date(Date.UTC(2026, 10, 20) - i * 36e5 * 7).toISOString(),
      images,
      accent: s.palette[1],
      ground: s.palette[0],
      preview:
        s.format === "vhs"
          ? { kind: "video", provider: "generated", title: "Trailer" }
          : { kind: "audio", provider: "generated", title: s.tracks?.[0] ?? s.title },
    };
  });
}
