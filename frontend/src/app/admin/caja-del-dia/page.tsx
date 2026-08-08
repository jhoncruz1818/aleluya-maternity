'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type Order, type PosDailyReport } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

function todayLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function paymentLabel(method?: string | null) {
  if (method === 'yape') return 'Yape/Plin';
  if (method === 'card') return 'Tarjeta';
  if (method === 'transfer') return 'Transferencia';
  if (method === 'cash') return 'Efectivo';
  return method ?? '—';
}

function itemLabel(order: Order): string {
  const items = (order.items ?? []) as Array<{
    quantity: number;
    product?: { name?: string };
    variant?: { size?: string; color?: string };
  }>;
  if (!items.length) return '—';
  return items
    .map((i) => {
      const name = i.product?.name ?? 'Producto';
      const meta = [i.variant?.size, i.variant?.color].filter(Boolean).join('/');
      return `${i.quantity}× ${name}${meta ? ` (${meta})` : ''}`;
    })
    .join(', ');
}

/**
 * Cierre de caja: ventas presenciales (efectivo / yape / transferencia).
 */
export default function CajaDelDiaPage() {
  const token = useAuthStore((s) => s.token)!;
  const [date, setDate] = useState(todayLima);
  const [report, setReport] = useState<PosDailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.getPosDaily(token, { date }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la caja');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [token, date]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
            Caja del día
          </h2>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Ventas presenciales (efectivo, Yape/Plin, tarjeta o transferencia)
          </p>
        </div>
        <Link
          href="/admin/venta-presencial"
          className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          ← Nueva venta
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3 print:hidden">
        <label className="block">
          <span className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            Fecha (Lima)
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 block border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none focus:border-[var(--color-ink)]"
          />
        </label>
        <button type="button" className="btn-outline" onClick={() => void load()}>
          Actualizar
        </button>
        <button
          type="button"
          className="btn-outline disabled:opacity-40"
          disabled={!report || loading}
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>

      {error && (
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)] print:hidden">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)] print:hidden">
          Cargando…
        </p>
      )}

      {!loading && report && (
        <div id="caja-print-area">
          <div className="mt-6 hidden print:block">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em]">
              Aleluya Maternity — Caja del día
            </h2>
            <p className="mt-1 text-sm">
              Fecha {report.date} (America/Lima)
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3 print:grid-cols-3">
            <div>
              <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                Tickets
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] text-[var(--color-ink)]">
                {report.summary.tickets}
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                Ítems
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] text-[var(--color-ink)]">
                {report.summary.itemsSold}
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                Total cobrado
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] text-[var(--color-ink)]">
                {formatPrice(report.summary.totalAmount)}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Efectivo{' '}
              <span className="text-[var(--color-ink)]">
                {formatPrice(report.summary.byMethod?.cash ?? 0)}
              </span>
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Yape/Plin{' '}
              <span className="text-[var(--color-ink)]">
                {formatPrice(report.summary.byMethod?.yape ?? 0)}
              </span>
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Tarjeta{' '}
              <span className="text-[var(--color-ink)]">
                {formatPrice(report.summary.byMethod?.card ?? 0)}
              </span>
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Transferencia{' '}
              <span className="text-[var(--color-ink)]">
                {formatPrice(report.summary.byMethod?.transfer ?? 0)}
              </span>
            </p>
          </div>

          {(report.summary.totalDiscount ?? 0) > 0 && (
            <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Descuentos del día:{' '}
              <span className="text-[var(--color-ink)]">
                {formatPrice(report.summary.totalDiscount)}
              </span>
            </p>
          )}

          <ul className="mt-12 space-y-4">
            {report.orders.map((order) => (
              <li
                key={order.id}
                className="border-b border-[var(--color-line)] pb-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                    #{order.id.slice(-8).toUpperCase()} ·{' '}
                    {paymentLabel(order.payment?.method)}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                    {formatPrice(order.total)}
                  </p>
                </div>
                <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                    timeZone: 'America/Lima',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {itemLabel(order)}
                  {Number(order.discountAmount ?? 0) > 0 && (
                    <> · dto. {formatPrice(order.discountAmount)}</>
                  )}
                </p>
              </li>
            ))}
            {!report.orders.length && (
              <li className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                No hay ventas presenciales en esta fecha.
              </li>
            )}
          </ul>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              #caja-print-area, #caja-print-area * { visibility: visible !important; }
              #caja-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 1rem;
              }
            }
          `,
        }}
      />
    </div>
  );
}
