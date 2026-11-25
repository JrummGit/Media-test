/**
 * Prints SQL that loads the sample inventory (data/seed.ts) into Supabase,
 * flagged is_sample. Safe to run twice. Usage:
 *   node scripts/seed-supabase-sql.ts > seed.sql   (then run it in the SQL editor)
 */
import { seedCatalog } from "../lib/seed-catalog.ts";

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(lit).join(",")}]::text[]`;
  if (typeof v === "object") return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const rows: string[] = ["begin;"];
for (const i of seedCatalog()) {
  rows.push(
    `insert into items (slug, title, creator, format, release_year, genres, tags, condition, sealed, notes, price_cents, status, featured, accent, ground, preview, is_sample, created_at)
values (${[i.slug, i.title, i.creator, i.format, i.releaseYear, i.genres, i.tags, i.condition, i.sealed, i.notes, i.priceCents, "active", i.featured, i.accent, i.ground, i.preview, true, i.createdAt].map(lit).join(", ")})
on conflict (slug) do nothing;`,
  );
  i.images.forEach((img, n) =>
    rows.push(
      `insert into item_images (item_id, role, storage_path, width, height, sort)
select id, ${lit(img.role)}, ${lit(img.src)}, ${img.width}, ${img.height}, ${n} from items
where slug = ${lit(i.slug)} and not exists (select 1 from item_images m join items it on it.id = m.item_id where it.slug = ${lit(i.slug)} and m.role = ${lit(img.role)});`,
    ),
  );
}
rows.push("commit;");
console.log(rows.join("\n"));
