import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

function toBoolean({ value }: { value: unknown }) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

/**
 * Filtros del catálogo.
 * Los query params llegan como string; Transform los convierte a boolean.
 */
export class QueryProductsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ID o slug de categoría' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Buscar en nombre/descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Solo destacados' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description:
      'Solo ADMIN: filtrar por activo/inactivo. El catálogo público siempre ve activos.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
