import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePromoCodeDto {
  @ApiProperty({ example: 'ALELUYA10' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Solo letras, números, guion y guion bajo',
  })
  code: string;

  @ApiProperty({ enum: ['PERCENT', 'FIXED'], example: 'PERCENT' })
  @IsIn(['PERCENT', 'FIXED'])
  type: 'PERCENT' | 'FIXED';

  @ApiProperty({
    example: 10,
    description: 'Porcentaje (1-100) o monto fijo en soles',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @ValidateIf((o: CreatePromoCodeDto) => o.type === 'PERCENT')
  @Max(100)
  value: number;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-08-31T23:59:59.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Máximo de usos; omitir = ilimitado',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Subtotal mínimo (PEN) para aplicar',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;
}
