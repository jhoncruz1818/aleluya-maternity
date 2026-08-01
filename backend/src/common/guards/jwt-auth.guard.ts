import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Activa la estrategia 'jwt' de Passport.
 * Si el Bearer token falta o es inválido → 401 Unauthorized.
 *
 * Uso: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
