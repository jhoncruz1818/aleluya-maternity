import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redirect 301: /productos?category={slug} → /categorias/{slug}
 * Conserva search, featured y page para no romper deep links.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname !== '/productos') {
    return NextResponse.next();
  }

  const category = searchParams.get('category')?.trim();
  if (!category) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/categorias/${category}`;
  url.searchParams.delete('category');

  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ['/productos'],
};
