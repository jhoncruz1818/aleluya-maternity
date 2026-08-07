'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { registerSchema, type RegisterValues } from '@/lib/schemas';

export default function RegistroClient() {
  const search = useSearchParams();
  const [doneEmail, setDoneEmail] = useState<string | null>(null);
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
      setDoneEmail(res.email);
    } catch (e) {
      setError('root', {
        message: e instanceof ApiError ? e.message : 'No se pudo registrar',
      });
    }
  };

  if (doneEmail) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
          Revisa tu email
        </h1>
        <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          Enviamos un enlace a <strong>{doneEmail}</strong> para confirmar que
          el correo es tuyo. Sin eso no podrás iniciar sesión ni recuperar la
          contraseña.
        </p>
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          ¿No llegó?{' '}
          <Link
            href={`/reenviar-confirmacion?email=${encodeURIComponent(doneEmail)}`}
            className="text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Reenviar confirmación
          </Link>
        </p>
        <Link href="/login" className="btn-outline mt-8 inline-flex">
          Ir a entrar
        </Link>
      </div>
    );
  }

  const nextHint = search.get('next');

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 pt-28 pb-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] text-[var(--color-ink)]">
        Crear cuenta
      </h1>
      <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Usa un email real: te enviaremos un enlace para activar la cuenta
        {nextHint ? ' y luego podrás continuar tu compra.' : '.'}
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
