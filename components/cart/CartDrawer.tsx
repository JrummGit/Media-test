"use client";

import { useEffect, useState } from "react";
import { SHIPPING, shippingCents } from "@/lib/shipping";
import { formatPrice, FORMAT_LABEL } from "@/lib/types";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const { lines, open, setOpen, remove } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const subtotal = lines.reduce((s, l) => s + l.priceCents, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  async function checkout() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slugs: lines.map((l) => l.slug) }),
      });
      const data = await res.json().catch(() => ({ error: "Checkout isn't available right now. Please try again soon." }));
      // Drop anything that sold while it sat in the cart, so a retry can succeed.
      if (Array.isArray(data.unavailable)) data.unavailable.forEach((slug: string) => remove(slug));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Checkout failed");
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-label="Your stack"
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-night-3 bg-night-2 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-night-3 px-5 py-4">
          <h2 className="font-display text-xl">Your Stack</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded px-2 py-1 font-crt text-2xl text-cream-dim hover:text-cream"
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="mt-10 text-center font-crt text-2xl text-cream-dim">
              NO TAPE INSERTED
              <br />
              <span className="text-lg">Pull something off the shelf.</span>
            </p>
          ) : (
            <ul className="space-y-4">
              {lines.map((l) => (
                <li key={l.slug} className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image} alt="" className="h-20 w-16 rounded-sm object-cover shadow" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="truncate text-sm text-cream-dim">
                      {l.creator} · {FORMAT_LABEL[l.format].replace(/s$/, "")}
                    </p>
                    <p className="font-crt text-xl text-mustard">{formatPrice(l.priceCents)}</p>
                  </div>
                  <button
                    onClick={() => remove(l.slug)}
                    className="self-start text-sm text-cream-dim underline hover:text-cream"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-night-3 px-5 py-4">
          <div className="mb-1 flex justify-between text-sm text-cream-dim">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="mb-2 flex justify-between text-sm text-cream-dim">
            <span>Flat-rate shipping</span>
            <span>{lines.length ? formatPrice(shippingCents(lines.length)) : "—"}</span>
          </div>
          <div className="mb-1 flex justify-between font-crt text-2xl">
            <span>TOTAL</span>
            <span className="text-mustard">{formatPrice(subtotal + shippingCents(lines.length))}</span>
          </div>
          <p className="mb-3 text-xs text-cream-dim">{formatPrice(SHIPPING.firstItemCents)} for the first item, {formatPrice(SHIPPING.additionalItemCents)} for each extra. US shipping only for now.</p>
          <button
            disabled={lines.length === 0 || status === "loading"}
            onClick={checkout}
            className="w-full rounded-md bg-pink px-4 py-3 font-display text-lg text-white shadow-[0_0_20px_#ff3d8166] transition hover:brightness-110 disabled:opacity-40"
          >
            {status === "loading" ? "Rewinding…" : "Check out"}
          </button>
          <p className="mt-2 text-center text-xs text-cream-dim">Apple Pay · Google Pay · Cards</p>
          {message && <p className="mt-2 text-center text-sm text-tape">{message}</p>}
        </footer>
      </aside>
    </div>
  );
}
