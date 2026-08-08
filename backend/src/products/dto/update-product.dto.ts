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
 * images: si se envían, reemplazan las actuales.
 * variants: se sincronizan por SKU (update/create); no se borran si ya tienen ventas.
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
