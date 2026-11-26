import "server-only";
import { serviceConfigured, serviceDb } from "@/lib/supabase/service";

/**
 * Holds, sales and orders. Uses the Supabase service role (server only).
 * Without Supabase configured (sample catalog), every call is a no-op so
 * checkout can still be tried end to end.
 */
export const inventoryConfigured = serviceConfigured;
const db = serviceDb;

export class ItemsUnavailableError extends Error {
  constructor() {
    super("ITEMS_UNAVAILABLE");
  }
}

/** Atomically puts every slug on hold, or none of them. */
export async function reserveItems(slugs: string[], token: string, until: Date): Promise<void> {
  if (!inventoryConfigured()) return;
  const { error } = await db().rpc("reserve_items", { p_slugs: slugs, p_token: token, p_until: until.toISOString() });
  if (error) {
    if (error.message.includes("ITEMS_UNAVAILABLE")) throw new ItemsUnavailableError();
    throw error;
  }
}

export async function releaseItems(token: string): Promise<void> {
  if (!inventoryConfigured()) return;
  const { error } = await db().rpc("release_items", { p_token: token });
  if (error) throw error;
}

export async function markItemsSold(token: string): Promise<void> {
  if (!inventoryConfigured()) return;
  const { error } = await db().rpc("mark_items_sold", { p_token: token });
  if (error) throw error;
}

export interface OrderRecord {
  stripeSessionId: string;
  email: string | null;
  slugs: string[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: unknown;
}

/**
 * Idempotent: Stripe can deliver the same webhook more than once.
 * Returns false when this order was already recorded.
 */
export async function recordOrder(order: OrderRecord): Promise<boolean> {
  if (!inventoryConfigured()) return true;
  const { data, error } = await db()
    .from("orders")
    .upsert(
      {
        stripe_session_id: order.stripeSessionId,
        email: order.email,
        item_slugs: order.slugs,
        subtotal_cents: order.subtotalCents,
        shipping_cents: order.shippingCents,
        tax_cents: order.taxCents,
        total_cents: order.totalCents,
        shipping_address: order.shippingAddress,
      },
      { onConflict: "stripe_session_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
