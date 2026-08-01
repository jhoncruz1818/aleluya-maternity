import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Cargo Openpay:
 * - method "card": requiere openpayToken + deviceSessionId
 * - method "store": Yape/Kashio, solo deviceSessionId (pedido queda pendiente)
 */
export class CreateChargeDto {
  @ApiProperty({ description: 'ID del pedido a pagar' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['card', 'store'], example: 'card' })
  @IsIn(['card', 'store'])
  method: 'card' | 'store';

  @ApiProperty({
    description: 'device_session_id de OpenPay.deviceData.setup()',
  })
  @IsString()
  @MinLength(8)
  deviceSessionId: string;

  @ApiPropertyOptional({
    description: 'Token de tarjeta (OpenPay.token.create) — obligatorio si method=card',
  })
  @ValidateIf((o: CreateChargeDto) => o.method === 'card')
  @IsString()
  @MinLength(10)
  openpayToken?: string;
}
