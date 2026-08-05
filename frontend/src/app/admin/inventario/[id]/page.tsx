'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { InventoryMovementsResponse, StockLevel } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const PAGE_SIZE = 15;

const reasonLabel: Record<string, string> = {
  PURCHASE: 'Compra / reposición',
  SALE: 'Venta',
  ADJUSTMENT: 'Ajuste',
  INITIAL: 'Stock inicial',
  RETURN: 'Devolución',
};

const levelLabel: Record<StockLevel, string> = {
  low: 'Bajo',
  ok: 'Normal',
  high: 'Alto',
};

export default function AdminInventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const variantId = params.id;
  const token = useAuthStore((s) => s.token)!;

  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryMovementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getInventoryMovements(token, variantId, {
          page: pageNum,
          limit: PAGE_SIZE,
        });
        setData(res);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar');
      } finally {
        setLoading(false);
      }
    },
    [token, variantId],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createStockMovement(token, variantId, {
        type,
        quantity,
        reason: type === 'IN' ? 'PURCHASE' : 'ADJUSTMENT',
        note: note.trim() || undefined,
      });
      setQuantity(1);
      setNote('');
      await load(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  };

  const onUndo = async (movementId: string) => {
    const ok = window.confirm(
      '¿Anular este movimiento? Se revertirá el stock y quedará marcado en el historial (quién y cuándo), no se borra.',
    );
    if (!ok) return;

    setUndoingId(movementId);
    setError(null);
    try {
      await api.undoStockMovement(token, movementId);
      await load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo anular');
    } finally {
      setUndoingId(null);
    }
  };

  const onPurgeOne = async (movementId: string) => {
    const ok = window.confirm(
      '¿Eliminar este anulado del historial? Solo el dueño puede hacerlo. No se puede recuperar.',
    );
    if (!ok) return;

    setUndoingId(movementId);
    setError(null);
    try {
      await api.purgeStockMovement(token, movementId);
      await load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    } finally {
      setUndoingId(null);
    }
  };

  const onPurgeAllUndone = async () => {
    const count = data?.undoneCount ?? 0;
    const ok = window.confirm(
      `¿Eliminar los ${count} movimiento(s) anulado(s) de esta variante? Solo el dueño. No se puede recuperar.`,
    );
    if (!ok) return;

    setPurging(true);
    setError(null);
    try {
      await api.purgeAllUndoneMovements(token, variantId);
      await load(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo limpiar');
    } finally {
      setPurging(false);
    }
  };

  if (loading && !data) {
    return (
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Cargando…
      </p>
    );
  }

  if (!data) {
    return (
      <div>
        <p className="field-error">{error ?? 'Variante no encontrada'}</p>
        <Link href="/admin/inventario" className="mt-4 inline-block text-sm underline">
          Volver
        </Link>
      </div>
    );
  }

  const v = data.variant;
  const { meta } = data;
  const canPurge = Boolean(data.permissions?.canPurge);
  const undoneCount = data.undoneCount ?? 0;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/inventario"
        className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]"
      >
        ← Inventario
      </Link>

      <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        {v.product.name}
      </h2>
      <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        {v.sku} · {v.size} · {v.color} · Stock actual{' '}
        <strong className="text-[var(--color-ink)]">{v.stock}</strong> (
        {levelLabel[v.level]})
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 border border-[var(--color-line)] p-5"
      >
        <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          Registrar movimiento
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Tipo</label>
            <select
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}
            >
              <option value="IN">Entrada (+)</option>
              <option value="OUT">Salida (−)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Cantidad</label>
            <input
              type="number"
              min={1}
              className="field-input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="field-label">Nota (opcional)</label>
            <input
              className="field-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. reposición proveedor"
            />
          </div>
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={saving} className="btn-outline">
          {saving ? 'Guardando…' : 'Registrar'}
        </button>
      </form>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-[var(--color-ink)]">
            Historial
          </h3>
          <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
            {meta.total === 0
              ? 'Sin movimientos'
              : `Mostrando ${from}–${to} de ${meta.total}`}
            {undoneCount > 0 ? ` · ${undoneCount} anulado(s)` : ''}
          </p>
        </div>
        {canPurge && undoneCount > 0 && (
          <button
            type="button"
            disabled={purging || loading}
            onClick={() => void onPurgeAllUndone()}
            className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-rose)] disabled:opacity-40"
          >
            {purging ? 'Limpiando…' : 'Limpiar anulados'}
          </button>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Aún no hay movimientos. Las ventas y reposiciones aparecerán aquí.
        </p>
      ) : (
        <>
          <ul
            className={`mt-4 divide-y divide-[var(--color-line)] ${loading ? 'opacity-50' : ''}`}
          >
            {data.items.map((m) => {
              const isUndone = Boolean(m.undoneAt);
              const canUndo =
                !isUndone && m.reason !== 'SALE' && !m.orderId;
              return (
              <li
                key={m.id}
                className={`flex flex-wrap items-baseline justify-between gap-2 py-3 font-[family-name:var(--font-body)] text-sm ${
                  isUndone ? 'opacity-55' : ''
                }`}
              >
                <div>
                  <span
                    className={`${
                      m.type === 'IN'
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-rose)]'
                    } ${isUndone ? 'line-through' : ''}`}
                  >
                    {m.type === 'IN' ? '+' : '−'}
                    {m.quantity}
                  </span>
                  <span className="ml-2 text-[var(--color-ink-soft)]">
                    {reasonLabel[m.reason] ?? m.reason}
                  </span>
                  {isUndone && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-[var(--color-rose)]">
                      Anulado
                    </span>
                  )}
                  {m.note && (
                    <span className="ml-2 text-[var(--color-ink-soft)]">
                      · {m.note}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                    {m.previousStock} → {m.newStock}
                    {m.createdBy
                      ? ` · ${m.createdBy.firstName}`
                      : m.orderId
                        ? ' · pedido'
                        : ''}
                  </p>
                  {isUndone && m.undoneAt && (
                    <p className="mt-0.5 text-xs text-[var(--color-rose)]">
                      Anulado
                      {m.undoneBy ? ` por ${m.undoneBy.firstName}` : ''}
                      {' · '}
                      {new Date(m.undoneAt).toLocaleString('es-PE')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {canUndo && (
                    <button
                      type="button"
                      disabled={undoingId === m.id || loading}
                      onClick={() => void onUndo(m.id)}
                      className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-rose)] disabled:opacity-40"
                    >
                      {undoingId === m.id ? '…' : 'Anular'}
                    </button>
                  )}
                  {isUndone && canPurge && (
                    <button
                      type="button"
                      disabled={undoingId === m.id || loading}
                      onClick={() => void onPurgeOne(m.id)}
                      className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-soft)] disabled:opacity-40"
                    >
                      {undoingId === m.id ? '…' : 'Eliminar'}
                    </button>
                  )}
                  <time className="text-xs text-[var(--color-ink-soft)]">
                    {new Date(m.createdAt).toLocaleString('es-PE')}
                  </time>
                </div>
              </li>
              );
            })}
          </ul>

          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1)}
                className="btn-outline disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                Página {meta.page} de {meta.totalPages}
              </p>
              <button
                type="button"
                disabled={page >= meta.totalPages || loading}
                onClick={() => void load(page + 1)}
                className="btn-outline disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
