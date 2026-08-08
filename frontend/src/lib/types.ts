export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  discountPrice: string | number | null;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  category?: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  updatedAt?: string;
  /** true si no tiene pedidos/ventas y se puede borrar del todo */
  canDelete?: boolean;
}

export interface Address {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  id?: string;
  quantity: number;
  unitPrice: string | number;
  product?: { id?: string; name?: string; slug?: string };
  variant?: { id?: string; sku?: string; size?: string; color?: string };
}

export interface Order {
  id: string;
  status: string;
  channel?: string;
  subtotal: string | number;
  shippingCost: string | number;
  discountAmount?: string | number;
  promoCode?: string | null;
  total: string | number;
  notes: string | null;
  createdAt: string;
  items?: OrderItem[];
  payment?: {
    id: string;
    status: string;
    amount: string | number;
    method?: string | null;
    paymentReference?: string | null;
    openpayChargeId?: string | null;
  } | null;
  address?: Address;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface PosDailyReport {
  date: string;
  timezone: string;
  summary: {
    tickets: number;
    itemsSold: number;
    totalAmount: number;
    totalDiscount?: number;
    byMethod?: {
      cash: number;
      yape: number;
      card: number;
      transfer: number;
    };
    currency: string;
  };
  orders: Order[];
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  minOrderAmount: string | number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoValidation {
  promoCodeId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  discountAmount: number;
  subtotal: number;
  shippingCost: number;
  total: number;
  message: string;
}

export type StockLevel = 'low' | 'ok' | 'high';

export interface InventoryItem {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  level: StockLevel;
  product: {
    id: string;
    name: string;
    slug: string;
    categoryId?: string;
    imageUrl: string | null;
  };
}

export interface InventoryCategoryTab {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface InventoryListResponse {
  summary: {
    total: number;
    filtered?: number;
    low: number;
    ok: number;
    high: number;
    lowThreshold: number;
    highThreshold: number;
  };
  categories?: InventoryCategoryTab[];
  items: InventoryItem[];
}

export interface StockMovement {
  id: string;
  type: 'IN' | 'OUT';
  reason: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
  undoneAt?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  undoneBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  order?: { id: string; status: string } | null;
}

export interface InventoryMovementsResponse {
  variant: {
    id: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
    level: StockLevel;
    product: { id: string; name: string; slug: string };
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  permissions?: {
    canPurge: boolean;
  };
  undoneCount?: number;
  items: StockMovement[];
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
  };
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function formatPrice(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(n);
}
