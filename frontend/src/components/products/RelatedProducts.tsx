import { api } from '@/lib/api';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';

const TARGET_MIN = 4;
const TARGET_MAX = 6;

function excludeAndDedupe(
  pool: Product[],
  excludeId: string,
  already: Product[],
): Product[] {
  const seen = new Set(already.map((p) => p.id));
  seen.add(excludeId);
  return pool.filter((p) => !seen.has(p.id));
}

async function loadRelatedProducts(product: Product): Promise<Product[]> {
  const selected: Product[] = [];

  try {
    if (product.category?.slug || product.categoryId) {
      const sameCat = await api.getProducts({
        category: product.category?.slug,
        page: 1,
        limit: 12,
      });
      selected.push(
        ...excludeAndDedupe(sameCat.data, product.id, selected).slice(
          0,
          TARGET_MAX,
        ),
      );
    }

    if (selected.length < TARGET_MIN) {
      const featured = await api.getProducts({
        isFeatured: true,
        page: 1,
        limit: 12,
      });
      selected.push(
        ...excludeAndDedupe(featured.data, product.id, selected).slice(
          0,
          TARGET_MAX - selected.length,
        ),
      );
    }

    if (selected.length < TARGET_MIN) {
      const recent = await api.getProducts({ page: 1, limit: 12 });
      selected.push(
        ...excludeAndDedupe(recent.data, product.id, selected).slice(
          0,
          TARGET_MAX - selected.length,
        ),
      );
    }
  } catch {
    return selected.slice(0, TARGET_MAX);
  }

  return selected.slice(0, TARGET_MAX);
}

/**
 * Productos de la misma categoría (o fallback destacados/recientes).
 * Usa ProductCard con Link real hacia cada PDP.
 */
export async function RelatedProducts({ product }: { product: Product }) {
  const related = await loadRelatedProducts(product);
  if (related.length === 0) return null;

  return (
    <section className="border-t border-[var(--color-line)] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <header className="max-w-xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-[var(--color-ink)] md:text-4xl">
            También te puede interesar
          </h2>
          <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Más piezas de la colección para completar tu look.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
