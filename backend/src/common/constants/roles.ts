/**
 * Valores de rol permitidos en la columna User.role (String en SQL Server).
 * Los guardamos aquí (no en un enum de Prisma) para reutilizarlos en guards y DTOs.
 */
export const Role = {
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
