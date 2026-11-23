import { describe, expect, it } from "vitest";
import {
  buildSessionParams,
  cartMetadata,
  HOLD_MINUTES,
  parseCheckoutRequest,
  resolveCart,
  slugsFromMetadata,
} from "@/lib/checkout";
import { seedCatalog } from "@/lib/seed-catalog";
import { shippingCents } from "@/lib/shipping";

const catalog = seedCatalog();

describe("shippingCents", () => {
  it("charges $4.50 for one item and $1 for each extra", () => {
    expect(shippingCents(0)).toBe(0);
    expect(shippingCents(1)).toBe(450);
    expect(shippingCents(2)).toBe(550);
    expect(shippingCents(5)).toBe(850);
  });
});

describe("parseCheckoutRequest", () => {
  it("rejects empty, oversized and malformed carts", () => {
    expect(parseCheckoutRequest(null)).toHaveProperty("error");
    expect(parseCheckoutRequest({ slugs: [] })).toHaveProperty("error");
    expect(parseCheckoutRequest({ slugs: Array.from({ length: 21 }, (_, i) => `a-${i}`) })).toHaveProperty("error");
    expect(parseCheckoutRequest({ slugs: ["../etc"] })).toHaveProperty("error");
    expect(parseCheckoutRequest({ slugs: [42] })).toHaveProperty("error");
  });
  it("de-duplicates slugs", () => {
    expect(parseCheckoutRequest({ slugs: ["a", "a", "b"] })).toEqual({ slugs: ["a", "b"] });
  });
});

describe("resolveCart", () => {
  it("only sells active items and reports the rest", () => {
    const held = { ...catalog[1], status: "reserved" as const };
    const { available, unavailable } = resolveCart(
      [catalog[0].slug, held.slug, "missing-item"],
      [catalog[0], held],
    );
    expect(available.map((i) => i.slug)).toEqual([catalog[0].slug]);
    expect(unavailable).toEqual([held.slug, "missing-item"]);
  });
});

describe("metadata round trip", () => {
  it("stores each slug under its own key and reads them back in order", () => {
    const items = catalog.slice(0, 20);
    const meta = cartMetadata(items, "tok");
    expect(Object.values(meta).every((v) => v.length <= 500)).toBe(true);
    expect(Object.keys(meta).length).toBeLessThanOrEqual(50);
    expect(slugsFromMetadata(meta)).toEqual(items.map((i) => i.slug));
  });
});

describe("buildSessionParams", () => {
  const items = [catalog[0], catalog[7]];
  const now = Date.UTC(2026, 10, 23, 12);
  const params = buildSessionParams({ items, origin: "https://shop.test", holdToken: "tok", now });

  it("prices every line from the catalog", () => {
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items!.map((l) => l.price_data!.unit_amount)).toEqual(items.map((i) => i.priceCents));
  });
  it("adds flat shipping for the whole cart", () => {
    expect(params.shipping_options![0].shipping_rate_data!.fixed_amount!.amount).toBe(550);
  });
  it("expires with the hold and returns to the shop", () => {
    expect(params.expires_at).toBe(now / 1000 + HOLD_MINUTES * 60);
    expect(params.success_url).toBe("https://shop.test/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toContain("/checkout/cancelled?session_id=");
  });
  it("leaves payment methods to Stripe so Apple Pay can appear", () => {
    expect(params).not.toHaveProperty("payment_method_types");
  });
  it("skips SVG art, which Stripe can't display", () => {
    expect(params.line_items![0].price_data!.product_data!.images).toBeUndefined();
  });
  it("marks prices tax-exclusive only when Stripe Tax is on", () => {
    expect(params.automatic_tax).toEqual({ enabled: false });
    const taxed = buildSessionParams({ items, origin: "https://shop.test", holdToken: "t", automaticTax: true });
    expect(taxed.line_items![0].price_data!.tax_behavior).toBe("exclusive");
  });
});
