import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-line)] bg-[var(--color-stone)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-3 md:px-8 md:py-20">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-[0.2em] text-[var(--color-ink)]">
            ALELUYA
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
            Maternity
          </p>
          <p className="mt-4 max-w-xs font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Vestidos y enterizos de fiesta para mamá. Colección 2026.
          </p>
        </div>

        <div>
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
            Explorar
          </p>
          <ul className="mt-4 space-y-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            <li>
              <Link href="/productos" className="hover:text-[var(--color-ink)]">
                Colección
              </Link>
            </li>
            <li>
              <Link
                href="/categorias/vestidos-cortos"
                className="hover:text-[var(--color-ink)]"
              >
                Vestidos cortos
              </Link>
            </li>
            <li>
              <Link
                href="/categorias/vestidos-largos"
                className="hover:text-[var(--color-ink)]"
              >
                Vestidos largos
              </Link>
            </li>
            <li>
              <Link
                href="/categorias/enterizos-maternos"
                className="hover:text-[var(--color-ink)]"
              >
                Enterizos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
            Contacto
          </p>
          <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Aleluya Maternity
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
            Lima, Perú
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] px-5 py-5 text-center font-[family-name:var(--font-body)] text-[11px] tracking-[0.12em] text-[var(--color-ink-soft)] md:px-8">
        © {new Date().getFullYear()} Aleluya Maternity
      </div>
    </footer>
  );
}
