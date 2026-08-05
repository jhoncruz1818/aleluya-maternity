'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { InventoryItem, InventoryListResponse, StockLevel } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const levelLabel: Record<StockLevel, string> = {
  low: 'Bajo',
  ok: 'Normal',
  high: 'Alto',
};

const levelClass: Record<StockLevel, string> = {
  low: 'text-[var(--color-rose)]',
  ok: 'text-[var(--color-ink-soft)]',
  high: 'text-[var(--color-ink)]',
};

export default function AdminInventoryPage() {
  const token = useAuthStore((s) => s.token)!;
  const [level, setLevel] = useState<'all' | StockLevel>('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<InventoryListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInventory(token, {
        level: level === 'all' ? undefined : level,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar inventario');
    } finally {
      setLoading(false);
    }
  }, [token, level, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
            Inventario
          </h2>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Stock por variante · bajo ≤{data?.summary.lowThreshold ?? 5} · alto ≥
            {data?.summary.highThreshold ?? 50}
          </p>
        </div>
      </div>

      {data && (
        <div className="mt-6 flex flex-wrap gap-4 font-[family-name:var(--font-body)] text-sm">
          <button
            type="button"
            onClick={() => setLevel('all')}
            className={level === 'all' ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}
          >
            Todos ({data.summary.total})
          </button>
          <button
            type="button"
            onClick={() => setLevel('low')}
            className={level === 'low' ? 'text-[var(--color-rose)]' : 'text-[var(--color-ink-soft)]'}
          >
            Bajo ({data.summary.low})
          </button>
          <button
            type="button"
            onClick={() => setLevel('ok')}
            className={level === 'ok' ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}
          >
            Normal ({data.summary.ok})
          </button>
          <button
            type="button"
            onClick={() => setLevel('high')}
            className={level === 'high' ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}
          >
            Alto ({data.summary.high})
          </button>
        </div>
      )}

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="field-input"
          placeholder="Buscar producto, SKU, talla, color…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-outline shrink-0">
          Buscar
        </button>
      </form>

      {error && <p className="field-error mt-4">{error}</p>}
      {loading && (
        <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Cargando…
        </p>
      )}

      {!loading && data && data.items.length === 0 && (
        <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          No hay variantes con ese filtro.
        </p>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left font-[family-name:var(--font-body)] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                <th className="pb-3 pr-3 font-normal">Producto</th>
                <th className="pb-3 pr-3 font-normal">SKU</th>
                <th className="pb-3 pr-3 font-normal">Talla</th>
                <th className="pb-3 pr-3 font-normal">Color</th>
                <th className="pb-3 pr-3 font-normal">Stock</th>
                <th className="pb-3 pr-3 font-normal">Nivel</th>
                <th className="pb-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((row: InventoryItem) => (
                <tr key={row.id} className="border-b border-[var(--color-line)]">
                  <td className="py-3 pr-3 text-[var(--color-ink)]">{row.product.name}</td>
                  <td className="py-3 pr-3 text-[var(--color-ink-soft)]">{row.sku}</td>
                  <td className="py-3 pr-3">{row.size}</td>
                  <td className="py-3 pr-3">{row.color}</td>
                  <td className="py-3 pr-3 font-medium">{row.stock}</td>
                  <td className={`py-3 pr-3 ${levelClass[row.level]}`}>
                    {levelLabel[row.level]}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/inventario/${row.id}`}
                      className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    >
                      Historial
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
