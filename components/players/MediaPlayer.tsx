"use client";

import type { Item } from "@/lib/types";
import { CrtTv } from "./CrtTv";
import { DiscTray } from "./DiscTray";
import { TapeDeck } from "./TapeDeck";

/** The format-appropriate player for an item's preview, if it has one. */
export function MediaPlayer({ item }: { item: Item }) {
  if (!item.preview) return null;
  if (item.format === "vhs") return <CrtTv item={item} />;
  if (item.format === "cassette") return <TapeDeck item={item} />;
  return <DiscTray item={item} />;
}
