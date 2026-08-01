import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import {
  CreateProductDto,
  ProductImageInputDto,
  ProductVariantInputDto,
} from './create-product.dto';

/**
 * Update: campos base opcionales.
 * Si envías images o variants, reemplazan por completo las actuales
 * (más simple de razonar que un merge parcial).
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['images', 'variants'] as const),
) {
  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductVariantInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
