import { describe, expect, it } from "vitest";
import { parsePrice, slugify, splitList, uniqueSlug, validateListing, type ListingInput } from "@/lib/listing";

const base: Partial<ListingInput> = {
  format: "vhs",
  title: "  The Great Mall Caper ",
  creator: "Brightside Home Video",
  releaseYear: 1991,
  genres: ["Comedy", " comedy", "Family "],
  tags: [],
  condition: "Very Good",
  priceCents: 1500,
  status: "active",
  images: [
    { role: "front", path: "items/a.jpg", width: 1000, height: 1800 },
    { role: "back", path: "items/b.jpg", width: 1000, height: 1800 },
  ],
};

describe("validateListing", () => {
  it("accepts a complete listing and tidies it", () => {
    const r = validateListing(base, new Date("2026-11-26"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("The Great Mall Caper");
      expect(r.value.genres).toEqual(["Comedy", "Family"]);
    }
  });
  it("needs a back photo to publish, but not for a draft", () => {
    const images = [base.images![0]];
    expect(validateListing({ ...base, images })).toMatchObject({ ok: false, errors: { images: expect.any(String) } });
    expect(validateListing({ ...base, images, status: "draft" }).ok).toBe(true);
  });
  it("always needs a front photo, title, year and price", () => {
    const r = validateListing({ ...base, images: [], title: " ", releaseYear: 1900, priceCents: NaN });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["images", "priceCents", "releaseYear", "title"]);
  });
  it("asks for the studio on VHS and the artist on music", () => {
    const vhs = validateListing({ ...base, creator: "" });
    const cd = validateListing({ ...base, format: "cd", creator: "" });
    expect(!vhs.ok && vhs.errors.creator).toMatch(/studio/);
    expect(!cd.ok && cd.errors.creator).toMatch(/artist/);
  });
  it("drops colours that aren't hex", () => {
    const r = validateListing({ ...base, accent: "red;}", ground: "#1a2b3c" });
    expect(r.ok && [r.value.accent, r.value.ground]).toEqual([null, "#1a2b3c"]);
  });
});

describe("helpers", () => {
  it("parses prices", () => {
    expect(parsePrice("12")).toBe(1200);
    expect(parsePrice("$12.5")).toBe(1250);
    expect(parsePrice("12.05")).toBe(1205);
    expect(parsePrice("twelve")).toBeNaN();
    expect(parsePrice("1.234")).toBeNaN();
  });
  it("makes readable, unique web addresses", () => {
    expect(slugify("Beauté & the Bëast!", 1991)).toBe("beaute-and-the-beast-1991");
    expect(uniqueSlug("x-1991", new Set(["x-1991", "x-1991-2"]))).toBe("x-1991-3");
  });
  it("splits and de-duplicates lists", () => {
    expect(splitList("Horror, horror ,  Cult  Classic,,")).toEqual(["Horror", "Cult Classic"]);
  });
});
