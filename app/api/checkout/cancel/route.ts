import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Called when a shopper backs out of Stripe Checkout. Expiring the session
 * makes Stripe send checkout.session.expired, and the webhook releases the hold.
 */
export async function POST(req: Request) {
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: unknown };
  if (!stripeConfigured() || typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("cancel failed", e);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
