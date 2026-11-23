"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";

/** Ends the abandoned Stripe session so its items go back on the shelf, then reopens the cart. */
export function ReleaseHold() {
  const sessionId = useSearchParams().get("session_id");
  const { setOpen } = useCart();
  useEffect(() => {
    if (sessionId) {
      fetch("/api/checkout/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    setOpen(true);
  }, [sessionId, setOpen]);
  return null;
}
