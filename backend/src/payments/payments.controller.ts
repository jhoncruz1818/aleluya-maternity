import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Pagos Openpay Perú.
 *
 *   POST /api/payments/charge
 *   POST /api/payments/webhook/openpay   (Openpay + Basic Auth)
 *   POST /api/payments/:orderId/sync
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook/openpay')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Webhook Openpay (verification + charge.succeeded). Configurar en dashboard.',
  })
  openpayWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ) {
    return this.paymentsService.handleOpenpayWebhook(body ?? {}, authorization);
  }

  @Get('webhook/openpay/last-verification')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiHeader({
    name: 'x-webhook-setup-secret',
    required: true,
    description: 'Mismo valor que WEBHOOK_SETUP_SECRET',
  })
  @ApiOperation({
    summary:
      'Último verification_code (protegido; solo para activar el webhook)',
  })
  lastVerification(
    @Headers('x-webhook-setup-secret') setupSecret?: string,
  ) {
    const expected = this.config.get<string>('WEBHOOK_SETUP_SECRET')?.trim();
    if (!expected || !setupSecret || setupSecret !== expected) {
      throw new UnauthorizedException('Setup secret inválido');
    }
    return (
      this.paymentsService.getLastWebhookVerification() ?? {
        code: null,
        at: null,
      }
    );
  }

  @Post('charge')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear cargo Openpay (tarjeta o Yape/tienda)' })
  createCharge(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.paymentsService.createCharge(userId, dto);
  }

  @Post(':orderId/sync')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Sincronizar estado del cargo con Openpay (no simula; solo lee COMPLETED)',
  })
  syncCharge(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.syncChargeStatus(
      orderId,
      userId,
      role === Role.ADMIN,
    );
  }
}
