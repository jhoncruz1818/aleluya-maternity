import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: 15, description: 'Costo de envío (PEN)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost?: number;
}
