import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog-source";
import { buildSessionParams, HOLD_MINUTES, parseCheckoutRequest, resolveCart } from "@/lib/checkout";
import { ItemsUnavailableError, releaseItems, reserveItems } from "@/lib/inventory";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Checkout isn't switched on yet. Check back soon." }, { status: 503 });
  }

  const parsed = parseCheckoutRequest(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Always price from the live catalog, never from the browser.
  const { available, unavailable } = resolveCart(parsed.slugs, await loadCatalog());
  if (unavailable.length) {
    return NextResponse.json(
      { error: "Someone beat you to it. Some items in your stack were just sold or are on hold.", unavailable },
      { status: 409 },
    );
  }

  const holdToken = randomUUID();
  const now = Date.now();
  // The hold outlives the Checkout Session by a few minutes, so a payment that
  // completes at the last second always finds its items still held.
  const holdUntil = new Date(now + (HOLD_MINUTES + 5) * 60_000);

  try {
    await reserveItems(available.map((i) => i.slug), holdToken, holdUntil);
  } catch (e) {
    if (e instanceof ItemsUnavailableError) {
      return NextResponse.json({ error: "Someone beat you to it. One of these items just went on hold." }, { status: 409 });
    }
    console.error("reserve failed", e);
    return NextResponse.json({ error: "We couldn't start checkout. Please try again." }, { status: 500 });
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const session = await getStripe().checkout.sessions.create(
      buildSessionParams({
        items: available,
        origin,
        holdToken,
        now,
        automaticTax: process.env.STRIPE_AUTOMATIC_TAX === "1",
      }),
    );
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe session failed", e);
    await releaseItems(holdToken).catch(() => {});
    return NextResponse.json({ error: "We couldn't reach the payment provider. Please try again." }, { status: 502 });
  }
}
