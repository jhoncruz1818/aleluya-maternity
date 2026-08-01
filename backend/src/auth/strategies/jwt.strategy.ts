import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload';
import { Role } from '../../common/constants/roles';

/**
 * JwtStrategy: Passport valida el Bearer token en cada request protegida.
 *
 * Flujo:
 * 1) Extrae el token del header Authorization: Bearer <token>
 * 2) Verifica la firma con JWT_SECRET
 * 3) validate() recibe el payload y carga el usuario actual de la BD
 *    (así un token viejo no sirve si borraste la cuenta)
 * 4) El objeto devuelto se guarda en request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o token inválido');
    }

    // request.user tendrá esta forma (incluye sub para @CurrentUser('sub'))
    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role as Role,
      createdAt: user.createdAt,
    };
  }
}
