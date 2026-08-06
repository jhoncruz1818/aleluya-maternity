/**
 * Cliente HTTP hacia la API NestJS.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(
    path.startsWith('http')
      ? path
      : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`,
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, query } = options;

  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit & { next?: { revalidate: number } } = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  if (typeof window === 'undefined' && method === 'GET') {
    init.next = { revalidate: 60 };
  }

  const res = await fetch(buildUrl(path, query), init);

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      message = data.message ?? message;
      if (Array.isArray(message)) message = message.join(', ');
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getCategories: () => apiFetch<import('./types').Category[]>('/categories'),
  getProducts: (query?: RequestOptions['query']) =>
    apiFetch<import('./types').Paginated<import('./types').Product>>(
      '/products',
      { query },
    ),
  getProduct: (idOrSlug: string) =>
    apiFetch<import('./types').Product>(`/products/${idOrSlug}`),

  register: (body: unknown) =>
    apiFetch<import('./types').AuthResponse>('/auth/register', {
      method: 'POST',
      body,
    }),
  login: (body: unknown) =>
    apiFetch<import('./types').AuthResponse>('/auth/login', {
      method: 'POST',
      body,
    }),

  getAddresses: (token: string) =>
    apiFetch<import('./types').Address[]>('/addresses', { token }),
  createAddress: (token: string, body: unknown) =>
    apiFetch<import('./types').Address>('/addresses', {
      method: 'POST',
      token,
      body,
    }),

  createOrder: (token: string, body: unknown) =>
    apiFetch<import('./types').Order>('/orders', {
      method: 'POST',
      token,
      body,
    }),
  getMyOrders: (token: string, query?: RequestOptions['query']) =>
    apiFetch<import('./types').Paginated<import('./types').Order>>(
      '/orders',
      { token, query },
    ),
  chargePayment: (
    token: string,
    body: {
      orderId: string;
      method: 'card' | 'store';
      deviceSessionId: string;
      openpayToken?: string;
    },
  ) =>
    apiFetch<{
      message: string;
      pending?: boolean;
      sandboxAutoConfirmed?: boolean;
      paymentReference?: string | null;
      instructions?: string;
      order: import('./types').Order;
      payment: import('./types').Order['payment'];
    }>('/payments/charge', { method: 'POST', token, body }),

  // --- Admin ---
  getProductsAdmin: (token: string, query?: RequestOptions['query']) =>
    apiFetch<import('./types').Paginated<import('./types').Product>>(
      '/products/admin/all',
      { token, query },
    ),
  getProductAdmin: (token: string, id: string) =>
    apiFetch<import('./types').Product>(`/products/admin/${id}`, { token }),
  createProduct: (token: string, body: unknown) =>
    apiFetch<import('./types').Product>('/products', {
      method: 'POST',
      token,
      body,
    }),
  updateProduct: (token: string, id: string, body: unknown) =>
    apiFetch<import('./types').Product>(`/products/${id}`, {
      method: 'PATCH',
      token,
      body,
    }),
  /** Sube imagen desde el PC (multipart). Devuelve URL pública en R2. */
  uploadProductImage: async (token: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(buildUrl('/uploads/product-image'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
    if (!res.ok) {
      let message = `Error ${res.status}`;
      try {
        const data = await res.json();
        message = data.message ?? message;
        if (Array.isArray(message)) message = message.join(', ');
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }
    return res.json() as Promise<{
      url: string;
      filename: string;
      size: number;
      mimeType: string;
    }>;
  },
  deleteProduct: (token: string, id: string) =>
    apiFetch<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
      token,
    }),
  createCategory: (token: string, body: unknown) =>
    apiFetch<import('./types').Category>('/categories', {
      method: 'POST',
      token,
      body,
    }),
  updateCategory: (token: string, id: string, body: unknown) =>
    apiFetch<import('./types').Category>(`/categories/${id}`, {
      method: 'PATCH',
      token,
      body,
    }),
  deleteCategory: (token: string, id: string) =>
    apiFetch<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
      token,
    }),
  getOrdersAdmin: (token: string, query?: RequestOptions['query']) =>
    apiFetch<import('./types').Paginated<import('./types').Order>>(
      '/orders/admin/all',
      { token, query },
    ),
  updateOrderStatus: (token: string, id: string, status: string) =>
    apiFetch<import('./types').Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    }),
  syncPayment: (token: string, orderId: string) =>
    apiFetch<{
      message: string;
      pending?: boolean;
      order: import('./types').Order | null;
    }>(`/payments/${orderId}/sync`, { method: 'POST', token }),

  getPromoCodes: (token: string) =>
    apiFetch<import('./types').PromoCode[]>('/promo-codes', { token }),
  createPromoCode: (token: string, body: unknown) =>
    apiFetch<import('./types').PromoCode>('/promo-codes', {
      method: 'POST',
      token,
      body,
    }),
  updatePromoCode: (token: string, id: string, body: unknown) =>
    apiFetch<import('./types').PromoCode>(`/promo-codes/${id}`, {
      method: 'PATCH',
      token,
      body,
    }),
  deletePromoCode: (token: string, id: string) =>
    apiFetch<{ message: string }>(`/promo-codes/${id}`, {
      method: 'DELETE',
      token,
    }),
  validatePromoCode: (
    token: string,
    body: { code: string; subtotal: number; shippingCost?: number },
  ) =>
    apiFetch<import('./types').PromoValidation>('/promo-codes/validate', {
      method: 'POST',
      token,
      body,
    }),

  getInventory: (token: string, query?: RequestOptions['query']) =>
    apiFetch<import('./types').InventoryListResponse>('/inventory', {
      token,
      query,
    }),
  getInventoryMovements: (
    token: string,
    variantId: string,
    query?: RequestOptions['query'],
  ) =>
    apiFetch<import('./types').InventoryMovementsResponse>(
      `/inventory/${variantId}/movements`,
      { token, query },
    ),
  createStockMovement: (
    token: string,
    variantId: string,
    body: {
      type: 'IN' | 'OUT';
      quantity: number;
      reason?: 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
      note?: string;
    },
  ) =>
    apiFetch<{
      movement: import('./types').StockMovement;
      stock: number;
      level: import('./types').StockLevel;
    }>(`/inventory/${variantId}/movements`, {
      method: 'POST',
      token,
      body,
    }),
  undoStockMovement: (token: string, movementId: string) =>
    apiFetch<{
      message: string;
      variantId: string;
      stock: number;
      level: import('./types').StockLevel;
    }>(`/inventory/movements/${movementId}`, {
      method: 'DELETE',
      token,
    }),
  purgeStockMovement: (token: string, movementId: string) =>
    apiFetch<{ message: string; variantId: string }>(
      `/inventory/movements/${movementId}/purge`,
      { method: 'DELETE', token },
    ),
  purgeAllUndoneMovements: (token: string, variantId: string) =>
    apiFetch<{ message: string; deleted: number; variantId: string }>(
      `/inventory/${variantId}/undone`,
      { method: 'DELETE', token },
    ),
};
