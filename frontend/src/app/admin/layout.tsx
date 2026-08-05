'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

const nav = [
  { href: '/admin', label: 'Resumen', exact: true },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/inventario', label: 'Inventario' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/cupones', label: 'Cupones' },
];

/**
 * Layout del panel admin: solo role === ADMIN.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token || !user) {
      router.replace('/login?next=/admin');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    setAllowed(true);
  }, [mounted, token, user, router]);

  if (!mounted || !allowed) {
    return (
      <div className="mx-auto max-w-5xl px-5 pt-28 pb-16 font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
        Verificando acceso…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pt-28 pb-20 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] pb-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
            Panel
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-[var(--color-ink)] md:text-4xl">
            Admin
          </h1>
        </div>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-ink-soft)]">
          {user?.firstName} · {user?.email}
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-5">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] ${
                active
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Ver tienda
        </Link>
      </nav>

      <div className="mt-10">{children}</div>
    </div>
  );
}
