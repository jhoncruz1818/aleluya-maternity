import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  STOCK_HIGH_THRESHOLD,
  STOCK_LOW_THRESHOLD,
  StockMoveReason,
  StockMoveType,
} from '../common/constants/stock';
import {
  CreateStockMovementDto,
  QueryInventoryDto,
  QueryMovementsDto,
} from './dto/inventory.dto';
import { buildPaginationMeta } from '../common/dto/pagination.dto';

export type StockLevel = 'low' | 'ok' | 'high';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Emails en OWNER_EMAILS (separados por coma). */
  isOwner(email: string | undefined | null) {
    if (!email) return false;
    const raw = this.config.get<string>('OWNER_EMAILS') ?? '';
    const owners = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (owners.length === 0) return false;
    return owners.includes(email.trim().toLowerCase());
  }

  private assertOwner(email: string) {
    if (!this.isOwner(email)) {
      throw new ForbiddenException(
        'Solo el dueño de la tienda puede eliminar del historial. Los anulados quedan como auditoría.',
      );
    }
  }

  levelOf(stock: number): StockLevel {
    if (stock <= STOCK_LOW_THRESHOLD) return 'low';
    if (stock >= STOCK_HIGH_THRESHOLD) return 'high';
    return 'ok';
  }

  /**
   * Lista variantes con stock + nivel (low/ok/high).
   */
  async list(query: QueryInventoryDto) {
    const search = query.search?.trim();
    const level = query.level ?? 'all';

    const where: Prisma.ProductVariantWhereInput = {
      product: { isActive: true },
    };

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { size: { contains: search } },
        { color: { contains: search } },
        { product: { name: { contains: search } } },
      ];
    }

    if (level === 'low') {
      where.stock = { lte: STOCK_LOW_THRESHOLD };
    } else if (level === 'high') {
      where.stock = { gte: STOCK_HIGH_THRESHOLD };
    } else if (level === 'ok') {
      where.stock = {
        gt: STOCK_LOW_THRESHOLD,
        lt: STOCK_HIGH_THRESHOLD,
      };
    }

    const rows = await this.prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
    });

    const items = rows.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      level: this.levelOf(v.stock),
      product: {
        id: v.product.id,
        name: v.product.name,
        slug: v.product.slug,
        imageUrl: v.product.images[0]?.url ?? null,
      },
    }));

    const summary = {
      total: items.length,
      low: items.filter((i) => i.level === 'low').length,
      ok: items.filter((i) => i.level === 'ok').length,
      high: items.filter((i) => i.level === 'high').length,
      lowThreshold: STOCK_LOW_THRESHOLD,
      highThreshold: STOCK_HIGH_THRESHOLD,
    };

    return { summary, items };
  }

  async movements(
    variantId: string,
    query: QueryMovementsDto,
    viewerEmail?: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    const skip = (page - 1) * limit;

    const [total, rows, undoneCount] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where: { variantId } }),
      this.prisma.stockMovement.findMany({
        where: { variantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          undoneBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          order: { select: { id: true, status: true } },
        },
      }),
      this.prisma.stockMovement.count({
        where: { variantId, undoneAt: { not: null } },
      }),
    ]);

    return {
      variant: {
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        level: this.levelOf(variant.stock),
        product: variant.product,
      },
      meta: buildPaginationMeta(total, page, limit),
      permissions: {
        canPurge: this.isOwner(viewerEmail),
      },
      undoneCount,
      items: rows,
    };
  }

  /**
   * Entrada / salida manual (admin). Actualiza stock + historial.
   */
  async adjust(
    variantId: string,
    dto: CreateStockMovementDto,
    adminUserId: string,
  ) {
    const reason =
      dto.reason ??
      (dto.type === StockMoveType.IN
        ? StockMoveReason.PURCHASE
        : StockMoveReason.ADJUSTMENT);

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) throw new NotFoundException('Variante no encontrada');

      const previousStock = variant.stock;
      const newStock =
        dto.type === StockMoveType.IN
          ? previousStock + dto.quantity
          : previousStock - dto.quantity;

      if (newStock < 0) {
        throw new BadRequestException(
          `Stock insuficiente (disponible: ${previousStock})`,
        );
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          variantId,
          type: dto.type,
          reason,
          quantity: dto.quantity,
          previousStock,
          newStock,
          note: dto.note?.trim() || null,
          createdById: adminUserId,
        },
      });

      return {
        movement,
        stock: newStock,
        level: this.levelOf(newStock),
      };
    });
  }

  /**
   * Anula un movimiento manual: revierte stock y deja marca de auditoría
   * (quién / cuándo). No borra la fila.
   */
  async undoMovement(movementId: string, adminUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id: movementId },
      });
      if (!movement) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      if (movement.undoneAt) {
        throw new BadRequestException('Este movimiento ya fue anulado');
      }

      if (movement.reason === StockMoveReason.SALE || movement.orderId) {
        throw new BadRequestException(
          'No se puede deshacer una salida por venta. El stock lo controla el pedido.',
        );
      }

      const variant = await tx.productVariant.findUnique({
        where: { id: movement.variantId },
      });
      if (!variant) {
        throw new NotFoundException('Variante no encontrada');
      }

      const restoredStock =
        movement.type === StockMoveType.IN
          ? variant.stock - movement.quantity
          : variant.stock + movement.quantity;

      if (restoredStock < 0) {
        throw new BadRequestException(
          `No se puede anular: el stock quedaría en ${restoredStock}. Ajusta manualmente antes.`,
        );
      }

      await tx.productVariant.update({
        where: { id: movement.variantId },
        data: { stock: restoredStock },
      });

      const updated = await tx.stockMovement.update({
        where: { id: movementId },
        data: {
          undoneAt: new Date(),
          undoneById: adminUserId,
        },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          undoneBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return {
        message: 'Movimiento anulado (queda en el historial)',
        movement: updated,
        variantId: movement.variantId,
        stock: restoredStock,
        level: this.levelOf(restoredStock),
      };
    });
  }

  /**
   * Borrado permanente de un movimiento YA anulado.
   * Solo OWNER_EMAILS. No cambia el stock (ya se revirtió al anular).
   */
  async purgeUndoneMovement(movementId: string, ownerEmail: string) {
    this.assertOwner(ownerEmail);

    const movement = await this.prisma.stockMovement.findUnique({
      where: { id: movementId },
    });
    if (!movement) {
      throw new NotFoundException('Movimiento no encontrado');
    }
    if (!movement.undoneAt) {
      throw new BadRequestException(
        'Solo se pueden eliminar movimientos ya anulados. Primero anúlalo.',
      );
    }

    await this.prisma.stockMovement.delete({ where: { id: movementId } });

    return {
      message: 'Movimiento eliminado del historial',
      variantId: movement.variantId,
    };
  }

  /**
   * Limpia todos los anulados de una variante. Solo OWNER_EMAILS.
   */
  async purgeAllUndone(variantId: string, ownerEmail: string) {
    this.assertOwner(ownerEmail);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    const result = await this.prisma.stockMovement.deleteMany({
      where: { variantId, undoneAt: { not: null } },
    });

    return {
      message: `Se eliminaron ${result.count} movimiento(s) anulado(s)`,
      deleted: result.count,
      variantId,
    };
  }

  /** Usado dentro de transacciones (pedidos, alta de producto). */
  async createMovement(
    tx: Prisma.TransactionClient,
    data: {
      variantId: string;
      type: string;
      reason: string;
      quantity: number;
      previousStock: number;
      newStock: number;
      note?: string | null;
      orderId?: string | null;
      createdById?: string | null;
    },
  ) {
    if (data.quantity < 1) {
      throw new BadRequestException('quantity debe ser >= 1');
    }
    return tx.stockMovement.create({ data });
  }
}
