import Link from 'next/link';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/products/ProductCard';

export const metadata: Metadata = {
  title: 'Colección',
  description:
    'Explora la colección Aleluya Maternity: vestidos cortos, largos y enterizos maternos. Filtra por categoría y encuentra tu look.',
  openGraph: {
    title: 'Colección · Aleluya Maternity',
    description:
      'Catálogo de vestidos y enterizos para mamá. Compra online.',
    type: 'website',
  },
};

type SearchParams = Promise<{
  search?: string;
  featured?: string;
  page?: string;
}>;

/**
 * Catálogo con filtros por categoría y buscador.
 * Server Component: pide datos a NestJS en cada request (revalidate 60s).
 */
export default async function ProductosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;

  let categories: Awaited<ReturnType<typeof api.getCategories>> = [];
  let products: Awaited<ReturnType<typeof api.getProducts>> = {
    data: [],
    meta: { total: 0, page: 1, limit: 12, totalPages: 1 },
  };
  let error: string | null = null;

  try {
    [categories, products] = await Promise.all([
      api.getCategories(),
      api.getProducts({
        search: params.search,
        isFeatured: params.featured === '1' ? true : undefined,
        page,
        limit: 12,
      }),
    ]);
  } catch {
    error = 'No pudimos cargar el catálogo. ¿Está corriendo el backend?';
  }

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = {
      search: params.search,
      featured: params.featured,
      page: undefined as string | undefined,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    const qs = q.toString();
    return qs ? `/productos?${qs}` : '/productos';
  };

  return (
    <div className="pt-24 md:pt-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <header className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
            Colección
          </h1>
          <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)] md:text-base">
            Explora por categoría o busca por nombre.
          </p>
        </header>

        {/* Buscador: form GET nativo (sin JS) */}
        <form
          action="/productos"
          method="get"
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {params.featured && (
            <input type="hidden" name="featured" value={params.featured} />
          )}
          <input
            type="search"
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="Buscar…"
            className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none transition-colors focus:border-[var(--color-ink)] sm:max-w-sm"
          />
          <button type="submit" className="btn-outline self-start">
            Buscar
          </button>
        </form>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          <Link
            href="/productos"
            className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]"
          >
            Todas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {error && (
          <p className="mt-16 font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}

        {!error && products.data.length === 0 && (
          <p className="mt-16 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            No hay productos con estos filtros.
          </p>
        )}

        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.meta.totalPages > 1 && (
          <nav className="mt-16 flex items-center justify-center gap-4 pb-20">
            {page > 1 && (
              <Link
                href={buildHref({ page: String(page - 1) })}
                className="btn-outline"
              >
                Anterior
              </Link>
            )}
            <span className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              {page} / {products.meta.totalPages}
            </span>
            {page < products.meta.totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="btn-outline"
              >
                Siguiente
              </Link>
            )}
          </nav>
        )}

        {!error && products.meta.totalPages <= 1 && <div className="pb-20" />}
      </div>
    </div>
  );
}
