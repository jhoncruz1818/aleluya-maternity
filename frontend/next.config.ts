import type { NextConfig } from 'next';

/**
 * Hosts permitidos para next/image.
 * En producción define NEXT_PUBLIC_API_HOST=tu-api.ejemplo.com
 */
type RemotePattern = NonNullable<
  NonNullable<NextConfig['images']>['remotePatterns']
>[number];

function apiUploadPatterns(): RemotePattern[] {
  const host = (process.env.NEXT_PUBLIC_API_HOST || '').trim();
  const patterns: RemotePattern[] = [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '3001',
      pathname: '/uploads/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '3001',
      pathname: '/uploads/**',
    },
  ];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    patterns.push({
      protocol: 'https',
      hostname: host,
      pathname: '/uploads/**',
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.ejemplo.com' },
      // Cloudflare R2 — URL pública de desarrollo del bucket
      {
        protocol: 'https',
        hostname: 'pub-3226721356514ef592bfae8dd2203189.r2.dev',
        pathname: '/**',
      },
      ...apiUploadPatterns(),
    ],
  },
};

export default nextConfig;
