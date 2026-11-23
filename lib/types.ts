export const FORMATS = ["vhs", "cassette", "cd"] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABEL: Record<Format, string> = {
  vhs: "VHS",
  cassette: "Cassettes",
  cd: "CDs",
};

export const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Very Good+",
  "Very Good",
  "Good",
  "Fair",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type ImageRole = "front" | "back" | "spine" | "inside" | "disc" | "detail";

export interface ItemImage {
  role: ImageRole;
  src: string;
  width: number;
  height: number;
}

export type ItemStatus = "draft" | "active" | "reserved" | "sold";

export interface Item {
  id: string;
  slug: string;
  title: string;
  /** Artist (music) or studio (film). */
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
  createdAt: string;
  images: ItemImage[];
  /** Accent color used for generated spines and UI highlights. */
  accent: string;
}

export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export function shortDecade(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return d >= 2000 ? `${d}s` : `'${String(d).slice(2)}s`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function imageFor(item: Item, role: ImageRole): ItemImage | undefined {
  return item.images.find((i) => i.role === role);
}

/** Physical case proportions (width x height x depth, arbitrary units). */
export const CASE_DIMENSIONS: Record<Format, { w: number; h: number; d: number }> = {
  vhs: { w: 105, h: 190, d: 26 },
  cassette: { w: 70, h: 109, d: 17 },
  cd: { w: 142, h: 125, d: 10 },
};
