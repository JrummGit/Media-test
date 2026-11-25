import "server-only";
import { createClient } from "@supabase/supabase-js";
import { seedCatalog } from "@/lib/seed-catalog";
import type { Format, Item, ItemImage, MediaPreview } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

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
  reserved_until: string | null;
  featured: boolean;
  accent: string | null;
  ground: string | null;
  preview: (MediaPreview & { enabled?: boolean }) | null;
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
    // A hold that ran out (e.g. a missed webhook) shouldn't hide the item.
    status: r.status === "reserved" && r.reserved_until && new Date(r.reserved_until) < new Date() ? "active" : r.status,
    featured: r.featured,
    createdAt: r.created_at,
    accent: r.accent ?? "#ff3d81",
    ground: r.ground ?? undefined,
    preview: r.preview && r.preview.enabled !== false ? r.preview : undefined,
    images: [...r.item_images]
      .sort((a, b) => a.sort - b.sort)
      .map((img) => ({
        role: img.role,
        width: img.width,
        height: img.height,
        // Sample items point at art bundled with the site ("/seed/…"); real
        // listings point at photos in the Supabase storage bucket.
        src: /^(\/|https?:)/.test(img.storage_path)
          ? img.storage_path
          : supabase.storage.from("item-images").getPublicUrl(img.storage_path).data.publicUrl,
      })),
  }));
}

/** Loads every listing visible in the shop, newest first (uncached). */
export async function loadCatalog(): Promise<Item[]> {
  const items = usingSupabase ? await supabaseCatalog() : seedCatalog();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
