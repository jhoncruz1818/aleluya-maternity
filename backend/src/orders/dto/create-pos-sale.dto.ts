import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';
import { POS_PAYMENT_METHODS } from '../../common/constants/order-status';

/**
 * Venta presencial (ADMIN).
 * Pedido STORE + Payment APPROVED + descuenta stock SALE.
 */
export class CreatePosSaleDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    enum: POS_PAYMENT_METHODS,
    example: 'cash',
    description: 'cash | yape (Yape/Plin) | card | transfer',
  })
  @IsString()
  @IsIn(POS_PAYMENT_METHODS, {
    message: 'Tipo de pago inválido (cash, yape, card o transfer)',
  })
  paymentMethod: (typeof POS_PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    example: 10,
    description: 'Descuento en soles (prenda dañada, cortesía, etc.)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'Cliente mostrador / mancha en costura' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
