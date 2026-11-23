import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReleaseHold } from "./ReleaseHold";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function CancelledPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Suspense>
        <ReleaseHold />
      </Suspense>
      <p className="font-crt text-2xl tracking-widest text-cream-dim">■ STOP</p>
      <h1 className="mt-3 font-display text-4xl">No problem.</h1>
      <p className="mt-4 text-cream-dim">You weren&apos;t charged, and your stack is still saved.</p>
      <Link href="/" className="mt-8 inline-block rounded-md border border-night-3 px-6 py-3 font-display hover:border-pink">
        Back to the shop
      </Link>
    </div>
  );
}
