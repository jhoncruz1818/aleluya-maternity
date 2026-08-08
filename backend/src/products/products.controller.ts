import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

/**
 * Productos del catálogo.
 *
 * Públicos:
 *   GET /api/products
 *   GET /api/products/:idOrSlug
 *
 * Admin:
 *   GET    /api/products/admin/all
 *   POST   /api/products
 *   PATCH  /api/products/:id
 *   DELETE /api/products/:id   (soft-delete)
 */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo público (solo activos) con filtros' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query, false);
  }

  /**
   * Esta ruta va ANTES de :idOrSlug para que Nest no interprete
   * "admin" como un id/slug.
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los productos incl. inactivos (ADMIN)' })
  findAllAdmin(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query, true);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Detalle de producto incl. inactivo (ADMIN)' })
  findOneAdmin(@Param('id') id: string) {
    return this.productsService.findOne(id, true);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Detalle de producto por id o slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug, false);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear producto con imágenes y variantes (ADMIN)' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar producto (ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Eliminar producto definitivo (solo si no tiene pedidos/ventas) (ADMIN)',
  })
  hardRemove(@Param('id') id: string) {
    return this.productsService.hardDelete(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Soft-delete: desactiva el producto (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
