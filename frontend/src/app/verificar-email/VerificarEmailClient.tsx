'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export default function VerificarEmailClient() {
  const search = useSearchParams();
  const token = search.get('token')?.trim() || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmando tu email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el enlace del correo. Solicita uno nuevo.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.verifyEmail({ token });
        if (cancelled) return;
        setStatus('ok');
        setMessage(res.message);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          e instanceof ApiError
            ? e.message
            : 'No se pudo confirmar el email',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        {status === 'ok'
          ? 'Email confirmado'
          : status === 'error'
            ? 'No se pudo confirmar'
            : 'Verificando…'}
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        {message}
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        {status === 'ok' && (
          <Link href="/login" className="btn-outline inline-flex">
            Entrar
          </Link>
        )}
        {status === 'error' && (
          <>
            <Link href="/reenviar-confirmacion" className="btn-outline inline-flex">
              Reenviar confirmación
            </Link>
            <Link
              href="/login"
              className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)] underline-offset-4 hover:underline"
            >
              Ir al login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
