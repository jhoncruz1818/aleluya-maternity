/** Umbrales de alerta de inventario (admin). */
export const STOCK_LOW_THRESHOLD = 5;
export const STOCK_HIGH_THRESHOLD = 50;

/** type */
export const StockMoveType = {
  IN: 'IN',
  OUT: 'OUT',
} as const;

/** reason */
export const StockMoveReason = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  INITIAL: 'INITIAL',
  RETURN: 'RETURN',
} as const;
