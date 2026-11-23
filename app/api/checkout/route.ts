import { NextResponse } from "next/server";

// Stripe Checkout is wired up in Phase 3. Until STRIPE_SECRET_KEY is set, the
// cart explains that payments are not live yet.
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Checkout isn't switched on yet. Payments arrive in the next build phase." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
