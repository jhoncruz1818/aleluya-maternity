'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type Product } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

export default function AdminProductosPage() {
  const token = useAuthStore((s) => s.token)!;
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getProductsAdmin(token, { limit: 50 });
      setProducts(res.data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const softDelete = async (id: string) => {
    if (!confirm('¿Desactivar este producto? Dejará de verse en la tienda.'))
      return;
    setBusyId(id);
    try {
      await api.deleteProduct(token, id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo desactivar');
    } finally {
      setBusyId(null);
    }
  };

  const hardDelete = async (id: string) => {
    if (
      !confirm(
        '¿Eliminar este producto de forma permanente? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await api.hardDeleteProduct(token, id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Productos
        </h2>
        <Link href="/admin/productos/nuevo" className="btn-outline">
          Nuevo producto
        </Link>
      </div>

      {error && <p className="mt-4 field-error">{error}</p>}

      <ul className="mt-8 divide-y divide-[var(--color-line)]">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
                {p.name}{' '}
                {!p.isActive && (
                  <span className="text-[var(--color-ink-soft)]">(inactivo)</span>
                )}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                {p.slug} · {formatPrice(p.discountPrice ?? p.price)} ·{' '}
                {p.variants?.length ?? 0} variantes
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href={`/admin/productos/${p.id}`}
                className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                Editar
              </Link>
              {p.canDelete ? (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => hardDelete(p.id)}
                  className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-rose)] disabled:opacity-40"
                >
                  Eliminar
                </button>
              ) : (
                p.isActive && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => softDelete(p.id)}
                    className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-rose)] disabled:opacity-40"
                  >
                    Desactivar
                  </button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>

      {products.length === 0 && !error && (
        <p className="mt-8 text-sm text-[var(--color-ink-soft)]">
          No hay productos. Crea el primero.
        </p>
      )}
    </div>
  );
}
