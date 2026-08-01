'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import type { Category, Product } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().min(10),
  price: z.number().min(0),
  discountPrice: z.number().min(0).nullable().optional(),
  categoryId: z.string().min(1, 'Elige categoría'),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  imageUrl: z.string().min(5, 'URL de imagen'),
  variants: z
    .array(
      z.object({
        sku: z.string().min(3),
        size: z.string().min(1),
        color: z.string().min(1),
        stock: z.number().min(0),
      }),
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token)!;
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: Number(product.price),
          discountPrice:
            product.discountPrice != null
              ? Number(product.discountPrice)
              : null,
          categoryId: product.categoryId,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          imageUrl: product.images?.[0]?.url ?? '',
          variants: product.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: v.stock,
          })),
        }
      : {
          name: '',
          description: '',
          price: 0,
          discountPrice: null,
          categoryId: '',
          isFeatured: false,
          isActive: true,
          imageUrl: '',
          variants: [{ sku: '', size: 'S', color: '', stock: 10 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => undefined);
  }, []);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const body = {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description,
      price: values.price,
      discountPrice:
        values.discountPrice === null || values.discountPrice === undefined
          ? undefined
          : Number(values.discountPrice),
      categoryId: values.categoryId,
      isFeatured: values.isFeatured,
      isActive: values.isActive,
      images: [{ url: values.imageUrl, alt: values.name }],
      variants: values.variants,
    };

    try {
      if (product) {
        await api.updateProduct(token, product.id, body);
      } else {
        await api.createProduct(token, body);
      }
      router.push('/admin/productos');
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Error al guardar');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <div>
        <label className="field-label">Nombre</label>
        <input className="field-input" {...register('name')} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="field-label">Slug (opcional)</label>
        <input className="field-input" {...register('slug')} />
      </div>

      <div>
        <label className="field-label">Descripción</label>
        <textarea rows={4} className="field-input" {...register('description')} />
        {errors.description && (
          <p className="field-error">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Precio</label>
          <input
            type="number"
            step="0.01"
            className="field-input"
            {...register('price', { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="field-label">Precio dto. (opcional)</label>
          <input
            type="number"
            step="0.01"
            className="field-input"
            {...register('discountPrice', {
              setValueAs: (v) =>
                v === '' || v === null || Number.isNaN(Number(v))
                  ? null
                  : Number(v),
            })}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Categoría</label>
        <select className="field-input" {...register('categoryId')}>
          <option value="">Selecciona…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="field-error">{errors.categoryId.message}</p>
        )}
      </div>

      <div>
        <label className="field-label">URL imagen</label>
        <input
          className="field-input"
          placeholder="https://images.unsplash.com/..."
          {...register('imageUrl')}
        />
        {errors.imageUrl && (
          <p className="field-error">{errors.imageUrl.message}</p>
        )}
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 font-[family-name:var(--font-body)] text-sm">
          <input type="checkbox" {...register('isFeatured')} /> Destacado
        </label>
        <label className="flex items-center gap-2 font-[family-name:var(--font-body)] text-sm">
          <input type="checkbox" {...register('isActive')} /> Activo
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="field-label mb-0">Variantes</p>
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]"
            onClick={() =>
              append({ sku: '', size: 'M', color: '', stock: 5 })
            }
          >
            + Variante
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-2 border border-[var(--color-line)] p-3 sm:grid-cols-5"
            >
              <input
                className="field-input"
                placeholder="SKU"
                {...register(`variants.${index}.sku`)}
              />
              <input
                className="field-input"
                placeholder="Talla"
                {...register(`variants.${index}.size`)}
              />
              <input
                className="field-input"
                placeholder="Color"
                {...register(`variants.${index}.color`)}
              />
              <input
                type="number"
                className="field-input"
                placeholder="Stock"
                {...register(`variants.${index}.stock`, { valueAsNumber: true })}
              />
              <button
                type="button"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-rose)] disabled:opacity-30"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {serverError && <p className="field-error">{serverError}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-outline">
        {isSubmitting ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
  );
}
