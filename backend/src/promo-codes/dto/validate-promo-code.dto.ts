import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class ValidatePromoCodeDto {
  @ApiProperty({ example: 'ALELUYA10' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ example: 150, description: 'Subtotal del carrito (PEN)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({
    enum: ['standard', 'express'],
    description: 'Método de envío (el monto lo calcula el servidor)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['standard', 'express'])
  shippingMethod?: 'standard' | 'express';
}
