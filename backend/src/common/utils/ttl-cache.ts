/**
 * Cache en memoria con TTL (por proceso Railway).
 * Suficiente para aliviar latencia Azure SQL en lecturas públicas.
 */
export class TtlCache {
  private readonly store = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();

  get<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Borra claves que empiezan con el prefijo (ej. "products:"). */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/** Caches compartidos del proceso. */
export const productsCache = new TtlCache();
export const categoriesCache = new TtlCache();

export const PUBLIC_LIST_TTL_MS = 60_000;
export const PUBLIC_DETAIL_TTL_MS = 60_000;
