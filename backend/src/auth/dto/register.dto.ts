import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Datos de registro de un cliente nuevo.
 * class-validator valida el body ANTES de llegar al service
 * (gracias al ValidationPipe global en main.ts).
 */
export class RegisterDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'TuPasswordSegura1', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  // Al menos una letra y un número: evita contraseñas demasiado débiles
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir al menos una letra y un número',
  })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '999888777', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
