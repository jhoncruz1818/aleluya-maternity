import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Actualización parcial del perfil.
 * Todos los campos son opcionales: solo se actualiza lo que envíes.
 * El email NO se cambia aquí (evitaría conflictos y problemas de identidad).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
