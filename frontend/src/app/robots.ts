import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/checkout',
          '/carrito',
          '/mi-cuenta',
          '/login',
          '/registro',
          '/olvidaste-contrasena',
          '/recuperar-contrasena',
          '/verificar-email',
          '/reenviar-confirmacion',
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
