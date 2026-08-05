import type { NextConfig } from 'next';

/**
 * Hosts permitidos para next/image.
 * En producción define NEXT_PUBLIC_API_HOST=tu-api.ejemplo.com
 */
function apiUploadPatterns(): NonNullable<
  NextConfig['images']
>['remotePatterns'] {
  const host = (process.env.NEXT_PUBLIC_API_HOST || '').trim();
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
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
      ...apiUploadPatterns(),
    ],
  },
};

export default nextConfig;
