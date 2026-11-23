import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { slugsFromMetadata } from "@/lib/checkout";
import { sendOrderEmails } from "@/lib/email";
import { markItemsSold, recordOrder, releaseItems } from "@/lib/inventory";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe → shop. Configure in Stripe Dashboard → Developers → Webhooks with:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // The raw body is required to verify the signature.
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        // Bank-transfer style methods complete later; wait for async_payment_succeeded.
        if (session.payment_status !== "paid") break;
        await fulfil(session);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const token = event.data.object.metadata?.hold;
        if (token) await releaseItems(token);
        revalidateTag("catalog", { expire: 0 });
        break;
      }
    }
  } catch (e) {
    console.error(`webhook ${event.type} failed`, e);
    // A 500 makes Stripe retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function fulfil(session: Stripe.Checkout.Session) {
  const token = session.metadata?.hold;
  const slugs = slugsFromMetadata(session.metadata);
  if (token) await markItemsSold(token);
  // Sold items should vanish from the racks right away.
  revalidateTag("catalog", { expire: 0 });

  const shippingCents = session.total_details?.amount_shipping ?? 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  const isNew = await recordOrder({
    stripeSessionId: session.id,
    email: session.customer_details?.email ?? null,
    slugs,
    subtotalCents: session.amount_subtotal ?? 0,
    shippingCents,
    taxCents,
    totalCents: session.amount_total ?? 0,
    shippingAddress: session.collected_information?.shipping_details ?? null,
  });

  if (!isNew) return; // already fulfilled by an earlier delivery

  const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 100 });
  await sendOrderEmails({
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? null,
    lines: lineItems.data.map((l) => ({ title: l.description ?? "Item", amountCents: l.amount_total })),
    shippingCents,
    taxCents,
    totalCents: session.amount_total ?? 0,
  });
}
