import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 pt-28 text-sm text-[var(--color-ink-soft)]">
          Cargando…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
