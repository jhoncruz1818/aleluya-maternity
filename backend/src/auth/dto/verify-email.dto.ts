import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token del enlace de verificación' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;
}
