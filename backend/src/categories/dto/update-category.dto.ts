import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/** Todos los campos de CreateCategoryDto pasan a opcionales */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
