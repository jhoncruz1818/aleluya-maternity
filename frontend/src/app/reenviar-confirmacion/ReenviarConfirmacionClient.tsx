'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/schemas';

export default function ReenviarConfirmacionClient() {
  const search = useSearchParams();
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: search.get('email') ?? '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      const res = await api.resendVerification(values);
      setDoneMessage(res.message);
    } catch (e) {
      setError('root', {
        message:
          e instanceof ApiError
            ? e.message
            : 'No se pudo reenviar el correo',
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Reenviar confirmación
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Si tu cuenta aún no está activada, te enviamos otro enlace.
      </p>

      {doneMessage ? (
        <div className="mt-10 space-y-6">
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink)]">
            {doneMessage}
          </p>
          <Link href="/login" className="btn-outline inline-flex">
            Ir a entrar
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
            {isSubmitting ? 'Enviando…' : 'Reenviar enlace'}
          </button>
        </form>
      )}
    </div>
  );
}
