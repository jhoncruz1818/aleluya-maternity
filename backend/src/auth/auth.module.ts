import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule: registra Passport + JWT y expone AuthService
 * por si otros módulos (users, orders) necesitan firmar/verificar tokens.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // registerAsync: lee JWT_SECRET y JWT_EXPIRES_IN desde .env
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // StringValue tipa valores como "7d", "24h" (paquete `ms` que usa jsonwebtoken)
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
