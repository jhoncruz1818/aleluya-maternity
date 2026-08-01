'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { ProductForm } from '@/components/admin/ProductForm';

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token)!;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProductAdmin(token, params.id)
      .then(setProduct)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      );
  }, [token, params.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!product) {
    return (
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Cargando…
      </p>
    );
  }

  return (
    <div>
      <h2 className="mb-8 font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        Editar producto
      </h2>
      <ProductForm product={product} />
    </div>
  );
}
