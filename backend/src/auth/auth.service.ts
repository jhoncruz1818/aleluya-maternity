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
  'Si existe una cuenta pendiente con ese email, enviamos un nuevo enlace de confirmación.';

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
   * Crea cuenta solo si el email de confirmación se puede enviar.
   * Si Resend falla, se elimina el usuario (no quedan cuentas fantasma).
   */
  async register(dto: RegisterDto) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'El registro por email no está disponible ahora. Contacta a la tienda.',
      );
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.CLIENT,
        emailVerifiedAt: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    try {
      await this.issueAndSendVerification(user.id, user.email);
    } catch (err) {
      this.logger.error(
        `No se pudo verificar email ${user.email}: ${String(err)}`,
      );
      // Rollback: sin email entregable no hay cuenta
      await this.prisma.user
        .delete({ where: { id: user.id } })
        .catch(() => undefined);

      const detail = String(err);
      if (
        /only send testing emails to your own email/i.test(detail) ||
        /verify a domain/i.test(detail)
      ) {
        throw new BadRequestException(
          'En pruebas solo podemos enviar el correo de confirmación a jhoncopo1818@hotmail.com. Para otros emails hay que verificar un dominio en Resend.',
        );
      }

      throw new BadRequestException(
        'El correo no existe o no se puede usar. Revisa que esté bien escrito.',
      );
    }

    return {
      message:
        'Te enviamos un email para confirmar tu correo. Debes verificarlo antes de iniciar sesión.',
      email: user.email,
      requiresEmailVerification: true,
    };
  }

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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Debes confirmar tu email antes de entrar. Revisa tu bandeja o reenvía el enlace.',
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
    const tokenHash = this.hashToken(dto.token.trim());
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      );
    }

    if (record.user.emailVerifiedAt) {
      await this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return { message: 'Tu email ya estaba confirmado. Ya puedes iniciar sesión.' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      await tx.emailVerificationToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      });
    });

    return {
      message: 'Email confirmado. Ya puedes iniciar sesión.',
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerifiedAt) {
      return { message: GENERIC_RESEND_VERIFY_MESSAGE };
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'El envío de email no está configurado. Contacta a la tienda.',
      );
    }

    try {
      await this.issueAndSendVerification(user.id, user.email);
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

    // Solo cuentas verificadas pueden recuperar (evita spam a emails ajenos)
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

  private async issueAndSendVerification(userId: string, email: string) {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const verifyUrl = `${this.frontendBase()}/verificar-email?token=${encodeURIComponent(rawToken)}`;
    await this.mail.sendEmailVerification(email, verifyUrl);
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
