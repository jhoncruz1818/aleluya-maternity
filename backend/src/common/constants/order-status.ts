/**
 * Estados de pedido (columna Order.status como String en SQL Server).
 */
export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Canal del pedido */
export const OrderChannel = {
  ONLINE: 'ONLINE',
  STORE: 'STORE',
} as const;

export type OrderChannel = (typeof OrderChannel)[keyof typeof OrderChannel];

/** Métodos de pago conocidos */
export const PaymentMethod = {
  CARD: 'card',
  STORE: 'store',
  CASH: 'cash',
  YAPE: 'yape',
  TRANSFER: 'transfer',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** Métodos permitidos en venta presencial (caja) */
export const PosPaymentMethod = {
  CASH: PaymentMethod.CASH,
  YAPE: PaymentMethod.YAPE, // Yape / Plin
  CARD: PaymentMethod.CARD,
  TRANSFER: PaymentMethod.TRANSFER,
} as const;

export type PosPaymentMethod =
  (typeof PosPaymentMethod)[keyof typeof PosPaymentMethod];

export const POS_PAYMENT_METHODS = Object.values(PosPaymentMethod);

export function posPaymentLabel(method?: string | null): string {
  switch (method) {
    case PaymentMethod.YAPE:
      return 'Yape/Plin';
    case PaymentMethod.CARD:
      return 'Tarjeta';
    case PaymentMethod.TRANSFER:
      return 'Transferencia';
    case PaymentMethod.CASH:
      return 'Efectivo';
    default:
      return method ?? '—';
  }
}
