'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth en localStorage (Zustand persist).
 *
 * Riesgo: cualquier script XSS en la página podría leer el JWT.
 * En producción ideal: cookie httpOnly desde un BFF/API route de Next.
 * Para aprender el flujo completo, localStorage es más simple de razonar.
 */

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => Boolean(get().token),
    }),
    { name: 'lunaria-auth' },
  ),
);
