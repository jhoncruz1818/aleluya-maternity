import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { resolveShippingCost } from './shipping';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import {
  OrderStatus,
  PaymentStatus,
  OrderChannel,
  PaymentMethod,
} from '../common/constants/order-status';
import {
  StockMoveReason,
  StockMoveType,
} from '../common/constants/stock';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { productsCache } from '../common/utils/ttl-cache';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { QueryPosDailyDto } from './dto/query-pos-daily.dto';

const orderInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true } },
      variant: { select: { id: true, sku: true, size: true, color: true } },
    },
  },
  address: true,
  payment: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promoCodesService: PromoCodesService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Crea el pedido desde el carrito:
   * 1) Valida dirección y stock
   * 2) Congela precios unitarios
   * 3) Aplica cupón si viene
   * 4) Descuenta stock
   * 5) Crea Payment en PENDING
   */
  async create(userId: string, dto: CreateOrderDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });
    if (!address || address.userId !== userId) {
      throw new BadRequestException('Dirección de envío inválida');
    }

    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('Una o más variantes no existen');
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    let subtotal = 0;

    const lineItems = dto.items.map((item) => {
      const variant = variantMap.get(item.variantId)!;

      if (!variant.product.isActive) {
        throw new BadRequestException(
          `El producto "${variant.product.name}" no está disponible`,
        );
      }
      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${variant.sku} (disponible: ${variant.stock})`,
        );
      }

      const unitPrice = Number(
        variant.product.discountPrice ?? variant.product.price,
      );
      subtotal += unitPrice * item.quantity;

      return {
        productId: variant.productId,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const shippingMethod = dto.shippingMethod ?? 'standard';
    const shippingCost = resolveShippingCost(shippingMethod, subtotal);

    let discountAmount = 0;
    let promoCode: string | undefined;
    let promoCodeId: string | undefined;

    if (dto.promoCode?.trim()) {
      const discount = await this.promoCodesService.resolveDiscount(
        dto.promoCode,
        subtotal,
      );
      discountAmount = discount.discountAmount;
      promoCode = discount.code;
      promoCodeId = discount.promoCodeId;
    }

    const total =
      Math.round((subtotal - discountAmount + shippingCost) * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      const saleMovements: Array<{
        variantId: string;
        quantity: number;
        previousStock: number;
        newStock: number;
      }> = [];

      for (const item of dto.items) {
        const current = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!current || current.stock < item.quantity) {
          throw new BadRequestException(
            'Stock insuficiente (otro cliente se adelantó)',
          );
        }

        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException(
            'Stock insuficiente (otro cliente se adelantó)',
          );
        }

        saleMovements.push({
          variantId: item.variantId,
          quantity: item.quantity,
          previousStock: current.stock,
          newStock: current.stock - item.quantity,
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          addressId: dto.addressId,
          status: OrderStatus.PENDING,
          subtotal,
          shippingCost,
          discountAmount,
          promoCode,
          promoCodeId,
          total: Math.max(0, total),
          notes: dto.notes,
          items: { create: lineItems },
          payment: {
            create: {
              amount: Math.max(0, total),
              currency: 'PEN',
              status: PaymentStatus.PENDING,
            },
          },
        },
        include: orderInclude,
      });

      for (const m of saleMovements) {
        await this.inventoryService.createMovement(tx, {
          variantId: m.variantId,
          type: StockMoveType.OUT,
          reason: StockMoveReason.SALE,
          quantity: m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          orderId: order.id,
          note: `Pedido ${order.id}`,
        });
      }

      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return order;
    });
  }

  /**
   * Venta presencial en efectivo (ADMIN):
   * Order channel=STORE, status=PAID, Payment method=cash APPROVED, stock SALE.
   */
  async createPosSale(adminUserId: string, dto: CreatePosSaleDto) {
    const variantIds = dto.items.map((i) => i.variantId);
    const uniqueVariantIds = [...new Set(variantIds)];
    if (uniqueVariantIds.length !== variantIds.length) {
      throw new BadRequestException(
        'No repitas la misma variante: suma las cantidades en una sola línea',
      );
    }

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('Una o más variantes no existen');
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    let subtotal = 0;

    const lineItems = dto.items.map((item) => {
      const variant = variantMap.get(item.variantId)!;

      if (!variant.product.isActive) {
        throw new BadRequestException(
          `El producto "${variant.product.name}" no está disponible`,
        );
      }
      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${variant.sku} (disponible: ${variant.stock})`,
        );
      }

      const unitPrice = Number(
        variant.product.discountPrice ?? variant.product.price,
      );
      subtotal += unitPrice * item.quantity;

      return {
        productId: variant.productId,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const total = Math.round(subtotal * 100) / 100;

    const order = await this.prisma.$transaction(async (tx) => {
      const saleMovements: Array<{
        variantId: string;
        quantity: number;
        previousStock: number;
        newStock: number;
      }> = [];

      for (const item of dto.items) {
        const current = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!current || current.stock < item.quantity) {
          throw new BadRequestException(
            'Stock insuficiente (se actualizó mientras cobrabas)',
          );
        }

        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException(
            'Stock insuficiente (se actualizó mientras cobrabas)',
          );
        }

        saleMovements.push({
          variantId: item.variantId,
          quantity: item.quantity,
          previousStock: current.stock,
          newStock: current.stock - item.quantity,
        });
      }

      const created = await tx.order.create({
        data: {
          userId: adminUserId,
          addressId: null,
          channel: OrderChannel.STORE,
          status: OrderStatus.PAID,
          subtotal,
          shippingCost: 0,
          discountAmount: 0,
          total,
          notes: dto.notes?.trim() || 'Venta presencial — efectivo',
          items: { create: lineItems },
          payment: {
            create: {
              amount: total,
              currency: 'PEN',
              method: PaymentMethod.CASH,
              status: PaymentStatus.APPROVED,
            },
          },
        },
        include: {
          ...orderInclude,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      for (const m of saleMovements) {
        await this.inventoryService.createMovement(tx, {
          variantId: m.variantId,
          type: StockMoveType.OUT,
          reason: StockMoveReason.SALE,
          quantity: m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          orderId: created.id,
          createdById: adminUserId,
          note: `Venta presencial ${created.id}`,
        });
      }

      return created;
    });

    productsCache.invalidatePrefix('products:');
    return order;
  }

  /**
   * Caja del día: solo ventas STORE con pago cash (zona Lima).
   */
  async getPosDaily(query: QueryPosDailyDto) {
    const date = query.date ?? limaToday();
    const { start, end } = limaDayRange(date);

    const where: Prisma.OrderWhereInput = {
      channel: OrderChannel.STORE,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: start, lte: end },
      payment: {
        method: PaymentMethod.CASH,
        status: PaymentStatus.APPROVED,
      },
    };

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        ...orderInclude,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const itemsSold = orders.reduce(
      (sum, o) =>
        sum + (o.items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
      0,
    );

    return {
      date,
      timezone: 'America/Lima',
      summary: {
        tickets: orders.length,
        itemsSold,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: 'PEN',
      },
      orders,
    };
  }

  async findMine(userId: string, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(userId: string, id: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        ...orderInclude,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('No puedes ver este pedido');
    }

    return order;
  }

  async findAllAdmin(query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = query.status
      ? { status: query.status }
      : {};

    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...orderInclude,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  getOpenpayGate(id: string) {
    return this.paymentsService.getOpenpayPaymentGate(id);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const isCashStore =
      order.channel === OrderChannel.STORE ||
      order.payment?.method === PaymentMethod.CASH;

    // PENDING/PAID online deben coincidir con Openpay; logística es libre
    if (
      !isCashStore &&
      (dto.status === OrderStatus.PENDING || dto.status === OrderStatus.PAID)
    ) {
      const gate = await this.paymentsService.getOpenpayPaymentGate(id);
      if (dto.status === OrderStatus.PAID && !gate.allowPaid) {
        throw new BadRequestException(
          `No puedes marcar PAID: Openpay no confirma el pago` +
            (gate.openpayStatus ? ` (estado: ${gate.openpayStatus})` : ''),
        );
      }
      if (dto.status === OrderStatus.PENDING && !gate.allowPending) {
        throw new BadRequestException(
          'No puedes marcar PENDING: Openpay ya confirmó el pago (COMPLETED)',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.PAID && order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.APPROVED },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: orderInclude,
      });
    });
  }
}

/** Hoy en América/Lima como YYYY-MM-DD */
function limaToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Rango UTC del día civil en Lima */
function limaDayRange(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00.000-05:00`),
    end: new Date(`${date}T23:59:59.999-05:00`),
  };
}
