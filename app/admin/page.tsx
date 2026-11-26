import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { listAllItems } from "@/lib/admin-data";
import { ListingsTable } from "@/components/admin/ListingsTable";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="font-crt text-2xl text-cream-dim">LOADING STOCKROOM…</p>}>
      <Listings />
    </Suspense>
  );
}

async function Listings() {
  await requireAdmin();
  const items = await listAllItems();
  return <ListingsTable items={items} />;
}
