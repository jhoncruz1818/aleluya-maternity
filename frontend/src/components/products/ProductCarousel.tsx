'use client';

import { useRef } from 'react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

/**
 * Carrusel horizontal: el dinamismo viene del scroll suave, no del color.
 */
export function ProductCarousel({
  products,
  title,
  subtitle,
}: {
  products: Product[];
  title: string;
  subtitle?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto flex max-w-7xl items-end justify-between px-5 md:px-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-[var(--color-ink)] md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-md font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              {subtitle}
            </p>
          )}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="btn-outline h-10 w-10 px-0"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Siguiente"
            className="btn-outline h-10 w-10 px-0"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide md:gap-6 md:px-8"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[28%] lg:w-[22%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
