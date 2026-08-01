'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatPrice, type Product } from '@/lib/types';

/**
 * Tarjeta mínima del catálogo: sin sombra ni borde pesado.
 * Client component para poder hacer fallback si la imagen falla.
 */
export function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  const price = product.discountPrice ?? product.price;
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-stone)]">
          {image?.url && !imgError ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              unoptimized={
                image.url.includes('ejemplo.com') ||
                !image.url.includes('images.unsplash.com')
              }
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-3xl tracking-[0.2em] text-[var(--color-ink)]/20">
              L
            </div>
          )}
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-[family-name:var(--font-body)] text-sm tracking-wide text-[var(--color-ink)]">
            {product.name}
          </h3>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            {formatPrice(price)}
            {product.discountPrice != null && (
              <span className="ml-2 line-through opacity-50">
                {formatPrice(product.price)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
