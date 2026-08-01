import { Suspense } from 'react';
import RegistroClient from './RegistroClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 pt-28 text-sm text-[var(--color-ink-soft)]">
          Cargando…
        </div>
      }
    >
      <RegistroClient />
    </Suspense>
  );
}
