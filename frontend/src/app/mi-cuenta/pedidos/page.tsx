'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type Order } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

export default function MisPedidosPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login?next=/mi-cuenta/pedidos');
      return;
    }
    api
      .getMyOrders(token)
      .then((res) => setOrders(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'No se pudieron cargar'),
      );
  }, [mounted, token, router]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-28">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em]">
          Mis pedidos
        </h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-20 md:px-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
        Mis pedidos
      </h1>

      {error && <p className="mt-6 field-error">{error}</p>}

      {!error && orders.length === 0 && (
        <p className="mt-10 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Aún no tienes pedidos.{' '}
          <Link href="/productos" className="underline underline-offset-4">
            Ver colección
          </Link>
        </p>
      )}

      <ul className="mt-10 space-y-4">
        {orders.map((order) => (
          <li
            key={order.id}
            className="border-b border-[var(--color-line)] py-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                {new Date(order.createdAt).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                {order.status}
                {order.payment ? ` · pago ${order.payment.status}` : ''}
              </p>
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
              {formatPrice(order.total)}
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
              ID {order.id}
            </p>
            {order.payment?.method === 'store' &&
              order.payment.paymentReference &&
              order.payment.status === 'PENDING' && (
                <div className="mt-4 border border-[var(--color-line)] bg-[var(--color-stone)]/40 px-4 py-4">
                  <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink)]">
                    Código Yape
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-ink)]">
                    {order.payment.paymentReference}
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    Abre tu app de Yape → Yapear Servicios → busca{' '}
                    <strong className="font-medium text-[var(--color-ink)]">
                      Kashio
                    </strong>{' '}
                    en Compras Online → ingresa este código y confirma. Cuando
                    Openpay notifique el pago (webhook), el pedido pasará a
                    pagado solo.
                  </p>
                  <button
                    type="button"
                    className="mt-4 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink)] underline-offset-4 hover:underline"
                    onClick={async () => {
                      if (!token) return;
                      try {
                        await api.syncPayment(token, order.id);
                        const res = await api.getMyOrders(token);
                        setOrders(res.data);
                      } catch (e) {
                        setError(
                          e instanceof ApiError
                            ? e.message
                            : 'No se pudo sincronizar el pago',
                        );
                      }
                    }}
                  >
                    Actualizar estado del pago
                  </button>
                </div>
              )}
            {order.payment?.method === 'store' &&
              order.payment.status === 'APPROVED' && (
                <p className="mt-3 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  Pago Yape confirmado.
                </p>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}
