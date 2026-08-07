import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;
}
