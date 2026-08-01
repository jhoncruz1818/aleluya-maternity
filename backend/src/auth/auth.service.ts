import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtPayload } from './types/jwt-payload';
import { Role } from '../common/constants/roles';

/** Cuántas rondas de salt: más = más seguro, pero más lento al registrar/login */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Crea un cliente nuevo.
   * ¿Por qué hashear con bcrypt? Si alguien robara la BD, no vería contraseñas en claro.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      // ConflictException → HTTP 409 (email ya registrado)
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.CLIENT, // Nadie se registra como ADMIN desde el frontend público
      },
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

    const accessToken = await this.signToken(user.id, user.email, user.role);

    return {
      user: user as AuthUser,
      accessToken,
    };
  }

  /**
   * Login: comparamos el hash guardado con la contraseña enviada.
   * Mensaje genérico a propósito: no revelamos si falló el email o la clave
   * (evita que un atacante descubra emails registrados).
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const safeUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };

    const accessToken = await this.signToken(user.id, user.email, user.role);

    return {
      user: safeUser,
      accessToken,
    };
  }

  /** Firma un JWT con los claims mínimos necesarios */
  private async signToken(userId: string, email: string, role: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as Role,
    };

    return this.jwtService.signAsync(payload);
  }
}
