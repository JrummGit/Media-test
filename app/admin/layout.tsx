import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Back room", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-night-3 pb-4">
        <p className="font-display text-xl">
          Back room <span className="font-crt text-lg text-cream-dim">· staff only</span>
        </p>
        <nav className="flex gap-1 font-crt text-xl" aria-label="Admin">
          <Link href="/admin" className="rounded px-2 py-0.5 text-cream-dim hover:bg-night-3 hover:text-cream">LISTINGS</Link>
          <Link href="/admin/listings/new" className="rounded px-2 py-0.5 text-cream-dim hover:bg-night-3 hover:text-cream">+ NEW</Link>
          <Link href="/admin/orders" className="rounded px-2 py-0.5 text-cream-dim hover:bg-night-3 hover:text-cream">ORDERS</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
