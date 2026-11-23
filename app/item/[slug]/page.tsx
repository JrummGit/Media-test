import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getItem } from "@/lib/catalog";
import { FORMAT_LABEL, imageFor } from "@/lib/types";
import { ItemView, relatedItems } from "@/components/views/ItemView";

export async function generateStaticParams() {
  const items = await getCatalog();
  // Cache Components needs at least one param to validate the route.
  return items.length ? items.map((i) => ({ slug: i.slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/item/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) return {};
  const front = imageFor(item, "front");
  return {
    title: `${item.title} (${item.releaseYear}) · ${FORMAT_LABEL[item.format].replace(/s$/, "")}`,
    description: `${item.creator} · ${item.condition}. ${item.notes}`,
    openGraph: front ? { images: [front.src] } : undefined,
  };
}

export default async function ItemPage({ params }: PageProps<"/item/[slug]">) {
  const { slug } = await params;
  const item = await getItem(slug);
  if (!item) notFound();

  return <ItemView item={item} related={relatedItems(await getCatalog(), item)} />;
}
