'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import { loginSchema, type LoginValues } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';
import { safeNextPath } from '@/lib/safe-next';

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const res = await api.login(values);
      setSession(res.accessToken, res.user);
      router.push(safeNextPath(search.get('next')));
    } catch (e) {
      setError('root', {
        message: e instanceof ApiError ? e.message : 'No se pudo iniciar sesión',
      });
    }
  };

  const nextQs = (() => {
    const next = search.get('next');
    if (!next) return '';
    const safe = safeNextPath(next, '');
    return safe ? `?next=${encodeURIComponent(safe)}` : '';
  })();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Entrar
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Accede para finalizar tu compra y ver tus pedidos.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="field-input"
            {...register('email')}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="field-input"
            {...register('password')}
          />
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </div>

        {errors.root && <p className="field-error">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-outline w-full">
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        ¿No tienes cuenta?{' '}
        <Link
          href={`/registro${nextQs}`}
          className="text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          Crear una
        </Link>
      </p>
    </div>
  );
}
