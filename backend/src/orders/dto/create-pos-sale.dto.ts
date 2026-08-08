import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';

/**
 * Venta presencial en efectivo (ADMIN).
 * Crea pedido STORE + Payment cash APPROVED + descuenta stock SALE.
 */
export class CreatePosSaleDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'Cliente mostrador' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
