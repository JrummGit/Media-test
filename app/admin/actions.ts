"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { sendShippedEmail } from "@/lib/email";
import { slugify, uniqueSlug, validateListing, type ListingInput } from "@/lib/listing";
import { serviceDb } from "@/lib/supabase/service";
import type { ItemStatus } from "@/lib/types";

// Every action here starts with requireAdmin(): server actions are public
// endpoints, so the check can't live only in the page.

/** A one-time URL the browser uploads a photo to, straight into storage. */
export async function createImageUpload(): Promise<{ path: string; token: string }> {
  await requireAdmin();
  const path = `items/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.jpg`;
  const { data, error } = await serviceDb().storage.from("item-images").createSignedUploadUrl(path);
  if (error || !data) throw new Error("Couldn't prepare the photo upload. Try again.");
  return { path: data.path, token: data.token };
}

export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; errors: Record<string, string> };

export async function saveListing(input: Partial<ListingInput>): Promise<SaveResult> {
  await requireAdmin();
  const result = validateListing(input);
  if (!result.ok) return result;
  const v = result.value;
  const db = serviceDb();

  // Keep an existing listing's web address; new ones get a readable, unique one.
  let slug: string;
  if (v.id) {
    const { data: existing } = await db.from("items").select("slug, status").eq("id", v.id).maybeSingle();
    if (!existing) return { ok: false, errors: { form: "That listing no longer exists." } };
    if (existing.status === "sold" || existing.status === "reserved")
      return { ok: false, errors: { form: "This item is sold or being bought right now, so it can't be edited." } };
    slug = existing.slug;
  } else {
    const base = slugify(v.title, v.releaseYear);
    const { data: taken } = await db.from("items").select("slug").like("slug", `${base}%`);
    slug = uniqueSlug(base, new Set((taken ?? []).map((t) => t.slug)));
  }

  const row = {
    slug,
    title: v.title,
    creator: v.creator,
    format: v.format,
    release_year: v.releaseYear,
    genres: v.genres,
    tags: v.tags,
    condition: v.condition,
    sealed: v.sealed,
    notes: v.notes,
    price_cents: v.priceCents,
    status: v.status,
    featured: v.featured,
    accent: v.accent,
    ground: v.ground,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = v.id
    ? await db.from("items").update(row).eq("id", v.id).select("id").single()
    : await db.from("items").insert(row).select("id").single();
  if (error || !saved) return { ok: false, errors: { form: "Saving failed. Try again in a moment." } };

  await db.from("item_images").delete().eq("item_id", saved.id);
  const { error: imgError } = await db.from("item_images").insert(
    v.images.map((img, n) => ({ item_id: saved.id, role: img.role, storage_path: img.path, width: img.width, height: img.height, sort: n })),
  );
  if (imgError) return { ok: false, errors: { form: "The listing saved, but its photos didn't. Try saving again." } };

  updateTag("catalog");
  return { ok: true, id: saved.id, slug };
}

export async function setItemStatus(id: string, status: Extract<ItemStatus, "draft" | "active">) {
  await requireAdmin();
  if (status !== "draft" && status !== "active") return;
  if (status === "active") {
    const { data: imgs } = await serviceDb().from("item_images").select("role").eq("item_id", id);
    const roles = new Set((imgs ?? []).map((i) => i.role));
    if (!roles.has("front") || !roles.has("back")) return; // open the listing to add photos first
  }
  // Never flip an item that's sold or mid-checkout.
  await serviceDb().from("items").update({ status, updated_at: new Date().toISOString() }).eq("id", id).in("status", ["draft", "active"]);
  updateTag("catalog");
}

export async function setFeatured(id: string, featured: boolean) {
  await requireAdmin();
  await serviceDb().from("items").update({ featured }).eq("id", id);
  updateTag("catalog");
}

export async function deleteListing(id: string) {
  await requireAdmin();
  await serviceDb().from("items").delete().eq("id", id).in("status", ["draft", "active"]);
  updateTag("catalog");
  redirect("/admin");
}

export async function removeSampleItems() {
  await requireAdmin();
  await serviceDb().from("items").delete().eq("is_sample", true).in("status", ["draft", "active"]);
  updateTag("catalog");
}

export async function markShipped(orderId: string, trackingNumber: string) {
  await requireAdmin();
  const tracking = trackingNumber.trim().slice(0, 60) || null;
  const { data: order } = await serviceDb()
    .from("orders")
    .update({ status: "shipped", tracking_number: tracking, shipped_at: new Date().toISOString() })
    .eq("id", orderId)
    .neq("status", "shipped")
    .select("email")
    .maybeSingle();
  if (order?.email) await sendShippedEmail(order.email, tracking);
}
