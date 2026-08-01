'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore, type CartItem } from '@/store/cart';
import { formatPrice } from '@/lib/types';

/**
 * Línea del carrito: imagen, variante, precio y cantidad editable.
 */
export function CartItemRow({ item }: { item: CartItem }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <li className="grid grid-cols-[80px_1fr] gap-4 border-b border-[var(--color-line)] py-6 sm:grid-cols-[100px_1fr_auto] sm:gap-6">
      <Link
        href={`/productos/${item.slug}`}
        className="relative aspect-[3/4] overflow-hidden bg-[var(--color-stone)]"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="100px"
            className="object-cover"
            unoptimized={
              item.imageUrl.includes('ejemplo.com') ||
              !item.imageUrl.includes('images.unsplash.com')
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]/20">
            L
          </div>
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={`/productos/${item.slug}`}
          className="font-[family-name:var(--font-body)] text-sm tracking-wide text-[var(--color-ink)] hover:text-[var(--color-rose)]"
        >
          {item.name}
        </Link>
        <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
          {item.size} · {item.color}
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)] sm:hidden">
          {formatPrice(item.unitPrice * item.quantity)}
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center border border-[var(--color-line)]">
            <button
              type="button"
              aria-label="Menos"
              className="px-3 py-1.5 text-[var(--color-ink)]"
              onClick={() => setQuantity(item.variantId, item.quantity - 1)}
            >
              −
            </button>
            <span className="min-w-8 text-center font-[family-name:var(--font-body)] text-sm">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Más"
              className="px-3 py-1.5 text-[var(--color-ink)]"
              onClick={() => setQuantity(item.variantId, item.quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.variantId)}
            className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            Quitar
          </button>
        </div>
      </div>

      <p className="hidden self-start text-right font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)] sm:block">
        {formatPrice(item.unitPrice * item.quantity)}
      </p>
    </li>
  );
}
