'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/schemas';
import { useState } from 'react';

export default function OlvidasteContrasenaClient() {
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      const res = await api.forgotPassword(values);
      setDoneMessage(res.message);
    } catch (e) {
      setError('root', {
        message:
          e instanceof ApiError
            ? e.message
            : 'No se pudo enviar el correo. Intenta más tarde.',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Recuperar contraseña
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Te enviaremos un enlace a tu email para elegir una contraseña nueva.
      </p>

      {doneMessage ? (
        <div className="mt-10 space-y-6">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
            {doneMessage}
          </p>
          <Link href="/login" className="btn-outline inline-flex">
            Volver a entrar
          </Link>
        </div>
      ) : (
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
            {errors.email && (
              <p className="field-error">{errors.email.message}</p>
            )}
          </div>

          {errors.root && <p className="field-error">{errors.root.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-outline w-full"
          >
            {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}

      <p className="mt-8 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        <Link
          href="/login"
          className="text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          Volver al login
        </Link>
      </p>
    </div>
  );
}
