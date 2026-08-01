import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Producto no encontrado
      </h1>
      <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Puede que ya no esté disponible en la colección.
      </p>
      <Link href="/productos" className="btn-outline mt-8">
        Volver a la colección
      </Link>
    </div>
  );
}
