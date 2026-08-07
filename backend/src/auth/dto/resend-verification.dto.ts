import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;
}
