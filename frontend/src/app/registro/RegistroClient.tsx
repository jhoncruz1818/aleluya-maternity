'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import { registerSchema, type RegisterValues } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';
import { safeNextPath } from '@/lib/safe-next';

export default function RegistroClient() {
  const router = useRouter();
  const search = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      const res = await api.register(values);
      setSession(res.accessToken, res.user);
      router.push(safeNextPath(search.get('next')));
    } catch (e) {
      setError('root', {
        message: e instanceof ApiError ? e.message : 'No se pudo registrar',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Crear cuenta
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Regístrate para comprar y seguir tus pedidos.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="firstName">
              Nombre
            </label>
            <input id="firstName" className="field-input" {...register('firstName')} />
            {errors.firstName && (
              <p className="field-error">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">
              Apellido
            </label>
            <input id="lastName" className="field-input" {...register('lastName')} />
            {errors.lastName && (
              <p className="field-error">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="field-input" {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="phone">
            Teléfono (opcional)
          </label>
          <input id="phone" className="field-input" {...register('phone')} />
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="field-input"
            {...register('password')}
          />
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </div>

        {errors.root && <p className="field-error">{errors.root.message}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-outline w-full">
          {isSubmitting ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[var(--color-ink)] underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
