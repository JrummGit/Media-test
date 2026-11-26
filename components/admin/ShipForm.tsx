"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markShipped } from "@/app/admin/actions";

export function ShipForm({ orderId }: { orderId: string }) {
  const [tracking, setTracking] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex gap-2 self-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await markShipped(orderId, tracking);
          router.refresh();
        });
      }}
    >
      <label className="sr-only" htmlFor={`t-${orderId}`}>Tracking number</label>
      <input id={`t-${orderId}`} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number (optional)" className="min-w-0 flex-1 rounded-md border border-night-3 bg-night px-2 py-1.5 text-sm" />
      <button disabled={pending} className="rounded-md bg-teal px-3 py-1.5 text-sm font-semibold text-night disabled:opacity-50">
        {pending ? "Saving…" : "Mark shipped"}
      </button>
    </form>
  );
}
