import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { ListingForm } from "@/components/admin/ListingForm";

export default function NewListingPage() {
  return (
    <>
      <h1 className="mb-4 font-display text-2xl">New listing</h1>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </>
  );
}

async function Gate() {
  await requireAdmin();
  return <ListingForm />;
}
