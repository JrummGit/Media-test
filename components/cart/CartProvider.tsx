"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Format } from "@/lib/types";
import { CartDrawer } from "./CartDrawer";

export interface CartLine {
  slug: string;
  title: string;
  creator: string;
  format: Format;
  priceCents: number;
  image: string;
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: CartLine) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
}

const CartContext = createContext<CartState | null>(null);
const KEY = "pressplay.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, loaded]);

  // Every item is one of a kind, so a slug can only be in the cart once.
  const add = useCallback((line: CartLine) => {
    setLines((ls) => (ls.some((l) => l.slug === line.slug) ? ls : [...ls, line]));
    setOpen(true);
  }, []);
  const remove = useCallback((slug: string) => setLines((ls) => ls.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => setLines([]), []);
  const has = useCallback((slug: string) => lines.some((l) => l.slug === slug), [lines]);

  const value = useMemo(
    () => ({ lines, open, setOpen, add, remove, clear, has }),
    [lines, open, add, remove, clear, has],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
