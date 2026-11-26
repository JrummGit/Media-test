"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { createImageUpload, deleteListing, saveListing } from "@/app/admin/actions";
import { FlipCase } from "@/components/inspector/FlipCase";
import type { AdminItem } from "@/lib/admin-data";
import { parsePrice, type ListingInput } from "@/lib/listing";
import { CONDITIONS, FORMATS, FORMAT_LABEL, type Condition, type Format, type ImageRole, type Item } from "@/lib/types";
import { preparePhoto } from "./photo";

type Slot = { path?: string; src?: string; width?: number; height?: number; state: "empty" | "uploading" | "done" | "error"; message?: string };
const ROLES: { role: ImageRole; label: string; hint: string }[] = [
  { role: "front", label: "Front", hint: "Straight on, filling the frame" },
  { role: "back", label: "Back", hint: "Show the full back cover" },
  { role: "spine", label: "Spine", hint: "Optional. Used on the VHS wall" },
];

const field = "w-full rounded-md border border-night-3 bg-night-2 px-3 py-2 text-cream focus:border-teal focus:outline-none";
const label = "mb-1 block text-xs uppercase tracking-wider text-cream-dim";

const publicUrl = (path: string) =>
  /^(\/|https?:)/.test(path) ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-images/${path}`;

export function ListingForm({ item }: { item?: AdminItem }) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [format, setFormat] = useState<Format>(item?.format ?? "vhs");
  const [title, setTitle] = useState(item?.title ?? "");
  const [creator, setCreator] = useState(item?.creator ?? "");
  const [year, setYear] = useState(item ? String(item.releaseYear) : "");
  const [genres, setGenres] = useState(item?.genres.join(", ") ?? "");
  const [tags, setTags] = useState(item?.tags.join(", ") ?? "");
  const [condition, setCondition] = useState<Condition>(item?.condition ?? "Very Good");
  const [sealed, setSealed] = useState(item?.sealed ?? false);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [price, setPrice] = useState(item ? (item.priceCents / 100).toFixed(2) : "");
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [colors, setColors] = useState({ accent: item?.accent ?? "#ff3d81", ground: item?.ground ?? "#1c1530" });
  const [slots, setSlots] = useState<Record<ImageRole, Slot>>(() => {
    const init = Object.fromEntries(ROLES.map(({ role }) => [role, { state: "empty" } as Slot])) as Record<ImageRole, Slot>;
    for (const img of item?.images ?? []) init[img.role] = { path: img.path, src: img.src, width: img.width, height: img.height, state: "done" };
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onPhoto(role: ImageRole, file: File | undefined) {
    if (!file) return;
    setSlots((s) => ({ ...s, [role]: { state: "uploading" } }));
    try {
      const photo = await preparePhoto(file);
      setSlots((s) => ({ ...s, [role]: { state: "uploading", src: photo.localUrl } }));
      if (role === "front") setColors(photo.colors);
      const { path, token } = await createImageUpload();
      const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).storage;
      const { error } = await storage.from("item-images").uploadToSignedUrl(path, token, photo.blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setSlots((s) => ({ ...s, [role]: { state: "done", path, src: photo.localUrl, width: photo.width, height: photo.height } }));
    } catch {
      setSlots((s) => ({ ...s, [role]: { state: "error", message: "Upload failed. Tap to try again." } }));
    }
  }

  const uploading = Object.values(slots).some((s) => s.state === "uploading");

  function save(status: "draft" | "active") {
    const input: Partial<ListingInput> = {
      id: item?.id,
      format,
      title,
      creator,
      releaseYear: Number(year),
      genres: genres.split(","),
      tags: tags.split(","),
      condition,
      sealed,
      notes,
      priceCents: parsePrice(price),
      status,
      featured,
      accent: colors.accent,
      ground: colors.ground,
      images: ROLES.flatMap(({ role }) => {
        const s = slots[role];
        return s.state === "done" && s.path ? [{ role, path: s.path, width: s.width ?? 1, height: s.height ?? 1 }] : [];
      }),
    };
    startSave(async () => {
      const res = await saveListing(input);
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      router.push(`/admin?saved=${encodeURIComponent(res.slug)}`);
      router.refresh();
    });
  }

  // Live 3D preview built from the form as it stands.
  const preview: Item = useMemo(
    () => ({
      id: "preview",
      slug: "preview",
      title: title || "Untitled",
      creator: creator || "Artist / studio",
      format,
      releaseYear: Number(year) || 1990,
      genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
      tags: [],
      condition,
      sealed,
      notes,
      priceCents: parsePrice(price) || 0,
      status: "active",
      featured,
      createdAt: "",
      accent: colors.accent,
      ground: colors.ground,
      images: ROLES.flatMap(({ role }) => {
        const s = slots[role];
        return s.src ? [{ role, src: s.path ? (s.src.startsWith("blob:") ? s.src : publicUrl(s.path)) : s.src, width: s.width ?? 1, height: s.height ?? 1 }] : [];
      }),
    }),
    [title, creator, format, year, genres, condition, sealed, notes, price, featured, colors, slots],
  );

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-tape">{errors[k]}</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)]">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save("active");
        }}
      >
        <fieldset>
          <legend className={label}>Format</legend>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button type="button" key={f} onClick={() => setFormat(f)} aria-pressed={format === f} className={`flex-1 rounded-md border px-3 py-2 font-crt text-xl ${format === f ? "border-mustard bg-mustard/10 text-mustard" : "border-night-3 text-cream-dim"}`}>
                {FORMAT_LABEL[f].replace(/s$/, "")}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>Photos</legend>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(({ role, label: l, hint }) => {
              const s = slots[role];
              return (
                <label key={role} className="group relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-night-3 bg-night-2 text-center hover:border-teal">
                  {s.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.src} alt={`${l} photo`} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="px-2 text-xs text-cream-dim">
                      <span className="block font-crt text-xl text-cream">+ {l.toUpperCase()}</span>
                      {hint}
                    </span>
                  )}
                  {s.state === "uploading" && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 font-crt text-lg">UPLOADING…</span>}
                  {s.state === "error" && <span className="absolute inset-x-0 bottom-0 bg-tape py-1 text-xs">{s.message}</span>}
                  {s.state === "done" && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 font-crt text-lg">{l.toUpperCase()} ✓ · REPLACE</span>}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(role, e.target.files?.[0])} aria-label={`${l} photo`} />
                </label>
              );
            })}
          </div>
          {err("images")}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            {err("title")}
          </div>
          <div>
            <label className={label} htmlFor="creator">{format === "vhs" ? "Studio" : "Artist"}</label>
            <input id="creator" value={creator} onChange={(e) => setCreator(e.target.value)} className={field} />
            {err("creator")}
          </div>
          <div>
            <label className={label} htmlFor="year">Release year</label>
            <input id="year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className={field} />
            {err("releaseYear")}
          </div>
          <div>
            <label className={label} htmlFor="genres">Genres (comma separated)</label>
            <input id="genres" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder={format === "vhs" ? "Horror, Comedy" : "Grunge, Alternative"} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="tags">Tags</label>
            <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cult, disney, sleepover" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="condition">Condition</label>
            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className={field}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="price">Price (USD)</label>
            <input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.00" className={field} />
            {err("priceCents")}
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="notes">Grader&apos;s notes</label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Case wear, how it plays, what's included" className={field} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sealed} onChange={(e) => setSealed(e.target.checked)} className="h-4 w-4 accent-pink" /> Factory sealed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-pink" /> Staff pick (shown on the home page)
          </label>
        </div>

        {errors.form && <p className="rounded-md bg-tape/20 p-3 text-sm text-tape">{errors.form}</p>}

        <div className="flex flex-wrap gap-2 border-t border-night-3 pt-4">
          <button type="submit" disabled={saving || uploading} className="rounded-md bg-pink px-5 py-2.5 font-display text-white hover:brightness-110 disabled:opacity-50">
            {saving ? "Saving…" : item?.status === "active" ? "Save changes" : "Publish to shop"}
          </button>
          <button type="button" onClick={() => save("draft")} disabled={saving || uploading} className="rounded-md border border-night-3 px-5 py-2.5 hover:border-teal disabled:opacity-50">
            {item?.status === "active" ? "Unpublish (save as draft)" : "Save as draft"}
          </button>
          <Link href="/admin" className="px-3 py-2.5 text-cream-dim hover:text-cream">Cancel</Link>
          {item && (
            <span className="ml-auto">
              {confirmDelete ? (
                <span className="flex gap-2">
                  <button type="button" onClick={() => startSave(() => deleteListing(item.id))} className="rounded-md bg-tape px-3 py-2.5 text-white">Delete for good</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md border border-night-3 px-3 py-2.5">Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-md px-3 py-2.5 text-tape hover:underline">Delete listing</button>
              )}
            </span>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className={label}>Shop preview</p>
        <div className="rounded-lg border border-night-3 bg-night-2/50 p-4">
          {preview.images.some((i) => i.role === "front") ? (
            <FlipCase key={preview.images.map((i) => i.src).join()} item={preview} maxHeight={300} />
          ) : (
            <p className="py-16 text-center font-crt text-xl text-cream-dim">ADD A FRONT PHOTO TO SEE IT ON THE SHELF</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-cream-dim">
            <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: colors.ground }} /> Cover
            <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: colors.accent }} /> Accent
            <span>(read from your front photo)</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
