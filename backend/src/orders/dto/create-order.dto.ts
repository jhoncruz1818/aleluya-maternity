import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID de la variante (talla/color)' })
  @IsString()
  variantId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Crear pedido a partir del "carrito" del frontend.
 * El carrito vive en el cliente (Zustand); aquí solo llega el snapshot.
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

  @ApiPropertyOptional({ example: 15, description: 'Costo de envío (PEN)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost?: number;

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
