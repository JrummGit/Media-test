/** Flat-rate shipping, shared by the cart drawer and Stripe Checkout. */
export const SHIPPING = {
  firstItemCents: 450,
  additionalItemCents: 100,
  label: "Flat-rate shipping (USPS Media Mail)",
  minBusinessDays: 3,
  maxBusinessDays: 8,
  /** Countries Checkout will accept a shipping address for. */
  countries: ["US"] as const,
};

export function shippingCents(itemCount: number): number {
  if (itemCount <= 0) return 0;
  return SHIPPING.firstItemCents + (itemCount - 1) * SHIPPING.additionalItemCents;
}
