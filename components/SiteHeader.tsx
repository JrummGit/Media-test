"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FORMATS, FORMAT_LABEL } from "@/lib/types";
import { useCart } from "./cart/CartProvider";

export function SiteHeader() {
  const { lines, setOpen } = useCart();
  const path = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-night-3/80 bg-night/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Press Play Media home">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-pink text-pink shadow-[0_0_12px_#ff3d81aa]"
          >
            <svg viewBox="0 0 10 10" className="ml-0.5 h-3 w-3 fill-current">
              <path d="M1 0 L10 5 L1 10 Z" />
            </svg>
          </span>
          <span className="font-display text-lg leading-none tracking-wide sm:text-xl">
            Press Play
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Aisles">
          {FORMATS.map((f) => {
            const active = path === `/${f}`;
            return (
              <Link
                key={f}
                href={`/${f}`}
                className={`rounded px-2 py-1 font-crt text-xl uppercase tracking-wide transition sm:px-3 ${
                  active ? "bg-night-3 text-mustard" : "text-cream-dim hover:text-cream"
                }`}
              >
                {FORMAT_LABEL[f]}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="relative ml-1 rounded-md border border-night-3 px-2.5 py-1.5 hover:border-pink"
            aria-label={`Open cart, ${lines.length} items`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <circle cx="8" cy="12.5" r="2.2" />
              <circle cx="16" cy="12.5" r="2.2" />
              <path d="M6 19l2-3h8l2 3" />
            </svg>
            {lines.length > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1 text-xs font-bold text-white">
                {lines.length}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
