'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { formatPrice, type Product, type ProductVariant } from '@/lib/types';

/**
 * Selector de variante + botón "Agregar a la bolsa".
 * Refresca stock (API) y la página (router.refresh) cada 15s / al volver a la pestaña.
 */
export function AddToCartPanel({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [variants, setVariants] = useState<ProductVariant[]>(
    product.variants ?? [],
  );

  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size))],
    [variants],
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color))],
    [variants],
  );

  const [size, setSize] = useState(sizes[0] ?? '');
  const [color, setColor] = useState(colors[0] ?? '');
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshStock = useCallback(async () => {
    try {
      const fresh = await api.getProduct(product.slug);
      setVariants(fresh.variants ?? []);
      router.refresh();
    } catch {
      /* mantener variantes actuales */
    }
  }, [product.slug, router]);

  useEffect(() => {
    void refreshStock();
    const REFRESH_MS = 15_000;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshStock();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshStock();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refreshStock]);

  useEffect(() => {
    setVariants(product.variants ?? []);
  }, [product.variants]);

  const selected = variants.find((v) => v.size === size && v.color === color);

  useEffect(() => {
    if (selected && qty > selected.stock) {
      setQty(Math.max(1, selected.stock || 1));
    }
  }, [selected, qty]);

  const unitPrice = Number(product.discountPrice ?? product.price);
  const imageUrl = product.images?.[0]?.url;

  const onAdd = () => {
    if (!selected) {
      setFeedback('Elige una combinación disponible');
      return;
    }
    if (selected.stock < 1) {
      setFeedback('Sin stock en esta variante');
      return;
    }
    if (qty > selected.stock) {
      setFeedback(`Solo hay ${selected.stock} en stock`);
      return;
    }

    addItem(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: selected.size,
        color: selected.color,
        unitPrice,
        imageUrl,
      },
      qty,
    );
    setFeedback('Agregado a la bolsa');
    setTimeout(() => setFeedback(null), 2200);
    void refreshStock();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
          Talla
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((s) => {
            const available = variants.some(
              (v) => v.size === s && v.color === color && v.stock > 0,
            );
            return (
              <button
                key={s}
                type="button"
                disabled={!available && color !== ''}
                onClick={() => setSize(s)}
                className={`min-w-12 border px-3 py-2 font-[family-name:var(--font-body)] text-sm transition-colors ${
                  size === s
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-cream)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
          Color
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((c) => {
            const available = variants.some(
              (v) => v.color === c && v.size === size && v.stock > 0,
            );
            return (
              <button
                key={c}
                type="button"
                disabled={!available && size !== ''}
                onClick={() => setColor(c)}
                className={`border px-4 py-2 font-[family-name:var(--font-body)] text-sm transition-colors ${
                  color === c
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-cream)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
          Cantidad
        </p>
        <div className="flex items-center border border-[var(--color-line)]">
          <button
            type="button"
            aria-label="Menos"
            className="px-3 py-2 text-[var(--color-ink)]"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="min-w-8 text-center font-[family-name:var(--font-body)] text-sm">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Más"
            className="px-3 py-2 text-[var(--color-ink)]"
            onClick={() =>
              setQty((q) =>
                selected ? Math.min(Math.max(selected.stock, 1), q + 1) : q + 1,
              )
            }
          >
            +
          </button>
        </div>
        {selected && (
          <span className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
            {selected.stock > 0 ? `${selected.stock} en stock` : 'Agotado'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onAdd}
          disabled={!selected || selected.stock < 1}
          className="btn-outline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Agregar a la bolsa · {formatPrice(unitPrice)}
        </button>
        {feedback && (
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)] animate-fade-up">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
