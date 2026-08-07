'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/schemas';

export default function RecuperarContrasenaClient() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token')?.trim() || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      setError('root', {
        message: 'Falta el enlace del email. Solicita uno nuevo.',
      });
      return;
    }
    try {
      await api.resetPassword({ token, password: values.password });
      router.push('/login');
    } catch (e) {
      setError('root', {
        message:
          e instanceof ApiError
            ? e.message
            : 'No se pudo actualizar la contraseña',
      });
    }
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
          Enlace inválido
        </h1>
        <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Este enlace no incluye un token. Solicita uno nuevo desde el login.
        </p>
        <Link href="/olvidaste-contrasena" className="btn-outline mt-8 inline-flex">
          Solicitar enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Nueva contraseña
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Elige una contraseña nueva para tu cuenta.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
        <div>
          <label className="field-label" htmlFor="password">
            Contraseña nueva
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="field-input"
            {...register('password')}
          />
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="field-input"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="field-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errors.root && <p className="field-error">{errors.root.message}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-outline w-full"
        >
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
