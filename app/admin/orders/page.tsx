import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { listOrders } from "@/lib/admin-data";
import { formatPrice } from "@/lib/types";
import { ShipForm } from "@/components/admin/ShipForm";

export default function OrdersPage() {
  return (
    <>
      <h1 className="mb-4 font-display text-2xl">Orders</h1>
      <Suspense fallback={<p className="font-crt text-2xl text-cream-dim">CHECKING THE MAILBOX…</p>}>
        <Orders />
      </Suspense>
    </>
  );
}

async function Orders() {
  await requireAdmin();
  const orders = await listOrders();
  if (orders.length === 0) return <p className="py-10 text-center text-cream-dim">No orders yet. They&apos;ll show up here as soon as someone checks out.</p>;
  const toShip = orders.filter((o) => o.status !== "shipped").length;
  return (
    <>
      <p className="mb-4 text-sm text-cream-dim">{toShip ? `${toShip} to pack and ship.` : "Everything's shipped."}</p>
      <ul className="space-y-3">
        {orders.map((o) => {
          const a = o.address?.address ?? {};
          return (
            <li key={o.id} className={`rounded-lg border p-4 ${o.status === "shipped" ? "border-night-3 bg-night-2/40" : "border-mustard/50 bg-night-2"}`}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="font-crt text-xl">{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                <p className="font-crt text-xl text-mustard">{formatPrice(o.totalCents)}</p>
                <span className={`ml-auto rounded px-2 font-crt text-lg uppercase ${o.status === "shipped" ? "bg-teal/20 text-teal" : "bg-mustard/20 text-mustard"}`}>
                  {o.status === "shipped" ? "shipped" : "to ship"}
                </span>
              </div>
              <ul className="mt-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.slug}>• {i.title}</li>
                ))}
              </ul>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <address className="not-italic text-cream-dim">
                  <span className="text-cream">{o.address?.name}</span>
                  <br />
                  {[a.line1, a.line2].filter(Boolean).join(", ")}
                  <br />
                  {[a.city, a.state, a.postal_code].filter(Boolean).join(" ")}
                  <br />
                  {o.email}
                </address>
                {o.status === "shipped" ? (
                  <p className="text-cream-dim">
                    Shipped {o.shippedAt && new Date(o.shippedAt).toLocaleDateString()}
                    {o.trackingNumber && <> · tracking {o.trackingNumber}</>}
                  </p>
                ) : (
                  <ShipForm orderId={o.id} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
