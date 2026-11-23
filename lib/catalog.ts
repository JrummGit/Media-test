import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SEED_ITEMS } from "@/data/seed";
import { CASE_DIMENSIONS, type Format, type Item, type ItemImage } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

const ART_SCALE = 4;

function seedCatalog(): Item[] {
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
    };
  });
}

interface ItemRow {
  id: string;
  slug: string;
  title: string;
  creator: string;
  format: Format;
  release_year: number;
  genres: string[];
  tags: string[];
  condition: Item["condition"];
  sealed: boolean;
  notes: string | null;
  price_cents: number;
  status: Item["status"];
  featured: boolean;
  accent: string | null;
  created_at: string;
  item_images: { role: ItemImage["role"]; storage_path: string; width: number; height: number; sort: number }[];
}

async function supabaseCatalog(): Promise<Item[]> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("items")
    .select("*, item_images(role, storage_path, width, height, sort)")
    .in("status", ["active", "reserved"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ItemRow[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    creator: r.creator,
    format: r.format,
    releaseYear: r.release_year,
    genres: r.genres ?? [],
    tags: r.tags ?? [],
    condition: r.condition,
    sealed: r.sealed,
    notes: r.notes ?? "",
    priceCents: r.price_cents,
    status: r.status,
    featured: r.featured,
    createdAt: r.created_at,
    accent: r.accent ?? "#ff3d81",
    images: [...r.item_images]
      .sort((a, b) => a.sort - b.sort)
      .map((img) => ({
        role: img.role,
        width: img.width,
        height: img.height,
        src: supabase.storage.from("item-images").getPublicUrl(img.storage_path).data.publicUrl,
      })),
  }));
}

/** Every listing currently visible in the shop (active or on hold). */
export async function getCatalog(): Promise<Item[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const items = usingSupabase ? await supabaseCatalog() : seedCatalog();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getItemsByFormat(format: Format): Promise<Item[]> {
  return (await getCatalog()).filter((i) => i.format === format);
}

export async function getItem(slug: string): Promise<Item | undefined> {
  return (await getCatalog()).find((i) => i.slug === slug);
}
