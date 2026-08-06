/**
 * Evita open redirect: solo rutas relativas internas (empiezan con / y no //).
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = '/',
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\') || /[\u0000-\u001F]/.test(trimmed)) return fallback;
  try {
    const url = new URL(trimmed, 'https://example.invalid');
    if (url.origin !== 'https://example.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
