import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { slugify } from '../common/utils/slugify';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import {
  StockMoveReason,
  StockMoveType,
} from '../common/constants/stock';
import { InventoryService } from '../inventory/inventory.service';

/** Includes típicos al devolver un producto completo */
const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.ensureCategoryExists(dto.categoryId);

    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugUnique(slug);
    this.validatePrices(dto.price, dto.discountPrice);
    await this.ensureSkusUnique(dto.variants.map((v) => v.sku));

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description,
          price: dto.price,
          discountPrice: dto.discountPrice,
          categoryId: dto.categoryId,
          isFeatured: dto.isFeatured ?? false,
          isActive: dto.isActive ?? true,
          images: dto.images?.length
            ? {
                create: dto.images.map((img, index) => ({
                  url: img.url,
                  alt: img.alt,
                  sortOrder: img.sortOrder ?? index,
                })),
              }
            : undefined,
          variants: {
            create: dto.variants.map((v) => ({
              sku: v.sku.trim().toUpperCase(),
              size: v.size,
              color: v.color,
              stock: v.stock,
            })),
          },
        },
        include: productInclude,
      });

      for (const v of product.variants) {
        if (v.stock > 0) {
          await this.inventoryService.createMovement(tx, {
            variantId: v.id,
            type: StockMoveType.IN,
            reason: StockMoveReason.INITIAL,
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            note: 'Stock inicial al crear producto',
          });
        }
      }

      return product;
    });
  }

  /**
   * Listado con filtros + paginación.
   * @param forAdmin si es false, forzamos isActive=true (catálogo público)
   */
  async findAll(query: QueryProductsDto, forAdmin = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (forAdmin) {
      if (typeof query.isActive === 'boolean') {
        where.isActive = query.isActive;
      }
    } else {
      where.isActive = true;
    }

    if (typeof query.isFeatured === 'boolean') {
      where.isFeatured = query.isFeatured;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    if (query.category) {
      where.category = {
        OR: [{ id: query.category }, { slug: query.category }],
      };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          variants: true,
        },
      }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(idOrSlug: string, forAdmin = false) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(forAdmin ? {} : { isActive: true }),
      },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id, true);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const slug = dto.slug
      ? slugify(dto.slug)
      : dto.name
        ? slugify(dto.name)
        : undefined;

    if (slug) {
      await this.ensureSlugUnique(slug, id);
    }

    if (dto.price !== undefined || dto.discountPrice !== undefined) {
      const current = await this.prisma.product.findUnique({ where: { id } });
      this.validatePrices(
        dto.price ?? Number(current!.price),
        dto.discountPrice !== undefined
          ? dto.discountPrice
          : current!.discountPrice !== null
            ? Number(current!.discountPrice)
            : undefined,
      );
    }

    if (dto.variants?.length) {
      await this.ensureSkusUnique(
        dto.variants.map((v) => v.sku),
        id,
      );
    }

    // Transacción: si reemplazamos imágenes/variantes, borramos las viejas primero
    return this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      if (dto.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          slug,
          description: dto.description,
          price: dto.price,
          discountPrice: dto.discountPrice,
          categoryId: dto.categoryId,
          isFeatured: dto.isFeatured,
          isActive: dto.isActive,
          images: dto.images
            ? {
                create: dto.images.map((img, index) => ({
                  url: img.url,
                  alt: img.alt,
                  sortOrder: img.sortOrder ?? index,
                })),
              }
            : undefined,
          variants: dto.variants
            ? {
                create: dto.variants.map((v) => ({
                  sku: v.sku.trim().toUpperCase(),
                  size: v.size,
                  color: v.color,
                  stock: v.stock,
                })),
              }
            : undefined,
        },
        include: productInclude,
      });
    });
  }

  /**
   * Soft-delete: marcamos isActive=false en vez de borrar la fila.
   * Así los pedidos históricos siguen pudiendo referenciar el producto.
   */
  async softDelete(id: string) {
    await this.findOne(id, true);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Producto desactivado (soft-delete)' };
  }

  private validatePrices(price: number, discountPrice?: number) {
    if (discountPrice !== undefined && discountPrice >= price) {
      throw new BadRequestException(
        'El precio con descuento debe ser menor que el precio normal',
      );
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('La categoría no existe');
    }
  }

  private async ensureSlugUnique(slug: string, excludeId?: string) {
    const existing = await this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe un producto con ese slug');
    }
  }

  private async ensureSkusUnique(skus: string[], excludeProductId?: string) {
    const normalized = skus.map((s) => s.trim().toUpperCase());
    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      throw new BadRequestException('Hay SKUs duplicados en la solicitud');
    }

    const existing = await this.prisma.productVariant.findMany({
      where: {
        sku: { in: normalized },
        ...(excludeProductId
          ? { NOT: { productId: excludeProductId } }
          : {}),
      },
      select: { sku: true },
    });

    if (existing.length > 0) {
      throw new ConflictException(
        `SKU(s) ya en uso: ${existing.map((e) => e.sku).join(', ')}`,
      );
    }
  }
}
