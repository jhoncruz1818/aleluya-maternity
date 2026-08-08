import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/types';
import { ProductGallery } from '@/components/products/ProductGallery';
import { AddToCartPanel } from '@/components/products/AddToCartPanel';
import { RelatedProducts } from '@/components/products/RelatedProducts';
import { getSiteUrl } from '@/lib/site';

/** Stock fresco: no cachear la página de producto. */
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

async function loadProduct(slug: string) {
  try {
    return await api.getProduct(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * SEO: título, descripción e imagen Open Graph por producto.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return { title: 'Producto no encontrado' };
  }

  const description = product.description.slice(0, 160);
  const image = product.images?.[0]?.url;

  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} · Aleluya Maternity`,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  const price = Number(product.discountPrice ?? product.price);
  const stockTotal = (product.variants ?? []).reduce(
    (sum, v) => sum + (v.stock ?? 0),
    0,
  );
  const inStock = stockTotal > 0;
  const site = getSiteUrl();
  const productUrl = `${site}/productos/${encodeURIComponent(product.slug)}`;
  const images = (product.images ?? []).map((img) => img.url).filter(Boolean);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: images.length ? images : undefined,
    sku: product.variants?.[0]?.sku,
    brand: {
      '@type': 'Brand',
      name: 'Aleluya Maternity',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'PEN',
      price: price.toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <div className="pt-24 md:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 md:grid-cols-2 md:gap-14 md:px-8 lg:gap-20">
        <ProductGallery
          images={product.images ?? []}
          productName={product.name}
        />

        <div className="flex flex-col md:pt-4">
          <nav className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
            <Link href="/productos" className="hover:text-[var(--color-ink)]">
              Colección
            </Link>
            {product.category && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/categorias/${product.category.slug}`}
                  className="hover:text-[var(--color-ink)]"
                >
                  {product.category.name}
                </Link>
              </>
            )}
          </nav>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl tracking-[0.06em] text-[var(--color-ink)] md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-4 font-[family-name:var(--font-body)] text-lg text-[var(--color-ink)]">
            {formatPrice(price)}
            {product.discountPrice != null && (
              <span className="ml-3 text-base text-[var(--color-ink-soft)] line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </p>

          <p className="mt-6 max-w-md font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--color-ink-soft)] md:text-[0.95rem]">
            {product.description}
          </p>

          <div className="mt-10 border-t border-[var(--color-line)] pt-10">
            <AddToCartPanel product={product} />
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <RelatedProducts product={product} />
      </Suspense>
    </div>
  );
}
