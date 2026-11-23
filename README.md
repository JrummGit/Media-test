# Press Play Media

A custom storefront for vintage VHS tapes, cassettes and CDs. Shoppers browse real racks (a VHS wall, a cassette spinner and a CD crate), pull a case out, and flip it front, spine and back using the seller's own scans.

## Status

| Phase | What | State |
|---|---|---|
| 1 | Foundation: Next.js, Tailwind, Supabase schema, seed catalog | ✅ |
| 2 | Browse experience: shop floor, three racks, 3D flip inspector, filters, grid fallback, cart | ✅ |
| 3 | Stripe Checkout (Apple Pay / cards), flat shipping, holds, webhooks, order emails | ✅ (test mode) |
| 4 | Admin: phone-first listing upload, Claude autofill, orders, Etsy CSV import | next |
| 5 | Shopper personalization ("Tune in", local signals, ranking) | |
| 6 | Trend agent (weekly pop-culture report + promotions) | |
| 7 | Launch polish: SEO, OG images, domain, policy pages | |

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables set, the shop uses the fictional sample inventory in `data/seed.ts`, with generated cover art in `public/seed/` (`npm run seed:art` regenerates it). Copy `.env.example` to `.env.local` to connect real services.

## Shareable preview

`npm run preview:build -- out.html` bundles the shop, with sample inventory and no checkout, into one self-contained HTML file. It uses the same view components (`components/views/*`) with small stand-ins for `next/link` and `next/navigation` (`preview/shims/`), and routes through `#hash` names.

## Payments (Stripe)

Checkout uses Stripe's hosted page, so Apple Pay, Google Pay and cards show up automatically on supported devices, and no card data ever touches this site.

1. In the Stripe Dashboard (test mode), copy the secret key (`sk_test_…`) into `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint at `https://<your-site>/api/stripe/webhook` for these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Pay with test card `4242 4242 4242 4242`, any future expiry and any CVC.

How it works:
- Shipping is a flat rate, $4.50 plus $1 per extra item, US only. It's set in `lib/shipping.ts`.
- Prices always come from the catalog on the server, never from the browser.
- When checkout starts, the items go on hold for 30 minutes (the Checkout Session's lifetime) so two people can't buy the same tape. A paid session marks them sold. An expired or cancelled one puts them back on the shelf.
- Holds need Supabase. With the sample catalog, checkout still works but nothing is reserved.
- The order is recorded and a confirmation email goes out, through Resend if `RESEND_API_KEY` is set, otherwise the email is skipped and logged.

## Connecting Supabase

1. Create a free project at supabase.com.
2. In the SQL editor, run each file in `supabase/migrations/` in order.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The catalog and checkout holds switch over automatically.

## Layout

- `app/page.tsx`: shop floor (home)
- `app/[format]/page.tsx`: aisle pages `/vhs`, `/cassette` and `/cd`
- `app/item/[slug]/page.tsx`: deep-linkable item inspector
- `components/rack/`: `VhsShelf`, `CassetteSpinner`, `CdBin`, `RackBrowser` (filters and modal)
- `components/inspector/`: `FlipCase` (CSS 3D case), `ZoomViewer`, `Inspector`
- `components/cart/`: cart state (localStorage) and drawer
- `lib/catalog.ts`: data access (Supabase, or the seed fallback)
