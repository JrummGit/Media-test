# Press Play Media

A custom storefront for vintage VHS tapes, cassettes and CDs. Shoppers browse real racks (a VHS wall, a cassette spinner and a CD crate), pull a case out, and flip it front, spine and back using the seller's own scans.

## Status

| Phase | What | State |
|---|---|---|
| 1 | Foundation: Next.js, Tailwind, Supabase schema, seed catalog | ✅ |
| 2 | Browse experience: shop floor, three racks, 3D flip inspector, filters, grid fallback, cart | ✅ |
| 3 | Stripe Checkout (Apple Pay / cards), holds, webhooks, order emails | next |
| 4 | Admin: phone-first listing upload, Claude autofill, orders, Etsy CSV import | |
| 5 | Shopper personalization ("Tune in", local signals, ranking) | |
| 6 | Trend agent (weekly pop-culture report + promotions) | |
| 7 | Launch polish: SEO, OG images, domain, policy pages | |

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables set, the shop uses the fictional sample inventory in `data/seed.ts`, with generated cover art in `public/seed/` (`npm run seed:art` regenerates it). Copy `.env.example` to `.env.local` to connect real services.

## Connecting Supabase

1. Create a free project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The catalog switches over automatically.

## Layout

- `app/page.tsx`: shop floor (home)
- `app/[format]/page.tsx`: aisle pages `/vhs`, `/cassette` and `/cd`
- `app/item/[slug]/page.tsx`: deep-linkable item inspector
- `components/rack/`: `VhsShelf`, `CassetteSpinner`, `CdBin`, `RackBrowser` (filters and modal)
- `components/inspector/`: `FlipCase` (CSS 3D case), `ZoomViewer`, `Inspector`
- `components/cart/`: cart state (localStorage) and drawer
- `lib/catalog.ts`: data access (Supabase, or the seed fallback)
