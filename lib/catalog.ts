import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { loadCatalog } from "@/lib/catalog-source";
import type { Format, Item } from "@/lib/types";

export { usingSupabase } from "@/lib/catalog-source";

/** Every listing currently visible in the shop (active or on hold). */
export async function getCatalog(): Promise<Item[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return loadCatalog();
}

export async function getItemsByFormat(format: Format): Promise<Item[]> {
  return (await getCatalog()).filter((i) => i.format === format);
}

export async function getItem(slug: string): Promise<Item | undefined> {
  return (await getCatalog()).find((i) => i.slug === slug);
}
