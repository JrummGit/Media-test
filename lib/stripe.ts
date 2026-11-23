import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const isTestMode = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    appInfo: { name: "press-play-media" },
    // fetch works on every runtime (Node, Vercel, edge) and honours proxies.
    httpClient: Stripe.createFetchHttpClient(),
  });
  return client;
}
