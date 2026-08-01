'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/types';
import { CartItemRow } from '@/components/cart/CartItem';

/**
 * Página del carrito (client): lee Zustand + persist.
 * Evitamos mismatch de hidratación esperando al mount.
 */
export default function CarritoPage() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-5 pt-28 pb-20 md:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
          Bolsa
        </h1>
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Cargando…
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-start justify-center px-5 pt-24 md:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
          Bolsa
        </h1>
        <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Tu bolsa está vacía.
        </p>
        <Link href="/productos" className="btn-outline mt-8">
          Ir a la colección
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pt-28 pb-20 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
          Bolsa
        </h1>
        <button
          type="button"
          onClick={clear}
          className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Vaciar
        </button>
      </div>

      <ul className="mt-10">
        {items.map((item) => (
          <CartItemRow key={item.variantId} item={item} />
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-6 border-t border-[var(--color-line)] pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
            Subtotal
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[0.04em] text-[var(--color-ink)]">
            {formatPrice(subtotal)}
          </p>
          <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
            Envío se calcula en el checkout.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <Link href="/checkout" className="btn-outline text-center">
            Continuar al pago
          </Link>
          <Link
            href="/productos"
            className="text-center font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
