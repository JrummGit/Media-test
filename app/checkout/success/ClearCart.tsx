"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";

/** Empties the cart once the shopper lands back from a successful payment. */
export function ClearCart() {
  const { clear, setOpen } = useCart();
  useEffect(() => {
    clear();
    setOpen(false);
  }, [clear, setOpen]);
  return null;
}
