/**
 * Convierte un nombre en slug URL-friendly.
 * Ej: "Blusa Premamá Rosa" → "blusa-premama-rosa"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
