import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { getSiteUrl } from '@/lib/site';

async function allActiveProductSlugs(): Promise<
  Array<{ slug: string; updatedAt?: string }>
> {
  const slugs: Array<{ slug: string; updatedAt?: string }> = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await api.getProducts({ page, limit: 100 });
    for (const p of res.data) {
      slugs.push({
        slug: p.slug,
        updatedAt: p.updatedAt,
      });
    }
    totalPages = res.meta.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: site,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${site}/productos`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const [categories, products] = await Promise.all([
      api.getCategories(),
      allActiveProductSlugs(),
    ]);

    for (const cat of categories) {
      entries.push({
        url: `${site}/categorias/${encodeURIComponent(cat.slug)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const p of products) {
      entries.push({
        url: `${site}/productos/${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // Si la API no responde en build, al menos quedan home + catálogo
  }

  return entries;
}
