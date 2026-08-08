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

type OpenpayGate = {
  orderId: string;
  hasCharge: boolean;
  openpayStatus: string | null;
  paymentConfirmed: boolean;
  allowPending: boolean;
  allowPaid: boolean;
};

export default function AdminPedidosPage() {
  const token = useAuthStore((s) => s.token)!;
  const [orders, setOrders] = useState<Order[]>([]);
  const [gates, setGates] = useState<Record<string, OpenpayGate>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadGates = useCallback(
    async (list: Order[]) => {
      const entries = await Promise.all(
        list.map(async (order) => {
          try {
            const gate = await api.getOrderOpenpayGate(token, order.id);
            return [order.id, gate] as const;
          } catch {
            // Fail-closed en UI: sin confirmación Openpay no ofrecer PAID
            return [
              order.id,
              {
                orderId: order.id,
                hasCharge: Boolean(order.payment?.openpayChargeId),
                openpayStatus: null,
                paymentConfirmed: false,
                allowPending: true,
                allowPaid: false,
              } satisfies OpenpayGate,
            ] as const;
          }
        }),
      );
      setGates(Object.fromEntries(entries));
    },
    [token],
  );

  const load = useCallback(async () => {
    try {
      const res = await api.getOrdersAdmin(token, { limit: 50 });
      setOrders(res.data);
      setError(null);
      await loadGates(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [token, loadGates]);

  useEffect(() => {
    load();
  }, [load]);

  const isStatusDisabled = (orderId: string, status: string) => {
    const gate = gates[orderId];
    if (!gate) return status === 'PENDING' || status === 'PAID';
    if (status === 'PENDING') return !gate.allowPending;
    if (status === 'PAID') return !gate.allowPaid;
    return false;
  };

  const changeStatus = async (id: string, status: string) => {
    if (isStatusDisabled(id, status)) return;
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
        PENDING/PAID se bloquean según el estado real en Openpay.
      </p>

      {error && <p className="mt-4 field-error">{error}</p>}

      <ul className="mt-8 space-y-6">
        {orders.map((order) => {
          const gate = gates[order.id];
          return (
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
                    {order.channel === 'STORE' ? ' · presencial' : ' · online'}
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
                    {STATUSES.map((s) => {
                      const disabled = isStatusDisabled(order.id, s);
                      return (
                        <option
                          key={s}
                          value={s}
                          disabled={disabled}
                          className={disabled ? 'text-neutral-400' : undefined}
                        >
                          {s}
                          {disabled ? ' (bloqueado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
                  {order.items.map((item, idx) => {
                    const name = item.product?.name ?? 'Producto';
                    const size = item.variant?.size;
                    const color = item.variant?.color;
                    const sku = item.variant?.sku;
                    const lineTotal =
                      Number(item.unitPrice) * Number(item.quantity);
                    return (
                      <li
                        key={item.id ?? `${order.id}-${idx}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 font-[family-name:var(--font-body)] text-sm"
                      >
                        <span className="text-[var(--color-ink)]">
                          {item.quantity}× {name}
                          {(size || color) && (
                            <span className="text-[var(--color-ink-soft)]">
                              {' '}
                              · {[size, color].filter(Boolean).join(' / ')}
                            </span>
                          )}
                          {sku && (
                            <span className="text-[var(--color-ink-soft)]">
                              {' '}
                              · {sku}
                            </span>
                          )}
                        </span>
                        <span className="text-[var(--color-ink-soft)]">
                          {formatPrice(lineTotal)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {order.notes && (
                <p className="mt-3 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  Nota: {order.notes}
                </p>
              )}

              {order.payment && (
                <div className="mt-3 space-y-2">
                  <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                    Pago: {order.payment.status}
                    {order.payment.method ? ` · ${order.payment.method}` : ''} ·{' '}
                    {formatPrice(order.payment.amount)}
                    {order.payment.paymentReference
                      ? ` · ref ${order.payment.paymentReference}`
                      : ''}
                    {gate?.openpayStatus
                      ? ` · Openpay ${gate.openpayStatus}`
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
          );
        })}
      </ul>

      {orders.length === 0 && !error && (
        <p className="mt-8 text-sm text-[var(--color-ink-soft)]">
          Todavía no hay pedidos.
        </p>
      )}
    </div>
  );
}
