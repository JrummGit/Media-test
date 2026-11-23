import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItemsByFormat } from "@/lib/catalog";
import { FORMATS, FORMAT_LABEL, type Format } from "@/lib/types";
import { AISLE_COPY, AisleView } from "@/components/views/AisleView";

export function generateStaticParams() {
  return FORMATS.map((format) => ({ format }));
}

function isFormat(v: string): v is Format {
  return (FORMATS as readonly string[]).includes(v);
}

export async function generateMetadata({ params }: PageProps<"/[format]">): Promise<Metadata> {
  const { format } = await params;
  if (!isFormat(format)) return {};
  return { title: `${FORMAT_LABEL[format]} · ${AISLE_COPY[format].sign}` };
}

export default async function AislePage({ params }: PageProps<"/[format]">) {
  const { format } = await params;
  if (!isFormat(format)) notFound();
  return <AisleView format={format} items={await getItemsByFormat(format)} />;
}
