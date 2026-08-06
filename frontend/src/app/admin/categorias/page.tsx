'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

export default function AdminCategoriasPage() {
  const token = useAuthStore((s) => s.token);
  const [list, setList] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setList(await api.getCategories());
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudieron cargar categorías',
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setEditingId(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (editingId) {
        await api.updateCategory(token, editingId, body);
      } else {
        await api.createCategory(token, body);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description ?? '');
    setError(null);
  };

  const remove = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.deleteCategory(token, id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        Categorías
      </h2>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Crea y edita las categorías del catálogo. Luego podrás elegirlas al
        crear productos.
      </p>

      {error && <p className="mt-4 field-error">{error}</p>}

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-4 border border-[var(--color-line)] p-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            {editingId ? 'Editar categoría' : 'Nueva categoría'}
          </p>
        </div>
        <div>
          <label className="field-label">Nombre</label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vestidos cortos"
            required
            minLength={2}
            maxLength={80}
          />
        </div>
        <div>
          <label className="field-label">Slug (opcional)</label>
          <input
            className="field-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="vestidos-cortos"
            maxLength={100}
          />
          <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
            Si lo dejas vacío, se genera desde el nombre.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Descripción (opcional)</label>
          <textarea
            className="field-input min-h-[88px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ropa cómoda para el embarazo"
            maxLength={500}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
          <button type="submit" disabled={busy} className="btn-outline">
            {busy
              ? 'Guardando…'
              : editingId
                ? 'Guardar cambios'
                : 'Crear categoría'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <ul className="mt-10 space-y-4">
        {list.length === 0 && (
          <li className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Aún no hay categorías. Crea la primera arriba.
          </li>
        )}
        {list.map((cat) => (
          <li
            key={cat.id}
            className="border border-[var(--color-line)] px-4 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6"
          >
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-[var(--color-ink)]">
                {cat.name}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                /{cat.slug}
                {cat._count?.products != null
                  ? ` · ${cat._count.products} producto${cat._count.products === 1 ? '' : 's'}`
                  : ''}
              </p>
              {cat.description && (
                <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                  {cat.description}
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-4 sm:mt-0">
              <button
                type="button"
                onClick={() => startEdit(cat)}
                className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => remove(cat.id)}
                className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-rose)]"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
