import { ProductForm } from '@/components/admin/ProductForm';

export default function NuevoProductoPage() {
  return (
    <div>
      <h2 className="mb-8 font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-[var(--color-ink)]">
        Nuevo producto
      </h2>
      <ProductForm />
    </div>
  );
}
