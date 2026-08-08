'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type Order, type Product } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

type PosPaymentMethod = 'cash' | 'yape' | 'card' | 'transfer';

const PAYMENT_OPTIONS: Array<{ value: PosPaymentMethod; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'yape', label: 'Yape/Plin' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
];

function paymentLabel(method?: string | null) {
  if (method === 'yape') return 'Yape/Plin';
  if (method === 'card') return 'Tarjeta';
  if (method === 'transfer') return 'Transferencia';
  if (method === 'cash') return 'Efectivo';
  return method ?? '—';
}

type CartLine = {
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  unitPrice: number;
  stock: number;
  quantity: number;
};

type CatalogRow = {
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  unitPrice: number;
  stock: number;
};

function rowsFromProducts(products: Product[]): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const p of products) {
    if (!p.isActive) continue;
    const unitPrice = Number(p.discountPrice ?? p.price);
    for (const v of p.variants ?? []) {
      if (v.stock <= 0) continue;
      rows.push({
        variantId: v.id,
        productName: p.name,
        sku: v.sku,
        size: v.size,
        color: v.color,
        unitPrice,
        stock: v.stock,
      });
    }
  }
  return rows;
}

/**
 * Caja / venta presencial.
 * Tipo de pago + descuento opcional; descuenta stock como SALE.
 */
export default function VentaPresencialPage() {
  const token = useAuthStore((s) => s.token)!;
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PosPaymentMethod>('cash');
  const [discountInput, setDiscountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Order | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const applyCatalog = useCallback((nextRows: CatalogRow[]) => {
    setRows(nextRows);
    const stockById = new Map(nextRows.map((r) => [r.variantId, r]));
    setCart((prev) =>
      prev
        .map((line) => {
          const fresh = stockById.get(line.variantId);
          if (!fresh) {
            return { ...line, stock: 0, quantity: 0 };
          }
          return {
            ...line,
            stock: fresh.stock,
            unitPrice: fresh.unitPrice,
            quantity: Math.min(line.quantity, fresh.stock),
          };
        })
        .filter((line) => line.quantity > 0),
    );
    setLastSyncAt(new Date());
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await api.getProductsAdmin(token, {
          search: search.trim() || undefined,
          isActive: true,
          limit: 50,
        });
        applyCatalog(rowsFromProducts(res.data));
        if (silent) setError(null);
      } catch (e) {
        if (!silent) {
          setError(
            e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo',
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, search, applyCatalog],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const REFRESH_MS = 15_000;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void load({ silent: true });
      }
    };

    const id = window.setInterval(tick, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void load({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    const raw = Number(discountInput.replace(',', '.'));
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw, subtotal);
  }, [discountInput, subtotal]);

  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  const addToCart = (row: CatalogRow) => {
    setLastSale(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === row.variantId);
      if (existing) {
        if (existing.quantity >= row.stock) return prev;
        return prev.map((l) =>
          l.variantId === row.variantId
            ? { ...l, quantity: l.quantity + 1, stock: row.stock }
            : l,
        );
      }
      return [
        ...prev,
        {
          variantId: row.variantId,
          productName: row.productName,
          sku: row.sku,
          size: row.size,
          color: row.color,
          unitPrice: row.unitPrice,
          stock: row.stock,
          quantity: 1,
        },
      ];
    });
  };

  const setQty = (variantId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.variantId !== variantId) return l;
          const q = Math.max(0, Math.min(l.stock, quantity));
          return { ...l, quantity: q };
        })
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (variantId: string) => {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  };

  const checkout = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createPosSale(token, {
        items: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        paymentMethod,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        notes: notes.trim() || undefined,
      });
      setLastSale(order);
      setCart([]);
      setNotes('');
      setDiscountInput('');
      setPaymentMethod('cash');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cobrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
            Venta presencial
          </h2>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Caja en tienda · descuenta stock como venta
            {lastSyncAt && (
              <>
                {' '}
                · stock actualizado{' '}
                {lastSyncAt.toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </>
            )}
          </p>
        </div>
        <Link
          href="/admin/caja-del-dia"
          className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Ver caja del día →
        </Link>
      </div>

      {error && (
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)]">
          {error}
        </p>
      )}

      {lastSale && (
        <div className="mt-6 border border-[var(--color-line)] px-4 py-4">
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]">
            Ticket cobrado
          </p>
          <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            #{lastSale.id.slice(-8).toUpperCase()} ·{' '}
            {formatPrice(lastSale.total)} ·{' '}
            {paymentLabel(lastSale.payment?.method)}
            {Number(lastSale.discountAmount ?? 0) > 0 && (
              <> · dto. {formatPrice(lastSale.discountAmount)}</>
            )}
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none focus:border-[var(--color-ink)]"
            />
            <button type="submit" className="btn-outline shrink-0">
              Buscar
            </button>
            <button
              type="button"
              className="btn-outline shrink-0"
              onClick={() => void load({ silent: true })}
            >
              Actualizar
            </button>
          </form>

          {loading ? (
            <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Cargando…
            </p>
          ) : (
            <ul className="mt-6 max-h-[28rem] space-y-3 overflow-y-auto">
              {rows.map((row) => (
                <li
                  key={row.variantId}
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                      {row.productName}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                      {row.size} / {row.color}
                      {row.sku && !row.sku.startsWith('AUTO-')
                        ? ` · ${row.sku}`
                        : ''}{' '}
                      · stock {row.stock} · {formatPrice(row.unitPrice)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-outline shrink-0 px-3 py-2 text-[10px]"
                    onClick={() => addToCart(row)}
                  >
                    Agregar
                  </button>
                </li>
              ))}
              {!rows.length && (
                <li className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                  Sin variantes con stock.
                </li>
              )}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
            Ticket
          </h3>

          {!cart.length ? (
            <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Agrega productos para cobrar.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {cart.map((line) => (
                <li
                  key={line.variantId}
                  className="border-b border-[var(--color-line)] pb-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                        {line.productName}
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                        {line.size} / {line.color} ·{' '}
                        {formatPrice(line.unitPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-rose)]"
                      onClick={() => removeLine(line.variantId)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="border border-[var(--color-line)] px-2 py-1 text-sm"
                      onClick={() => setQty(line.variantId, line.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center font-[family-name:var(--font-body)] text-sm">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      className="border border-[var(--color-line)] px-2 py-1 text-sm"
                      onClick={() => setQty(line.variantId, line.quantity + 1)}
                    >
                      +
                    </button>
                    <span className="ml-auto font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-6 block">
            <span className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
              Tipo de pago
            </span>
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PosPaymentMethod)
              }
              className="mt-2 w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none focus:border-[var(--color-ink)]"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
              Descuento (S/) — opcional
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="mt-2 w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none focus:border-[var(--color-ink)]"
              placeholder="Ej. prenda con defecto"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
              Nota (opcional)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none focus:border-[var(--color-ink)]"
              placeholder="Ej. mancha en costura / cliente mostrador"
            />
          </label>

          <div className="mt-6 space-y-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            <p>Subtotal {formatPrice(subtotal)}</p>
            {discountAmount > 0 && (
              <p>Descuento −{formatPrice(discountAmount)}</p>
            )}
          </div>

          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
            {formatPrice(total)}
          </p>

          <button
            type="button"
            className="btn-outline mt-4 w-full disabled:opacity-40"
            disabled={!cart.length || submitting}
            onClick={() => void checkout()}
          >
            {submitting
              ? 'Cobrando…'
              : `Cobrar · ${PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
