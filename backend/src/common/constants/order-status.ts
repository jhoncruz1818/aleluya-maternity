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
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
