import { FORMAT_LABEL, type Format, type Item } from "@/lib/types";
import { RackBrowser } from "@/components/rack/RackBrowser";

export const AISLE_COPY: Record<Format, { sign: string; blurb: string }> = {
  vhs: { sign: "Video Wall", blurb: "Spine-out, sorted by genre the way a rental shop did it. Tap a tape to pull it off the shelf." },
  cassette: { sign: "Tape Spinner", blurb: "Give the rack a spin. Tap the cassette facing you to take a closer look." },
  cd: { sign: "CD Crate", blurb: "Scroll or swipe to riffle through the crate. Pull out anything that catches your eye." },
};

export function AisleView({ format, items }: { format: Format; items: Item[] }) {
  const copy = AISLE_COPY[format];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="font-crt text-xl tracking-widest text-cream-dim">AISLE · {FORMAT_LABEL[format].toUpperCase()}</p>
        <h1 className="neon flicker font-display text-4xl sm:text-5xl">{copy.sign}</h1>
        <p className="mt-2 max-w-xl text-cream-dim">{copy.blurb}</p>
      </header>
      <RackBrowser format={format} items={items} />
    </div>
  );
}
