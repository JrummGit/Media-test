import "server-only";
import { serviceDb } from "@/lib/supabase/service";
import type { Condition, Format, ImageRole, ItemStatus, MediaPreview } from "@/lib/types";

/** Everything the admin needs about a listing, including drafts and sold items. */
export interface AdminItem {
  id: string;
  slug: string;
  title: string;
  creator: string;
  format: Format;
  releaseYear: number;
  genres: string[];
  tags: string[];
  condition: Condition;
  sealed: boolean;
  notes: string;
  priceCents: number;
  status: ItemStatus;
  featured: boolean;
  isSample: boolean;
  accent: string | null;
  ground: string | null;
  preview: MediaPreview | null;
  createdAt: string;
  images: { role: ImageRole; path: string; src: string; width: number; height: number }[];
}

interface Row {
  id: string;
  slug: string;
  title: string;
  creator: string;
  format: Format;
  release_year: number;
  genres: string[];
  tags: string[];
  condition: Condition;
  sealed: boolean;
  notes: string | null;
  price_cents: number;
  status: ItemStatus;
  featured: boolean;
  is_sample: boolean;
  accent: string | null;
  ground: string | null;
  preview: MediaPreview | null;
  created_at: string;
  item_images: { role: ImageRole; storage_path: string; width: number; height: number; sort: number }[];
}

export function imageUrl(path: string): string {
  if (/^(\/|https?:)/.test(path)) return path;
  return serviceDb().storage.from("item-images").getPublicUrl(path).data.publicUrl;
}

function toAdminItem(r: Row): AdminItem {
  return {
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
    isSample: r.is_sample,
    accent: r.accent,
    ground: r.ground,
    preview: r.preview,
    createdAt: r.created_at,
    images: [...(r.item_images ?? [])]
      .sort((a, b) => a.sort - b.sort)
      .map((i) => ({ role: i.role, path: i.storage_path, src: imageUrl(i.storage_path), width: i.width, height: i.height })),
  };
}

const SELECT = "*, item_images(role, storage_path, width, height, sort)";

export async function listAllItems(): Promise<AdminItem[]> {
  const { data, error } = await serviceDb().from("items").select(SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toAdminItem);
}

export async function getAdminItem(id: string): Promise<AdminItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await serviceDb().from("items").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toAdminItem(data as Row) : null;
}

export interface AdminOrder {
  id: string;
  createdAt: string;
  email: string | null;
  status: string;
  totalCents: number;
  shippingCents: number;
  trackingNumber: string | null;
  shippedAt: string | null;
  address: { name?: string; address?: Record<string, string | null> } | null;
  items: { slug: string; title: string; format: Format | null }[];
}

export async function listOrders(): Promise<AdminOrder[]> {
  const db = serviceDb();
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  const slugs = [...new Set((data ?? []).flatMap((o) => o.item_slugs ?? []))];
  const { data: items } = slugs.length
    ? await db.from("items").select("slug, title, format").in("slug", slugs)
    : { data: [] as { slug: string; title: string; format: Format }[] };
  const bySlug = new Map((items ?? []).map((i) => [i.slug, i]));
  return (data ?? []).map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    email: o.email,
    status: o.status,
    totalCents: o.total_cents,
    shippingCents: o.shipping_cents,
    trackingNumber: o.tracking_number,
    shippedAt: o.shipped_at,
    address: o.shipping_address,
    items: (o.item_slugs ?? []).map((s: string) => ({ slug: s, title: bySlug.get(s)?.title ?? s, format: bySlug.get(s)?.format ?? null })),
  }));
}
