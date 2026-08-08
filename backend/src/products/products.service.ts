import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
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
import {
  PUBLIC_DETAIL_TTL_MS,
  PUBLIC_LIST_TTL_MS,
  productsCache,
} from '../common/utils/ttl-cache';

/** Includes típicos al devolver un producto completo */
const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
} satisfies Prisma.ProductInclude;

/** Listado público: sin variantes (las tarjetas no las usan). */
const publicListInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
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
    const variants = await this.normalizeVariants(dto.variants);
    await this.ensureSkusUnique(variants.map((v) => v.sku));

    const created = await this.prisma.$transaction(async (tx) => {
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
            create: variants.map((v) => ({
              sku: v.sku,
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

    this.bustPublicProductCache();
    return created;
  }

  /**
   * Listado con filtros + paginación.
   * @param forAdmin si es false, forzamos isActive=true (catálogo público)
   */
  async findAll(query: QueryProductsDto, forAdmin = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const cacheKey = !forAdmin
      ? `products:list:${JSON.stringify({
          page,
          limit,
          isFeatured: query.isFeatured ?? null,
          search: query.search ?? null,
          category: query.category ?? null,
        })}`
      : null;

    if (cacheKey) {
      const cached = productsCache.get<{
        data: unknown;
        meta: ReturnType<typeof buildPaginationMeta>;
      }>(cacheKey);
      if (cached) return cached;
    }

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

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: forAdmin
          ? {
              category: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              variants: true,
            }
          : publicListInclude,
      }),
    ]);

    const result = {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };

    if (cacheKey) {
      productsCache.set(cacheKey, result, PUBLIC_LIST_TTL_MS);
    }

    return result;
  }

  async findOne(idOrSlug: string, forAdmin = false) {
    const cacheKey = !forAdmin ? `products:one:${idOrSlug}` : null;
    if (cacheKey) {
      const cached = productsCache.get<
        Prisma.ProductGetPayload<{ include: typeof productInclude }>
      >(cacheKey);
      if (cached) return cached;
    }

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

    if (cacheKey) {
      productsCache.set(cacheKey, product, PUBLIC_DETAIL_TTL_MS);
    }

    return product;
  }

  private bustPublicProductCache() {
    productsCache.invalidatePrefix('products:');
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

    const variants = dto.variants?.length
      ? await this.normalizeVariants(dto.variants, id)
      : undefined;

    if (variants) {
      await this.ensureSkusUnique(
        variants.map((v) => v.sku),
        id,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }

      if (variants) {
        await this.syncVariants(tx, id, variants);
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
        },
        include: productInclude,
      });
    });

    this.bustPublicProductCache();
    return updated;
  }

  /**
   * Actualiza variantes sin borrar las ligadas a pedidos (OrderItem).
   * Match por SKU; crea nuevas; solo elimina las que no tienen historial de venta.
   */
  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    incoming: Array<{
      sku: string;
      size: string;
      color: string;
      stock: number;
    }>,
  ) {
    const existing = await tx.productVariant.findMany({
      where: { productId },
      include: { _count: { select: { orderItems: true } } },
    });

    const bySku = new Map(
      existing.map((v) => [v.sku.trim().toUpperCase(), v]),
    );
    const keptIds = new Set<string>();

    for (const raw of incoming) {
      const sku = raw.sku.trim().toUpperCase();
      const current = bySku.get(sku);

      if (current) {
        keptIds.add(current.id);
        await tx.productVariant.update({
          where: { id: current.id },
          data: {
            size: raw.size,
            color: raw.color,
            stock: raw.stock,
          },
        });
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId,
            sku,
            size: raw.size,
            color: raw.color,
            stock: raw.stock,
          },
        });
        keptIds.add(created.id);
      }
    }

    const toRemove = existing.filter((v) => !keptIds.has(v.id));
    for (const variant of toRemove) {
      if (variant._count.orderItems > 0) {
        throw new BadRequestException(
          `No se puede quitar la variante ${variant.sku}: ya tiene ventas/pedidos. Cámbiale el stock a 0 si ya no la vendes.`,
        );
      }
      await tx.productVariant.delete({ where: { id: variant.id } });
    }
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

    this.bustPublicProductCache();
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

  /** SKU vacío → genera uno interno único (las prendas aún no tienen código). */
  private async normalizeVariants(
    variants: Array<{
      sku?: string;
      size: string;
      color: string;
      stock: number;
    }>,
    excludeProductId?: string,
  ) {
    const reserved = new Set<string>();
    const out: Array<{
      sku: string;
      size: string;
      color: string;
      stock: number;
    }> = [];

    for (const v of variants) {
      let sku = (v.sku ?? '').trim().toUpperCase();
      if (!sku) {
        sku = await this.generateUniqueSku(v.size, v.color, reserved);
      } else if (reserved.has(sku)) {
        throw new BadRequestException('Hay SKUs duplicados en la solicitud');
      }
      reserved.add(sku);
      out.push({
        sku,
        size: v.size.trim(),
        color: v.color.trim(),
        stock: v.stock,
      });
    }

    // reserved already checked within batch; ensureSkusUnique checks DB
    void excludeProductId;
    return out;
  }

  private async generateUniqueSku(
    size: string,
    color: string,
    reserved: Set<string>,
  ) {
    const sizePart = slugify(size).slice(0, 8).toUpperCase() || 'T';
    const colorPart = slugify(color).slice(0, 8).toUpperCase() || 'C';
    for (let i = 0; i < 30; i++) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const sku = `AUTO-${sizePart}-${colorPart}-${suffix}`.slice(0, 60);
      if (reserved.has(sku)) continue;
      const taken = await this.prisma.productVariant.findUnique({
        where: { sku },
        select: { id: true },
      });
      if (!taken) return sku;
    }
    throw new BadRequestException(
      'No se pudo generar un SKU interno. Intenta de nuevo.',
    );
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
