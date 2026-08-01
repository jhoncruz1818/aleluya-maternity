import { Role } from '../../common/constants/roles';

/**
 * Contenido que firmamos dentro del JWT.
 * Mantenerlo pequeño: el token viaja en cada request.
 */
export interface JwtPayload {
  /** userId (claim estándar "sub") */
  sub: string;
  email: string;
  role: Role;
}

/** Usuario seguro para respuestas HTTP (sin password) */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  createdAt: Date;
}
