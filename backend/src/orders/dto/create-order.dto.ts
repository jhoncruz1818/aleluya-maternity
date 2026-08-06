import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID de la variante (talla/color)' })
  @IsString()
  variantId: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}

/**
 * Crear pedido a partir del "carrito" del frontend.
 * El carrito vive en el cliente (Zustand); aquí solo llega el snapshot.
 * El costo de envío se calcula en el servidor a partir de shippingMethod.
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'ID de una dirección propia del usuario' })
  @IsString()
  addressId: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    enum: ['standard', 'express'],
    default: 'standard',
    description: 'Método de envío (el monto lo calcula el servidor)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['standard', 'express'])
  shippingMethod?: 'standard' | 'express';

  @ApiPropertyOptional({ example: 'Dejar en recepción' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: 'ALELUYA10',
    description: 'Código promocional activo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoCode?: string;
}
