import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Pagos Openpay Perú.
 *
 *   POST /api/payments/charge
 *   POST /api/payments/webhook/openpay   (público — Openpay notifica aquí)
 *   POST /api/payments/:orderId/sync     (cliente/admin — consulta cargo en Openpay)
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/openpay')
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
  @ApiOperation({
    summary: 'Último verification_code recibido (solo para activar el webhook)',
  })
  lastVerification() {
    return (
      this.paymentsService.getLastWebhookVerification() ?? {
        code: null,
        at: null,
      }
    );
  }

  @Post('charge')
  @UseGuards(JwtAuthGuard)
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
