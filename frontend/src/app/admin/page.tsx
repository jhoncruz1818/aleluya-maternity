import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Link
        href="/admin/productos"
        className="border border-[var(--color-line)] p-8 transition-colors hover:border-[var(--color-ink)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Productos
        </h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Crear, editar y desactivar productos del catálogo.
        </p>
      </Link>
      <Link
        href="/admin/categorias"
        className="border border-[var(--color-line)] p-8 transition-colors hover:border-[var(--color-ink)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Categorías
        </h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Organiza el catálogo: vestidos, enterizos, etc.
        </p>
      </Link>
      <Link
        href="/admin/pedidos"
        className="border border-[var(--color-line)] p-8 transition-colors hover:border-[var(--color-ink)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Pedidos
        </h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Ver pedidos y actualizar su estado.
        </p>
      </Link>
      <Link
        href="/admin/inventario"
        className="border border-[var(--color-line)] p-8 transition-colors hover:border-[var(--color-ink)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Inventario
        </h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Stock bajo/alto, entradas, salidas e historial por variante.
        </p>
      </Link>
      <Link
        href="/admin/cupones"
        className="border border-[var(--color-line)] p-8 transition-colors hover:border-[var(--color-ink)]"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
          Cupones
        </h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Códigos de descuento por % o soles, con vigencia.
        </p>
      </Link>
    </div>
  );
}
