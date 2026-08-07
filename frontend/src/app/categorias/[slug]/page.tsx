import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/products/ProductCard';
import { getSiteUrl } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

async function loadCategory(slug: string) {
  const categories = await api.getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let category: Awaited<ReturnType<typeof loadCategory>> = null;
  try {
    category = await loadCategory(slug);
  } catch {
    return { title: 'Categoría' };
  }

  if (!category) {
    return { title: 'Categoría no encontrada' };
  }

  const description =
    category.description?.trim() ||
    `Explora ${category.name} en Aleluya Maternity: vestidos y enterizos maternos. Compra online.`;

  return {
    title: category.name,
    description: description.slice(0, 160),
    openGraph: {
      title: `${category.name} · Aleluya Maternity`,
      description: description.slice(0, 160),
      type: 'website',
    },
  };
}

/**
 * Catálogo por categoría en ruta canónica /categorias/[slug].
 */
export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Number(query.page ?? 1) || 1;

  let category: Awaited<ReturnType<typeof loadCategory>> = null;
  try {
    category = await loadCategory(slug);
  } catch {
    notFound();
  }
  if (!category) notFound();

  let products: Awaited<ReturnType<typeof api.getProducts>> = {
    data: [],
    meta: { total: 0, page: 1, limit: 12, totalPages: 1 },
  };
  let error: string | null = null;

  try {
    products = await api.getProducts({
      category: slug,
      search: query.search,
      page,
      limit: 12,
    });
  } catch {
    error = 'No pudimos cargar los productos de esta categoría.';
  }

  const site = getSiteUrl();
  const pageUrl = `${site}/categorias/${encodeURIComponent(category.slug)}`;
  const description =
    category.description?.trim() ||
    `Productos de la categoría ${category.name} en Aleluya Maternity.`;

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Aleluya Maternity',
      url: site,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.meta.total,
      itemListElement: products.data.map((product, index) => ({
        '@type': 'ListItem',
        position: (page - 1) * 12 + index + 1,
        url: `${site}/productos/${encodeURIComponent(product.slug)}`,
        name: product.name,
      })),
    },
  };

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = {
      search: query.search,
      page: undefined as string | undefined,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    const qs = q.toString();
    return qs
      ? `/categorias/${category.slug}?${qs}`
      : `/categorias/${category.slug}`;
  };

  return (
    <div className="pt-24 md:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <nav className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          <Link href="/productos" className="hover:text-[var(--color-ink)]">
            Colección
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">{category.name}</span>
        </nav>

        <header className="mt-6 max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)] md:text-5xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)] md:text-base">
              {category.description}
            </p>
          )}
        </header>

        <form
          action={`/categorias/${category.slug}`}
          method="get"
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="search"
            name="search"
            defaultValue={query.search ?? ''}
            placeholder="Buscar en esta categoría…"
            className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 font-[family-name:var(--font-body)] text-sm outline-none transition-colors focus:border-[var(--color-ink)] sm:max-w-sm"
          />
          <button type="submit" className="btn-outline self-start">
            Buscar
          </button>
        </form>

        {error && (
          <p className="mt-16 font-[family-name:var(--font-body)] text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}

        {!error && products.data.length === 0 && (
          <p className="mt-16 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            No hay productos en esta categoría.
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
