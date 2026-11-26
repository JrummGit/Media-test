/** Shared, pure listing rules for the admin form and its server actions. */
import { CONDITIONS, FORMATS, type Condition, type Format, type ImageRole } from "@/lib/types";

export interface ListingImageInput {
  role: ImageRole;
  /** Path in the item-images bucket, or a bundled "/seed/…" path. */
  path: string;
  width: number;
  height: number;
}

export interface ListingInput {
  id?: string;
  format: Format;
  title: string;
  creator: string;
  releaseYear: number;
  genres: string[];
  tags: string[];
  condition: Condition;
  sealed: boolean;
  notes: string;
  priceCents: number;
  status: "draft" | "active";
  featured: boolean;
  accent: string | null;
  ground: string | null;
  images: ListingImageInput[];
}

export type ValidationResult = { ok: true; value: ListingInput } | { ok: false; errors: Record<string, string> };

const HEX = /^#[0-9a-f]{6}$/i;

/** Splits "Action, Sci-Fi" into tidy, de-duplicated labels. */
export function splitList(raw: string | string[], max = 8): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = p.trim().replace(/\s+/g, " ").slice(0, 40);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, max);
}

/** "12.50" or "$12" → 1250. Returns NaN for anything else. */
export function parsePrice(raw: string): number {
  const m = raw.trim().replace(/^\$/, "").match(/^(\d{1,5})(?:\.(\d{1,2}))?$/);
  if (!m) return NaN;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

export function slugify(title: string, year: number): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "item"}-${year}`;
}

/** First free slug: base, base-2, base-3… */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export function validateListing(input: Partial<ListingInput>, now = new Date()): ValidationResult {
  const errors: Record<string, string> = {};
  const title = (input.title ?? "").trim();
  const creator = (input.creator ?? "").trim();
  const year = Number(input.releaseYear);
  if (!input.format || !FORMATS.includes(input.format)) errors.format = "Pick a format.";
  if (!title) errors.title = "Add a title.";
  if (title.length > 160) errors.title = "Keep the title under 160 characters.";
  if (!creator) errors.creator = input.format === "vhs" ? "Add the studio." : "Add the artist.";
  if (!Number.isInteger(year) || year < 1950 || year > now.getFullYear() + 1) errors.releaseYear = "Enter a year from 1950 on.";
  if (!input.condition || !CONDITIONS.includes(input.condition)) errors.condition = "Pick a condition.";
  const price = Number(input.priceCents);
  if (!Number.isInteger(price) || price < 100 || price > 1_000_000) errors.priceCents = "Enter a price between $1 and $10,000.";
  const images = (input.images ?? []).filter((i) => i.path);
  if (!images.some((i) => i.role === "front")) errors.images = "Add a front photo.";
  if (input.status === "active" && !images.some((i) => i.role === "back")) errors.images = "Add a back photo before publishing.";
  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      id: input.id,
      format: input.format!,
      title,
      creator,
      releaseYear: year,
      genres: splitList(input.genres ?? []),
      tags: splitList(input.tags ?? [], 12),
      condition: input.condition!,
      sealed: Boolean(input.sealed),
      notes: (input.notes ?? "").trim().slice(0, 2000),
      priceCents: price,
      status: input.status === "active" ? "active" : "draft",
      featured: Boolean(input.featured),
      accent: input.accent && HEX.test(input.accent) ? input.accent : null,
      ground: input.ground && HEX.test(input.ground) ? input.ground : null,
      images: images.map((i) => ({ role: i.role, path: i.path, width: Math.round(i.width) || 1, height: Math.round(i.height) || 1 })),
    },
  };
}
