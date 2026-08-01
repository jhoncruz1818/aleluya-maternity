'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type Order } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export default function AdminPedidosPage() {
  const token = useAuthStore((s) => s.token)!;
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getOrdersAdmin(token, { limit: 50 });
      setOrders(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await api.updateOrderStatus(token, id, status);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const syncPayment = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const res = await api.syncPayment(token, orderId);
      setError(res.pending ? res.message : null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo sincronizar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        Pedidos
      </h2>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Yape queda pendiente hasta el webhook de Openpay (
        <code className="text-[var(--color-ink)]">
          POST /api/payments/webhook/openpay
        </code>
        ). “Sincronizar” consulta el cargo en Openpay si el webhook se retrasó.
      </p>

      {error && <p className="mt-4 field-error">{error}</p>}

      <ul className="mt-8 space-y-6">
        {orders.map((order) => (
          <li
            key={order.id}
            className="border-b border-[var(--color-line)] pb-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
                  {formatPrice(order.total)}
                </p>
                <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  {new Date(order.createdAt).toLocaleString('es-PE')} ·{' '}
                  {order.user?.email ?? 'cliente'}
                </p>
                <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] text-[var(--color-ink-soft)]">
                  {order.id}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="field-label mb-0">Estado</label>
                <select
                  className="field-input w-auto py-2"
                  value={order.status}
                  disabled={busyId === order.id}
                  onChange={(e) => changeStatus(order.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {order.payment && (
              <div className="mt-3 space-y-2">
                <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  Pago: {order.payment.status}
                  {order.payment.method ? ` · ${order.payment.method}` : ''} ·{' '}
                  {formatPrice(order.payment.amount)}
                  {order.payment.paymentReference
                    ? ` · ref ${order.payment.paymentReference}`
                    : ''}
                </p>
                {order.payment.status === 'PENDING' &&
                  order.payment.openpayChargeId && (
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => syncPayment(order.id)}
                      className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink)] underline-offset-4 hover:underline disabled:opacity-40"
                    >
                      Sincronizar con Openpay
                    </button>
                  )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {orders.length === 0 && !error && (
        <p className="mt-8 text-sm text-[var(--color-ink-soft)]">
          Todavía no hay pedidos.
        </p>
      )}
    </div>
  );
}
