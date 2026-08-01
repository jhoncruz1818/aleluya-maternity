import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';

export type PromoDiscountResult = {
  promoCodeId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  discountAmount: number;
};

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Cupón no encontrado');
    return promo;
  }

  async create(dto: CreatePromoCodeDto) {
    this.assertDates(dto.startsAt, dto.endsAt);
    this.assertValue(dto.type, dto.value);

    const code = dto.code.trim().toUpperCase();
    const exists = await this.prisma.promoCode.findUnique({ where: { code } });
    if (exists) {
      throw new ConflictException(`Ya existe el cupón ${code}`);
    }

    return this.prisma.promoCode.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isActive: dto.isActive ?? true,
        maxUses: dto.maxUses,
        minOrderAmount: dto.minOrderAmount,
      },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    await this.findOne(id);

    const type = dto.type;
    const value = dto.value;
    if (type && value !== undefined) {
      this.assertValue(type, value);
    } else if (value !== undefined && type) {
      this.assertValue(type, value);
    }

    if (dto.startsAt && dto.endsAt) {
      this.assertDates(dto.startsAt, dto.endsAt);
    }

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const clash = await this.prisma.promoCode.findFirst({
        where: { code, NOT: { id } },
      });
      if (clash) throw new ConflictException(`Ya existe el cupón ${code}`);
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        type: dto.type,
        value: dto.value,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive,
        maxUses: dto.maxUses,
        minOrderAmount: dto.minOrderAmount,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.promoCode.delete({ where: { id } });
    return { message: 'Cupón eliminado' };
  }

  /**
   * Valida un cupón contra un subtotal y calcula el descuento.
   * Usado por checkout (preview) y por OrdersService al crear el pedido.
   */
  async resolveDiscount(
    rawCode: string,
    subtotal: number,
  ): Promise<PromoDiscountResult> {
    const code = rawCode.trim().toUpperCase();
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) {
      throw new BadRequestException('Código promocional no válido');
    }

    const now = new Date();
    if (!promo.isActive) {
      throw new BadRequestException('Este cupón está desactivado');
    }
    if (now < promo.startsAt) {
      throw new BadRequestException('Este cupón aún no está vigente');
    }
    if (now > promo.endsAt) {
      throw new BadRequestException('Este cupón ya venció');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Este cupón agotó sus usos');
    }

    const minOrder = promo.minOrderAmount
      ? Number(promo.minOrderAmount)
      : null;
    if (minOrder !== null && subtotal < minOrder) {
      throw new BadRequestException(
        `Pedido mínimo de S/ ${minOrder.toFixed(2)} para este cupón`,
      );
    }

    const value = Number(promo.value);
    let discountAmount =
      promo.type === 'PERCENT' ? (subtotal * value) / 100 : value;

    discountAmount = Math.round(discountAmount * 100) / 100;
    if (discountAmount > subtotal) discountAmount = subtotal;
    if (discountAmount <= 0) {
      throw new BadRequestException('El cupón no genera descuento');
    }

    return {
      promoCodeId: promo.id,
      code: promo.code,
      type: promo.type as 'PERCENT' | 'FIXED',
      value,
      discountAmount,
    };
  }

  async validatePreview(code: string, subtotal: number, shippingCost = 0) {
    const discount = await this.resolveDiscount(code, subtotal);
    const total =
      Math.round((subtotal - discount.discountAmount + shippingCost) * 100) /
      100;

    return {
      ...discount,
      subtotal,
      shippingCost,
      total: Math.max(0, total),
      message:
        discount.type === 'PERCENT'
          ? `Descuento ${discount.value}% aplicado`
          : `Descuento de S/ ${discount.value.toFixed(2)} aplicado`,
    };
  }

  async incrementUsage(promoCodeId: string) {
    await this.prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { usedCount: { increment: 1 } },
    });
  }

  private assertDates(startsAt: string, endsAt: string) {
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior al inicio',
      );
    }
  }

  private assertValue(type: 'PERCENT' | 'FIXED', value: number) {
    if (type === 'PERCENT' && (value <= 0 || value > 100)) {
      throw new BadRequestException('El porcentaje debe estar entre 0.01 y 100');
    }
    if (type === 'FIXED' && value <= 0) {
      throw new BadRequestException('El monto fijo debe ser mayor a 0');
    }
  }
}
