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
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Cierra el menú al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Bloquea scroll del body con el menú abierto
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const isHome = pathname === '/';
  const solid = scrolled || !isHome || menuOpen;
  const overHero = isHome && !solid;

  const navTone = overHero
    ? 'text-[#f7f4f1]/85 hover:text-[#f7f4f1]'
    : 'text-[var(--color-ink)]/70 hover:text-[var(--color-ink)]';
  const brandTone = overHero
    ? 'text-[#f7f4f1]'
    : 'text-[var(--color-ink)]';
  const iconTone = overHero
    ? 'text-[#f7f4f1]/85 hover:text-[#f7f4f1]'
    : 'text-[var(--color-ink)]/70 hover:text-[var(--color-ink)]';

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid
          ? 'bg-[var(--color-cream)]/95 backdrop-blur-md border-b border-[var(--color-line)]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-8">
        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] transition-colors ${navTone}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className={`relative z-[60] flex h-10 w-10 items-center justify-center md:hidden ${iconTone}`}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">{menuOpen ? 'Cerrar' : 'Menú'}</span>
          <span className="flex h-4 w-5 flex-col justify-between" aria-hidden>
            <span
              className={`block h-[1.5px] w-full origin-center bg-current transition-transform duration-300 ${
                menuOpen ? 'translate-y-[7px] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-[1.5px] w-full bg-current transition-opacity duration-200 ${
                menuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block h-[1.5px] w-full origin-center bg-current transition-transform duration-300 ${
                menuOpen ? '-translate-y-[7px] -rotate-45' : ''
              }`}
            />
          </span>
        </button>

        <Link
          href="/"
          onClick={closeMenu}
          className={`absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-display)] text-2xl tracking-[0.28em] transition-colors md:text-[1.65rem] ${brandTone}`}
        >
          ALELUYA
        </Link>

        <div className="ml-auto flex items-center gap-3 md:gap-6">
          {mounted && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] transition-colors md:inline ${navTone}`}
            >
              Admin
            </Link>
          )}
          {mounted && user ? (
            <button
              type="button"
              onClick={logout}
              className={`hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] transition-colors md:inline ${navTone}`}
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              className={`hidden font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] transition-colors md:inline ${navTone}`}
            >
              Entrar
            </Link>
          )}
          <div className={overHero ? '[&_button]:text-[#f7f4f1]/85 [&_button:hover]:text-[#f7f4f1]' : ''}>
            <ThemeToggle />
          </div>
          <Link
            href="/carrito"
            onClick={closeMenu}
            className={`font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.18em] transition-colors ${
              overHero ? 'text-[#f7f4f1]' : 'text-[var(--color-ink)]'
            }`}
            aria-label="Carrito"
          >
            Bolsa{mounted && totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={`md:hidden overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-cream)] transition-[max-height,opacity] duration-300 ease-out ${
          menuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <nav className="flex flex-col px-5 py-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="border-b border-[var(--color-line)] py-4 font-[family-name:var(--font-display)] text-2xl tracking-[0.1em] text-[var(--color-ink)]"
            >
              {link.label}
            </Link>
          ))}

          {mounted && user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={closeMenu}
              className="border-b border-[var(--color-line)] py-4 font-[family-name:var(--font-display)] text-2xl tracking-[0.1em] text-[var(--color-ink)]"
            >
              Admin
            </Link>
          )}

          {mounted && user ? (
            <button
              type="button"
              onClick={() => {
                logout();
                closeMenu();
              }}
              className="border-b border-[var(--color-line)] py-4 text-left font-[family-name:var(--font-display)] text-2xl tracking-[0.1em] text-[var(--color-ink)]"
            >
              Salir
            </button>
          ) : (
            <Link
              href="/login"
              onClick={closeMenu}
              className="border-b border-[var(--color-line)] py-4 font-[family-name:var(--font-display)] text-2xl tracking-[0.1em] text-[var(--color-ink)]"
            >
              Entrar
            </Link>
          )}

          <Link
            href="/carrito"
            onClick={closeMenu}
            className="mt-6 inline-flex items-center justify-center border border-[var(--color-ink)] px-6 py-3.5 font-[family-name:var(--font-body)] text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink)]"
          >
            Ver bolsa{mounted && totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
        </nav>
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 top-16 z-[-1] bg-black/35 md:hidden"
          aria-label="Cerrar menú"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
