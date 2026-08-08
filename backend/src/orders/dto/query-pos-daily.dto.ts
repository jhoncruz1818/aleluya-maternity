import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Caja del día (ventas STORE / cash).
 * date en formato YYYY-MM-DD, zona América/Lima.
 */
export class QueryPosDailyDto {
  @ApiPropertyOptional({
    example: '2026-08-07',
    description: 'Día en Lima (YYYY-MM-DD). Default: hoy.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe ser YYYY-MM-DD',
  })
  date?: string;
}
