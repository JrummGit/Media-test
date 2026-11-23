// Stand-in for next/navigation in the static preview, driven by location.hash.
import { useSyncExternalStore } from "react";

/** "#item-neon-drive" → "/item/neon-drive", "#vhs" → "/vhs", "" → "/" */
export function hashToPath(hash: string): string {
  const h = hash.replace(/^#/, "");
  if (!h) return "/";
  if (h.startsWith("item-")) return `/item/${h.slice(5)}`;
  return `/${h}`;
}

/** Inverse of hashToPath: only plain #names survive in artifact links. */
export function pathToHash(path: string): string {
  const p = path.replace(/^\/+|\/+$/g, "");
  if (!p) return "";
  if (p.startsWith("item/")) return `item-${p.slice(5)}`;
  return p;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => hashToPath(location.hash), () => "/");
}

export function notFound(): never {
  throw new Error("Not found");
}
