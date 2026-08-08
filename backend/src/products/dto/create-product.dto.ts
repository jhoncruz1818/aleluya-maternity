import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductImageInputDto {
  @ApiProperty({ example: 'https://cdn.ejemplo.com/blusa.jpg' })
  @IsString()
  @MinLength(5)
  url: string;

  @ApiPropertyOptional({ example: 'Blusa premamá rosa' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  alt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class ProductVariantInputDto {
  @ApiPropertyOptional({
    example: 'BLU-PRE-S-ROSA',
    description: 'Opcional. Si no se envía, el sistema genera uno interno.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @ApiProperty({ example: 'S' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  size: string;

  @ApiProperty({ example: 'Rosa' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  color: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Blusa Premamá Rosa' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'blusa-premama-rosa',
    description: 'Si no se envía, se genera desde el nombre',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @ApiProperty({ example: 'Tela suave y elástica, ideal para el segundo trimestre.' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 89.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 69.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ description: 'ID de la categoría' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiProperty({ type: [ProductVariantInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'El producto necesita al menos una variante' })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants: ProductVariantInputDto[];
}
