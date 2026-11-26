import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { getAdminItem } from "@/lib/admin-data";
import { ListingForm } from "@/components/admin/ListingForm";

export default function EditListingPage({ params }: PageProps<"/admin/listings/[id]">) {
  return (
    <Suspense fallback={<p className="font-crt text-2xl text-cream-dim">PULLING IT FROM THE SHELF…</p>}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: PageProps<"/admin/listings/[id]">["params"] }) {
  await requireAdmin();
  const item = await getAdminItem((await params).id);
  if (!item) notFound();
  return (
    <>
      <h1 className="mb-4 font-display text-2xl">Edit: {item.title}</h1>
      {item.status === "active" || item.status === "draft" ? (
        <ListingForm item={item} />
      ) : (
        <p className="text-cream-dim">This item is {item.status}, so it can&apos;t be edited.</p>
      )}
    </>
  );
}
