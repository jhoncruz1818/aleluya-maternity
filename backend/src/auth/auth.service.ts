import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthUser, JwtPayload } from './types/jwt-payload';
import { Role } from '../common/constants/roles';

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const GENERIC_FORGOT_MESSAGE =
  'Si existe una cuenta verificada con ese email, enviamos un enlace para restablecer la contraseña.';

const GENERIC_RESEND_VERIFY_MESSAGE =
  'Si hay un registro pendiente con ese email, enviamos un nuevo enlace de confirmación.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * No crea User hasta que confirmen el email.
   * Guarda PendingRegistration + envía enlace; si el mail falla, no queda nada.
   */
  async register(dto: RegisterDto) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'El registro por email no está disponible ahora. Contacta a la tienda.',
      );
    }

    await this.purgeUnverifiedUsers();
    await this.purgeExpiredPending();

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!existing.emailVerifiedAt) {
        await this.prisma.user.delete({ where: { id: existing.id } }).catch(() => undefined);
      } else {
        throw new ConflictException('Ya existe una cuenta con ese email');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await this.prisma.pendingRegistration.deleteMany({ where: { email } });

    const pending = await this.prisma.pendingRegistration.create({
      data: {
        email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        tokenHash,
        expiresAt,
      },
    });

    const verifyUrl = `${this.frontendBase()}/verificar-email?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mail.sendEmailVerification(email, verifyUrl);
    } catch (err) {
      this.logger.error(
        `No se pudo enviar confirmación a ${email}: ${String(err)}`,
      );
      await this.prisma.pendingRegistration
        .delete({ where: { id: pending.id } })
        .catch(() => undefined);

      throw new BadRequestException(
        'No pudimos enviar el correo de confirmación. Revisa que el email esté bien escrito o inténtalo de nuevo en unos minutos.',
      );
    }

    return {
      message:
        'Te enviamos un email para confirmar tu correo. Debes verificarlo antes de iniciar sesión.',
      email,
      requiresEmailVerification: true,
    };
  }

  async login(dto: LoginDto) {
    await this.purgeUnverifiedUsers();

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

    if (!user.emailVerifiedAt) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw new UnauthorizedException(
        'Debes confirmar tu email antes de entrar. Si te registraste hace poco, revisa tu bandeja o vuelve a registrarte.',
      );
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

  async verifyEmail(dto: VerifyEmailDto) {
    await this.purgeExpiredPending();
    await this.purgeUnverifiedUsers();

    const tokenHash = this.hashToken(dto.token.trim());

    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { tokenHash },
    });

    if (pending) {
      if (pending.expiresAt.getTime() < Date.now()) {
        await this.prisma.pendingRegistration
          .delete({ where: { id: pending.id } })
          .catch(() => undefined);
        throw new BadRequestException(
          'El enlace no es válido o ya expiró. Solicita uno nuevo.',
        );
      }

      const already = await this.prisma.user.findUnique({
        where: { email: pending.email },
      });
      if (already?.emailVerifiedAt) {
        await this.prisma.pendingRegistration.delete({ where: { id: pending.id } });
        return {
          message: 'Tu email ya estaba confirmado. Ya puedes iniciar sesión.',
        };
      }
      if (already && !already.emailVerifiedAt) {
        await this.prisma.user.delete({ where: { id: already.id } });
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: pending.email,
            password: pending.password,
            firstName: pending.firstName,
            lastName: pending.lastName,
            phone: pending.phone,
            role: Role.CLIENT,
            emailVerifiedAt: new Date(),
          },
        });
        await tx.pendingRegistration.delete({ where: { id: pending.id } });
      });

      return {
        message: 'Email confirmado. Ya puedes iniciar sesión.',
      };
    }

    // Compatibilidad: tokens viejos ligados a User (antes del cambio)
    const legacy = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!legacy || legacy.usedAt || legacy.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      );
    }

    if (!legacy.user.emailVerifiedAt) {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: legacy.userId },
          data: { emailVerifiedAt: new Date() },
        });
        await tx.emailVerificationToken.update({
          where: { id: legacy.id },
          data: { usedAt: new Date() },
        });
      });
    } else {
      await this.prisma.emailVerificationToken.update({
        where: { id: legacy.id },
        data: { usedAt: new Date() },
      });
    }

    return {
      message: 'Email confirmado. Ya puedes iniciar sesión.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    await this.purgeExpiredPending();
    await this.purgeUnverifiedUsers();

    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.emailVerifiedAt) {
      return { message: GENERIC_RESEND_VERIFY_MESSAGE };
    }

    if (user && !user.emailVerifiedAt) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    }

    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { email },
    });

    if (!pending) {
      return { message: GENERIC_RESEND_VERIFY_MESSAGE };
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'El envío de email no está configurado. Contacta a la tienda.',
      );
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    try {
      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { tokenHash, expiresAt },
      });
      const verifyUrl = `${this.frontendBase()}/verificar-email?token=${encodeURIComponent(rawToken)}`;
      await this.mail.sendEmailVerification(email, verifyUrl);
    } catch (err) {
      this.logger.error(`Reenviar verificación falló: ${String(err)}`);
      throw new ServiceUnavailableException(
        'No se pudo enviar el email. Intenta más tarde.',
      );
    }

    return { message: GENERIC_RESEND_VERIFY_MESSAGE };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.emailVerifiedAt) {
      return { message: GENERIC_FORGOT_MESSAGE };
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'El envío de email no está configurado. Contacta a la tienda.',
      );
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.frontendBase();
    const resetUrl = `${frontendUrl}/recuperar-contrasena?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mail.sendPasswordReset(user.email, resetUrl);
    } catch (err) {
      this.logger.error(`Fallo al enviar reset a ${user.email}: ${String(err)}`);
      throw new ServiceUnavailableException(
        'No se pudo enviar el email. Intenta más tarde o contacta a la tienda.',
      );
    }

    return { message: GENERIC_FORGOT_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token.trim());
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      });
    });

    return {
      message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
    };
  }

  /** Borra User sin email confirmado (no deben existir tras el nuevo flujo). */
  private async purgeUnverifiedUsers() {
    const result = await this.prisma.user.deleteMany({
      where: { emailVerifiedAt: null },
    });
    if (result.count > 0) {
      this.logger.warn(`Eliminadas ${result.count} cuentas sin email confirmado`);
    }
  }

  private async purgeExpiredPending() {
    await this.prisma.pendingRegistration.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private frontendBase() {
    return (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async signToken(userId: string, email: string, role: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as Role,
    };

    return this.jwtService.signAsync(payload);
  }
}
