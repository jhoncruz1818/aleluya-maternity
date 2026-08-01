import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Premamá' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    example: 'premama',
    description: 'Si no se envía, se genera desde el nombre',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'Ropa cómoda para el embarazo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
