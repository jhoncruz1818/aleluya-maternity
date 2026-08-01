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
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { buildPaginationMeta } from '../common/dto/pagination.dto';
import {
  OrderStatus,
  PaymentStatus,
} from '../common/constants/order-status';

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

    const shippingCost = dto.shippingCost ?? 0;

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
      for (const item of dto.items) {
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

      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return order;
    });
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

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      // Si el admin marca PAID (p.ej. simular Yape en sandbox),
      // también aprobamos el pago pendiente.
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
