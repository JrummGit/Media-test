/**
 * Static preview of the shop: the same view components as the Next.js site,
 * bundled into one self-contained page with hash routing and inlined art.
 * Build with: npm run preview:build -- <output.html>
 */
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { seedCatalog } from "@/lib/seed-catalog";
import { FORMATS, FORMAT_LABEL, type Format, type Item } from "@/lib/types";
import { CartProvider } from "@/components/cart/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShopFloorView } from "@/components/views/ShopFloorView";
import { AisleView, AISLE_COPY } from "@/components/views/AisleView";
import { ItemView, relatedItems } from "@/components/views/ItemView";
import { pathToHash, usePathname } from "./shims/next-navigation";

declare global {
  interface Window {
    __ART__: Record<string, string>;
  }
}

// Swap /seed/*.svg paths for the inlined data URIs.
const catalog: Item[] = seedCatalog()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .map((item) => ({
    ...item,
    images: item.images.map((img) => ({ ...img, src: window.__ART__[img.src] ?? img.src })),
  }));

// Route in-page "/path" links through the hash.
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest?.("a[href^='/']") as HTMLAnchorElement | null;
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  const hash = pathToHash(a.getAttribute("href")!);
  if (hash) {
    location.hash = hash;
  } else {
    history.replaceState(null, "", location.pathname + location.search);
    dispatchEvent(new HashChangeEvent("hashchange"));
  }
});

function Page() {
  const path = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  const format = path.slice(1) as Format;
  if ((FORMATS as readonly string[]).includes(format)) {
    document.title = `${FORMAT_LABEL[format]} · ${AISLE_COPY[format].sign} · Press Play Media`;
    return <AisleView key={format} format={format} items={catalog.filter((i) => i.format === format)} />;
  }
  if (path.startsWith("/item/")) {
    const item = catalog.find((i) => i.slug === path.slice(6));
    if (item) {
      document.title = `${item.title} · Press Play Media`;
      return <ItemView key={item.slug} item={item} related={relatedItems(catalog, item)} />;
    }
  }
  document.title = "Press Play Media";
  return <ShopFloorView catalog={catalog} />;
}

function App() {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <div className="bg-mustard px-4 py-1.5 text-center text-sm font-semibold text-night">
          Preview with sample inventory. Checkout isn&apos;t live yet.
        </div>
        <SiteHeader />
        <main className="flex-1">
          <Page />
        </main>
        <SiteFooter />
      </div>
    </CartProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
