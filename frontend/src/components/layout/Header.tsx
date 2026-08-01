'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const links = [
  { href: '/productos', label: 'Colección' },
  { href: '/productos?featured=1', label: 'Destacados' },
  { href: '/mi-cuenta/pedidos', label: 'Mi cuenta' },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = pathname === '/';
  const solid = scrolled || !isHome;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? 'bg-[var(--color-cream)]/90 backdrop-blur-md border-b border-[var(--color-line)]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8">
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]/70 transition-colors hover:text-[var(--color-ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-display)] text-2xl tracking-[0.28em] text-[var(--color-ink)] md:text-[1.65rem]"
        >
          ALELUYA
        </Link>

        <div className="ml-auto flex items-center gap-4 md:gap-6">
          {mounted && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]/70 transition-colors hover:text-[var(--color-ink)] sm:inline"
            >
              Admin
            </Link>
          )}
          {mounted && user ? (
            <button
              type="button"
              onClick={logout}
              className="hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]/70 transition-colors hover:text-[var(--color-ink)] sm:inline"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]/70 transition-colors hover:text-[var(--color-ink)] sm:inline"
            >
              Entrar
            </Link>
          )}
          <ThemeToggle />
          <Link
            href="/carrito"
            className="font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]"
            aria-label="Carrito"
          >
            Bolsa{mounted && totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
        </div>
      </div>
    </header>
  );
}
