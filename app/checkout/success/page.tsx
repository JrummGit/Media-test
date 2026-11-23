import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { formatPrice } from "@/lib/types";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <ClearCart />
      <p className="font-crt text-2xl tracking-widest text-teal">● REC · TRANSACTION COMPLETE</p>
      <h1 className="neon mt-3 font-display text-4xl sm:text-5xl">It&apos;s yours.</h1>
      <Suspense fallback={<p className="mt-6 font-crt text-2xl text-cream-dim">REWINDING RECEIPT…</p>}>
        <Receipt searchParams={searchParams} />
      </Suspense>
      <Link href="/" className="mt-10 inline-block rounded-md bg-pink px-6 py-3 font-display text-white hover:brightness-110">
        Keep browsing
      </Link>
    </div>
  );
}

async function Receipt({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const id = (await searchParams).session_id;
  if (!stripeConfigured() || typeof id !== "string" || !id.startsWith("cs_")) {
    return <p className="mt-6 text-cream-dim">Thanks for your order! A confirmation email is on its way.</p>;
  }
  const data = await loadReceipt(id);
  if (!data) return <p className="mt-6 text-cream-dim">Thanks for your order! A confirmation email is on its way.</p>;
  const { session, lines } = data;
  if (session.payment_status !== "paid") {
    return <p className="mt-6 text-cream-dim">Your payment is processing. We&apos;ll email you as soon as it clears.</p>;
  }
  return (
    <div className="mx-auto mt-8 max-w-sm rounded-lg border border-night-3 bg-night-2 p-5 text-left">
      <ul className="space-y-2">
        {lines.data.map((l) => (
          <li key={l.id} className="flex justify-between gap-4 text-sm">
            <span className="min-w-0">{l.description}</span>
            <span className="font-crt text-lg text-mustard">{formatPrice(l.amount_total)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-night-3 pt-2 text-sm text-cream-dim">
          <span>Shipping</span>
          <span>{formatPrice(session.total_details?.amount_shipping ?? 0)}</span>
        </li>
        {(session.total_details?.amount_tax ?? 0) > 0 && (
          <li className="flex justify-between text-sm text-cream-dim">
            <span>Tax</span>
            <span>{formatPrice(session.total_details!.amount_tax)}</span>
          </li>
        )}
        <li className="flex justify-between font-crt text-2xl">
          <span>TOTAL</span>
          <span className="text-mustard">{formatPrice(session.amount_total ?? 0)}</span>
        </li>
      </ul>
      {session.customer_details?.email && (
        <p className="mt-4 text-xs text-cream-dim">A receipt is on its way to {session.customer_details.email}.</p>
      )}
    </div>
  );
}

async function loadReceipt(id: string) {
  try {
    const stripe = getStripe();
    const [session, lines] = await Promise.all([
      stripe.checkout.sessions.retrieve(id),
      stripe.checkout.sessions.listLineItems(id, { limit: 100 }),
    ]);
    return { session, lines };
  } catch {
    return null;
  }
}
