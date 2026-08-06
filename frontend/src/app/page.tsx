import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCarousel } from '@/components/products/ProductCarousel';

/**
 * Home — una sola composición en el primer viewport:
 * marca, headline, frase, CTA y foto a pantalla completa.
 */
export default async function HomePage() {
  let featured = { data: [] as Awaited<ReturnType<typeof api.getProducts>>['data'] };
  let categories: Awaited<ReturnType<typeof api.getCategories>> = [];

  try {
    [featured, categories] = await Promise.all([
      api.getProducts({ isFeatured: true, limit: 8 }),
      api.getCategories(),
    ]);
  } catch {
    // Si la API está caída, la home sigue renderizando el hero
  }

  // Fallback: si no hay destacados, mostramos el catálogo reciente
  if (!featured.data.length) {
    try {
      featured = await api.getProducts({ limit: 8 });
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <section className="hero relative flex min-h-[100svh] items-end overflow-hidden">
        {/* Plano visual full-bleed — posición enfocada en el corazón de manos */}
        <div
          className="hero-media absolute inset-0 bg-cover"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?auto=format&fit=crop&w=2200&q=85')",
          }}
          role="img"
          aria-label="Mamá gestante con las manos en forma de corazón sobre la pancita"
        />
        {/* Capas: calidez, viñeta y legibilidad del texto */}
        <div className="hero-tint absolute inset-0" aria-hidden />
        <div className="hero-vignette absolute inset-0" aria-hidden />
        <div className="hero-fade absolute inset-0" aria-hidden />

        <div className="relative z-10 w-full px-5 pb-14 pt-28 md:px-10 md:pb-24 md:pt-32">
          <p className="animate-fade-up font-[family-name:var(--font-display)] text-5xl tracking-[0.18em] text-[#f7f4f1] sm:text-5xl md:text-6xl lg:text-7xl">
            ALELUYA
          </p>
          <p className="animate-fade-up mt-3 font-[family-name:var(--font-body)] text-[12px] uppercase tracking-[0.38em] text-[#f7f4f1]/80">
            Maternity
          </p>
          <h1 className="animate-fade-up-delay mt-8 max-w-xl font-[family-name:var(--font-display)] text-[1.65rem] font-normal leading-snug tracking-[0.04em] text-[#f7f4f1] sm:text-2xl md:text-3xl">
            Vestidos y enterizos de fiesta para mamá
          </h1>
          <p className="animate-fade-up-delay mt-4 max-w-md font-[family-name:var(--font-body)] text-[0.95rem] leading-relaxed text-[#f7f4f1]/85 md:text-base">
            Colección 2026: vestidos cortos, 3/4, largos y enterizos maternos.
          </p>
          <div className="animate-fade-up-delay mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/productos"
              className="btn-outline btn-outline-light w-full sm:w-auto"
            >
              Ver colección
            </Link>
            <Link
              href="/productos?featured=1"
              className="inline-flex items-center justify-center px-2 py-3 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[#f7f4f1]/85 underline-offset-4 transition-colors hover:text-[#f7f4f1] hover:underline sm:px-4"
            >
              Destacados
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="border-b border-[var(--color-line)] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-[var(--color-ink)] md:text-4xl">
              Categorías
            </h2>
            <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
              Elige el momento que estás viviendo.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/productos?category=${cat.slug}`}
                    className="group block border-b border-[var(--color-line)] pb-4 transition-colors hover:border-[var(--color-rose)]"
                  >
                    <span className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)] group-hover:text-[var(--color-rose)]">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="mt-2 block font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
                        {cat.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <ProductCarousel
        products={featured.data}
        title="Selección"
        subtitle="Piezas que recomendamos esta temporada."
      />
    </>
  );
}
