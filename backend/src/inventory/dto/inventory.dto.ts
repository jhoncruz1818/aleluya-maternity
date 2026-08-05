import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryInventoryDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, SKU, talla o color' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['all', 'low', 'ok', 'high'],
    description: 'Filtro por nivel de stock',
  })
  @IsOptional()
  @IsIn(['all', 'low', 'ok', 'high'])
  level?: 'all' | 'low' | 'ok' | 'high';
}

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    enum: ['PURCHASE', 'ADJUSTMENT', 'RETURN'],
    description: 'Por defecto PURCHASE (IN) o ADJUSTMENT (OUT)',
  })
  @IsOptional()
  @IsIn(['PURCHASE', 'ADJUSTMENT', 'RETURN'])
  reason?: 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';

  @ApiPropertyOptional({ example: 'Reposición proveedor marzo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class QueryMovementsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
