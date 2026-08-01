import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'TuPasswordSegura1' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  password: string;
}
