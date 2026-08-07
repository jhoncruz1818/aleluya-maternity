/**
 * URL pública del storefront (sitemap, robots, JSON-LD).
 * En Vercel: define NEXT_PUBLIC_SITE_URL=https://aleluya-maternity.vercel.app
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return 'http://localhost:3000';
}
