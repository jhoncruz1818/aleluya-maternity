'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatPrice, type PromoCode } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
  };
}

export default function AdminCuponesPage() {
  const token = useAuthStore((s) => s.token);
  const [list, setList] = useState<PromoCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const range = defaultRange();

  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState('10');
  const [startsAt, setStartsAt] = useState(range.startsAt);
  const [endsAt, setEndsAt] = useState(range.endsAt);
  const [maxUses, setMaxUses] = useState('');
  const [minOrder, setMinOrder] = useState('');

  const load = async () => {
    if (!token) return;
    try {
      setList(await api.getPromoCodes(token));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar cupones');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.createPromoCode(token, {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        isActive: true,
        maxUses: maxUses ? Number(maxUses) : undefined,
        minOrderAmount: minOrder ? Number(minOrder) : undefined,
      });
      setCode('');
      setValue(type === 'PERCENT' ? '10' : '20');
      setMaxUses('');
      setMinOrder('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (promo: PromoCode) => {
    if (!token) return;
    try {
      await api.updatePromoCode(token, promo.id, {
        isActive: !promo.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Eliminar este cupón?')) return;
    try {
      await api.deletePromoCode(token, id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        Cupones
      </h2>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Crea descuentos por porcentaje o monto fijo, con fechas de vigencia.
      </p>

      {error && <p className="mt-4 field-error">{error}</p>}

      <form
        onSubmit={onCreate}
        className="mt-8 grid gap-4 border border-[var(--color-line)] p-5 sm:grid-cols-2"
      >
        <div>
          <label className="field-label">Código</label>
          <input
            className="field-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ALELUYA10"
            required
            minLength={3}
          />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <select
            className="field-input"
            value={type}
            onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}
          >
            <option value="PERCENT">Porcentaje (%)</option>
            <option value="FIXED">Monto fijo (S/.)</option>
          </select>
        </div>
        <div>
          <label className="field-label">
            {type === 'PERCENT' ? 'Porcentaje' : 'Monto en soles'}
          </label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0.01"
            max={type === 'PERCENT' ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Pedido mínimo (opcional)</label>
          <input
            className="field-input"
            type="number"
            step="0.01"
            min="0"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="Ej: 100"
          />
        </div>
        <div>
          <label className="field-label">Inicio</label>
          <input
            className="field-input"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Fin</label>
          <input
            className="field-input"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Máx. usos (opcional)</label>
          <input
            className="field-input"
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Ilimitado"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn-outline">
            {busy ? 'Guardando…' : 'Crear cupón'}
          </button>
        </div>
      </form>

      <ul className="mt-10 space-y-4">
        {list.length === 0 && (
          <li className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Aún no hay cupones.
          </li>
        )}
        {list.map((promo) => {
          const now = Date.now();
          const start = new Date(promo.startsAt).getTime();
          const end = new Date(promo.endsAt).getTime();
          const status =
            !promo.isActive
              ? 'Pausado'
              : now < start
                ? 'Próximo'
                : now > end
                  ? 'Vencido'
                  : 'Vigente';

          return (
            <li
              key={promo.id}
              className="border border-[var(--color-line)] px-4 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6"
            >
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-[var(--color-ink)]">
                  {promo.code}
                </p>
                <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                  {promo.type === 'PERCENT'
                    ? `${Number(promo.value)}% de descuento`
                    : `${formatPrice(promo.value)} de descuento`}
                  {promo.minOrderAmount
                    ? ` · mín. ${formatPrice(promo.minOrderAmount)}`
                    : ''}
                </p>
                <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  {new Date(promo.startsAt).toLocaleString('es-PE')} →{' '}
                  {new Date(promo.endsAt).toLocaleString('es-PE')}
                </p>
                <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
                  Usos: {promo.usedCount}
                  {promo.maxUses != null ? ` / ${promo.maxUses}` : ' · ilimitado'}{' '}
                  · {status}
                </p>
              </div>
              <div className="mt-4 flex gap-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => toggleActive(promo)}
                  className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                >
                  {promo.isActive ? 'Pausar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(promo.id)}
                  className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-rose)]"
                >
                  Eliminar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
