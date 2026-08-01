'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProductImage } from '@/lib/types';

/** Galería simple: imagen principal + miniaturas */
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [active, setActive] = useState(0);
  const [imgError, setImgError] = useState(false);
  const current = sorted[active];

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-stone)]">
        {current && !imgError ? (
          <Image
            src={current.url}
            alt={current.alt ?? productName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            unoptimized={
              current.url.includes('ejemplo.com') ||
              !current.url.includes('images.unsplash.com')
            }
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-5xl tracking-[0.25em] text-[var(--color-ink)]/15">
            ALELUYA
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {sorted.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setActive(index);
                setImgError(false);
              }}
              className={`relative h-20 w-16 shrink-0 overflow-hidden border ${
                index === active
                  ? 'border-[var(--color-ink)]'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${productName} ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized={
                  img.url.includes('ejemplo.com') ||
                  !img.url.includes('images.unsplash.com')
                }
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
