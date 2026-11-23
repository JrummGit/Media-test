import type Stripe from "stripe";
import { SHIPPING, shippingCents } from "@/lib/shipping";
import { FORMAT_LABEL, imageFor, type Item } from "@/lib/types";

/** Stripe's shortest allowed Checkout Session lifetime. */
export const HOLD_MINUTES = 30;
export const MAX_CART_ITEMS = 20;

export interface CheckoutRequest {
  slugs: string[];
}

/** Validates the cart payload sent by the browser. Prices are never taken from the client. */
export function parseCheckoutRequest(body: unknown): CheckoutRequest | { error: string } {
  const slugs = (body as { slugs?: unknown })?.slugs;
  if (!Array.isArray(slugs) || slugs.length === 0) return { error: "Your stack is empty." };
  if (slugs.length > MAX_CART_ITEMS) return { error: `Check out up to ${MAX_CART_ITEMS} items at a time.` };
  if (!slugs.every((s) => typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s)))
    return { error: "Your stack has an item we don't recognise. Remove it and try again." };
  return { slugs: [...new Set(slugs as string[])] };
}

/** Splits the requested slugs into items that can be bought and ones that can't. */
export function resolveCart(slugs: string[], catalog: Item[]) {
  const bySlug = new Map(catalog.map((i) => [i.slug, i]));
  const available: Item[] = [];
  const unavailable: string[] = [];
  for (const slug of slugs) {
    const item = bySlug.get(slug);
    if (item && item.status === "active") available.push(item);
    else unavailable.push(slug);
  }
  return { available, unavailable };
}

/** Metadata is limited to 500 chars per value, so each slug gets its own key. */
export function cartMetadata(items: Item[], holdToken: string): Record<string, string> {
  const meta: Record<string, string> = { hold: holdToken, count: String(items.length) };
  items.forEach((item, i) => (meta[`item_${i}`] = item.slug));
  return meta;
}

export function slugsFromMetadata(meta: Record<string, string> | null | undefined): string[] {
  if (!meta) return [];
  const n = Number(meta.count ?? 0);
  return Array.from({ length: n }, (_, i) => meta[`item_${i}`]).filter(Boolean);
}

export function buildSessionParams({
  items,
  origin,
  holdToken,
  now = Date.now(),
  automaticTax = false,
}: {
  items: Item[];
  origin: string;
  holdToken: string;
  now?: number;
  automaticTax?: boolean;
}): Stripe.Checkout.SessionCreateParams {
  const taxBehavior = automaticTax ? ("exclusive" as const) : undefined;
  const metadata = cartMetadata(items, holdToken);
  return {
    mode: "payment",
    submit_type: "pay",
    // Leaving payment_method_types unset lets Stripe offer Apple Pay, Google Pay
    // and cards based on the Dashboard settings and the shopper's device.
    line_items: items.map((item) => {
      const front = imageFor(item, "front")?.src;
      const image = front && /^https:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(front) ? [front] : undefined;
      return {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: item.priceCents,
          tax_behavior: taxBehavior,
          product_data: {
            name: `${item.title} (${FORMAT_LABEL[item.format].replace(/s$/, "")}, ${item.releaseYear})`,
            description: `${item.creator}. Condition: ${item.condition}${item.sealed ? ", factory sealed" : ""}.`,
            images: image,
            metadata: { slug: item.slug },
          },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: [...SHIPPING.countries] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: SHIPPING.label,
          fixed_amount: { amount: shippingCents(items.length), currency: "usd" },
          tax_behavior: taxBehavior,
          delivery_estimate: {
            minimum: { unit: "business_day", value: SHIPPING.minBusinessDays },
            maximum: { unit: "business_day", value: SHIPPING.maxBusinessDays },
          },
        },
      },
    ],
    automatic_tax: { enabled: automaticTax },
    expires_at: Math.floor(now / 1000) + HOLD_MINUTES * 60,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancelled?session_id={CHECKOUT_SESSION_ID}`,
    metadata,
    payment_intent_data: { metadata },
  };
}
