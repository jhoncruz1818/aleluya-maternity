import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista solo las direcciones del usuario autenticado.
   * Nunca devolvemos direcciones de otros (aislamiento por userId).
   */
  findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // Defensa en profundidad: aunque adivinen el id, no ven la de otro
    if (address.userId !== userId) {
      throw new ForbiddenException('No puedes acceder a esta dirección');
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    const makeDefault = dto.isDefault ?? false;

    return this.prisma.$transaction(async (tx) => {
      // Solo una dirección por defecto por usuario
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Si es la primera dirección, la marcamos por defecto automáticamente
      const count = await tx.address.count({ where: { userId } });
      const isDefault = makeDefault || count === 0;

      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          street: dto.street.trim(),
          city: dto.city.trim(),
          state: dto.state.trim(),
          postalCode: dto.postalCode.trim(),
          country: (dto.country ?? 'PE').toUpperCase(),
          phone: dto.phone,
          isDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          label: dto.label,
          street: dto.street?.trim(),
          city: dto.city?.trim(),
          state: dto.state?.trim(),
          postalCode: dto.postalCode?.trim(),
          country: dto.country?.toUpperCase(),
          phone: dto.phone,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    const address = await this.findOne(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      // Si borramos la default, promovemos otra (si queda alguna)
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { message: 'Dirección eliminada' };
  }
}
