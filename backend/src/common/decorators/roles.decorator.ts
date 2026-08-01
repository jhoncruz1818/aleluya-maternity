import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles';

/** Clave interna que RolesGuard lee con Reflector */
export const ROLES_KEY = 'roles';

/**
 * @Roles(Role.ADMIN) — marca una ruta como solo para ciertos roles.
 * Se combina con JwtAuthGuard + RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
