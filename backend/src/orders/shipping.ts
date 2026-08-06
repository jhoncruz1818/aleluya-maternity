/**
 * Tarifas de envío calculadas solo en el servidor.
 * El cliente envía el método; nunca el monto.
 */
export const SHIPPING_RATES = {
  standard: { cost: 15, freeFrom: 250 },
  express: { cost: 28, freeFrom: null as number | null },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_RATES;

export function resolveShippingCost(
  method: ShippingMethod,
  subtotal: number,
): number {
  const rate = SHIPPING_RATES[method];
  if (rate.freeFrom != null && subtotal >= rate.freeFrom) {
    return 0;
  }
  return rate.cost;
}
