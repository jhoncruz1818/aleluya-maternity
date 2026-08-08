'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  images: z
    .array(z.object({ url: z.string().min(5) }))
    .min(1, 'Agrega al menos una imagen'),
  variants: z
    .array(
      z.object({
        sku: z.string().optional(),
        size: z.string().min(1),
        color: z.string().min(1),
        stock: z.number().min(0),
      }),
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

const MAX_IMAGES = 12;

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token)!;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);

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
          images:
            product.images?.length > 0
              ? [...product.images]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((img) => ({ url: img.url }))
              : [],
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
          images: [],
          variants: [{ sku: '', size: 'S', color: '', stock: 10 }],
        },
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
    move: moveImage,
  } = useFieldArray({
    control,
    name: 'images',
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: 'variants',
  });

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => undefined);
  }, []);

  const onPickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setServerError(null);

    const remaining = MAX_IMAGES - imageFields.length;
    if (remaining <= 0) {
      setServerError(`Máximo ${MAX_IMAGES} imágenes por producto`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`"${file.name}" no es una imagen`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" supera 5 MB`);
        }
        const result = await api.uploadProductImage(token, file);
        appendImage({ url: result.url });
      }
    } catch (e) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo subir la imagen',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addUrlImage = () => {
    const url = urlDraft.trim();
    if (url.length < 5) {
      setServerError('Pega una URL válida');
      return;
    }
    if (imageFields.length >= MAX_IMAGES) {
      setServerError(`Máximo ${MAX_IMAGES} imágenes por producto`);
      return;
    }
    appendImage({ url });
    setUrlDraft('');
    setServerError(null);
  };

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
      images: values.images.map((img, index) => ({
        url: img.url,
        alt: values.name,
        sortOrder: index,
      })),
      variants: values.variants.map((v) => ({
        size: v.size,
        color: v.color,
        stock: v.stock,
        ...(v.sku?.trim() ? { sku: v.sku.trim() } : {}),
      })),
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
        <label className="field-label">
          Imágenes ({imageFields.length}/{MAX_IMAGES})
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => void onPickFiles(e.target.files)}
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={uploading || imageFields.length >= MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline disabled:opacity-40"
          >
            {uploading ? 'Subiendo…' : 'Agregar archivo'}
          </button>
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-ink-soft)]">
            Varias a la vez · la primera es portada · JPG/PNG/WEBP/GIF · máx. 5 MB
          </p>
        </div>

        {imageFields.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageFields.map((field, index) => (
              <li
                key={field.id}
                className="border border-[var(--color-line)] bg-[var(--color-stone)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={field.url}
                    alt={`Imagen ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 bg-[var(--color-ink)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-paper)]">
                      Portada
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveImage(index, index - 1)}
                      className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-soft)] disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={index === imageFields.length - 1}
                      onClick={() => moveImage(index, index + 1)}
                      className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-soft)] disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-rose)]"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)] underline-offset-4 hover:underline"
          onClick={() => setShowUrlField((v) => !v)}
        >
          {showUrlField ? 'Ocultar URL' : 'Agregar por URL'}
        </button>

        {showUrlField && (
          <div className="mt-2 flex gap-2">
            <input
              className="field-input"
              placeholder="https://…"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
            />
            <button type="button" className="btn-outline shrink-0" onClick={addUrlImage}>
              Añadir
            </button>
          </div>
        )}

        {errors.images && (
          <p className="field-error">{errors.images.message}</p>
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
              appendVariant({ sku: '', size: 'M', color: '', stock: 5 })
            }
          >
            + Variante
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {variantFields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-2 border border-[var(--color-line)] p-3 sm:grid-cols-5"
            >
              <input
                className="field-input"
                placeholder="SKU (opcional)"
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
                disabled={variantFields.length === 1}
                onClick={() => removeVariant(index)}
                className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-rose)] disabled:opacity-30"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {serverError && <p className="field-error">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="btn-outline"
      >
        {isSubmitting ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
  );
}
