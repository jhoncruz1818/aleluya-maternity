import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Casa' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiProperty({ example: 'Av. Larco 123, Dpto 401' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: 'Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: 'Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  state: string;

  @ApiProperty({ example: '15074' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ example: 'PE', default: 'PE' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si es true, se desmarca cualquier otra dirección por defecto',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
